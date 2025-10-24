-- =====================================================
-- سياسات RLS موحدة وآمنة لـ Super Admin
-- هذا الملف يضمن أن Super Admin لديه وصول كامل لجميع الجداول
-- مع الحفاظ على الأمان والأداء
-- =====================================================

-- دالة مساعدة للتحقق من صلاحيات Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_is_super_admin BOOLEAN := false;
BEGIN
    -- التحقق من auth.uid() أولاً
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    -- التحقق من جدول المستخدمين
    SELECT COALESCE(u.is_super_admin, false)
    INTO v_is_super_admin
    FROM public.users u
    WHERE (u.auth_user_id = auth.uid() OR u.id = auth.uid())
      AND u.is_active = true
    LIMIT 1;

    RETURN v_is_super_admin;
END;
$$;

COMMENT ON FUNCTION public.is_super_admin() IS 
'دالة آمنة للتحقق من صلاحيات Super Admin. تستخدم في سياسات RLS.';

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- =====================================================
-- سياسات Organizations
-- =====================================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "super_admin_all_organizations" ON public.organizations;
DROP POLICY IF EXISTS "super_admin_select_organizations" ON public.organizations;
DROP POLICY IF EXISTS "super_admin_insert_organizations" ON public.organizations;
DROP POLICY IF EXISTS "super_admin_update_organizations" ON public.organizations;
DROP POLICY IF EXISTS "super_admin_delete_organizations" ON public.organizations;

-- إنشاء سياسة موحدة للقراءة
CREATE POLICY "super_admin_select_all_organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
    public.is_super_admin()
    OR id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_active = true
    )
);

-- إنشاء سياسة موحدة للإضافة
CREATE POLICY "super_admin_insert_organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

-- إنشاء سياسة موحدة للتحديث
CREATE POLICY "super_admin_update_organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
    public.is_super_admin()
    OR id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_org_admin = true
          AND is_active = true
    )
);

-- إنشاء سياسة موحدة للحذف
CREATE POLICY "super_admin_delete_organizations"
ON public.organizations
FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- =====================================================
-- سياسات Users
-- =====================================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "super_admin_all_users" ON public.users;
DROP POLICY IF EXISTS "super_admin_select_users" ON public.users;
DROP POLICY IF EXISTS "super_admin_insert_users" ON public.users;
DROP POLICY IF EXISTS "super_admin_update_users" ON public.users;
DROP POLICY IF EXISTS "super_admin_delete_users" ON public.users;

-- إنشاء سياسة موحدة للقراءة
CREATE POLICY "super_admin_select_all_users"
ON public.users
FOR SELECT
TO authenticated
USING (
    public.is_super_admin()
    OR auth_user_id = auth.uid()
    OR id = auth.uid()
    OR organization_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_org_admin = true
          AND is_active = true
    )
);

-- إنشاء سياسة موحدة للإضافة
CREATE POLICY "super_admin_insert_users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR organization_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_org_admin = true
          AND is_active = true
    )
);

-- إنشاء سياسة موحدة للتحديث
CREATE POLICY "super_admin_update_users"
ON public.users
FOR UPDATE
TO authenticated
USING (
    public.is_super_admin()
    OR auth_user_id = auth.uid()
    OR id = auth.uid()
    OR organization_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_org_admin = true
          AND is_active = true
    )
);

-- إنشاء سياسة موحدة للحذف
CREATE POLICY "super_admin_delete_users"
ON public.users
FOR DELETE
TO authenticated
USING (
    public.is_super_admin()
    AND auth_user_id != auth.uid() -- لا يمكن حذف نفسه
);

-- =====================================================
-- سياسات Products
-- =====================================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "super_admin_all_products" ON public.products;
DROP POLICY IF EXISTS "super_admin_select_products" ON public.products;
DROP POLICY IF EXISTS "super_admin_insert_products" ON public.products;
DROP POLICY IF EXISTS "super_admin_update_products" ON public.products;
DROP POLICY IF EXISTS "super_admin_delete_products" ON public.products;

