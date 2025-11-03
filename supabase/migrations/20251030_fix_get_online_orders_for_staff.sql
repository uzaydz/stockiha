-- =====================================================
-- Fix: get_online_orders_for_staff - Shipping Providers Fix
-- Date: 2025-10-30
-- Issue: شركات الشحن لا تظهر في القائمة
-- Solution: استخدام shipping_data_view بدلاً من online_orders.shipping_provider
-- =====================================================

-- حذف جميع النسخ القديمة من الدالة
DROP FUNCTION IF EXISTS public.get_online_orders_for_staff(UUID, UUID, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.get_online_orders_for_staff(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_online_orders_for_staff CASCADE;
CREATE OR REPLACE FUNCTION public.get_online_orders_for_staff(
  p_org_id UUID,
  p_staff_id UUID,
  p_group_id UUID,
  p_filters JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_page INTEGER := COALESCE((p_filters->>'page')::INT, 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE((p_filters->>'page_size')::INT, 20), 1), 200);
  v_status TEXT := NULLIF(p_filters->>'status','');
  v_search TEXT := NULLIF(p_filters->>'search','');
  v_date_from TIMESTAMPTZ := NULLIF(p_filters->>'date_from','')::timestamptz;
  v_date_to TIMESTAMPTZ := NULLIF(p_filters->>'date_to','')::timestamptz;
  v_provider TEXT := NULLIF(p_filters->>'provider','');
  v_include_items BOOLEAN := COALESCE((p_filters->>'include_items')::BOOLEAN, TRUE);
  v_include_counts BOOLEAN := COALESCE((p_filters->>'include_counts')::BOOLEAN, TRUE);
  v_unassigned_only BOOLEAN := COALESCE((p_filters->>'unassigned_only')::BOOLEAN, FALSE);
  v_mine_only BOOLEAN := COALESCE((p_filters->>'mine_only')::BOOLEAN, FALSE);
  v_total BIGINT := 0;
  v_enabled BOOLEAN := TRUE;
  v_result JSONB := '{}'::jsonb;
BEGIN
  -- Guard: verify staff belongs to org and group
  IF NOT EXISTS (
    SELECT 1 FROM public.order_group_members ogm
    WHERE ogm.organization_id = p_org_id 
      AND ogm.group_id = p_group_id
      AND ogm.staff_id = p_staff_id
      AND ogm.active = TRUE
  ) THEN
    -- Staff not in group, return empty result (not an error)
    RETURN jsonb_build_object(
      'success', TRUE, 
      'orders', jsonb_build_array(), 
      'counts', jsonb_build_object(), 
      'stats', jsonb_build_object(), 
      'sharedData', jsonb_build_object(), 
      'metadata', jsonb_build_object(
        'pagination', jsonb_build_object(
          'page', 1,
          'pageSize', v_page_size,
          'totalItems', 0,
          'hasNextPage', false,
          'hasPreviousPage', false
        )
      )
    );
  END IF;

  -- ensure group exists and enabled
  SELECT enabled INTO v_enabled FROM public.order_groups WHERE id = p_group_id AND organization_id = p_org_id;
  IF v_enabled IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object('success', TRUE, 'orders', jsonb_build_array(), 'counts', jsonb_build_object(), 'stats', jsonb_build_object(), 'sharedData', jsonb_build_object(), 'metadata', jsonb_build_object('pagination', jsonb_build_object('page',1,'pageSize',v_page_size,'totalItems',0,'hasNextPage',false,'hasPreviousPage',false)));
  END IF;

  -- Get total count first
  WITH base AS (
    SELECT o.*
    FROM public.online_orders o
    WHERE o.organization_id = p_org_id
      AND (v_status IS NULL OR o.status = v_status)
      AND (v_provider IS NULL OR o.shipping_provider = v_provider)
      AND (v_date_from IS NULL OR o.created_at >= v_date_from)
      AND (v_date_to IS NULL OR o.created_at <= v_date_to)
      AND (
        v_search IS NULL OR
        o.customer_order_number::text ILIKE '%'||v_search||'%' OR
        o.notes ILIKE '%'||v_search||'%' OR
        (o.form_data->>'fullName') ILIKE '%'||v_search||'%' OR
        (o.form_data->>'phone') ILIKE '%'||v_search||'%'
      )
  ),
  allowed AS (
    -- Orders visible by rules
    SELECT b.* FROM base b WHERE public.apply_group_rules(p_group_id, b.id) = TRUE
    UNION
    -- Orders assigned to this staff (open), even if not matching rules
    SELECT b.*
    FROM base b
    JOIN public.online_order_assignments a
      ON a.order_id = b.id AND a.organization_id = p_org_id AND a.status IN ('assigned','accepted')
    WHERE a.staff_id = p_staff_id
  ),
  with_assign AS (
    SELECT v.*, a.staff_id AS assigned_staff_id, a.status AS assignment_status
    FROM allowed v
    LEFT JOIN public.online_order_assignments a
      ON a.order_id = v.id AND a.organization_id = p_org_id AND a.status IN ('assigned','accepted')
  ),
  filtered AS (
    SELECT * FROM with_assign wa
    WHERE (NOT v_unassigned_only OR wa.assigned_staff_id IS NULL)
      AND (NOT v_mine_only OR wa.assigned_staff_id = p_staff_id)
  )
  SELECT COUNT(*)::BIGINT INTO v_total FROM filtered;

  -- Build result with paged data
  v_result := (
    WITH base AS (
      SELECT o.*
      FROM public.online_orders o
      WHERE o.organization_id = p_org_id
        AND (v_status IS NULL OR o.status = v_status)
        AND (v_provider IS NULL OR o.shipping_provider = v_provider)
        AND (v_date_from IS NULL OR o.created_at >= v_date_from)
        AND (v_date_to IS NULL OR o.created_at <= v_date_to)
        AND (
          v_search IS NULL OR
          o.customer_order_number::text ILIKE '%'||v_search||'%' OR
          o.notes ILIKE '%'||v_search||'%' OR
          (o.form_data->>'fullName') ILIKE '%'||v_search||'%' OR
          (o.form_data->>'phone') ILIKE '%'||v_search||'%'
        )
    ),
    allowed AS (
      SELECT b.* FROM base b WHERE public.apply_group_rules(p_group_id, b.id) = TRUE
      UNION
      SELECT b.*
      FROM base b
      JOIN public.online_order_assignments a
        ON a.order_id = b.id AND a.organization_id = p_org_id AND a.status IN ('assigned','accepted')
      WHERE a.staff_id = p_staff_id
    ),
    with_assign AS (
      SELECT v.*, a.staff_id AS assigned_staff_id, a.status AS assignment_status
      FROM allowed v
      LEFT JOIN public.online_order_assignments a
        ON a.order_id = v.id AND a.organization_id = p_org_id AND a.status IN ('assigned','accepted')
    ),
    filtered AS (
      SELECT * FROM with_assign wa
      WHERE (NOT v_unassigned_only OR wa.assigned_staff_id IS NULL)
        AND (NOT v_mine_only OR wa.assigned_staff_id = p_staff_id)
    ),
    paged AS (
      SELECT *
      FROM filtered
      ORDER BY created_at DESC
      OFFSET GREATEST((v_page - 1),0) * v_page_size
      LIMIT v_page_size
    ),
    items_agg AS (
      SELECT oi.order_id, jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'product_name', oi.product_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'total_price', oi.total_price
      )) AS items
      FROM public.online_order_items oi
      WHERE v_include_items
        AND EXISTS (SELECT 1 FROM paged p WHERE p.id = oi.order_id)
      GROUP BY oi.order_id
    )
    SELECT jsonb_build_object(
      'success', TRUE,
      'orders', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'customer_order_number', p.customer_order_number,
            'status', p.status,
            'payment_method', p.payment_method,
            'payment_status', p.payment_status,
            'subtotal', p.subtotal,
            'tax', p.tax,
            'discount', p.discount,
            'total', p.total,
            'shipping_cost', p.shipping_cost,
            'notes', p.notes,
            'created_at', p.created_at,
            'updated_at', p.updated_at,
            'form_data', p.form_data,
            'metadata', p.metadata,
            'shipping_provider', p.shipping_provider,
            'assignment', jsonb_build_object('staff_id', p.assigned_staff_id, 'status', p.assignment_status),
            'assigned_staff_name', (
              SELECT COALESCE(u.name, u.email)
              FROM public.users u
              WHERE u.id = p.assigned_staff_id
              LIMIT 1
            ),
            'order_items', COALESCE(ia.items, '[]'::jsonb)
          )
        ), '[]'::jsonb)
        FROM paged p
        LEFT JOIN items_agg ia ON ia.order_id = p.id
      ),
      'counts', CASE WHEN v_include_counts THEN (
        SELECT jsonb_build_object(
          'pending', COALESCE((SELECT COUNT(*) FROM allowed v WHERE v.status = 'pending'),0),
          'processing', COALESCE((SELECT COUNT(*) FROM allowed v WHERE v.status = 'processing'),0),
          'shipped', COALESCE((SELECT COUNT(*) FROM allowed v WHERE v.status = 'shipped'),0),
          'delivered', COALESCE((SELECT COUNT(*) FROM allowed v WHERE v.status = 'delivered'),0),
          'cancelled', COALESCE((SELECT COUNT(*) FROM allowed v WHERE v.status = 'cancelled'),0)
        )
      ) ELSE '{}'::jsonb END,
      'stats', jsonb_build_object(
        'totalSales', COALESCE((SELECT SUM(total) FROM allowed), 0),
        'avgOrderValue', COALESCE((SELECT AVG(total) FROM allowed), 0),
        'salesTrend', 0,
        'pendingAmount', COALESCE((SELECT SUM(total) FROM allowed WHERE status IN ('pending','processing')), 0)
      ),
      'sharedData', jsonb_build_object(
        'shippingProviders', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', sdv.id,
                'provider_id', sdv.provider_id,
                'provider_code', sdv.provider_code,
                'provider_name', sdv.provider_name,
                'is_enabled', sdv.is_enabled
              )
            ),
            '[]'::jsonb
          )
          FROM shipping_data_view sdv
          WHERE sdv.organization_id = p_org_id
            AND sdv.is_enabled = true
            AND sdv.provider_id IS NOT NULL
        ),
        'callConfirmationStatuses', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'color', color, 'icon', icon)), '[]'::jsonb)
          FROM public.call_confirmation_statuses ccs
          WHERE ccs.organization_id = p_org_id
        ),
        'organizationSettings', (
          SELECT settings FROM public.organizations WHERE id = p_org_id
        )
      ),
      'metadata', jsonb_build_object(
        'pagination', jsonb_build_object(
          'page', v_page,
          'pageSize', v_page_size,
          'totalItems', COALESCE(v_total,0),
          'totalPages', CASE WHEN v_page_size > 0 THEN CEIL(COALESCE(v_total,0)::NUMERIC / v_page_size)::INT ELSE 1 END,
          'hasNextPage', (v_page * v_page_size) < COALESCE(v_total,0),
          'hasPreviousPage', v_page > 1
        )
      )
    )
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_online_orders_for_staff(UUID, UUID, UUID, JSONB) TO authenticated;
