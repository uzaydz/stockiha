-- إضافة عمود صورة للفئات في جدول product_categories
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- إنشاء تحديث للوظيفة الخاصة بالفئات (set_organization_id) لتجنب الأخطاء المحتملة
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

-- تحديث سياسات أمان الصفوف لتضمين الحقل الجديد
DROP POLICY IF EXISTS "tenant_categories_select" ON product_categories;
DROP POLICY IF EXISTS "tenant_categories_insert" ON product_categories;
DROP POLICY IF EXISTS "tenant_categories_update" ON product_categories;
DROP POLICY IF EXISTS "tenant_categories_delete" ON product_categories;

-- إعادة إنشاء السياسات مع مراعاة العمود الجديد
CREATE POLICY "tenant_categories_select" ON product_categories
FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tenant_categories_insert" ON product_categories
FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tenant_categories_update" ON product_categories
FOR UPDATE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "tenant_categories_delete" ON product_categories
FOR DELETE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())); 