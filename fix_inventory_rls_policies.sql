-- =================================================================
-- إصلاح سياسات RLS للمخزون والمنتجات - عرض منتجات المؤسسة الحالية فقط
-- =================================================================

-- تفعيل RLS على جدول المنتجات إذا لم يكن مفعل
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إذا كانت موجودة
DROP POLICY IF EXISTS "products_public_read_active" ON products;
DROP POLICY IF EXISTS "products_read_safe" ON products;
DROP POLICY IF EXISTS "org_tenant_products_select" ON products;
DROP POLICY IF EXISTS "org_tenant_products_insert" ON products;
DROP POLICY IF EXISTS "org_tenant_products_update" ON products;
DROP POLICY IF EXISTS "org_tenant_products_delete" ON products;

-- إنشاء سياسات جديدة محدثة للمنتجات
-- 1. سياسة القراءة للمستخدمين المصادق عليهم (منتجات مؤسستهم فقط)
CREATE POLICY "org_tenant_products_select" ON products
    FOR SELECT
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 2. سياسة القراءة العامة للمنتجات النشطة فقط (للمتاجر العامة)
CREATE POLICY "products_public_read_active" ON products
    FOR SELECT
    TO anon, public
    USING (is_active = true);

-- 3. سياسة الإدراج (للمستخدمين المصادق عليهم)
CREATE POLICY "org_tenant_products_insert" ON products
    FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 4. سياسة التحديث (للمستخدمين المصادق عليهم)
CREATE POLICY "org_tenant_products_update" ON products
    FOR UPDATE
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 5. سياسة الحذف (للمستخدمين المصادق عليهم)
CREATE POLICY "org_tenant_products_delete" ON products
    FOR DELETE
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- تفعيل RLS على جداول أخرى متعلقة بالمخزون
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة لألوان المنتجات
DROP POLICY IF EXISTS "product_colors_select" ON product_colors;
DROP POLICY IF EXISTS "product_colors_insert" ON product_colors;
DROP POLICY IF EXISTS "product_colors_update" ON product_colors;
DROP POLICY IF EXISTS "product_colors_delete" ON product_colors;

-- سياسات ألوان المنتجات (مربوطة بالمنتجات)
CREATE POLICY "product_colors_select" ON product_colors
    FOR SELECT
    TO authenticated
    USING (product_id IN (
        SELECT id FROM products 
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "product_colors_insert" ON product_colors
    FOR INSERT
    TO authenticated
    WITH CHECK (product_id IN (
        SELECT id FROM products 
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "product_colors_update" ON product_colors
    FOR UPDATE
    TO authenticated
    USING (product_id IN (
        SELECT id FROM products 
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "product_colors_delete" ON product_colors
    FOR DELETE
    TO authenticated
    USING (product_id IN (
        SELECT id FROM products 
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    ));

-- حذف السياسات القديمة لمقاسات المنتجات
DROP POLICY IF EXISTS "product_sizes_select" ON product_sizes;
DROP POLICY IF EXISTS "product_sizes_insert" ON product_sizes;
DROP POLICY IF EXISTS "product_sizes_update" ON product_sizes;
DROP POLICY IF EXISTS "product_sizes_delete" ON product_sizes;

-- سياسات مقاسات المنتجات (مربوطة بالمنتجات)
CREATE POLICY "product_sizes_select" ON product_sizes
    FOR SELECT
    TO authenticated
    USING (product_id IN (
        SELECT id FROM products 
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "product_sizes_insert" ON product_sizes
    FOR INSERT
    TO authenticated
    WITH CHECK (product_id IN (
        SELECT id FROM products 
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "product_sizes_update" ON product_sizes
    FOR UPDATE
    TO authenticated
    USING (product_id IN (
        SELECT id FROM products 
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    ));

CREATE POLICY "product_sizes_delete" ON product_sizes
    FOR DELETE
    TO authenticated
    USING (product_id IN (
        SELECT id FROM products 
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    ));

-- حذف السياسات القديمة لسجل المخزون
DROP POLICY IF EXISTS "org_tenant_inventory_log_select" ON inventory_log;
DROP POLICY IF EXISTS "org_tenant_inventory_log_insert" ON inventory_log;
DROP POLICY IF EXISTS "org_tenant_inventory_log_update" ON inventory_log;
DROP POLICY IF EXISTS "org_tenant_inventory_log_delete" ON inventory_log;

-- سياسات سجل المخزون
CREATE POLICY "org_tenant_inventory_log_select" ON inventory_log
    FOR SELECT
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_inventory_log_insert" ON inventory_log
    FOR INSERT
    TO authenticated
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_inventory_log_update" ON inventory_log
    FOR UPDATE
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_inventory_log_delete" ON inventory_log
    FOR DELETE
    TO authenticated
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_org_product ON inventory_log(organization_id, product_id);

-- إنشاء دالة للتحقق من صلاحية المستخدم للوصول للمنتج
CREATE OR REPLACE FUNCTION user_can_access_product(product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM products p
        JOIN users u ON u.organization_id = p.organization_id
        WHERE p.id = product_id AND u.id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة دالة للحصول على معرف المؤسسة للمستخدم الحالي
CREATE OR REPLACE FUNCTION get_current_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT organization_id FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- عرض للمخزون مع تطبيق تصفية المؤسسة
CREATE OR REPLACE VIEW current_organization_inventory AS
SELECT 
    p.*,
    COALESCE(
        (SELECT SUM(pc.quantity) FROM product_colors pc WHERE pc.product_id = p.id),
        p.stock_quantity
    ) as total_stock_quantity
FROM products p
WHERE p.organization_id = get_current_user_organization_id()
  AND p.is_active = true;

COMMENT ON VIEW current_organization_inventory IS 'عرض لمخزون المؤسسة الحالية مع حساب المخزون الإجمالي';

-- التحقق من تطبيق السياسات
DO $$
BEGIN
    -- التحقق من أن السياسات تم إنشاؤها بنجاح
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' 
        AND policyname = 'org_tenant_products_select'
    ) THEN
        RAISE EXCEPTION 'فشل في إنشاء سياسة org_tenant_products_select';
    END IF;
    
    -- إظهار رسالة نجاح
    RAISE NOTICE 'تم تطبيق سياسات RLS للمخزون بنجاح ✅';
END $$; 