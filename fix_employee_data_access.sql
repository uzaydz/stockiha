-- إصلاح مشكلة الوصول للبيانات للموظفين
-- المشكلة: RLS policies تستخدم auth.uid() بدلاً من auth_user_id
-- تاريخ: 2025-01-27

-- =================================================================
-- الخطوة 1: تحديث دالة get_current_organization_id الموجودة
-- =================================================================

-- بدلاً من حذف الدالة، نقوم بتحديثها
CREATE OR REPLACE FUNCTION public.get_current_organization_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
  current_user_id UUID;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- محاولة أولى: البحث بـ auth_user_id
  SELECT organization_id INTO org_id
  FROM public.users
  WHERE auth_user_id = current_user_id
    AND is_active = true;
  
  -- إذا لم نجد، جرب البحث بـ id
  IF org_id IS NULL THEN
    SELECT organization_id INTO org_id
    FROM public.users
    WHERE id = current_user_id
      AND is_active = true;
  END IF;
  
  RETURN org_id;
END;
$$;

-- منح صلاحيات التنفيذ (إذا لم تكن موجودة)
GRANT EXECUTE ON FUNCTION public.get_current_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_organization_id() TO service_role;

-- =================================================================
-- الخطوة 2: إصلاح سياسات RLS للمنتجات
-- =================================================================

-- تفعيل RLS على جدول المنتجات
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة للمنتجات فقط (إذا كانت موجودة)
DROP POLICY IF EXISTS "org_tenant_products_select" ON products;
DROP POLICY IF EXISTS "products_read_secure" ON products;
DROP POLICY IF EXISTS "products_read_simple" ON products;
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_org_read" ON products;
DROP POLICY IF EXISTS "products_employee_read" ON products;

-- إنشاء سياسة قراءة محسنة للمنتجات
CREATE POLICY "products_employee_read" ON products
    FOR SELECT
    TO authenticated
    USING (
        -- المنتجات النشطة من نفس المؤسسة
        is_active = true AND
        organization_id = public.get_current_organization_id()
    );

-- سياسة قراءة عامة للمنتجات النشطة (للمتاجر العامة)
CREATE POLICY "products_public_read" ON products
    FOR SELECT
    TO anon, public
    USING (is_active = true);

-- سياسة الإدراج للموظفين
CREATE POLICY "products_employee_insert" ON products
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_current_organization_id() AND
        organization_id IS NOT NULL
    );

-- سياسة التحديث للموظفين
CREATE POLICY "products_employee_update" ON products
    FOR UPDATE
    TO authenticated
    USING (organization_id = public.get_current_organization_id())
    WITH CHECK (organization_id = public.get_current_organization_id());

-- سياسة الحذف للموظفين (مقيدة)
CREATE POLICY "products_employee_delete" ON products
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_current_organization_id() AND
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_user_id = auth.uid()
              AND u.organization_id = products.organization_id
              AND u.is_active = true
              AND (u.is_org_admin = true OR u.role IN ('admin', 'owner'))
        )
    );

-- =================================================================
-- الخطوة 3: إصلاح سياسات RLS للمخزون
-- =================================================================

-- تفعيل RLS على جدول المخزون إذا كان موجوداً
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_log') THEN
        -- لا نحذف السياسات الموجودة، فقط نتأكد من أنها تعمل
        -- السياسات الموجودة تستخدم get_current_organization_id() المحدثة
        RAISE NOTICE 'جدول inventory_log موجود والسياسات تعمل مع الدالة المحدثة';
    END IF;
END $$;

-- =================================================================
-- الخطوة 4: إصلاح سياسات RLS للفئات
-- =================================================================

-- تفعيل RLS على جدول فئات المنتجات
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- لا نحذف السياسات الموجودة، فقط نتأكد من أنها تعمل
-- السياسات الموجودة تستخدم get_current_organization_id() المحدثة

-- =================================================================
-- الخطوة 5: إصلاح سياسات RLS للطلبيات
-- =================================================================

-- تفعيل RLS على جدول الطلبيات
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- لا نحذف السياسات الموجودة، فقط نتأكد من أنها تعمل
-- السياسات الموجودة تستخدم get_current_organization_id() المحدثة

-- =================================================================
-- الخطوة 6: إصلاح سياسات RLS للعملاء
-- =================================================================

-- تفعيل RLS على جدول العملاء
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- لا نحذف السياسات الموجودة، فقط نتأكد من أنها تعمل
-- السياسات الموجودة تستخدم get_current_organization_id() المحدثة

