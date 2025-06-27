-- دالة محسنة لإنشاء طلبات POS بسرعة عالية
CREATE OR REPLACE FUNCTION create_pos_order_optimized(
    p_organization_id UUID,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_customer_id UUID DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_subtotal NUMERIC DEFAULT NULL,
    p_discount NUMERIC DEFAULT 0,
    p_tax NUMERIC DEFAULT 0,
    p_payment_method TEXT DEFAULT 'cash',
    p_payment_status TEXT DEFAULT 'paid',
    p_amount_paid NUMERIC DEFAULT NULL,
    p_remaining_amount NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_order_id UUID;
    v_order_slug TEXT;
    v_customer_order_number INTEGER;
    v_item JSONB;
    v_product_name TEXT;
    v_result JSONB;
    v_final_subtotal NUMERIC;
    v_final_amount_paid NUMERIC;
BEGIN
    -- تعيين القيم الافتراضية
    v_final_subtotal := COALESCE(p_subtotal, p_total_amount);
    v_final_amount_paid := COALESCE(p_amount_paid, p_total_amount);
    
    -- توليد معرف فريد للطلبية
    v_new_order_id := gen_random_uuid();
    v_order_slug := 'pos-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
                    FLOOR(RANDOM() * 1000)::INTEGER;

    -- الحصول على رقم طلبية العميل التالي
    SELECT COALESCE(MAX(customer_order_number), 0) + 1 
    INTO v_customer_order_number 
    FROM orders 
    WHERE organization_id = p_organization_id;

    -- إنشاء الطلبية الأساسية
    INSERT INTO orders (
        id,
        organization_id,
        customer_id,
        employee_id,
        slug,
        customer_order_number,
        status,
        payment_status,
        payment_method,
        total,
        subtotal,
        tax,
        discount,
        amount_paid,
        remaining_amount,
        pos_order_type,
        notes,
        is_online,
        created_at,
        updated_at,
        completed_at
    ) VALUES (
        v_new_order_id,
        p_organization_id,
        p_customer_id,
        p_employee_id,
        v_order_slug,
        v_customer_order_number,
        'completed',
        p_payment_status,
        p_payment_method,
        p_total_amount,
        v_final_subtotal,
        p_tax,
        p_discount,
        v_final_amount_paid,
        p_remaining_amount,
        'pos',
        p_notes,
        false,
        NOW(),
        NOW(),
        NOW()
    );

    -- إضافة عناصر الطلبية بشكل مجمع
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- الحصول على اسم المنتج مع تجنب GROUP BY
        SELECT name INTO v_product_name 
        FROM products 
        WHERE id = (v_item->>'product_id')::UUID
        LIMIT 1;
        
        -- استخدام اسم افتراضي إذا لم نجد المنتج
        IF v_product_name IS NULL THEN
            v_product_name := 'منتج غير محدد';
        END IF;
        
        -- إدراج عنصر الطلبية
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
        ) VALUES (
            gen_random_uuid(),
            v_new_order_id,
            (v_item->>'product_id')::UUID,
            v_product_name,
            v_product_name,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'price')::NUMERIC,
            (v_item->>'total')::NUMERIC,
            COALESCE((v_item->>'is_digital')::BOOLEAN, false),
            COALESCE((v_item->>'is_wholesale')::BOOLEAN, false),
            COALESCE((v_item->>'original_price')::NUMERIC, (v_item->>'price')::NUMERIC),
            p_organization_id,
            'item-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || floor(random() * 1000)::TEXT,
            COALESCE(v_item->'variant_info', '{}'::jsonb),
            CASE WHEN v_item ? 'color_id' THEN (v_item->>'color_id')::UUID ELSE NULL END,
            CASE WHEN v_item ? 'size_id' THEN (v_item->>'size_id')::UUID ELSE NULL END,
            v_item->>'color_name',
            v_item->>'size_name',
            COALESCE(v_item->>'variant_display_name', v_product_name),
            NOW()
        );
    END LOOP;

    -- إنشاء استجابة JSON
    v_result := jsonb_build_object(
        'success', true,
        'order_id', v_new_order_id,
        'id', v_new_order_id,
        'slug', v_order_slug,
        'customer_order_number', v_customer_order_number,
        'status', 'completed',
        'total', p_total_amount,
        'items_count', jsonb_array_length(p_items),
        'created_at', NOW(),
        'message', 'تم إنشاء الطلب بنجاح'
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- في حالة حدوث خطأ
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'message', 'فشل في إنشاء الطلب: ' || SQLERRM
    );
END;
$$;

-- إنشاء فهرس محسن للطلبات
CREATE INDEX IF NOT EXISTS idx_orders_pos_optimized 
ON orders (organization_id, is_online, created_at DESC, payment_status, total) 
WHERE is_online = false;

-- فهرس محسن لعناصر الطلبية
CREATE INDEX IF NOT EXISTS idx_order_items_pos_optimized 
ON order_items (order_id, product_id, created_at DESC);

-- فهرس محسن للألوان
CREATE INDEX IF NOT EXISTS idx_product_colors_stock_optimized 
ON product_colors (product_id, id, quantity) 
WHERE quantity > 0;

-- فهرس محسن للمقاسات
CREATE INDEX IF NOT EXISTS idx_product_sizes_stock_optimized 
ON product_sizes (product_id, color_id, id, quantity) 
WHERE quantity > 0;

-- تعليق الدالة
COMMENT ON FUNCTION create_pos_order_optimized IS 'دالة محسنة لإنشاء طلبات نقطة البيع بسرعة عالية مع تحديث المخزون المجمع للمنتجات والألوان والمقاسات'; 