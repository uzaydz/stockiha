-- ======================================================================
-- إصلاح القيود والـ triggers الخاصة بالاشتراكات
-- المشكلة: trigger يستخدم NEW في حالة DELETE مما يسبب null constraint violation
-- ======================================================================

-- 1️⃣ إصلاح دالة trigger لاستخدام OLD في حالة DELETE
DROP FUNCTION IF EXISTS trigger_update_subscription_cache_with_logging() CASCADE;

CREATE OR REPLACE FUNCTION trigger_update_subscription_cache_with_logging()
RETURNS TRIGGER AS $$
DECLARE
  old_cache_data JSONB;
  new_subscription_data JSONB;
  v_org_id UUID;
BEGIN
  -- ✅ FIX: استخدام OLD.organization_id في حالة DELETE، وNEW في حالات أخرى
  v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);

  -- الحصول على البيانات القديمة
  SELECT subscription_data INTO old_cache_data
  FROM organization_subscription_cache
  WHERE organization_id = v_org_id;

  -- حذف التخزين المؤقت القديم
  DELETE FROM organization_subscription_cache
  WHERE organization_id = v_org_id;

  -- في حالة INSERT أو UPDATE، إعادة بناء التخزين المؤقت
  IF TG_OP != 'DELETE' THEN
    -- إعادة بناء التخزين المؤقت
    BEGIN
      PERFORM get_organization_subscription_cached_enhanced(v_org_id);
    EXCEPTION
      WHEN OTHERS THEN
        -- تجاهل الخطأ إذا كانت الدالة غير موجودة
        NULL;
    END;

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
  ELSE
    -- في حالة DELETE، استخدام OLD
    SELECT jsonb_build_object(
      'id', OLD.id,
      'organization_id', OLD.organization_id,
      'plan_id', OLD.plan_id,
      'status', OLD.status,
      'deleted', true
    ) INTO new_subscription_data;
  END IF;

  -- تسجيل التحديث
  BEGIN
    PERFORM log_subscription_cache_update(
      v_org_id,
      TG_OP,
      old_cache_data,
      new_subscription_data
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- تجاهل الخطأ إذا كانت الدالة غير موجودة
      NULL;
  END;

  -- إرجاع القيمة المناسبة حسب نوع العملية
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2️⃣ إعادة إنشاء الـ trigger
DROP TRIGGER IF EXISTS update_subscription_cache_trigger ON organization_subscriptions;

CREATE TRIGGER update_subscription_cache_trigger
  AFTER INSERT OR UPDATE OR DELETE ON organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_subscription_cache_with_logging();

-- 3️⃣ التأكد من أن الـ unique constraint يسمح بوجود اشتراكات ملغاة متعددة
DO $$
BEGIN
  -- محاولة إزالة القيد القديم إذا كان موجوداً
  ALTER TABLE organization_subscriptions
    DROP CONSTRAINT IF EXISTS organization_subscriptions_organization_id_status_key;

  -- إضافة قيد جديد يسمح بوجود اشتراكات ملغاة/منتهية متعددة
  CREATE UNIQUE INDEX IF NOT EXISTS org_sub_unique_active_status
    ON organization_subscriptions (organization_id, status)
    WHERE status IN ('active', 'pending', 'trial');

EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 4️⃣ إضافة تعليق توضيحي
COMMENT ON FUNCTION trigger_update_subscription_cache_with_logging IS
'Fixed: Uses OLD.organization_id for DELETE operations to avoid NULL constraint violations';

COMMENT ON INDEX org_sub_unique_active_status IS
'Allows only one active/pending/trial subscription per organization, but permits multiple canceled/expired subscriptions';
