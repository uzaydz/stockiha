-- =============================================================================
-- RPC Functions لإدارة إعدادات المتجر بشكل شامل
-- تم إنشاؤها لدعم صفحة إعدادات المتجر الجديدة
-- =============================================================================

-- دالة لجلب جميع إعدادات المتجر مع البيانات المرتبطة
CREATE OR REPLACE FUNCTION get_store_settings_complete(
  p_organization_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  org_settings RECORD;
  tracking_pixels JSONB;
BEGIN
  -- التحقق من صحة معرف المؤسسة
  IF p_organization_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'organization_id_required',
      'message', 'معرف المؤسسة مطلوب'
    );
  END IF;

  -- جلب إعدادات المؤسسة الأساسية
  SELECT 
    os.*,
    o.name as organization_name,
    o.subdomain,
    o.domain,
    o.owner_id
  INTO org_settings
  FROM organization_settings os
  LEFT JOIN organizations o ON o.id = os.organization_id
  WHERE os.organization_id = p_organization_id
  LIMIT 1;

  -- إذا لم توجد إعدادات، إنشاء إعدادات افتراضية
  IF NOT FOUND THEN
    INSERT INTO organization_settings (
      organization_id,
      theme_primary_color,
      theme_secondary_color,
      theme_mode,
      site_name,
      default_language,
      enable_registration,
      enable_public_site,
      display_text_with_logo,
      created_at,
      updated_at
    ) VALUES (
      p_organization_id,
      '#3B82F6',
      '#10B981',
      'light',
      'متجري الإلكتروني',
      'ar',
      true,
      true,
      true,
      NOW(),
      NOW()
    )
    RETURNING 
      *,
      (SELECT name FROM organizations WHERE id = p_organization_id) as organization_name,
      (SELECT subdomain FROM organizations WHERE id = p_organization_id) as subdomain,
      (SELECT domain FROM organizations WHERE id = p_organization_id) as domain,
      (SELECT owner_id FROM organizations WHERE id = p_organization_id) as owner_id
    INTO org_settings;
  END IF;

  -- استخراج بيانات التتبع من custom_js
  tracking_pixels := '{
    "facebook": {"enabled": false, "pixelId": ""},
    "google": {"enabled": false, "pixelId": ""},
    "tiktok": {"enabled": false, "pixelId": ""},
    "snapchat": {"enabled": false, "pixelId": ""}
  }'::jsonb;

  IF org_settings.custom_js IS NOT NULL THEN
    BEGIN
      -- محاولة استخراج بيانات التتبع من JSON
      SELECT COALESCE(
        (org_settings.custom_js::jsonb -> 'trackingPixels'),
        tracking_pixels
      ) INTO tracking_pixels;
    EXCEPTION WHEN OTHERS THEN
      -- في حالة خطأ في تحليل JSON، استخدم القيم الافتراضية
      tracking_pixels := tracking_pixels;
    END;
  END IF;

  -- بناء النتيجة النهائية
  result := json_build_object(
    'success', true,
    'settings', json_build_object(
      'id', org_settings.id,
      'organization_id', org_settings.organization_id,
      'theme_primary_color', org_settings.theme_primary_color,
      'theme_secondary_color', org_settings.theme_secondary_color,
      'theme_mode', org_settings.theme_mode,
      'site_name', org_settings.site_name,
      'custom_css', org_settings.custom_css,
      'logo_url', org_settings.logo_url,
      'favicon_url', org_settings.favicon_url,
      'default_language', org_settings.default_language,
      'custom_js', org_settings.custom_js,
      'custom_header', org_settings.custom_header,
      'custom_footer', org_settings.custom_footer,
      'enable_registration', org_settings.enable_registration,
      'enable_public_site', org_settings.enable_public_site,
      'display_text_with_logo', org_settings.display_text_with_logo,
      'created_at', org_settings.created_at,
      'updated_at', org_settings.updated_at
    ),
    'organization', json_build_object(
      'name', org_settings.organization_name,
      'subdomain', org_settings.subdomain,
      'domain', org_settings.domain,
      'owner_id', org_settings.owner_id
    ),
    'tracking_pixels', tracking_pixels,
    'timestamp', extract(epoch from now()) * 1000
  );

  RETURN result;
END;
$$;

