-- ملف لإلغاء التغييرات وإعادة دوال التحليلات إلى وضعها الأصلي

-- 1. إعادة دالة get_sales_by_channel إلى حالتها الأصلية
CREATE OR REPLACE FUNCTION get_sales_by_channel(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    pos_sales NUMERIC,
    online_sales NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN o.is_online = FALSE THEN o.total ELSE 0 END), 0) AS pos_sales,
        COALESCE(SUM(CASE WHEN o.is_online = TRUE THEN o.total ELSE 0 END), 0) AS online_sales
    FROM orders o
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled';
END;
$$ LANGUAGE plpgsql;

-- 2. حذف الدالة الإضافية get_all_sales_stats التي تم إنشاؤها للتشخيص
DROP FUNCTION IF EXISTS get_all_sales_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- 3. إعادة دالة get_sales_summary إلى حالتها الأصلية
CREATE OR REPLACE FUNCTION get_sales_summary(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    total_sales NUMERIC,
    total_profit NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(o.total), 0) AS total_sales,
        COALESCE(SUM(
            (SELECT SUM(oi.total_price - (p.purchase_price * oi.quantity))
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = o.id)
        ), 0) AS total_profit
    FROM orders o
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled';
END;
$$ LANGUAGE plpgsql; 