-- اختبار حساب الأيام المتبقية للمؤسسة: ousslsls70 (testfinalfinal054)
-- معرف المؤسسة: 6525ed69-4dea-4dd2-b00b-4756d4dd980a
-- البريد الإلكتروني: uza4yd8z330930@gmail.com

-- 1. فحص بيانات المؤسسة الأساسية
SELECT 
  o.id,
  o.name,
  o.subdomain,
  o.subscription_status,
  o.subscription_tier,
  o.created_at,
  o.updated_at,
  o.settings,
  (o.settings->>'trial_end_date')::timestamp as trial_end_date,
  NOW() as current_time
FROM organizations o
WHERE o.id = '6525ed69-4dea-4dd2-b00b-4756d4dd980a';

-- 2. فحص الاشتراكات النشطة للمؤسسة
SELECT 
  s.id,
  s.organization_id,
  s.plan_id,
  s.status,
  s.start_date,
  s.end_date,
  s.billing_cycle,
  s.created_at,
  s.updated_at,
  EXTRACT(DAY FROM (s.end_date - NOW())) as subscription_days_left,
  p.name as plan_name,
  p.code as plan_code
FROM organization_subscriptions s
LEFT JOIN subscription_plans p ON s.plan_id = p.id
WHERE s.organization_id = '6525ed69-4dea-4dd2-b00b-4756d4dd980a'
ORDER BY s.created_at DESC;

-- 3. حساب شامل للأيام المتبقية
WITH organization_data AS (
  SELECT 
    o.id,
    o.name,
    o.subdomain,
    o.subscription_status,
    o.subscription_tier,
    o.created_at,
    (o.settings->>'trial_end_date')::timestamp as trial_end_date,
    -- حساب أيام الفترة التجريبية المتبقية
    CASE 
      WHEN (o.settings->>'trial_end_date')::timestamp IS NOT NULL THEN
        GREATEST(0, EXTRACT(DAY FROM (o.settings->>'trial_end_date')::timestamp - NOW()))
      ELSE
        GREATEST(0, 5 - EXTRACT(DAY FROM NOW() - o.created_at))
    END as trial_days_left
  FROM organizations o
  WHERE o.id = '6525ed69-4dea-4dd2-b00b-4756d4dd980a'
),
subscription_data AS (
  SELECT 
    s.organization_id,
    s.status,
    s.end_date,
    -- حساب أيام الاشتراك المدفوع المتبقية
    CASE 
      WHEN s.status = 'active' AND s.end_date > NOW() THEN
        EXTRACT(DAY FROM s.end_date - NOW())
      ELSE 0
    END as subscription_days_left,
    p.name as plan_name,
    ROW_NUMBER() OVER (ORDER BY s.created_at DESC) as rn
  FROM organization_subscriptions s
  LEFT JOIN subscription_plans p ON s.plan_id = p.id
  WHERE s.organization_id = '6525ed69-4dea-4dd2-b00b-4756d4dd980a'
    AND s.status = 'active'
)
SELECT 
  od.id,
  od.name,
  od.subdomain,
  od.subscription_status,
  od.subscription_tier,
  od.created_at,
  od.trial_end_date,
  od.trial_days_left,
  COALESCE(sd.subscription_days_left, 0) as subscription_days_left,
  GREATEST(od.trial_days_left, COALESCE(sd.subscription_days_left, 0)) as total_days_left,
  -- تحديد الحالة
  CASE 
    WHEN COALESCE(sd.subscription_days_left, 0) > 0 THEN 'active'
    WHEN od.trial_days_left > 0 THEN 'trial'
    ELSE 'expired'
  END as calculated_status,
  -- الرسالة
  CASE 
    WHEN COALESCE(sd.subscription_days_left, 0) > 0 THEN 
      'اشتراك نشط - ' || COALESCE(sd.subscription_days_left, 0) || ' يوم متبقية'
    WHEN od.trial_days_left > 0 THEN 
      'فترة تجريبية - ' || od.trial_days_left || ' يوم متبقية'
    ELSE 'انتهت الفترة التجريبية والاشتراك'
  END as status_message,
  sd.plan_name,
  NOW() as calculation_time
FROM organization_data od
LEFT JOIN subscription_data sd ON od.id = sd.organization_id AND sd.rn = 1;

-- 4. فحص جدول organization_subscriptions (الجدول القديم) للمقارنة
SELECT 
  s.id,
  s.organization_id,
  s.plan_id,
  s.status,
  s.start_date,
  s.end_date,
  s.billing_cycle,
  EXTRACT(DAY FROM (s.end_date - NOW())) as days_left,
  p.name as plan_name
FROM organization_subscriptions s
LEFT JOIN subscription_plans p ON s.plan_id = p.id
WHERE s.organization_id = '6525ed69-4dea-4dd2-b00b-4756d4dd980a'
  AND s.status = 'active'
ORDER BY s.created_at DESC; 