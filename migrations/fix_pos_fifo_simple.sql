-- إصلاح مبسط لنظام نقطة البيع مع FIFO
-- تاريخ الإنشاء: 2025-06-27

-- دالة مبسطة لمعالجة البيع من نقطة البيع مع FIFO
CREATE OR REPLACE FUNCTION process_pos_sale_with_fifo_simple(
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
    v_remaining_qty INTEGER;
    v_total_cost NUMERIC := 0;
    v_batch RECORD;
    v_qty_from_batch INTEGER;
    v_batches_affected JSONB := '[]'::JSONB;
    v_batch_info JSONB;
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
    
    -- حساب المخزون المتاح من الـ batches
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
    
    -- بدء معالجة FIFO
    v_remaining_qty := p_quantity;
    
    -- 1. أولاً من المخزون الأولي (الأقدم)
    IF v_initial_stock > 0 AND v_remaining_qty > 0 THEN
        v_quantity_from_initial := LEAST(v_remaining_qty, v_initial_stock);
        v_total_cost := v_total_cost + (v_quantity_from_initial * v_product_record.purchase_price);
        v_remaining_qty := v_remaining_qty - v_quantity_from_initial;
    END IF;
    
    -- 2. ثم من الـ batches حسب ترتيب FIFO
    IF v_remaining_qty > 0 THEN
        FOR v_batch IN 
            SELECT 
                id,
                batch_number,
                purchase_price,
                quantity_remaining,
                purchase_date
            FROM inventory_batches 
            WHERE product_id = p_product_id 
            AND organization_id = p_organization_id 
            AND is_active = true
            AND quantity_remaining > 0
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
                'بيع من نقطة البيع - طلبية رقم: ' || COALESCE(p_order_id::TEXT, 'غير محدد'),
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
    
    -- تحديث المخزون الإجمالي للمنتج
    UPDATE products 
    SET stock_quantity = stock_quantity - p_quantity,
        updated_at = NOW(),
        last_inventory_update = NOW()
    WHERE id = p_product_id;
    
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
COMMENT ON FUNCTION process_pos_sale_with_fifo_simple(UUID, INTEGER, UUID, UUID, NUMERIC) IS 
'دالة مبسطة لمعالجة البيع من نقطة البيع مع تطبيق نظام FIFO بشكل صحيح'; 