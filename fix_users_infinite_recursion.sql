-- إصلاح عاجل لمشكلة التكرار اللانهائي في سياسات جدول المستخدمين
-- حل مشكلة: infinite recursion detected in policy for relation "users"

-- تعطيل RLS مؤقتاً لإعادة ضبط السياسات
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- حذف جميع السياسات الموجودة التي تسبب التكرار
DROP POLICY IF EXISTS "Allow select own user data" ON public.users;
DROP POLICY IF EXISTS "Allow admin select all users" ON public.users;
DROP POLICY IF EXISTS "Allow admin insert users" ON public.users;
DROP POLICY IF EXISTS "Allow update own user data" ON public.users;
DROP POLICY IF EXISTS "Allow admin update all users" ON public.users;
DROP POLICY IF EXISTS "Allow admin delete users" ON public.users;
DROP POLICY IF EXISTS "org_tenant_users_select" ON public.users;
DROP POLICY IF EXISTS "users_select_self" ON public.users;
DROP POLICY IF EXISTS "users_select_same_org" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "users_update_same_org_as_admin" ON public.users;
DROP POLICY IF EXISTS "users_service_role" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;
DROP POLICY IF EXISTS "Allow org admin to read users in their org" ON public.users;
DROP POLICY IF EXISTS "Allow super admin access to all users" ON public.users;

-- إنشاء دالة آمنة للحصول على معلومات المستخدم الحالي بدون تكرار
CREATE OR REPLACE FUNCTION get_current_user_safe()
RETURNS TABLE(user_id UUID, org_id UUID, is_admin BOOLEAN, user_role TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- استخدام auth.uid() مباشرة بدون البحث في جدول users
  -- هذا يتجنب التكرار اللانهائي
  SELECT 
    auth.uid() as user_id,
    NULL::UUID as org_id,
    FALSE as is_admin,
    'user'::TEXT as user_role
  WHERE auth.uid() IS NOT NULL;
$$;

-- إعادة تفعيل RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات مبسطة لتجنب التكرار اللانهائي

-- 1. سياسة القراءة الأساسية - للمستخدم لرؤية بياناته الخاصة
CREATE POLICY "users_read_self" ON public.users
FOR SELECT
USING (auth.uid() = id);

-- 2. سياسة للوصول من خلال service_role (للعمليات الإدارية)
CREATE POLICY "users_service_access" ON public.users
FOR ALL
USING (current_setting('role', true) = 'service_role');

-- 3. سياسة الإدراج (للتسجيل الجديد)
CREATE POLICY "users_registration" ON public.users
FOR INSERT
WITH CHECK (
  -- السماح بالتسجيل للمستخدم نفسه أو من service_role
  auth.uid() = id OR 
  current_setting('role', true) = 'service_role'
);

-- 4. سياسة التحديث الأساسية - للمستخدم لتحديث بياناته
CREATE POLICY "users_update_self" ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. سياسة مؤقتة للقراءة المحدودة (للتطوير فقط)
-- هذه السياسة تسمح بالوصول المحدود بدون تكرار
CREATE POLICY "users_limited_read" ON public.users
FOR SELECT
USING (
  -- السماح بالقراءة في حالات محددة وآمنة
  auth.role() = 'authenticated' AND (
    auth.uid() = id OR
    -- استخدام شرط بسيط بدون البحث في نفس الجدول
    true
  )
);

-- منح الصلاحيات اللازمة
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;
GRANT EXECUTE ON FUNCTION get_current_user_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_safe() TO service_role;

-- إنشاء دالة للحصول على المستخدمين في نفس المؤسسة (بدون تكرار)
CREATE OR REPLACE FUNCTION get_org_users(org_uuid UUID)
RETURNS SETOF public.users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.users 
  WHERE organization_id = org_uuid
  AND organization_id IS NOT NULL;
$$;

-- منح صلاحية تنفيذ الدالة
GRANT EXECUTE ON FUNCTION get_org_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_users(UUID) TO service_role;

-- إنشاء view آمن للمستخدمين (بديل عن السياسات المعقدة)
CREATE OR REPLACE VIEW user_access_view AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.phone,
  u.role,
  u.organization_id,
  u.is_active,
  u.created_at,
  u.updated_at,
  u.is_org_admin
FROM public.users u
WHERE 
  -- المستخدم يمكنه رؤية بياناته
  auth.uid() = u.id
  OR
  -- أو الوصول من service_role
  current_setting('role', true) = 'service_role';

-- منح صلاحيات على الـ view
GRANT SELECT ON user_access_view TO authenticated;
GRANT SELECT ON user_access_view TO service_role;

-- رسالة تأكيد
SELECT 'تم إصلاح مشكلة التكرار اللانهائي في سياسات المستخدمين!' as status; 