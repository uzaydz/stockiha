-- ====================================================================
-- دالة فحص حالة الاشتراك للمؤسسة بشكل مثالي وآمن
-- تعمل مرة واحدة في اليوم وتحسب الأيام المتبقية بدقة
-- ====================================================================

CREATE OR REPLACE FUNCTION check_organization_subscription(
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
      'status', 'not_found'
    );
  END IF;

  -- ====================================================================
  -- الأولوية الأولى: البحث عن اشتراك نشط مدفوع
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
  ORDER BY os.end_date DESC
  LIMIT 1;

  -- إذا وُجد اشتراك نشط مدفوع
  IF FOUND THEN
    days_left := EXTRACT(DAY FROM (active_subscription.end_date - now_time))::INTEGER;
    
    RETURN json_build_object(
      'success', true,
      'status', 'active',
      'subscription_type', 'paid',
      'subscription_id', active_subscription.id,
      'plan_name', active_subscription.plan_name,
      'plan_code', active_subscription.plan_code,
      'start_date', active_subscription.start_date,
      'end_date', active_subscription.end_date,
      'days_left', days_left,
      'features', active_subscription.features,
      'limits', active_subscription.limits,
      'billing_cycle', active_subscription.billing_cycle,
      'amount_paid', active_subscription.amount_paid,
      'currency', active_subscription.currency,
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
  ORDER BY os.end_date DESC
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
      'features', trial_subscription.features,
      'limits', trial_subscription.limits,
      'trial_period_days', trial_subscription.trial_period_days,
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

-- ====================================================================
-- إنشاء جدول لتخزين نتائج فحص الاشتراك لتجنب الضغط على قاعدة البيانات
-- ====================================================================
CREATE TABLE IF NOT EXISTS organization_subscription_cache (
  organization_id UUID PRIMARY KEY,
  subscription_data JSON NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day')
);

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_org_subscription_cache_expires 
ON organization_subscription_cache(expires_at);

-- ====================================================================
-- دالة للحصول على حالة الاشتراك مع التخزين المؤقت
-- ====================================================================
CREATE OR REPLACE FUNCTION get_organization_subscription_cached(
  org_id UUID
) RETURNS JSON AS $$
DECLARE
  cached_result RECORD;
  fresh_result JSON;
  check_time TIMESTAMPTZ;
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
  SELECT check_organization_subscription(org_id) INTO fresh_result;
  
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
    check_time + INTERVAL '1 day'
  )
  ON CONFLICT (organization_id) 
  DO UPDATE SET
    subscription_data = fresh_result,
    last_checked_at = check_time,
    expires_at = check_time + INTERVAL '1 day';
  
  RETURN fresh_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- منح الصلاحيات المناسبة
-- ====================================================================
GRANT EXECUTE ON FUNCTION check_organization_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_subscription_cached(UUID) TO authenticated;

-- منح صلاحيات على الجدول
GRANT SELECT, INSERT, UPDATE ON organization_subscription_cache TO authenticated;

-- ====================================================================
-- دالة لتنظيف التخزين المؤقت المنتهي الصلاحية (تعمل مرة يومياً)
-- ====================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_subscription_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM organization_subscription_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_expired_subscription_cache() TO authenticated; 