-- إنشاء جدول إعدادات المؤسسة إذا لم يكن موجوداً
-- هذا الجدول يحتوي على إعدادات الثيم والمتجر

-- التأكد من وجود امتداد UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- إنشاء جدول إعدادات المؤسسة
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  theme_primary_color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
  theme_secondary_color VARCHAR(20) NOT NULL DEFAULT '#10B981',
  theme_mode VARCHAR(10) DEFAULT 'light', -- (light, dark, auto)
  site_name VARCHAR(100),
  custom_css TEXT DEFAULT NULL,
  logo_url TEXT DEFAULT NULL,
  favicon_url TEXT DEFAULT NULL,
  default_language VARCHAR(10) NOT NULL DEFAULT 'ar',
  custom_js TEXT DEFAULT NULL,
  custom_header TEXT DEFAULT NULL,
  custom_footer TEXT DEFAULT NULL,
  enable_registration BOOLEAN DEFAULT TRUE,
  enable_public_site BOOLEAN DEFAULT TRUE,
  display_text_with_logo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_org_settings UNIQUE (organization_id)
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);

-- إنشاء trigger للتحديث التلقائي لـ updated_at
CREATE OR REPLACE FUNCTION update_organization_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_organization_settings_updated_at
    BEFORE UPDATE ON organization_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_settings_updated_at();

-- منح صلاحيات
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_settings TO service_role;

-- إضافة تعليقات
COMMENT ON TABLE organization_settings IS 'إعدادات المتجر الإلكتروني للمؤسسة';
COMMENT ON COLUMN organization_settings.theme_primary_color IS 'اللون الأساسي للثيم';
COMMENT ON COLUMN organization_settings.theme_secondary_color IS 'اللون الثانوي للثيم';
COMMENT ON COLUMN organization_settings.theme_mode IS 'وضع الثيم (light, dark, auto)';
COMMENT ON COLUMN organization_settings.site_name IS 'اسم الموقع';
COMMENT ON COLUMN organization_settings.custom_css IS 'CSS مخصص';
COMMENT ON COLUMN organization_settings.enable_public_site IS 'تفعيل الموقع العام';
COMMENT ON COLUMN organization_settings.enable_registration IS 'تفعيل التسجيل';