-- دالة شاملة لتحديث إعدادات المتجر
CREATE OR REPLACE FUNCTION update_store_settings_comprehensive(
  org_id UUID,
  p_theme_primary_color VARCHAR DEFAULT NULL,
  p_theme_secondary_color VARCHAR DEFAULT NULL,
  p_theme_mode VARCHAR DEFAULT NULL,
  p_site_name VARCHAR DEFAULT NULL,
  p_custom_css TEXT DEFAULT NULL,
  p_logo_url VARCHAR DEFAULT NULL,
  p_favicon_url VARCHAR DEFAULT NULL,
  p_default_language VARCHAR DEFAULT NULL,
  p_custom_js TEXT DEFAULT NULL,
  p_custom_header TEXT DEFAULT NULL,
  p_custom_footer TEXT DEFAULT NULL,
  p_enable_registration BOOLEAN DEFAULT NULL,
  p_enable_public_site BOOLEAN DEFAULT NULL,
  p_display_text_with_logo BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_settings RECORD;
  result JSON;
BEGIN
  -- التحقق من صحة معرف المؤسسة
  IF org_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'organization_id_required',
      'message', 'معرف المؤسسة مطلوب'
    );
  END IF;

  -- تحديث الإعدادات باستخدام COALESCE للحفاظ على القيم الحالية للحقول غير المحدثة
  UPDATE organization_settings
  SET
    theme_primary_color = COALESCE(p_theme_primary_color, theme_primary_color),
    theme_secondary_color = COALESCE(p_theme_secondary_color, theme_secondary_color),
    theme_mode = COALESCE(p_theme_mode, theme_mode),
    site_name = COALESCE(p_site_name, site_name),
    custom_css = CASE 
      WHEN p_custom_css IS NOT NULL THEN p_custom_css 
      ELSE custom_css 
    END,
    logo_url = CASE 
      WHEN p_logo_url IS NOT NULL THEN p_logo_url 
      ELSE logo_url 
    END,
    favicon_url = CASE 
      WHEN p_favicon_url IS NOT NULL THEN p_favicon_url 
      ELSE favicon_url 
    END,
    default_language = COALESCE(p_default_language, default_language),
    custom_js = CASE 
      WHEN p_custom_js IS NOT NULL THEN p_custom_js 
      ELSE custom_js 
    END,
    custom_header = CASE 
      WHEN p_custom_header IS NOT NULL THEN p_custom_header 
      ELSE custom_header 
    END,
    custom_footer = CASE 
      WHEN p_custom_footer IS NOT NULL THEN p_custom_footer 
      ELSE custom_footer 
    END,
    enable_registration = COALESCE(p_enable_registration, enable_registration),
    enable_public_site = COALESCE(p_enable_public_site, enable_public_site),
    display_text_with_logo = COALESCE(p_display_text_with_logo, display_text_with_logo),
    updated_at = NOW()
  WHERE organization_id = org_id
  RETURNING * INTO updated_settings;

  -- التحقق من نجاح التحديث
  IF NOT FOUND THEN
    -- إذا لم يوجد سجل، إنشاء واحد جديد
    INSERT INTO organization_settings (
      organization_id,
      theme_primary_color,
      theme_secondary_color,
      theme_mode,
      site_name,
      custom_css,
      logo_url,
      favicon_url,
      default_language,
      custom_js,
      custom_header,
      custom_footer,
      enable_registration,
      enable_public_site,
      display_text_with_logo,
      created_at,
      updated_at
    ) VALUES (
      org_id,
      COALESCE(p_theme_primary_color, '#3B82F6'),
      COALESCE(p_theme_secondary_color, '#10B981'),
      COALESCE(p_theme_mode, 'light'),
      COALESCE(p_site_name, 'متجري الإلكتروني'),
      p_custom_css,
      p_logo_url,
      p_favicon_url,
      COALESCE(p_default_language, 'ar'),
      p_custom_js,
      p_custom_header,
      p_custom_footer,
      COALESCE(p_enable_registration, true),
      COALESCE(p_enable_public_site, true),
      COALESCE(p_display_text_with_logo, true),
      NOW(),
      NOW()
    )
    RETURNING * INTO updated_settings;
  END IF;

  -- إنشاء سجل في audit log
  INSERT INTO settings_audit_log (
    user_id,
    organization_id,
    setting_type,
    setting_key,
    action_type,
    table_name,
    record_id,
    new_value,
    old_value
  ) VALUES (
    (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1),
    org_id,
    'organization',
    'store_settings_update',
    'UPDATE',
    'organization_settings',
    updated_settings.id,
    json_build_object(
      'theme_primary_color', updated_settings.theme_primary_color,
      'theme_secondary_color', updated_settings.theme_secondary_color,
      'theme_mode', updated_settings.theme_mode,
      'site_name', updated_settings.site_name,
      'default_language', updated_settings.default_language,
      'enable_registration', updated_settings.enable_registration,
      'enable_public_site', updated_settings.enable_public_site,
      'display_text_with_logo', updated_settings.display_text_with_logo
    )::TEXT,
    NULL
  );

  -- بناء النتيجة
  result := json_build_object(
    'success', true,
    'message', 'تم تحديث إعدادات المتجر بنجاح',
    'data', json_build_object(
      'id', updated_settings.id,
      'organization_id', updated_settings.organization_id,
      'theme_primary_color', updated_settings.theme_primary_color,
      'theme_secondary_color', updated_settings.theme_secondary_color,
      'theme_mode', updated_settings.theme_mode,
      'site_name', updated_settings.site_name,
      'custom_css', updated_settings.custom_css,
      'logo_url', updated_settings.logo_url,
      'favicon_url', updated_settings.favicon_url,
      'default_language', updated_settings.default_language,
      'custom_js', updated_settings.custom_js,
      'custom_header', updated_settings.custom_header,
      'custom_footer', updated_settings.custom_footer,
      'enable_registration', updated_settings.enable_registration,
      'enable_public_site', updated_settings.enable_public_site,
      'display_text_with_logo', updated_settings.display_text_with_logo,
      'created_at', updated_settings.created_at,
      'updated_at', updated_settings.updated_at
    ),
    'timestamp', extract(epoch from now()) * 1000
  );

  RETURN result;
END;
$$;

-- دالة لجلب إعدادات الثيم فقط (للاستخدام السريع)
-- ملاحظة: تم إزالة هذه الدالة لأنها موجودة بالفعل في قاعدة البيانات
-- يمكن استخدام الدالة الموجودة أو إنشاء دالة جديدة باسم مختلف

-- منح صلاحيات تنفيذ الدوال
GRANT EXECUTE ON FUNCTION get_store_settings_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_settings_complete(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION update_store_settings_comprehensive(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_store_settings_comprehensive(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO service_role;

-- تم إزالة منح الصلاحيات لأن الدالة موجودة بالفعل

-- إضافة تعليقات للتوثيق
COMMENT ON FUNCTION get_store_settings_complete(UUID) IS 'دالة شاملة لجلب جميع إعدادات المتجر مع البيانات المرتبطة';
COMMENT ON FUNCTION update_store_settings_comprehensive(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) IS 'دالة شاملة لتحديث إعدادات المتجر مع دعم التحديث الجزئي';
