-- ملف settings_schema.sql

-- إنشاء جدول إعدادات المؤسسة
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  theme_primary_color VARCHAR(20) DEFAULT '#0099ff',
  theme_secondary_color VARCHAR(20) DEFAULT '#6c757d',
  theme_mode VARCHAR(10) DEFAULT 'light', -- (light, dark, auto)
  site_name VARCHAR(100),
  site_logo_url TEXT,
  site_favicon_url TEXT,
  default_language VARCHAR(10) DEFAULT 'ar',
  custom_css TEXT,
  custom_js TEXT,
  custom_header TEXT,
  custom_footer TEXT,
  enable_registration BOOLEAN DEFAULT TRUE,
  enable_public_site BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول إعدادات المستخدم
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme_mode VARCHAR(10) DEFAULT 'system', -- (light, dark, system)
  language VARCHAR(10) DEFAULT 'ar',
  timezone VARCHAR(50) DEFAULT 'Africa/Algiers',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(20) DEFAULT 'HH:mm',
  notification_email BOOLEAN DEFAULT TRUE,
  notification_push BOOLEAN DEFAULT TRUE,
  notification_browser BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول لتتبع تغييرات الإعدادات
CREATE TABLE IF NOT EXISTS settings_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  setting_type VARCHAR(50) NOT NULL, -- (organization, user)
  setting_key VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول لتخزين القوالب المخصصة
CREATE TABLE IF NOT EXISTS organization_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL, -- (invoice, receipt, email)
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء مشغلات لتحديث حقل updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_settings_updated_at
BEFORE UPDATE ON organization_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_templates_updated_at
BEFORE UPDATE ON organization_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- إنشاء وظيفة RPC لإنشاء جداول الإعدادات إذا لم تكن موجودة
CREATE OR REPLACE FUNCTION create_settings_tables_if_not_exists() 
RETURNS void AS $$
BEGIN
  -- الجداول سيتم إنشاؤها من خلال البلوك SQL أعلاه
END;
$$ LANGUAGE plpgsql;

-- إضافة سياسات الوصول والأمان لجداول الإعدادات في Supabase
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_templates ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات للمدراء للاطلاع وتعديل إعدادات المؤسسة
CREATE POLICY "admins can manage organization settings" ON organization_settings
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE organization_id = organization_settings.organization_id
      AND (is_org_admin = true OR role = 'admin')
    )
  );

-- إنشاء سياسات للمستخدمين للاطلاع على إعدادات المؤسسة
CREATE POLICY "users can view organization settings" ON organization_settings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE organization_id = organization_settings.organization_id
    )
  );

-- إنشاء سياسات للمستخدمين لإدارة إعداداتهم الخاصة
CREATE POLICY "users can manage their own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- إنشاء سياسات لتتبع التغييرات في الإعدادات
CREATE POLICY "users can view audit logs of their organization" ON settings_audit_log
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE organization_id = settings_audit_log.organization_id
      AND (is_org_admin = true OR role = 'admin')
    )
  );

-- إنشاء نظام دالات للحصول على إعدادات الموقع الافتراضية
CREATE OR REPLACE FUNCTION get_default_site_settings() 
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'theme_primary_color', '#0099ff',
    'theme_secondary_color', '#6c757d',
    'theme_mode', 'light',
    'site_name', 'بازار كونسول',
    'default_language', 'ar'
  );
END;
$$ LANGUAGE plpgsql; 