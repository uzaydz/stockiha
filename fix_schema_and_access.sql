-- fix_schema_and_access.sql
-- هذا الملف يصلح مشكلة عمود slug المفقود وسياسات الوصول للزوار

-- 1. التحقق من وجود عمود slug في جدول المنتجات والنماذج
-- في سجلات الأخطاء، نرى خطأ "column slug does not exist"
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE form_settings ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. تحديث قيم slug للمنتجات الموجودة بناءً على الاسم
-- سنقوم بإنشاء slug فريد لكل منتج إذا كان العمود موجودًا ولكن فارغ
UPDATE products SET slug = 
  LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), 
    '\s+', '-', 'g'
  )) || '-' || id
WHERE slug IS NULL OR slug = '';

-- 3. إضافة سياسة RLS للسماح بالوصول العام للمنتجات
DROP POLICY IF EXISTS "Allow public to view products" ON products;
CREATE POLICY "Allow public to view products" 
ON products FOR SELECT 
USING (true);

-- 4. إضافة سياسة RLS للسماح بالوصول العام لإعدادات المتجر
DROP POLICY IF EXISTS "Allow public to view store components" ON store_settings;
CREATE POLICY "Allow public to view store components" 
ON store_settings FOR SELECT 
USING (true);

-- 5. إضافة سياسة RLS للسماح بالوصول العام لإعدادات النماذج
DROP POLICY IF EXISTS "Allow public to view form settings" ON form_settings;
CREATE POLICY "Allow public to view form settings" 
ON form_settings FOR SELECT 
USING (true);

-- 6. إضافة سياسة RLS للسماح بالوصول العام لصور المنتجات
DROP POLICY IF EXISTS "Allow public to view product images" ON product_images;
CREATE POLICY "Allow public to view product images" 
ON product_images FOR SELECT 
USING (true);

-- 7. إضافة سياسة RLS للسماح بالوصول العام لألوان المنتجات
DROP POLICY IF EXISTS "Allow public to view product colors" ON product_colors;
CREATE POLICY "Allow public to view product colors" 
ON product_colors FOR SELECT 
USING (true);

-- 8. إضافة سياسة RLS للسماح بالوصول العام لأحجام المنتجات
DROP POLICY IF EXISTS "Allow public to view product sizes" ON product_sizes;
CREATE POLICY "Allow public to view product sizes" 
ON product_sizes FOR SELECT 
USING (true);

-- 9. تفعيل سياسات RLS على الجداول
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

-- 10. إضافة مؤشر للبحث السريع باستخدام slug
CREATE INDEX IF NOT EXISTS products_slug_idx ON products(slug);
CREATE INDEX IF NOT EXISTS form_settings_slug_idx ON form_settings(slug);

-- ملاحظة: بعد تنفيذ هذا السكريبت، يجب إعادة تشغيل التطبيق أو تحديث الصفحة
-- للتأكد من تطبيق التغييرات. 