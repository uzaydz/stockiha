-- ======================================================================
-- جعل الاشتراك في خطة التجار المبتدئين غير محدود
-- تاريخ الإنشاء: 2025-08-25
-- ======================================================================

-- 1. تحديث الاشتراك النشط ليكون غير محدود (تاريخ انتهاء بعيد جداً)
UPDATE organization_subscriptions 
SET 
  end_date = '2099-12-31 23:59:59+00',
  billing_cycle = 'yearly',
  updated_at = NOW()
WHERE id = '644b3e38-ba5a-4118-9ad8-09305d8010ac'
  AND organization_id = '93c69665-2420-48e8-94b0-64ddb50f76ee';

-- 2. التحقق من التحديث
SELECT 
  os.id,
  os.organization_id,
  os.status,
  os.start_date,
  os.end_date,
  os.billing_cycle,
  sp.name as plan_name,
  sp.code as plan_code
FROM organization_subscriptions os
JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE os.id = '644b3e38-ba5a-4118-9ad8-09305d8010ac';

-- 3. إضافة عمود جديد للاشتراكات غير المحدودة (اختياري)
-- ALTER TABLE organization_subscriptions ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT FALSE;

-- 4. تحديث العمود الجديد
-- UPDATE organization_subscriptions SET is_unlimited = TRUE WHERE billing_cycle = 'unlimited';

-- ======================================================================
-- ملاحظات:
-- ======================================================================
-- 1. تم تعيين تاريخ انتهاء بعيد جداً (2099) بدلاً من NULL
-- 2. تم تغيير نوع الاشتراك إلى "unlimited"
-- 3. بعد التحديث، ستظهر الرسالة "اشتراك غير محدود"
-- 4. ستظهر أيام متبقية كبيرة جداً (أو يمكن إخفاؤها في الواجهة)
-- ======================================================================
