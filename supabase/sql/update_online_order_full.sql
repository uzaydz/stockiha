CREATE OR REPLACE FUNCTION public.update_online_order_full(
  p_organization_id uuid,
  p_order_id uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
  v_auto_deduct BOOLEAN := FALSE;
  v_now TIMESTAMP := NOW();
  v_updated jsonb := '{}'::jsonb;
BEGIN
  -- تحقق من ملكية الطلب
  SELECT EXISTS(
    SELECT 1 FROM online_orders WHERE id = p_order_id AND organization_id = p_organization_id
  ) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND_OR_FORBIDDEN';
  END IF;

  -- قراءة إعداد خصم المخزون (إن لزم لاحقاً)
  SELECT COALESCE((os.custom_js::jsonb ->> 'auto_deduct_inventory')::boolean, FALSE)
  INTO v_auto_deduct
  FROM organization_settings os
  WHERE os.organization_id = p_organization_id
  LIMIT 1;

  -- تحديث حقول online_orders الأساسية
  UPDATE online_orders SET
    status = COALESCE((p_payload->'order'->>'status')::text, status),
    notes = COALESCE((p_payload->'order'->>'notes')::text, notes),
    shipping_method = COALESCE((p_payload->'order'->>'shipping_method')::text, shipping_method),
    shipping_cost = COALESCE((p_payload->'order'->>'shipping_cost')::numeric, shipping_cost),
    shipping_option = COALESCE((p_payload->'order'->>'shipping_option')::text, shipping_option),
    shipping_provider = COALESCE((p_payload->'order'->>'shipping_provider')::text, shipping_provider),
    yalidine_tracking_id = COALESCE((p_payload->'order'->>'yalidine_tracking_id')::text, yalidine_tracking_id),
    zrexpress_tracking_id = COALESCE((p_payload->'order'->>'zrexpress_tracking_id')::text, zrexpress_tracking_id),
    ecotrack_tracking_id = COALESCE((p_payload->'order'->>'ecotrack_tracking_id')::text, ecotrack_tracking_id),
    call_confirmation_status_id = COALESCE((p_payload->'order'->>'call_confirmation_status_id')::int, call_confirmation_status_id),
    call_confirmation_notes = COALESCE((p_payload->'order'->>'call_confirmation_notes')::text, call_confirmation_notes),
    form_data = CASE WHEN p_payload ? 'form_data' THEN form_data || (p_payload->'form_data') ELSE form_data END,
    updated_at = v_now
  WHERE id = p_order_id AND organization_id = p_organization_id;

  -- حذف عناصر
  IF (p_payload ? 'items_delete') THEN
    DELETE FROM online_order_items
    WHERE order_id = p_order_id AND id IN (
      SELECT (elem->>'id')::uuid FROM jsonb_array_elements(p_payload->'items_delete') AS elem
    );
  END IF;

  -- إدراج/تحديث عناصر
  IF (p_payload ? 'items_upsert') THEN
    INSERT INTO online_order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price, color_id, color_name, size_id, size_name)
    SELECT
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      p_order_id,
      NULLIF(elem->>'product_id','')::uuid,
      NULLIF(elem->>'product_name',''),
      COALESCE((elem->>'quantity')::int, 1),
      COALESCE((elem->>'unit_price')::numeric, 0),
      COALESCE((elem->>'total_price')::numeric, COALESCE((elem->>'unit_price')::numeric,0) * COALESCE((elem->>'quantity')::int,1)),
      NULLIF(elem->>'color_id',''),
      NULLIF(elem->>'color_name',''),
      NULLIF(elem->>'size_id',''),
      NULLIF(elem->>'size_name','')
    FROM jsonb_array_elements(p_payload->'items_upsert') AS elem
    ON CONFLICT (id) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      product_name = EXCLUDED.product_name,
      quantity = EXCLUDED.quantity,
      unit_price = EXCLUDED.unit_price,
      total_price = EXCLUDED.total_price,
      color_id = EXCLUDED.color_id,
      color_name = EXCLUDED.color_name,
      size_id = EXCLUDED.size_id,
      size_name = EXCLUDED.size_name;
  END IF;

  -- إعادة حساب الإجماليات (subtotal/total)
  UPDATE online_orders o SET
    subtotal = COALESCE((SELECT SUM(oi.total_price) FROM online_order_items oi WHERE oi.order_id = o.id), 0),
    total = COALESCE((SELECT SUM(oi.total_price) FROM online_order_items oi WHERE oi.order_id = o.id), 0) + COALESCE(o.shipping_cost,0) - COALESCE(o.discount,0),
    updated_at = v_now
  WHERE o.id = p_order_id AND o.organization_id = p_organization_id;

  -- إرجاع الطلب المحدَّث بصيغة موحّدة (نفس شكل get_orders_complete_data)
  RETURN (
    SELECT jsonb_build_object(
      'success', true,
      'order', jsonb_build_object(
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
        'yalidine_tracking_id', o.yalidine_tracking_id,
        'zrexpress_tracking_id', o.zrexpress_tracking_id,
        'ecotrack_tracking_id', o.ecotrack_tracking_id,
        'shipping_provider', o.shipping_provider,
        'form_data', o.form_data,
        'metadata', o.metadata
      ),
      'order_items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
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
        ) ORDER BY oi.created_at DESC)
        FROM online_order_items oi WHERE oi.order_id = o.id
      ), '[]'::jsonb)
    )
    FROM online_orders o
    WHERE o.id = p_order_id AND o.organization_id = p_organization_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$$;


