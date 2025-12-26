-- ========================================
-- دالة محسنة لجلب قائمة الطلبات الإلكترونية (online_orders)
-- تُستخدم مع React Query للـ caching الذكي
-- ========================================

DROP FUNCTION IF EXISTS get_orders_list_optimized(uuid, integer, integer, text, text, integer, text);

CREATE OR REPLACE FUNCTION get_orders_list_optimized(
  p_organization_id uuid,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 20,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_call_status integer DEFAULT NULL,
  p_shipping_provider text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  customer_order_number integer,
  customer_name text,
  customer_phone text,
  wilaya text,
  commune text,
  form_data jsonb,
  shipping_address jsonb,
  total numeric,
  status text,
  payment_status text,
  shipping_provider text,
  yalidine_tracking_id text,
  zrexpress_tracking_id text,
  ecotrack_tracking_id text,
  maystro_tracking_id text,
  call_confirmation_status_id integer,
  call_status_name text,
  call_status_color text,
  created_at timestamptz,
  updated_at timestamptz,
  is_blocked boolean,
  items_count bigint,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_offset integer;
  v_total_count bigint;
BEGIN
  v_offset := (p_page - 1) * p_limit;

  -- حساب إجمالي العدد أولاً
  SELECT COUNT(*)
  INTO v_total_count
  FROM online_orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  WHERE
    o.organization_id = p_organization_id
    AND (p_status IS NULL OR p_status = 'all' OR o.status = p_status)
    AND (p_call_status IS NULL OR o.call_confirmation_status_id = p_call_status)
    AND (p_shipping_provider IS NULL OR o.shipping_provider = p_shipping_provider)
    AND (
      p_search IS NULL
      OR o.form_data->>'fullName' ILIKE '%' || p_search || '%'
      OR o.form_data->>'phone' ILIKE '%' || p_search || '%'
      OR c.name ILIKE '%' || p_search || '%'
      OR c.phone ILIKE '%' || p_search || '%'
      OR CAST(o.customer_order_number AS TEXT) ILIKE '%' || p_search || '%'
    );

  -- جلب البيانات مع pagination
  RETURN QUERY
  SELECT
    o.id,
    o.customer_order_number,
    COALESCE(o.form_data->>'fullName', c.name, 'عميل غير مسجل') as customer_name,
    COALESCE(o.form_data->>'phone', c.phone) as customer_phone,
    o.form_data->>'wilaya' as wilaya,
    o.form_data->>'commune' as commune,
    o.form_data,
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
    o.total,
    o.status,
    o.payment_status,
    o.shipping_provider,
    o.yalidine_tracking_id,
    o.zrexpress_tracking_id,
    o.ecotrack_tracking_id,
    o.maystro_tracking_id,
    o.call_confirmation_status_id,
    ccs.name as call_status_name,
    ccs.color as call_status_color,
    o.created_at,
    o.updated_at,
    false as is_blocked,
    (SELECT COUNT(*) FROM online_order_items oi WHERE oi.order_id = o.id) as items_count,
    v_total_count as total_count
  FROM online_orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN call_confirmation_statuses ccs ON ccs.id = o.call_confirmation_status_id
  WHERE
    o.organization_id = p_organization_id
    AND (p_status IS NULL OR p_status = 'all' OR o.status = p_status)
    AND (p_call_status IS NULL OR o.call_confirmation_status_id = p_call_status)
    AND (p_shipping_provider IS NULL OR o.shipping_provider = p_shipping_provider)
    AND (
      p_search IS NULL
      OR o.form_data->>'fullName' ILIKE '%' || p_search || '%'
      OR o.form_data->>'phone' ILIKE '%' || p_search || '%'
      OR c.name ILIKE '%' || p_search || '%'
      OR c.phone ILIKE '%' || p_search || '%'
      OR CAST(o.customer_order_number AS TEXT) ILIKE '%' || p_search || '%'
    )
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_orders_list_optimized(uuid, integer, integer, text, text, integer, text) TO authenticated;

-- تعليق توضيحي
COMMENT ON FUNCTION get_orders_list_optimized IS 'دالة محسنة لجلب قائمة الطلبات الإلكترونية مع pagination وبحث - تُستخدم مع React Query';
