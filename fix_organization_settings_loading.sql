-- إصلاح مشكلة عدم تحميل إعدادات المؤسسة من قاعدة البيانات
-- هذا الملف يحل جميع مشاكل الصلاحيات وضمان تحميل الإعدادات بشكل صحيح

-- 0. حذف الدوال والسياسات الموجودة أولاً
DROP FUNCTION IF EXISTS get_organization_settings_safe(UUID);
DROP FUNCTION IF EXISTS update_organization_settings_safe(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN);

-- 1. حذف جميع السياسات القديمة
DROP POLICY IF EXISTS "allow_authenticated_users_read_org_settings" ON organization_settings;
DROP POLICY IF EXISTS "allow_org_members_update_settings" ON organization_settings;
DROP POLICY IF EXISTS "public_theme_access" ON organization_settings;
DROP POLICY IF EXISTS "users_can_update_own_org_settings" ON organization_settings;
DROP POLICY IF EXISTS "simple_org_settings_access" ON organization_settings;
DROP POLICY IF EXISTS "organization_settings_full_access" ON organization_settings;

-- 2. إنشاء سياسة واحدة بسيطة وواضحة
CREATE POLICY "organization_settings_access"
ON organization_settings
FOR ALL
TO authenticated
USING (
  -- السماح للمستخدمين المصادق عليهم بالوصول لإعدادات مؤسستهم
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.organization_id = organization_settings.organization_id
  )
  OR
  -- السماح لمالكي المؤسسة
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_settings.organization_id 
    AND o.owner_id = auth.uid()
  )
  OR
  -- السماح للمشرفين العامين
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.is_super_admin = true
  )
)
WITH CHECK (
  -- نفس الشروط للتحديث والإدراج
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.organization_id = organization_settings.organization_id
  )
  OR
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_settings.organization_id 
    AND o.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.is_super_admin = true
  )
);

-- 3. إنشاء دالة آمنة لجلب إعدادات المؤسسة
CREATE OR REPLACE FUNCTION get_organization_settings_safe(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  theme_primary_color VARCHAR,
  theme_secondary_color VARCHAR,
  theme_mode VARCHAR,
  site_name VARCHAR,
  custom_css TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  default_language VARCHAR,
  custom_js TEXT,
  custom_header TEXT,
  custom_footer TEXT,
  enable_registration BOOLEAN,
  enable_public_site BOOLEAN,
  display_text_with_logo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- محاولة جلب الإعدادات الموجودة
  RETURN QUERY
  SELECT 
    os.id,
    os.organization_id,
    os.theme_primary_color,
    os.theme_secondary_color,
    os.theme_mode,
    os.site_name,
    os.custom_css,
    os.logo_url,
    os.favicon_url,
    os.default_language,
    os.custom_js,
    os.custom_header,
    os.custom_footer,
    os.enable_registration,
    os.enable_public_site,
    os.display_text_with_logo,
    os.created_at,
    os.updated_at
  FROM organization_settings os
  WHERE os.organization_id = p_org_id;
  
  -- إذا لم توجد إعدادات، إنشاؤها
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
      custom_js
    ) VALUES (
      p_org_id,
      '#0099ff',
      '#6c757d',
      'light',
      COALESCE((SELECT name FROM organizations WHERE id = p_org_id), 'متجري'),
      'ar',
      true,
      true,
      true,
      '{"trackingPixels":{"facebook":{"enabled":false,"pixelId":""},"tiktok":{"enabled":false,"pixelId":""},"snapchat":{"enabled":false,"pixelId":""},"google":{"enabled":false,"pixelId":""}}}'
    );
    
    -- إرجاع الإعدادات الجديدة
    RETURN QUERY
    SELECT 
      os.id,
      os.organization_id,
      os.theme_primary_color,
      os.theme_secondary_color,
      os.theme_mode,
      os.site_name,
      os.custom_css,
      os.logo_url,
      os.favicon_url,
      os.default_language,
      os.custom_js,
      os.custom_header,
      os.custom_footer,
      os.enable_registration,
      os.enable_public_site,
      os.display_text_with_logo,
      os.created_at,
      os.updated_at
    FROM organization_settings os
    WHERE os.organization_id = p_org_id;
  END IF;
END;
$$;

-- منح صلاحيات للدالة
GRANT EXECUTE ON FUNCTION get_organization_settings_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_settings_safe(UUID) TO anon;

