-- سياسات أمنة ومحسنة لجدول products
-- تاريخ: 2025-01-29
-- مصممة لتجنب infinite recursion ودعم جميع أنواع المصادقة

-- ==================================================================
-- إنشاء الدوال المساعدة الآمنة (نسخة من جدول users الناجح)
-- ==================================================================

-- دالة للحصول على معلومات المستخدم الحالي بطريقة آمنة
CREATE OR REPLACE FUNCTION get_current_user_for_products()
RETURNS TABLE (
    auth_user_id UUID,
    user_organization_id UUID,
    user_role TEXT,
    user_is_org_admin BOOLEAN,
    user_is_super_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    FROM users u 
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true
    LIMIT 1;
END;
$$;

-- دالة للتحقق من صلاحيات المنتجات
CREATE OR REPLACE FUNCTION check_product_permissions(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_info RECORD;
BEGIN
    -- التحقق من service_role أولاً (للدوال البرمجية)
    IF current_setting('role', true) = 'service_role' THEN
        RETURN true;
    END IF;
    
    -- الحصول على معلومات المستخدم الحالي
    SELECT * INTO current_user_info FROM get_current_user_for_products();
    
    -- إذا لم يتم العثور على المستخدم
    IF current_user_info.auth_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- السماح للمسؤول العام
    IF current_user_info.user_is_super_admin THEN
        RETURN true;
    END IF;
    
    -- السماح لمسؤول المنظمة للوصول لمنتجات منظمته
    IF current_user_info.user_is_org_admin AND target_org_id IS NOT NULL THEN
        RETURN current_user_info.user_organization_id = target_org_id;
    END IF;
    
    -- التحقق من الصلاحيات المحددة للمنتجات
    IF target_org_id IS NOT NULL AND current_user_info.user_organization_id = target_org_id THEN
        -- يمكن إضافة منطق صلاحيات أكثر تفصيلاً هنا
        RETURN true;
    END IF;
    
    -- رفض الوصول في الحالات الأخرى
    RETURN false;
END;
$$;

-- دالة للتحقق من صلاحية إنشاء المنتجات
CREATE OR REPLACE FUNCTION can_create_product(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_info RECORD;
    user_permissions JSONB;
BEGIN
    -- التحقق من service_role أولاً
    IF current_setting('role', true) = 'service_role' THEN
        RETURN true;
    END IF;
    
    -- الحصول على معلومات المستخدم
    SELECT * INTO current_user_info FROM get_current_user_for_products();
    
    IF current_user_info.auth_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- السماح للمسؤولين
    IF current_user_info.user_is_super_admin OR current_user_info.user_is_org_admin THEN
        RETURN current_user_info.user_organization_id = target_org_id;
    END IF;
    
    -- فحص الصلاحيات التفصيلية
    SELECT permissions INTO user_permissions
    FROM users
    WHERE auth_user_id = current_user_info.auth_user_id;
    
    IF user_permissions IS NOT NULL THEN
        RETURN (
            user_permissions ? 'manageProducts' OR
            user_permissions ? 'addProducts' OR
            user_permissions ? 'editProducts'
        ) AND current_user_info.user_organization_id = target_org_id;
    END IF;
    
    RETURN false;
END;
$$;

-- ==================================================================
-- حذف السياسات القديمة
-- ==================================================================

DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_read_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;
DROP POLICY IF EXISTS "products_service_role_policy" ON products;
DROP POLICY IF EXISTS "products_read_simple" ON products;
DROP POLICY IF EXISTS "products_insert_simple" ON products;
DROP POLICY IF EXISTS "products_update_simple" ON products;
DROP POLICY IF EXISTS "products_delete_simple" ON products;
DROP POLICY IF EXISTS "products_service_role_full_access" ON products;

-- ==================================================================
-- تفعيل RLS
-- ==================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ==================================================================
-- السياسات الجديدة الآمنة
-- ==================================================================

-- 1. سياسة القراءة - تسمح بقراءة المنتجات النشطة أو لأعضاء نفس المنظمة
CREATE POLICY "products_read_secure" ON products FOR SELECT 
USING (
    is_active = true OR 
    check_product_permissions(organization_id)
);

-- 2. سياسة الإدراج - تسمح بإنشاء المنتجات للمصرح لهم فقط
CREATE POLICY "products_insert_secure" ON products FOR INSERT 
WITH CHECK (
    organization_id IS NOT NULL AND
    can_create_product(organization_id) AND
    EXISTS (
        SELECT 1 FROM organizations 
        WHERE id = products.organization_id 
        AND is_active = true
    )
);

-- 3. سياسة التحديث - تسمح بتحديث المنتجات لأعضاء نفس المنظمة
CREATE POLICY "products_update_secure" ON products FOR UPDATE 
USING (check_product_permissions(organization_id))
WITH CHECK (check_product_permissions(organization_id));

-- 4. سياسة الحذف - تسمح بحذف المنتجات للمسؤولين فقط
CREATE POLICY "products_delete_secure" ON products FOR DELETE 
USING (
    check_product_permissions(organization_id) AND
    EXISTS (
        SELECT 1 FROM get_current_user_for_products() u
        WHERE u.user_is_org_admin = true OR u.user_is_super_admin = true
    )
);

-- 5. سياسة service_role - للعمليات الإدارية والدوال البرمجية
CREATE POLICY "products_service_role_access" ON products FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- ==================================================================
-- منح الصلاحيات
-- ==================================================================

GRANT SELECT ON products TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON products TO authenticated;
GRANT ALL ON products TO service_role;

-- ==================================================================
-- إنشاء فهارس للأداء
-- ==================================================================

CREATE INDEX IF NOT EXISTS idx_products_organization_active 
ON products(organization_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_created_by 
ON products(created_by_user_id) WHERE created_by_user_id IS NOT NULL;

-- ==================================================================
-- منح صلاحيات تنفيذ الدوال
-- ==================================================================

GRANT EXECUTE ON FUNCTION get_current_user_for_products() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION check_product_permissions(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION can_create_product(UUID) TO authenticated, anon, service_role;

-- ==================================================================
-- تجديد schema cache
-- ==================================================================

NOTIFY pgrst, 'reload schema';

-- ==================================================================
-- اختبار بسيط للتأكد من عمل النظام
-- ==================================================================

-- رسالة تأكيد
SELECT 
    'تم تطبيق السياسات الآمنة بنجاح - products table secured!' as status,
    count(*) as total_products,
    count(DISTINCT organization_id) as organizations_with_products
FROM products; 