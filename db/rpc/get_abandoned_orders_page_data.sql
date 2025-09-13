-- 🎯 RPC: get_abandoned_orders_page_data
-- يُرجع بيانات صفحة "الطلبات المتروكة" في استعلام واحد (carts + stats)
-- الاستخدام:
--   select * from get_abandoned_orders_page_data('org-uuid'::uuid, 500);

DROP FUNCTION IF EXISTS public.get_abandoned_orders_page_data(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_abandoned_orders_page_data(
  p_organization_id uuid,
  p_limit integer DEFAULT 500
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_carts jsonb;
  v_stats jsonb;
BEGIN
  -- carts
  IF to_regclass('public.abandoned_carts_view') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_carts
    FROM (
      SELECT 
        id, organization_id, product_id, customer_name, customer_phone, customer_email,
        province, municipality, address, delivery_option, payment_method, notes,
        custom_fields_data, calculated_delivery_fee, subtotal, discount_amount, total_amount,
        status, last_activity_at, created_at, updated_at, cart_items,
        abandoned_hours, item_count, product_name, product_image
      FROM abandoned_carts_view
      WHERE organization_id = p_organization_id AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT p_limit
    ) t;
  ELSE
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_carts
    FROM (
      SELECT 
        ac.id, ac.organization_id, ac.product_id, ac.customer_name, ac.customer_phone, ac.customer_email,
        ac.province, ac.municipality, ac.address, ac.delivery_option, ac.payment_method, ac.notes,
        ac.custom_fields_data, ac.calculated_delivery_fee, ac.subtotal, ac.discount_amount, ac.total_amount,
        ac.status, ac.last_activity_at, ac.created_at, ac.updated_at, ac.cart_items,
        EXTRACT(EPOCH FROM (NOW() - ac.last_activity_at))/3600 AS abandoned_hours,
        CASE WHEN jsonb_typeof(ac.cart_items) = 'array' THEN jsonb_array_length(ac.cart_items) ELSE 0 END AS item_count,
        p.name AS product_name,
        p.thumbnail_image AS product_image,
        ypg.name_ar AS province_name,
        ymg.name_ar AS municipality_name
      FROM abandoned_carts ac
      LEFT JOIN products p ON ac.product_id = p.id
      LEFT JOIN yalidine_provinces_global ypg ON ac.province::int = ypg.id
      LEFT JOIN yalidine_municipalities_global ymg ON ac.municipality::int = ymg.id
      WHERE ac.organization_id = p_organization_id AND ac.status = 'pending'
      ORDER BY ac.created_at DESC
      LIMIT p_limit
    ) t;
  END IF;

  -- stats
  IF to_regclass('public.abandoned_carts_stats') IS NOT NULL THEN
    SELECT row_to_json(s)::jsonb INTO v_stats
    FROM (
      SELECT total_count, total_value, avg_value, today_count, week_count, month_count
      FROM abandoned_carts_stats
      WHERE organization_id = p_organization_id
      LIMIT 1
    ) s;

    IF v_stats IS NULL THEN
      v_stats := jsonb_build_object(
        'total_count', 0,
        'total_value', 0,
        'avg_value', 0,
        'today_count', 0,
        'week_count', 0,
        'month_count', 0
      );
    END IF;
  ELSE
    SELECT jsonb_build_object(
      'total_count', COUNT(*),
      'total_value', COALESCE(SUM(total_amount), 0),
      'avg_value', COALESCE(AVG(total_amount), 0),
      'today_count', SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END),
      'week_count', SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END),
      'month_count', SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END)
    ) INTO v_stats
    FROM abandoned_carts
    WHERE organization_id = p_organization_id AND status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'carts', v_carts,
    'stats', v_stats
  );
END;
$$;

COMMENT ON FUNCTION public.get_abandoned_orders_page_data IS 'Returns abandoned carts + stats in one JSONB payload for given organization';

