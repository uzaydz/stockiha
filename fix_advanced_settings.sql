-- ملف SQL إضافي لحل مشكلة product_advanced_settings
-- تطبق هذه التغييرات على قاعدة بيانات Supabase

-- =====================================================
-- 1. إضافة عمود id لجدول product_advanced_settings
-- =====================================================

-- إضافة عمود id كمفتاح أساسي
ALTER TABLE product_advanced_settings 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- إنشاء فهرس فريد على product_id للتأكد من عدم التكرار
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_advanced_settings_product_id_unique 
ON product_advanced_settings(product_id);

-- =====================================================
-- 2. حل مشكلة الصلاحيات البديلة
-- =====================================================

-- حذف السياسات الموجودة وإعادة إنشائها
DROP POLICY IF EXISTS "Allow organization members to manage advanced settings" ON product_advanced_settings;
DROP POLICY IF EXISTS "Allow public read access to advanced settings" ON product_advanced_settings;

-- سياسة للقراءة والكتابة للأعضاء المصرح لهم
CREATE POLICY "Enable all access for organization members" 
ON product_advanced_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM products p
    INNER JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_advanced_settings.product_id 
    AND u.id = auth.uid()
    AND u.is_org_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM products p
    INNER JOIN users u ON u.organization_id = p.organization_id
    WHERE p.id = product_advanced_settings.product_id 
    AND u.id = auth.uid()
    AND u.is_org_admin = true
  )
);

-- سياسة للقراءة العامة (للعرض في الموقع)
CREATE POLICY "Enable read access for all users" 
ON product_advanced_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- =====================================================
-- 3. تحديث بيانات موجودة (إضافة id للسجلات الموجودة)
-- =====================================================

-- تحديث السجلات الموجودة التي لا تحتوي على id
UPDATE product_advanced_settings 
SET id = gen_random_uuid() 
WHERE id IS NULL;

-- =====================================================
-- 4. تحديث القيود والفهارس
-- =====================================================

-- التأكد من أن id هو المفتاح الأساسي
ALTER TABLE product_advanced_settings 
DROP CONSTRAINT IF EXISTS product_advanced_settings_pkey;

ALTER TABLE product_advanced_settings 
ADD CONSTRAINT product_advanced_settings_pkey PRIMARY KEY (id);

-- إضافة قيد فريد على product_id
ALTER TABLE product_advanced_settings 
ADD CONSTRAINT product_advanced_settings_product_id_unique UNIQUE (product_id);

-- =====================================================
-- 5. تمكين RLS
-- =====================================================

ALTER TABLE product_advanced_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- انتهاء ملف الإصلاحات الإضافي
-- ===================================================== 