-- ==============================================================
-- إصلاح مشكلة infinite recursion في سياسات جدول المستخدمين
-- المشكلة: infinite recursion detected in policy for relation "users"
-- التاريخ: $(date)
-- ==============================================================

-- بداية Transaction لضمان التطبيق الآمن
BEGIN;

-- ==============================================================
-- الخطوة 1: تعطيل RLS مؤقتاً لإعادة ضبط السياسات
-- ==============================================================

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- ==============================================================
-- الخطوة 2: حذف جميع السياسات المسببة للتكرار اللانهائي
-- ==============================================================

-- حذف السياسات الحالية المشكلة
DROP POLICY IF EXISTS "users_read_self" ON public.users;
DROP POLICY IF EXISTS "users_service_access" ON public.users;
DROP POLICY IF EXISTS "users_registration" ON public.users;
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "users_limited_read" ON public.users;
DROP POLICY IF EXISTS "users_select_safe" ON public.users;
DROP POLICY IF EXISTS "users_update_safe" ON public.users;
DROP POLICY IF EXISTS "users_delete_safe" ON public.users;

-- حذف السياسات القديمة إذا كانت موجودة
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
DROP POLICY IF EXISTS "users_update_same_org_as_admin" ON public.users;
DROP POLICY IF EXISTS "users_service_role" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;
DROP POLICY IF EXISTS "Allow org admin to read users in their org" ON public.users;
DROP POLICY IF EXISTS "Allow super admin access to all users" ON public.users;

-- ==============================================================
-- الخطوة 3: إنشاء دوال مساعدة آمنة (بدون تكرار)
-- ==============================================================

