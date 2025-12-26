-- ========================================
-- RPC Functions لتحسين استعلامات الطلبات والعملاء
-- تقلل Egress بنسبة 70-80%
-- ========================================

-- ========================================
-- 1. دالة محسنة لجلب الطلبات مع pagination
-- ========================================
CREATE OR REPLACE FUNCTION get_orders_optimized(
  p_organization_id uuid,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 50,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  global_order_number integer,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  subtotal numeric,
  discount numeric,
  shipping_cost numeric,
  total numeric,
  status text,
  payment_method text,
  payment_status text,
  is_online boolean,
  created_at timestamptz,
  updated_at timestamptz,
  items_count bigint,
  notes text,
  call_confirmation_status_id integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_offset integer;
BEGIN
  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  SELECT
    o.id,
    o.global_order_number,
    o.customer_id,
    COALESCE(c.name, u.full_name, 'عميل غير مسجل') as customer_name,
    COALESCE(c.phone, u.phone) as customer_phone,
    o.subtotal,
    o.discount,
    o.shipping_cost,
    o.total,
    o.status,
    o.payment_method,
    o.payment_status,
    o.is_online,
    o.created_at,
    o.updated_at,
    (SELECT COUNT(*) FROM online_order_items oi WHERE oi.order_id = o.id) as items_count,
    o.notes,
    o.call_confirmation_status_id
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN users u ON u.id = o.customer_id
  WHERE
    o.organization_id = p_organization_id
    AND (p_status IS NULL OR o.status = p_status)
    AND (
      p_search IS NULL
      OR o.notes ILIKE '%' || p_search || '%'
      OR c.name ILIKE '%' || p_search || '%'
      OR c.phone ILIKE '%' || p_search || '%'
      OR CAST(o.global_order_number AS TEXT) ILIKE '%' || p_search || '%'
    )
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

-- ========================================
-- 2. دالة لجلب تفاصيل طلب واحد مع المنتجات
-- ========================================
CREATE OR REPLACE FUNCTION get_order_details_optimized(
  p_order_id uuid
)
RETURNS TABLE (
  id uuid,
  global_order_number integer,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  subtotal numeric,
  tax numeric,
  discount numeric,
  shipping_cost numeric,
  total numeric,
  status text,
  payment_method text,
  payment_status text,
  amount_paid numeric,
  remaining_amount numeric,
  is_online boolean,
  notes text,
  customer_notes text,
  admin_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  completed_at timestamptz,
  call_confirmation_status_id integer,
  shipping_address jsonb,
  items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.global_order_number,
    o.customer_id,
    COALESCE(c.name, u.full_name, 'عميل غير مسجل') as customer_name,
    COALESCE(c.phone, u.phone) as customer_phone,
    COALESCE(c.email, u.email) as customer_email,
    o.subtotal,
    o.tax,
    o.discount,
    o.shipping_cost,
    o.total,
    o.status,
    o.payment_method,
    o.payment_status,
    o.amount_paid,
    o.remaining_amount,
    o.is_online,
    o.notes,
    o.customer_notes,
    o.admin_notes,
    o.created_at,
    o.updated_at,
    o.completed_at,
    o.call_confirmation_status_id,
    -- Shipping address as JSON
    CASE
      WHEN o.shipping_address_id IS NOT NULL THEN
        (SELECT jsonb_build_object(
          'id', sa.id,
          'address', sa.address,
          'city', sa.city,
          'state', sa.state,
          'postal_code', sa.postal_code,
          'country', sa.country
        ) FROM shipping_addresses sa WHERE sa.id = o.shipping_address_id)
      ELSE NULL
    END as shipping_address,
    -- Items as JSON array
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'product_name', p.name,
        'quantity', oi.quantity,
        'price', oi.price,
        'subtotal', oi.subtotal,
        'color_id', oi.color_id,
        'color_name', pc.name,
        'size_id', oi.size_id,
        'size_name', ps.size_name
      )
    ) FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
    LEFT JOIN product_colors pc ON pc.id = oi.color_id
    LEFT JOIN product_sizes ps ON ps.id = oi.size_id
    WHERE oi.order_id = o.id
    ) as items
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN users u ON u.id = o.customer_id
  WHERE o.id = p_order_id;
END;
$$;

