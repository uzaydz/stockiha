-- معالجة مشكلة "unique_org_settings" التي تسبب تكرار في سجلات إعدادات المنظمة
-- خطأ: Key (organization_id)=(xxx) already exists

-- 1. إزالة القيد الفريد الذي يسبب المشكلة
ALTER TABLE organization_settings DROP CONSTRAINT IF EXISTS unique_org_settings;

-- 2. تنظيف السجلات المكررة (اختياري - لتحسين قاعدة البيانات)
-- احتفظ بأحدث سجل لكل منظمة وحذف البقية
WITH duplicates AS (
  SELECT id, organization_id,
         ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY updated_at DESC) as row_num
  FROM organization_settings
)
DELETE FROM organization_settings
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- 3. لا تحاول إضافة مفتاح أساسي جديد - الجدول يمتلك بالفعل مفتاح أساسي
-- (تجنب خطأ multiple primary keys are not allowed)
-- ونضيف بدلاً من ذلك فهرس على حقل organization_id للتحسين
DROP INDEX IF EXISTS idx_organization_settings_organization_id;
CREATE INDEX idx_organization_settings_organization_id ON organization_settings(organization_id);

-- 4. إنشاء مشغل بديل يمنع تكرار السجلات ويقوم بالتحديث بدلاً من الإدراج إذا كان السجل موجوداً
CREATE OR REPLACE FUNCTION handle_organization_settings_insert()
RETURNS TRIGGER AS $$
DECLARE
  existing_id UUID;
BEGIN
  -- تحقق إذا كان هناك سجل موجود بالفعل للمنظمة
  SELECT id INTO existing_id
  FROM organization_settings
  WHERE organization_id = NEW.organization_id;
  
  IF FOUND THEN
    -- إذا كان موجوداً بالفعل، قم بتحديث السجل الموجود
    UPDATE organization_settings
    SET
      theme_primary_color = NEW.theme_primary_color,
      theme_secondary_color = NEW.theme_secondary_color,
      theme_mode = NEW.theme_mode,
      site_name = NEW.site_name,
      default_language = NEW.default_language,
      custom_css = NEW.custom_css,
      logo_url = NEW.logo_url,
      favicon_url = NEW.favicon_url,
      custom_js = NEW.custom_js,
      custom_header = NEW.custom_header,
      custom_footer = NEW.custom_footer,
      enable_registration = NEW.enable_registration,
      enable_public_site = NEW.enable_public_site,
      updated_at = NOW()
    WHERE id = existing_id;
    
    -- استخدم معرف السجل الموجود
    NEW.id := existing_id;
    RETURN NULL; -- منع عملية الإدراج
  ELSE
    -- إذا لم يكن موجوداً، اسمح بعملية الإدراج
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المشغل
DROP TRIGGER IF EXISTS handle_org_settings_duplicate ON organization_settings;
CREATE TRIGGER handle_org_settings_duplicate
BEFORE INSERT ON organization_settings
FOR EACH ROW EXECUTE FUNCTION handle_organization_settings_insert();

-- 5. إنشاء دالة مساعدة لإنشاء أو تحديث سجل إعدادات المنظمة
CREATE OR REPLACE FUNCTION upsert_organization_settings(
  p_organization_id UUID,
  p_theme_primary_color VARCHAR DEFAULT '#0099ff',
  p_theme_secondary_color VARCHAR DEFAULT '#6c757d',
  p_theme_mode VARCHAR DEFAULT 'light',
  p_site_name VARCHAR DEFAULT NULL,
  p_default_language VARCHAR DEFAULT 'ar'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  setting_id UUID;
BEGIN
  -- تحقق إذا كان هناك سجل موجود بالفعل
  SELECT id INTO setting_id
  FROM organization_settings
  WHERE organization_id = p_organization_id;
  
  IF FOUND THEN
    -- تحديث السجل الموجود
    UPDATE organization_settings
    SET
      theme_primary_color = p_theme_primary_color,
      theme_secondary_color = p_theme_secondary_color,
      theme_mode = p_theme_mode,
      site_name = COALESCE(p_site_name, site_name),
      default_language = p_default_language,
      updated_at = NOW()
    WHERE id = setting_id;
  ELSE
    -- إنشاء سجل جديد
    INSERT INTO organization_settings (
      organization_id,
      theme_primary_color,
      theme_secondary_color,
      theme_mode,
      site_name,
      default_language
    ) VALUES (
      p_organization_id,
      p_theme_primary_color,
      p_theme_secondary_color,
      p_theme_mode,
      p_site_name,
      p_default_language
    )
    RETURNING id INTO setting_id;
  END IF;
  
  RETURN setting_id;
END;
$$;

-- منح صلاحيات تنفيذ الدالة
GRANT EXECUTE ON FUNCTION upsert_organization_settings(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_organization_settings(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO service_role; 