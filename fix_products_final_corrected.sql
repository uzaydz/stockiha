-- الحل النهائي المصحح لسياسات المنتجات
-- يدعم البنية الحقيقية لجدول organizations

-- ==================================================================
-- إنشاء دوال مبسطة وصحيحة
-- ==================================================================

-- دالة مبسطة للتحقق من الصلاحيات
CREATE OR REPLACE FUNCTION check_product_permissions_simple(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- السماح الكامل لـ service_role
    IF current_setting('role', true) = 'service_role' THEN
        RETURN true;
    END IF;
    
    -- التحقق من وجود المنظمة وأن اشتراكها نشط
    IF target_org_id IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM organizations 
            WHERE id = target_org_id 
            AND subscription_status = 'active'
        );
    END IF;
    
    RETURN false;
END;
$$;

-- دالة مبسطة للتحقق من إمكانية إنشاء المنتجات
CREATE OR REPLACE FUNCTION can_create_product_simple(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- السماح الكامل لـ service_role
    IF current_setting('role', true) = 'service_role' THEN
        RETURN true;
    END IF;
    
    -- التحقق من وجود المنظمة وأن اشتراكها نشط
    IF target_org_id IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM organizations 
            WHERE id = target_org_id 
            AND subscription_status = 'active'
        );
    END IF;
    
    RETURN false;
END;
$$;

-- ==================================================================
-- حذف السياسات الموجودة
-- ==================================================================

DROP POLICY IF EXISTS "products_read_v2" ON products;
DROP POLICY IF EXISTS "products_insert_v2" ON products;
DROP POLICY IF EXISTS "products_update_v2" ON products;
DROP POLICY IF EXISTS "products_delete_v2" ON products;
DROP POLICY IF EXISTS "products_service_role_v2" ON products;
DROP POLICY IF EXISTS "products_read_secure" ON products;
DROP POLICY IF EXISTS "products_insert_secure" ON products;
DROP POLICY IF EXISTS "products_update_secure" ON products;
DROP POLICY IF EXISTS "products_delete_secure" ON products;
DROP POLICY IF EXISTS "products_service_role_access" ON products;

-- ==================================================================
-- إنشاء سياسات جديدة ومبسطة
-- ==================================================================

-- 1. سياسة القراءة - تسمح بقراءة المنتجات النشطة
CREATE POLICY "products_read_final" ON products FOR SELECT 
USING (
    is_active = true OR 
    check_product_permissions_simple(organization_id)
);

-- 2. سياسة الإدراج - تسمح بإنشاء المنتجات مع فحص بسيط
CREATE POLICY "products_insert_final" ON products FOR INSERT 
WITH CHECK (
    organization_id IS NOT NULL AND
    can_create_product_simple(organization_id)
);

-- 3. سياسة التحديث - تسمح بتحديث المنتجات
CREATE POLICY "products_update_final" ON products FOR UPDATE 
USING (check_product_permissions_simple(organization_id))
WITH CHECK (check_product_permissions_simple(organization_id));

-- 4. سياسة الحذف - تسمح بحذف المنتجات
CREATE POLICY "products_delete_final" ON products FOR DELETE 
USING (check_product_permissions_simple(organization_id));

-- 5. سياسة service_role - للعمليات الإدارية
CREATE POLICY "products_service_role_final" ON products FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- ==================================================================
-- منح الصلاحيات
-- ==================================================================

GRANT EXECUTE ON FUNCTION check_product_permissions_simple(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION can_create_product_simple(UUID) TO authenticated, anon, service_role;

-- ==================================================================
-- تجديد cache
-- ==================================================================

NOTIFY pgrst, 'reload schema';

-- ==================================================================
-- اختبار النتيجة
-- ==================================================================

SELECT 
    'تم تطبيق الحل المصحح بنجاح!' as status,
    can_create_product_simple('fed872f9-1ade-4351-b020-5598fda976fe'::UUID) as can_create_test; 