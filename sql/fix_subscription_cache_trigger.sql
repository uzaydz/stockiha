-- ======================================================================
-- إصلاح دالة trigger_update_subscription_cache_with_logging
-- تاريخ الإنشاء: 2025-08-25
-- ======================================================================

-- إصلاح دالة Trigger لتسجيل التحديثات
CREATE OR REPLACE FUNCTION trigger_update_subscription_cache_with_logging()
RETURNS TRIGGER AS $$
DECLARE
  old_cache_data JSONB;
  new_subscription_data JSONB;
BEGIN
  -- الحصول على البيانات القديمة
  SELECT subscription_data INTO old_cache_data
  FROM organization_subscription_cache
  WHERE organization_id = NEW.organization_id;
  
  -- حذف التخزين المؤقت القديم
  DELETE FROM organization_subscription_cache
  WHERE organization_id = NEW.organization_id;
  
  -- إعادة بناء التخزين المؤقت
  PERFORM get_organization_subscription_cached_enhanced(NEW.organization_id);
  
  -- تحويل بيانات الاشتراك الجديدة إلى JSONB
  SELECT jsonb_build_object(
    'id', NEW.id,
    'organization_id', NEW.organization_id,
    'plan_id', NEW.plan_id,
    'status', NEW.status,
    'billing_cycle', NEW.billing_cycle,
    'start_date', NEW.start_date,
    'end_date', NEW.end_date,
    'amount_paid', NEW.amount_paid,
    'currency', NEW.currency,
    'updated_at', NEW.updated_at
  ) INTO new_subscription_data;
  
  -- تسجيل التحديث
  PERFORM log_subscription_cache_update(
    NEW.organization_id,
    'subscription_updated',
    old_cache_data,
    new_subscription_data
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث Trigger
DROP TRIGGER IF EXISTS update_subscription_cache_trigger ON organization_subscriptions;
CREATE TRIGGER update_subscription_cache_trigger
  AFTER INSERT OR UPDATE OR DELETE ON organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_subscription_cache_with_logging();

-- ======================================================================
-- ملاحظات:
-- ======================================================================
-- 1. تم إصلاح مشكلة تحويل NEW إلى jsonb
-- 2. تم إنشاء كائن JSONB من البيانات الجديدة
-- 3. تم تحديث Trigger لاستخدام الدالة المصححة
-- ======================================================================
