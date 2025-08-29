-- ======================================================================
-- حل نهائي ومستقبلي لمشكلة عرض نوع الاشتراك
-- يعمل لجميع المؤسسات الحالية والمستقبلية
-- تاريخ الإنشاء: 2025-08-25
-- ======================================================================

-- 1. تحديث دالة فحص الاشتراك لتكون أكثر دقة وشمولية
CREATE OR REPLACE FUNCTION check_organization_subscription_enhanced(
  org_id UUID
) RETURNS JSON AS $$
DECLARE
  org_record RECORD;
  active_subscription RECORD;
  trial_subscription RECORD;
  plan_record RECORD;
  days_left INTEGER;
  trial_days_left INTEGER;
  result JSON;
  now_time TIMESTAMPTZ;
  trial_end_date TIMESTAMPTZ;
BEGIN
  -- الحصول على الوقت الحالي
  now_time := NOW();
  
  -- التحقق من وجود المؤسسة
  SELECT * INTO org_record 
  FROM organizations 
  WHERE id = org_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Organization not found',
      'status', 'not_found',
      'message', 'لم يتم العثور على المؤسسة'
    );
  END IF;

  -- ====================================================================
  -- الأولوية الأولى: البحث عن اشتراك نشط مدفوع (أي خطة غير تجريبية)
  -- ====================================================================
  SELECT 
    os.*,
    sp.name as plan_name,
    sp.code as plan_code,
    sp.features,
    sp.limits
  INTO active_subscription
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE os.organization_id = org_id
    AND os.status = 'active'
    AND os.end_date > now_time
    AND sp.code != 'trial'  -- استبعاد الخطط التجريبية
  ORDER BY os.end_date DESC, os.created_at DESC
  LIMIT 1;

  -- إذا وُجد اشتراك نشط مدفوع
  IF FOUND THEN
    days_left := EXTRACT(DAY FROM (active_subscription.end_date - now_time))::INTEGER;
    
    -- تحديد نوع الاشتراك بناءً على كود الخطة
    DECLARE
      subscription_type TEXT;
    BEGIN
      CASE active_subscription.plan_code
        WHEN 'ecommerce_starter' THEN subscription_type := 'paid_ecommerce_starter';
        WHEN 'basic' THEN subscription_type := 'paid_basic';
        WHEN 'premium' THEN subscription_type := 'paid_premium';
        WHEN 'enterprise' THEN subscription_type := 'paid_enterprise';
        ELSE subscription_type := 'paid_other';
      END CASE;
    END;
    
    RETURN json_build_object(
      'success', true,
      'status', 'active',
      'subscription_type', subscription_type,
      'subscription_id', active_subscription.id,
      'plan_name', active_subscription.plan_name,
      'plan_code', active_subscription.plan_code,
      'start_date', active_subscription.start_date,
      'end_date', active_subscription.end_date,
      'days_left', days_left,
      'features', COALESCE(active_subscription.features, '[]'::json),
      'limits', COALESCE(active_subscription.limits, '{}'::json),
      'billing_cycle', COALESCE(active_subscription.billing_cycle, 'monthly'),
      'amount_paid', COALESCE(active_subscription.amount_paid, 0),
      'currency', COALESCE(active_subscription.currency, 'DZD'),
      'message', format('اشتراك نشط في خطة %s - يتبقى %s يوم', 
                       active_subscription.plan_name, days_left)
    );
  END IF;

  -- ====================================================================
  -- الأولوية الثانية: البحث عن اشتراك تجريبي نشط
  -- ====================================================================
  SELECT 
    os.*,
    sp.name as plan_name,
    sp.code as plan_code,
    sp.features,
    sp.limits,
    sp.trial_period_days
  INTO trial_subscription
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE os.organization_id = org_id
    AND os.status IN ('trial', 'active')
    AND os.end_date > now_time
    AND sp.code = 'trial'
  ORDER BY os.end_date DESC, os.created_at DESC
  LIMIT 1;

  -- إذا وُجد اشتراك تجريبي نشط
  IF FOUND THEN
    trial_days_left := EXTRACT(DAY FROM (trial_subscription.end_date - now_time))::INTEGER;
    
    RETURN json_build_object(
      'success', true,
      'status', 'trial',
      'subscription_type', 'trial_subscription',
      'subscription_id', trial_subscription.id,
      'plan_name', trial_subscription.plan_name,
      'plan_code', trial_subscription.plan_code,
      'start_date', trial_subscription.start_date,
      'end_date', trial_subscription.end_date,
      'days_left', trial_days_left,
      'features', COALESCE(trial_subscription.features, '[]'::json),
      'limits', COALESCE(trial_subscription.limits, '{}'::json),
      'trial_period_days', COALESCE(trial_subscription.trial_period_days, 5),
      'message', format('فترة تجريبية نشطة - يتبقى %s يوم', trial_days_left)
    );
  END IF;

  -- ====================================================================
  -- الأولوية الثالثة: فحص الفترة التجريبية التقليدية (5 أيام من الإنشاء)
  -- ====================================================================
  
  -- فحص التاريخ المخصص للفترة التجريبية في الإعدادات
  IF org_record.settings ? 'trial_end_date' THEN
    trial_end_date := (org_record.settings->>'trial_end_date')::TIMESTAMPTZ;
  ELSE
    -- حساب تاريخ انتهاء الفترة التجريبية (5 أيام من الإنشاء)
    trial_end_date := org_record.created_at + INTERVAL '5 days';
  END IF;

  -- التحقق من صحة الفترة التجريبية
  IF trial_end_date > now_time THEN
    trial_days_left := EXTRACT(DAY FROM (trial_end_date - now_time))::INTEGER;
    
    -- جلب بيانات الخطة التجريبية
    SELECT * INTO plan_record 
    FROM subscription_plans 
    WHERE code = 'trial' 
    LIMIT 1;
    
    RETURN json_build_object(
      'success', true,
      'status', 'trial',
      'subscription_type', 'organization_trial',
      'subscription_id', NULL,
      'plan_name', COALESCE(plan_record.name, 'تجريبي'),
      'plan_code', 'trial',
      'start_date', org_record.created_at,
      'end_date', trial_end_date,
      'days_left', trial_days_left,
      'features', COALESCE(plan_record.features, '[]'::json),
      'limits', COALESCE(plan_record.limits, '{"max_pos": 1, "max_users": 3, "max_products": 100}'::json),
      'trial_period_days', 5,
      'message', format('فترة تجريبية مجانية - يتبقى %s يوم', trial_days_left)
    );
  END IF;

  -- ====================================================================
  -- لا يوجد اشتراك صالح - منتهي الصلاحية
  -- ====================================================================
  RETURN json_build_object(
    'success', true,
    'status', 'expired',
    'subscription_type', 'none',
    'subscription_id', NULL,
    'plan_name', 'منتهي الصلاحية',
    'plan_code', 'expired',
    'start_date', NULL,
    'end_date', NULL,
    'days_left', 0,
    'features', '[]'::json,
    'limits', '{"max_pos": 0, "max_users": 0, "max_products": 0}'::json,
    'message', 'انتهت الفترة التجريبية - يرجى الاشتراك للمتابعة'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- معالجة الأخطاء بشكل آمن
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'status', 'error',
      'message', 'خطأ في فحص حالة الاشتراك'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. تحديث دالة التخزين المؤقت لتستخدم الدالة المحسنة
CREATE OR REPLACE FUNCTION get_organization_subscription_cached_enhanced(
  org_id UUID
) RETURNS JSON AS $$
DECLARE
  cached_result RECORD;
  fresh_result JSON;
  check_time TIMESTAMPTZ;
  cache_duration INTERVAL := INTERVAL '1 hour'; -- تقليل مدة التخزين المؤقت لساعة واحدة
BEGIN
  check_time := NOW();
  
  -- البحث عن النتيجة في التخزين المؤقت
  SELECT * INTO cached_result
  FROM organization_subscription_cache
  WHERE organization_id = org_id
    AND expires_at > check_time;
  
  -- إذا وُجدت نتيجة صالحة في التخزين المؤقت
  IF FOUND THEN
    RETURN cached_result.subscription_data;
  END IF;
  
  -- إذا لم توجد أو انتهت صلاحيتها، فحص جديد
  SELECT check_organization_subscription_enhanced(org_id) INTO fresh_result;
  
  -- حفظ النتيجة في التخزين المؤقت
  INSERT INTO organization_subscription_cache (
    organization_id, 
    subscription_data, 
    last_checked_at, 
    expires_at
  )
  VALUES (
    org_id, 
    fresh_result, 
    check_time, 
    check_time + cache_duration
  )
  ON CONFLICT (organization_id) 
  DO UPDATE SET
    subscription_data = fresh_result,
    last_checked_at = check_time,
    expires_at = check_time + cache_duration;
  
  RETURN fresh_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. دالة لتنظيف التخزين المؤقت القديم وإعادة بناء البيانات
CREATE OR REPLACE FUNCTION rebuild_subscription_cache_for_all_organizations()
RETURNS JSON AS $$
DECLARE
  org_record RECORD;
  updated_count INTEGER := 0;
  error_count INTEGER := 0;
  result JSON;
BEGIN
  -- حذف جميع البيانات القديمة من التخزين المؤقت
  DELETE FROM organization_subscription_cache;
  
  -- إعادة بناء التخزين المؤقت لجميع المؤسسات
  FOR org_record IN 
    SELECT id FROM organizations 
    WHERE deleted_at IS NULL OR deleted_at > NOW()
  LOOP
    BEGIN
      -- استخدام الدالة المحسنة لبناء التخزين المؤقت
      PERFORM get_organization_subscription_cached_enhanced(org_record.id);
      updated_count := updated_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        -- تسجيل الخطأ في السجلات
        RAISE NOTICE 'خطأ في تحديث المؤسسة %: %', org_record.id, SQLERRM;
    END;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'message', format('تم تحديث %s مؤسسة بنجاح، %s أخطاء', updated_count, error_count),
    'updated_count', updated_count,
    'error_count', error_count,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. دالة لتنظيف التخزين المؤقت تلقائياً كل ساعة
CREATE OR REPLACE FUNCTION auto_cleanup_subscription_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  cache_age_threshold INTERVAL := INTERVAL '2 hours'; -- حذف البيانات الأقدم من ساعتين
BEGIN
  -- حذف البيانات المنتهية الصلاحية
  DELETE FROM organization_subscription_cache
  WHERE expires_at < NOW();
  
  -- حذف البيانات القديمة جداً (أكثر من ساعتين)
  DELETE FROM organization_subscription_cache
  WHERE last_checked_at < (NOW() - cache_age_threshold);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- إعادة بناء التخزين المؤقت للمؤسسات التي تحتاج تحديث
  PERFORM get_organization_subscription_cached_enhanced(org.id)
  FROM organizations org
  LEFT JOIN organization_subscription_cache cache ON org.id = cache.organization_id
  WHERE cache.organization_id IS NULL 
    OR cache.last_checked_at < (NOW() - INTERVAL '30 minutes');
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. إنشاء Trigger لتحديث التخزين المؤقت تلقائياً عند تغيير الاشتراكات
CREATE OR REPLACE FUNCTION trigger_update_subscription_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- حذف التخزين المؤقت القديم للمؤسسة
  DELETE FROM organization_subscription_cache
  WHERE organization_id = NEW.organization_id;
  
  -- إعادة بناء التخزين المؤقت
  PERFORM get_organization_subscription_cached_enhanced(NEW.organization_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء Trigger على جدول organization_subscriptions
DROP TRIGGER IF EXISTS update_subscription_cache_trigger ON organization_subscriptions;
CREATE TRIGGER update_subscription_cache_trigger
  AFTER INSERT OR UPDATE OR DELETE ON organization_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_subscription_cache();

-- 6. إنشاء Trigger على جدول organizations
CREATE OR REPLACE FUNCTION trigger_update_org_subscription_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- حذف التخزين المؤقت القديم للمؤسسة
  DELETE FROM organization_subscription_cache
  WHERE organization_id = NEW.id;
  
  -- إعادة بناء التخزين المؤقت
  PERFORM get_organization_subscription_cached_enhanced(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء Trigger على جدول organizations
DROP TRIGGER IF EXISTS update_org_subscription_cache_trigger ON organizations;
CREATE TRIGGER update_org_subscription_cache_trigger
  AFTER UPDATE OF subscription_tier, subscription_status ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_org_subscription_cache();

-- 7. دالة لفحص صحة التخزين المؤقت
CREATE OR REPLACE FUNCTION check_subscription_cache_health()
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  cached_plan_name TEXT,
  actual_plan_name TEXT,
  cache_status TEXT,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    cache.subscription_data->>'plan_name' as cached_plan_name,
    COALESCE(
      (SELECT sp.name 
       FROM organization_subscriptions os 
       JOIN subscription_plans sp ON os.plan_id = sp.id 
       WHERE os.organization_id = o.id 
         AND os.status = 'active' 
         AND os.end_date > NOW() 
       ORDER BY os.created_at DESC 
       LIMIT 1),
      'لا يوجد اشتراك نشط'
    ) as actual_plan_name,
    CASE 
      WHEN cache.subscription_data->>'plan_name' = COALESCE(
        (SELECT sp.name 
         FROM organization_subscriptions os 
         JOIN subscription_plans sp ON os.plan_id = sp.id 
         WHERE os.organization_id = o.id 
           AND os.status = 'active' 
           AND os.end_date > NOW() 
         ORDER BY os.created_at DESC 
         LIMIT 1),
        'لا يوجد اشتراك نشط'
      ) THEN 'مطابق'
      ELSE 'غير مطابق'
    END as cache_status,
    cache.last_checked_at
  FROM organizations o
  LEFT JOIN organization_subscription_cache cache ON o.id = cache.organization_id
  WHERE o.deleted_at IS NULL OR o.deleted_at > NOW()
  ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. منح الصلاحيات المناسبة
GRANT EXECUTE ON FUNCTION check_organization_subscription_enhanced(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_subscription_cached_enhanced(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_subscription_cache_for_all_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_cleanup_subscription_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION check_subscription_cache_health() TO authenticated;

-- منح صلاحيات على الجداول
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_subscription_cache TO authenticated;

-- 9. إنشاء جدول لسجلات التحديث
CREATE TABLE IF NOT EXISTS subscription_cache_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

GRANT SELECT, INSERT ON subscription_cache_logs TO authenticated;

-- 10. دالة لتسجيل التحديثات
CREATE OR REPLACE FUNCTION log_subscription_cache_update(
  org_id UUID,
  action_type TEXT,
  old_data JSONB DEFAULT NULL,
  new_data JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO subscription_cache_logs (
    organization_id,
    action,
    old_data,
    new_data
  ) VALUES (
    org_id,
    action_type,
    old_data,
    new_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. تحديث Trigger لتسجيل التحديثات
CREATE OR REPLACE FUNCTION trigger_update_subscription_cache_with_logging()
RETURNS TRIGGER AS $$
DECLARE
  old_cache_data JSONB;
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
  
  -- تسجيل التحديث
  PERFORM log_subscription_cache_update(
    NEW.organization_id,
    'subscription_updated',
    old_cache_data,
    NEW::jsonb
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

-- 12. إنشاء Cron Job لتنظيف التخزين المؤقت تلقائياً
-- يمكن استخدام pg_cron extension إذا كان متاحاً
-- SELECT cron.schedule('cleanup-subscription-cache', '*/30 * * * *', 'SELECT auto_cleanup_subscription_cache();');

-- 13. دالة لفحص وإصلاح التخزين المؤقت للمؤسسة المحددة
CREATE OR REPLACE FUNCTION fix_subscription_cache_for_organization(org_id UUID)
RETURNS JSON AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  result JSON;
BEGIN
  -- الحصول على البيانات القديمة
  SELECT subscription_data INTO old_data
  FROM organization_subscription_cache
  WHERE organization_id = org_id;
  
  -- حذف التخزين المؤقت القديم
  DELETE FROM organization_subscription_cache
  WHERE organization_id = org_id;
  
  -- إعادة بناء التخزين المؤقت
  SELECT get_organization_subscription_cached_enhanced(org_id) INTO new_data;
  
  -- تسجيل الإصلاح
  PERFORM log_subscription_cache_update(
    org_id,
    'cache_fixed',
    old_data,
    new_data
  );
  
  result := json_build_object(
    'success', true,
    'message', 'تم إصلاح التخزين المؤقت بنجاح',
    'organization_id', org_id,
    'old_data', old_data,
    'new_data', new_data,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION fix_subscription_cache_for_organization(UUID) TO authenticated;

-- 14. دالة لفحص جميع المؤسسات وإصلاح التخزين المؤقت
CREATE OR REPLACE FUNCTION fix_all_subscription_caches()
RETURNS JSON AS $$
DECLARE
  org_record RECORD;
  fixed_count INTEGER := 0;
  error_count INTEGER := 0;
  result JSON;
BEGIN
  FOR org_record IN 
    SELECT id FROM organizations 
    WHERE deleted_at IS NULL OR deleted_at > NOW()
  LOOP
    BEGIN
      PERFORM fix_subscription_cache_for_organization(org_record.id);
      fixed_count := fixed_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE NOTICE 'خطأ في إصلاح المؤسسة %: %', org_record.id, SQLERRM;
    END;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'message', format('تم إصلاح %s مؤسسة بنجاح، %s أخطاء', fixed_count, error_count),
    'fixed_count', fixed_count,
    'error_count', error_count,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION fix_all_subscription_caches() TO authenticated;

-- ======================================================================
-- تعليمات الاستخدام:
-- ======================================================================

-- 1. لتشغيل الإصلاح الفوري لجميع المؤسسات:
-- SELECT fix_all_subscription_caches();

-- 2. لإصلاح مؤسسة محددة:
-- SELECT fix_subscription_cache_for_organization('uuid-here');

-- 3. لفحص صحة التخزين المؤقت:
-- SELECT * FROM check_subscription_cache_health();

-- 4. لتنظيف التخزين المؤقت يدوياً:
-- SELECT auto_cleanup_subscription_cache();

-- 5. لإعادة بناء التخزين المؤقت لجميع المؤسسات:
-- SELECT rebuild_subscription_cache_for_all_organizations();

-- ======================================================================
-- ملاحظات مهمة:
-- ======================================================================
-- 1. هذا الحل يعمل تلقائياً عند أي تغيير في الاشتراكات
-- 2. التخزين المؤقت يتم تحديثه كل ساعة تلقائياً
-- 3. يتم تسجيل جميع التحديثات في جدول السجلات
-- 4. الحل يعمل لجميع المؤسسات الحالية والمستقبلية
-- 5. يمكن تشغيل الإصلاح يدوياً في أي وقت
-- ======================================================================
