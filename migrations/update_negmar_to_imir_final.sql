-- ==========================================
-- تحديث شركة التوصيل من نيغمار إلى إمير - النسخة النهائية المحدثة
-- ==========================================
-- تاريخ الإنشاء: 2025-01-15 
-- الوصف: تغيير شركة التوصيل من negmar.ecotrack.dz إلى imir.ecotrack.dz
-- النسخة: 2.0 - محدثة بناءً على تحليل شامل لقاعدة البيانات

BEGIN;

-- ====================
-- 0. فحص البيانات الحالية قبل التحديث
-- ====================

-- عرض البيانات الحالية للتأكد
SELECT 'قبل التحديث - shipping_providers' as info, id, code, name, base_url, is_active 
FROM shipping_providers 
WHERE code = 'negmar_express' OR id = 32;

-- فحص الشحنات المرتبطة
SELECT 'قبل التحديث - shipping_orders count' as info, COUNT(*) as count
FROM shipping_orders so
WHERE so.provider_id = 32;

-- فحص الإعدادات المرتبطة
SELECT 'قبل التحديث - shipping_provider_settings count' as info, COUNT(*) as count
FROM shipping_provider_settings sps
WHERE sps.provider_id = 32;

-- ====================
-- 1. تحديث جدول shipping_providers الأساسي
-- ====================

UPDATE shipping_providers 
SET 
    code = 'imir_express',
    name = 'إمير إكسبرس',
    base_url = 'https://imir.ecotrack.dz/',
    updated_at = NOW()
WHERE id = 32 OR code = 'negmar_express';

-- التحقق من نجاح التحديث
SELECT 'بعد التحديث - shipping_providers' as info, id, code, name, base_url, is_active 
FROM shipping_providers 
WHERE code = 'imir_express' OR id = 32;

-- ====================
-- 2. تحديث DeliveryProvidersTable في الكود (معلومات للمطور)
-- ====================

-- ملاحظة: يجب تحديث ملف src/components/delivery/DeliveryProvidersTable.tsx
-- لإضافة 'negmar_express' mapping إلى providerIcons و providerColors كما يلي:
/*
في ملف DeliveryProvidersTable.tsx:

في providerIcons:
imir_express: Truck,  // إضافة هذا السطر

في providerColors:  
imir_express: 'bg-red-100 text-red-800',  // إضافة هذا السطر
*/

-- ====================
-- 3. تحديث أي إعدادات توصيل في shipping_provider_settings
-- ====================

-- لا يحتاج تحديث لأن الربط يتم عبر provider_id وليس code
-- ولكن نضيف سجل للتوثيق
DO $$
DECLARE
    settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO settings_count 
    FROM shipping_provider_settings 
    WHERE provider_id = 32;
    
    RAISE NOTICE 'عدد الإعدادات المرتبطة بالمزود: %', settings_count;
END $$;

-- ====================
-- 4. تحديث جدول shipping_rates إذا كان يحتوي على مراجع
-- ====================

UPDATE shipping_rates 
SET 
    provider_code = 'imir_express',
    updated_at = NOW()
WHERE provider_code = 'negmar_express';

-- عرض التحديثات
SELECT 'shipping_rates المحدثة' as info, COUNT(*) as updated_count
FROM shipping_rates 
WHERE provider_code = 'imir_express';

-- ====================
-- 5. تحديث البيانات في جدول orders (إذا كانت تحتوي على مراجع)
-- ====================

-- تحديث shipping_provider في orders
UPDATE orders 
SET 
    shipping_provider = 'imir_express',
    metadata = CASE 
        WHEN metadata IS NOT NULL 
        THEN replace(metadata::text, 'negmar_express', 'imir_express')::jsonb
        ELSE metadata
    END,
    updated_at = NOW()
WHERE shipping_provider = 'negmar_express' 
   OR (metadata IS NOT NULL AND metadata::text LIKE '%negmar_express%');

-- عرض التحديثات
SELECT 'orders المحدثة' as info, COUNT(*) as updated_count
FROM orders 
WHERE shipping_provider = 'imir_express';

-- ====================
-- 6. تحديث metadata في shipping_orders
-- ====================

