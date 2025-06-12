-- ==============================================
-- إصلاح مشكلة circular dependency في RLS policies
-- تاريخ الإنشاء: 2025-01-15
-- الهدف: حل خطأ HTTP 406 الناتج عن dependency دائرية
-- ==============================================

BEGIN;

-- ==============================================
-- 1. إنشاء دالة آمنة للحصول على معلومات المستخدم
-- ==============================================

-- دالة محسّنة تتجنب الـ RLS policies
CREATE OR REPLACE FUNCTION get_current_user_info_safe()
RETURNS TABLE(
    user_id UUID,
    user_organization_id UUID,
    user_role TEXT,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- استخدام الصلاحيات المباشرة لتجنب RLS
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
    
    -- إذا لم يوجد أي نتيجة، إرجاع قيم افتراضية
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            auth.uid(),
            NULL::UUID,
            'user'::TEXT,
            false,
            false;
    END IF;
END;
$$;

-- ==============================================
-- 2. إنشاء دالة محسّنة للتحقق من الصلاحيات
-- ==============================================

CREATE OR REPLACE FUNCTION check_user_permissions_safe(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_info RECORD;
    auth_user_id UUID;
BEGIN
    -- الحصول على معرف المستخدم المصادق عليه
    auth_user_id := auth.uid();
    
    -- إذا لم يكن هناك مستخدم مصادق عليه
    IF auth_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- الحصول على معلومات المستخدم مباشرة من الجدول (بدون RLS)
    SELECT 
        u.organization_id,
        u.role,
        COALESCE(u.is_org_admin, false) as is_org_admin,
        COALESCE(u.is_super_admin, false) as is_super_admin
    INTO current_user_info
    FROM public.users u 
    WHERE u.auth_user_id = auth_user_id
    LIMIT 1;
    
    -- إذا لم يتم العثور على المستخدم
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- السماح للمسؤول العام
    IF current_user_info.is_super_admin THEN
        RETURN true;
    END IF;
    
    -- السماح لمسؤول المنظمة للوصول لمستخدمي منظمته
    IF current_user_info.is_org_admin AND target_org_id IS NOT NULL THEN
        RETURN current_user_info.organization_id = target_org_id;
    END IF;
    
    -- رفض الوصول في الحالات الأخرى
    RETURN false;
END;
$$;

-- ==============================================
-- 3. تحديث RLS policies لاستخدام الدوال الآمنة
-- ==============================================

-- حذف السياسة المشكلة وإعادة إنشاؤها
DROP POLICY IF EXISTS users_org_admin_read ON public.users;

-- إنشاء سياسة محسّنة للقراءة
CREATE POLICY users_org_admin_read ON public.users
    FOR SELECT
    USING (
        -- السماح بقراءة البيانات الشخصية
        auth.uid() = auth_user_id
        OR
        -- السماح للمسؤولين بقراءة بيانات مستخدمي منظمتهم
        check_user_permissions_safe(organization_id)
        OR
        -- السماح لـ service_role
        current_setting('role', true) = 'service_role'
    );

-- تحديث سياسة التحديث
DROP POLICY IF EXISTS users_org_admin_update ON public.users;

CREATE POLICY users_org_admin_update ON public.users
    FOR UPDATE
    USING (
        auth.uid() = auth_user_id
        OR
        check_user_permissions_safe(organization_id)
        OR
        current_setting('role', true) = 'service_role'
    )
    WITH CHECK (
        auth.uid() = auth_user_id
        OR
        check_user_permissions_safe(organization_id)
        OR
        current_setting('role', true) = 'service_role'
    );

-- تحديث سياسة الحذف
DROP POLICY IF EXISTS users_org_admin_delete ON public.users;

CREATE POLICY users_org_admin_delete ON public.users
    FOR DELETE
    USING (
        (check_user_permissions_safe(organization_id) AND auth.uid() <> auth_user_id)
        OR
        current_setting('role', true) = 'service_role'
    );

-- ==============================================
-- 4. إضافة دالة مساعدة للحصول على المستخدم الحالي
-- ==============================================

CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    organization_id UUID,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN,
    auth_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    auth_user_id UUID;
BEGIN
    -- الحصول على معرف المستخدم المصادق عليه
    auth_user_id := auth.uid();
    
    -- إذا لم يكن هناك مستخدم مصادق عليه
    IF auth_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- إرجاع بيانات المستخدم مباشرة
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.organization_id,
        COALESCE(u.is_org_admin, false),
        COALESCE(u.is_super_admin, false),
        u.auth_user_id
    FROM public.users u 
    WHERE u.auth_user_id = get_current_user_profile.auth_user_id
    LIMIT 1;
END;
$$;

-- ==============================================
-- 5. منح الصلاحيات
-- ==============================================

-- منح صلاحيات تنفيذ الدوال الجديدة
GRANT EXECUTE ON FUNCTION get_current_user_info_safe() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_user_permissions_safe(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_profile() TO anon, authenticated;

COMMIT;

-- ==============================================
-- 6. اختبار سريع
-- ==============================================

-- اختبار الدوال الجديدة
SELECT 'تم إصلاح مشكلة circular dependency في RLS policies بنجاح!' as result; 