-- إنشاء سياسة موحدة للقراءة
CREATE POLICY "super_admin_select_all_products"
ON public.products
FOR SELECT
TO authenticated
USING (
    public.is_super_admin()
    OR organization_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_active = true
    )
);

-- إنشاء سياسة موحدة للإضافة
CREATE POLICY "super_admin_insert_products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR organization_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_active = true
    )
);

-- إنشاء سياسة موحدة للتحديث
CREATE POLICY "super_admin_update_products"
ON public.products
FOR UPDATE
TO authenticated
USING (
    public.is_super_admin()
    OR organization_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_active = true
    )
);

-- إنشاء سياسة موحدة للحذف
CREATE POLICY "super_admin_delete_products"
ON public.products
FOR DELETE
TO authenticated
USING (
    public.is_super_admin()
    OR organization_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_active = true
    )
);

-- =====================================================
-- سياسات Orders
-- =====================================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "super_admin_all_orders" ON public.orders;
DROP POLICY IF EXISTS "super_admin_select_orders" ON public.orders;
DROP POLICY IF EXISTS "super_admin_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "super_admin_update_orders" ON public.orders;
DROP POLICY IF EXISTS "super_admin_delete_orders" ON public.orders;

-- إنشاء سياسة موحدة للقراءة
CREATE POLICY "super_admin_select_all_orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
    public.is_super_admin()
    OR organization_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_active = true
    )
);

-- إنشاء سياسة موحدة للإضافة
CREATE POLICY "super_admin_insert_orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR organization_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_active = true
    )
);

-- إنشاء سياسة موحدة للتحديث
CREATE POLICY "super_admin_update_orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
    public.is_super_admin()
    OR organization_id IN (
        SELECT organization_id 
        FROM public.users 
        WHERE (auth_user_id = auth.uid() OR id = auth.uid())
          AND is_active = true
    )
);

-- إنشاء سياسة موحدة للحذف
CREATE POLICY "super_admin_delete_orders"
ON public.orders
FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- =====================================================
-- إنشاء مؤشرات لتحسين الأداء
-- =====================================================

-- مؤشر على is_super_admin للبحث السريع
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin 
ON public.users(is_super_admin) 
WHERE is_super_admin = true AND is_active = true;

-- مؤشر على is_org_admin للبحث السريع
CREATE INDEX IF NOT EXISTS idx_users_is_org_admin 
ON public.users(is_org_admin, organization_id) 
WHERE is_org_admin = true AND is_active = true;

-- مؤشر على auth_user_id للبحث السريع
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id_active 
ON public.users(auth_user_id, is_active) 
WHERE auth_user_id IS NOT NULL;

-- =====================================================
-- تعليقات وتوثيق
-- =====================================================

COMMENT ON POLICY "super_admin_select_all_organizations" ON public.organizations IS 
'Super Admin يمكنه رؤية جميع المؤسسات، والمستخدمون العاديون يرون مؤسساتهم فقط';

COMMENT ON POLICY "super_admin_select_all_users" ON public.users IS 
'Super Admin يمكنه رؤية جميع المستخدمين، مدراء المؤسسات يرون مستخدمي مؤسساتهم';

COMMENT ON POLICY "super_admin_select_all_products" ON public.products IS 
'Super Admin يمكنه رؤية جميع المنتجات، والمستخدمون يرون منتجات مؤسساتهم';

COMMENT ON POLICY "super_admin_select_all_orders" ON public.orders IS 
'Super Admin يمكنه رؤية جميع الطلبات، والمستخدمون يرون طلبات مؤسساتهم';

-- =====================================================
-- سجل التغييرات
-- =====================================================

-- إدراج سجل في جدول migrations (إذا كان موجوداً)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
        INSERT INTO schema_migrations (version, name, executed_at)
        VALUES ('20250102', 'super_admin_unified_policies', NOW())
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

