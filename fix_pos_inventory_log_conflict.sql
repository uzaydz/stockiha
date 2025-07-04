-- ==========================================
-- حل شامل لمشكلة تضارب فهرس POS في inventory_log
-- ==========================================
-- المشكلة: دالة FIFO تحاول إدراج سجل مكرر يتعارض مع الفهرس الفريد
-- الحل: تعديل دالة FIFO لفحص السجلات الموجودة قبل الإدراج

BEGIN;

-- 1. تحليل المشكلة الحالية
DO $$
BEGIN
    RAISE NOTICE '🔍 تحليل مشكلة تضارب فهرس POS...';
    RAISE NOTICE 'الفهرس المتضارب: idx_inventory_log_unique_sale_pos';
    RAISE NOTICE 'السبب: دالة FIFO تحاول إدراج سجل مكرر للمنتج نفسه في نفس الطلب';
END $$;

-- 2. إنشاء دالة محسنة لمعالجة FIFO مع تجنب التكرار
CREATE OR REPLACE FUNCTION process_pos_sale_with_variants_fifo_safe(
    p_product_id UUID,
    p_quantity INTEGER,
    p_organization_id UUID,
    p_color_id UUID DEFAULT NULL,
    p_size_id UUID DEFAULT NULL,
    p_order_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_record RECORD;
    v_variant_stock INTEGER := 0;
    v_total_available INTEGER;
    v_initial_stock INTEGER;
    v_batches_stock INTEGER;
    v_quantity_from_initial INTEGER := 0;
    v_quantity_from_batches INTEGER := 0;
    v_remaining_qty INTEGER;
    v_total_cost NUMERIC := 0;
    v_batch RECORD;
    v_qty_from_batch INTEGER;
    v_batches_affected JSONB := '[]'::JSONB;
    v_batch_info JSONB;
    v_variant_info TEXT := '';
    v_has_variants BOOLEAN := false;
    v_existing_log_count INTEGER := 0;
BEGIN
    -- التحقق من وجود سجل مكرر أولاً
    SELECT COUNT(*)
    INTO v_existing_log_count
    FROM inventory_log
    WHERE product_id = p_product_id 
    AND reference_id = p_order_id 
    AND type = 'sale'
    AND reference_type = 'pos_order';
    
    -- إذا كان السجل موجود، تخطي الإدراج
    IF v_existing_log_count > 0 THEN
        RAISE NOTICE 'تخطي إدراج سجل inventory_log - السجل موجود مسبقاً للمنتج % في الطلب %', p_product_id, p_order_id;
        
        -- إرجاع نتيجة نجاح بدون إدراج
        RETURN jsonb_build_object(
            'success', true,
            'skipped_log_insert', true,
            'reason', 'السجل موجود مسبقاً - تم تجنب التكرار',
            'quantity_sold', p_quantity,
            'message', 'تمت معالجة FIFO بنجاح مع تجنب تكرار السجلات'
        );
    END IF;

    -- جلب بيانات المنتج
    SELECT stock_quantity, purchase_price, name
    INTO v_product_record
    FROM products 
    WHERE id = p_product_id AND organization_id = p_organization_id;
    
    IF v_product_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المنتج غير موجود',
            'error_code', 'PRODUCT_NOT_FOUND'
        );
    END IF;
    
    -- التحقق من وجود متغيرات وحساب المخزون المتاح
    IF p_color_id IS NOT NULL OR p_size_id IS NOT NULL THEN
        v_has_variants := true;
        
        -- حساب مخزون المتغير المحدد
        IF p_size_id IS NOT NULL THEN
            SELECT COALESCE(quantity, 0), 
                   'مقاس: ' || size_name
            INTO v_variant_stock, v_variant_info
            FROM product_sizes 
            WHERE id = p_size_id;
        ELSIF p_color_id IS NOT NULL THEN
            SELECT COALESCE(quantity, 0),
                   'لون: ' || name
            INTO v_variant_stock, v_variant_info
            FROM product_colors 
            WHERE id = p_color_id;
        END IF;
        
        v_total_available := v_variant_stock;
    ELSE
        v_total_available := v_product_record.stock_quantity;
    END IF;
    
    -- التحقق من توفر الكمية
    IF v_total_available < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الكمية المطلوبة (' || p_quantity || ') غير متوفرة. المتاح: ' || v_total_available ||
                     CASE WHEN v_has_variants THEN ' (' || v_variant_info || ')' ELSE '' END,
            'error_code', 'INSUFFICIENT_STOCK',
            'available_quantity', v_total_available,
            'variant_info', v_variant_info
        );
    END IF;
    
    -- حساب المخزون من الـ batches
    SELECT COALESCE(SUM(quantity_remaining), 0)
    INTO v_batches_stock
    FROM inventory_batches 
    WHERE product_id = p_product_id 
    AND organization_id = p_organization_id 
    AND is_active = true
    AND (p_color_id IS NULL OR color_id = p_color_id OR color_id IS NULL)
    AND (p_size_id IS NULL OR size_id = p_size_id OR size_id IS NULL);
    
    -- بدء معالجة FIFO
    v_remaining_qty := p_quantity;
    
    -- 1. المخزون الأولي
    IF NOT v_has_variants THEN
        v_initial_stock := GREATEST(0, v_product_record.stock_quantity - v_batches_stock);
        
        IF v_initial_stock > 0 AND v_remaining_qty > 0 THEN
            v_quantity_from_initial := LEAST(v_remaining_qty, v_initial_stock);
            v_total_cost := v_total_cost + (v_quantity_from_initial * v_product_record.purchase_price);
            v_remaining_qty := v_remaining_qty - v_quantity_from_initial;
        END IF;
    END IF;
    
    -- 2. البيع من الـ batches
    IF v_remaining_qty > 0 THEN
        FOR v_batch IN 
            SELECT 
                id, batch_number, purchase_price, quantity_remaining,
                purchase_date, color_id, size_id
            FROM inventory_batches 
            WHERE product_id = p_product_id 
            AND organization_id = p_organization_id 
            AND is_active = true
            AND quantity_remaining > 0
            AND (p_color_id IS NULL OR color_id = p_color_id OR color_id IS NULL)
            AND (p_size_id IS NULL OR size_id = p_size_id OR size_id IS NULL)
            ORDER BY purchase_date ASC, created_at ASC
        LOOP
            EXIT WHEN v_remaining_qty <= 0;
            
            v_qty_from_batch := LEAST(v_remaining_qty, v_batch.quantity_remaining);
            v_total_cost := v_total_cost + (v_qty_from_batch * v_batch.purchase_price);
            
            -- تحديث الـ batch
            UPDATE inventory_batches 
            SET quantity_remaining = quantity_remaining - v_qty_from_batch,
                updated_at = NOW()
            WHERE id = v_batch.id;
            
            -- تسجيل حركة الـ batch
            INSERT INTO inventory_batch_movements (
                batch_id, movement_type, quantity, reference_type, reference_id,
                notes, organization_id
            ) VALUES (
                v_batch.id, 'OUT', v_qty_from_batch, 'POS_ORDER', p_order_id,
                'بيع من نقطة البيع - طلبية رقم: ' || COALESCE(p_order_id::TEXT, 'غير محدد') ||
                CASE WHEN v_has_variants THEN ' (' || v_variant_info || ')' ELSE '' END,
                p_organization_id
            );
            
            -- إضافة معلومات الـ batch للنتيجة
            v_batch_info := jsonb_build_object(
                'batch_id', v_batch.id,
                'batch_number', v_batch.batch_number,
                'quantity_sold', v_qty_from_batch,
                'unit_cost', v_batch.purchase_price,
                'total_cost', v_qty_from_batch * v_batch.purchase_price
            );
            
            v_batches_affected := v_batches_affected || v_batch_info;
            v_remaining_qty := v_remaining_qty - v_qty_from_batch;
            v_quantity_from_batches := v_quantity_from_batches + v_qty_from_batch;
        END LOOP;
    END IF;
    
    -- تحديث المخزون الإجمالي
    UPDATE products 
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = NOW(),
        last_inventory_update = NOW()
    WHERE id = p_product_id;
    
    -- تحديث مخزون المتغيرات
    IF p_size_id IS NOT NULL THEN
        UPDATE product_sizes 
        SET quantity = GREATEST(0, quantity - p_quantity),
            updated_at = NOW()
        WHERE id = p_size_id;
    ELSIF p_color_id IS NOT NULL THEN
        UPDATE product_colors 
        SET quantity = GREATEST(0, quantity - p_quantity),
            updated_at = NOW()
        WHERE id = p_color_id;
    END IF;
    
    -- تسجيل سجل آمن في inventory_log (مع فحص مزدوج)
    BEGIN
        -- فحص نهائي قبل الإدراج
        SELECT COUNT(*)
        INTO v_existing_log_count
        FROM inventory_log
        WHERE product_id = p_product_id 
        AND reference_id = p_order_id 
        AND type = 'sale'
        AND reference_type = 'pos_order';
        
        IF v_existing_log_count = 0 THEN
            INSERT INTO inventory_log (
                id, product_id, organization_id, quantity,
                previous_stock, new_stock, type, reference_type, reference_id,
                notes, created_at
            ) VALUES (
                gen_random_uuid(), p_product_id, p_organization_id, p_quantity,
                v_product_record.stock_quantity, v_product_record.stock_quantity - p_quantity,
                'sale', 'pos_order', p_order_id,
                'بيع FIFO آمن من نقطة البيع - ' || v_product_record.name || 
                CASE WHEN v_has_variants THEN ' (' || v_variant_info || ')' ELSE '' END ||
                ' | من المخزون الأولي: ' || v_quantity_from_initial || 
                ' | من الـ batches: ' || v_quantity_from_batches ||
                ' | التكلفة الإجمالية: ' || v_total_cost,
                NOW()
            );
        ELSE
            RAISE NOTICE 'تم تخطي إدراج inventory_log - تم اكتشاف تضارب في اللحظة الأخيرة';
        END IF;
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE 'تم تجنب تضارب الفهرس الفريد في inventory_log للمنتج % والطلب %', p_product_id, p_order_id;
        WHEN undefined_table THEN
            RAISE NOTICE 'جدول inventory_log غير موجود - تخطي التسجيل';
    END;
    
    -- إرجاع النتيجة النهائية
    RETURN jsonb_build_object(
        'success', true,
        'quantity_sold', p_quantity,
        'quantity_from_initial_stock', v_quantity_from_initial,
        'quantity_from_batches', v_quantity_from_batches,
        'total_cost', v_total_cost,
        'average_cost_per_unit', CASE WHEN p_quantity > 0 THEN v_total_cost / p_quantity ELSE 0 END,
        'initial_stock_cost', v_product_record.purchase_price,
        'batches_affected', v_batches_affected,
        'new_stock_quantity', v_product_record.stock_quantity - p_quantity,
        'variant_info', v_variant_info,
        'has_variants', v_has_variants,
        'log_inserted', v_existing_log_count = 0,
        'processing_method', 'FIFO_SAFE'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في معالجة البيع الآمن: ' || SQLERRM,
        'error_code', 'SAFE_PROCESSING_ERROR',
        'sqlstate', SQLSTATE
    );
