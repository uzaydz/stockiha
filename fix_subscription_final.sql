-- ===== الحل النهائي لمشكلة الاشتراك =====
-- تشغيل هذا الكود مرة واحدة لإصلاح المشكلة نهائياً

-- الخطوة 1: التحقق من الوضع الحالي
SELECT 
    '🔍 الوضع الحالي' as step,
    o.id as org_id,
    o.name as org_name,
    o.subscription_status,
    o.subscription_id,
    o.subscription_tier,
    COUNT(os.id) as active_subscriptions
FROM organizations o
LEFT JOIN organization_subscriptions os ON o.id = os.organization_id AND os.status = 'active'
WHERE o.id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
GROUP BY o.id, o.name, o.subscription_status, o.subscription_id, o.subscription_tier;

-- الخطوة 2: العثور على الاشتراك النشط
WITH active_sub AS (
    SELECT 
        os.id,
        os.organization_id,
        os.status,
        os.end_date,
        sp.code as plan_code
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE os.organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
    AND os.status = 'active'
    AND os.end_date >= NOW()
    ORDER BY os.created_at DESC
    LIMIT 1
)
SELECT 
    '📋 الاشتراك النشط' as step,
    * 
FROM active_sub;

-- الخطوة 3: إصلاح بيانات المؤسسة
WITH active_sub AS (
    SELECT 
        os.id,
        os.organization_id,
        os.status,
        sp.code as plan_code
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE os.organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
    AND os.status = 'active'
    AND os.end_date >= NOW()
    ORDER BY os.created_at DESC
    LIMIT 1
)
UPDATE organizations 
SET 
    subscription_id = active_sub.id,
    subscription_status = 'active',
    subscription_tier = active_sub.plan_code,
    updated_at = NOW()
FROM active_sub
WHERE organizations.id = active_sub.organization_id;

-- الخطوة 4: التحقق من النتيجة
SELECT 
    '✅ النتيجة النهائية' as step,
    o.id as org_id,
    o.name as org_name,
    o.subscription_status,
    o.subscription_id,
    o.subscription_tier,
    os.status as sub_status,
    os.end_date,
    sp.name as plan_name,
    CASE 
        WHEN o.subscription_id IS NOT NULL AND os.status = 'active' AND os.end_date >= NOW() 
        THEN '🎉 تم الإصلاح بنجاح'
        ELSE '⚠️ يحتاج فحص إضافي'
    END as result_status
FROM organizations o
LEFT JOIN organization_subscriptions os ON o.subscription_id = os.id
LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE o.id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- رسالة الإرشادات
SELECT 
    '📱 الخطوات التالية' as title,
    'بعد تشغيل هذا الكود:' as instruction,
    '1️⃣ امسح الكاش من المتصفح (Ctrl+Shift+R)' as step1,
    '2️⃣ أو اذهب لوضع التصفح المخفي' as step2,
    '3️⃣ أعد تحميل صفحة الاشتراكات' as step3,
    '4️⃣ يجب أن تظهر معلومات الاشتراك النشط' as step4; 