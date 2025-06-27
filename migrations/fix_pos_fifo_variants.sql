-- إصلاح نظام FIFO لدعم المتغيرات (الألوان والمقاسات)
-- تاريخ الإنشاء: 2025-06-27

-- دالة محسنة لمعالجة البيع مع دعم المتغيرات
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
    
    -- التحقق من وجود متغيرات وحساب المخزون المتاح
    IF p_color_id IS NOT NULL OR p_size_id IS NOT NULL THEN
        v_has_variants := true;
        
        -- حساب مخزون المتغير المحدد
        IF p_size_id IS NOT NULL THEN
            -- أولوية للمقاس لأنه أكثر تحديداً
            SELECT COALESCE(quantity, 0), 
                   'مقاس: ' || size_name
            INTO v_variant_stock, v_variant_info
            FROM product_sizes 
            WHERE id = p_size_id;
        ELSIF p_color_id IS NOT NULL THEN
            -- اللون فقط
            SELECT COALESCE(quantity, 0),
                   'لون: ' || name
            INTO v_variant_stock, v_variant_info
            FROM product_colors 
            WHERE id = p_color_id;
        END IF;
        
        -- للمتغيرات: المخزون المتاح = مخزون المتغير
        v_total_available := v_variant_stock;
    ELSE
        -- بدون متغيرات: المخزون المتاح = المخزون الإجمالي
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
    
    -- حساب المخزون من الـ batches (مع فلترة المتغيرات)
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
    
    -- 1. المخزون الأولي (إذا لم تكن هناك متغيرات أو كان المخزون الإجمالي > مخزون الـ batches)
    IF NOT v_has_variants THEN
        v_initial_stock := GREATEST(0, v_product_record.stock_quantity - v_batches_stock);
        
        IF v_initial_stock > 0 AND v_remaining_qty > 0 THEN
            v_quantity_from_initial := LEAST(v_remaining_qty, v_initial_stock);
            v_total_cost := v_total_cost + (v_quantity_from_initial * v_product_record.purchase_price);
            v_remaining_qty := v_remaining_qty - v_quantity_from_initial;
        END IF;
    END IF;
    
    -- 2. البيع من الـ batches (مع فلترة المتغيرات)
    IF v_remaining_qty > 0 THEN
        FOR v_batch IN 
            SELECT 
                id,
                batch_number,
                purchase_price,
                quantity_remaining,
                purchase_date,
                color_id,
                size_id
            FROM inventory_batches 
            WHERE product_id = p_product_id 
            AND organization_id = p_organization_id 
            AND is_active = true
            AND quantity_remaining > 0
            AND (p_color_id IS NULL OR color_id = p_color_id OR color_id IS NULL)
            AND (p_size_id IS NULL OR size_id = p_size_id OR size_id IS NULL)
            ORDER BY purchase_date ASC, created_at ASC -- FIFO order
        LOOP
            EXIT WHEN v_remaining_qty <= 0;
            
            v_qty_from_batch := LEAST(v_remaining_qty, v_batch.quantity_remaining);
            v_total_cost := v_total_cost + (v_qty_from_batch * v_batch.purchase_price);
            
            -- تحديث الكمية المتبقية في الـ Batch
            UPDATE inventory_batches 
            SET quantity_remaining = quantity_remaining - v_qty_from_batch,
                updated_at = NOW()
            WHERE id = v_batch.id;
            
            -- تسجيل حركة الخروج
            INSERT INTO inventory_batch_movements (
                batch_id,
                movement_type,
                quantity,
                reference_type,
                reference_id,
                notes,
                organization_id
            ) VALUES (
                v_batch.id,
                'OUT',
                v_qty_from_batch,
                'POS_ORDER',
                p_order_id,
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
                'total_cost', v_qty_from_batch * v_batch.purchase_price,
                'color_id', v_batch.color_id,
                'size_id', v_batch.size_id
            );
            
            v_batches_affected := v_batches_affected || v_batch_info;
            v_remaining_qty := v_remaining_qty - v_qty_from_batch;
            v_quantity_from_batches := v_quantity_from_batches + v_qty_from_batch;
        END LOOP;
    END IF;
    
    -- تحديث المخزون الإجمالي للمنتج
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
    
    -- تسجيل سجل في inventory_log
    BEGIN
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
            CASE WHEN v_has_variants THEN ' (' || v_variant_info || ')' ELSE '' END ||
            ' | من المخزون الأولي: ' || v_quantity_from_initial || 
            ' | من الـ batches: ' || v_quantity_from_batches ||
            ' | التكلفة الإجمالية: ' || v_total_cost,
            NOW()
        );
    EXCEPTION WHEN undefined_table THEN
        -- جدول inventory_log غير موجود، نتجاهل السجل
        NULL;
    END;
    
    -- إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'quantity_sold', p_quantity,
        'quantity_from_initial_stock', v_quantity_from_initial,
        'quantity_from_batches', v_quantity_from_batches,
        'total_cost', v_total_cost,
        'average_cost_per_unit', v_total_cost / p_quantity,
        'initial_stock_cost', v_product_record.purchase_price,
        'batches_affected', v_batches_affected,
        'new_stock_quantity', v_product_record.stock_quantity - p_quantity,
        'variant_info', v_variant_info,
        'has_variants', v_has_variants,
        'variant_stock_before', v_variant_stock,
        'variant_stock_after', GREATEST(0, v_variant_stock - p_quantity)
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
COMMENT ON FUNCTION process_pos_sale_with_variants_fifo(UUID, INTEGER, UUID, UUID, UUID, UUID, NUMERIC) IS 
'دالة محسنة لمعالجة البيع من نقطة البيع مع دعم كامل للمتغيرات ونظام FIFO'; 