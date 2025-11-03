-- إنشاء دالة لجلب البيانات المشتركة للطلبات (تُجلب مرة واحدة فقط)
-- تتضمن: المحافظات، البلديات، حالات التأكيد، شركات الشحن

DROP FUNCTION IF EXISTS get_orders_shared_data(uuid);

CREATE OR REPLACE FUNCTION get_orders_shared_data(
  p_organization_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_provinces jsonb;
  v_municipalities jsonb;
  v_call_statuses jsonb;
  v_shipping_providers jsonb;
BEGIN
  -- جلب المحافظات
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
  INTO v_provinces
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'name', name,
      'name_ar', name_ar,
      'code', code
    ) as sub
    FROM yalidine_provinces_global
    ORDER BY name
  ) p;

  -- جلب البلديات
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
  INTO v_municipalities
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'name', name,
      'name_ar', name_ar,
      'province_id', province_id
    ) as sub
    FROM yalidine_communes_global
    ORDER BY name
  ) m;

  -- جلب حالات تأكيد المكالمات
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
  INTO v_call_statuses
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'name', name,
      'color', color,
      'is_default', is_default
    ) as sub
    FROM call_confirmation_statuses
    WHERE organization_id = p_organization_id OR organization_id IS NULL
    ORDER BY id
  ) cs;

  -- جلب شركات الشحن (جميع الشركات النشطة)
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
  INTO v_shipping_providers
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'code', code,
      'name', name,
      'is_active', is_active,
      'base_url', base_url
    ) as sub
    FROM shipping_providers
    WHERE is_active = true
    ORDER BY name
  ) sp;

  -- إرجاع كل البيانات في كائن JSON واحد
  RETURN jsonb_build_object(
    'provinces', v_provinces,
    'municipalities', v_municipalities,
    'call_statuses', v_call_statuses,
    'shipping_providers', v_shipping_providers
  );
END;
$$;

-- إعطاء الصلاحيات المناسبة
GRANT EXECUTE ON FUNCTION get_orders_shared_data(uuid) TO authenticated;

-- تعليق توضيحي
COMMENT ON FUNCTION get_orders_shared_data IS 'دالة لجلب البيانات المشتركة للطلبات (provinces, municipalities, call_statuses, shipping_providers) - تُجلب مرة واحدة وتُخزن في cache';
