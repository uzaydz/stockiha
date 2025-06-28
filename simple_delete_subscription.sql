-- ===== حذف بسيط لاشتراك العميل =====
-- ملف بسيط جداً بدون تعقيدات

-- تحديد البريد الإلكتروني للعميل المراد حذف اشتراكه
-- غير البريد الإلكتروني هنا:
-- 'uzayduz330i30@gmail.com'

-- الحصول على معرفات العميل
WITH customer_info AS (
    SELECT 
        u.organization_id,
        o.subscription_id,
        o.name as org_name
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    WHERE u.email = 'uzayduz330i30@gmail.com'
)

-- تحديث الاشتراك إلى ملغي (لتجنب مشكلة التكرار)
UPDATE organization_subscriptions 
SET status = 'canceled'
WHERE id IN (SELECT subscription_id FROM customer_info);

-- تحديث المؤسسة
WITH customer_info AS (
    SELECT 
        u.organization_id,
        o.subscription_id,
        o.name as org_name
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    WHERE u.email = 'uzayduz330i30@gmail.com'
)

UPDATE organizations
SET 
    subscription_id = NULL,
    subscription_tier = 'free',
    subscription_status = 'expired'
WHERE id IN (SELECT organization_id FROM customer_info);

-- التحقق من النتيجة
SELECT 
    '✅ النتيجة النهائية' as status,
    o.id as organization_id,
    o.name as organization_name,
    o.subscription_status,
    o.subscription_tier,
    o.subscription_id,
    u.email,
    CASE 
        WHEN o.subscription_id IS NULL THEN '🆓 جاهز لتفعيل كود جديد'
        ELSE '⚠️ لا يزال لديه اشتراك'
    END as ready_for_activation
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'uzayduz330i30@gmail.com';

-- رسالة نجاح
SELECT '🎉 تم حذف الاشتراك بنجاح - العميل جاهز لتفعيل كود جديد!' as message; 