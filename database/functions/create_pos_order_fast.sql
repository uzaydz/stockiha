-- دالة محسنة لإنشاء طلبات POS بسرعة فائقة
-- تحل مشاكل الأداء ومشكلة GROUP BY

-- حذف الدالة القديمة أولاً
DROP FUNCTION IF EXISTS create_pos_order_fast(UUID, UUID, JSON, DECIMAL, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_pos_order_fast(UUID, UUID, TEXT, DECIMAL, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_pos_order_fast(UUID, UUID, TEXT, DECIMAL, UUID, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, BOOLEAN);

CREATE OR REPLACE FUNCTION create_pos_order_fast(
    p_organization_id UUID,
    p_employee_id UUID,
    p_items TEXT,
    p_total_amount DECIMAL,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_payment_status TEXT DEFAULT 'paid',
    p_notes TEXT DEFAULT '',
    p_amount_paid DECIMAL DEFAULT NULL,
    p_discount DECIMAL DEFAULT 0,
    p_subtotal DECIMAL DEFAULT NULL,
    p_consider_remaining_as_partial BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_order_id UUID;
    v_order_slug VARCHAR;
    v_customer_order_number INTEGER;
    v_item JSON;
    v_result JSON;
    v_product_data RECORD;
    v_items_data JSON[];
    v_product_ids UUID[];
    v_products_cache JSON;
    v_debug_info TEXT;
    item_record RECORD;
    fifo_result JSON;
    fifo_results JSONB := '[]'::jsonb;
BEGIN
    -- إضافة معلومات تشخيصية
    v_debug_info := 'Input items: ' || p_items || 
                   ', Items type: ' || json_typeof(p_items::json);

    -- التحقق من صحة البيانات المدخلة
    IF p_items IS NULL OR p_items = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'البيانات المدخلة فارغة',
            'error_code', 'INVALID_INPUT',
            'debug_info', v_debug_info
        );
    END IF;

    -- توليد slug فريد للطلبية
    v_order_slug := 'pos-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
                    FLOOR(RANDOM() * 1000)::INTEGER;

    -- جمع معرفات المنتجات (مع التحقق من نوع البيانات)
    IF json_typeof(p_items::json) = 'array' THEN
        SELECT ARRAY_AGG(DISTINCT (item->>'product_id')::UUID)
        INTO v_product_ids
        FROM json_array_elements(p_items::json) AS item
        WHERE item->>'product_id' IS NOT NULL 
          AND item->>'product_id' != '';
    ELSE
        -- إذا كانت البيانات ليست array، تحويلها إلى array
        SELECT ARRAY_AGG(DISTINCT (p_items::json->>'product_id')::UUID)
        INTO v_product_ids
        WHERE p_items::json->>'product_id' IS NOT NULL
          AND p_items::json->>'product_id' != '';
    END IF;

    -- التحقق من وجود معرفات منتجات صالحة
    IF v_product_ids IS NULL OR array_length(v_product_ids, 1) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'لا توجد معرفات منتجات صالحة في البيانات المدخلة',
            'error_code', 'NO_VALID_PRODUCTS',
            'debug_info', v_debug_info,
            'input_items', p_items
        );
    END IF;

    -- جلب بيانات المنتجات مرة واحدة فقط
    SELECT json_object_agg(
        id::text, 
        json_build_object(
            'id', id,
            'name', COALESCE(name, 'منتج'),
            'price', price,
            'stock_quantity', stock_quantity
        )
    )
    INTO v_products_cache
    FROM products 
    WHERE id = ANY(v_product_ids) 
      AND organization_id = p_organization_id;

    -- إنشاء الطلبية الرئيسية
    INSERT INTO orders (
        organization_id,
        customer_id,
        employee_id,
        slug,
        status,
        payment_status,
        payment_method,
        total,
        subtotal,
        tax,
        discount,
        amount_paid,
        remaining_amount,
        consider_remaining_as_partial,
        pos_order_type,
        notes,
        is_online,
        created_at,
        updated_at,
        completed_at
    ) VALUES (
        p_organization_id,
        p_customer_id,
        p_employee_id,
        v_order_slug,
        'completed',
        p_payment_status,
        p_payment_method,
        p_total_amount,
        COALESCE(p_subtotal, p_total_amount + p_discount),
        0,
        p_discount,
        COALESCE(p_amount_paid, CASE WHEN p_payment_status = 'paid' THEN p_total_amount ELSE 0 END),
        CASE 
            WHEN p_amount_paid IS NOT NULL AND p_amount_paid < p_total_amount 
            THEN p_total_amount - p_amount_paid 
            ELSE 0 
        END,
        p_consider_remaining_as_partial,
        'pos',
        p_notes,
        false,
        NOW(),
        NOW(),
        NOW()
    ) RETURNING id, customer_order_number INTO v_new_order_id, v_customer_order_number;

    -- تحضير بيانات العناصر للإدراج المجمع (مع التحقق من نوع البيانات)
    IF json_typeof(p_items::json) = 'array' THEN
        SELECT ARRAY_AGG(
            json_build_object(
                'order_id', v_new_order_id,
                'product_id', (item->>'product_id')::UUID,
                'product_name', COALESCE(
                    (v_products_cache->(item->>'product_id'))->>'name',
                    'منتج'
                ),
                'name', COALESCE(
                    (v_products_cache->(item->>'product_id'))->>'name',
                    'منتج'
                ),
                'quantity', (item->>'quantity')::INTEGER,
                'unit_price', (item->>'price')::DECIMAL,
                'total_price', (item->>'total')::DECIMAL,
                'organization_id', p_organization_id,
                'slug', 'item-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
                        FLOOR(RANDOM() * 1000)::INTEGER,
                'variant_info', COALESCE(item->'variant_info', '{}'::json),
                'color_id', CASE 
                    WHEN item->>'color_id' IS NOT NULL AND item->>'color_id' != '' 
                    THEN (item->>'color_id')::UUID 
                    ELSE NULL 
                END,
                'size_id', CASE 
                    WHEN item->>'size_id' IS NOT NULL AND item->>'size_id' != '' 
                    THEN (item->>'size_id')::UUID 
                    ELSE NULL 
                END,
                'created_at', NOW()
            )
        )
        INTO v_items_data
        FROM json_array_elements(p_items::json) AS item
        WHERE item->>'product_id' IS NOT NULL 
          AND item->>'product_id' != '';
    ELSE
        -- معالجة عنصر واحد فقط
        SELECT ARRAY[json_build_object(
            'order_id', v_new_order_id,
            'product_id', (p_items::json->>'product_id')::UUID,
            'product_name', COALESCE(
                (v_products_cache->(p_items::json->>'product_id'))->>'name',
                'منتج'
            ),
            'name', COALESCE(
                (v_products_cache->(p_items::json->>'product_id'))->>'name',
                'منتج'
            ),
            'quantity', (p_items::json->>'quantity')::INTEGER,
            'unit_price', (p_items::json->>'price')::DECIMAL,
            'total_price', (p_items::json->>'total')::DECIMAL,
            'organization_id', p_organization_id,
            'slug', 'item-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
                    FLOOR(RANDOM() * 1000)::INTEGER,
            'variant_info', COALESCE(p_items::json->'variant_info', '{}'::json),
            'color_id', CASE 
                WHEN p_items::json->>'color_id' IS NOT NULL AND p_items::json->>'color_id' != '' 
                THEN (p_items::json->>'color_id')::UUID 
                ELSE NULL 
            END,
            'size_id', CASE 
                WHEN p_items::json->>'size_id' IS NOT NULL AND p_items::json->>'size_id' != '' 
                THEN (p_items::json->>'size_id')::UUID 
                ELSE NULL 
            END,
            'created_at', NOW()
        )]
        INTO v_items_data;
    END IF;

    -- التحقق من أن البيانات المُحضرة ليست فارغة
    IF v_items_data IS NULL OR array_length(v_items_data, 1) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'فشل في تحضير بيانات العناصر',
            'error_code', 'ITEMS_PREPARATION_FAILED',
            'debug_info', v_debug_info,
            'input_items', p_items,
            'product_ids', v_product_ids
        );
    END IF;

    -- إدراج جميع عناصر الطلبية في عملية واحدة
    INSERT INTO order_items (
        id,
        order_id,
        product_id,
        product_name,
        name,
        quantity,
        unit_price,
        total_price,
        is_digital,
        organization_id,
        slug,
        variant_info,
        color_id,
        size_id,
        created_at
    )
    SELECT 
        gen_random_uuid(),
        (item_data->>'order_id')::UUID,
        (item_data->>'product_id')::UUID,
        item_data->>'product_name',
        item_data->>'name',
        (item_data->>'quantity')::INTEGER,
        (item_data->>'unit_price')::DECIMAL,
        (item_data->>'total_price')::DECIMAL,
        false,
        (item_data->>'organization_id')::UUID,
        item_data->>'slug',
        (item_data->>'variant_info')::jsonb,
        CASE 
            WHEN item_data->>'color_id' IS NOT NULL 
            THEN (item_data->>'color_id')::UUID 
            ELSE NULL 
        END,
        CASE 
            WHEN item_data->>'size_id' IS NOT NULL 
            THEN (item_data->>'size_id')::UUID 
            ELSE NULL 
        END,
        (item_data->>'created_at')::timestamp
    FROM unnest(v_items_data) AS item_data;

    -- ✅ معالجة المخزون باستخدام نظام FIFO
    FOR item_record IN 
        SELECT 
            (item->>'product_id')::UUID as product_id,
            (item->>'quantity')::INTEGER as quantity,
            item->>'color_id' as color_id,
            item->>'size_id' as size_id
        FROM json_array_elements(p_items::json) AS item
        WHERE item->>'product_id' IS NOT NULL
    LOOP
        -- استدعاء دالة FIFO للمنتجات مع المتغيرات
        SELECT process_pos_sale_with_variants_fifo(
            item_record.product_id,
            item_record.quantity,
            p_organization_id,
            CASE 
                WHEN item_record.color_id IS NOT NULL THEN item_record.color_id::UUID
                ELSE NULL
            END,
            CASE 
                WHEN item_record.size_id IS NOT NULL THEN item_record.size_id::UUID
                ELSE NULL
            END,
            v_new_order_id
        ) INTO fifo_result;
        
        -- التحقق من نجاح عملية FIFO
        IF NOT (fifo_result->>'success')::boolean THEN
            RAISE EXCEPTION 'فشل في معالجة المخزون للمنتج %: %', 
                item_record.product_id, fifo_result->>'error';
        END IF;
        
        -- إضافة معلومات التكلفة إلى النتيجة
        fifo_results := fifo_results || jsonb_build_object(
            'product_id', item_record.product_id,
            'quantity', item_record.quantity,
            'fifo_cost', fifo_result->>'total_cost',
            'average_cost', fifo_result->>'average_cost_per_unit'
        );
    END LOOP;

    -- إنشاء JSON للنتيجة
    SELECT json_build_object(
        'id', v_new_order_id,
        'slug', v_order_slug,
        'customer_order_number', v_customer_order_number,
        'status', 'completed',
        'payment_status', p_payment_status,
        'total', p_total_amount,
        'items_count', CASE 
            WHEN json_typeof(p_items::json) = 'array' THEN json_array_length(p_items::json) 
            ELSE 1 
        END,
        'created_at', NOW(),
        'updated_at', NOW(),
        'success', true,
        'message', 'تم إنشاء الطلب بنجاح',
        'fifo_results', fifo_results
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- في حالة الخطأ، أرجع تفاصيل الخطأ مع معلومات تشخيصية
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'error_detail', SQLSTATE || ': ' || SQLERRM,
        'debug_info', v_debug_info,
        'input_items', p_items,
        'organization_id', p_organization_id,
        'employee_id', p_employee_id
    );
