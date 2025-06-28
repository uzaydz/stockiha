-- إصلاح فوري لجميع الاشتراكات المنتهية الصلاحية
-- تاريخ الإنشاء: 2025-06-28

-- 1. تحديث حالة الاشتراكات المنتهية في جدول organization_subscriptions
UPDATE organization_subscriptions 
SET 
    status = 'expired',
    updated_at = NOW()
WHERE status IN ('trial', 'active') 
AND end_date < NOW();

-- 2. تحديث حالة المنظمات التي لديها اشتراكات منتهية
UPDATE organizations 
SET 
    subscription_status = 'expired',
    subscription_tier = 'free',
    subscription_id = NULL,
    updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT o.id 
    FROM organizations o
    LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
    WHERE os.end_date < NOW() 
    AND o.subscription_status IN ('active', 'trial')
);

-- 3. عرض إحصائيات بعد الإصلاح
SELECT 'إحصائيات الاشتراكات بعد الإصلاح:' as message;

SELECT 
    status,
    COUNT(*) as count,
    ROUND(AVG(EXTRACT(DAYS FROM (NOW() - end_date))), 2) as avg_days_expired
FROM organization_subscriptions 
WHERE status = 'expired'
GROUP BY status;

-- 4. عرض إحصائيات المنظمات بعد الإصلاح  
SELECT 'إحصائيات المنظمات بعد الإصلاح:' as message;

SELECT 
    subscription_status,
    subscription_tier,
    COUNT(*) as count
FROM organizations
GROUP BY subscription_status, subscription_tier
ORDER BY subscription_status, subscription_tier;

-- 5. عرض المنظمات التي لا تزال لديها مشاكل (للتحقق)
SELECT 'المنظمات التي لا تزال لديها مشاكل:' as message;

SELECT 
    o.id,
    o.name,
    o.subscription_status,
    o.subscription_tier,
    os.status as actual_subscription_status,
    os.end_date,
    EXTRACT(DAYS FROM (NOW() - os.end_date)) as days_expired
FROM organizations o
LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
WHERE (
    (o.subscription_status IN ('active', 'trial') AND os.end_date < NOW())
    OR
    (o.subscription_status IN ('active', 'trial') AND os.id IS NULL)
)
ORDER BY days_expired DESC
LIMIT 10; 