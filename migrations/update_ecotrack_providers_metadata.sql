-- تحديث البيانات الوصفية لشركات التوصيل Ecotrack
-- Update metadata for Ecotrack shipping providers

-- إضافة فهرس لتحسين الأداء عند البحث بالكود
CREATE INDEX IF NOT EXISTS idx_shipping_providers_code_active 
ON shipping_providers(code, is_active) 
WHERE is_active = true;

-- إضافة فهرس لتحسين الأداء عند البحث بـ base_url
CREATE INDEX IF NOT EXISTS idx_shipping_providers_base_url 
ON shipping_providers(base_url) 
WHERE base_url IS NOT NULL;

-- تحديث أي معلومات ناقصة في الجدول
UPDATE shipping_providers 
SET 
    created_at = COALESCE(created_at, NOW()),
    updated_at = NOW()
WHERE created_at IS NULL;

-- إضافة تقييد للتأكد من عدم السماح بقيم فارغة في code
ALTER TABLE shipping_providers 
DROP CONSTRAINT IF EXISTS shipping_providers_code_not_empty;

ALTER TABLE shipping_providers 
ADD CONSTRAINT shipping_providers_code_not_empty 
CHECK (code IS NOT NULL AND LENGTH(TRIM(code)) > 0);

-- إضافة تقييد للتأكد من عدم السماح بقيم فارغة في name
ALTER TABLE shipping_providers 
DROP CONSTRAINT IF EXISTS shipping_providers_name_not_empty;

ALTER TABLE shipping_providers 
ADD CONSTRAINT shipping_providers_name_not_empty 
CHECK (name IS NOT NULL AND LENGTH(TRIM(name)) > 0);

-- التأكد من صحة format الـ URLs
UPDATE shipping_providers 
SET base_url = RTRIM(base_url, '/') || '/'
WHERE base_url IS NOT NULL 
AND base_url != '' 
AND NOT base_url LIKE '%/';

-- عرض تقرير نهائي عن شركات التوصيل
SELECT 
    'شركات التوصيل الإجمالية' as النوع,
    COUNT(*) as العدد
FROM shipping_providers
UNION ALL
SELECT 
    'شركات Ecotrack المفعلة' as النوع,
    COUNT(*) as العدد
FROM shipping_providers 
WHERE is_active = true 
AND (code = 'ecotrack' OR base_url LIKE '%ecotrack.dz%')
UNION ALL
SELECT 
    'شركات التوصيل المفعلة الإجمالية' as النوع,
    COUNT(*) as العدد
FROM shipping_providers 
WHERE is_active = true
UNION ALL
SELECT 
    'شركات التوصيل غير المفعلة' as النوع,
    COUNT(*) as العدد
FROM shipping_providers 
WHERE is_active = false OR is_active IS NULL;

-- عرض قائمة شركات Ecotrack مع معلوماتها
SELECT 
    code as الكود,
    name as الاسم,
    base_url as "رابط API",
    is_active as مفعلة
FROM shipping_providers 
WHERE code = 'ecotrack' OR base_url LIKE '%ecotrack.dz%'
ORDER BY name;

-- إنشاء view لسهولة الوصول لشركات Ecotrack
CREATE OR REPLACE VIEW ecotrack_providers AS
SELECT 
    id,
    code,
    name,
    base_url,
    is_active,
    created_at,
    updated_at
FROM shipping_providers 
WHERE code = 'ecotrack' OR base_url LIKE '%ecotrack.dz%'
ORDER BY name;

-- إضافة تعليق على الـ view
COMMENT ON VIEW ecotrack_providers IS 'عرض جميع شركات التوصيل التي تستخدم منصة Ecotrack';

-- تسجيل رسالة في السجل
DO $$
BEGIN
  RAISE LOG 'تم تحديث البيانات الوصفية لشركات Ecotrack وإنشاء الفهارس بنجاح';
END $$; 