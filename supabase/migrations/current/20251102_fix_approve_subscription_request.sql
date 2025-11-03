-- Migration: Fix admin_approve_subscription_request function
-- التاريخ: 2025-11-02
-- الوصف: إصلاح استدعاء admin_upsert_subscription مع النوع الصحيح للتواريخ

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS admin_approve_subscription_request(UUID, TEXT);

-- إنشاء الدالة المحدثة
CREATE OR REPLACE FUNCTION admin_approve_subscription_request(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_is_super BOOLEAN;
  v_request subscription_requests%ROWTYPE;
  v_plan subscription_plans%ROWTYPE;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- التحقق من صلاحيات السوبر أدمين
  SELECT is_super_admin INTO v_is_super
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF NOT COALESCE(v_is_super, FALSE) THEN
    RAISE EXCEPTION 'not_authorized' USING HINT = 'Super admin access required';
  END IF;

  -- الحصول على تفاصيل الطلب
  SELECT * INTO v_request FROM subscription_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'request_already_processed';
  END IF;

  -- الحصول على تفاصيل الباقة
  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_request.plan_id;

  -- حساب تواريخ الاشتراك كـ DATE
  v_start_date := CURRENT_DATE;
  IF v_request.billing_cycle = 'monthly' THEN
    v_end_date := v_start_date + INTERVAL '1 month';
  ELSE
    v_end_date := v_start_date + INTERVAL '1 year';
  END IF;

  -- استخدام دالة admin_upsert_subscription لتفعيل الاشتراك
  PERFORM admin_upsert_subscription(
    v_request.organization_id,
    v_request.plan_id,
    'active',
    v_request.billing_cycle,
    v_start_date,  -- DATE بدلاً من TEXT
    v_end_date,    -- DATE بدلاً من TEXT
    v_request.amount,
    v_request.currency,
    p_admin_notes,
    FALSE
  );

  -- تحديث حالة الطلب
  UPDATE subscription_requests
  SET
    status = 'approved',
    admin_notes = p_admin_notes,
    reviewed_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1),
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'تم قبول الطلب وتفعيل الاشتراك بنجاح'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION admin_approve_subscription_request(UUID, TEXT) TO authenticated;

-- تعليق
COMMENT ON FUNCTION admin_approve_subscription_request IS 'دالة لقبول طلب الاشتراك وتفعيل الحساب - محدثة';

-- إشعار بالنجاح
DO $$
BEGIN
  RAISE NOTICE '✅ تم تحديث دالة admin_approve_subscription_request بنجاح';
END $$;
