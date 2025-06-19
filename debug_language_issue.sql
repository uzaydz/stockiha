-- ملف تشخيص مشكلة اللغة الافتراضية
-- هذا الملف يساعد في فهم وحل مشكلة عدم حفظ اللغة الافتراضية

-- =======================
-- 1. فحص الوضع الحالي
-- =======================

-- عرض آخر 10 إعدادات مؤسسات مع اللغة الافتراضية
SELECT 
    os.organization_id,
    o.name as organization_name,
    o.subdomain,
    os.default_language,
    os.site_name,
    os.updated_at,
    CASE 
        WHEN os.default_language = 'ar' THEN '🇸🇦 عربي'
        WHEN os.default_language = 'en' THEN '🇺🇸 إنجليزي'  
        WHEN os.default_language = 'fr' THEN '🇫🇷 فرنسي'
        ELSE '❓ غير محدد'
    END as language_display
FROM organization_settings os
LEFT JOIN organizations o ON o.id = os.organization_id
ORDER BY os.updated_at DESC
LIMIT 10;

-- =======================
-- 2. اختبار تحديث اللغة
-- =======================

-- اختبار تحديث لغة مؤسسة معينة (استبدل بـ organization_id الحقيقي)
/*
UPDATE organization_settings 
SET default_language = 'en', updated_at = NOW() 
WHERE organization_id = 'YOUR_ORGANIZATION_ID_HERE'
RETURNING organization_id, default_language, site_name, updated_at;
*/

-- =======================
-- 3. فحص المشاكل المحتملة
-- =======================

-- البحث عن إعدادات بدون لغة افتراضية
SELECT 
    organization_id,
    site_name,
    default_language,
    'لا توجد لغة افتراضية' as issue
FROM organization_settings 
WHERE default_language IS NULL 
   OR default_language = '';

-- البحث عن لغات غير صحيحة
SELECT 
    organization_id,
    site_name,
    default_language,
    'لغة غير مدعومة' as issue
FROM organization_settings 
WHERE default_language NOT IN ('ar', 'en', 'fr')
  AND default_language IS NOT NULL;

-- =======================
-- 4. إصلاح البيانات الخاطئة
-- =======================

-- إصلاح اللغات غير الصحيحة
UPDATE organization_settings 
SET default_language = 'ar'
WHERE default_language IS NULL 
   OR default_language = ''
   OR default_language NOT IN ('ar', 'en', 'fr');

-- =======================
-- 5. اختبار الدوال المخصصة
-- =======================

-- اختبار دالة الحصول على اللغة الافتراضية
/*
SELECT get_organization_default_language('YOUR_ORGANIZATION_ID_HERE') as current_language;
*/

-- اختبار دالة تحديث اللغة الافتراضية
/*
SELECT update_organization_default_language('YOUR_ORGANIZATION_ID_HERE', 'en') as update_result;
*/

-- =======================
-- 6. فحص سجل التحديثات
-- =======================

-- عرض آخر التحديثات على الإعدادات
SELECT 
    organization_id,
    default_language,
    site_name,
    updated_at,
    updated_at - created_at as time_since_creation
FROM organization_settings 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- =======================
-- 7. إحصائيات اللغات
-- =======================

-- عرض توزيع اللغات في النظام
SELECT 
    default_language,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
    CASE 
        WHEN default_language = 'ar' THEN '🇸🇦 عربي'
        WHEN default_language = 'en' THEN '🇺🇸 إنجليزي'  
        WHEN default_language = 'fr' THEN '🇫🇷 فرنسي'
        ELSE '❓ غير محدد'
    END as language_display
FROM organization_settings 
GROUP BY default_language
ORDER BY count DESC;

-- =======================
-- 8. نصائح للاختبار اليدوي
-- =======================

/*
لاختبار المشكلة:

1. نفذ هذا الاستعلام لرؤية القيم الحالية:
   SELECT organization_id, default_language, site_name, updated_at 
   FROM organization_settings 
   WHERE organization_id = 'YOUR_ORG_ID';

2. غير اللغة في واجهة المستخدم

3. احفظ الإعدادات

4. نفذ نفس الاستعلام مرة أخرى لرؤية إذا تم التحديث

5. إذا لم يتم التحديث، تحقق من:
   - صلاحيات المستخدم
   - سجلات الأخطاء في المتصفح
   - سجلات قاعدة البيانات
*/ 