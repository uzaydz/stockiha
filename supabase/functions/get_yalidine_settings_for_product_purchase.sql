-- دالة لجلب جميع إعدادات ياليدين المطلوبة لصفحة شراء المنتج
-- تجمع البيانات من 3 جداول في استدعاء واحد لتحسين الأداء

CREATE OR REPLACE FUNCTION get_yalidine_settings_for_product_purchase(
  p_organization_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  yalidine_provider_id INT;
  org_settings RECORD;
  provider_settings RECORD;
BEGIN
  -- البحث عن معرف مزود ياليدين أولاً
  SELECT id INTO yalidine_provider_id
  FROM shipping_providers 
  WHERE code = 'yalidine'
  LIMIT 1;

  -- إذا لم يوجد مزود ياليدين، إرجاع خطأ
  IF yalidine_provider_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'yalidine_provider_not_found',
      'message', 'مزود الشحن ياليدين غير موجود'
    );
  END IF;

  -- جلب إعدادات المؤسسة (ولاية المصدر)
  SELECT origin_wilaya_id
  INTO org_settings
  FROM yalidine_settings_with_origin 
  WHERE organization_id = p_organization_id
  LIMIT 1;

  -- جلب إعدادات API ياليدين للمؤسسة
  SELECT api_token, api_key, is_enabled
  INTO provider_settings
  FROM shipping_provider_settings 
  WHERE organization_id = p_organization_id 
    AND provider_id = yalidine_provider_id 
    AND is_enabled = true
  LIMIT 1;

  -- فحص وجود إعدادات API
  IF provider_settings.api_token IS NULL OR provider_settings.api_key IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'yalidine_credentials_not_found',
      'message', 'بيانات اعتماد ياليدين غير متوفرة أو غير مفعلة',
      'yalidine_provider_id', yalidine_provider_id,
      'origin_wilaya_id', COALESCE(org_settings.origin_wilaya_id, 40)
    );
  END IF;

  -- إنشاء النتيجة المجمعة
  result := json_build_object(
    'success', true,
    'data', json_build_object(
      'yalidine_provider_id', yalidine_provider_id,
      'origin_wilaya_id', COALESCE(org_settings.origin_wilaya_id, 40), -- افتراضي: ولاية خنشلة
      'api_credentials', json_build_object(
        'api_token', provider_settings.api_token,
        'api_key', provider_settings.api_key,
        'is_enabled', provider_settings.is_enabled
      )
    ),
    'message', 'تم جلب إعدادات ياليدين بنجاح'
  );

  RETURN result;

EXCEPTION 
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'database_error',
      'message', 'خطأ في قاعدة البيانات: ' || SQLERRM,
      'sql_state', SQLSTATE
    );
END;
$$;

-- منح الصلاحيات المناسبة
GRANT EXECUTE ON FUNCTION get_yalidine_settings_for_product_purchase(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_yalidine_settings_for_product_purchase(UUID) TO authenticated;

-- إضافة تعليق للتوثيق
COMMENT ON FUNCTION get_yalidine_settings_for_product_purchase(UUID) IS 
'دالة محسنة لجلب جميع إعدادات ياليدين المطلوبة لصفحة شراء المنتج في استدعاء واحد. 
تجمع البيانات من: shipping_providers, yalidine_settings_with_origin, shipping_provider_settings'; 