END;
$$;

-- إنشاء فهرس محسن للطلبات إذا لم يكن موجوداً
CREATE INDEX IF NOT EXISTS idx_orders_pos_fast_lookup 
ON orders (organization_id, created_at DESC, pos_order_type) 
WHERE pos_order_type = 'pos';

-- إنشاء فهرس محسن لعناصر الطلبات
CREATE INDEX IF NOT EXISTS idx_order_items_fast_lookup 
ON order_items (order_id, product_id, created_at DESC);

-- تعليق حول الاستخدام
COMMENT ON FUNCTION create_pos_order_fast IS 
'دالة محسنة لإنشاء طلبات POS بسرعة فائقة - تستخدم Bulk Insert و Product Caching';

-- ✅ إنشاء trigger محسن للتعامل مع FIFO
CREATE OR REPLACE FUNCTION log_sales_to_inventory_smart()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- التحقق من نوع الطلبية
    DECLARE
        order_type TEXT;
        existing_log_count INTEGER;
        order_employee_id UUID;
    BEGIN
        -- جلب نوع الطلبية ومعرف الموظف
        SELECT COALESCE(pos_order_type, 'regular'), employee_id
        INTO order_type, order_employee_id
        FROM orders 
        WHERE id = NEW.order_id;
        
        -- التحقق من وجود سجل FIFO مسبق لنفس المنتج والطلبية
        SELECT COUNT(*)
        INTO existing_log_count
        FROM inventory_log
        WHERE product_id = NEW.product_id 
        AND reference_id = NEW.order_id 
        AND reference_type = 'pos_order'
        AND created_at >= NOW() - INTERVAL '1 minute';
        
        -- إذا كانت طلبية POS ولديها سجل FIFO مسبق، لا نضيف سجل إضافي
        IF order_type = 'pos' AND existing_log_count > 0 THEN
            RETURN NEW;
        END IF;
        
        -- للطلبيات العادية أو POS بدون FIFO، أضف السجل التقليدي
        INSERT INTO inventory_log(
            product_id,
            quantity,
            previous_stock,
            new_stock,
            type,
            reference_id,
            reference_type,
            notes,
            organization_id,
            created_by
        )
        SELECT 
            NEW.product_id,
            NEW.quantity,
            p.stock_quantity + NEW.quantity, -- المخزون قبل البيع
            p.stock_quantity,                -- المخزون بعد البيع
            'sale',
            NEW.order_id,
            CASE 
                WHEN order_type = 'pos' THEN 'pos_order'
                ELSE 'order'
            END,
            'بيع من خلال طلب رقم ' || NEW.order_id,
            NEW.organization_id,
            order_employee_id
        FROM products p
        WHERE p.id = NEW.product_id;
        
        -- للطلبيات العادية، نحدث المخزون يدوياً
        IF order_type != 'pos' THEN
            UPDATE products 
            SET stock_quantity = stock_quantity - NEW.quantity,
                updated_at = NOW(),
                last_inventory_update = NOW()
            WHERE id = NEW.product_id;
        END IF;
        
        RETURN NEW;
    END;