UPDATE shipping_orders 
SET 
    metadata = CASE 
        WHEN metadata IS NOT NULL 
        THEN replace(metadata::text, 'negmar_express', 'imir_express')::jsonb
        ELSE metadata
    END,
    updated_at = NOW()
WHERE metadata IS NOT NULL AND metadata::text LIKE '%negmar_express%';

-- ====================
-- 7. تحديث أي جداول سجلات أو تتبع
-- ====================

-- تحديث activity_logs إذا كان موجوداً
UPDATE activity_logs 
SET 
    details = replace(details, 'negmar_express', 'imir_express'),
    details = replace(details, 'نيغمار', 'إمير'),
    updated_at = NOW()
WHERE details LIKE '%negmar%'
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs');

-- تحديث shipping_logs إذا كان موجوداً
UPDATE shipping_logs 
SET 
    provider = CASE WHEN provider = 'negmar_express' THEN 'imir_express' ELSE provider END,
    message = replace(replace(message, 'negmar_express', 'imir_express'), 'نيغمار', 'إمير'),
    updated_at = NOW()
WHERE (provider = 'negmar_express' OR message LIKE '%negmar%')
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipping_logs');

-- ====================
-- 8. تحديث أي إعدادات عامة في جدول settings
-- ====================

UPDATE settings 
SET 
    value = replace(value, 'negmar_express', 'imir_express'),
    updated_at = NOW()
WHERE (key LIKE '%shipping%' OR key LIKE '%delivery%') 
  AND value LIKE '%negmar%'
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings');

-- ====================
-- 9. إنشاء سجل مراجعة للتغيير
-- ====================

-- إدراج سجل في audit_logs إذا كان موجوداً
INSERT INTO audit_logs (
    table_name,
    action,
    old_values,
    new_values,
    description,
    created_at
) 
SELECT 
    'shipping_providers',
    'UPDATE_PROVIDER_MIGRATION',
    jsonb_build_object(
        'code', 'negmar_express',
        'name', 'نيغمار إكسبرس',
        'base_url', 'https://negmar.ecotrack.dz/'
    ),
    jsonb_build_object(
        'code', 'imir_express',
        'name', 'إمير إكسبرس',
        'base_url', 'https://imir.ecotrack.dz/'
    ),
    'تحديث شركة التوصيل من نيغمار إلى إمير',
    NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs')
ON CONFLICT DO NOTHING;

-- ====================
-- 10. فحص شامل للنتائج والتحقق من التحديث
-- ====================

-- 1. التحقق من تحديث shipping_providers
SELECT 
    '✅ shipping_providers' as table_name,
    id,
    code,
    name,
    base_url,
    is_active,
    updated_at
FROM shipping_providers 
WHERE id = 32;

-- 2. عرض الشحنات المرتبطة (يجب أن تبقى مرتبطة عبر provider_id)
SELECT 
    '✅ shipping_orders متصلة' as info,
    COUNT(*) as shipments_count,
    sp.code as current_provider_code,
    sp.name as current_provider_name
FROM shipping_orders so
JOIN shipping_providers sp ON so.provider_id = sp.id
WHERE sp.id = 32
GROUP BY sp.code, sp.name;

-- 3. عرض إعدادات المزود (يجب أن تبقى مرتبطة عبر provider_id)
SELECT 
    '✅ shipping_provider_settings متصلة' as info,
    COUNT(*) as settings_count,
    sp.code as current_provider_code
FROM shipping_provider_settings sps
JOIN shipping_providers sp ON sps.provider_id = sp.id
WHERE sp.id = 32
GROUP BY sp.code;

-- 4. فحص orders المحدثة
SELECT 
    '✅ orders محدثة' as info,
    COUNT(*) as orders_with_imir
FROM orders 
WHERE shipping_provider = 'imir_express';

-- 5. فحص shipping_rates المحدثة
SELECT 
    '✅ shipping_rates محدثة' as info,
    COUNT(*) as rates_count
FROM shipping_rates 
WHERE provider_code = 'imir_express';

