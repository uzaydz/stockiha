-- ملف SQL محدث لحل مشكلة product_advanced_settings
-- إصدار 2 - يحل مشكلة تضارب المفاتيح الأساسية

-- =====================================================
-- 1. فحص هيكل الجدول الحالي
-- =====================================================

-- عرض معلومات الجدول الحالي
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'product_advanced_settings' 
-- ORDER BY ordinal_position;

-- =====================================================
-- 2. حذف السياسات الموجودة للتنظيف
-- =====================================================

DROP POLICY IF EXISTS "Allow organization members to manage advanced settings" ON product_advanced_settings;
DROP POLICY IF EXISTS "Allow public read access to advanced settings" ON product_advanced_settings;
DROP POLICY IF EXISTS "Enable all access for organization members" ON product_advanced_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON product_advanced_settings;

-- =====================================================
-- 3. إنشاء سياسات بسيطة وواضحة
-- =====================================================

-- سياسة للمصرح لهم (أعضاء المؤسسة)
CREATE POLICY "product_advanced_settings_org_access" 
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
  )
);

-- سياسة للقراءة العامة
CREATE POLICY "product_advanced_settings_public_read" 
ON product_advanced_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- =====================================================
-- 4. التأكد من تمكين RLS
-- =====================================================

ALTER TABLE product_advanced_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. إنشاء فهارس للأداء
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_product_advanced_settings_product_id 
ON product_advanced_settings(product_id);

-- =====================================================
-- انتهاء الإصلاحات
-- =====================================================

-- هذا الملف يركز على حل مشاكل الصلاحيات فقط
-- بدون تعديل هيكل الجدول لتجنب تضارب المفاتيح الأساسية 