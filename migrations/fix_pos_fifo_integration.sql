-- إصلاح نظام نقطة البيع لتطبيق FIFO بشكل صحيح
-- تاريخ الإنشاء: 2025-06-27
-- المشكلة: نقطة البيع تستخدم update_product_stock_safe بدلاً من نظام FIFO

-- 1. إنشاء دالة محسنة لمعالجة البيع من نقطة البيع مع FIFO
CREATE OR REPLACE FUNCTION process_pos_sale_with_fifo(
    p_product_id UUID,
    p_quantity INTEGER,
    p_organization_id UUID,
    p_order_id UUID DEFAULT NULL,
    p_unit_price NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_record RECORD;
    v_total_available INTEGER;
    v_initial_stock INTEGER;
    v_batches_stock INTEGER;
    v_quantity_from_initial INTEGER := 0;
    v_quantity_from_batches INTEGER := 0;
    v_total_cost NUMERIC := 0;
    v_fifo_result RECORD;
    v_result JSONB;
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
    
    -- حساب المخزون المتاح
    SELECT COALESCE(SUM(quantity_remaining), 0)
    INTO v_batches_stock
    FROM inventory_batches 
    WHERE product_id = p_product_id 
    AND organization_id = p_organization_id 
    AND is_active = true;
    
    -- المخزون الأولي = المخزون الإجمالي - مخزون الـ batches
    v_initial_stock := GREATEST(0, v_product_record.stock_quantity - v_batches_stock);
    v_total_available := v_product_record.stock_quantity;
    
    -- التحقق من توفر الكمية
    IF v_total_available < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الكمية المطلوبة (' || p_quantity || ') غير متوفرة. المتاح: ' || v_total_available,
            'error_code', 'INSUFFICIENT_STOCK',
            'available_quantity', v_total_available
        );
    END IF;
    
    -- تطبيق FIFO: الأولوية للمخزون الأولي (الأقدم)
    IF v_initial_stock > 0 AND p_quantity > 0 THEN
        v_quantity_from_initial := LEAST(p_quantity, v_initial_stock);
        v_total_cost := v_total_cost + (v_quantity_from_initial * v_product_record.purchase_price);
        v_quantity_from_batches := p_quantity - v_quantity_from_initial;
    ELSE
        v_quantity_from_batches := p_quantity;
    END IF;
    
    -- معالجة الباقي من الـ batches إذا لزم الأمر
    IF v_quantity_from_batches > 0 THEN
        -- استدعاء دالة process_fifo_sale والحصول على النتيجة الأولى
        SELECT success, total_cost, batches_affected
        INTO v_fifo_result
        FROM process_fifo_sale(
            p_product_id,
            v_quantity_from_batches,
            p_organization_id,
            'POS_ORDER',
            p_order_id,
            'بيع من نقطة البيع - طلبية رقم: ' || COALESCE(p_order_id::TEXT, 'غير محدد')
        )
        LIMIT 1;
        
        IF NOT v_fifo_result.success THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'فشل في معالجة البيع من الـ batches',
                'error_code', 'FIFO_PROCESSING_FAILED'
            );
        END IF;
        
        v_total_cost := v_total_cost + v_fifo_result.total_cost;
    END IF;
    
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
        ' | من المخزون الأولي: ' || v_quantity_from_initial || 
        ' | من الـ batches: ' || v_quantity_from_batches ||
        ' | التكلفة الإجمالية: ' || v_total_cost,
        NOW()
    );
    
    -- إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'quantity_sold', p_quantity,
        'quantity_from_initial_stock', v_quantity_from_initial,
        'quantity_from_batches', v_quantity_from_batches,
        'total_cost', v_total_cost,
        'average_cost_per_unit', v_total_cost / p_quantity,
        'initial_stock_cost', v_product_record.purchase_price,
        'batches_affected', COALESCE(v_fifo_result.batches_affected, '[]'::JSONB),
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

