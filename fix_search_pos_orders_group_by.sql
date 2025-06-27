-- إصلاح مشكلة GROUP BY في دالة search_pos_orders
-- هذا الملف يحل مشكلة "users.name must appear in the GROUP BY clause"

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS search_pos_orders(UUID, TEXT, TEXT, TEXT, UUID, DATE, DATE, INTEGER, INTEGER);

-- إنشاء دالة محسنة بدون مشاكل GROUP BY
CREATE OR REPLACE FUNCTION search_pos_orders(
  p_organization_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_employee_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_payment_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  customer_id UUID,
  employee_id UUID,
  slug VARCHAR,
  customer_order_number INTEGER,
  status VARCHAR,
  payment_status VARCHAR,
  payment_method VARCHAR,
  total DECIMAL,
  subtotal DECIMAL,
  tax DECIMAL,
  discount DECIMAL,
  amount_paid DECIMAL,
  remaining_amount DECIMAL,
  pos_order_type VARCHAR,
  notes TEXT,
  is_online BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP,
  customer_name VARCHAR,
  customer_phone VARCHAR,
  customer_email VARCHAR,
  employee_name VARCHAR,
  employee_email VARCHAR,
  items_count BIGINT,
  total_quantity BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
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
  WHERE 
    o.organization_id = p_organization_id
    AND (o.is_online = false OR o.is_online IS NULL)
    AND (p_search_query IS NULL OR 
         o.customer_order_number::TEXT ILIKE '%' || p_search_query || '%' OR
         c.name ILIKE '%' || p_search_query || '%' OR
         c.phone ILIKE '%' || p_search_query || '%' OR
         o.notes ILIKE '%' || p_search_query || '%')
    AND (p_status IS NULL OR o.status = p_status)
    AND (p_payment_method IS NULL OR o.payment_method = p_payment_method)
    AND (p_employee_id IS NULL OR o.employee_id = p_employee_id)
    AND (p_customer_id IS NULL OR o.customer_id = p_customer_id)
    AND (p_date_from IS NULL OR o.created_at::DATE >= p_date_from)
    AND (p_date_to IS NULL OR o.created_at::DATE <= p_date_to)
    AND (p_payment_status IS NULL OR o.payment_status = p_payment_status)
  ORDER BY o.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- تعليق للدالة
COMMENT ON FUNCTION search_pos_orders IS 'دالة محسنة للبحث في طلبيات POS - تستخدم CTE لتجنب مشاكل GROUP BY مع users.name';

-- إعادة إنشاء الـ view بشكل صحيح (للتأكد)
DROP VIEW IF EXISTS pos_orders_with_details CASCADE;

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

COMMENT ON VIEW pos_orders_with_details IS 'View محسن لطلبيات POS مع تفاصيل العملاء والموظفين - يستخدم CTE لتجنب مشاكل GROUP BY';

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION search_pos_orders(UUID, TEXT, TEXT, TEXT, UUID, DATE, DATE, INTEGER, INTEGER) TO authenticated;
GRANT SELECT ON pos_orders_with_details TO authenticated;

-- إشعار النجاح
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح مشكلة GROUP BY في دالة search_pos_orders بنجاح!';
    RAISE NOTICE '🔧 تم إعادة إنشاء الـ view pos_orders_with_details';
    RAISE NOTICE '🚀 المشكلة محلولة - يمكن الآن إنشاء طلبيات POS بدون أخطاء!';
END;
$$; 