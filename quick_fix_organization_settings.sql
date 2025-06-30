-- إصلاح سريع لمشكلة إعدادات المؤسسة
-- يجب تشغيل هذا الملف أولاً لحذف الدوال الموجودة

-- 1. حذف الدوال الموجودة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_organization_settings_safe(UUID);
DROP FUNCTION IF EXISTS update_organization_settings_safe(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN);

-- 2. حذف السياسات القديمة
DROP POLICY IF EXISTS "allow_organization_settings_access" ON organization_settings;
DROP POLICY IF EXISTS "allow_public_org_settings_read" ON organization_settings;
DROP POLICY IF EXISTS "allow_authenticated_users_read_org_settings" ON organization_settings;
DROP POLICY IF EXISTS "allow_org_members_update_settings" ON organization_settings;

-- 3. إنشاء سياسة بسيطة للقراءة والكتابة
CREATE POLICY "simple_org_settings_access"
ON organization_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. التأكد من وجود إعدادات لجميع المؤسسات
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
)
ON CONFLICT (organization_id) DO NOTHING;

-- 5. إضافة حقل display_text_with_logo إذا لم يكن موجوداً
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

-- 6. إنشاء مؤشر لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id_simple 
ON organization_settings(organization_id);

-- 7. تحليل الجدول
ANALYZE organization_settings;

-- 8. عرض النتائج
SELECT 
  COUNT(*) as total_organizations,
  COUNT(os.id) as organizations_with_settings,
  COUNT(*) - COUNT(os.id) as organizations_without_settings
FROM organizations o
LEFT JOIN organization_settings os ON o.id = os.organization_id;

-- عرض بعض الإعدادات كمثال
SELECT 
  organization_id,
  site_name,
  default_language,
  theme_primary_color,
  enable_public_site,
  display_text_with_logo,
  updated_at
FROM organization_settings 
ORDER BY updated_at DESC 
LIMIT 3; 