-- إنشاء جدول إعدادات توزيع الطلبيات
CREATE TABLE IF NOT EXISTS order_distribution_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  active_plan_id TEXT NOT NULL,
  active_plan_type TEXT NOT NULL CHECK (active_plan_type IN (
    'round_robin', 'smart', 'availability', 'performance', 
    'location', 'fastest_response', 'rotation', 'priority', 'expert'
  )),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_order_distribution_org ON order_distribution_settings(organization_id);

-- إضافة trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_order_distribution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_distribution_updated_at
BEFORE UPDATE ON order_distribution_settings
FOR EACH ROW
EXECUTE FUNCTION update_order_distribution_updated_at();

-- إضافة RLS
ALTER TABLE order_distribution_settings ENABLE ROW LEVEL SECURITY;

-- سياسة للمستخدمين المسجلين للقراءة
CREATE POLICY "Users can view their organization distribution settings" ON order_distribution_settings
FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  )
);

-- سياسة للمدراء فقط للتعديل
CREATE POLICY "Admins can manage distribution settings" ON order_distribution_settings
FOR ALL TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE auth_user_id = auth.uid() 
    AND (role = 'admin' OR is_org_admin = true)
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE auth_user_id = auth.uid() 
    AND (role = 'admin' OR is_org_admin = true)
  )
);

-- إضافة تعليق على الجدول
COMMENT ON TABLE order_distribution_settings IS 'إعدادات توزيع الطلبيات على الموظفين';
COMMENT ON COLUMN order_distribution_settings.active_plan_id IS 'معرف الخطة النشطة';
COMMENT ON COLUMN order_distribution_settings.active_plan_type IS 'نوع الخطة النشطة';
COMMENT ON COLUMN order_distribution_settings.settings IS 'إعدادات مخصصة لكل خطة';