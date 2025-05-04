-- التحقق من وجود عمود slug وإضافته إذا لم يكن موجوداً
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'slug') 
    THEN
        -- إضافة عمود slug إذا لم يكن موجوداً
        ALTER TABLE products ADD COLUMN slug TEXT;
    END IF;
END $$;

-- تحديث قيم slug للمنتجات الموجودة
UPDATE products 
SET slug = LOWER(REGEXP_REPLACE(name, '\s+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- إنشاء فهرس على عمود slug
DROP INDEX IF EXISTS idx_products_slug;
CREATE INDEX idx_products_slug ON products(slug);

-- إنشاء دالة trigger للتحديث التلقائي لـ slug
CREATE OR REPLACE FUNCTION update_product_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- التأكد من أن NEW موجود وأن له حقل name صالح
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.name IS NOT NULL THEN
            NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '\s+', '-', 'g'));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للتحديث
DROP TRIGGER IF EXISTS tr_update_product_slug ON products;
CREATE TRIGGER tr_update_product_slug
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_slug();

-- إضافة قيد unique على عمود slug
ALTER TABLE products DROP CONSTRAINT IF EXISTS unique_product_slug;
ALTER TABLE products ADD CONSTRAINT unique_product_slug UNIQUE (slug);

-- تحديث حقل category للمنتجات
UPDATE products 
SET category = category_id
WHERE category_id IS NOT NULL AND (category IS NULL OR category = ''); 