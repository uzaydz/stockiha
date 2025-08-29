-- ======================================================================
-- إصلاح خطأ الدالة في قاعدة البيانات
-- المشكلة: عمود subscription_type غير موجود + مشكلة في نوع البيانات json/jsonb
-- تاريخ الإنشاء: 2025-08-25
-- ======================================================================

-- 1. إصلاح دالة فحص الاشتراك
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
    os.id,
    os.organization_id,
    os.status,
    os.start_date,
    os.end_date,
    os.billing_cycle,
    os.amount_paid,
    os.currency,
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
    -- حساب الأيام المتبقية (إذا كان الاشتراك طويل الأمد، لا نحسب الأيام)
    IF active_subscription.end_date > '2099-01-01'::timestamp THEN
      days_left := -1; -- -1 يعني غير محدود
    ELSE
      days_left := EXTRACT(DAY FROM (active_subscription.end_date - now_time))::INTEGER;
    END IF;
    
    -- تنسيق حدود الخطة بشكل صحيح
    DECLARE
      max_pos_text TEXT;
      max_users_text TEXT;
      max_products_text TEXT;
    BEGIN
      -- تنسيق نقاط البيع
      IF (active_subscription.limits->>'max_pos')::INTEGER = 0 THEN
        max_pos_text := 'غير متاحة';
      ELSE
        max_pos_text := COALESCE((active_subscription.limits->>'max_pos')::TEXT, 'غير محدود');
      END IF;
      
      -- تنسيق المستخدمين
      IF (active_subscription.limits->>'max_users')::INTEGER = 3 THEN
        max_users_text := '3 مستخدمين';
      ELSE
        max_users_text := COALESCE((active_subscription.limits->>'max_users')::TEXT, 'غير محدود');
      END IF;
      
      -- تنسيق المنتجات
      IF (active_subscription.limits->>'max_products') IS NULL THEN
        max_products_text := 'غير محدود';
      ELSE
        max_products_text := COALESCE((active_subscription.limits->>'max_products')::TEXT, 'غير محدود');
      END IF;
      
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
        'features', COALESCE(active_subscription.features, '[]'::jsonb),
        'limits', jsonb_build_object(
          'max_pos', max_pos_text,
          'max_users', max_users_text,
          'max_products', max_products_text
        ),
        'billing_cycle', COALESCE(active_subscription.billing_cycle, 'monthly'),
        'amount_paid', COALESCE(active_subscription.amount_paid, 0),
        'currency', COALESCE(active_subscription.currency, 'DZD'),
        'message', CASE 
          WHEN days_left = -1 THEN format('اشتراك نشط في خطة %s - غير محدود', active_subscription.plan_name)
          ELSE format('اشتراك نشط في خطة %s - يتبقى %s يوم', active_subscription.plan_name, days_left)
        END
      );
    END;
  END IF;

  -- ====================================================================
  -- الأولوية الثانية: البحث عن اشتراك تجريبي نشط
  -- ====================================================================
  SELECT 
    os.id,
    os.organization_id,
    os.status,
    os.start_date,
    os.end_date,
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
      'features', COALESCE(trial_subscription.features, '[]'::jsonb),
      'limits', COALESCE(trial_subscription.limits, '{}'::jsonb),
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
      'features', COALESCE(plan_record.features, '[]'::jsonb),
      'limits', COALESCE(plan_record.limits, '{"max_pos": 1, "max_users": 3, "max_products": 100}'::jsonb),
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
          'features', '[]'::jsonb,
      'limits', '{"max_pos": 0, "max_users": 0, "max_products": 0}'::jsonb,
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

-- 2. منح الصلاحيات المناسبة
GRANT EXECUTE ON FUNCTION check_organization_subscription_enhanced(UUID) TO authenticated;

-- 3. اختبار الدالة
-- SELECT check_organization_subscription_enhanced('93c69665-2420-48e8-94b0-64ddb50f76ee');

-- ======================================================================
-- ملاحظات:
-- ======================================================================
-- 1. تم إصلاح الدالة لتستخدم الأعمدة الموجودة فقط
-- 2. تم إزالة الاعتماد على عمود subscription_type غير الموجود
-- 3. تم إصلاح مشكلة نوع البيانات json/jsonb
-- 4. الدالة تعمل الآن بشكل صحيح
-- 5. يمكن اختبارها باستخدام الأمر أعلاه
-- ======================================================================
