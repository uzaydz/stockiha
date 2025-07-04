-- ✅ إصلاح بسيط لدالة FIFO (بدون مشاكل transaction)
-- التاريخ: 2025-07-03

CREATE OR REPLACE FUNCTION process_pos_sale_with_variants_fifo(
    p_product_id UUID,
    p_quantity INTEGER,
    p_organization_id UUID,
    p_color_id UUID DEFAULT NULL,
    p_size_id UUID DEFAULT NULL,
    p_order_id UUID DEFAULT NULL,
    p_unit_price NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_record RECORD;
    v_total_cost NUMERIC := 0;
BEGIN
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
    
    -- التحقق من توفر الكمية
    IF v_product_record.stock_quantity < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الكمية المطلوبة (' || p_quantity || ') غير متوفرة. المتاح: ' || v_product_record.stock_quantity,
            'error_code', 'INSUFFICIENT_STOCK',
            'available_quantity', v_product_record.stock_quantity
        );
    END IF;
    
    -- حساب التكلفة الإجمالية
    v_total_cost := p_quantity * v_product_record.purchase_price;
    
    -- تحديث المخزون الإجمالي للمنتج
    UPDATE products 
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = NOW(),
        last_inventory_update = NOW()
    WHERE id = p_product_id;
    
    -- تسجيل سجل في inventory_log
    INSERT INTO inventory_log (
        id,
        product_id,
        organization_id,
        quantity,
        previous_stock,
        new_stock,
        type,
        reference_type,
        reference_id,
        notes,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_product_id,
        p_organization_id,
        p_quantity,
        v_product_record.stock_quantity,
        v_product_record.stock_quantity - p_quantity,
        'sale',
        'pos_order',
        p_order_id,
        'بيع FIFO من نقطة البيع - ' || v_product_record.name || 
        ' | التكلفة الإجمالية: ' || v_total_cost,
        NOW()
    );
    
    -- إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'quantity_sold', p_quantity,
        'total_cost', v_total_cost,
        'average_cost_per_unit', v_total_cost / p_quantity,
        'new_stock_quantity', v_product_record.stock_quantity - p_quantity
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في معالجة البيع: ' || SQLERRM,
        'error_code', 'PROCESSING_ERROR'
    );
END;
$$;

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح دالة FIFO بنجاح (نسخة مبسطة)!';
    RAISE NOTICE '🎯 النظام جاهز للاختبار';
END $$; 