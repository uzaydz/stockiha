-- Fix existing canceled subscriptions that still show remaining days
-- This script updates all canceled subscriptions to set end_date to updated_at (cancellation date)

-- Update canceled subscriptions where end_date is still in the future
UPDATE organization_subscriptions
SET
  end_date = COALESCE(updated_at, created_at)  -- استخدام تاريخ التحديث (الإلغاء) كتاريخ نهاية
WHERE
  status IN ('canceled', 'expired')
  AND end_date > CURRENT_TIMESTAMP;  -- فقط الاشتراكات التي لا تزال تظهر أياماً متبقية

-- Update organizations table to ensure subscription_tier is NULL for canceled subscriptions
UPDATE organizations o
SET
  subscription_tier = NULL,
  updated_at = NOW()
WHERE
  o.subscription_status = 'canceled'
  AND o.subscription_tier IS NOT NULL;

-- Log the changes
DO $$
DECLARE
  v_updated_count INT;
  v_orgs_updated INT;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Count organizations updated
  SELECT COUNT(*)
  INTO v_orgs_updated
  FROM organizations
  WHERE subscription_status = 'canceled' AND subscription_tier IS NOT NULL;

  RAISE NOTICE 'تم تحديث % اشتراك ملغى', v_updated_count;
  RAISE NOTICE 'تم تحديث % مؤسسة لإزالة subscription_tier', v_orgs_updated;
END $$;

-- Add comment
COMMENT ON TABLE organization_subscriptions IS 'Updated canceled subscriptions to fix end_date and days_remaining display';
