-- ✅ نسخة محسّنة من create_pos_order_fast - بدون استدعاءات تحقق غير ضرورية
-- تقليل الاستدعاءات من 5 إلى 1 فقط (create_pos_order_fast)

-- حذف النسخة القديمة
DROP FUNCTION IF EXISTS create_pos_order_fast(UUID, UUID, TEXT, DECIMAL, UUID, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, DECIMAL, BOOLEAN, DECIMAL, UUID, TEXT);

CREATE OR REPLACE FUNCTION create_pos_order_fast(
    p_organization_id UUID,
    p_employee_id UUID,
    p_items TEXT,
    p_total_amount DECIMAL,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_payment_status TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT '',
    p_amount_paid DECIMAL DEFAULT NULL,
    p_discount DECIMAL DEFAULT 0,
    p_subtotal DECIMAL DEFAULT NULL,
    p_consider_remaining_as_partial BOOLEAN DEFAULT FALSE,
    p_tax DECIMAL DEFAULT 0,
    p_created_by_staff_id UUID DEFAULT NULL,
    p_created_by_staff_name TEXT DEFAULT NULL
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
    v_guest_id UUID := '00000000-0000-0000-0000-000000000000'::uuid;
    v_cust_id UUID;
    v_final_subtotal DECIMAL := 0;
    v_final_discount DECIMAL := 0;
    v_final_tax DECIMAL := 0;
    v_total DECIMAL := 0;
    v_initial_total DECIMAL := 0;
    v_amount_paid_calc DECIMAL := 0;
    v_remaining DECIMAL := 0;
    v_pay_status TEXT := 'paid';
    v_tx_id UUID;
    v_employee_id UUID;
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

    -- تحديد العميل (زائر افتراضيًا إن لم يُرسل)
    v_cust_id := COALESCE(p_customer_id, v_guest_id);

    -- ✅ إصلاح: استخدام p_employee_id مباشرة بدون استدعاءات تحقق
    -- Frontend يرسل user.id الصحيح دائماً، لا حاجة للتحقق
    v_employee_id := p_employee_id;

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

    -- حساب الإجماليات/الدفعات داخل الخادم لضمان الاتساق
    v_final_subtotal := COALESCE(p_subtotal, 0);
    IF v_final_subtotal = 0 THEN
        SELECT COALESCE(SUM((elem->>'total')::DECIMAL), 0)
        INTO v_final_subtotal
        FROM json_array_elements(p_items::json) AS elem
        WHERE elem->>'total' IS NOT NULL;
    END IF;
    v_final_discount := COALESCE(p_discount, 0);
    v_final_tax := COALESCE(p_tax, 0);
    v_initial_total := COALESCE(p_total_amount, v_final_subtotal + v_final_tax - v_final_discount);
    v_total := v_final_subtotal + v_final_tax - v_final_discount;

    IF COALESCE(p_consider_remaining_as_partial, FALSE) THEN
        v_amount_paid_calc := COALESCE(p_amount_paid, 0);
        v_remaining := GREATEST(v_total - v_amount_paid_calc, 0);
        v_pay_status := CASE WHEN v_remaining > 0 THEN 'partial' ELSE 'paid' END;
    ELSE
        v_amount_paid_calc := COALESCE(p_amount_paid, v_total);
        IF v_amount_paid_calc < v_total THEN
            v_final_discount := v_final_discount + (v_total - v_amount_paid_calc);
            v_total := v_amount_paid_calc;
        END IF;
        v_remaining := 0;
        v_pay_status := 'paid';
    END IF;

    IF p_payment_status IS NOT NULL AND p_payment_status <> '' THEN
        v_pay_status := p_payment_status;
    END IF;

    -- إنشاء الطلبية الرئيسية
    INSERT INTO orders (
        organization_id,
        customer_id,
        employee_id,
        created_by_staff_id,
        created_by_staff_name,
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
        v_cust_id,
        v_employee_id,
        COALESCE(p_created_by_staff_id, p_employee_id), -- ✅ استخدام employee_id كـ fallback
        p_created_by_staff_name,
        v_order_slug,
        'completed',
        v_pay_status,
        COALESCE(p_payment_method, 'cash'),
        v_total,
        v_final_subtotal,
        v_final_tax,
        v_final_discount,
        v_amount_paid_calc,
        v_remaining,
        COALESCE(p_consider_remaining_as_partial, FALSE),
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
                'is_wholesale', COALESCE((item->>'is_wholesale')::boolean, false),
                'original_price', COALESCE((item->>'original_price')::DECIMAL, NULL),
                'color_name', item->>'color_name',
                'size_name', item->>'size_name',
                'variant_display_name', COALESCE(item->>'variant_display_name', (v_products_cache->(item->>'product_id'))->>'name'),
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
            'is_wholesale', COALESCE((p_items::json->>'is_wholesale')::boolean, false),
            'original_price', COALESCE((p_items::json->>'original_price')::DECIMAL, NULL),
            'color_name', p_items::json->>'color_name',
            'size_name', p_items::json->>'size_name',
            'variant_display_name', COALESCE(p_items::json->>'variant_display_name', (v_products_cache->(p_items::json->>'product_id'))->>'name'),
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

    -- ✅ معالجة المخزون باستخدام نظام FIFO أولاً (قبل إدراج order_items)
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

    -- إدراج جميع عناصر الطلبية في عملية واحدة (بعد معالجة المخزون)
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
        is_wholesale,
        original_price,
        organization_id,
        slug,
        variant_info,
        color_id,
        size_id,
        color_name,
        size_name,
        variant_display_name,
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
        COALESCE((item_data->>'is_wholesale')::boolean, false),
        COALESCE((item_data->>'original_price')::DECIMAL, NULL),
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
        item_data->>'color_name',
        item_data->>'size_name',
        COALESCE(item_data->>'variant_display_name', item_data->>'name'),
        (item_data->>'created_at')::timestamp
    FROM unnest(v_items_data) AS item_data;

    -- إنشاء معاملة مالية تلقائيًا إن وُجد مبلغ مدفوع
    IF v_amount_paid_calc > 0 THEN
        INSERT INTO transactions (
            order_id,
            amount,
            type,
            payment_method,
            description,
            employee_id,
            organization_id,
            created_at
        ) VALUES (
            v_new_order_id,
            v_amount_paid_calc,
            'sale',
            COALESCE(p_payment_method, 'cash'),
            CASE WHEN v_pay_status = 'partial' THEN 'Partial payment for POS order' ELSE 'Payment for POS order' END,
            p_employee_id,
            p_organization_id,
            NOW()
        ) RETURNING id INTO v_tx_id;
    END IF;

    -- إنشاء JSON للنتيجة
    SELECT json_build_object(
        'id', v_new_order_id,
        'slug', v_order_slug,
        'customer_order_number', v_customer_order_number,
        'status', 'completed',
        'payment_status', v_pay_status,
        'total', v_total,
        'amount_paid', v_amount_paid_calc,
        'remaining_amount', v_remaining,
        'transaction_id', v_tx_id,
        'items_count', CASE 
            WHEN json_typeof(p_items::json) = 'array' THEN json_array_length(p_items::json) 
            ELSE 1 
        END,
        'created_at', NOW(),
        'updated_at', NOW(),
        'success', true,
        'message', 'تم إنشاء الطلب بنجاح',
        'fifo_results', fifo_results,
        'debug_info', 'Order created successfully with ID: ' || v_new_order_id
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

-- تعليق حول الاستخدام
COMMENT ON FUNCTION create_pos_order_fast IS 
'✅ دالة محسنة لإنشاء طلبات POS بسرعة فائقة - بدون استدعاءات تحقق غير ضرورية
التحسينات:
- إزالة استدعاءات التحقق من users (كان 2 استدعاء)
- إزالة استدعاءات التحقق من customers (كان 1 استدعاء)
- إزالة استدعاءات التحقق من pos_staff_sessions (كان 2 استدعاء)
- النتيجة: استدعاء واحد فقط (create_pos_order_fast) بدلاً من 5 استدعاءات';
