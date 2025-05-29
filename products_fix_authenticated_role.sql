-- إصلاح مشكلة 403 للمستخدمين المصادق عليهم
-- السبب: السياسات مطبقة على public role لكن المستخدم يستخدم authenticated role

-- ==================================================================
-- الحل: تحديث السياسات لتعمل مع authenticated role
-- ==================================================================

-- حذف السياسات الحالية
DROP POLICY IF EXISTS "products_anon_read" ON products;
DROP POLICY IF EXISTS "products_anon_insert" ON products;
DROP POLICY IF EXISTS "products_anon_update" ON products;
DROP POLICY IF EXISTS "products_anon_delete" ON products;

-- إنشاء سياسات جديدة لـ authenticated role
CREATE POLICY "products_auth_read" ON products FOR SELECT 
TO authenticated
USING (
    is_active = true AND 
    is_valid_organization(organization_id)
);

CREATE POLICY "products_auth_insert" ON products FOR INSERT 
TO authenticated
WITH CHECK (
    organization_id IS NOT NULL AND
    category_id IS NOT NULL AND
    name IS NOT NULL AND
    LENGTH(name) >= 2 AND
    price >= 0 AND
    purchase_price >= 0 AND
    stock_quantity >= 0 AND
    is_valid_product_data(organization_id, category_id, name)
);

CREATE POLICY "products_auth_update" ON products FOR UPDATE 
TO authenticated
USING (
    organization_id IS NOT NULL AND
    is_valid_organization(organization_id)
)
WITH CHECK (
    organization_id IS NOT NULL AND
    is_valid_organization(organization_id)
);

CREATE POLICY "products_auth_delete" ON products FOR DELETE 
TO authenticated
USING (
    organization_id IS NOT NULL AND
    is_valid_organization(organization_id) AND
    is_active = false
);

-- احتفاظ بسياسة service_role كما هي
-- (تم إنشاؤها مسبقاً)

-- منح الصلاحيات للـ authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;

-- تحديث إحصائيات الجدول
ANALYZE products;
NOTIFY pgrst, 'reload schema';

-- اختبار بسيط
SELECT 
    'تم إصلاح مشكلة authenticated role!' as status,
    count(*) as total_products
FROM products 
WHERE is_active = true; 