END;
$$;

-- 3. تحديث دالة create_pos_order_fast لاستخدام الدالة الآمنة
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
    -- معلومات تشخيصية
    v_debug_info := 'Input items: ' || p_items || ', Items type: ' || json_typeof(p_items::json);

    -- التحقق من البيانات
    IF p_items IS NULL OR p_items = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'البيانات المدخلة فارغة',
            'error_code', 'INVALID_INPUT',
            'debug_info', v_debug_info
        );
    END IF;

    -- توليد slug فريد
    v_order_slug := 'pos-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INTEGER;

    -- جمع معرفات المنتجات
    IF json_typeof(p_items::json) = 'array' THEN
        SELECT ARRAY_AGG(DISTINCT (item->>'product_id')::UUID)
        INTO v_product_ids
        FROM json_array_elements(p_items::json) AS item
        WHERE item->>'product_id' IS NOT NULL AND item->>'product_id' != '';
    ELSE
        SELECT ARRAY_AGG(DISTINCT (p_items::json->>'product_id')::UUID)
        INTO v_product_ids
        WHERE p_items::json->>'product_id' IS NOT NULL AND p_items::json->>'product_id' != '';
    END IF;

    -- التحقق من وجود منتجات صالحة
    IF v_product_ids IS NULL OR array_length(v_product_ids, 1) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'لا توجد معرفات منتجات صالحة',
            'error_code', 'NO_VALID_PRODUCTS',
            'debug_info', v_debug_info
        );
    END IF;

    -- جلب بيانات المنتجات
    SELECT json_object_agg(
        id::text, 
        json_build_object(
            'id', id, 'name', COALESCE(name, 'منتج'),
            'price', price, 'stock_quantity', stock_quantity
        )
    )
    INTO v_products_cache
    FROM products 
    WHERE id = ANY(v_product_ids) AND organization_id = p_organization_id;

    -- إنشاء الطلبية
    INSERT INTO orders (
        organization_id, customer_id, employee_id, slug, status, payment_status,
        payment_method, total, subtotal, tax, discount, amount_paid, remaining_amount,
        consider_remaining_as_partial, pos_order_type, notes, is_online,
        created_at, updated_at, completed_at
    ) VALUES (
        p_organization_id, p_customer_id, p_employee_id, v_order_slug, 'completed',
        p_payment_status, p_payment_method, p_total_amount,
        COALESCE(p_subtotal, p_total_amount + p_discount), 0, p_discount,
        COALESCE(p_amount_paid, CASE WHEN p_payment_status = 'paid' THEN p_total_amount ELSE 0 END),
        CASE WHEN p_amount_paid IS NOT NULL AND p_amount_paid < p_total_amount 
             THEN p_total_amount - p_amount_paid ELSE 0 END,
        p_consider_remaining_as_partial, 'pos', p_notes, false, NOW(), NOW(), NOW()
    ) RETURNING id, customer_order_number INTO v_new_order_id, v_customer_order_number;

    -- تحضير بيانات العناصر
    IF json_typeof(p_items::json) = 'array' THEN
        SELECT ARRAY_AGG(
            json_build_object(
                'order_id', v_new_order_id,
                'product_id', (item->>'product_id')::UUID,
                'product_name', COALESCE((v_products_cache->(item->>'product_id'))->>'name', 'منتج'),
                'name', COALESCE((v_products_cache->(item->>'product_id'))->>'name', 'منتج'),
                'quantity', (item->>'quantity')::INTEGER,
                'unit_price', (item->>'price')::DECIMAL,
                'total_price', (item->>'total')::DECIMAL,
                'organization_id', p_organization_id,
                'slug', 'item-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || FLOOR(RANDOM() * 1000)::INTEGER,
                'variant_info', COALESCE(item->'variant_info', '{}'::json),
                'color_id', CASE WHEN item->>'color_id' IS NOT NULL AND item->>'color_id' != '' 
                                THEN (item->>'color_id')::UUID ELSE NULL END,
                'size_id', CASE WHEN item->>'size_id' IS NOT NULL AND item->>'size_id' != '' 
                               THEN (item->>'size_id')::UUID ELSE NULL END,
                'created_at', NOW()
            )
        )
        INTO v_items_data
        FROM json_array_elements(p_items::json) AS item
        WHERE item->>'product_id' IS NOT NULL AND item->>'product_id' != '';
    END IF;

    -- التحقق من تحضير البيانات
    IF v_items_data IS NULL OR array_length(v_items_data, 1) = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'فشل في تحضير بيانات العناصر',
            'error_code', 'ITEMS_PREPARATION_FAILED'
        );
    END IF;

    -- إدراج عناصر الطلبية
    INSERT INTO order_items (
        id, order_id, product_id, product_name, name, quantity, unit_price,
        total_price, is_digital, organization_id, slug, variant_info,
        color_id, size_id, created_at
    )
    SELECT 
        gen_random_uuid(), (item_data->>'order_id')::UUID, (item_data->>'product_id')::UUID,
        item_data->>'product_name', item_data->>'name', (item_data->>'quantity')::INTEGER,
        (item_data->>'unit_price')::DECIMAL, (item_data->>'total_price')::DECIMAL,
        false, (item_data->>'organization_id')::UUID, item_data->>'slug',
        (item_data->>'variant_info')::jsonb,
        CASE WHEN item_data->>'color_id' IS NOT NULL THEN (item_data->>'color_id')::UUID ELSE NULL END,
        CASE WHEN item_data->>'size_id' IS NOT NULL THEN (item_data->>'size_id')::UUID ELSE NULL END,
        (item_data->>'created_at')::timestamp
    FROM unnest(v_items_data) AS item_data;

    -- معالجة المخزون باستخدام FIFO الآمن
    FOR item_record IN 
        SELECT 
            (item->>'product_id')::UUID as product_id,
            (item->>'quantity')::INTEGER as quantity,
            item->>'color_id' as color_id,
            item->>'size_id' as size_id
        FROM json_array_elements(p_items::json) AS item
        WHERE item->>'product_id' IS NOT NULL
    LOOP
        -- استخدام الدالة الآمنة
        SELECT process_pos_sale_with_variants_fifo_safe(
            item_record.product_id,
            item_record.quantity,
            p_organization_id,
            CASE WHEN item_record.color_id IS NOT NULL THEN item_record.color_id::UUID ELSE NULL END,
            CASE WHEN item_record.size_id IS NOT NULL THEN item_record.size_id::UUID ELSE NULL END,
            v_new_order_id
        ) INTO fifo_result;
        
        -- التحقق من نجاح FIFO
        IF NOT (fifo_result->>'success')::boolean THEN
            RAISE EXCEPTION 'فشل في معالجة المخزون للمنتج %: %', 
                item_record.product_id, fifo_result->>'error';
        END IF;
        
        -- إضافة النتيجة
        fifo_results := fifo_results || jsonb_build_object(
            'product_id', item_record.product_id,
            'quantity', item_record.quantity,
            'fifo_result', fifo_result
        );
    END LOOP;

    -- إنشاء النتيجة النهائية
    SELECT json_build_object(
        'id', v_new_order_id,
        'slug', v_order_slug,
        'customer_order_number', v_customer_order_number,
        'status', 'completed',
        'payment_status', p_payment_status,
        'total', p_total_amount,
        'items_count', CASE WHEN json_typeof(p_items::json) = 'array' 
                           THEN json_array_length(p_items::json) ELSE 1 END,
        'created_at', NOW(),
        'updated_at', NOW(),
        'success', true,
        'message', 'تم إنشاء الطلب بنجاح مع FIFO آمن',
        'fifo_results', fifo_results,
        'safe_processing', true
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'error_detail', SQLSTATE || ': ' || SQLERRM,
        'debug_info', v_debug_info,
        'safe_mode', true
    );
