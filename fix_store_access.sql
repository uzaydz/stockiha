-- fix_store_access.sql
-- إصلاح مشكلة عدم ظهور إعدادات المتجر للزوار

-- 1. إنشاء دالة get_public_store_settings للزوار
-- هذه الدالة لا تتحقق من المستخدم وتسمح للزوار بمشاهدة إعدادات المتجر
CREATE OR REPLACE FUNCTION public.get_public_store_settings(p_organization_id uuid)
RETURNS TABLE(id uuid, component_type text, settings jsonb, is_active boolean, order_index integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- لا يوجد تحقق من المستخدم هنا لأنها دالة عامة للزوار

  RETURN QUERY
  SELECT 
    ss.id,
    ss.component_type,
    ss.settings,
    ss.is_active,
    ss.order_index
  FROM 
    store_settings ss
  WHERE 
    ss.organization_id = p_organization_id
    AND ss.is_active = true  -- فقط المكونات النشطة
  ORDER BY
    ss.order_index ASC;
END;
$$;

-- 2. تعديل سياسة الوصول لـ store_settings لتكون عامة للقراءة
DROP POLICY IF EXISTS "public_view_store_settings" ON store_settings;
CREATE POLICY "public_view_store_settings"
ON store_settings FOR SELECT
USING (true);

-- 3. تعديل الدالة get_store_components في الواجهة الأمامية
-- يجب تعديل الكود في الواجهة الأمامية لاستخدام get_public_store_settings للزوار

-- 4. إصلاح مشكلة الـ RPC للمنتجات والفئات
CREATE OR REPLACE FUNCTION public.get_public_products(p_organization_id uuid)
RETURNS SETOF products
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM products
  WHERE organization_id = p_organization_id
  AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_public_product_categories(p_organization_id uuid)
RETURNS SETOF product_categories
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM product_categories
  WHERE organization_id = p_organization_id;
$$;

-- 5. تعديل get_store_settings لتقبل معلمة إضافية للسماح بالوصول العام
CREATE OR REPLACE FUNCTION public.get_store_settings(p_organization_id uuid, p_public_access boolean DEFAULT false)
RETURNS TABLE(id uuid, component_type text, settings jsonb, is_active boolean, order_index integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من صلاحية المستخدم إذا لم تكن وصولًا عامًا
  IF NOT p_public_access AND NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND (u.organization_id = p_organization_id OR u.is_super_admin = true)
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول إلى هذه البيانات';
  END IF;

  RETURN QUERY
  SELECT 
    ss.id,
    ss.component_type,
    ss.settings,
    ss.is_active,
    ss.order_index
  FROM 
    store_settings ss
  WHERE 
    ss.organization_id = p_organization_id
  ORDER BY
    ss.order_index ASC;
END;
$$;

-- 6. تعديل سياسات الوصول إلى المنتجات
DROP POLICY IF EXISTS "public_view_products" ON products;
CREATE POLICY "public_view_products"
ON products FOR SELECT
USING (is_active = true);

-- 7. تحديث مسار API لجلب إعدادات المتجر
-- (يجب تعديل الكود في الواجهة الأمامية)

-- 8. التأكد من تمكين RLS على الجداول
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- 9. إصلاح مشكلة المنتجات وعمود Slug
-- تأكد من استخدام Slug في المنتجات
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

-- إنشاء Slug تلقائي للمنتجات التي ليس لديها
UPDATE products 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) || '-' || id
WHERE slug IS NULL OR slug = '';

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug); 