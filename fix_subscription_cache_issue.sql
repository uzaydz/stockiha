-- ===== إصلاح مشكلة الكاش بعد تفعيل الاشتراك =====
-- هذا الملف يضمن تزامن جميع البيانات بعد تفعيل كود جديد

-- الخطوة 1: التحقق من حالة التفعيل
SELECT 
    '🔍 فحص كود التفعيل' as step,
    ac.code,
    ac.status,
    ac.organization_id,
    ac.subscription_id,
    sp.name as plan_name
FROM activation_codes ac
JOIN subscription_plans sp ON ac.plan_id = sp.id
WHERE ac.code = '8A6X-F3BT-662G-8MJ3';

-- الخطوة 2: التحقق من الاشتراك المُنشأ
SELECT 
    '📋 الاشتراك المُنشأ' as step,
    os.id,
    os.organization_id,
    os.status,
    os.start_date,
    os.end_date,
    sp.name as plan_name,
    CASE 
        WHEN os.end_date >= NOW() THEN '✅ نشط'
        ELSE '❌ منتهي'
    END as validity
FROM organization_subscriptions os
JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE os.organization_id = (
    SELECT organization_id FROM users WHERE email = 'uzayduz330i30@gmail.com'
)
AND os.status = 'active'
ORDER BY os.created_at DESC
LIMIT 1;

-- الخطوة 3: التحقق من حالة المؤسسة
SELECT 
    '🏢 حالة المؤسسة' as step,
    o.id,
    o.name,
    o.subscription_status,
    o.subscription_tier,
    o.subscription_id,
    CASE 
        WHEN o.subscription_id IS NOT NULL THEN '✅ مرتبط'
        ELSE '❌ غير مرتبط'
    END as link_status
FROM organizations o
WHERE o.id = (
    SELECT organization_id FROM users WHERE email = 'uzayduz330i30@gmail.com'
);

-- الخطوة 4: إصلاح أي عدم تزامن
WITH latest_subscription AS (
    SELECT 
        os.id,
        os.organization_id,
        os.status,
        sp.code as plan_code
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE os.organization_id = (
        SELECT organization_id FROM users WHERE email = 'uzayduz330i30@gmail.com'
    )
    AND os.status = 'active'
    AND os.end_date >= NOW()
    ORDER BY os.created_at DESC
    LIMIT 1
)

UPDATE organizations 
SET 
    subscription_id = ls.id,
    subscription_tier = ls.plan_code,
    subscription_status = ls.status
FROM latest_subscription ls
WHERE organizations.id = ls.organization_id
AND (
    organizations.subscription_id IS NULL 
    OR organizations.subscription_id != ls.id
    OR organizations.subscription_status != ls.status
    OR organizations.subscription_tier != ls.plan_code
);

-- الخطوة 5: التحقق من النتيجة النهائية
SELECT 
    '✅ النتيجة النهائية' as step,
    o.id as organization_id,
    o.name as organization_name,
    o.subscription_status,
    o.subscription_tier,
    o.subscription_id,
    u.email,
    os.end_date,
    sp.name as plan_name,
    CASE 
        WHEN o.subscription_id IS NOT NULL AND os.status = 'active' AND os.end_date >= NOW() 
        THEN '🎉 الاشتراك نشط ومتزامن'
        ELSE '⚠️ يحتاج إصلاح إضافي'
    END as final_status
FROM users u
JOIN organizations o ON u.organization_id = o.id
LEFT JOIN organization_subscriptions os ON o.subscription_id = os.id
LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE u.email = 'uzayduz330i30@gmail.com';

-- الخطوة 6: إنشاء دالة لحذف الكاش (للفرونت إند)
DO $$
BEGIN
    RAISE NOTICE '🧹 تنظيف الكاش:';
    RAISE NOTICE '1. قم بحذف localStorage في المتصفح';
    RAISE NOTICE '2. أو اضغط Ctrl+Shift+R لإعادة تحميل قوية';
    RAISE NOTICE '3. أو امسح cookies للموقع';
    RAISE NOTICE '4. أو استخدم وضع التصفح المخفي';
    RAISE NOTICE '✨ هذا سيحل مشكلة عدم ظهور الاشتراك في الفرونت إند';
END;
$$;

-- رسالة الإرشادات
SELECT 
    '📱 إرشادات إصلاح مشكلة الفرونت إند' as title,
    'قم بأحد الإجراءات التالية في المتصفح:' as instruction,
    '1️⃣ اضغط F12 > Application > Storage > Clear storage' as step1,
    '2️⃣ أو اضغط Ctrl+Shift+Delete واحذف البيانات' as step2,
    '3️⃣ أو اضغط Ctrl+Shift+R لإعادة تحميل قوية' as step3,
    '4️⃣ أو استخدم وضع التصفح المخفي للاختبار' as step4;