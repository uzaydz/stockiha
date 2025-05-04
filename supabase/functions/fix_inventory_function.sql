-- حذف الدالة الموجودة
DROP FUNCTION IF EXISTS get_inventory_status(UUID);

-- إعادة إنشاء الدالة بالنوع الصحيح
CREATE OR REPLACE FUNCTION get_inventory_status(
    p_organization_id UUID
)
RETURNS TABLE(
    total_value NUMERIC,
    low_stock BIGINT,
    out_of_stock BIGINT,
    total_items BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(p.stock_quantity * p.purchase_price), 0) AS total_value,
        COUNT(CASE WHEN p.stock_quantity <= p.reorder_level AND p.stock_quantity > 0 THEN 1 END) AS low_stock,
        COUNT(CASE WHEN p.stock_quantity = 0 THEN 1 END) AS out_of_stock,
        COUNT(p.id) AS total_items
    FROM products p
    WHERE p.organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql; 