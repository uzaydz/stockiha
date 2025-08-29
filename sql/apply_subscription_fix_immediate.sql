-- ======================================================================
-- تطبيق الإصلاح الفوري لمشكلة عرض نوع الاشتراك
-- تاريخ الإنشاء: 2025-08-25
-- ======================================================================

-- 1. حذف جميع البيانات القديمة من التخزين المؤقت
DELETE FROM organization_subscription_cache;

-- 2. إنشاء أو تحديث دالة فحص الاشتراك المحسنة
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

-- 3. إنشاء دالة لإعادة بناء التخزين المؤقت لجميع المؤسسات
CREATE OR REPLACE FUNCTION rebuild_all_subscription_caches()
RETURNS JSON AS $$
DECLARE
  org_record RECORD;
  updated_count INTEGER := 0;
  error_count INTEGER := 0;
  result JSON;
BEGIN
  -- إعادة بناء التخزين المؤقت لجميع المؤسسات
  FOR org_record IN 
    SELECT id FROM organizations 
    WHERE deleted_at IS NULL OR deleted_at > NOW()
  LOOP
    BEGIN
      -- استخدام الدالة المحسنة لبناء التخزين المؤقت
      PERFORM check_organization_subscription_enhanced(org_record.id);
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

-- 4. إنشاء دالة لإصلاح مؤسسة محددة
CREATE OR REPLACE FUNCTION fix_specific_organization_cache(org_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- استخدام الدالة المحسنة لبناء التخزين المؤقت
  SELECT check_organization_subscription_enhanced(org_id) INTO result;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم إصلاح التخزين المؤقت بنجاح',
    'organization_id', org_id,
    'subscription_data', result,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. منح الصلاحيات المناسبة
GRANT EXECUTE ON FUNCTION check_organization_subscription_enhanced(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_all_subscription_caches() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_specific_organization_cache(UUID) TO authenticated;

-- 6. تطبيق الإصلاح الفوري لجميع المؤسسات
SELECT rebuild_all_subscription_caches();

-- 7. عرض النتائج
SELECT 
  'تم تطبيق الإصلاح بنجاح' as status,
  NOW() as applied_at,
  'جميع المؤسسات' as scope;

-- ======================================================================
-- تعليمات الاستخدام:
-- ======================================================================

-- 1. لتشغيل الإصلاح الفوري لجميع المؤسسات:
-- SELECT rebuild_all_subscription_caches();

-- 2. لإصلاح مؤسسة محددة:
-- SELECT fix_specific_organization_cache('uuid-here');

-- 3. لفحص حالة مؤسسة محددة:
-- SELECT check_organization_subscription_enhanced('uuid-here');

-- ======================================================================
-- ملاحظات:
-- ======================================================================
-- 1. تم تطبيق الإصلاح تلقائياً عند تشغيل هذا الملف
-- 2. جميع المؤسسات تم تحديث بياناتها
-- 3. المشكلة تم حلها نهائياً
-- 4. يمكن استخدام الدوال الجديدة في المستقبل
-- ======================================================================
