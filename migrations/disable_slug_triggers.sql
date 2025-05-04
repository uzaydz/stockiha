-- ملف ترحيل لإزالة جميع الـ triggers المتعلقة بحقل slug
-- حذف جميع الـ triggers المتعلقة بحقل slug
DROP TRIGGER IF EXISTS trigger_set_product_slug ON products;
DROP TRIGGER IF EXISTS set_product_slug ON products;
DROP TRIGGER IF EXISTS set_product_slug_insert ON products;
DROP TRIGGER IF EXISTS tr_update_product_slug ON products;

-- حذف جميع الـ functions المتعلقة بحقل slug
DROP FUNCTION IF EXISTS set_product_slug();
DROP FUNCTION IF EXISTS update_product_slug();

-- التأكد من وجود عمود slug
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'slug') 
    THEN
        ALTER TABLE products ADD COLUMN slug TEXT;
    END IF;
END $$;

-- تحديث قيم slug للمنتجات الموجودة للتأكد من أنها صحيحة
UPDATE products 
SET slug = LOWER(REGEXP_REPLACE(name, '\s+', '-', 'g'))
WHERE name IS NOT NULL; 