-- =====================================================
-- Fix: get_orders_complete_data - Shipping Providers Fix
-- Date: 2025-10-30
-- Issue: شركات الشحن لا تظهر للـ admin users
-- Solution: استخدام shipping_data_view بدلاً من shipping_provider من online_orders
-- =====================================================

-- حذف جميع النسخ القديمة من الدالة ديناميكياً
DO $$ 
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT 
      p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'get_orders_complete_data'
  LOOP
    EXECUTE 'DROP FUNCTION ' || func_record.func_signature || ' CASCADE';
    RAISE NOTICE 'تم حذف: %', func_record.func_signature;
  END LOOP;
END $$;

-- إنشاء الدالة المحدثة
CREATE OR REPLACE FUNCTION public.get_orders_complete_data(
  p_organization_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_status TEXT DEFAULT NULL,
  p_call_confirmation_status_id INTEGER DEFAULT NULL,
  p_shipping_provider TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_date_from TIMESTAMP DEFAULT NULL,
  p_date_to TIMESTAMP DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_fetch_all BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_orders JSONB;
  v_metadata JSONB;
  v_counts JSONB;
  v_stats JSONB;
  v_shared_data JSONB;
  v_total_orders INTEGER;
  v_start_time TIMESTAMP := NOW();
BEGIN
  -- حساب الصفحة
  v_offset := (p_page - 1) * p_page_size;
  
  -- جلب الطلبات
  WITH filtered_orders AS (
    SELECT 
      o.*
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
      o.notes ILIKE '%' || p_search_term || '%' OR
      (o.form_data->>'fullName') ILIKE '%' || p_search_term || '%' OR
      (o.form_data->>'phone') ILIKE '%' || p_search_term || '%'
    )
    ORDER BY 
      CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN o.created_at END DESC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN o.created_at END ASC,
      o.created_at DESC, o.customer_order_number DESC
  ),
  paginated_orders AS (
    SELECT * FROM filtered_orders
    LIMIT CASE WHEN p_fetch_all THEN NULL ELSE p_page_size END 
    OFFSET CASE WHEN p_fetch_all THEN NULL ELSE v_offset END
  ),
  order_with_items AS (
    SELECT 
      o.*,
      COALESCE(
        (
          SELECT jsonb_agg(
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
              'size_name', oi.size_name
            )
          )
          FROM online_order_items oi
          WHERE oi.order_id = o.id
        ),
        '[]'::jsonb
      ) as order_items
    FROM paginated_orders o
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
      'form_data', o.form_data,
      'metadata', o.metadata,
      'shipping_provider', o.shipping_provider,
      'order_items', o.order_items
    )
  ) INTO v_orders
  FROM order_with_items o;
  
  -- حساب إجمالي عدد الطلبات
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
    o.notes ILIKE '%' || p_search_term || '%' OR
    (o.form_data->>'fullName') ILIKE '%' || p_search_term || '%' OR
    (o.form_data->>'phone') ILIKE '%' || p_search_term || '%'
  );
  
  -- إحصائيات الطلبات حسب الحالة
  WITH status_counts AS (
    SELECT 
      o.status,
      COUNT(*) as count
    FROM online_orders o
    WHERE o.organization_id = p_organization_id
    GROUP BY o.status
  ),
  all_statuses AS (
    SELECT 'all' as status, SUM(count) as count FROM status_counts
    UNION ALL
    SELECT status, count FROM status_counts
  )
  SELECT jsonb_object_agg(status, count) INTO v_counts FROM all_statuses;
  
  -- إحصائيات مالية
  WITH financial_stats AS (
    SELECT 
      COALESCE(SUM(o.total), 0) as total_sales,
      COALESCE(AVG(o.total), 0) as avg_order_value,
      COALESCE(SUM(CASE WHEN o.status IN ('pending','processing') THEN o.total ELSE 0 END), 0) as pending_amount
    FROM online_orders o
    WHERE o.organization_id = p_organization_id
  )
  SELECT jsonb_build_object(
    'totalSales', fs.total_sales,
    'avgOrderValue', fs.avg_order_value,
    'pendingAmount', fs.pending_amount,
    'salesTrend', 0
  ) INTO v_stats
  FROM financial_stats fs;
  
  -- البيانات المشتركة (الإصلاح الأساسي: استخدام shipping_data_view)
  SELECT jsonb_build_object(
    'callConfirmationStatuses', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', cs.id,
            'name', cs.name,
            'color', cs.color,
            'icon', cs.icon,
            'is_default', cs.is_default
          ) ORDER BY cs.is_default DESC, cs.name
        ),
        '[]'::jsonb
      )
      FROM call_confirmation_statuses cs
      WHERE cs.organization_id = p_organization_id
    ),
    'provinces', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', yp.id,
            'name', yp.name,
            'name_ar', yp.name_ar
          ) ORDER BY yp.name
        ),
        '[]'::jsonb
      )
      FROM yalidine_provinces_global yp
    ),
    'municipalities', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', ym.id,
            'name', ym.name,
            'wilaya_id', ym.wilaya_id,
            'wilaya_name', ym.wilaya_name,
            'name_ar', ym.name_ar,
            'wilaya_name_ar', ym.wilaya_name_ar
          ) ORDER BY ym.name
        ),
        '[]'::jsonb
      )
      FROM yalidine_municipalities_global ym
    ),
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
      WHERE sdv.organization_id = p_organization_id
        AND sdv.is_enabled = true
        AND sdv.provider_id IS NOT NULL
    ),
    'organizationSettings', (
      SELECT jsonb_build_object(
        'id', os.id,
        'theme_primary_color', os.theme_primary_color,
        'theme_secondary_color', os.theme_secondary_color,
        'site_name', os.site_name,
        'logo_url', os.logo_url,
        'default_language', os.default_language
      )
      FROM organization_settings os
      WHERE os.organization_id = p_organization_id
      LIMIT 1
    )
  ) INTO v_shared_data;
  
  -- إنشاء metadata للاستجابة
  SELECT jsonb_build_object(
    'pagination', jsonb_build_object(
      'page', p_page,
      'pageSize', p_page_size,
      'totalItems', v_total_orders,
      'totalPages', CEIL(v_total_orders::DECIMAL / p_page_size),
      'hasNextPage', (p_page * p_page_size) < v_total_orders,
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
    'sorting', jsonb_build_object(
      'sortBy', p_sort_by,
      'sortOrder', p_sort_order
    ),
    'performance', jsonb_build_object(
      'totalDurationMs', EXTRACT(epoch FROM (NOW() - v_start_time)) * 1000
    )
  ) INTO v_metadata;
  
  -- إرجاع الاستجابة الكاملة
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
    'errorCode', SQLSTATE
  );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.get_orders_complete_data TO authenticated;

-- رسالة تأكيد
DO $$
BEGIN
  RAISE NOTICE 'تم إصلاح get_orders_complete_data بنجاح - الآن شركات الشحن ستظهر من shipping_data_view';
END $$;
