-- ===== الحل النهائي الشامل لمشكلة عدم تزامن بيانات الاشتراكات =====
-- Database Trigger لتحديث بيانات المؤسسة تلقائياً عند أي تغيير في الاشتراك

-- الخطوة 1: حذف الدالة الموجودة وإنشاء دالة جديدة لتحديث بيانات المؤسسة
DROP FUNCTION IF EXISTS sync_organization_subscription_data() CASCADE;

CREATE OR REPLACE FUNCTION sync_organization_subscription_data()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث بيانات المؤسسة عند تفعيل اشتراك جديد
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'active' THEN
    UPDATE organizations 
    SET 
      subscription_id = NEW.id,
      subscription_status = 'active',
      subscription_tier = (
        SELECT COALESCE(sp.code, 'premium')
        FROM subscription_plans sp 
        WHERE sp.id = NEW.plan_id
        LIMIT 1
      ),
      updated_at = NOW()
    WHERE id = NEW.organization_id;
    
    RAISE LOG 'تم تحديث بيانات المؤسسة % مع الاشتراك %', NEW.organization_id, NEW.id;
  END IF;
  
  -- تحديث بيانات المؤسسة عند إلغاء الاشتراك
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND 
     (OLD.status = 'active' AND (NEW IS NULL OR NEW.status != 'active')) THEN
    
    -- التحقق من وجود اشتراكات نشطة أخرى
    IF NOT EXISTS (
      SELECT 1 FROM organization_subscriptions 
      WHERE organization_id = OLD.organization_id 
        AND status = 'active' 
        AND end_date > NOW()
        AND id != OLD.id
    ) THEN
      -- لا يوجد اشتراكات نشطة أخرى، العودة للفترة التجريبية
      UPDATE organizations 
      SET 
        subscription_id = NULL,
        subscription_status = 'trial',
        subscription_tier = 'trial',
        updated_at = NOW()
      WHERE id = OLD.organization_id;
      
      RAISE LOG 'تم إرجاع المؤسسة % للفترة التجريبية', OLD.organization_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- الخطوة 2: إنشاء Trigger على جدول organization_subscriptions
DROP TRIGGER IF EXISTS sync_org_subscription_trigger ON organization_subscriptions;

CREATE TRIGGER sync_org_subscription_trigger
  AFTER INSERT OR UPDATE OR DELETE ON organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_organization_subscription_data();

-- الخطوة 3: إصلاح البيانات الموجودة
-- تحديث حالة الاشتراكات المنتهية
UPDATE organization_subscriptions 
SET status = 'expired'
WHERE status IN ('active', 'trial') 
  AND end_date < NOW();

-- الخطوة 4: تزامن بيانات المؤسسات مع الاشتراكات النشطة
UPDATE organizations 
SET 
  subscription_id = active_subs.subscription_id,
  subscription_tier = COALESCE(active_subs.plan_code, 'premium'),
  subscription_status = 'active',
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (os.organization_id)
    os.id as subscription_id,
    os.organization_id,
    COALESCE(sp.code, 'premium') as plan_code
  FROM organization_subscriptions os
  LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE os.status = 'active'
    AND os.end_date > NOW()
  ORDER BY os.organization_id, os.end_date DESC
) active_subs
WHERE organizations.id = active_subs.organization_id;

-- الخطوة 5: إرجاع المؤسسات بدون اشتراك نشط للفترة التجريبية
UPDATE organizations 
SET 
  subscription_id = NULL,
  subscription_status = 'trial',
  subscription_tier = 'trial',
  updated_at = NOW()
WHERE id NOT IN (
  SELECT DISTINCT organization_id 
  FROM organization_subscriptions 
  WHERE status = 'active' 
    AND end_date > NOW()
)
AND subscription_status != 'trial';

-- الخطوة 6: إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_active 
ON organization_subscriptions(organization_id, status, end_date) 
WHERE status = 'active';

-- الخطوة 7: إنشاء View للاستعلام السريع عن الاشتراكات النشطة
CREATE OR REPLACE VIEW active_organization_subscriptions AS
SELECT 
  os.*,
  sp.name as plan_name,
  sp.code as plan_code,
  sp.features as plan_features,
  EXTRACT(DAY FROM (os.end_date - NOW())) as days_remaining
FROM organization_subscriptions os
LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
WHERE os.status = 'active' 
  AND os.end_date > NOW();

-- رسالة تأكيد
DO $$
BEGIN
  RAISE NOTICE '✅ تم إنشاء الحل النهائي الشامل لمشكلة تزامن الاشتراكات بنجاح!';
  RAISE NOTICE '📊 عدد المؤسسات المحدثة: %', (
    SELECT COUNT(*) FROM organizations 
    WHERE subscription_status = 'active'
  );
  RAISE NOTICE '🔄 Trigger نشط لتحديث البيانات تلقائياً';
END $$; 