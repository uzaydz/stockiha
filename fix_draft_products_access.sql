-- ================================================
-- إصلاح مشكلة الوصول للمنتجات المحفوظة كمسودة
-- المشكلة: المنتجات المحفوظة كمسودة (is_active = false) 
-- لا يمكن الوصول إليها بعد الإنشاء بسبب سياسة RLS
-- ================================================

BEGIN;

-- إسقاط السياسة الحالية
DROP POLICY IF EXISTS "products_employee_read" ON public.products;

-- إنشاء سياسة محسنة تسمح للمستخدمين بقراءة جميع منتجات مؤسستهم
-- بما في ذلك المنتجات غير النشطة (المسودات)
CREATE POLICY "products_employee_read_enhanced" ON public.products
FOR SELECT
TO authenticated
USING (
    -- المستخدم يمكنه قراءة المنتجات إذا:
    organization_id = get_current_organization_id()
    AND
    (
        -- إما أن يكون المنتج نشط (للعرض العام)
        is_active = true
        OR
        -- أو أن يكون المستخدم من نفس المؤسسة (يمكنه رؤية المسودات)
        EXISTS (
            SELECT 1 
            FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.organization_id = products.organization_id 
            AND u.is_active = true
        )
    )
);

-- تأكيد التغييرات
COMMIT;

-- إضافة تعليق للتوثيق
COMMENT ON POLICY "products_employee_read_enhanced" ON public.products IS 
'يسمح للمستخدمين المصادق عليهم بقراءة جميع منتجات مؤسستهم، بما في ذلك المنتجات غير النشطة (المسودات)';
