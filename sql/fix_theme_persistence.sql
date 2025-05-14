-- إصلاح مشكلة عدم استمرارية ألوان الثيم بعد تحديث الصفحة

-- إنشاء وظيفة للحصول على إعدادات الثيم للمؤسسة
CREATE OR REPLACE FUNCTION get_organization_theme(p_organization_id UUID)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من وجود إعدادات للمؤسسة
  IF EXISTS (SELECT 1 FROM organization_settings WHERE organization_id = p_organization_id) THEN
    -- إرجاع إعدادات الثيم من جدول إعدادات المؤسسة
    RETURN QUERY
    SELECT jsonb_build_object(
      'organization_id', organization_id,
      'theme_primary_color', theme_primary_color,
      'theme_secondary_color', theme_secondary_color,
      'theme_mode', theme_mode,
      'site_name', site_name,
      'logo_url', logo_url,
      'favicon_url', favicon_url,
      'custom_css', custom_css,
      'custom_js', custom_js,
      'custom_header', custom_header,
      'custom_footer', custom_footer
    )
    FROM organization_settings
    WHERE organization_id = p_organization_id;
  ELSE
    -- إرجاع إعدادات افتراضية إذا لم تكن هناك إعدادات للمؤسسة
    RETURN QUERY
    SELECT jsonb_build_object(
      'organization_id', p_organization_id,
      'theme_primary_color', '#3B82F6',
      'theme_secondary_color', '#10B981',
      'theme_mode', 'light',
      'site_name', 'stockiha',
      'logo_url', NULL,
      'favicon_url', NULL,
      'custom_css', NULL,
      'custom_js', NULL,
      'custom_header', NULL,
      'custom_footer', NULL
    );
  END IF;
END;
$$;

-- منح صلاحيات للوصول إلى الوظيفة
GRANT EXECUTE ON FUNCTION get_organization_theme(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_theme(UUID) TO service_role;

-- إضافة تعليق للوظيفة
COMMENT ON FUNCTION get_organization_theme(UUID) IS 'وظيفة للحصول على إعدادات الثيم للمؤسسة مع تطبيق القيم الافتراضية إذا لم تكن موجودة';

-- إضافة مؤشر على حقل organization_id في جدول organization_settings لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id); 