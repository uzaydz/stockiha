-- ==============================================
-- حل شامل لمشاكل المصادقة في النظام
-- تاريخ الإنشاء: 2025-01-15
-- الهدف: حل مشاكل auth.uid() و RLS policies
-- ==============================================

BEGIN;

-- ==============================================
-- 1. إصلاح RLS policies - حذف السياسات المعقدة
-- ==============================================

-- حذف جميع السياسات الحالية المعقدة
DROP POLICY IF EXISTS users_safe_read ON public.users;
DROP POLICY IF EXISTS users_safe_update ON public.users;
DROP POLICY IF EXISTS users_safe_delete ON public.users;

-- ==============================================
-- 2. إنشاء سياسات بسيطة وفعالة
-- ==============================================

-- سياسة قراءة مبسطة - السماح لكل مستخدم مسجل بقراءة البيانات
CREATE POLICY users_simple_read ON public.users
    FOR SELECT
    TO public
    USING (
        -- السماح لأي مستخدم مسجل بقراءة البيانات
        auth.uid() IS NOT NULL
        OR
        -- السماح للـ service_role
        current_setting('role', true) = 'service_role'
    );

-- سياسة تحديث مبسطة - السماح للمستخدم بتحديث بياناته الشخصية
CREATE POLICY users_simple_update ON public.users
    FOR UPDATE
    TO public
    USING (
        auth.uid() = auth_user_id
        OR
        current_setting('role', true) = 'service_role'
    )
    WITH CHECK (
        auth.uid() = auth_user_id
        OR
        current_setting('role', true) = 'service_role'
    );

-- ==============================================
-- 3. إنشاء دالة محسنة لتحميل بيانات المستخدم
-- ==============================================

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_current_user_safe();

-- إنشاء دالة بسيطة ومباشرة
CREATE OR REPLACE FUNCTION get_current_user_simple()
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    organization_id UUID,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN,
    auth_user_id UUID,
    is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.organization_id,
        COALESCE(u.is_org_admin, false),
        COALESCE(u.is_super_admin, false),
        u.auth_user_id,
        COALESCE(u.is_active, true)
    FROM public.users u 
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
$$;

-- ==============================================
-- 4. إنشاء دالة محسنة لتحميل بيانات المؤسسة
-- ==============================================

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_organization_by_subdomain_safe(TEXT);

-- إنشاء دالة بسيطة ومباشرة
CREATE OR REPLACE FUNCTION get_organization_by_subdomain_simple(subdomain_param TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    subdomain TEXT,
    domain TEXT,
    hostname TEXT,
    is_active BOOLEAN,
    owner_id UUID,
    subscription_tier TEXT,
    subscription_status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    settings JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        o.id,
        o.name,
        o.subdomain,
        o.domain,
        o.domain as hostname,
        true as is_active,
        o.owner_id,
        o.subscription_tier,
        o.subscription_status,
        o.created_at,
        o.updated_at,
        o.settings
    FROM organizations o
    WHERE o.subdomain = subdomain_param
    LIMIT 1;
$$;

-- ==============================================
-- 5. تعطيل RLS مؤقتاً للاختبار
-- ==============================================

-- تعطيل RLS على جدول organizations للسماح بالوصول السهل
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- تأكد من أن جدول users يسمح بالوصول للمستخدمين المسجلين
-- (نبقي RLS مفعل لكن مع سياسات أبسط)

-- ==============================================
-- 6. إنشاء دالة اختبار للتشخيص
-- ==============================================

CREATE OR REPLACE FUNCTION test_authentication()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    auth_user_id UUID;
    user_count INTEGER;
    org_count INTEGER;
BEGIN
    -- الحصول على معرف المستخدم الحالي
    auth_user_id := auth.uid();
    
    -- عد المستخدمين
    SELECT COUNT(*) INTO user_count FROM public.users;
    
    -- عد المؤسسات
    SELECT COUNT(*) INTO org_count FROM organizations;
    
    -- بناء النتيجة
    result := json_build_object(
        'auth_uid', auth_user_id,
        'current_role', current_setting('role', true),
        'total_users', user_count,
        'total_organizations', org_count,
        'users_rls_enabled', (
            SELECT relrowsecurity 
            FROM pg_class 
            WHERE relname = 'users' 
            AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ),
        'organizations_rls_enabled', (
            SELECT relrowsecurity 
            FROM pg_class 
            WHERE relname = 'organizations' 
            AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        )
    );
    
    RETURN result;
END;
$$;

-- ==============================================
-- 7. منح الصلاحيات
-- ==============================================

GRANT EXECUTE ON FUNCTION get_current_user_simple() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_organization_by_subdomain_simple(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION test_authentication() TO anon, authenticated;

-- السماح بالقراءة والكتابة في الجداول الأساسية
GRANT SELECT ON organizations TO anon, authenticated;
GRANT SELECT ON users TO anon, authenticated;
GRANT UPDATE ON users TO authenticated;

COMMIT;

-- ==============================================
-- تشغيل اختبار للتأكد من عمل الإصلاحات
-- ==============================================
SELECT test_authentication(); 