-- إصلاح نهائي وشامل لصلاحيات المنتجات
-- Fix final and comprehensive for product permissions

-- ==================================================================
-- 1. إنشاء دالة للتحقق الآمن من المستخدم الحالي
-- ==================================================================

CREATE OR REPLACE FUNCTION get_safe_current_user()
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    organization_id UUID,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN,
    permissions JSONB,
    is_organization_owner BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- التحقق من وجود المستخدم المصادق عليه
    IF auth.uid() IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email as user_email,
        u.organization_id,
        u.is_org_admin,
        COALESCE(u.is_super_admin, false) as is_super_admin,
        COALESCE(u.permissions, '{}'::jsonb) as permissions,
        CASE 
            WHEN o.owner_id = u.id THEN true
            ELSE false
        END as is_organization_owner
    FROM public.users u
    LEFT JOIN public.organizations o ON o.id = u.organization_id
    WHERE u.id = auth.uid()
    LIMIT 1;
END;
$$;

-- ==================================================================
-- 2. إنشاء دالة للتحقق من صلاحية إدارة المنتجات
-- ==================================================================

CREATE OR REPLACE FUNCTION can_manage_products_in_org(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_info RECORD;
BEGIN
    -- التحقق من service_role أولاً (للنظام)
    IF current_setting('role', true) = 'service_role' THEN
        RETURN true;
    END IF;
    
    -- الحصول على معلومات المستخدم
    SELECT * INTO user_info FROM get_safe_current_user();
    
    -- إذا لم يتم العثور على المستخدم
    IF user_info.user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- السماح للمسؤول العام
    IF user_info.is_super_admin THEN
        RETURN true;
    END IF;
    
    -- التحقق من أن المستخدم في نفس المؤسسة
    IF user_info.organization_id != target_org_id THEN
        RETURN false;
    END IF;
    
    -- السماح لمالك المؤسسة
    IF user_info.is_organization_owner THEN
        RETURN true;
    END IF;
    
    -- السماح لمدير المؤسسة
    IF user_info.is_org_admin THEN
        RETURN true;
    END IF;
    
    -- التحقق من الصلاحيات المحددة
    IF user_info.permissions IS NOT NULL THEN
        IF (user_info.permissions->>'manageProducts')::boolean = true OR
           (user_info.permissions->>'addProducts')::boolean = true OR
           (user_info.permissions->>'editProducts')::boolean = true THEN
            RETURN true;
        END IF;
    END IF;
    
    -- رفض في الحالات الأخرى
    RETURN false;
END;
$$;

-- ==================================================================
-- 3. حذف جميع السياسات القديمة
-- ==================================================================

DROP POLICY IF EXISTS "Allow ALL for Super Admins" ON products;
DROP POLICY IF EXISTS "Allow ALL for organization members" ON products;
DROP POLICY IF EXISTS "products_read_policy" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;
DROP POLICY IF EXISTS "products_super_admin_all" ON products;
DROP POLICY IF EXISTS "super_admin_products_policy" ON products;

-- ==================================================================
-- 4. إنشاء سياسات جديدة وآمنة
-- ==================================================================

-- سياسة القراءة (SELECT)
CREATE POLICY "products_read_safe" ON public.products
FOR SELECT
USING (
    -- السماح للمستخدمين في نفس المؤسسة أو المسؤولين العامين
    can_manage_products_in_org(organization_id)
);

-- سياسة الإدراج (INSERT)
CREATE POLICY "products_insert_safe" ON public.products
FOR INSERT
WITH CHECK (
    -- التحقق من إمكانية إدارة المنتجات في هذه المؤسسة
    can_manage_products_in_org(organization_id)
);

-- سياسة التحديث (UPDATE)
CREATE POLICY "products_update_safe" ON public.products
FOR UPDATE
USING (
    can_manage_products_in_org(organization_id)
)
WITH CHECK (
    can_manage_products_in_org(organization_id)
);

-- سياسة الحذف (DELETE)
CREATE POLICY "products_delete_safe" ON public.products
FOR DELETE
USING (
    can_manage_products_in_org(organization_id)
);

-- ==================================================================
-- 5. تأكيد تفعيل RLS
-- ==================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ==================================================================
-- 6. إنشاء دالة لاختبار الصلاحيات (للتشخيص)
-- ==================================================================

CREATE OR REPLACE FUNCTION debug_product_permissions(test_org_id UUID)
RETURNS TABLE (
    debug_info TEXT,
    debug_value TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_info RECORD;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT * INTO user_info FROM get_safe_current_user();
    
    RETURN QUERY VALUES 
        ('auth_uid', COALESCE(auth.uid()::text, 'NULL')),
        ('user_id', COALESCE(user_info.user_id::text, 'NULL')),
        ('user_email', COALESCE(user_info.user_email, 'NULL')),
        ('organization_id', COALESCE(user_info.organization_id::text, 'NULL')),
        ('is_org_admin', COALESCE(user_info.is_org_admin::text, 'false')),
        ('is_super_admin', COALESCE(user_info.is_super_admin::text, 'false')),
        ('is_organization_owner', COALESCE(user_info.is_organization_owner::text, 'false')),
        ('permissions', COALESCE(user_info.permissions::text, '{}')),
        ('can_manage_test_org', can_manage_products_in_org(test_org_id)::text),
        ('test_org_id', COALESCE(test_org_id::text, 'NULL'));
END;
$$;

-- ==================================================================
-- 7. منح الصلاحيات للدوال
-- ==================================================================

GRANT EXECUTE ON FUNCTION get_safe_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_products_in_org(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_product_permissions(UUID) TO authenticated;

-- ==================================================================
-- 8. إنشاء/تحديث صلاحيات المستخدمين الحاليين
-- ==================================================================

-- التأكد من أن جميع مالكي المؤسسات لديهم صلاحية إدارة المنتجات
UPDATE public.users 
SET permissions = jsonb_set(
    COALESCE(permissions, '{}'::jsonb),
    '{manageProducts}',
    'true'
),
is_org_admin = true
WHERE id IN (
    SELECT owner_id 
    FROM organizations 
    WHERE owner_id IS NOT NULL
)
AND (
    (permissions->>'manageProducts')::boolean IS NOT true
    OR is_org_admin IS NOT true
);

-- التأكد من أن جميع مدراء المؤسسات لديهم صلاحية إدارة المنتجات
UPDATE public.users 
SET permissions = jsonb_set(
    COALESCE(permissions, '{}'::jsonb),
    '{manageProducts}',
    'true'
)
WHERE is_org_admin = true
AND (permissions->>'manageProducts')::boolean IS NOT true;

-- ==================================================================
-- 9. اختبار نهائي
-- ==================================================================

-- عرض السياسات الجديدة
SELECT 
    'تم إنشاء السياسات بنجاح' as status,
    COUNT(*) as policies_count
FROM pg_policies 
WHERE tablename = 'products'; 