-- =================================================================
-- إصلاح سياسات RLS البسيط للمنتجات - حل سريع
-- =================================================================

-- تفعيل RLS على جدول المنتجات
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "products_public_read_active" ON products;
DROP POLICY IF EXISTS "products_read_safe" ON products;
DROP POLICY IF EXISTS "org_tenant_products_select" ON products;

-- إنشاء سياسة واحدة بسيطة للمستخدمين المصادق عليهم
CREATE POLICY "org_tenant_products_select" ON products
    FOR SELECT
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- سياسة للقراءة العامة للمنتجات النشطة (للمتاجر العامة)
CREATE POLICY "products_public_read_active" ON products
    FOR SELECT
    TO anon, public
    USING (is_active = true);

-- التحقق من أن السياسة تعمل
DO $$
BEGIN
    RAISE NOTICE 'تم تطبيق سياسات RLS الأساسية للمنتجات ✅';
END $$; 