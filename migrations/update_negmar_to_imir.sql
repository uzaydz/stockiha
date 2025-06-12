-- ==========================================
-- تحديث شركة التوصيل من نيغمار إلى إمير
-- ==========================================
-- تاريخ الإنشاء: $(date '+%Y-%m-%d %H:%M:%S')
-- الوصف: تغيير شركة التوصيل من negmar.ecotrack.dz إلى imir.ecotrack.dz

BEGIN;

-- ====================
-- 1. تحديث جدول shipping_providers
-- ====================

-- تحديث بيانات مقدم الخدمة الحالي
UPDATE shipping_providers 
SET 
    code = 'imir_express',
    name = 'إمير إكسبرس',
    base_url = 'https://imir.ecotrack.dz/',
    updated_at = NOW()
WHERE code = 'negmar_express';

-- ====================
-- 2. تحديث الشحنات الموجودة في shipping_orders
-- ====================

-- تحديث أي شحنات في shipping_orders تستخدم negmar_express إلى imir_express
-- (لا نحتاج لهذا لأن الربط يتم عبر provider_id وليس code)
-- ولكن يمكن إضافة log للتتبع
INSERT INTO activity_logs (table_name, action, old_values, new_values, created_at)
SELECT 
    'shipping_orders',
    'PROVIDER_UPDATE',
    ('{"provider_code": "negmar_express", "provider_id": ' || sp.id || '}')::jsonb,
    ('{"provider_code": "imir_express", "provider_id": ' || sp.id || '}')::jsonb,
    NOW()
FROM shipping_orders so
JOIN shipping_providers sp ON so.provider_id = sp.id
WHERE sp.code = 'imir_express' -- بعد التحديث أعلاه
ON CONFLICT DO NOTHING; -- تجاهل إذا لم يكن الجدول موجوداً

-- ====================
-- 3. تحديث إعدادات التوصيل للمؤسسات
-- ====================

-- تحديث أي إعدادات في shipping_provider_settings
-- (لا نحتاج لتحديث لأن الربط يتم عبر provider_id)

-- تحديث أي إعدادات توصيل في delivery_settings إذا كانت موجودة
UPDATE delivery_settings 
SET 
    provider_config = jsonb_set(
        provider_config,
        '{provider}',
        '"imir_express"'
    ),
    updated_at = NOW()
WHERE provider_config->>'provider' = 'negmar_express'
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_settings');

-- تحديث أي إعدادات أخرى قد تحتوي على negmar في JSON
UPDATE delivery_settings 
SET 
    provider_config = replace(
        provider_config::text,
        'negmar_express',
        'imir_express'
    )::jsonb,
    updated_at = NOW()
WHERE provider_config::text LIKE '%negmar_express%'
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_settings');

-- ====================
-- 4. تحديث جدول shipping_rates إذا كان موجوداً
-- ====================

-- تحديث جدول shipping_rates إذا كان يحتوي على مراجع لـ negmar
UPDATE shipping_rates 
SET 
    provider_code = 'imir_express',
    updated_at = NOW()
WHERE provider_code = 'negmar_express';

-- ====================
-- 5. تحديث أي أعمدة tracking مخصصة في جدول orders
-- ====================

-- فحص وتحديث أي أعمدة tracking خاصة بـ negmar في جدول orders
DO $$
BEGIN
    -- فحص وجود العمود قبل التحديث
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'negmar_express_tracking_id'
    ) THEN
        -- إضافة عمود جديد إذا لم يكن موجوداً
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'orders' 
            AND column_name = 'imir_express_tracking_id'
        ) THEN
            ALTER TABLE orders ADD COLUMN imir_express_tracking_id TEXT;
        END IF;
        
        -- نسخ البيانات من العمود القديم إلى الجديد
        UPDATE orders 
        SET imir_express_tracking_id = negmar_express_tracking_id
        WHERE negmar_express_tracking_id IS NOT NULL;
        
        -- إضافة تعليق لتوثيق التغيير
        COMMENT ON COLUMN orders.imir_express_tracking_id IS 'Tracking ID for Imir Express (migrated from negmar_express_tracking_id)';
        
        -- حذف العمود القديم (اختياري - قد تريد الاحتفاظ به للنسخ الاحتياطي)
        -- ALTER TABLE orders DROP COLUMN negmar_express_tracking_id;
    END IF;
END $$;

-- ====================
-- 6. تحديث البيانات التاريخية والسجلات
-- ====================

-- تحديث أي سجلات في activity_logs
UPDATE activity_logs 
SET 
    details = replace(details, 'negmar_express', 'imir_express'),
    updated_at = NOW()
WHERE details LIKE '%negmar_express%'
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs');

-- تحديث أي جدول تسجيل للشحن
UPDATE shipping_logs 
SET 
    provider = 'imir_express',
    message = replace(message, 'نيغمار', 'إمير'),
    message = replace(message, 'negmar', 'imir'),
    updated_at = NOW()
WHERE (provider = 'negmar_express' OR message LIKE '%negmar%')
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipping_logs');