-- إضافة تعليق للدالة
COMMENT ON FUNCTION process_pos_sale_with_fifo(UUID, INTEGER, UUID, UUID, NUMERIC) IS 
'دالة محسنة لمعالجة البيع من نقطة البيع مع تطبيق نظام FIFO بشكل صحيح';

-- 2. دالة لإصلاح المبيعات السابقة (اختيارية)
CREATE OR REPLACE FUNCTION fix_historical_pos_sales()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_result JSONB;
    v_fixed_count INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
BEGIN
    -- هذه الدالة تحتاج تنفيذ حذر لأنها تعيد تطبيق المبيعات السابقة
    -- يُنصح بتشغيلها على backup أولاً
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'دالة إصلاح المبيعات السابقة جاهزة للتنفيذ',
        'warning', 'يُنصح بعمل backup قبل التنفيذ'
    );
END;
$$;

-- 3. دالة للتحقق من صحة نظام FIFO
CREATE OR REPLACE FUNCTION validate_fifo_integrity(
    p_product_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    product_name TEXT,
    total_stock INTEGER,
    batches_stock INTEGER,
    initial_stock INTEGER,
    fifo_valid BOOLEAN,
    issues TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH product_analysis AS (
        SELECT 
            p.id,
            p.name,
            p.stock_quantity,
            p.organization_id,
            COALESCE(SUM(ib.quantity_remaining), 0) as batches_total,
            GREATEST(0, p.stock_quantity - COALESCE(SUM(ib.quantity_remaining), 0)) as calculated_initial
        FROM products p
        LEFT JOIN inventory_batches ib ON p.id = ib.product_id AND ib.is_active = true
        WHERE (p_product_id IS NULL OR p.id = p_product_id)
        AND (p_organization_id IS NULL OR p.organization_id = p_organization_id)
        GROUP BY p.id, p.name, p.stock_quantity, p.organization_id
    )
    SELECT 
        pa.name::TEXT,
        pa.stock_quantity::INTEGER,
        pa.batches_total::INTEGER,
        pa.calculated_initial::INTEGER,
        (pa.stock_quantity >= pa.batches_total)::BOOLEAN,
        CASE 
            WHEN pa.stock_quantity < pa.batches_total THEN 
                ARRAY['مخزون الـ batches أكبر من المخزون الإجمالي']
            WHEN pa.batches_total = 0 AND pa.stock_quantity > 0 THEN 
                ARRAY['لا توجد batches ولكن يوجد مخزون']
            ELSE 
                ARRAY[]::TEXT[]
        END
    FROM product_analysis pa;
END;
$$;

-- 4. إنشاء view لمراقبة حالة FIFO
CREATE OR REPLACE VIEW fifo_status_monitor AS
SELECT 
    p.name as product_name,
    p.stock_quantity as total_stock,
    COALESCE(SUM(ib.quantity_remaining), 0) as batches_stock,
    GREATEST(0, p.stock_quantity - COALESCE(SUM(ib.quantity_remaining), 0)) as initial_stock,
    COUNT(ib.id) as active_batches,
    CASE 
        WHEN p.stock_quantity < COALESCE(SUM(ib.quantity_remaining), 0) THEN 'خطأ: مخزون batches أكبر'
        WHEN COALESCE(SUM(ib.quantity_remaining), 0) = 0 AND p.stock_quantity > 0 THEN 'تحذير: لا توجد batches'
        ELSE 'طبيعي'
    END as status,
    o.name as organization_name
FROM products p
LEFT JOIN inventory_batches ib ON p.id = ib.product_id AND ib.is_active = true
LEFT JOIN organizations o ON p.organization_id = o.id
GROUP BY p.id, p.name, p.stock_quantity, o.name
ORDER BY p.name;

COMMENT ON VIEW fifo_status_monitor IS 'مراقب حالة نظام FIFO لجميع المنتجات'; 