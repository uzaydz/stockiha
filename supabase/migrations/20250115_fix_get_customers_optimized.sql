-- ========================================
-- إصلاح دالة get_customers_optimized
-- المشكلة: العمود is_blocked غير موجود في جدول customers
-- الحل: إزالة العمود من الدالة أو جعله دائماً false
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
    false as is_blocked  -- ✅ إصلاح: استخدام قيمة ثابتة بدلاً من عمود غير موجود
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
-- منح الصلاحيات
-- ========================================
GRANT EXECUTE ON FUNCTION get_customers_optimized(uuid, integer, integer, text) TO authenticated;

-- ========================================
-- تعليق توضيحي
-- ========================================
COMMENT ON FUNCTION get_customers_optimized IS 'دالة محسنة لجلب العملاء مع إحصائياتهم - تم إصلاح مشكلة is_blocked';

-- ========================================
-- إصلاح دالة get_customer_details_optimized
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
    false as is_blocked,  -- ✅ إصلاح: استخدام قيمة ثابتة بدلاً من عمود غير موجود
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
-- منح الصلاحيات
-- ========================================
GRANT EXECUTE ON FUNCTION get_customer_details_optimized(uuid, uuid) TO authenticated;

-- ========================================
-- تعليق توضيحي
-- ========================================
COMMENT ON FUNCTION get_customer_details_optimized IS 'دالة محسنة لجلب تفاصيل عميل مع طلباته - تم إصلاح مشكلة is_blocked';