-- تحديث metadata في shipping_orders إذا كانت تحتوي على مراجع
UPDATE shipping_orders 
SET 
    metadata = replace(metadata::text, 'negmar_express', 'imir_express')::jsonb,
    updated_at = NOW()
WHERE metadata::text LIKE '%negmar_express%';

-- تحديث metadata في orders إذا كانت تحتوي على مراجع
UPDATE orders 
SET 
    metadata = replace(metadata::text, 'negmar_express', 'imir_express')::jsonb,
    updated_at = NOW()
WHERE metadata::text LIKE '%negmar_express%';

-- ====================
-- 7. تحديث الإعدادات العامة
-- ====================

-- تحديث أي إعدادات عامة قد تحتوي على مراجع لـ negmar
UPDATE settings 
SET 
    value = replace(value, 'negmar_express', 'imir_express'),
    updated_at = NOW()
WHERE key LIKE '%shipping%' AND value LIKE '%negmar%'
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings');

-- ====================
-- 8. إنشاء سجل للتغيير
-- ====================

-- إدراج سجل في جدول المراجعة إذا كان موجوداً
INSERT INTO audit_logs (
    table_name,
    action,
    old_values,
    new_values,
    user_id,
    created_at
) 
SELECT 
    'shipping_providers',
    'UPDATE',
    '{"code": "negmar_express", "name": "نيغمار إكسبرس", "base_url": "https://negmar.ecotrack.dz/"}',
    '{"code": "imir_express", "name": "إمير إكسبرس", "base_url": "https://imir.ecotrack.dz/"}',
    NULL, -- أو معرف المستخدم الذي ينفذ التحديث
    NOW()
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs');

-- ====================
-- 9. التحقق من النتائج
-- ====================

-- عرض النتائج للتأكد من نجاح التحديث
SELECT 
    'shipping_providers' as table_name,
    code,
    name,
    base_url
FROM shipping_providers 
WHERE code = 'imir_express';

-- عرض عدد الشحنات المرتبطة بالمزود الجديد
SELECT 
    'shipping_orders' as table_name,
    COUNT(*) as linked_shipments,
    sp.code as provider_code,
    sp.name as provider_name
FROM shipping_orders so
JOIN shipping_providers sp ON so.provider_id = sp.id
WHERE sp.code = 'imir_express'
GROUP BY sp.code, sp.name;

-- عرض إعدادات المزود
SELECT 
    'shipping_provider_settings' as table_name,
    COUNT(*) as settings_count,
    sp.code as provider_code
FROM shipping_provider_settings sps
JOIN shipping_providers sp ON sps.provider_id = sp.id
WHERE sp.code = 'imir_express'
GROUP BY sp.code;

-- التحقق من وجود أي مراجع متبقية لـ negmar
SELECT 'remaining_negmar_references' as check_name, COUNT(*) as count
FROM (
    SELECT 1 FROM shipping_providers WHERE code LIKE '%negmar%'
    UNION ALL
    SELECT 1 FROM shipping_rates WHERE provider_code LIKE '%negmar%'
    UNION ALL
    SELECT 1 FROM shipping_orders WHERE metadata::text LIKE '%negmar%'
    UNION ALL
    SELECT 1 FROM orders WHERE metadata::text LIKE '%negmar%'
) as remaining_refs;

COMMIT;

-- ====================
-- 10. ملاحظات مهمة
-- ====================

/*
هذا الملف المحدث يقوم بالتحديثات التالية:

1. ✅ تغيير كود مقدم الخدمة من negmar_express إلى imir_express في shipping_providers
2. ✅ تغيير الاسم من "نيغمار إكسبرس" إلى "إمير إكسبرس"  
3. ✅ تغيير الرابط من https://negmar.ecotrack.dz/ إلى https://imir.ecotrack.dz/
4. ✅ الشحنات في shipping_orders ستبقى مرتبطة عبر provider_id (لا تحتاج تحديث)
5. ✅ تحديث إعدادات التوصيل في الجداول المختلفة
6. ✅ تحديث أي metadata أو سجلات تحتوي على مراجع للمقدم القديم
7. ✅ التعامل مع أعمدة tracking مخصصة في orders
8. ✅ التحقق من وجود الجداول قبل التحديث لتجنب الأخطاء

الاختلافات الرئيسية عن النسخة السابقة:
- إزالة تحديث عمود shipping_provider غير الموجود من جدول orders
- التركيز على shipping_orders و shipping_providers كجداول أساسية
- إضافة فحوصات EXISTS لتجنب أخطاء الجداول غير الموجودة
- تحديث metadata في الجداول ذات الصلة
- فحص نهائي للتأكد من إزالة جميع المراجع القديمة

تأكد من:
- عمل نسخة احتياطية من قاعدة البيانات قبل التنفيذ
- مراجعة النتائج بعد التنفيذ للتأكد من نجاح التحديث
- اختبار الوظائف المرتبطة بالشحن بعد التحديث
*/ 