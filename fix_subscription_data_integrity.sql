-- إصلاح تكامل بيانات الاشتراكات
-- حل مشكلة المؤسسات التي لديها subscription_status = 'active' بدون اشتراك فعلي

-- 1. تحديد المؤسسات التي لديها مشاكل في بيانات الاشتراك
-- أ) المؤسسات التي لديها subscription_status = 'active' ولكن subscription_id = NULL
-- ب) المؤسسات التي لديها subscription_id ولكن لا يوجد اشتراك نشط مطابق

-- عرض المؤسسات المتأثرة أولاً
SELECT 'المؤسسات التي لديها حالة نشطة بدون اشتراك فعلي:' as description;

SELECT 
  o.id,
  o.name,
  o.subscription_status,
  o.subscription_tier,
  o.subscription_id,
  o.created_at
FROM organizations o
LEFT JOIN organization_subscriptions os ON os.organization_id = o.id AND os.status = 'active'
WHERE o.subscription_status = 'active' 
  AND os.id IS NULL
ORDER BY o.created_at DESC;

-- 2. إصلاح المؤسسات التي لديها subscription_status = 'active' بدون اشتراك فعلي
-- تحويلها إلى الفترة التجريبية إذا كانت حديثة (أقل من 5 أيام) أو إلى inactive

UPDATE organizations
SET 
  subscription_status = CASE 
    -- إذا كانت المؤسسة تم إنشاؤها منذ أقل من 5 أيام، اجعلها trial
    WHEN created_at > NOW() - INTERVAL '5 days' THEN 'trial'
    -- وإلا اجعلها غير نشطة
    ELSE 'inactive'
  END,
  subscription_tier = CASE 
    WHEN created_at > NOW() - INTERVAL '5 days' THEN 'trial'
    ELSE 'free'
  END,
  subscription_id = NULL
WHERE subscription_status = 'active' 
  AND subscription_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_subscriptions os 
    WHERE os.organization_id = organizations.id AND os.status = 'active'
  );

-- 3. إصلاح المؤسسات التي لديها subscription_id ولكن الاشتراك غير موجود أو غير نشط
UPDATE organizations
SET 
  subscription_status = CASE 
    WHEN created_at > NOW() - INTERVAL '5 days' THEN 'trial'
    ELSE 'inactive'
  END,
  subscription_tier = CASE 
    WHEN created_at > NOW() - INTERVAL '5 days' THEN 'trial'
    ELSE 'free'
  END,
  subscription_id = NULL
WHERE subscription_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_subscriptions os 
    WHERE os.id = organizations.subscription_id AND os.status = 'active'
  );

-- 4. تحديث المؤسسات التي لديها اشتراكات نشطة ولكن البيانات غير محدثة
UPDATE organizations
SET 
  subscription_id = os.id,
  subscription_status = 'active',
  subscription_tier = sp.code
FROM organization_subscriptions os
JOIN subscription_plans sp ON sp.id = os.plan_id
WHERE organizations.id = os.organization_id
  AND os.status = 'active'
  AND os.end_date > NOW()
  AND (
    organizations.subscription_id IS NULL 
    OR organizations.subscription_id != os.id
    OR organizations.subscription_status != 'active'
  );

-- 5. إصلاح الاشتراكات المنتهية الصلاحية
UPDATE organizations
SET 
  subscription_status = 'expired',
  subscription_tier = 'free'
WHERE subscription_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM organization_subscriptions os 
    WHERE os.id = organizations.subscription_id 
      AND os.status = 'active'
      AND os.end_date <= NOW()
  );

-- 6. تحديث حالة الاشتراكات المنتهية في جدول organization_subscriptions
UPDATE organization_subscriptions
SET status = 'expired'
WHERE status = 'active' AND end_date <= NOW();

-- 7. عرض النتائج بعد الإصلاح
SELECT 'النتائج بعد الإصلاح:' as description;

SELECT 
  subscription_status,
  subscription_tier,
  COUNT(*) as count
FROM organizations
GROUP BY subscription_status, subscription_tier
ORDER BY subscription_status, subscription_tier;

-- 8. عرض المؤسسات التي لا تزال لديها مشاكل (إن وجدت)
SELECT 'المؤسسات التي لا تزال لديها مشاكل:' as description;

SELECT 
  o.id,
  o.name,
  o.subscription_status,
  o.subscription_tier,
  o.subscription_id,
  os.id as actual_subscription_id,
  os.status as actual_status,
  os.end_date
FROM organizations o
LEFT JOIN organization_subscriptions os ON os.id = o.subscription_id
WHERE (
  (o.subscription_status = 'active' AND (o.subscription_id IS NULL OR os.id IS NULL))
  OR
  (o.subscription_status = 'active' AND os.status != 'active')
  OR
  (o.subscription_status = 'active' AND os.end_date <= NOW())
)
ORDER BY o.created_at DESC; 