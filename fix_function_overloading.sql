-- fix_function_overloading.sql
-- هذا الملف يصحح تعارض الدوال المستخدمة للزوار والمستخدمين

-- 1. حذف الدوال القديمة لتجنب التعارض
DROP FUNCTION IF EXISTS public.get_public_store_settings(uuid);
DROP FUNCTION IF EXISTS public.get_store_settings(uuid);
DROP FUNCTION IF EXISTS public.get_store_settings(uuid, boolean);
DROP FUNCTION IF EXISTS public.get_public_product_categories(uuid);
DROP FUNCTION IF EXISTS public.get_public_product_subcategories(uuid);
DROP FUNCTION IF EXISTS public.get_organization_theme(uuid);

-- 2. إعادة إنشاء دالة موحدة للوصول إلى بيانات المتجر مع معلمة للتمييز بين الزائر والمستخدم
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
    -- إضافة شرط للتفريق بين الوصول العام والخاص
    AND (p_public_access = false OR ss.is_active = true)
  ORDER BY
    ss.order_index ASC;
END;
$$;

COMMENT ON FUNCTION public.get_store_settings(uuid, boolean) IS 'الحصول على إعدادات متجر مع إمكانية الوصول العام';

-- 3. التأكد من تفعيل سياسات حماية الصفوف
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- 4. إعادة إنشاء سياسة الوصول العام لإعدادات المتجر
DROP POLICY IF EXISTS "public_view_store_settings" ON store_settings;
CREATE POLICY "public_view_store_settings"
ON store_settings FOR SELECT
USING (is_active = true);

-- 5. إعادة إنشاء سياسة وصول المستخدمين المسجلين
DROP POLICY IF EXISTS "authenticated_manage_store_settings" ON store_settings;
CREATE POLICY "authenticated_manage_store_settings"
ON store_settings TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND (u.organization_id = organization_id OR u.is_super_admin = true)
  )
);

-- 6. إنشاء سياسة وصول عامة للفئات
DROP POLICY IF EXISTS "public_view_product_categories" ON product_categories;
CREATE POLICY "public_view_product_categories"
ON product_categories FOR SELECT
USING (true);

-- 7. إنشاء سياسة وصول عامة للفئات الفرعية
DROP POLICY IF EXISTS "public_view_product_subcategories" ON product_subcategories;
CREATE POLICY "public_view_product_subcategories"
ON product_subcategories FOR SELECT
USING (true);

-- 8. إنشاء دالة للوصول العام للفئات الفرعية
-- تصحيح الدالة للربط مع جدول الفئات للحصول على الفئات الفرعية المرتبطة بمؤسسة معينة
CREATE OR REPLACE FUNCTION public.get_public_product_subcategories(p_organization_id uuid)
RETURNS SETOF product_subcategories
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT ps.*
  FROM product_subcategories ps
  JOIN product_categories pc ON ps.category_id = pc.id
  WHERE pc.organization_id = p_organization_id;
$$;

COMMENT ON FUNCTION public.get_public_product_subcategories(uuid) IS 'الحصول على الفئات الفرعية للمنتجات للزوار';

-- 9. إضافة دالة للحصول على إعدادات الثيم (الألوان) للمؤسسة
CREATE OR REPLACE FUNCTION public.get_organization_theme(p_organization_id uuid)
RETURNS TABLE(
  theme_primary_color text,
  theme_secondary_color text,
  theme_mode text,
  site_name text,
  logo_url text,
  favicon_url text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(theme_primary_color, '#6366f1') as theme_primary_color,
    COALESCE(theme_secondary_color, '#4f46e5') as theme_secondary_color,
    COALESCE(theme_mode, 'light') as theme_mode,
    COALESCE(site_name, 'متجر جديد') as site_name,
    logo_url,
    favicon_url
  FROM organization_settings
  WHERE organization_id = p_organization_id
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_organization_theme(uuid) IS 'الحصول على إعدادات الثيم (الألوان) للمؤسسة';

-- 10. إصلاح سياسات الوصول للإعدادات العامة للمؤسسة
DROP POLICY IF EXISTS "anon_view_organization_settings" ON organization_settings;
CREATE POLICY "anon_view_organization_settings"
ON organization_settings FOR SELECT
TO anon
USING (true);

-- 11. إنشاء فهارس للتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_product_categories_org_id ON product_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_subcategories_cat_id ON product_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_store_settings_org_id ON store_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);

-- 12. تعديل كل الصلاحيات للجداول ذات الصلة للأمان والتحسين
GRANT SELECT ON product_categories TO anon;
GRANT SELECT ON product_subcategories TO anon;
GRANT SELECT ON store_settings TO anon;
GRANT SELECT ON organization_settings TO anon;
GRANT EXECUTE ON FUNCTION public.get_organization_theme(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_product_subcategories(uuid) TO anon;