-- 4. إنشاء دالة آمنة لتحديث إعدادات المؤسسة
CREATE OR REPLACE FUNCTION update_organization_settings_safe(
  p_org_id UUID,
  p_theme_primary_color VARCHAR DEFAULT NULL,
  p_theme_secondary_color VARCHAR DEFAULT NULL,
  p_theme_mode VARCHAR DEFAULT NULL,
  p_site_name VARCHAR DEFAULT NULL,
  p_custom_css TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_favicon_url TEXT DEFAULT NULL,
  p_default_language VARCHAR DEFAULT NULL,
  p_custom_js TEXT DEFAULT NULL,
  p_custom_header TEXT DEFAULT NULL,
  p_custom_footer TEXT DEFAULT NULL,
  p_enable_registration BOOLEAN DEFAULT NULL,
  p_enable_public_site BOOLEAN DEFAULT NULL,
  p_display_text_with_logo BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  theme_primary_color VARCHAR,
  theme_secondary_color VARCHAR,
  theme_mode VARCHAR,
  site_name VARCHAR,
  custom_css TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  default_language VARCHAR,
  custom_js TEXT,
  custom_header TEXT,
  custom_footer TEXT,
  enable_registration BOOLEAN,
  enable_public_site BOOLEAN,
  display_text_with_logo BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- التحقق من وجود المؤسسة
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'المؤسسة غير موجودة';
  END IF;
  
  -- تحديث الإعدادات أو إنشاؤها إذا لم تكن موجودة
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
    updated_at
  ) VALUES (
    p_org_id,
    COALESCE(p_theme_primary_color, '#0099ff'),
    COALESCE(p_theme_secondary_color, '#6c757d'),
    COALESCE(p_theme_mode, 'light'),
    COALESCE(p_site_name, (SELECT name FROM organizations WHERE id = p_org_id)),
    p_custom_css,
    p_logo_url,
    p_favicon_url,
    COALESCE(p_default_language, 'ar'),
    COALESCE(p_custom_js, '{"trackingPixels":{"facebook":{"enabled":false,"pixelId":""},"tiktok":{"enabled":false,"pixelId":""},"snapchat":{"enabled":false,"pixelId":""},"google":{"enabled":false,"pixelId":""}}}'),
    p_custom_header,
    p_custom_footer,
    COALESCE(p_enable_registration, true),
    COALESCE(p_enable_public_site, true),
    COALESCE(p_display_text_with_logo, true),
    NOW()
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    theme_primary_color = COALESCE(p_theme_primary_color, organization_settings.theme_primary_color),
    theme_secondary_color = COALESCE(p_theme_secondary_color, organization_settings.theme_secondary_color),
    theme_mode = COALESCE(p_theme_mode, organization_settings.theme_mode),
    site_name = COALESCE(p_site_name, organization_settings.site_name),
    custom_css = COALESCE(p_custom_css, organization_settings.custom_css),
    logo_url = COALESCE(p_logo_url, organization_settings.logo_url),
    favicon_url = COALESCE(p_favicon_url, organization_settings.favicon_url),
    default_language = COALESCE(p_default_language, organization_settings.default_language),
    custom_js = COALESCE(p_custom_js, organization_settings.custom_js),
    custom_header = COALESCE(p_custom_header, organization_settings.custom_header),
    custom_footer = COALESCE(p_custom_footer, organization_settings.custom_footer),
    enable_registration = COALESCE(p_enable_registration, organization_settings.enable_registration),
    enable_public_site = COALESCE(p_enable_public_site, organization_settings.enable_public_site),
    display_text_with_logo = COALESCE(p_display_text_with_logo, organization_settings.display_text_with_logo),
    updated_at = NOW();
  
  -- إرجاع الإعدادات المحدثة
  RETURN QUERY
  SELECT 
    os.id,
    os.organization_id,
    os.theme_primary_color,
    os.theme_secondary_color,
    os.theme_mode,
    os.site_name,
    os.custom_css,
    os.logo_url,
    os.favicon_url,
    os.default_language,
    os.custom_js,
    os.custom_header,
    os.custom_footer,
    os.enable_registration,
    os.enable_public_site,
    os.display_text_with_logo,
    os.created_at,
    os.updated_at
  FROM organization_settings os
  WHERE os.organization_id = p_org_id;
END;
$$;

-- منح صلاحيات للدالة
GRANT EXECUTE ON FUNCTION update_organization_settings_safe(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- 5. التأكد من وجود إعدادات لجميع المؤسسات الموجودة
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
  custom_js
)
SELECT 
  o.id,
  '#0099ff',
  '#6c757d',
  'light',
  o.name,
  'ar',
  true,
  true,
  true,
  '{"trackingPixels":{"facebook":{"enabled":false,"pixelId":""},"tiktok":{"enabled":false,"pixelId":""},"snapchat":{"enabled":false,"pixelId":""},"google":{"enabled":false,"pixelId":""}}}'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_settings os 
  WHERE os.organization_id = o.id
);

-- 6. إنشاء مؤشرات لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id_optimized 
ON organization_settings(organization_id) 
WHERE organization_id IS NOT NULL;

-- 7. إضافة حقل display_text_with_logo إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_settings' 
    AND column_name = 'display_text_with_logo'
  ) THEN
    ALTER TABLE organization_settings 
    ADD COLUMN display_text_with_logo BOOLEAN DEFAULT true;
  END IF;
END $$;

-- تحديث الحقل للسجلات الموجودة
UPDATE organization_settings 
SET display_text_with_logo = true 
WHERE display_text_with_logo IS NULL;

-- 8. تحليل الجدول لتحسين الأداء
ANALYZE organization_settings;

-- 9. اختبار الدوال الجديدة
DO $$
DECLARE
  test_org_id UUID;
  settings_record RECORD;
BEGIN
  -- الحصول على معرف مؤسسة للاختبار
  SELECT id INTO test_org_id FROM organizations LIMIT 1;
  
  IF test_org_id IS NOT NULL THEN
    -- اختبار دالة الجلب
    SELECT * INTO settings_record FROM get_organization_settings_safe(test_org_id) LIMIT 1;
    
    IF settings_record IS NOT NULL THEN
      RAISE NOTICE 'تم اختبار دالة جلب الإعدادات بنجاح للمؤسسة: %', test_org_id;
    ELSE
      RAISE WARNING 'فشل في اختبار دالة جلب الإعدادات للمؤسسة: %', test_org_id;
    END IF;
  END IF;
END $$;

-- إظهار إحصائيات النهائية
SELECT 
  COUNT(*) as total_organizations,
  COUNT(os.id) as organizations_with_settings,
  COUNT(*) - COUNT(os.id) as organizations_without_settings
FROM organizations o
LEFT JOIN organization_settings os ON o.id = os.organization_id;

-- عرض آخر الإعدادات المحدثة
SELECT 
  organization_id,
  site_name,
  default_language,
  theme_primary_color,
  updated_at
FROM organization_settings 
ORDER BY updated_at DESC 
LIMIT 5; 