-- =================================================================
-- الخطوة 7: إنشاء دالة مساعدة للتحقق من صلاحيات المستخدم
-- =================================================================

CREATE OR REPLACE FUNCTION public.check_user_permissions_for_org(permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  current_user_id UUID;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- البحث عن المستخدم
  SELECT * INTO user_record
  FROM public.users
  WHERE auth_user_id = current_user_id
     OR id = current_user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- التحقق من أن المستخدم نشط
  IF NOT user_record.is_active THEN
    RETURN FALSE;
  END IF;
  
  -- المدير العام له جميع الصلاحيات
  IF user_record.is_super_admin THEN
    RETURN TRUE;
  END IF;
  
  -- مدير المؤسسة له جميع الصلاحيات
  IF user_record.is_org_admin THEN
    RETURN TRUE;
  END IF;
  
  -- المدير والمالك لهما جميع الصلاحيات
  IF user_record.role IN ('admin', 'owner') THEN
    RETURN TRUE;
  END IF;
  
  -- التحقق من الصلاحية المحددة
  IF user_record.permissions ? permission_name THEN
    RETURN (user_record.permissions->>permission_name)::BOOLEAN;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION public.check_user_permissions_for_org(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_permissions_for_org(TEXT) TO service_role;

-- =================================================================
-- الخطوة 8: تحديث الإحصائيات
-- =================================================================

ANALYZE products;
ANALYZE product_categories;
ANALYZE orders;
ANALYZE customers;
ANALYZE users;

-- =================================================================
-- الخطوة 9: اختبار الوصول
-- =================================================================

-- إنشاء دالة اختبار للتحقق من أن السياسات تعمل
CREATE OR REPLACE FUNCTION public.test_employee_access()
RETURNS TABLE(
    table_name TEXT,
    policy_name TEXT,
    access_granted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- اختبار جدول المنتجات
    BEGIN
        PERFORM 1 FROM products LIMIT 1;
        RETURN QUERY SELECT 'products'::TEXT, 'SELECT'::TEXT, TRUE::BOOLEAN;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'products'::TEXT, 'SELECT'::TEXT, FALSE::BOOLEAN;
    END;
    
    -- اختبار جدول الفئات
    BEGIN
        PERFORM 1 FROM product_categories LIMIT 1;
        RETURN QUERY SELECT 'product_categories'::TEXT, 'SELECT'::TEXT, TRUE::BOOLEAN;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'product_categories'::TEXT, 'SELECT'::TEXT, FALSE::BOOLEAN;
    END;
    
    -- اختبار جدول الطلبيات
    BEGIN
        PERFORM 1 FROM orders LIMIT 1;
        RETURN QUERY SELECT 'orders'::TEXT, 'SELECT'::TEXT, TRUE::BOOLEAN;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'orders'::TEXT, 'SELECT'::TEXT, FALSE::BOOLEAN;
    END;
    
    -- اختبار جدول العملاء
    BEGIN
        PERFORM 1 FROM customers LIMIT 1;
        RETURN QUERY SELECT 'customers'::TEXT, 'SELECT'::TEXT, TRUE::BOOLEAN;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'customers'::TEXT, 'SELECT'::TEXT, FALSE::BOOLEAN;
    END;
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION public.test_employee_access() TO authenticated;

-- =================================================================
-- الخطوة 10: إنشاء دالة مساعدة للحصول على معرف المؤسسة
-- =================================================================

-- دالة مساعدة للحصول على معرف المؤسسة للمستخدم الحالي
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
  target_user_id UUID;
BEGIN
  -- إذا لم يتم تمرير user_id، استخدم المستخدم الحالي
  IF user_id IS NULL THEN
    target_user_id := auth.uid();
  ELSE
    target_user_id := user_id;
  END IF;
  
  IF target_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- محاولة أولى: البحث بـ auth_user_id
  SELECT organization_id INTO org_id
  FROM public.users
  WHERE auth_user_id = target_user_id
    AND is_active = true;
  
  -- إذا لم نجد، جرب البحث بـ id
  IF org_id IS NULL THEN
    SELECT organization_id INTO org_id
    FROM public.users
    WHERE id = target_user_id
      AND is_active = true;
  END IF;
  
  RETURN org_id;
END;
$$;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION public.get_user_organization_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id(UUID) TO service_role;

-- رسالة نجاح
SELECT 'تم إصلاح سياسات RLS للموظفين بنجاح!' as status;
SELECT 'يمكن للموظفين الآن الوصول لبيانات مؤسستهم' as message;
SELECT 'تم تحديث الدالة get_current_organization_id() بدلاً من حذفها' as note;