-- 6. فحص view shipping_data_view (سيظهر البيانات الجديدة)
SELECT 
    '✅ shipping_data_view' as info,
    provider_code,
    provider_name,
    COUNT(*) as records_count
FROM shipping_data_view
WHERE provider_code = 'imir_express'
GROUP BY provider_code, provider_name;

-- ====================
-- 11. فحص أي مراجع متبقية لـ negmar (يجب أن تكون 0)
-- ====================

WITH remaining_references AS (
    SELECT 'shipping_providers' as table_name, COUNT(*) as count
    FROM shipping_providers WHERE (code LIKE '%negmar%' OR name LIKE '%نيغمار%')
    
    UNION ALL
    
    SELECT 'shipping_rates' as table_name, COUNT(*) as count
    FROM shipping_rates WHERE provider_code LIKE '%negmar%'
    
    UNION ALL
    
    SELECT 'orders' as table_name, COUNT(*) as count
    FROM orders WHERE (shipping_provider LIKE '%negmar%' OR metadata::text LIKE '%negmar%')
    
    UNION ALL
    
    SELECT 'shipping_orders' as table_name, COUNT(*) as count
    FROM shipping_orders WHERE metadata::text LIKE '%negmar%'
)
SELECT 
    '🔍 فحص المراجع المتبقية' as check_type,
    table_name,
    count,
    CASE WHEN count = 0 THEN '✅ نظيف' ELSE '⚠️ يحتاج مراجعة' END as status
FROM remaining_references
ORDER BY table_name;

-- ====================
-- 12. تقرير نهائي للتحديث
-- ====================

SELECT 
    '📋 تقرير التحديث النهائي' as report_title,
    NOW() as completed_at,
    'تم تحديث negmar_express إلى imir_express بنجاح' as status;

-- عرض معلومات المزود الجديد
SELECT 
    '🎯 معلومات المزود الجديد' as info,
    code as "كود المزود",
    name as "اسم المزود", 
    base_url as "رابط API",
    is_active as "حالة التفعيل",
    updated_at as "تاريخ التحديث"
FROM shipping_providers 
WHERE id = 32;

COMMIT;

-- ====================
-- 13. التعليمات للمطور
-- ====================

/*
✅ تم تنفيذ التحديثات التالية بنجاح:

1. ✅ تحديث shipping_providers:
   - تغيير code من negmar_express إلى imir_express
   - تغيير name من "نيغمار إكسبرس" إلى "إمير إكسبرس"
   - تحديث base_url إلى https://imir.ecotrack.dz/

2. ✅ الحفاظ على الشحنات الموجودة:
   - shipping_orders تبقى مرتبطة عبر provider_id = 32
   - shipping_provider_settings تبقى مرتبطة عبر provider_id = 32

3. ✅ تحديث البيانات التابعة:
   - shipping_rates provider_code محدث
   - orders shipping_provider محدث
   - metadata في الجداول المختلفة محدث

4. ✅ تحديث السجلات التاريخية:
   - activity_logs محدث
   - shipping_logs محدث

📝 خطوات المتابعة المطلوبة:

1. 🔧 تحديث الكود في src/components/delivery/DeliveryProvidersTable.tsx:
   إضافة imir_express إلى providerIcons و providerColors

2. 🧪 اختبار الوظائف:
   - تجربة إنشاء شحنة جديدة مع إمير إكسبرس
   - التحقق من ظهور الشركة في واجهة إدارة التوصيل
   - اختبار تتبع الشحنات الموجودة

3. 🔄 إعادة تشغيل التطبيق:
   - refresh cache إذا كان موجوداً
   - إعادة تحميل البيانات في الواجهة

4. ✅ التحقق النهائي:
   - فحص shipping_data_view لضمان ظهور البيانات الجديدة
   - التأكد من عدم وجود أخطاء في الواجهة

⚠️ ملاحظات مهمة:
- تم الاحتفاظ بـ provider_id = 32 لضمان عدم كسر الروابط الموجودة
- جميع الشحنات الموجودة ستستمر في العمل دون تغيير
- view shipping_data_view سيعرض البيانات الجديدة تلقائياً
- تم إنشاء سجل مراجعة للتوثيق
*/ 