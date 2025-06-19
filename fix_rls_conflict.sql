-- =================================================================
-- إصلاح تضارب سياسات RLS للمنتجات
-- =================================================================

-- حذف السياسات المتضاربة
DROP POLICY IF EXISTS "products_public_read_active" ON products;
DROP POLICY IF EXISTS "products_delete_safe" ON products;
DROP POLICY IF EXISTS "products_insert_safe" ON products;
DROP POLICY IF EXISTS "products_update_safe" ON products;

-- إنشاء سياسة واحدة للقراءة العامة للمنتجات النشطة (للمتاجر العامة فقط)
-- لكن فقط للمستخدمين غير المصادق عليهم (anon)
CREATE POLICY "products_public_read_active_anon_only" ON products
    FOR SELECT
    TO anon
    USING (is_active = true);

-- التأكد من أن المستخدمين المصادق عليهم يرون منتجات مؤسستهم فقط
-- السياسة org_tenant_products_select موجودة بالفعل

-- التحقق من النتيجة
DO $$
BEGIN
    RAISE NOTICE 'تم إصلاح تضارب سياسات RLS للمنتجات ✅';
    RAISE NOTICE 'المستخدمون المصادق عليهم: يرون منتجات مؤسستهم فقط';
    RAISE NOTICE 'المستخدمون غير المصادق عليهم: يرون جميع المنتجات النشطة (للمتاجر العامة)';
END $$; 