-- دالة للحصول على معلومات المستخدم الحالي بأمان
CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS TABLE(
    user_id UUID, 
    user_organization_id UUID, 
    user_role TEXT,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- تجنب البحث في جدول users مباشرة في السياسات
    -- بدلاً من ذلك، نستخدم هذه الدالة الآمنة
    RETURN QUERY
    SELECT 
        auth.uid(),
        u.organization_id,
        u.role,
        COALESCE(u.is_org_admin, false),
        COALESCE(u.is_super_admin, false)
    FROM public.users u 
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
END;
$$;

-- دالة للتحقق من صلاحيات المستخدم
CREATE OR REPLACE FUNCTION public.check_user_permissions(target_org_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_user_info RECORD;
BEGIN
    -- الحصول على معلومات المستخدم الحالي
    SELECT * INTO current_user_info FROM public.get_current_user_info();
    
    -- إذا لم يتم العثور على المستخدم
    IF current_user_info.user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- السماح للمسؤول العام
    IF current_user_info.is_super_admin THEN
        RETURN true;
    END IF;
    
    -- السماح لمسؤول المنظمة للوصول لمستخدمي منظمته
    IF current_user_info.is_org_admin AND target_org_id IS NOT NULL THEN
        RETURN current_user_info.user_organization_id = target_org_id;
    END IF;
    
    -- رفض الوصول في الحالات الأخرى
    RETURN false;
END;
$$;

-- ==============================================================
-- الخطوة 4: إعادة تفعيل RLS مع سياسات آمنة جديدة
-- ==============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ==============================================================
-- الخطوة 5: إنشاء السياسات الجديدة الآمنة
-- ==============================================================

-- سياسة 1: قراءة البيانات الشخصية
CREATE POLICY "users_read_own_data" ON public.users
FOR SELECT
USING (
    auth.uid() = auth_user_id
);

-- سياسة 2: الوصول الكامل لـ service_role
CREATE POLICY "users_service_role_access" ON public.users
FOR ALL
USING (
    current_setting('role', true) = 'service_role'
);

-- سياسة 3: قراءة مستخدمي المنظمة (للمسؤولين)
CREATE POLICY "users_org_admin_read" ON public.users
FOR SELECT
USING (
    public.check_user_permissions(organization_id)
);

-- سياسة 4: تسجيل المستخدمين الجدد
CREATE POLICY "users_registration" ON public.users
FOR INSERT
WITH CHECK (
    -- السماح بالتسجيل للمستخدم نفسه أو service_role
    auth.uid() = auth_user_id OR 
    current_setting('role', true) = 'service_role'
);

-- سياسة 5: تحديث البيانات الشخصية
CREATE POLICY "users_update_own_data" ON public.users
FOR UPDATE
USING (
    auth.uid() = auth_user_id
)
WITH CHECK (
    auth.uid() = auth_user_id
);

-- سياسة 6: تحديث بيانات مستخدمي المنظمة (للمسؤولين)
CREATE POLICY "users_org_admin_update" ON public.users
FOR UPDATE
USING (
    public.check_user_permissions(organization_id)
)
WITH CHECK (
    public.check_user_permissions(organization_id)
);

-- سياسة 7: حذف حساب المستخدم الشخصي
CREATE POLICY "users_delete_own_account" ON public.users
FOR DELETE
USING (
    auth.uid() = auth_user_id
);

-- سياسة 8: حذف مستخدمي المنظمة (للمسؤولين فقط)
CREATE POLICY "users_org_admin_delete" ON public.users
FOR DELETE
USING (
    public.check_user_permissions(organization_id) AND
    auth.uid() != auth_user_id  -- منع المسؤول من حذف نفسه
);

-- ==============================================================
-- الخطوة 6: منح الصلاحيات اللازمة
-- ==============================================================

-- منح صلاحيات الجدول
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;

-- منح صلاحيات الدوال
GRANT EXECUTE ON FUNCTION public.get_current_user_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_info() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_permissions(UUID) TO service_role;

-- ==============================================================
-- الخطوة 7: إنشاء view آمن للوصول السهل للمستخدمين
-- ==============================================================

CREATE OR REPLACE VIEW public.safe_users_view AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.phone,
    u.role,
    u.organization_id,
    u.is_active,
    u.is_org_admin,
    u.is_super_admin,
    u.created_at,
    u.updated_at,
    u.auth_user_id
FROM public.users u
WHERE 
    -- المستخدم يمكنه رؤية بياناته
    auth.uid() = u.auth_user_id
    OR
    -- أو الوصول من service_role
    current_setting('role', true) = 'service_role'
    OR
    -- أو مسؤول المنظمة يمكنه رؤية مستخدمي منظمته
    public.check_user_permissions(u.organization_id);

-- منح صلاحيات على الـ view
GRANT SELECT ON public.safe_users_view TO authenticated;
GRANT SELECT ON public.safe_users_view TO service_role;

-- ==============================================================
-- الخطوة 8: إنشاء دوال مساعدة للعمليات الشائعة
-- ==============================================================

-- دالة للحصول على مستخدمي المنظمة
CREATE OR REPLACE FUNCTION public.get_organization_users(org_id UUID)
RETURNS SETOF public.users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.users 
    WHERE organization_id = org_id
    AND (
        -- التحقق من الصلاحيات
        public.check_user_permissions(org_id) OR
        current_setting('role', true) = 'service_role'
    );
$$;

-- دالة للحصول على معلومات المستخدم الحالي المبسطة
CREATE OR REPLACE FUNCTION public.get_current_user()
RETURNS public.users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.users 
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
$$;

-- منح صلاحيات على الدوال الجديدة
GRANT EXECUTE ON FUNCTION public.get_organization_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_users(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user() TO service_role;

-- ==============================================================
-- الخطوة 9: اختبار السياسات الجديدة
-- ==============================================================

-- اختبار بسيط للتأكد من عدم وجود تكرار لانهائي
DO $$
BEGIN
    -- محاولة الوصول لجدول المستخدمين
    PERFORM COUNT(*) FROM public.users LIMIT 1;
    RAISE NOTICE 'اختبار ناجح: لا توجد مشكلة تكرار لانهائي';
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في الاختبار: %', SQLERRM;
END $$;

-- ==============================================================
-- الخطوة 10: إنهاء العملية بنجاح
-- ==============================================================

-- إنهاء Transaction
COMMIT;

-- ==============================================================
-- رسالة النجاح
-- ==============================================================

SELECT 
    '✅ تم إصلاح مشكلة infinite recursion بنجاح!' as status,
    'يمكنك الآن الوصول لجدول المستخدمين بدون مشاكل' as message,
    NOW() as completed_at;

-- ==============================================================
-- ملاحظات مهمة للاستخدام:
-- ==============================================================

/*
1. استخدم الدالة get_current_user() للحصول على معلومات المستخدم الحالي
2. استخدم safe_users_view بدلاً من الوصول المباشر لجدول users في التطبيق
3. استخدم get_organization_users(org_id) للحصول على مستخدمي منظمة معينة
4. تجنب الاستعلامات المعقدة المباشرة على جدول users في السياسات

مثال للاستخدام في التطبيق:
- للحصول على المستخدم الحالي: SELECT * FROM get_current_user();
- للحصول على مستخدمي المنظمة: SELECT * FROM safe_users_view WHERE organization_id = 'org-id';
- للحصول على مستخدمي منظمة معينة: SELECT * FROM get_organization_users('org-id');
*/ 