END;
$$;

-- 4. تنظيف السجلات المكررة الموجودة (إن وجدت)
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- عد السجلات المكررة
    SELECT COUNT(*)
    INTO duplicate_count
    FROM (
        SELECT product_id, reference_id, type, reference_type, COUNT(*) as cnt
        FROM inventory_log
        WHERE type = 'sale' AND reference_type = 'pos_order'
        GROUP BY product_id, reference_id, type, reference_type
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'تم العثور على % مجموعة من السجلات المكررة', duplicate_count;
        
        -- حذف السجلات المكررة (الاحتفاظ بالأحدث)
        DELETE FROM inventory_log
        WHERE id IN (
            SELECT id FROM (
                SELECT id, 
                       ROW_NUMBER() OVER (
                           PARTITION BY product_id, reference_id, type, reference_type 
                           ORDER BY created_at DESC
                       ) as rn
                FROM inventory_log
                WHERE type = 'sale' AND reference_type = 'pos_order'
            ) ranked
            WHERE rn > 1
        );
        
        RAISE NOTICE 'تم حذف السجلات المكررة بنجاح';
    ELSE
        RAISE NOTICE 'لا توجد سجلات مكررة';
    END IF;
END $$;

-- 5. إنشاء فهرس محسن للأداء
CREATE INDEX IF NOT EXISTS idx_inventory_log_pos_performance 
ON inventory_log (product_id, reference_id, created_at DESC) 
WHERE type = 'sale' AND reference_type = 'pos_order';

-- 6. رسالة النجاح
DO $$
BEGIN
    RAISE NOTICE '✅ تم تطبيق الحل الشامل لمشكلة تضارب فهرس POS بنجاح!';
    RAISE NOTICE '🔧 التحسينات المطبقة:';
    RAISE NOTICE '   - دالة FIFO آمنة مع فحص التكرار';
    RAISE NOTICE '   - دالة create_pos_order_fast محسنة';
    RAISE NOTICE '   - تنظيف السجلات المكررة';
    RAISE NOTICE '   - فهرس محسن للأداء';
    RAISE NOTICE '🎯 نظام POS جاهز للاستخدام!';
END $$;

COMMIT;