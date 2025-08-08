-- =============================================
-- RPC: get_thank_you_page_data
-- يجلب بيانات صفحة الشكر في استدعاء واحد:
-- - الطلب عبر customer_order_number (مع تقييد اختياري organization_id)
-- - عناصر الطلب مجمعة JSON
-- - قالب thank_you_templates الأنسب (منتج محدد ثم عام)
-- - جزء من organization_settings لتقليل طلبات الواجهة (لغة/اسم/شعار...)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_thank_you_page_data(
  p_customer_order_number INTEGER,
  p_organization_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_org_id UUID;
  v_order JSONB;
  v_items JSONB;
  v_template JSONB;
  v_settings JSONB;
  v_first_product_id UUID;
BEGIN
  -- جلب الطلب الأحدث برقم الطلب المعروض (مع تقييد المؤسسة إن وُفر)
  SELECT o.id, o.organization_id, to_jsonb(o)
  INTO v_order_id, v_org_id, v_order
  FROM online_orders o
  WHERE o.customer_order_number = p_customer_order_number
    AND (p_organization_id IS NULL OR o.organization_id = p_organization_id)
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF v_order_id IS NULL THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', json_build_object('message', 'ORDER_NOT_FOUND', 'customer_order_number', p_customer_order_number)
    );
  END IF;

  -- عناصر الطلب كمصفوفة JSON + استخراج أول product_id للاختيار الذكي للقالب
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'order_id', oi.order_id,
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
        ORDER BY oi.created_at
      ), '[]'::jsonb
    ) AS items_json,
    (ARRAY_AGG(oi.product_id) FILTER (WHERE oi.product_id IS NOT NULL))[1] AS first_product_id
  INTO v_items, v_first_product_id
  FROM online_order_items oi
  WHERE oi.order_id = v_order_id;

  -- اختيار القالب الأنسب: specific_products أولاً ثم all_products
  SELECT to_jsonb(t)
  INTO v_template
  FROM (
    SELECT
      id, name, organization_id, layout_type, color_scheme, custom_colors,
      content, is_active, is_default, applies_to, product_ids, created_at, updated_at
    FROM thank_you_templates
    WHERE organization_id = v_org_id
      AND is_active = TRUE
      AND (
        applies_to = 'all_products'
        OR (
          applies_to = 'specific_products'
          AND v_first_product_id IS NOT NULL
          AND product_ids @> ARRAY[v_first_product_id]::uuid[]
        )
      )
    ORDER BY
      CASE WHEN applies_to = 'specific_products' THEN 0 ELSE 1 END,
      updated_at DESC
    LIMIT 1
  ) t;

  -- جزء من إعدادات المؤسسة المفيدة للواجهة لتجنب طلبات إضافية
  SELECT jsonb_build_object(
    'default_language', s.default_language,
    'site_name', s.site_name,
    'logo_url', s.logo_url,
    'favicon_url', s.favicon_url,
    'custom_js', s.custom_js
  )
  INTO v_settings
  FROM organization_settings s
  WHERE s.organization_id = v_org_id
  LIMIT 1;

  RETURN json_build_object(
    'success', TRUE,
    'order', v_order,
    'items', COALESCE(v_items, '[]'::jsonb),
    'template', COALESCE(v_template, '{}'::jsonb),
    'organization_settings', COALESCE(v_settings, '{}'::jsonb)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'error', json_build_object('message', SQLERRM, 'code', SQLSTATE)
    );
END;
$$;

-- صلاحيات التنفيذ للمستخدمين المصدقين والمجهولين (حسب حاجة الواجهة العامة)
GRANT EXECUTE ON FUNCTION public.get_thank_you_page_data(INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_thank_you_page_data(INTEGER, UUID) TO anon;

COMMENT ON FUNCTION public.get_thank_you_page_data(INTEGER, UUID) IS
  'يجلب بيانات صفحة الشكر (الطلب + العناصر + القالب + إعدادات المؤسسة) في استدعاء واحد.';


