-- إضافة حقل slug إلى جدول المنتجات
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug text;

-- تحديث القيم الحالية بناءً على اسم المنتج وتنظيفها من الرموز الخاصة
UPDATE products 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), -- إزالة جميع الرموز الخاصة ما عدا الحروف والأرقام والمسافات والشرطة
      '\s+', '-', 'g'                                   -- استبدال المسافات بشرطة
    ),
    '-+', '-', 'g'                                      -- استبدال الشرطات المتكررة بشرطة واحدة
  )
)
WHERE slug IS NULL;

-- إنشاء فهرس على حقل slug
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- إنشاء دالة لتنظيف وتحديث حقل slug تلقائيًا
CREATE OR REPLACE FUNCTION set_product_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا كان حقل slug فارغًا، اشتقه من اسم المنتج
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- تنظيف اسم المنتج من الرموز الخاصة وتنسيقه بشكل صحيح
    NEW.slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'), -- إزالة جميع الرموز الخاصة ما عدا الحروف والأرقام والمسافات والشرطة
          '\s+', '-', 'g'                                       -- استبدال المسافات بشرطة
        ),
        '-+', '-', 'g'                                          -- استبدال الشرطات المتكررة بشرطة واحدة
      )
    );
    
    -- إذا أصبح الslug فارغًا بعد التنظيف (حالة نادرة)، استخدم معرف المنتج كسلاج
    IF NEW.slug = '' THEN
      NEW.slug := 'product-' || COALESCE(NEW.id::text, 'new');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger يستدعي الدالة عند إدراج أو تحديث منتج
DROP TRIGGER IF EXISTS trigger_set_product_slug ON products;
CREATE TRIGGER trigger_set_product_slug
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_product_slug();

-- إصلاح السلاق غير الصحيحة في المنتجات الحالية
UPDATE products 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )
)
WHERE slug LIKE '%|%' OR slug LIKE '%&%' OR slug LIKE '%?%' OR slug LIKE '%=%' OR slug LIKE '%/%';

-- تحديث ذاكرة التخزين المؤقت لمخطط قاعدة البيانات
-- (يجب إعادة تشغيل خدمة postgREST لاستعادة ذاكرة التخزين المؤقت)
NOTIFY pgrst, 'reload schema'; 