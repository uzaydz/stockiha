-- إصلاح سياسات أمان مستوى الصف (RLS) لجدول المستخدمين
-- لمعالجة خطأ 406 (Not Acceptable) عند محاولة الوصول لجدول المستخدمين
-- ولتجنب التكرار اللانهائي (infinite recursion)

-- 1. تمكين RLS على جدول المستخدمين إذا لم يكن ممكنًا بالفعل
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. إلغاء جميع سياسات RLS الحالية على جدول المستخدمين
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS users_delete ON users;

-- 3. إنشاء سياسات جديدة مبسطة لتجنب التكرار اللانهائي

-- سياسة القراءة: تبسيط القواعد لتفادي التكرار اللانهائي
CREATE POLICY users_select
  ON users
  FOR SELECT
  USING (
    -- يمكن للمستخدم قراءة بياناته الخاصة
    auth.uid() = id
    OR
    -- أي مستخدم يمكنه رؤية المستخدمين في نفس المؤسسة
    (auth.uid() IN (SELECT id FROM users WHERE organization_id IS NOT NULL) 
     AND organization_id IS NOT NULL 
     AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()))
    OR
    -- السماح للوصول عبر service_role
    (current_setting('role', true)::text = 'service_role')
  );

-- سياسة الإدراج: السماح بإنشاء سجلات المستخدمين 
CREATE POLICY users_insert
  ON users
  FOR INSERT
  WITH CHECK (true);  -- السماح بإدراج المستخدمين من خلال عملية التسجيل

-- سياسة التحديث: السماح للمستخدمين بتحديث بياناتهم الخاصة وللمسؤولين بتحديث المستخدمين في مؤسستهم
CREATE POLICY users_update
  ON users
  FOR UPDATE
  USING (
    -- يمكن للمستخدم تحديث بياناته الخاصة
    auth.uid() = id
    OR
    -- المسؤول يمكنه تحديث المستخدمين في نفس المؤسسة
    (
      auth.uid() IN (
        SELECT id FROM users 
        WHERE is_org_admin = true 
        OR role = 'admin'
      )
      AND
      organization_id = (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
      )
    )
    OR
    -- السماح للوصول عبر service_role
    (current_setting('role', true)::text = 'service_role')
  );

-- سياسة الحذف: مبسطة لتجنب التكرار
CREATE POLICY users_delete
  ON users
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE is_org_admin = true 
      OR role = 'admin'
    )
    AND
    organization_id = (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

-- 4. تأكد من أن جدول المستخدمين مرئي للأدوار المناسبة
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO service_role;

-- 5. إضافة سياسة خاصة للوصول إلى الخدمة (service role)
-- هذه تضمن أن الوصول البرمجي ممكن دائمًا
CREATE POLICY users_service_role
  ON users
  FOR ALL
  USING (current_setting('role', true)::text = 'service_role'); 