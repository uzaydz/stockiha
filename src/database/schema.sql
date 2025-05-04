-- التأكد من وجود امتداد UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- جدول لإعدادات المستخدم
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_mode VARCHAR(10) NOT NULL DEFAULT 'system', -- light, dark, or system
  language VARCHAR(10) NOT NULL DEFAULT 'ar',
  timezone VARCHAR(50) DEFAULT 'Africa/Algiers',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(20) DEFAULT 'HH:mm',
  notification_email BOOLEAN DEFAULT TRUE,
  notification_push BOOLEAN DEFAULT TRUE,
  notification_browser BOOLEAN DEFAULT TRUE,
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- جدول لإعدادات المؤسسة
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  theme_primary_color VARCHAR(20) NOT NULL DEFAULT '#0099ff',
  theme_secondary_color VARCHAR(20) NOT NULL DEFAULT '#6c757d',
  theme_mode VARCHAR(10) DEFAULT 'light', -- (light, dark, auto)
  site_name VARCHAR(100),
  custom_css TEXT DEFAULT NULL,
  logo_url TEXT DEFAULT NULL,
  favicon_url TEXT DEFAULT NULL,
  default_language VARCHAR(10) NOT NULL DEFAULT 'ar',
  custom_js TEXT,
  custom_header TEXT,
  custom_footer TEXT,
  enable_registration BOOLEAN DEFAULT TRUE,
  enable_public_site BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_org_settings UNIQUE (organization_id)
);

-- جدول لسجل تغييرات الإعدادات
CREATE TABLE IF NOT EXISTS settings_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  setting_type VARCHAR(20) NOT NULL, -- 'user' or 'organization'
  setting_key VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول لتخزين القوالب المخصصة
CREATE TABLE IF NOT EXISTS organization_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL, -- (invoice, receipt, email)
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- وظيفة لتحديث وقت التعديل تلقائيًا
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة محفزات لتحديث وقت التعديل
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_settings_updated_at
BEFORE UPDATE ON organization_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_templates_updated_at
BEFORE UPDATE ON organization_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- وظيفة لتسجيل تغييرات الإعدادات
CREATE OR REPLACE FUNCTION log_settings_change()
RETURNS TRIGGER AS $$
DECLARE
  old_val TEXT;
  new_val TEXT;
  col_name TEXT;
  setting_type TEXT;
  org_id UUID;
  change_user_id UUID;
BEGIN
  -- تحديد نوع الإعداد
  IF TG_TABLE_NAME = 'user_settings' THEN
    setting_type := 'user';
    org_id := NULL;
  ELSE
    setting_type := 'organization';
    org_id := NEW.organization_id;
  END IF;
  
  -- محاولة الحصول على معرف المستخدم الحالي
  BEGIN
    change_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;
  EXCEPTION
    WHEN OTHERS THEN
      -- إذا لم يكن متاحًا، استخدم معرف المستخدم من السجل
      change_user_id := COALESCE(NEW.user_id, OLD.user_id);
  END;
  
  -- مراجعة كل عمود في الجدول للعثور على التغييرات
  FOR col_name IN SELECT column_name 
                   FROM information_schema.columns 
                   WHERE table_name = TG_TABLE_NAME 
                   AND column_name NOT IN ('id', 'created_at', 'updated_at') 
  LOOP
    -- الحصول على القيم القديمة والجديدة للعمود
    EXECUTE format('SELECT $1.%I::TEXT, $2.%I::TEXT', col_name, col_name)
    INTO old_val, new_val
    USING OLD, NEW;
    
    -- إذا كان هناك تغيير، قم بتسجيله
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO settings_audit_log (
        user_id, 
        organization_id, 
        setting_type, 
        setting_key, 
        old_value, 
        new_value
      ) VALUES (
        change_user_id,
        org_id,
        setting_type,
        col_name,
        old_val,
        new_val
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة محفزات لتسجيل التغييرات
CREATE TRIGGER log_user_settings_changes
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change();

CREATE TRIGGER log_organization_settings_changes
BEFORE UPDATE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change();

-- تمكين سياسات أمان الصفوف
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_templates ENABLE ROW LEVEL SECURITY;

-- سياسات جدول إعدادات المستخدم
CREATE POLICY "المستخدمون يمكنهم قراءة إعداداتهم فقط"
  ON user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم إنشاء إعداداتهم"
  ON user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "المستخدمون يمكنهم تحديث إعداداتهم فقط"
  ON user_settings
  FOR UPDATE
  USING (auth.uid() = user_id);
  
-- سياسات جدول إعدادات المؤسسة
CREATE POLICY "المستخدمون يمكنهم قراءة إعدادات مؤسستهم"
  ON organization_settings
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.organization_id = organization_settings.organization_id 
    AND users.id = auth.uid()
  ));

CREATE POLICY "المسؤولون يمكنهم إنشاء إعدادات المؤسسة"
  ON organization_settings
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.organization_id = organization_settings.organization_id 
    AND users.id = auth.uid()
    AND users.is_org_admin = true
  ));
  
CREATE POLICY "المسؤولون يمكنهم تحديث إعدادات المؤسسة"
  ON organization_settings
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.organization_id = organization_settings.organization_id 
    AND users.id = auth.uid()
    AND users.is_org_admin = true
  ));
  
-- سياسات جدول سجل تغييرات الإعدادات
CREATE POLICY "المسؤولون والمستخدمون يمكنهم قراءة سجل تغييرات الإعدادات"
  ON settings_audit_log
  FOR SELECT
  USING (
    (organization_id IS NULL AND auth.uid() = user_id) OR
    (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.organization_id = settings_audit_log.organization_id 
      AND users.id = auth.uid()
      AND (users.is_org_admin = true OR settings_audit_log.user_id = auth.uid())
    ))
  );

-- سياسات جدول قوالب المؤسسة
CREATE POLICY "المستخدمون يمكنهم قراءة قوالب مؤسستهم"
  ON organization_templates
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.organization_id = organization_templates.organization_id 
    AND users.id = auth.uid()
  ));

CREATE POLICY "المسؤولون يمكنهم إدارة قوالب المؤسسة"
  ON organization_templates
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.organization_id = organization_templates.organization_id 
    AND users.id = auth.uid()
    AND users.is_org_admin = true
  ));

-- وظيفة للحصول على إعدادات الموقع الافتراضية
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