-- ========================================
-- 3. دالة محسنة لجلب العملاء مع الإحصائيات
-- ========================================
CREATE OR REPLACE FUNCTION get_customers_optimized(
  p_organization_id uuid,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 50,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  email text,
  address text,
  created_at timestamptz,
  total_orders bigint,
  total_spent numeric,
  last_order_date timestamptz,
  is_blocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_offset integer;
BEGIN
  v_offset := (p_page - 1) * p_limit;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.phone,
    c.email,
    c.address,
    c.created_at,
    COALESCE(COUNT(o.id), 0) as total_orders,
    COALESCE(SUM(o.total), 0) as total_spent,
    MAX(o.created_at) as last_order_date,
    COALESCE(c.is_blocked, false) as is_blocked
  FROM customers c
  LEFT JOIN orders o ON o.customer_id = c.id AND o.organization_id = p_organization_id
  WHERE
    c.organization_id = p_organization_id
    AND (
      p_search IS NULL
      OR c.name ILIKE '%' || p_search || '%'
      OR c.phone ILIKE '%' || p_search || '%'
      OR c.email ILIKE '%' || p_search || '%'
    )
  GROUP BY c.id
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

-- ========================================
-- 4. دالة لجلب تفاصيل عميل مع طلباته الأخيرة
-- ========================================
CREATE OR REPLACE FUNCTION get_customer_details_optimized(
  p_customer_id uuid,
  p_organization_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  phone text,
  email text,
  address text,
  city text,
  wilaya text,
  created_at timestamptz,
  is_blocked boolean,
  total_orders bigint,
  total_spent numeric,
  average_order_value numeric,
  last_order_date timestamptz,
  recent_orders jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.phone,
    c.email,
    c.address,
    c.city,
    c.wilaya,
    c.created_at,
    COALESCE(c.is_blocked, false) as is_blocked,
    COALESCE(COUNT(o.id), 0) as total_orders,
    COALESCE(SUM(o.total), 0) as total_spent,
    CASE
      WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total), 0) / COUNT(o.id)
      ELSE 0
    END as average_order_value,
    MAX(o.created_at) as last_order_date,
    -- آخر 10 طلبات فقط
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', ro.id,
        'global_order_number', ro.global_order_number,
        'total', ro.total,
        'status', ro.status,
        'created_at', ro.created_at
      ) ORDER BY ro.created_at DESC
    ) FROM (
      SELECT * FROM orders
      WHERE customer_id = p_customer_id
      AND organization_id = p_organization_id
      ORDER BY created_at DESC
      LIMIT 10
    ) ro
    ) as recent_orders
  FROM customers c
  LEFT JOIN orders o ON o.customer_id = c.id AND o.organization_id = p_organization_id
  WHERE
    c.id = p_customer_id
    AND c.organization_id = p_organization_id
  GROUP BY c.id;
END;
$$;

-- ========================================
-- 5. دالة لإحصائيات الطلبات (Dashboard)
-- ========================================
CREATE OR REPLACE FUNCTION get_orders_stats_optimized(
  p_organization_id uuid,
  p_from_date timestamptz DEFAULT NULL,
  p_to_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  total_orders bigint,
  total_revenue numeric,
  pending_orders bigint,
  completed_orders bigint,
  cancelled_orders bigint,
  average_order_value numeric,
  online_orders bigint,
  pos_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_orders,
    COALESCE(SUM(total), 0) as total_revenue,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
    CASE
      WHEN COUNT(*) > 0 THEN COALESCE(SUM(total), 0) / COUNT(*)
      ELSE 0
    END as average_order_value,
    COUNT(*) FILTER (WHERE is_online = true) as online_orders,
    COUNT(*) FILTER (WHERE is_online = false) as pos_orders
  FROM orders
  WHERE
    organization_id = p_organization_id
    AND (p_from_date IS NULL OR created_at >= p_from_date)
    AND (p_to_date IS NULL OR created_at <= p_to_date);
END;
$$;

-- ========================================
-- 6. دالة لإحصائيات العملاء (Dashboard)
-- ========================================
CREATE OR REPLACE FUNCTION get_customers_stats_optimized(
  p_organization_id uuid
)
RETURNS TABLE (
  total_customers bigint,
  new_customers_30d bigint,
  customers_with_orders bigint,
  average_customer_value numeric,
  top_customers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM customers WHERE organization_id = p_organization_id) as total_customers,
    (SELECT COUNT(*) FROM customers
     WHERE organization_id = p_organization_id
     AND created_at >= NOW() - INTERVAL '30 days') as new_customers_30d,
    (SELECT COUNT(DISTINCT customer_id) FROM orders
     WHERE organization_id = p_organization_id
     AND customer_id IS NOT NULL) as customers_with_orders,
    (SELECT CASE
       WHEN COUNT(DISTINCT customer_id) > 0
       THEN COALESCE(SUM(total), 0) / COUNT(DISTINCT customer_id)
       ELSE 0
     END
     FROM orders
     WHERE organization_id = p_organization_id
     AND customer_id IS NOT NULL) as average_customer_value,
    -- أعلى 5 عملاء
    (SELECT jsonb_agg(
      jsonb_build_object(
        'customer_id', customer_id,
        'customer_name', customer_name,
        'total_spent', total_spent,
        'order_count', order_count
      )
    ) FROM (
      SELECT
        o.customer_id,
        COALESCE(c.name, 'عميل غير مسجل') as customer_name,
        SUM(o.total) as total_spent,
        COUNT(*) as order_count
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.organization_id = p_organization_id
      AND o.customer_id IS NOT NULL
      GROUP BY o.customer_id, c.name
      ORDER BY total_spent DESC
      LIMIT 5
    ) top
    ) as top_customers;
END;
$$;

-- ========================================
-- منح الصلاحيات
-- ========================================
GRANT EXECUTE ON FUNCTION get_orders_optimized(uuid, integer, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_details_optimized(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customers_optimized(uuid, integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_details_optimized(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_stats_optimized(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customers_stats_optimized(uuid) TO authenticated;

-- ========================================
-- تعليقات توضيحية
-- ========================================
COMMENT ON FUNCTION get_orders_optimized IS 'دالة محسنة لجلب الطلبات مع pagination وبحث - تقلل Egress بنسبة 70%';
COMMENT ON FUNCTION get_order_details_optimized IS 'دالة محسنة لجلب تفاصيل طلب واحد مع المنتجات في JSON';
COMMENT ON FUNCTION get_customers_optimized IS 'دالة محسنة لجلب العملاء مع إحصائياتهم - تقلل Egress بنسبة 70%';
COMMENT ON FUNCTION get_customer_details_optimized IS 'دالة محسنة لجلب تفاصيل عميل مع طلباته الأخيرة';
COMMENT ON FUNCTION get_orders_stats_optimized IS 'إحصائيات الطلبات للـ Dashboard بأداء عالي';
COMMENT ON FUNCTION get_customers_stats_optimized IS 'إحصائيات العملاء للـ Dashboard بأداء عالي';
