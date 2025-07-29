-- دالة محسنة جداً لإنشاء طلبيات نقطة البيع بسرعة فائقة
-- التاريخ: 2025-01-14
-- الغرض: تقليل وقت إنشاء الطلبيات من 2.5 ثانية إلى أقل من 500ms

CREATE OR REPLACE FUNCTION create_pos_order_ultra_fast(
    p_organization_id UUID,
    p_employee_id UUID,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_payment_status TEXT DEFAULT 'paid',
    p_notes TEXT DEFAULT '',
    p_amount_paid NUMERIC DEFAULT NULL,
    p_discount NUMERIC DEFAULT 0,
    p_subtotal NUMERIC DEFAULT NULL
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
    v_result JSONB;
    v_final_subtotal NUMERIC;
    v_final_amount_paid NUMERIC;
    v_items_to_insert JSONB[] := ARRAY[]::JSONB[];
    v_products_to_update JSONB[] := ARRAY[]::JSONB[];
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
        0, -- الضريبة
        p_discount,
        v_final_amount_paid,
        GREATEST(0, p_total_amount - v_final_amount_paid),
        'pos',
        p_notes,
        false,
        NOW(),
        NOW(),
        NOW()
    );

    -- تحضير عناصر الطلبية والمنتجات للتحديث
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- تحضير عنصر الطلبية للإدراج المجمع
        v_items_to_insert := v_items_to_insert || jsonb_build_object(
            'id', gen_random_uuid(),
            'order_id', v_new_order_id,
            'product_id', (v_item->>'product_id')::UUID,
            'product_name', COALESCE(v_item->>'product_name', v_item->>'name', 'منتج'),
            'name', COALESCE(v_item->>'product_name', v_item->>'name', 'منتج'),
            'quantity', (v_item->>'quantity')::INTEGER,
            'unit_price', (v_item->>'unit_price')::NUMERIC,
            'total_price', (v_item->>'total_price')::NUMERIC,
            'is_digital', COALESCE((v_item->>'is_digital')::BOOLEAN, false),
            'is_wholesale', COALESCE((v_item->>'is_wholesale')::BOOLEAN, false),
            'original_price', COALESCE((v_item->>'original_price')::NUMERIC, (v_item->>'unit_price')::NUMERIC),
            'organization_id', p_organization_id,
            'slug', 'item-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || floor(random() * 1000)::TEXT,
            'variant_info', COALESCE(v_item->'variant_info', '{}'::jsonb),
            'color_id', CASE WHEN v_item ? 'color_id' THEN (v_item->>'color_id')::UUID ELSE NULL END,
            'size_id', CASE WHEN v_item ? 'size_id' THEN (v_item->>'size_id')::UUID ELSE NULL END,
            'color_name', v_item->>'color_name',
            'size_name', v_item->>'size_name',
            'variant_display_name', COALESCE(v_item->>'variant_display_name', v_item->>'product_name', v_item->>'name', 'منتج'),
            'created_at', NOW()
        );

        -- تحضير تحديث المخزون
        v_products_to_update := v_products_to_update || jsonb_build_object(
            'product_id', v_item->>'product_id',
            'quantity_sold', v_item->>'quantity'
        );
    END LOOP;

    -- إدراج عناصر الطلبية بشكل مجمع
    INSERT INTO order_items (
        id, order_id, product_id, product_name, name, quantity, unit_price, total_price,
        is_digital, is_wholesale, original_price, organization_id, slug, variant_info,
        color_id, size_id, color_name, size_name, variant_display_name, created_at
    )
    SELECT 
        (item->>'id')::UUID,
        (item->>'order_id')::UUID,
        (item->>'product_id')::UUID,
        item->>'product_name',
        item->>'name',
        (item->>'quantity')::INTEGER,
        (item->>'unit_price')::NUMERIC,
        (item->>'total_price')::NUMERIC,
        (item->>'is_digital')::BOOLEAN,
        (item->>'is_wholesale')::BOOLEAN,
        (item->>'original_price')::NUMERIC,
        (item->>'organization_id')::UUID,
        item->>'slug',
        (item->>'variant_info')::JSONB,
        CASE WHEN item->>'color_id' IS NOT NULL THEN (item->>'color_id')::UUID ELSE NULL END,
        CASE WHEN item->>'size_id' IS NOT NULL THEN (item->>'size_id')::UUID ELSE NULL END,
        item->>'color_name',
        item->>'size_name',
        item->>'variant_display_name',
        (item->>'created_at')::TIMESTAMP
    FROM unnest(v_items_to_insert) AS item;

    -- تحديث المخزون بشكل مجمع وسريع
    PERFORM bulk_update_products_stock_ultra_fast(
        array_to_json(v_products_to_update)::JSONB
    );

    -- إنشاء معاملة مالية بسيطة
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
        v_final_amount_paid,
        'sale',
        p_payment_method,
        'دفع طلبية نقطة البيع',
        p_employee_id,
        p_organization_id,
        NOW()
    );

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
        'message', 'تم إنشاء الطلب بسرعة فائقة'
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

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION create_pos_order_ultra_fast(UUID, UUID, JSONB, NUMERIC, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC) TO authenticated;

-- إنشاء فهارس محسنة إذا لم تكن موجودة
CREATE INDEX IF NOT EXISTS idx_orders_pos_ultra_fast 
ON orders (organization_id, pos_order_type, created_at DESC) 
WHERE pos_order_type = 'pos';

CREATE INDEX IF NOT EXISTS idx_order_items_ultra_fast 
ON order_items (order_id, product_id, created_at DESC);

COMMENT ON FUNCTION create_pos_order_ultra_fast IS 
'دالة محسنة لإنشاء طلبيات نقطة البيع بسرعة فائقة - تستهدف أقل من 500ms'; 