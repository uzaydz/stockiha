-- إصلاح سياسات أمان مستوى الصفوف للمستخدمين

-- إلغاء السياسات الموجودة أولاً
DROP POLICY IF EXISTS "Allow select own user data" ON users;
DROP POLICY IF EXISTS "Allow admin select all users" ON users;
DROP POLICY IF EXISTS "Allow admin insert users" ON users;
DROP POLICY IF EXISTS "Allow update own user data" ON users;
DROP POLICY IF EXISTS "Allow admin update all users" ON users;
DROP POLICY IF EXISTS "Allow admin delete users" ON users;
DROP POLICY IF EXISTS "org_tenant_users_select" ON users;

-- إعادة إنشاء السياسات بشكل صحيح
-- سياسة للسماح للمستخدمين بعرض بياناتهم الخاصة
CREATE POLICY "users_select_self" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- سياسة للسماح بعرض مستخدمي نفس المؤسسة
CREATE POLICY "users_select_same_org" ON users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

-- سياسة للسماح بإدراج مستخدمين جدد (للتسجيل)
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT
  WITH CHECK (true);

-- سياسة لتحديث بيانات المستخدم نفسه
CREATE POLICY "users_update_self" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- سياسة للسماح لمسؤولي المؤسسة بتحديث مستخدمي نفس المؤسسة
CREATE POLICY "users_update_same_org_as_admin" ON users
  FOR UPDATE
  USING (
    (auth.uid() IN (
      SELECT id 
      FROM users 
      WHERE organization_id = users.organization_id 
      AND (is_org_admin = true OR role = 'admin')
    )) AND 
    (organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    ))
  );

-- إضافة سياسة خاصة للسماح بالوصول من خلال معرف المستخدم
CREATE POLICY "allow_select_by_id" ON users
  FOR SELECT
  USING (true);

-- تفعيل RLS لجدول المستخدمين
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- منح صلاحيات للمستخدمين المصادق عليهم
GRANT SELECT, UPDATE, INSERT ON users TO authenticated;
GRANT SELECT, UPDATE, INSERT ON users TO service_role;

-- إضافة permissions للفهرس الإضافي
ALTER TABLE users ALTER COLUMN email DROP NOT NULL; 