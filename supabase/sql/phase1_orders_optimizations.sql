-- Phase 1: Orders page performance optimizations
-- Safe to re-run; uses IF NOT EXISTS where applicable

-- 1) Ensure pg_trgm is enabled (required for trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Trigram indexes for JSON fields used in search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_online_orders_form_fullname_trgm
ON public.online_orders
USING gin (lower((form_data->>'fullName')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_online_orders_form_phone_trgm
ON public.online_orders
USING gin (lower((form_data->>'phone')) gin_trgm_ops);

-- 3) Optional normalized phone for exact/prefix matches (commented by default)
-- ALTER TABLE public.online_orders
--   ADD COLUMN IF NOT EXISTS phone_normalized text GENERATED ALWAYS AS (
--     regexp_replace(lower(form_data->>'phone'), '\\D', '', 'g')
--   ) STORED;
-- CREATE INDEX IF NOT EXISTS idx_online_orders_phone_norm
--   ON public.online_orders (phone_normalized);

-- 4) Updated RPC: add optional flags for payload control; preserve compatibility
CREATE OR REPLACE FUNCTION public.get_orders_complete_data(
  p_organization_id uuid,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20,
  p_status text DEFAULT NULL,
  p_call_confirmation_status_id integer DEFAULT NULL,
  p_shipping_provider text DEFAULT NULL,
  p_search_term text DEFAULT NULL,
  p_date_from timestamp without time zone DEFAULT NULL,
  p_date_to timestamp without time zone DEFAULT NULL,
  p_sort_by text DEFAULT 'created_at',
  p_sort_order text DEFAULT 'desc',
  -- New optional flags
  p_include_items boolean DEFAULT false,
  p_include_shared boolean DEFAULT false,
  p_include_counts boolean DEFAULT true,
  p_fetch_all boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_orders JSONB;
  v_metadata JSONB;
  v_counts JSONB := '{}'::jsonb;
  v_stats JSONB := '{}'::jsonb;
  v_shared_data JSONB := '{}'::jsonb;
  v_total_orders INTEGER := 0;
  v_start_time TIMESTAMP := NOW();
  v_performance_log JSONB := '[]'::JSONB;
  v_step_start TIMESTAMP;
BEGIN
  v_offset := GREATEST((p_page - 1), 0) * p_page_size;

  v_step_start := NOW();
  WITH filtered_orders AS (
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
      o.shipping_address_id,
      o.shipping_method,
      o.shipping_cost,
      o.shipping_option,
      o.notes,
      o.employee_id,
      o.created_at,
      o.updated_at,
      o.slug,
      o.customer_order_number,
      o.global_order_number,
      o.created_from,
      o.call_confirmation_status_id,
      o.call_confirmation_notes,
      o.call_confirmation_updated_at,
      o.call_confirmation_updated_by,
      o.form_data,
      o.metadata,
      o.yalidine_tracking_id,
      o.zrexpress_tracking_id,
      o.ecotrack_tracking_id,
      o.maystro_tracking_id,
      o.shipping_provider,
      o.tracking_data,
      o.last_status_update,
      o.delivered_at,
      o.current_location,
      o.estimated_delivery_date
    FROM online_orders o
    WHERE o.organization_id = p_organization_id
      AND (p_status IS NULL OR o.status = p_status)
      AND (p_call_confirmation_status_id IS NULL OR o.call_confirmation_status_id = p_call_confirmation_status_id)
      AND (p_shipping_provider IS NULL OR o.shipping_provider = p_shipping_provider)
      AND (p_date_from IS NULL OR o.created_at >= p_date_from)
      AND (p_date_to IS NULL OR o.created_at <= p_date_to)
      AND (
        p_search_term IS NULL OR 
        o.customer_order_number::text ILIKE '%' || p_search_term || '%' OR
        (o.form_data->>'fullName') ILIKE '%' || p_search_term || '%' OR
        (o.form_data->>'phone') ILIKE '%' || p_search_term || '%' OR
        o.notes ILIKE '%' || p_search_term || '%'
      )
    ORDER BY 
      -- إفتراضياً: الأحدث أولاً
      CASE WHEN (p_sort_by IS NULL OR p_sort_by = 'created_at') AND (p_sort_order IS NULL OR p_sort_order = 'desc') THEN o.created_at END DESC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN o.created_at END ASC,
      CASE WHEN p_sort_by = 'total' AND p_sort_order = 'desc' THEN o.total END DESC,
      CASE WHEN p_sort_by = 'total' AND p_sort_order = 'asc' THEN o.total END ASC,
      CASE WHEN p_sort_by = 'customer_order_number' AND p_sort_order = 'desc' THEN o.customer_order_number END DESC,
      CASE WHEN p_sort_by = 'customer_order_number' AND p_sort_order = 'asc' THEN o.customer_order_number END ASC,
      CASE WHEN p_sort_by = 'global_order_number' AND p_sort_order = 'desc' THEN o.global_order_number END DESC,
      CASE WHEN p_sort_by = 'global_order_number' AND p_sort_order = 'asc' THEN o.global_order_number END ASC,
      o.created_at DESC, o.customer_order_number DESC
  ),
  paginated_orders AS (
    SELECT * FROM filtered_orders
    LIMIT p_page_size OFFSET v_offset
  ),
  all_orders AS (
    SELECT * FROM filtered_orders
  ),
  items_agg AS (
    SELECT 
      oi.order_id,
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'product_name', oi.product_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'color_id', oi.color_id,
          'color_name', oi.color_name,
          'size_id', oi.size_id,
          'size_name', oi.size_name,
          'selected_price', oi.selected_price
        )
      ) AS items_data
    FROM online_order_items oi
    WHERE p_include_items = TRUE AND oi.order_id IN (
      SELECT id FROM all_orders WHERE p_fetch_all = TRUE
      UNION ALL
      SELECT id FROM paginated_orders WHERE p_fetch_all = FALSE
    )
    GROUP BY oi.order_id
  ),
  selected_orders AS (
    SELECT * FROM all_orders WHERE p_fetch_all = TRUE
    UNION ALL
    SELECT * FROM paginated_orders WHERE p_fetch_all = FALSE
  ),
  order_with_relations AS (
    SELECT 
      o.*,
      COALESCE(
        jsonb_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'email', c.email, 'type', 'customer'),
        jsonb_build_object('id', gc.id, 'name', gc.name, 'phone', gc.phone, 'email', NULL, 'type', 'guest'),
        jsonb_build_object('name', o.form_data->>'fullName', 'phone', o.form_data->>'phone', 'type', 'form_data')
      ) AS customer_data,
      CASE WHEN a.id IS NOT NULL THEN 
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'street_address', a.street_address,
          'city', a.city,
          'state', a.state,
          'municipality', COALESCE(amun.name, a.municipality),
          'phone', a.phone,
          'type', 'address'
        )
      ELSE
        jsonb_build_object(
          'province', COALESCE(wprov.name, o.form_data->>'province'),
          'municipality', COALESCE(wmun.name, o.form_data->>'municipality'),
          'address', o.form_data->>'address',
          'delivery_option', o.form_data->>'deliveryOption',
          'type', 'form_data'
        )
      END AS shipping_address_data,
      CASE WHEN ccs.id IS NOT NULL THEN
        jsonb_build_object('id', ccs.id, 'name', ccs.name, 'color', ccs.color, 'icon', ccs.icon, 'is_default', ccs.is_default)
      ELSE NULL END AS call_confirmation_status_data,
      COALESCE(i.items_data, '[]'::jsonb) AS order_items
    FROM selected_orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN guest_customers gc ON gc.id = o.customer_id
    LEFT JOIN addresses a ON a.id = o.shipping_address_id
    LEFT JOIN call_confirmation_statuses ccs ON ccs.id = o.call_confirmation_status_id
    LEFT JOIN yalidine_provinces_global wprov ON wprov.id = (o.form_data->>'province')::INTEGER
    LEFT JOIN yalidine_municipalities_global wmun ON wmun.id = (o.form_data->>'municipality')::INTEGER
    LEFT JOIN yalidine_municipalities_global amun ON amun.id = a.municipality::INTEGER
    LEFT JOIN items_agg i ON i.order_id = o.id
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'customer_id', o.customer_id,
      'subtotal', o.subtotal,
      'tax', o.tax,
      'discount', o.discount,
      'total', o.total,
      'status', o.status,
      'payment_method', o.payment_method,
      'payment_status', o.payment_status,
      'shipping_method', o.shipping_method,
      'shipping_cost', o.shipping_cost,
      'shipping_option', o.shipping_option,
      'notes', o.notes,
      'employee_id', o.employee_id,
      'created_at', o.created_at,
      'updated_at', o.updated_at,
      'slug', o.slug,
      'customer_order_number', o.customer_order_number,
      'created_from', o.created_from,
      'call_confirmation_status_id', o.call_confirmation_status_id,
      'call_confirmation_notes', o.call_confirmation_notes,
      'call_confirmation_updated_at', o.call_confirmation_updated_at,
      'call_confirmation_updated_by', o.call_confirmation_updated_by,
      'form_data', o.form_data,
      'metadata', o.metadata,
      'yalidine_tracking_id', o.yalidine_tracking_id,
      'zrexpress_tracking_id', o.zrexpress_tracking_id,
      'ecotrack_tracking_id', o.ecotrack_tracking_id,
      'maystro_tracking_id', o.maystro_tracking_id,
      'shipping_provider', o.shipping_provider,
      'tracking_data', o.tracking_data,
      'last_status_update', o.last_status_update,
      'delivered_at', o.delivered_at,
      'current_location', o.current_location,
      'estimated_delivery_date', o.estimated_delivery_date,
      'customer', o.customer_data,
      'shipping_address', o.shipping_address_data,
      'call_confirmation_status', o.call_confirmation_status_data,
      -- توفير حالات تأكيد الاتصال لاستخدام خفيف على الواجهة بدون Context
      'available_call_statuses', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id', cs.id, 'name', cs.name, 'color', cs.color, 'icon', cs.icon, 'is_default', cs.is_default) ORDER BY cs.is_default DESC, cs.name), '[]'::jsonb)
        FROM call_confirmation_statuses cs
        WHERE cs.organization_id = p_organization_id
      ),
      -- تمرير عناصر الطلب ضمن نفس الاستجابة (بدون أي استدعاء لاحق)
      'order_items', CASE WHEN p_include_items THEN o.order_items ELSE '[]'::jsonb END
    )
  ) INTO v_orders
  FROM order_with_relations o;
  
  v_performance_log := v_performance_log || jsonb_build_object('step','fetch_orders','duration_ms', EXTRACT(epoch FROM (NOW()-v_step_start))*1000);

  -- Counts (optional)؛ عند الجلب الكامل احسب دائماً الإجمالي لضبط الصفحات محلياً
  IF p_include_counts OR p_fetch_all THEN
    v_step_start := NOW();
    SELECT COUNT(*) INTO v_total_orders
    FROM online_orders o
    WHERE o.organization_id = p_organization_id
      AND (p_status IS NULL OR o.status = p_status)
      AND (p_call_confirmation_status_id IS NULL OR o.call_confirmation_status_id = p_call_confirmation_status_id)
      AND (p_shipping_provider IS NULL OR o.shipping_provider = p_shipping_provider)
      AND (p_date_from IS NULL OR o.created_at >= p_date_from)
      AND (p_date_to IS NULL OR o.created_at <= p_date_to)
      AND (
        p_search_term IS NULL OR 
        o.customer_order_number::text ILIKE '%' || p_search_term || '%' OR
        (o.form_data->>'fullName') ILIKE '%' || p_search_term || '%' OR
        (o.form_data->>'phone') ILIKE '%' || p_search_term || '%' OR
        o.notes ILIKE '%' || p_search_term || '%'
      );
    v_performance_log := v_performance_log || jsonb_build_object('step','count_orders','duration_ms', EXTRACT(epoch FROM (NOW()-v_step_start))*1000);
  END IF;

  -- Status counts (unchanged)
  v_step_start := NOW();
  WITH status_counts AS (
    SELECT o.status, COUNT(*) AS count
    FROM online_orders o
    WHERE o.organization_id = p_organization_id
    GROUP BY o.status
  ), all_statuses AS (
    SELECT 'all' AS status, SUM(count) AS count FROM status_counts
    UNION ALL
    SELECT status, count FROM status_counts
  )
  SELECT jsonb_object_agg(status, count) INTO v_counts FROM all_statuses;
  v_performance_log := v_performance_log || jsonb_build_object('step','status_counts','duration_ms', EXTRACT(epoch FROM (NOW()-v_step_start))*1000);

  -- Financial stats (unchanged basic)
  v_step_start := NOW();
  WITH financial_stats AS (
    SELECT 
      COALESCE(SUM(o.total), 0) AS total_sales,
      COALESCE(AVG(o.total), 0) AS avg_order_value,
      COALESCE(SUM(CASE WHEN o.status = 'pending' THEN o.total ELSE 0 END), 0) AS pending_amount,
      COUNT(*) AS total_orders_count
    FROM online_orders o
    WHERE o.organization_id = p_organization_id
  )
  SELECT jsonb_build_object(
    'totalSales', fs.total_sales,
    'avgOrderValue', fs.avg_order_value,
    'pendingAmount', fs.pending_amount,
    'salesTrend', 0,
    'totalOrdersCount', fs.total_orders_count
  ) INTO v_stats FROM financial_stats fs;
  v_performance_log := v_performance_log || jsonb_build_object('step','financial_stats','duration_ms', EXTRACT(epoch FROM (NOW()-v_step_start))*1000);

  -- Shared data (optional)
  IF p_include_shared THEN
    v_step_start := NOW();
    SELECT jsonb_build_object(
      'callConfirmationStatuses', (
        SELECT jsonb_agg(jsonb_build_object('id', cs.id, 'name', cs.name, 'color', cs.color, 'icon', cs.icon, 'is_default', cs.is_default) ORDER BY cs.is_default DESC, cs.name)
        FROM call_confirmation_statuses cs
        WHERE cs.organization_id = p_organization_id
      ),
      'provinces', (
        SELECT jsonb_agg(jsonb_build_object('id', yp.id, 'name', yp.name, 'name_ar', yp.name_ar) ORDER BY yp.name)
        FROM yalidine_provinces_global yp
      ),
      'municipalities', (
        SELECT jsonb_agg(jsonb_build_object('id', ym.id, 'name', ym.name, 'wilaya_id', ym.wilaya_id, 'wilaya_name', ym.wilaya_name, 'name_ar', ym.name_ar, 'wilaya_name_ar', ym.wilaya_name_ar) ORDER BY ym.name)
        FROM yalidine_municipalities_global ym
      ),
      'shippingProviders', (
        SELECT jsonb_agg(jsonb_build_object('id', sdv.id, 'provider_id', sdv.provider_id, 'provider_code', sdv.provider_code, 'provider_name', sdv.provider_name, 'is_enabled', sdv.is_enabled))
        FROM shipping_data_view sdv
        WHERE sdv.organization_id = p_organization_id AND sdv.is_enabled = TRUE AND sdv.provider_id IS NOT NULL
      ),
      'organizationSettings', (
        SELECT jsonb_build_object(
          'auto_deduct_inventory', COALESCE((os.custom_js::jsonb ->> 'auto_deduct_inventory')::boolean, false),
          'trackingPixels', COALESCE(os.custom_js::jsonb -> 'trackingPixels', '{}'::jsonb)
        )
        FROM organization_settings os
        WHERE os.organization_id = p_organization_id
        LIMIT 1
      )
    ) INTO v_shared_data;
    v_performance_log := v_performance_log || jsonb_build_object('step','shared_data','duration_ms', EXTRACT(epoch FROM (NOW()-v_step_start))*1000);
  END IF;

  -- Metadata
  SELECT jsonb_build_object(
    'pagination', jsonb_build_object(
      'page', p_page,
      'pageSize', p_page_size,
      'totalItems', CASE WHEN (p_include_counts OR p_fetch_all) THEN v_total_orders ELSE v_total_orders END,
      'totalPages', CASE WHEN (p_include_counts OR p_fetch_all) THEN CEIL(GREATEST(v_total_orders,0)::DECIMAL / NULLIF(p_page_size,0)) ELSE NULL END,
      'hasNextPage', CASE WHEN p_fetch_all THEN FALSE ELSE CASE WHEN p_include_counts THEN (p_page * p_page_size) < v_total_orders ELSE NULL END END,
      'hasPreviousPage', p_page > 1
    ),
    'filters', jsonb_build_object(
      'status', p_status,
      'callConfirmationStatusId', p_call_confirmation_status_id,
      'shippingProvider', p_shipping_provider,
      'searchTerm', p_search_term,
      'dateFrom', p_date_from,
      'dateTo', p_date_to
    ),
    'sorting', jsonb_build_object('sortBy', p_sort_by, 'sortOrder', p_sort_order),
    'performance', jsonb_build_object(
      'totalDurationMs', EXTRACT(epoch FROM (NOW() - v_start_time)) * 1000,
      'steps', v_performance_log,
      'optimizationVersion', '1.1',
      'singleQuery', true,
      'fetchedAll', p_fetch_all
    ),
    'dataFreshness', jsonb_build_object('fetchedAt', NOW(), 'cacheStatus', 'fresh')
  ) INTO v_metadata;

  RETURN jsonb_build_object(
    'success', true,
    'orders', COALESCE(v_orders, '[]'::jsonb),
    'counts', COALESCE(v_counts, '{}'::jsonb),
    'stats', COALESCE(v_stats, '{}'::jsonb),
    'sharedData', COALESCE(v_shared_data, '{}'::jsonb),
    'metadata', v_metadata
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'errorCode', SQLSTATE,
    'metadata', jsonb_build_object(
      'performanceLog', v_performance_log,
      'totalDurationMs', EXTRACT(epoch FROM (NOW() - v_start_time)) * 1000
    )
  );
END;
$$;
