-- إصلاح شامل لسياسات RLS في جدول users
-- تاريخ الإنشاء: 2025-06-12
-- الهدف: تبسيط السياسات وحل مشاكل 409/406/401

BEGIN;

-- 1. حذف جميع السياسات الموجودة لإعادة إنشائها بشكل مبسط
DROP POLICY IF EXISTS "users_delete_own_account" ON public.users;
DROP POLICY IF EXISTS "users_read_own_data" ON public.users;
DROP POLICY IF EXISTS "users_registration" ON public.users;
DROP POLICY IF EXISTS "users_service_role_access" ON public.users;
DROP POLICY IF EXISTS "users_simple_read" ON public.users;
DROP POLICY IF EXISTS "users_simple_update" ON public.users;
DROP POLICY IF EXISTS "users_update_own_data" ON public.users;

-- 2. إنشاء سياسات مبسطة وواضحة

-- سياسة القراءة: المستخدمون يمكنهم قراءة بياناتهم الخاصة وبيانات نفس المؤسسة
CREATE POLICY "users_unified_read" ON public.users
    FOR SELECT
    USING (
        -- السماح للمستخدم بقراءة بياناته الخاصة
        auth.uid() = auth_user_id
        OR
        -- السماح لمسؤولي المؤسسة بقراءة بيانات المستخدمين في نفس المؤسسة
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_user_id = auth.uid()
            AND u.is_org_admin = true
            AND u.organization_id = users.organization_id
        )
        OR
        -- السماح للمسؤولين العامين
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_user_id = auth.uid()
            AND u.is_super_admin = true
        )
        OR
        -- السماح لـ service_role
        current_setting('role'::text, true) = 'service_role'::text
    );

-- سياسة الإدراج: إنشاء مستخدمين جدد
CREATE POLICY "users_unified_insert" ON public.users
    FOR INSERT
    WITH CHECK (
        -- السماح للمستخدم بإنشاء حسابه الخاص
        auth.uid() = auth_user_id
        OR
        -- السماح لمسؤولي المؤسسة بإنشاء مستخدمين جدد في مؤسستهم
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_user_id = auth.uid()
            AND u.is_org_admin = true
            AND u.organization_id = organization_id
        )
        OR
        -- السماح للمسؤولين العامين
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_user_id = auth.uid()
            AND u.is_super_admin = true
        )
        OR
        -- السماح لـ service_role
        current_setting('role'::text, true) = 'service_role'::text
    );

-- سياسة التحديث: تحديث البيانات
CREATE POLICY "users_unified_update" ON public.users
    FOR UPDATE
    USING (
        -- السماح للمستخدم بتحديث بياناته الخاصة
        auth.uid() = auth_user_id
        OR
        -- السماح لمسؤولي المؤسسة بتحديث بيانات المستخدمين في نفس المؤسسة
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_user_id = auth.uid()
            AND u.is_org_admin = true
            AND u.organization_id = users.organization_id
        )
        OR
        -- السماح للمسؤولين العامين
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_user_id = auth.uid()
            AND u.is_super_admin = true
        )
        OR
        -- السماح لـ service_role
        current_setting('role'::text, true) = 'service_role'::text
    )
    WITH CHECK (
        -- نفس شروط USING
        auth.uid() = auth_user_id
        OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_user_id = auth.uid()
            AND u.is_org_admin = true
            AND u.organization_id = users.organization_id
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_user_id = auth.uid()
            AND u.is_super_admin = true
        )
        OR
        current_setting('role'::text, true) = 'service_role'::text
    );

-- سياسة الحذف: حذف المستخدمين
CREATE POLICY "users_unified_delete" ON public.users
    FOR DELETE
    USING (
        -- السماح للمستخدم بحذف حسابه الخاص (إلغاء تفعيل)
        auth.uid() = auth_user_id
        OR
        -- السماح لمسؤولي المؤسسة بحذف المستخدمين في نفس المؤسسة
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_user_id = auth.uid()
            AND u.is_org_admin = true
            AND u.organization_id = users.organization_id
        )
        OR
        -- السماح للمسؤولين العامين
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.auth_user_id = auth.uid()
            AND u.is_super_admin = true
        )
        OR
        -- السماح لـ service_role
        current_setting('role'::text, true) = 'service_role'::text
    );

-- 3. إنشاء دالة محسنة للحصول على بيانات المستخدم الحالي
CREATE OR REPLACE FUNCTION get_current_user_safe()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    organization_id UUID,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user_id UUID;
BEGIN
    -- الحصول على معرف المستخدم من المصادقة
    auth_user_id := auth.uid();
    
    -- إذا لم يكن هناك مستخدم مصادق
    IF auth_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- إرجاع بيانات المستخدم مباشرة (تجاوز RLS)
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.organization_id,
        COALESCE(u.is_org_admin, false),
        COALESCE(u.is_super_admin, false),
        COALESCE(u.is_active, true)
    FROM public.users u
    WHERE u.auth_user_id = get_current_user_safe.auth_user_id
    LIMIT 1;
END;
$$;

-- 4. إنشاء دالة لإصلاح auth_user_id المفقودة
CREATE OR REPLACE FUNCTION fix_missing_auth_user_ids()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    fixed_count INTEGER := 0;
BEGIN
    -- إصلاح المستخدمين الذين auth_user_id = null
    UPDATE public.users 
    SET auth_user_id = id,
        updated_at = NOW()
    WHERE auth_user_id IS NULL 
      AND id IS NOT NULL;
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    RETURN fixed_count;
END;
$$;

-- 5. تشغيل الإصلاح
SELECT fix_missing_auth_user_ids() as users_fixed;

-- 6. إنشاء فهارس محسنة للأداء
CREATE INDEX IF NOT EXISTS idx_users_auth_active_org 
ON public.users (auth_user_id, is_active, organization_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_users_org_admin_lookup 
ON public.users (organization_id, is_org_admin) 
WHERE is_org_admin = true;

-- 7. تحسين الإحصائيات
ANALYZE public.users;

COMMIT;

-- تقرير النتائج
SELECT 
    'إصلاح سياسات RLS مكتمل' as status,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE auth_user_id IS NOT NULL) as users_with_auth_id,
    COUNT(*) FILTER (WHERE is_active = true) as active_users
FROM public.users; 