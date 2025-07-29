-- إصلاح دالة FIFO المحسنة لحل مشكلة NULL في الحسابات
CREATE OR REPLACE FUNCTION process_pos_sale_with_variants_fifo_optimized(
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
    v_total_available INTEGER := 0;
    v_batches_stock INTEGER := 0;
    v_initial_stock INTEGER := 0;
    v_quantity_from_initial INTEGER := 0;
    v_quantity_from_batches INTEGER := 0;
    v_remaining_qty INTEGER;
    v_total_cost NUMERIC := 0;
    v_batch_cost NUMERIC := 0;  -- ✅ متغير منفصل لتكلفة الـ batches
    v_batch RECORD;
    v_qty_from_batch INTEGER;
    v_variant_info TEXT := '';
    v_has_variants BOOLEAN := false;
BEGIN
    -- ⚡ تحسين 1: جلب بيانات المنتج مع حساب المخزون في استعلام واحد
    SELECT 
        p.stock_quantity,
        COALESCE(p.purchase_price, 0) as purchase_price,  -- ✅ تأكد من عدم وجود NULL
        p.name,
        COALESCE(
            (SELECT SUM(ib.quantity_remaining) 
             FROM inventory_batches ib 
             WHERE ib.product_id = p.id 
             AND ib.organization_id = p_organization_id 
             AND ib.is_active = true
             AND (p_color_id IS NULL OR ib.color_id = p_color_id OR ib.color_id IS NULL)
             AND (p_size_id IS NULL OR ib.size_id = p_size_id OR ib.size_id IS NULL)
            ), 0
        ) as batches_stock
    INTO v_product_record
    FROM products p
    WHERE p.id = p_product_id AND p.organization_id = p_organization_id;
    
    -- التحقق من وجود المنتج
    IF v_product_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المنتج غير موجود',
            'error_code', 'PRODUCT_NOT_FOUND'
        );
    END IF;
    
    -- ⚡ تحسين 2: حساب المخزون المتاح بكفاءة
    v_batches_stock := COALESCE(v_product_record.batches_stock, 0);
    v_total_available := COALESCE(v_product_record.stock_quantity, 0);
    v_initial_stock := GREATEST(0, v_total_available - v_batches_stock);
    
    -- التحقق من توفر الكمية
    IF v_total_available < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الكمية المطلوبة (' || p_quantity || ') غير متوفرة. المتاح: ' || v_total_available,
            'error_code', 'INSUFFICIENT_STOCK',
            'available_quantity', v_total_available
        );
    END IF;
    
    -- تحديد نوع المتغير
    v_has_variants := (p_color_id IS NOT NULL OR p_size_id IS NOT NULL);
    
    -- بدء معالجة FIFO السريعة
    v_remaining_qty := p_quantity;
    
    -- ⚡ تحسين 3: معالجة المخزون الأولي بكفاءة
    IF NOT v_has_variants AND v_initial_stock > 0 AND v_remaining_qty > 0 THEN
        v_quantity_from_initial := LEAST(v_remaining_qty, v_initial_stock);
        v_total_cost := v_total_cost + (v_quantity_from_initial * COALESCE(v_product_record.purchase_price, 0));
        v_remaining_qty := v_remaining_qty - v_quantity_from_initial;
    END IF;
    
    -- ⚡ تحسين 4: معالجة الـ batches بتحديث مجمع
    IF v_remaining_qty > 0 THEN
        -- جلب جميع الـ batches المناسبة وتحديثها دفعة واحدة
        WITH batch_updates AS (
            SELECT 
                id,
                batch_number,
                COALESCE(purchase_price, 0) as purchase_price,  -- ✅ تأكد من عدم وجود NULL
                quantity_remaining,
                LEAST(v_remaining_qty, quantity_remaining) as qty_to_use
            FROM inventory_batches 
            WHERE product_id = p_product_id 
            AND organization_id = p_organization_id 
            AND is_active = true
            AND quantity_remaining > 0
            AND (p_color_id IS NULL OR color_id = p_color_id OR color_id IS NULL)
            AND (p_size_id IS NULL OR size_id = p_size_id OR size_id IS NULL)
            ORDER BY purchase_date ASC, created_at ASC
            LIMIT 5 -- تحديد عدد الـ batches لتحسين الأداء
        ),
        updated_batches AS (
            UPDATE inventory_batches 
            SET quantity_remaining = quantity_remaining - bu.qty_to_use,
                updated_at = NOW()
            FROM batch_updates bu
            WHERE inventory_batches.id = bu.id
            RETURNING bu.qty_to_use, bu.purchase_price
        )
        SELECT 
            COALESCE(SUM(qty_to_use), 0),
            COALESCE(SUM(qty_to_use * purchase_price), 0)
        INTO v_quantity_from_batches, v_batch_cost  -- ✅ استخدام متغير منفصل
        FROM updated_batches;
        
        -- ✅ إضافة تكلفة الـ batches للتكلفة الإجمالية بشكل آمن
        v_total_cost := v_total_cost + COALESCE(v_batch_cost, 0);
    END IF;
    
    -- ⚡ تحسين 5: تحديث المخزون الإجمالي بكفاءة
    UPDATE products 
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = NOW(),
        last_inventory_update = NOW()
    WHERE id = p_product_id;
    
    -- ⚡ تحسين 6: تسجيل سجل inventory_log بشكل مشروط وآمن
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
    ) 
    SELECT 
        gen_random_uuid(),
        p_product_id,
        p_organization_id,
        p_quantity,
        v_product_record.stock_quantity,
        v_product_record.stock_quantity - p_quantity,
        'sale',
        'pos_order',
        p_order_id,
        'بيع FIFO محسن - ' || COALESCE(v_product_record.name, 'منتج') || 
        ' | من المخزون الأولي: ' || v_quantity_from_initial || 
        ' | من الـ batches: ' || v_quantity_from_batches ||
        ' | التكلفة: ' || v_total_cost::TEXT,
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM inventory_log 
        WHERE product_id = p_product_id 
        AND reference_id = p_order_id 
        AND reference_type = 'pos_order'
        AND type = 'sale'
    );
    
    -- إرجاع النتيجة المحسنة
    RETURN jsonb_build_object(
        'success', true,
        'quantity_sold', p_quantity,
        'quantity_from_initial_stock', v_quantity_from_initial,
        'quantity_from_batches', v_quantity_from_batches,
        'total_cost', COALESCE(v_total_cost, 0),  -- ✅ تأكد من عدم وجود NULL
        'average_cost_per_unit', CASE WHEN p_quantity > 0 THEN COALESCE(v_total_cost, 0) / p_quantity ELSE 0 END,
        'previous_stock', COALESCE(v_product_record.stock_quantity, 0),
        'new_stock', COALESCE(v_product_record.stock_quantity, 0) - p_quantity,
        'processing_optimized', true,
        'has_variants', v_has_variants
    );
    
EXCEPTION 
    WHEN OTHERS THEN
        -- في حالة حدوث خطأ، إرجاع فشل لاستخدام الطريقة البديلة
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في معالجة FIFO: ' || SQLERRM,
            'error_code', 'FIFO_PROCESSING_ERROR',
            'fallback_recommended', true
        );
END;
$$; 