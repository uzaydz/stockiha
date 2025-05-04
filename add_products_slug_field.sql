-- إضافة حقل slug إلى جدول المنتجات إذا لم يكن موجودًا بالفعل
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'products' 
                AND column_name = 'slug') THEN
    -- إضافة حقل جديد
    ALTER TABLE products ADD COLUMN slug VARCHAR;
    
    -- تحديث القيم الحالية بناءً على اسم المنتج
    UPDATE products SET slug = LOWER(REGEXP_REPLACE(name, '\s+', '-', 'g'))
    WHERE slug IS NULL;
    
    -- إنشاء فهرس على حقل slug
    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
  END IF;
END $$;

-- تعديل triggers التي قد تكون تستخدم حقل slug
CREATE OR REPLACE FUNCTION update_product_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث حقل slug من اسم المنتج إذا لم يتم توفيره
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '\s+', '-', 'g'));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للتأكد من أن حقل slug دائمًا ما يتم ملؤه
DROP TRIGGER IF EXISTS set_product_slug ON products;
CREATE TRIGGER set_product_slug
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_slug(); 