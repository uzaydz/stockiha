-- التأكد من وجود جدول تسجيل التدقيق للإعدادات
CREATE TABLE IF NOT EXISTS settings_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  setting_type TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إضافة مؤشر للتحسين
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_organization_id ON settings_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_user_id ON settings_audit_log(user_id);

-- تمكين أمان مستوى الصف
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;

-- إلغاء أي سياسات موجودة
DROP POLICY IF EXISTS "Allow admins to select audit logs" ON settings_audit_log;
DROP POLICY IF EXISTS "Allow admins to insert audit logs" ON settings_audit_log;

-- إنشاء سياسة للقراءة
CREATE POLICY "settings_audit_log_select" ON settings_audit_log
  FOR SELECT
  USING (
    (auth.uid() IN (
      SELECT id FROM users 
      WHERE organization_id = settings_audit_log.organization_id 
      AND (is_org_admin = true OR role = 'admin')
    ))
    OR
    (SELECT current_setting('role', TRUE) = 'service_role')
  );

-- إنشاء سياسة للإدراج تسمح للمستخدمين المصادق عليهم والخدمة
CREATE POLICY "settings_audit_log_insert" ON settings_audit_log
  FOR INSERT
  WITH CHECK (
    TRUE
  );

-- تعطيل RLS مؤقتًا لجدول settings_audit_log
ALTER TABLE settings_audit_log DISABLE ROW LEVEL SECURITY;

-- منح صلاحيات الجدول
GRANT SELECT, INSERT ON settings_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON settings_audit_log TO service_role; 