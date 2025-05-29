-- إصلاح مشكلة 406 Not Acceptable لجدول organizations
-- هذا الإصلاح يحل مشكلة الوصول إلى جدول organizations من النطاقات المخصصة

-- 1. تأكد من تفعيل RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. حذف جميع السياسات الموجودة لتجنب التضارب
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON public.organizations;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.organizations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.organizations;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "public_read_organizations" ON public.organizations;
DROP POLICY IF EXISTS "authenticated_all_organizations" ON public.organizations;
DROP POLICY IF EXISTS "public_read_organizations_policy" ON public.organizations;
DROP POLICY IF EXISTS "authenticated_write_organizations_policy" ON public.organizations;

-- 3. إنشاء سياسة قراءة شاملة للسماح بالبحث عن المؤسسات بالنطاق
-- هذه السياسة تسمح لأي شخص بقراءة بيانات المؤسسات (ضرورية للبحث بالنطاق)
CREATE POLICY "allow_public_read_organizations"
ON public.organizations
FOR SELECT
USING (true);

-- 4. سياسة للمصادق عليهم للعمليات الأخرى
CREATE POLICY "authenticated_users_full_access"
ON public.organizations
FOR ALL
USING (
  CASE 
    WHEN auth.role() = 'authenticated' THEN true
    WHEN auth.role() = 'anon' AND current_setting('request.method', true) = 'GET' THEN true
    ELSE false
  END
)
WITH CHECK (auth.role() = 'authenticated');

-- 5. التأكد من منح صلاحيات SELECT للجميع
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

-- 6. التحقق من الإصلاح
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'organizations'
AND schemaname = 'public'
ORDER BY policyname;

-- 7. التحقق من حالة RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'organizations'
AND schemaname = 'public';

-- 8. رسالة تأكيد
SELECT 'تم إصلاح مشكلة 406 لجدول organizations - يجب أن يعمل البحث بالنطاق الآن!' as result;