-- حل مبسط لمشكلة organization_settings
-- يعتمد على الهيكل الفعلي للقاعدة: users.organization_id و organizations.owner_id

-- حذف السياسات الموجودة
DROP POLICY IF EXISTS "organization_settings_function_access" ON organization_settings;
DROP POLICY IF EXISTS "organization_settings_simple_access" ON organization_settings;
DROP POLICY IF EXISTS "organization_settings_access" ON organization_settings;
DROP POLICY IF EXISTS "organization_settings_full_access" ON organization_settings;

-- تأكد من تفعيل Row Level Security
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة بسيطة تعتمد على الهيكل الفعلي
CREATE POLICY "organization_settings_user_access" ON organization_settings
FOR ALL
TO authenticated
USING (
  -- المستخدم المصادق عليه يمكنه الوصول إذا:
  auth.uid() IS NOT NULL
  AND (
    -- 1. المستخدم عضو في المؤسسة (users.organization_id)
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.organization_id = organization_settings.organization_id
    )
    OR
    -- 2. المستخدم مالك المؤسسة (organizations.owner_id)
    EXISTS (
      SELECT 1 FROM organizations o 
      WHERE o.id = organization_settings.organization_id 
      AND o.owner_id = auth.uid()
    )
    OR
    -- 3. المستخدم سوبر أدمن
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_super_admin = true
    )
  )
)
WITH CHECK (
  -- نفس الشروط للكتابة
  auth.uid() IS NOT NULL
  AND (
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
  )
);

-- إنشاء فهارس محسنة للأداء
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id 
ON organization_settings (organization_id);

CREATE INDEX IF NOT EXISTS idx_users_organization_id 
ON users (organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id 
ON organizations (owner_id) WHERE owner_id IS NOT NULL;

-- تحديث إحصائيات الجداول
ANALYZE organization_settings;
ANALYZE users;
ANALYZE organizations;

-- اختبار السياسة
SELECT 'تم تطبيق السياسة الجديدة بنجاح' as status; 