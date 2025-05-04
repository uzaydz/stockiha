-- إضافة سياسات الوصول للمسؤول الرئيسي
-- يجب تنفيذ هذا الملف بعد التأكد من وجود العمود

-- التحقق أولاً من وجود العمود
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- التحقق من وجود العمود
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'is_super_admin'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE EXCEPTION 'Error: Column is_super_admin does not exist in users table. Please run 01_add_super_admin_column.sql first';
    ELSE
        RAISE NOTICE 'Verification passed: Column is_super_admin exists in users table';
    END IF;
END
$$;

-- إنشاء سياسة للمسؤولين الرئيسيين للوصول إلى جميع المؤسسات
DROP POLICY IF EXISTS "Allow super admin access to all organizations" ON organizations;
CREATE POLICY "Allow super admin access to all organizations" 
ON organizations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_super_admin = TRUE
    )
);

-- إنشاء سياسة للمسؤولين الرئيسيين للوصول إلى جميع المستخدمين
DROP POLICY IF EXISTS "Allow super admin access to all users" ON users;
CREATE POLICY "Allow super admin access to all users" 
ON users
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_super_admin = TRUE
    )
);

-- المنتجات
DROP POLICY IF EXISTS "Allow super admin access to all products" ON products;
CREATE POLICY "Allow super admin access to all products" 
ON products
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_super_admin = TRUE
    )
);

-- الطلبات
DROP POLICY IF EXISTS "Allow super admin access to all orders" ON orders;
CREATE POLICY "Allow super admin access to all orders" 
ON orders
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_super_admin = TRUE
    )
);

-- الفواتير
DROP POLICY IF EXISTS "Allow super admin access to all invoices" ON invoices;
CREATE POLICY "Allow super admin access to all invoices" 
ON invoices
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_super_admin = TRUE
    )
); 