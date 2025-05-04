-- Fix multi-tenant isolation for product_categories
-- هذا الملف يحل مشكلة رؤية الفئات من مؤسسات أخرى

-- 1. حذف السياسات العامة التي تتعارض مع عزل المستأجرين
DROP POLICY IF EXISTS "Allow select for all users" ON product_categories;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON product_categories;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON product_categories;

-- حذف أي سياسات قديمة للفئات قبل إنشاء سياسات جديدة
DROP POLICY IF EXISTS "org_tenant_product_categories_select" ON product_categories;
DROP POLICY IF EXISTS "org_tenant_product_categories_insert" ON product_categories;
DROP POLICY IF EXISTS "org_tenant_product_categories_update" ON product_categories;
DROP POLICY IF EXISTS "org_tenant_product_categories_delete" ON product_categories;
DROP POLICY IF EXISTS "tenant_categories_select" ON product_categories;
DROP POLICY IF EXISTS "tenant_categories_insert" ON product_categories;
DROP POLICY IF EXISTS "tenant_categories_update" ON product_categories;
DROP POLICY IF EXISTS "tenant_categories_delete" ON product_categories;

-- 2. التأكد من وجود triggers لضبط organization_id تلقائيًا
DROP TRIGGER IF EXISTS set_product_categories_organization_id ON product_categories;

CREATE OR REPLACE FUNCTION set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id FROM users WHERE id = auth.uid();
    END IF;
    
    -- إنشاء slug من الاسم إذا لم يتم توفيره
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '\s+', '-', 'g'));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_product_categories_organization_id
BEFORE INSERT ON product_categories
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

-- 3. إعادة إنشاء سياسات عزل المستأجرين بشكل صحيح
-- سياسة اختيار الفئات (تقييد بالمؤسسة)
CREATE POLICY "tenant_categories_select" ON product_categories
FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- سياسة إضافة الفئات (تقييد بالمؤسسة)
CREATE POLICY "tenant_categories_insert" ON product_categories
FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- سياسة تحديث الفئات (تقييد بالمؤسسة)
CREATE POLICY "tenant_categories_update" ON product_categories
FOR UPDATE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- سياسة حذف الفئات (تقييد بالمؤسسة)
CREATE POLICY "tenant_categories_delete" ON product_categories
FOR DELETE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 4. التأكد من تفعيل أمان الصفوف
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- 5. إعادة إنشاء سياسات عزل المستأجرين للتصنيفات الفرعية بشكل صحيح
DROP POLICY IF EXISTS "org_tenant_product_subcategories_select" ON product_subcategories;
DROP POLICY IF EXISTS "org_tenant_product_subcategories_insert" ON product_subcategories;
DROP POLICY IF EXISTS "org_tenant_product_subcategories_update" ON product_subcategories;
DROP POLICY IF EXISTS "org_tenant_product_subcategories_delete" ON product_subcategories;
DROP POLICY IF EXISTS "tenant_subcategories_select" ON product_subcategories;
DROP POLICY IF EXISTS "tenant_subcategories_insert" ON product_subcategories;
DROP POLICY IF EXISTS "tenant_subcategories_update" ON product_subcategories;
DROP POLICY IF EXISTS "tenant_subcategories_delete" ON product_subcategories;
DROP POLICY IF EXISTS "Allow select for all users" ON product_subcategories;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON product_subcategories;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON product_subcategories;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON product_subcategories;

CREATE POLICY "tenant_subcategories_select" ON product_subcategories
FOR SELECT
USING (category_id IN (
    SELECT id FROM product_categories 
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

CREATE POLICY "tenant_subcategories_insert" ON product_subcategories
FOR INSERT
WITH CHECK (category_id IN (
    SELECT id FROM product_categories 
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

CREATE POLICY "tenant_subcategories_update" ON product_subcategories
FOR UPDATE
USING (category_id IN (
    SELECT id FROM product_categories 
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

CREATE POLICY "tenant_subcategories_delete" ON product_subcategories
FOR DELETE
USING (category_id IN (
    SELECT id FROM product_categories 
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
));

-- تفعيل أمان الصفوف للتصنيفات الفرعية
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY; 