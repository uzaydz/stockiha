-- ===== إصلاح مشكلة القيد الفريد في جدول organization_subscriptions =====
-- المشكلة: لا يمكن للمؤسسة الواحدة أن تملك أكثر من اشتراك واحد بنفس الحالة
-- الحل: إزالة القيد الفريد أو تعديله ليسمح بعدة اشتراكات

-- عرض القيود الحالية
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'organization_subscriptions' 
  AND constraint_type = 'UNIQUE';

-- إزالة القيد الفريد المشكل
ALTER TABLE organization_subscriptions 
DROP CONSTRAINT IF EXISTS organization_subscriptions_organization_id_status_key;

-- إضافة قيد جديد يسمح بعدة اشتراكات لكن يمنع التكرار غير المنطقي
-- يمكن للمؤسسة أن تملك اشتراك trial واحد نشط فقط
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_trial_per_org
ON organization_subscriptions (organization_id)
WHERE status = 'trial' AND end_date > NOW();

-- يمكن للمؤسسة أن تملك اشتراك active واحد نشط فقط
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_subscription_per_org
ON organization_subscriptions (organization_id)
WHERE status = 'active' AND end_date > NOW();

-- السماح بعدة اشتراكات منتهية أو ملغاة
-- (لا نحتاج قيد هنا لأنها حالات تاريخية)

-- تنظيف الاشتراكات المكررة الموجودة
-- حذف الاشتراكات المنتهية المكررة (الاحتفاظ بالأحدث فقط)
WITH duplicate_subscriptions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, status 
      ORDER BY created_at DESC
    ) as rn
  FROM organization_subscriptions
  WHERE status IN ('expired', 'cancelled')
)
DELETE FROM organization_subscriptions
WHERE id IN (
  SELECT id FROM duplicate_subscriptions WHERE rn > 1
);

-- عرض النتائج النهائية
SELECT 
  'النتائج بعد الإصلاح:' as description,
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT organization_id) as unique_organizations
FROM organization_subscriptions;

-- عرض الاشتراكات المتعددة للمؤسسة الواحدة (إن وجدت)
SELECT 
  organization_id,
  COUNT(*) as subscription_count,
  STRING_AGG(status, ', ') as statuses
FROM organization_subscriptions
GROUP BY organization_id
HAVING COUNT(*) > 1
ORDER BY subscription_count DESC; 