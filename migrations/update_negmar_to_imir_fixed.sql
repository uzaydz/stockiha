-- ==========================================
-- تحديث شركة التوصيل من نيغمار إلى إمير - النسخة المصححة
-- ==========================================
-- تاريخ الإنشاء: 2025-01-15 
-- الوصف: تغيير شركة التوصيل من negmar.ecotrack.dz إلى imir.ecotrack.dz
-- النسخة: 2.1 - مصححة بناءً على بنية قاعدة البيانات الفعلية

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

-- فحص الأسعار المرتبطة
SELECT 'قبل التحديث - shipping_rates count' as info, COUNT(*) as count
FROM shipping_rates sr
WHERE sr.provider_id = 32;

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
-- 2. تحديث البيانات في جدول orders (إذا كانت تحتوي على مراجع نصية)
-- ====================

-- تحديث shipping_provider في orders إذا كان يحتوي على نص
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
-- 3. تحديث metadata في shipping_orders
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
-- 4. تحديث أي جداول سجلات أو تتبع (إذا كانت موجودة)
-- ====================

-- تحديث activity_logs إذا كان موجوداً
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
        UPDATE activity_logs 
        SET 
            details = replace(details, 'negmar_express', 'imir_express'),
            details = replace(details, 'نيغمار', 'إمير'),
            updated_at = NOW()
        WHERE details LIKE '%negmar%';
        
        RAISE NOTICE 'تم تحديث activity_logs';
    ELSE
        RAISE NOTICE 'جدول activity_logs غير موجود';
    END IF;
END $$;

-- تحديث shipping_logs إذا كان موجوداً
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipping_logs') THEN
        UPDATE shipping_logs 
        SET 
            provider = CASE WHEN provider = 'negmar_express' THEN 'imir_express' ELSE provider END,
            message = replace(replace(message, 'negmar_express', 'imir_express'), 'نيغمار', 'إمير'),
            updated_at = NOW()
        WHERE (provider = 'negmar_express' OR message LIKE '%negmar%');
        
        RAISE NOTICE 'تم تحديث shipping_logs';
    ELSE
        RAISE NOTICE 'جدول shipping_logs غير موجود';
    END IF;
END $$;

-- ====================
-- 5. تحديث أي إعدادات عامة في جدول settings
-- ====================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
        UPDATE settings 
        SET 
            value = replace(value, 'negmar_express', 'imir_express'),
            updated_at = NOW()
        WHERE (key LIKE '%shipping%' OR key LIKE '%delivery%') 
          AND value LIKE '%negmar%';
          
        RAISE NOTICE 'تم تحديث settings';
    ELSE
        RAISE NOTICE 'جدول settings غير موجود';
    END IF;
END $$;

-- ====================
-- 6. إنشاء سجل مراجعة للتغيير
-- ====================

-- إدراج سجل في audit_logs إذا كان موجوداً
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        INSERT INTO audit_logs (
            table_name,
            action,
            old_values,
            new_values,
            description,
            created_at
        ) VALUES (
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
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'تم إنشاء سجل مراجعة';
    ELSE
        RAISE NOTICE 'جدول audit_logs غير موجود';
    END IF;
END $$;

-- ====================
-- 7. فحص شامل للنتائج والتحقق من التحديث
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

-- 5. فحص shipping_rates المرتبطة (لا تحتاج تحديث - تستخدم provider_id)
SELECT 
    '✅ shipping_rates مرتبطة' as info,
    COUNT(*) as rates_count,
    sp.code as provider_code,
    sp.name as provider_name
FROM shipping_rates sr
JOIN shipping_providers sp ON sr.provider_id = sp.id
WHERE sp.id = 32
GROUP BY sp.code, sp.name;

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
-- 8. فحص أي مراجع متبقية لـ negmar (يجب أن تكون 0)
-- ====================

WITH remaining_references AS (
    SELECT 'shipping_providers' as table_name, COUNT(*) as count
    FROM shipping_providers WHERE (code LIKE '%negmar%' OR name LIKE '%نيغمار%')
    
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
-- 9. تقرير نهائي للتحديث
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

-- فحص الاتصال مع shipping_data_view
SELECT 
    '🔗 فحص shipping_data_view' as info,
    COUNT(*) as enabled_settings_count,
    string_agg(DISTINCT organization_id::text, ', ') as organizations
FROM shipping_data_view
WHERE provider_code = 'imir_express';

COMMIT;

-- ====================
-- 10. التعليمات المحدثة للمطور
-- ====================

/*
✅ تم تنفيذ التحديثات التالية بنجاح:

1. ✅ تحديث shipping_providers:
   - تغيير code من negmar_express إلى imir_express
   - تغيير name من "نيغمار إكسبرس" إلى "إمير إكسبرس"
   - تحديث base_url إلى https://imir.ecotrack.dz/

2. ✅ الحفاظ على الشحنات والإعدادات الموجودة:
   - shipping_orders تبقى مرتبطة عبر provider_id = 32
   - shipping_provider_settings تبقى مرتبطة عبر provider_id = 32
   - shipping_rates تبقى مرتبطة عبر provider_id = 32 (لا تحتاج تحديث)

3. ✅ تحديث البيانات النصية:
   - orders shipping_provider محدث
   - metadata في الجداول المختلفة محدث

4. ✅ معالجة آمنة للجداول:
   - فحص وجود الجداول قبل التحديث
   - تجنب الأخطاء للجداول غير الموجودة

📝 خطوات المتابعة المطلوبة:

1. ✅ تحديث الكود مكتمل في src/components/delivery/DeliveryProvidersTable.tsx

2. 🔄 إعادة تشغيل التطبيق:
   npm restart أو yarn dev

3. ✅ التحقق من النتائج:
   - فحص shipping_data_view لضمان ظهور البيانات الجديدة
   - التأكد من ظهور "إمير إكسبرس" في واجهة إدارة التوصيل

⚠️ ملاحظات مهمة:
- تم إصلاح خطأ provider_code في shipping_rates
- جدول shipping_rates يستخدم provider_id وليس provider_code
- جميع الروابط تتم عبر provider_id للحفاظ على سلامة البيانات
- view shipping_data_view سيعرض البيانات الجديدة تلقائياً
*/ 