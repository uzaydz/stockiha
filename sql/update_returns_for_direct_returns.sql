-- تحديث نظام الإرجاع لدعم الإرجاع المباشر (بدون طلبية أصلية)
-- هذا سيسمح بإرجاع منتجات مباشرة من نقطة البيع

-- 1. إزالة قيد NOT NULL من original_order_id
ALTER TABLE returns 
ALTER COLUMN original_order_id DROP NOT NULL;

-- 2. تحديث قيد return_type لإضافة نوع 'direct'
ALTER TABLE returns DROP CONSTRAINT IF EXISTS returns_return_type_check;
ALTER TABLE returns ADD CONSTRAINT returns_return_type_check 
CHECK (return_type IN ('full', 'partial', 'direct'));

-- 3. تحديث جدول return_items لدعم الإرجاع المباشر
ALTER TABLE return_items 
ALTER COLUMN original_order_item_id DROP NOT NULL;

-- 4. إضافة فهرس للإرجاع المباشر
CREATE INDEX IF NOT EXISTS idx_returns_direct_type ON returns(return_type) 
WHERE return_type = 'direct';

-- 5. إضافة دالة لإنشاء إرجاع مباشر
CREATE OR REPLACE FUNCTION create_direct_return(
    p_organization_id UUID,
    p_created_by UUID,
    p_return_reason VARCHAR(50),
    p_return_reason_description TEXT DEFAULT NULL,
    p_refund_method VARCHAR(20) DEFAULT 'cash',
    p_notes TEXT DEFAULT NULL,
    p_customer_name VARCHAR(255) DEFAULT 'عميل مباشر',
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE(return_id UUID, return_number VARCHAR(50)) AS $$
DECLARE
    v_return_id UUID;
    v_return_number VARCHAR(50);
    v_total_amount NUMERIC(10,2) := 0;
    v_item JSONB;
BEGIN
    -- إنشاء سجل الإرجاع
    INSERT INTO returns (
        original_order_id,
        customer_name,
        return_type,
        return_reason,
        return_reason_description,
        original_total,
        return_amount,
        refund_amount,
        status,
        refund_method,
        notes,
        organization_id,
        created_by,
        processed_by,
        processed_at
    ) VALUES (
        NULL, -- لا توجد طلبية أصلية
        p_customer_name,
        'direct',
        p_return_reason,
        p_return_reason_description,
        0, -- سيتم حسابه من العناصر
        0, -- سيتم حسابه من العناصر
        0, -- سيتم حسابه من العناصر
        'completed', -- مكتمل مباشرة
        p_refund_method,
        p_notes,
        p_organization_id,
        p_created_by,
        p_created_by, -- نفس الشخص يعالج الإرجاع
        NOW()
    ) RETURNING id, return_number INTO v_return_id, v_return_number;
    
    -- إضافة العناصر المرجعة
    FOR v_item IN SELECT jsonb_array_elements(p_items)
    LOOP
        INSERT INTO return_items (
            return_id,
            original_order_item_id,
            product_id,
            product_name,
            original_quantity,
            return_quantity,
            original_unit_price,
            return_unit_price,
            total_return_amount,
            condition_status,
            resellable,
            inventory_returned,
            inventory_returned_at
        ) VALUES (
            v_return_id,
            NULL, -- لا يوجد عنصر طلبية أصلي
            (v_item->>'product_id')::UUID,
            v_item->>'product_name',
            (v_item->>'quantity')::INTEGER,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unit_price')::NUMERIC(10,2),
            (v_item->>'unit_price')::NUMERIC(10,2),
            (v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::NUMERIC(10,2),
            COALESCE(v_item->>'condition_status', 'good'),
            COALESCE((v_item->>'resellable')::BOOLEAN, true),
            true, -- إرجاع للمخزون مباشرة
            NOW()
        );
        
        -- تحديث إجمالي المبلغ
        v_total_amount := v_total_amount + 
            ((v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::NUMERIC(10,2));
    END LOOP;
    
    -- تحديث المبالغ في سجل الإرجاع
    UPDATE returns 
    SET 
        original_total = v_total_amount,
        return_amount = v_total_amount,
        refund_amount = v_total_amount
    WHERE id = v_return_id;
    
    RETURN QUERY SELECT v_return_id, v_return_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. إضافة تعليقات للتوضيح
COMMENT ON FUNCTION create_direct_return IS 'دالة إنشاء إرجاع مباشر من نقطة البيع بدون طلبية أصلية';
COMMENT ON COLUMN returns.return_type IS 'نوع الإرجاع: full (كامل), partial (جزئي), direct (مباشر)';

-- 7. إضافة view لعرض الإرجاع المباشر
CREATE OR REPLACE VIEW direct_returns_view AS
SELECT 
    r.id,
    r.return_number,
    r.customer_name,
    r.return_reason,
    r.return_reason_description,
    r.return_amount,
    r.refund_method,
    r.status,
    r.created_at,
    u.name as created_by_name,
    COUNT(ri.id) as items_count,
    r.organization_id
FROM returns r
LEFT JOIN users u ON r.created_by = u.id
LEFT JOIN return_items ri ON r.id = ri.return_id
WHERE r.return_type = 'direct'
GROUP BY r.id, r.return_number, r.customer_name, r.return_reason, 
         r.return_reason_description, r.return_amount, r.refund_method, 
         r.status, r.created_at, u.name, r.organization_id
ORDER BY r.created_at DESC;

COMMENT ON VIEW direct_returns_view IS 'عرض خاص بالإرجاع المباشر من نقطة البيع'; 