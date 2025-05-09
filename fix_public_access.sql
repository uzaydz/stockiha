-- fix_public_access.sql
-- هذا الملف يضيف سياسات الوصول العام للزوار إلى جداول المنتجات ومكونات المتجر

-- 0. إضافة دالة مساعدة للحصول على معرف المؤسسة من عنوان URL
-- هذه الدالة ستساعد على تحديد المؤسسة الصحيحة في حالة الزوار
CREATE OR REPLACE FUNCTION public.get_organization_id_from_url()
RETURNS UUID AS $$
DECLARE
  v_organization_id UUID;
  v_hostname TEXT;
  v_slug TEXT;
BEGIN
  -- محاولة الحصول على اسم المضيف من الطلب الحالي
  v_hostname := current_setting('request.headers', true)::json->>'host';
  
  IF v_hostname IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- استخراج الـslug من اسم المضيف (مثال: tenant-slug.domain.com)
  v_slug := split_part(v_hostname, '.', 1);
  
  -- محاولة العثور على المؤسسة عن طريق slug
  SELECT id INTO v_organization_id
  FROM organizations
  WHERE slug = v_slug;
  
  -- إذا لم يتم العثور على المؤسسة، حاول البحث حسب المجال
  IF v_organization_id IS NULL THEN
    SELECT id INTO v_organization_id
    FROM organizations
    WHERE custom_domain = v_hostname;
  END IF;
  
  RETURN v_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. إضافة سياسة وصول عامة للمنتجات
-- تسمح هذه السياسة للزوار بمشاهدة المنتجات النشطة دون الحاجة لتسجيل الدخول
DROP POLICY IF EXISTS "Allow public to view active products" ON products;
CREATE POLICY "Allow public to view active products" 
ON products FOR SELECT 
USING (is_active = true);

-- 2. إضافة سياسة وصول عامة لإعدادات المتجر
-- تسمح هذه السياسة للزوار بمشاهدة مكونات المتجر النشطة
DROP POLICY IF EXISTS "Allow public to view active store components" ON store_settings;
CREATE POLICY "Allow public to view active store components" 
ON store_settings FOR SELECT 
USING (is_active = true);

-- 3. تأكد من تفعيل تقييد الصفوف على الجداول
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- 4. تحقق من وجود أي إعدادات أخرى ضرورية
-- مثل تعيين المنتجات الغير نشطة لتكون نشطة
UPDATE products SET is_active = true WHERE is_active IS NULL;
UPDATE store_settings SET is_active = true WHERE is_active IS NULL;

-- 5. التحقق من وجود سياسة خاصة بفئات المنتجات
-- فئات المنتجات يجب أن تكون متاحة للزوار أيضًا
DROP POLICY IF EXISTS "Allow public to view product categories" ON product_categories;
CREATE POLICY "Allow public to view product categories" 
ON product_categories FOR SELECT 
USING (true);

-- 6. التحقق من وجود سياسة خاصة بصور المنتجات
DROP POLICY IF EXISTS "Allow public to view product images" ON product_images;
CREATE POLICY "Allow public to view product images" 
ON product_images FOR SELECT 
USING (true);

-- 7. سياسة الوصول لأحجام المنتجات
DROP POLICY IF EXISTS "Allow public to view product sizes" ON product_sizes;
CREATE POLICY "Allow public to view product sizes" 
ON product_sizes FOR SELECT 
USING (true);

-- 8. سياسة الوصول لألوان المنتجات
DROP POLICY IF EXISTS "Allow public to view product colors" ON product_colors;
CREATE POLICY "Allow public to view product colors" 
ON product_colors FOR SELECT 
USING (true);

-- 9. سياسة الوصول للفئات الفرعية
DROP POLICY IF EXISTS "Allow public to view product subcategories" ON product_subcategories;
CREATE POLICY "Allow public to view product subcategories" 
ON product_subcategories FOR SELECT 
USING (true);

-- 10. سياسة الوصول للمؤسسات (للمعلومات العامة فقط)
DROP POLICY IF EXISTS "Allow public to view organization basic info" ON organizations;
CREATE POLICY "Allow public to view organization basic info" 
ON organizations FOR SELECT 
USING (true);

-- 11. سياسة الوصول لإعدادات المؤسسة العامة
DROP POLICY IF EXISTS "Allow public to view organization settings" ON organization_settings;
CREATE POLICY "Allow public to view organization settings" 
ON organization_settings FOR SELECT 
USING (true);

-- 12. سياسة الوصول متعلقة بالمؤسسة المحددة (تستخدم الدالة المساعدة)
-- هذه سياسات إضافية يمكن استخدامها لتقييد الوصول وفقًا للمؤسسة المطلوبة فقط
DROP POLICY IF EXISTS "Allow public to view specific organization products" ON products;
CREATE POLICY "Allow public to view specific organization products" 
ON products FOR SELECT 
USING (
  organization_id = get_organization_id_from_url() OR
  get_organization_id_from_url() IS NULL
);

DROP POLICY IF EXISTS "Allow public to view specific organization store settings" ON store_settings;
CREATE POLICY "Allow public to view specific organization store settings" 
ON store_settings FOR SELECT 
USING (
  organization_id = get_organization_id_from_url() OR
  get_organization_id_from_url() IS NULL
);

-- 13. تأكد من تفعيل السياسة العامة لـ enable_public_site
UPDATE organization_settings SET enable_public_site = true;

-- ملاحظة: تأكد من تنفيذ هذه السياسات بحذر لأنها تتيح الوصول العام للبيانات
-- أيضًا، تأكد من تنفيذ الأوامر أعلاه من قبل مستخدم لديه صلاحيات كافية

-- 14. اختبار الإصلاح: 
-- 1. قم بتنفيذ السكريبت 
-- 2. حاول الوصول إلى صفحة المتجر كزائر غير مسجل
-- 3. تأكد من ظهور المنتجات والإعدادات بشكل صحيح
-- 4. إذا استمرت المشكلة، تحقق من سجلات الخطأ للحصول على مزيد من المعلومات 