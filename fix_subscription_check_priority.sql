-- إصلاح مشكلة أولوية فحص الاشتراكات
-- المشكلة: دالة check_organization_subscription تعطي الأولوية للاشتراك التجريبي حتى لو كان منتهياً
-- الحل: تحسين شروط البحث للتأكد من أن الاشتراكات المنتهية لا تُعتبر نشطة

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
  -- تم تحسين الشروط للتأكد من أن الاشتراك فعلاً نشط وليس منتهياً
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
    AND os.status IN ('trial', 'active') -- يجب أن يكون الاشتراك نشط
    AND os.end_date > now_time -- يجب أن يكون تاريخ الانتهاء في المستقبل
    AND sp.code = 'trial' -- يجب أن تكون خطة تجريبية
    -- شرط إضافي: التأكد من عدم وجود اشتراك مدفوع نشط
    AND NOT EXISTS (
      SELECT 1 FROM organization_subscriptions os2
      JOIN subscription_plans sp2 ON os2.plan_id = sp2.id
      WHERE os2.organization_id = org_id
        AND os2.status = 'active'
        AND os2.end_date > now_time
        AND sp2.code != 'trial'
    )
  ORDER BY os.end_date DESC
  LIMIT 1;

  -- إذا وُجد اشتراك تجريبي نشط (وليس هناك اشتراك مدفوع)
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
  -- الأولوية الثالثة: فحص الفترة التجريبية للمؤسسة (الطريقة القديمة)
  -- ====================================================================
  IF org_record.created_at IS NOT NULL THEN
    trial_end_date := org_record.created_at + INTERVAL '5 days';
    
    IF trial_end_date > now_time THEN
      trial_days_left := EXTRACT(DAY FROM (trial_end_date - now_time))::INTEGER;
      
      -- البحث عن خطة تجريبية افتراضية
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
        'features', COALESCE(plan_record.features, ARRAY['ميزات أساسية']),
        'limits', COALESCE(plan_record.limits, '{"max_pos": 1, "max_users": 3, "max_products": 100}'::json),
        'trial_period_days', 5,
        'message', format('فترة تجريبية للمؤسسة - يتبقى %s يوم', trial_days_left)
      );
    END IF;
  END IF;

  -- ====================================================================
  -- لا يوجد اشتراك صالح
  -- ====================================================================
  RETURN json_build_object(
    'success', false,
    'status', 'expired',
    'subscription_type', 'none',
    'subscription_id', NULL,
    'plan_name', 'منتهي',
    'plan_code', 'expired',
    'start_date', NULL,
    'end_date', NULL,
    'days_left', 0,
    'features', ARRAY[]::text[],
    'limits', '{}'::json,
    'message', 'انتهت صلاحية الاشتراك. يرجى التجديد للمتابعة.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تنظيف التخزين المؤقت لإجبار إعادة فحص الاشتراكات
DELETE FROM organization_subscription_cache;

-- إعادة إنشاء الدالة المخزنة مؤقتاً مع التحسينات
CREATE OR REPLACE FUNCTION get_organization_subscription_cached(
  org_id UUID
) RETURNS JSON AS $$
DECLARE
  cached_result RECORD;
  fresh_result JSON;
  check_time TIMESTAMPTZ;
BEGIN
  check_time := NOW();
  
  -- البحث عن النتيجة في التخزين المؤقت (مع فترة أقصر للتحديث السريع)
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
  
  -- حفظ النتيجة في التخزين المؤقت (مع فترة أقصر: 1 ساعة بدلاً من يوم)
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
    check_time + INTERVAL '1 hour' -- تقليل فترة التخزين المؤقت لضمان التحديث السريع
  )
  ON CONFLICT (organization_id) 
  DO UPDATE SET
    subscription_data = fresh_result,
    last_checked_at = check_time,
    expires_at = check_time + INTERVAL '1 hour';
  
  RETURN fresh_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION check_organization_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_subscription_cached(UUID) TO authenticated;

-- تعليق توضيحي
COMMENT ON FUNCTION check_organization_subscription IS 'دالة محسنة لفحص حالة الاشتراك مع أولوية صحيحة للاشتراكات المدفوعة';
COMMENT ON FUNCTION get_organization_subscription_cached IS 'دالة التخزين المؤقت المحسنة مع فترة تحديث أقصر';
