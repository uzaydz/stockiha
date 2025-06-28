-- إصلاح الفترة التجريبية للمؤسسة الحالية
-- تغيير trial_end_date من 30 يوم إلى 5 أيام من تاريخ الإنشاء

UPDATE organizations 
SET settings = jsonb_set(
  settings, 
  '{trial_end_date}', 
  to_jsonb((created_at + INTERVAL '5 days')::text)
)
WHERE subdomain = 'finaltesttvb0';

-- التحقق من النتيجة
SELECT 
  id,
  name,
  subdomain,
  created_at,
  settings->>'trial_end_date' as trial_end_date,
  EXTRACT(DAY FROM (settings->>'trial_end_date')::timestamp - NOW()) as days_left_after_fix
FROM organizations 
WHERE subdomain = 'finaltesttvb0';

-- إصلاح عام لجميع المؤسسات التي لديها فترة تجريبية أكثر من 5 أيام
UPDATE organizations 
SET settings = jsonb_set(
  settings, 
  '{trial_end_date}', 
  to_jsonb((created_at + INTERVAL '5 days')::text)
)
WHERE subscription_status = 'trial' 
  AND (settings->>'trial_end_date')::timestamp > (created_at + INTERVAL '5 days');

-- عرض جميع المؤسسات التجريبية بعد الإصلاح
SELECT 
  id,
  name,
  subdomain,
  created_at,
  settings->>'trial_end_date' as trial_end_date,
  EXTRACT(DAY FROM (settings->>'trial_end_date')::timestamp - NOW()) as days_left
FROM organizations 
WHERE subscription_status = 'trial'
ORDER BY created_at DESC; 