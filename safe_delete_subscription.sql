-- ===== حذف آمن لاشتراك العميل =====
-- يتعامل مع القيود الفريدة بذكاء

-- تحديد البريد الإلكتروني للعميل
-- غير البريد الإلكتروني هنا إذا لزم الأمر:
-- 'uzayduz330i30@gmail.com'

-- الخطوة 1: الحصول على معرفات العميل
WITH customer_info AS (
    SELECT 
        u.organization_id,
        o.subscription_id,
        o.name as org_name,
        u.email
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    WHERE u.email = 'uzayduz330i30@gmail.com'
),

-- الخطوة 2: حذف أي اشتراكات expired موجودة لنفس المؤسسة (لتجنب التضارب)
delete_existing_expired AS (
    DELETE FROM organization_subscriptions 
    WHERE organization_id IN (SELECT organization_id FROM customer_info)
      AND status = 'expired'
      AND id NOT IN (SELECT subscription_id FROM customer_info WHERE subscription_id IS NOT NULL)
    RETURNING id as deleted_id
),

-- الخطوة 3: تحديث الاشتراك الحالي إلى expired
update_current AS (
    UPDATE organization_subscriptions 
    SET status = 'expired'
    WHERE id IN (SELECT subscription_id FROM customer_info WHERE subscription_id IS NOT NULL)
    RETURNING id as updated_id
)

-- عرض ما تم
SELECT 
    'تم حذف الاشتراكات المتضاربة' as action,
    COUNT(*) as count
FROM delete_existing_expired

UNION ALL

SELECT 
    'تم تحديث الاشتراك الحالي' as action,
    COUNT(*) as count
FROM update_current;

-- الخطوة 4: تحديث المؤسسة
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

-- التحقق من النتيجة النهائية
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

-- عرض جميع اشتراكات هذه المؤسسة للتأكد
SELECT 
    '📊 جميع اشتراكات المؤسسة' as info,
    os.id,
    os.status,
    os.start_date,
    os.end_date,
    sp.name as plan_name,
    CASE 
        WHEN os.id = o.subscription_id THEN '👈 الاشتراك المرتبط'
        ELSE ''
    END as linked_status
FROM organization_subscriptions os
JOIN subscription_plans sp ON os.plan_id = sp.id
JOIN organizations o ON os.organization_id = o.id
WHERE os.organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE email = 'uzayduz330i30@gmail.com'
)
ORDER BY os.created_at DESC;

-- رسالة نجاح
SELECT '🎉 تم حذف الاشتراك بنجاح وحل جميع التضاربات!' as message; 