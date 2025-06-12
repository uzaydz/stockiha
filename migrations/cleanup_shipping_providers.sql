-- تنظيف البيانات غير الصحيحة من جدول شركات التوصيل
-- Cleanup invalid data from shipping_providers table

-- حذف الإدخالات غير الصحيحة التي تحتوي على أرقام كرموز
DELETE FROM shipping_providers 
WHERE code IN ('1', '5') 
AND (name = 'Yalidine' OR name = '5');

-- التأكد من عدم وجود إدخالات مكررة لـ yalidine
DELETE FROM shipping_providers 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM shipping_providers 
    WHERE code = 'yalidine'
    GROUP BY code
) AND code = 'yalidine';

-- التأكد من أن جميع الشركات الجديدة مفعلة
UPDATE shipping_providers 
SET is_active = true 
WHERE code IN (
    'anderson_delivery', 'areex', 'ba_consult', 'conexlog', 'coyote_express', 
    'dhd', 'distazero', 'e48hr_livraison', 'fretdirect', 'golivri', 
    'mono_hub', 'msm_go', 'imir_express', 'packers', 'prest', 
    'rb_livraison', 'rex_livraison', 'rocket_delivery', 'salva_delivery', 
    'speed_delivery', 'tsl_express', 'worldexpress'
);

-- التأكد من أن جميع الشركات لديها تواريخ محدثة
UPDATE shipping_providers 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- عرض إحصائيات نهائية
SELECT 
    'Total shipping providers' as description,
    COUNT(*) as count
FROM shipping_providers
UNION ALL
SELECT 
    'Active Ecotrack providers' as description,
    COUNT(*) as count
FROM shipping_providers 
WHERE is_active = true 
AND (code = 'ecotrack' OR base_url LIKE '%ecotrack.dz%')
UNION ALL
SELECT 
    'All active providers' as description,
    COUNT(*) as count
FROM shipping_providers 
WHERE is_active = true;

-- تسجيل رسالة في السجل
DO $$
BEGIN
  RAISE LOG 'تم تنظيف بيانات شركات التوصيل وتحديث الإعدادات بنجاح';
END $$; 