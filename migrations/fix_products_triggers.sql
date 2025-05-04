-- حذف جميع الـ triggers المتعلقة بحقل slug
DROP TRIGGER IF EXISTS trigger_set_product_slug ON products;
DROP TRIGGER IF EXISTS set_product_slug ON products;
DROP TRIGGER IF EXISTS set_product_slug_insert ON products;
DROP TRIGGER IF EXISTS tr_update_product_slug ON products;

-- إنشاء trigger function موحدة ومحسنة
CREATE OR REPLACE FUNCTION set_product_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- تعيين slug من الاسم إذا كان الاسم موجوداً
  IF NEW.name IS NOT NULL THEN
    -- إذا كان التحديث وتغير الاسم أو كان slug فارغاً
    IF (TG_OP = 'UPDATE' AND (NEW.name != OLD.name OR NEW.slug IS NULL OR NEW.slug = '')) 
       OR (TG_OP = 'INSERT' AND (NEW.slug IS NULL OR NEW.slug = '')) THEN
      NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '\s+', '-', 'g'));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger واحد
CREATE TRIGGER set_product_slug
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_product_slug();

-- تحديث جميع المنتجات لإعادة ضبط حقل slug
UPDATE products 
SET slug = LOWER(REGEXP_REPLACE(name, '\s+', '-', 'g'))
WHERE name IS NOT NULL; 