END;
$$;

-- حذف الـ trigger القديم وإنشاء الجديد
DROP TRIGGER IF EXISTS log_sales_trigger ON order_items;
DROP TRIGGER IF EXISTS log_sales_trigger_smart ON order_items;

CREATE TRIGGER log_sales_trigger_smart
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION log_sales_to_inventory_smart();

-- ✅ دالة مركزية لإعادة تزامن المخزون
CREATE OR REPLACE FUNCTION sync_product_inventory(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_record RECORD;
    v_batch_total INTEGER;
    v_calculated_stock INTEGER;
    v_current_stock INTEGER;
    v_difference INTEGER;
BEGIN
    -- جلب بيانات المنتج
    SELECT stock_quantity, name, has_variants
    INTO v_product_record
    FROM products 
    WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المنتج غير موجود'
        );
    END IF;
    
    v_current_stock := v_product_record.stock_quantity;
    
    -- حساب المخزون من الـ batches
    SELECT COALESCE(SUM(quantity_remaining), 0)
    INTO v_batch_total
    FROM inventory_batches 
    WHERE product_id = p_product_id 
    AND is_active = true;
    
    -- للمنتجات بمتغيرات، استخدم مجموع المتغيرات
    IF v_product_record.has_variants THEN
        SELECT COALESCE(SUM(quantity), 0)
        INTO v_calculated_stock
        FROM product_colors 
        WHERE product_id = p_product_id;
        
        -- تحديث المخزون الإجمالي من المتغيرات
        UPDATE products 
        SET stock_quantity = v_calculated_stock,
            last_inventory_update = NOW()
        WHERE id = p_product_id;
        
    ELSE
        -- للمنتجات البسيطة، استخدم مجموع الـ batches
        v_calculated_stock := v_batch_total;
        
        -- تحديث المخزون إذا كان مختلف
        IF v_calculated_stock != v_current_stock THEN
            UPDATE products 
            SET stock_quantity = v_calculated_stock,
                last_inventory_update = NOW()
            WHERE id = p_product_id;
        END IF;
    END IF;
    
    v_difference := v_calculated_stock - v_current_stock;
    
    RETURN jsonb_build_object(
        'success', true,
        'product_name', v_product_record.name,
        'old_stock', v_current_stock,
        'new_stock', v_calculated_stock,
        'batch_total', v_batch_total,
        'difference', v_difference,
        'has_variants', v_product_record.has_variants,
        'synchronized_at', NOW()
    );
END;
$$;

-- ✅ دالة لإصلاح جميع المنتجات في المؤسسة
CREATE OR REPLACE FUNCTION fix_all_inventory(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_product RECORD;
    v_result JSONB;
    v_fixed_count INTEGER := 0;
    v_total_count INTEGER := 0;
    v_results JSONB := '[]'::jsonb;
BEGIN
    -- معالجة جميع المنتجات
    FOR v_product IN 
        SELECT id, name 
        FROM products 
        WHERE organization_id = p_organization_id
    LOOP
        v_total_count := v_total_count + 1;
        
        SELECT sync_product_inventory(v_product.id) INTO v_result;
        
        IF (v_result->>'success')::boolean AND (v_result->>'difference')::integer != 0 THEN
            v_fixed_count := v_fixed_count + 1;
            v_results := v_results || v_result;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_products', v_total_count,
        'fixed_products', v_fixed_count,
        'fixes', v_results,
        'processed_at', NOW()
    );
END;
$$; 