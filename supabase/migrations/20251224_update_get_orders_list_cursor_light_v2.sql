-- ========================================
-- Update cursor list to:
-- - expose delivery_type (no need to ship full form_data)
-- - optimize search: numeric search uses customer_order_number equality
-- ========================================

DROP FUNCTION IF EXISTS get_orders_list_cursor_light(
  uuid,
  integer,
  timestamptz,
  uuid,
  text,
  text,
  integer,
  text,
  text,
  uuid
);

CREATE OR REPLACE FUNCTION get_orders_list_cursor_light(
  p_organization_id uuid,
  p_limit integer DEFAULT 20,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_call_status integer DEFAULT NULL,
  p_shipping_provider text DEFAULT NULL,
  p_view_mode text DEFAULT 'all',
  p_current_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  customer_order_number integer,
  customer_name text,
  customer_phone text,
  wilaya text,
  commune text,
  delivery_type text,
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
  assigned_staff_id uuid,
  assigned_staff_name text,
  next_cursor_created_at timestamptz,
  next_cursor_id uuid,
  has_more boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_limit_plus_one integer;
  v_search_int integer;
  v_search_is_int boolean;
BEGIN
  v_limit_plus_one := GREATEST(1, p_limit) + 1;
  v_search_is_int := false;
  v_search_int := NULL;

  IF p_search IS NOT NULL AND p_search ~ '^[0-9]+$' THEN
    v_search_is_int := true;
    v_search_int := p_search::integer;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      o.id,
      o.customer_order_number,
      COALESCE(o.form_data->>'fullName', c.name, 'عميل غير مسجل') as customer_name,
      COALESCE(o.form_data->>'phone', c.phone) as customer_phone,
      o.form_data->>'wilaya' as wilaya,
      o.form_data->>'commune' as commune,
      COALESCE(o.form_data->>'deliveryType', o.form_data->>'delivery_type', o.shipping_option, 'home') as delivery_type,
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
      a.staff_id as assigned_staff_id,
      u.name as assigned_staff_name
    FROM online_orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN call_confirmation_statuses ccs ON ccs.id = o.call_confirmation_status_id
    LEFT JOIN online_order_assignments a
      ON a.order_id = o.id
      AND a.organization_id = o.organization_id
      AND a.status IN ('assigned','accepted')
    LEFT JOIN users u ON u.id = a.staff_id
    WHERE
      o.organization_id = p_organization_id
      AND (p_status IS NULL OR p_status = 'all' OR o.status = p_status)
      AND (p_call_status IS NULL OR o.call_confirmation_status_id = p_call_status)
      AND (p_shipping_provider IS NULL OR o.shipping_provider = p_shipping_provider)
      AND (
        p_search IS NULL
        OR (v_search_is_int AND o.customer_order_number = v_search_int)
        OR (NOT v_search_is_int AND (
          o.form_data->>'fullName' ILIKE '%' || p_search || '%'
          OR o.form_data->>'phone' ILIKE '%' || p_search || '%'
          OR c.name ILIKE '%' || p_search || '%'
          OR c.phone ILIKE '%' || p_search || '%'
          OR CAST(o.customer_order_number AS TEXT) ILIKE '%' || p_search || '%'
        ))
      )
      AND (
        p_cursor_created_at IS NULL
        OR (o.created_at, o.id) < (p_cursor_created_at, COALESCE(p_cursor_id, '00000000-0000-0000-0000-000000000000'::uuid))
      )
      AND (
        p_view_mode IS NULL
        OR p_view_mode = 'all'
        OR (p_view_mode = 'mine' AND p_current_user_id IS NOT NULL AND a.staff_id = p_current_user_id)
        OR (p_view_mode = 'unassigned' AND a.staff_id IS NULL)
      )
    ORDER BY o.created_at DESC, o.id DESC
    LIMIT v_limit_plus_one
  ),
  sliced AS (
    SELECT * FROM base LIMIT p_limit
  ),
  last_row AS (
    SELECT created_at, id FROM sliced ORDER BY created_at ASC, id ASC LIMIT 1
  )
  SELECT
    s.id,
    s.customer_order_number,
    s.customer_name,
    s.customer_phone,
    s.wilaya,
    s.commune,
    s.delivery_type,
    s.total,
    s.status,
    s.payment_status,
    s.shipping_provider,
    s.yalidine_tracking_id,
    s.zrexpress_tracking_id,
    s.ecotrack_tracking_id,
    s.maystro_tracking_id,
    s.call_confirmation_status_id,
    s.call_status_name,
    s.call_status_color,
    s.created_at,
    s.updated_at,
    s.is_blocked,
    s.items_count,
    s.assigned_staff_id,
    s.assigned_staff_name,
    (SELECT created_at FROM last_row) as next_cursor_created_at,
    (SELECT id FROM last_row) as next_cursor_id,
    (SELECT COUNT(*) FROM base) > p_limit as has_more
  FROM sliced s
  ORDER BY s.created_at DESC, s.id DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_orders_list_cursor_light(
  uuid,
  integer,
  timestamptz,
  uuid,
  text,
  text,
  integer,
  text,
  text,
  uuid
) TO authenticated;

COMMENT ON FUNCTION get_orders_list_cursor_light IS 'Cursor-based lightweight list for online_orders (no offset, no total_count). v2 adds delivery_type + numeric search optimization.';
