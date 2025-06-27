-- إصلاح نهائي لمشكلة GROUP BY مع users.name في نقطة البيع
-- هذا الملف يحل المشكلة التي تظهر: "column users.name must appear in the GROUP BY clause"

-- 1. حذف الـ view الحالي الذي يسبب المشكلة
DROP VIEW IF EXISTS pos_orders_with_details CASCADE;

-- 2. إنشاء view جديد محسن باستخدام CTE لتجنب مشاكل GROUP BY
CREATE VIEW pos_orders_with_details AS
WITH order_items_summary AS (
    SELECT 
        oi.order_id,
        COUNT(oi.id) AS items_count,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity
    FROM order_items oi
    GROUP BY oi.order_id
)
SELECT 
    o.id,
    o.organization_id,
    o.customer_id,
    o.employee_id,
    o.slug,
    o.customer_order_number,
    o.status,
    o.payment_status,
    o.payment_method,
    o.total,
    o.subtotal,
    o.tax,
    o.discount,
    o.amount_paid,
    o.remaining_amount,
    o.pos_order_type,
    o.notes,
    o.is_online,
    o.created_at,
    o.updated_at,
    o.completed_at,
    c.name AS customer_name,
    c.phone AS customer_phone,
    c.email AS customer_email,
    u.name AS employee_name,
    u.email AS employee_email,
    COALESCE(ois.items_count, 0) AS items_count,
    COALESCE(ois.total_quantity, 0) AS total_quantity
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN users u ON u.id = o.employee_id
LEFT JOIN order_items_summary ois ON ois.order_id = o.id
WHERE (o.is_online = false OR o.is_online IS NULL);

-- 3. إصلاح دالة search_pos_orders الحالية
CREATE OR REPLACE FUNCTION search_pos_orders(
    p_organization_id UUID,
    p_search_term TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    customer_id UUID,
    subtotal NUMERIC,
    tax NUMERIC,
    discount NUMERIC,
    total NUMERIC,
    status TEXT,
    payment_method TEXT,
    payment_status TEXT,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    slug TEXT,
    customer_name TEXT,
    employee_name TEXT,
    items_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH order_items_count AS (
        SELECT 
            oi.order_id,
            COUNT(oi.id) as item_count
        FROM order_items oi
        GROUP BY oi.order_id
    )
    SELECT 
        o.id,
        o.customer_id,
        o.subtotal,
        o.tax,
        o.discount,
        o.total,
        o.status,
        o.payment_method,
        o.payment_status,
        o.employee_id,
        o.created_at,
        o.updated_at,
        o.slug,
        c.name as customer_name,
        u.name as employee_name,
        COALESCE(oic.item_count, 0) as items_count
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN users u ON u.id = o.employee_id
    LEFT JOIN order_items_count oic ON oic.order_id = o.id
    WHERE o.organization_id = p_organization_id 
        AND (o.is_online = false OR o.is_online IS NULL)
        AND (p_search_term IS NULL OR (
            o.slug ILIKE '%' || p_search_term || '%' OR
            o.notes ILIKE '%' || p_search_term || '%' OR
            c.name ILIKE '%' || p_search_term || '%'
        ))
        AND (p_status IS NULL OR o.status = p_status)
        AND (p_payment_method IS NULL OR o.payment_method = p_payment_method)
        AND (p_employee_id IS NULL OR o.employee_id = p_employee_id)
        AND (p_date_from IS NULL OR DATE(o.created_at) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(o.created_at) <= p_date_to)
    ORDER BY o.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 4. منح الصلاحيات اللازمة
GRANT SELECT ON pos_orders_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION search_pos_orders TO authenticated;

-- 5. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_orders_pos_organization_created 
ON orders (organization_id, created_at DESC) 
WHERE (is_online = false OR is_online IS NULL);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id_count 
ON order_items (order_id);

-- 6. تعليقات للتوثيق
COMMENT ON VIEW pos_orders_with_details IS 'View محسن لطلبيات POS - يستخدم CTE لتجنب مشاكل GROUP BY مع users.name';
COMMENT ON FUNCTION search_pos_orders IS 'دالة البحث في طلبيات POS - محسنة لتجنب مشاكل GROUP BY';

-- 7. اختبار سريع للتأكد من عمل الـ view
DO $$
BEGIN
    PERFORM * FROM pos_orders_with_details LIMIT 1;
    RAISE NOTICE 'تم إنشاء pos_orders_with_details بنجاح!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'خطأ في إنشاء pos_orders_with_details: %', SQLERRM;
END;
$$; 