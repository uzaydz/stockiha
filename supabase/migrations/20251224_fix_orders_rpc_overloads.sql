-- ========================================
-- Fix RPC overload ambiguity + schema drift
-- - Drops ALL overloads for:
--   - public.get_orders_list_optimized
--   - public.get_orders_list_cursor_light
-- - Recreates a single, unambiguous version for each
-- - Removes dependency on customers.is_blocked (column doesn't exist in some DBs)
-- ========================================

DO $$
DECLARE
  r record;
BEGIN
  -- Drop all overloads of get_orders_list_optimized (prevents ERROR 42725)
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS func_name,
      oidvectortypes(p.proargtypes) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_orders_list_optimized'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', r.schema_name, r.func_name, r.args);
  END LOOP;

  -- Drop all overloads of get_orders_list_cursor_light
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS func_name,
      oidvectortypes(p.proargtypes) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_orders_list_cursor_light'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', r.schema_name, r.func_name, r.args);
  END LOOP;
END
$$;

-- ========================================
-- Offset-based optimized list (fallback path)
-- Accepts viewMode/currentUserId to match client calls.
-- ========================================

CREATE OR REPLACE FUNCTION public.get_shipping_address_json(p_shipping_address_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_result jsonb;
  v_sql text;

  v_has_address boolean;
  v_has_street_address boolean;
  v_has_street boolean;

  v_has_city boolean;
  v_has_commune boolean;

  v_has_state boolean;
  v_has_wilaya boolean;

  v_has_postal_code boolean;
  v_has_zip boolean;
  v_has_zip_code boolean;

  v_has_country boolean;

  v_address_expr text;
  v_city_expr text;
  v_state_expr text;
  v_postal_expr text;
  v_country_expr text;
BEGIN
  IF p_shipping_address_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Newer schema: public.shipping_addresses
  IF to_regclass('public.shipping_addresses') IS NOT NULL THEN
    EXECUTE
      'SELECT jsonb_build_object(' ||
      quote_literal('id') || ', sa.id, ' ||
      quote_literal('address') || ', sa.address, ' ||
      quote_literal('city') || ', sa.city, ' ||
      quote_literal('state') || ', sa.state, ' ||
      quote_literal('postal_code') || ', sa.postal_code, ' ||
      quote_literal('country') || ', sa.country' ||
      ') FROM public.shipping_addresses sa WHERE sa.id = $1'
    INTO v_result
    USING p_shipping_address_id;
    RETURN v_result;
  END IF;

  -- Legacy schema: public.addresses (column names vary between deployments)
  IF to_regclass('public.addresses') IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'address'
  ) INTO v_has_address;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'street_address'
  ) INTO v_has_street_address;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'street'
  ) INTO v_has_street;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'city'
  ) INTO v_has_city;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'commune'
  ) INTO v_has_commune;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'state'
  ) INTO v_has_state;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'wilaya'
  ) INTO v_has_wilaya;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'postal_code'
  ) INTO v_has_postal_code;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'zip'
  ) INTO v_has_zip;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'zip_code'
  ) INTO v_has_zip_code;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'country'
  ) INTO v_has_country;

  v_address_expr := CASE
    WHEN v_has_address THEN 'a.address'
    WHEN v_has_street_address THEN 'a.street_address'
    WHEN v_has_street THEN 'a.street'
    ELSE 'NULL'
  END;

  v_city_expr := CASE
    WHEN v_has_city THEN 'a.city'
    WHEN v_has_commune THEN 'a.commune'
    ELSE 'NULL'
  END;

  v_state_expr := CASE
    WHEN v_has_state THEN 'a.state'
    WHEN v_has_wilaya THEN 'a.wilaya'
    ELSE 'NULL'
  END;

  v_postal_expr := CASE
    WHEN v_has_postal_code THEN 'a.postal_code'
    WHEN v_has_zip_code THEN 'a.zip_code'
    WHEN v_has_zip THEN 'a.zip'
    ELSE 'NULL'
  END;

  v_country_expr := CASE
    WHEN v_has_country THEN 'a.country'
    ELSE 'NULL'
  END;

  v_sql :=
    'SELECT jsonb_build_object(' ||
    quote_literal('id') || ', a.id, ' ||
    quote_literal('address') || ', ' || v_address_expr || ', ' ||
    quote_literal('city') || ', ' || v_city_expr || ', ' ||
    quote_literal('state') || ', ' || v_state_expr || ', ' ||
    quote_literal('postal_code') || ', ' || v_postal_expr || ', ' ||
    quote_literal('country') || ', ' || v_country_expr ||
    ') FROM public.addresses a WHERE a.id = $1';

  EXECUTE v_sql INTO v_result USING p_shipping_address_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_orders_list_optimized(
  p_organization_id uuid,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 20,
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

  SELECT COUNT(*)
  INTO v_total_count
  FROM online_orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN LATERAL (
    SELECT a.staff_id
    FROM online_order_assignments a
    WHERE a.order_id = o.id
      AND a.organization_id = o.organization_id
      AND a.status IN ('assigned','accepted')
    ORDER BY
      COALESCE(
        (to_jsonb(a)->>'updated_at')::timestamptz,
        (to_jsonb(a)->>'created_at')::timestamptz,
        (to_jsonb(a)->>'assigned_at')::timestamptz
      ) DESC NULLS LAST,
      a.id DESC
    LIMIT 1
  ) a ON true
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
    AND (
      p_view_mode IS NULL
      OR p_view_mode = 'all'
      OR (p_view_mode = 'mine' AND p_current_user_id IS NOT NULL AND a.staff_id = p_current_user_id)
      OR (p_view_mode = 'unassigned' AND a.staff_id IS NULL)
    );

  RETURN QUERY
  SELECT
    o.id,
    o.customer_order_number,
    COALESCE(o.form_data->>'fullName', c.name, 'عميل غير مسجل') as customer_name,
    COALESCE(o.form_data->>'phone', c.phone) as customer_phone,
    o.form_data->>'wilaya' as wilaya,
    o.form_data->>'commune' as commune,
    o.form_data,
    public.get_shipping_address_json(o.shipping_address_id) as shipping_address,
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
  LEFT JOIN LATERAL (
    SELECT a.staff_id
    FROM online_order_assignments a
    WHERE a.order_id = o.id
      AND a.organization_id = o.organization_id
      AND a.status IN ('assigned','accepted')
    ORDER BY
      COALESCE(
        (to_jsonb(a)->>'updated_at')::timestamptz,
        (to_jsonb(a)->>'created_at')::timestamptz,
        (to_jsonb(a)->>'assigned_at')::timestamptz
      ) DESC NULLS LAST,
      a.id DESC
    LIMIT 1
  ) a ON true
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
    AND (
      p_view_mode IS NULL
      OR p_view_mode = 'all'
      OR (p_view_mode = 'mine' AND p_current_user_id IS NOT NULL AND a.staff_id = p_current_user_id)
      OR (p_view_mode = 'unassigned' AND a.staff_id IS NULL)
    )
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_orders_list_optimized(
  uuid,
  integer,
  integer,
  text,
  text,
  integer,
  text,
  text,
  uuid
) TO authenticated;

COMMENT ON FUNCTION get_orders_list_optimized IS 'Optimized offset-based list for online_orders (fallback).';

-- ========================================
-- Cursor-based lightweight list (hot path)
-- ========================================

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
    LEFT JOIN LATERAL (
      SELECT a.staff_id
      FROM online_order_assignments a
      WHERE a.order_id = o.id
        AND a.organization_id = o.organization_id
        AND a.status IN ('assigned','accepted')
      ORDER BY
        COALESCE(
          (to_jsonb(a)->>'updated_at')::timestamptz,
          (to_jsonb(a)->>'created_at')::timestamptz,
          (to_jsonb(a)->>'assigned_at')::timestamptz
        ) DESC NULLS LAST,
        a.id DESC
      LIMIT 1
    ) a ON true
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
    SELECT s2.created_at, s2.id
    FROM sliced s2
    ORDER BY s2.created_at ASC, s2.id ASC
    LIMIT 1
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
    (SELECT lr.created_at FROM last_row lr) as next_cursor_created_at,
    (SELECT lr.id FROM last_row lr) as next_cursor_id,
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

COMMENT ON FUNCTION get_orders_list_cursor_light IS 'Cursor-based lightweight list for online_orders (no offset, no total_count).';
