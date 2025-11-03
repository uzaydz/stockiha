-- Fix get_unified_subscription_data to properly handle canceled/expired subscriptions
-- Issue: When subscription is canceled, it still shows trial period instead of canceled status

DROP FUNCTION IF EXISTS get_unified_subscription_data(UUID);

CREATE OR REPLACE FUNCTION get_unified_subscription_data(
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_subscription RECORD;
  v_plan RECORD;
  v_org RECORD;
  v_orders_limit RECORD;
  v_days_remaining INTEGER;
  v_has_active BOOLEAN := FALSE;
  v_subscription_status TEXT;
BEGIN
  -- الحصول على بيانات المؤسسة
  SELECT * INTO v_org
  FROM organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'organization_not_found'
    );
  END IF;

  -- ====================
  -- الجزء 1: بيانات الإشتراك
  -- ====================

  -- ✅ FIX: البحث عن أحدث اشتراك (نشط، منتهي، أو ملغى)
  SELECT
    os.*,
    sp.name AS plan_name,
    sp.code AS plan_code,
    sp.limits AS plan_limits
  INTO v_subscription
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON sp.id = os.plan_id
  WHERE os.organization_id = p_organization_id
  ORDER BY os.created_at DESC
  LIMIT 1;

  -- إذا وُجد اشتراك
  IF FOUND THEN
    -- ✅ FIX: التحقق من حالة الاشتراك
    IF v_subscription.status = 'canceled' THEN
      -- اشتراك ملغى
      v_has_active := FALSE;
      v_subscription_status := 'canceled';
      v_days_remaining := 0;
    ELSIF v_subscription.status = 'expired' OR v_subscription.end_date < CURRENT_DATE THEN
      -- اشتراك منتهي
      v_has_active := FALSE;
      v_subscription_status := 'expired';
      v_days_remaining := 0;
    ELSIF v_subscription.status = 'active' AND v_subscription.end_date > CURRENT_DATE THEN
      -- اشتراك نشط
      v_has_active := TRUE;
      v_subscription_status := 'active';
      v_days_remaining := EXTRACT(DAY FROM (v_subscription.end_date - CURRENT_DATE))::INTEGER;
    ELSE
      -- أي حالة أخرى غير متوقعة
      v_has_active := FALSE;
      v_subscription_status := v_subscription.status;
      v_days_remaining := 0;
    END IF;
  ELSE
    -- ✅ لا يوجد اشتراك على الإطلاق - التحقق من الفترة التجريبية
    IF v_org.settings IS NOT NULL AND v_org.settings ? 'trial_end_date' THEN
      DECLARE
        v_trial_end_date DATE;
      BEGIN
        v_trial_end_date := (v_org.settings->>'trial_end_date')::DATE;

        IF v_trial_end_date >= CURRENT_DATE THEN
          v_has_active := FALSE;
          v_subscription_status := 'trial';
          v_days_remaining := EXTRACT(DAY FROM (v_trial_end_date - CURRENT_DATE))::INTEGER;
        ELSE
          v_subscription_status := 'expired';
          v_days_remaining := 0;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- في حالة خطأ في تحليل التاريخ، استخدم الطريقة القديمة
          DECLARE
            v_created_days INTEGER;
          BEGIN
            v_created_days := EXTRACT(DAY FROM (CURRENT_DATE - v_org.created_at::DATE))::INTEGER;

            IF v_created_days < 5 THEN
              v_has_active := FALSE;
              v_subscription_status := 'trial';
              v_days_remaining := 5 - v_created_days;
            ELSE
              v_subscription_status := 'expired';
              v_days_remaining := 0;
            END IF;
          END;
      END;
    ELSE
      -- استخدام الطريقة القديمة (5 أيام من الإنشاء)
      DECLARE
        v_created_days INTEGER;
      BEGIN
        v_created_days := EXTRACT(DAY FROM (CURRENT_DATE - v_org.created_at::DATE))::INTEGER;

        IF v_created_days < 5 THEN
          v_has_active := FALSE;
          v_subscription_status := 'trial';
          v_days_remaining := 5 - v_created_days;
        ELSE
          v_subscription_status := 'expired';
          v_days_remaining := 0;
        END IF;
      END;
    END IF;
  END IF;

  -- ====================
  -- الجزء 2: حد الطلبات الإلكترونية
  -- ====================

  DECLARE
    v_current_limit INTEGER;
    v_used_count INTEGER;
    v_remaining_count INTEGER;
    v_has_orders_limit BOOLEAN := FALSE;
  BEGIN
    -- الحصول على الحد من الخطة أو الإعدادات
    IF v_subscription.id IS NOT NULL AND
       v_subscription.plan_limits IS NOT NULL AND
       v_subscription.plan_limits ? 'online_orders_limit' THEN
      v_current_limit := (v_subscription.plan_limits->>'online_orders_limit')::INTEGER;
      v_has_orders_limit := TRUE;
    ELSIF v_org.settings IS NOT NULL AND v_org.settings ? 'online_orders_limit' THEN
      v_current_limit := (v_org.settings->>'online_orders_limit')::INTEGER;
      v_has_orders_limit := TRUE;
    ELSE
      v_current_limit := NULL;
      v_has_orders_limit := FALSE;
    END IF;

    -- حساب عدد الطلبات المستخدمة (إذا كان هناك حد)
    IF v_has_orders_limit THEN
      SELECT COUNT(*)::INTEGER INTO v_used_count
      FROM orders
      WHERE organization_id = p_organization_id;

      v_remaining_count := GREATEST(0, v_current_limit - v_used_count);
    ELSE
      v_used_count := 0;
      v_remaining_count := NULL;
    END IF;

    -- ====================
    -- بناء النتيجة النهائية
    -- ====================

    v_result := jsonb_build_object(
      'success', TRUE,

      -- بيانات الإشتراك
      'has_active_subscription', v_has_active,
      'subscription_id', v_subscription.id,
      'plan_name', v_subscription.plan_name,
      'plan_code', v_subscription.plan_code,
      'subscription_status', v_subscription_status,
      'days_remaining', v_days_remaining,
      'start_date', v_subscription.start_date,
      'end_date', v_subscription.end_date,

      -- بيانات حد الطلبات
      'has_orders_limit', v_has_orders_limit,
      'max_orders', v_current_limit,
      'current_orders', v_used_count,
      'remaining_orders', v_remaining_count,

      -- معلومات إضافية
      'organization_id', p_organization_id,
      'fetched_at', NOW()
    );

    RETURN v_result;
  END;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- ====================
-- الصلاحيات
-- ====================

GRANT EXECUTE ON FUNCTION get_unified_subscription_data(UUID) TO authenticated;

COMMENT ON FUNCTION get_unified_subscription_data(UUID) IS
'دالة موحدة تجلب جميع بيانات الإشتراك والطلبات في استدعاء واحد لتحسين الأداء - Fixed: Properly handles canceled and expired subscriptions';
