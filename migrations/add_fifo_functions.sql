-- Functions لإدارة نظام FIFO
-- تاريخ الإنشاء: 2025-01-27

-- 1. Function لإنشاء Batch تلقائياً عند إضافة مشتريات
CREATE OR REPLACE FUNCTION create_batch_from_purchase_item()
RETURNS TRIGGER AS $$
DECLARE
    new_batch_id UUID;
    batch_number TEXT;
    supplier_purchase RECORD;
BEGIN
    -- جلب بيانات الشراء
    SELECT sp.*, s.name as supplier_name 
    INTO supplier_purchase
    FROM supplier_purchases sp
    LEFT JOIN suppliers s ON sp.supplier_id = s.id
    WHERE sp.id = NEW.purchase_id;
    
    -- إنشاء رقم Batch فريد
    batch_number := 'PURCHASE-' || supplier_purchase.purchase_number || '-' || 
                   EXTRACT(epoch FROM NOW())::TEXT || '-' || 
                   COALESCE(NEW.product_id::TEXT, 'NO-PRODUCT');
    
    -- إنشاء Batch جديد
    INSERT INTO inventory_batches (
        product_id,
        batch_number,
        supplier_id,
        purchase_date,
        purchase_price,
        selling_price,
        quantity_received,
        quantity_remaining,
        cost_per_unit,
        organization_id,
        supplier_purchase_item_id,
        notes
    ) VALUES (
        NEW.product_id,
        batch_number,
        supplier_purchase.supplier_id,
        supplier_purchase.purchase_date,
        NEW.unit_price,
        COALESCE((SELECT price FROM products WHERE id = NEW.product_id), NEW.unit_price),
        NEW.quantity::INTEGER,
        NEW.quantity::INTEGER,
        NEW.unit_price,
        supplier_purchase.organization_id,
        NEW.id,
        'تم إنشاؤه تلقائياً من فاتورة الشراء رقم: ' || supplier_purchase.purchase_number
    ) RETURNING id INTO new_batch_id;
    
    -- ربط الـ Batch بعنصر الشراء
    UPDATE supplier_purchase_items 
    SET batch_id = new_batch_id 
    WHERE id = NEW.id;
    
    -- تسجيل حركة الدخول
    INSERT INTO inventory_batch_movements (
        batch_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        organization_id
    ) VALUES (
        new_batch_id,
        'IN',
        NEW.quantity::INTEGER,
        'SUPPLIER_PURCHASE',
        NEW.purchase_id,
        'دخول مخزون من الشراء رقم: ' || supplier_purchase.purchase_number,
        supplier_purchase.organization_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Function للحصول على الـ Batches المتاحة حسب FIFO
CREATE OR REPLACE FUNCTION get_available_batches_fifo(
    p_product_id UUID,
    p_organization_id UUID
)
RETURNS TABLE (
    batch_id UUID,
    batch_number TEXT,
    purchase_price NUMERIC,
    quantity_available INTEGER,
    purchase_date TIMESTAMPTZ,
    supplier_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ib.id as batch_id,
        ib.batch_number,
        ib.purchase_price,
        ib.quantity_remaining as quantity_available,
        ib.purchase_date,
        COALESCE(s.name, 'غير محدد') as supplier_name
    FROM inventory_batches ib
    LEFT JOIN suppliers s ON ib.supplier_id = s.id
    WHERE ib.product_id = p_product_id
    AND ib.organization_id = p_organization_id
    AND ib.quantity_remaining > 0
    AND ib.is_active = true
    ORDER BY ib.purchase_date ASC, ib.created_at ASC; -- FIFO order
END;
$$ LANGUAGE plpgsql;

-- 3. Function لحساب التكلفة حسب FIFO
CREATE OR REPLACE FUNCTION calculate_fifo_cost(
    p_product_id UUID,
    p_quantity INTEGER,
    p_organization_id UUID
)
RETURNS TABLE (
    total_cost NUMERIC,
    batches_used JSONB
) AS $$
DECLARE
    remaining_qty INTEGER := p_quantity;
    current_batch RECORD;
    total_cost_calc NUMERIC := 0;
    batches_array JSONB := '[]'::JSONB;
    batch_info JSONB;
    qty_from_batch INTEGER;
BEGIN
    -- التحقق من توفر الكمية المطلوبة
    IF (SELECT SUM(quantity_remaining) FROM inventory_batches 
        WHERE product_id = p_product_id 
        AND organization_id = p_organization_id 
        AND is_active = true) < p_quantity THEN
        RAISE EXCEPTION 'الكمية المطلوبة (%) غير متوفرة في المخزون', p_quantity;
    END IF;
    
    -- حساب التكلفة حسب FIFO
    FOR current_batch IN 
        SELECT * FROM get_available_batches_fifo(p_product_id, p_organization_id)
    LOOP
        EXIT WHEN remaining_qty <= 0;
        
        qty_from_batch := LEAST(remaining_qty, current_batch.quantity_available);
        total_cost_calc := total_cost_calc + (qty_from_batch * current_batch.purchase_price);
        
        batch_info := jsonb_build_object(
            'batch_id', current_batch.batch_id,
            'batch_number', current_batch.batch_number,
            'quantity_used', qty_from_batch,
            'unit_price', current_batch.purchase_price,
            'cost', qty_from_batch * current_batch.purchase_price
        );
        
        batches_array := batches_array || batch_info;
        remaining_qty := remaining_qty - qty_from_batch;
    END LOOP;
    
    RETURN QUERY SELECT total_cost_calc, batches_array;
END;
$$ LANGUAGE plpgsql;

-- 4. Function لمعالجة البيع حسب FIFO
CREATE OR REPLACE FUNCTION process_fifo_sale(
    p_product_id UUID,
    p_quantity INTEGER,
    p_organization_id UUID,
    p_reference_type TEXT,
    p_reference_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    total_cost NUMERIC,
    batches_affected JSONB
) AS $$
DECLARE
    remaining_qty INTEGER := p_quantity;
    current_batch RECORD;
    total_cost_calc NUMERIC := 0;
    batches_array JSONB := '[]'::JSONB;
    batch_info JSONB;
    qty_from_batch INTEGER;
BEGIN
    -- التحقق من توفر الكمية
    IF (SELECT SUM(quantity_remaining) FROM inventory_batches 
        WHERE product_id = p_product_id 
        AND organization_id = p_organization_id 
        AND is_active = true) < p_quantity THEN
        RETURN QUERY SELECT false, 0::NUMERIC, '[]'::JSONB;
        RETURN;
    END IF;
    
    -- معالجة البيع حسب FIFO
    FOR current_batch IN 
        SELECT * FROM get_available_batches_fifo(p_product_id, p_organization_id)
    LOOP
        EXIT WHEN remaining_qty <= 0;
        
        qty_from_batch := LEAST(remaining_qty, current_batch.quantity_available);
        total_cost_calc := total_cost_calc + (qty_from_batch * current_batch.purchase_price);
        
        -- تحديث الكمية المتبقية في الـ Batch
        UPDATE inventory_batches 
        SET quantity_remaining = quantity_remaining - qty_from_batch,
            updated_at = NOW()
        WHERE id = current_batch.batch_id;
        
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
            current_batch.batch_id,
            'OUT',
            qty_from_batch,
            p_reference_type,
            p_reference_id,
            COALESCE(p_notes, 'بيع حسب نظام FIFO'),
            p_organization_id
        );
        
        batch_info := jsonb_build_object(
            'batch_id', current_batch.batch_id,
            'batch_number', current_batch.batch_number,
            'quantity_sold', qty_from_batch,
            'unit_cost', current_batch.purchase_price,
            'total_cost', qty_from_batch * current_batch.purchase_price
        );
        
        batches_array := batches_array || batch_info;
        remaining_qty := remaining_qty - qty_from_batch;
    END LOOP;
    
    RETURN QUERY SELECT true, total_cost_calc, batches_array;
END;
$$ LANGUAGE plpgsql; 