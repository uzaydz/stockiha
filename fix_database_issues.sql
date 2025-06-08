-- ملف SQL لحل مشاكل قاعدة البيانات
-- تطبق هذه التغييرات على قاعدة بيانات Supabase

-- =====================================================
-- 1. حل مشكلة صلاحيات RLS لجدول product_marketing_settings
-- =====================================================

-- حذف السياسات الموجودة للتنظيف (إذا كانت موجودة)
DROP POLICY IF EXISTS "Allow organization members to manage marketing settings" ON product_marketing_settings;

-- إنشاء سياسة جديدة للسماح بجميع العمليات (قراءة/كتابة/تحديث/حذف)
CREATE POLICY "Allow organization members to manage marketing settings" 
ON product_marketing_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM products p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_marketing_settings.product_id 
    AND u.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM products p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_marketing_settings.product_id 
    AND u.id = auth.uid()
  )
);

-- =====================================================
-- 2. حل مشكلة صلاحيات RLS لجدول product_advanced_settings
-- =====================================================

-- حذف السياسات الموجودة للتنظيف (إذا كانت موجودة)
DROP POLICY IF EXISTS "Allow organization members to manage advanced settings" ON product_advanced_settings;

-- إنشاء سياسة جديدة للسماح بجميع العمليات
CREATE POLICY "Allow organization members to manage advanced settings" 
ON product_advanced_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM products p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_advanced_settings.product_id 
    AND u.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM products p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_advanced_settings.product_id 
    AND u.id = auth.uid()
  )
);

-- =====================================================
-- 3. إضافة صلاحيات قراءة عامة للجداول (اختيارية)
-- =====================================================

-- السماح بقراءة إعدادات التسويق والإعدادات المتقدمة (للعرض العام للمنتجات)
CREATE POLICY "Allow public read access to marketing settings" 
ON product_marketing_settings
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public read access to advanced settings" 
ON product_advanced_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- =====================================================
-- 4. تحديث سياسات product_images (إذا لزم الأمر)
-- =====================================================

-- التأكد من وجود سياسة مناسبة لإدارة الصور
DROP POLICY IF EXISTS "Allow organization members to manage product images" ON product_images;

CREATE POLICY "Allow organization members to manage product images" 
ON product_images
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM products p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_images.product_id 
    AND u.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM products p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_images.product_id 
    AND u.id = auth.uid()
  )
);

-- =====================================================
-- 5. تحديث سياسات wholesale_tiers (إذا لزم الأمر)
-- =====================================================

-- التأكد من وجود سياسة مناسبة لإدارة أسعار الجملة
DROP POLICY IF EXISTS "Allow organization members to manage wholesale tiers" ON wholesale_tiers;

CREATE POLICY "Allow organization members to manage wholesale tiers" 
ON wholesale_tiers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM products p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = wholesale_tiers.product_id 
    AND u.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM products p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = wholesale_tiers.product_id 
    AND u.id = auth.uid()
  )
);

-- =====================================================
-- 6. تحديث سياسات product_colors (إذا لزم الأمر)
-- =====================================================

-- التأكد من وجود سياسة مناسبة لإدارة ألوان المنتجات
DROP POLICY IF EXISTS "Allow organization members to manage product colors" ON product_colors;

CREATE POLICY "Allow organization members to manage product colors" 
ON product_colors
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM products p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_colors.product_id 
    AND u.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM products p
    JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_colors.product_id 
    AND u.id = auth.uid()
  )
);

-- السماح بقراءة عامة لألوان المنتجات
CREATE POLICY "Allow public read access to product colors" 
ON product_colors
FOR SELECT
TO anon, authenticated
USING (true);

-- =====================================================
-- 7. التحقق من تفعيل RLS على الجداول
-- =====================================================

-- التأكد من تفعيل RLS على جميع الجداول المطلوبة
ALTER TABLE product_marketing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_advanced_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. إنشاء فهارس لتحسين الأداء (اختياري)
-- =====================================================

-- فهارس لتحسين أداء الاستعلامات
CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_product_id ON product_marketing_settings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_advanced_settings_product_id ON product_advanced_settings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_tiers_product_id ON wholesale_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON product_colors(product_id);

-- =====================================================
-- انتهاء ملف الإصلاحات
-- =====================================================

-- ملاحظة: بعد تطبيق هذا الملف، يجب أن تعمل عمليات إنشاء وتحديث المنتجات بشكل صحيح
-- تأكد من وجود المستخدمين في جدول users مع organization_id صحيح 