-- Fix admin_upsert_subscription to properly handle subscription_tier for canceled/expired subscriptions
-- Issue: When updating subscription to canceled/expired, tier still shows in organizations table

DROP FUNCTION IF EXISTS admin_upsert_subscription(UUID, UUID, TEXT, TEXT, DATE, DATE, NUMERIC, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION admin_upsert_subscription(
  p_organization_id UUID,
  p_plan_id UUID,
  p_status TEXT,
  p_billing_cycle TEXT,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT NULL,
  p_amount_paid NUMERIC(10,2) DEFAULT 0,
  p_currency TEXT DEFAULT 'DZD',
  p_notes TEXT DEFAULT NULL,
  p_training_courses_access BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_is_super BOOLEAN;
  v_is_active BOOLEAN;
  v_auth_id UUID;
  v_plan subscription_plans%ROWTYPE;
  v_new_subscription organization_subscriptions%ROWTYPE;
  v_valid_status CONSTANT TEXT[] := ARRAY['pending','active','expired','canceled'];
  v_valid_billing CONSTANT TEXT[] := ARRAY['monthly','yearly'];
  v_effective_end DATE;
BEGIN
  -- Enhanced authorization check - use auth_user_id and check is_active
  SELECT is_super_admin, is_active, auth_user_id
  INTO v_is_super, v_is_active, v_auth_id
  FROM users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  -- Verify super admin status and active account
  IF NOT COALESCE(v_is_super, FALSE) THEN
    RAISE EXCEPTION 'not_authorized' USING HINT = 'Super admin access required';
  END IF;

  -- Verify auth_user_id matches
  IF v_auth_id IS NULL OR v_auth_id != auth.uid() THEN
    RAISE EXCEPTION 'authentication_mismatch' USING HINT = 'User authentication validation failed';
  END IF;

  IF p_status IS NULL OR NOT (p_status = ANY (v_valid_status)) THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF p_billing_cycle IS NULL OR NOT (p_billing_cycle = ANY (v_valid_billing)) THEN
    RAISE EXCEPTION 'invalid_billing_cycle';
  END IF;

  IF p_start_date IS NULL THEN
    RAISE EXCEPTION 'start_date_required';
  END IF;

  -- Validate amount_paid - prevent negative or excessive values
  IF p_amount_paid < 0 OR p_amount_paid > 99999999.99 THEN
    RAISE EXCEPTION 'invalid_amount' USING HINT = 'Amount must be between 0 and 99999999.99';
  END IF;

  -- Validate currency - only allow specific currencies
  IF p_currency IS NOT NULL AND UPPER(TRIM(p_currency)) NOT IN ('DZD', 'USD', 'EUR') THEN
    RAISE EXCEPTION 'invalid_currency' USING HINT = 'Currency must be DZD, USD, or EUR';
  END IF;

  SELECT * INTO v_plan FROM subscription_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  IF p_end_date IS NULL THEN
    v_effective_end := CASE
      WHEN p_billing_cycle = 'monthly' THEN p_start_date + INTERVAL '1 month'
      ELSE p_start_date + INTERVAL '1 year'
    END::DATE;
  ELSE
    v_effective_end := p_end_date;
  END IF;

  IF v_effective_end < p_start_date THEN
    RAISE EXCEPTION 'end_date_before_start';
  END IF;

  -- البحث عن الاشتراك الموجود
  SELECT * INTO v_new_subscription
  FROM organization_subscriptions
  WHERE organization_id = p_organization_id
    AND status IN ('active', 'pending', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;

  -- إذا لم يوجد اشتراك، إنشاء واحد جديد
  IF v_new_subscription.id IS NULL THEN
    INSERT INTO organization_subscriptions (
      organization_id,
      plan_id,
      status,
      billing_cycle,
      start_date,
      end_date,
      amount_paid,
      currency,
      payment_method,
      payment_reference,
      is_auto_renew,
      lifetime_courses_access,
      accessible_courses,
      courses_access_expires_at,
      created_at,
      updated_at
    ) VALUES (
      p_organization_id,
      p_plan_id,
      p_status,
      p_billing_cycle,
      p_start_date,
      v_effective_end,
      COALESCE(p_amount_paid, 0),
      COALESCE(NULLIF(TRIM(p_currency), ''), 'DZD'),
      'admin_manual',
      p_notes,
      FALSE,
      p_training_courses_access,
      CASE WHEN p_training_courses_access THEN '[]'::JSONB ELSE '[]'::JSONB END,
      CASE WHEN p_training_courses_access THEN NULL ELSE v_effective_end END,
      NOW(),
      NOW()
    ) RETURNING * INTO v_new_subscription;
  ELSE
    -- تحديث الاشتراك الموجود
    UPDATE organization_subscriptions
    SET
      plan_id = p_plan_id,
      status = p_status,
      billing_cycle = p_billing_cycle,
      start_date = p_start_date,
      end_date = v_effective_end,
      amount_paid = COALESCE(p_amount_paid, 0),
      currency = COALESCE(NULLIF(TRIM(p_currency), ''), 'DZD'),
      payment_method = 'admin_manual',
      payment_reference = p_notes,
      is_auto_renew = FALSE,
      lifetime_courses_access = p_training_courses_access,
      accessible_courses = CASE WHEN p_training_courses_access THEN '[]'::JSONB ELSE '[]'::JSONB END,
      courses_access_expires_at = CASE WHEN p_training_courses_access THEN NULL ELSE v_effective_end END,
      updated_at = NOW()
    WHERE id = v_new_subscription.id
    RETURNING * INTO v_new_subscription;
  END IF;

  -- ✅ FIX: تحديث حالة المؤسسة بناءً على حالة الاشتراك
  UPDATE organizations
  SET
    subscription_id = v_new_subscription.id,
    subscription_status = p_status,
    -- إذا كان الاشتراك ملغى أو منتهي، لا تعرض tier
    subscription_tier = CASE
      WHEN p_status IN ('canceled', 'expired') THEN NULL
      ELSE v_plan.code
    END,
    updated_at = NOW()
  WHERE id = p_organization_id;

  -- منح الوصول للدورات إذا كان مطلوباً
  IF p_training_courses_access THEN
    -- حذف الوصول القديم للدورات
    DELETE FROM organization_course_access
    WHERE organization_id = p_organization_id;

    -- منح الوصول لجميع الدورات النشطة مدى الحياة
    INSERT INTO organization_course_access (
      organization_id,
      course_id,
      access_type,
      expires_at,
      granted_by,
      notes
    )
    SELECT
      p_organization_id,
      c.id,
      'lifetime',
      NULL, -- NULL يعني مدى الحياة
      auth.uid(),
      'تم منح الوصول عبر السوبر أدمن: ' || COALESCE(p_notes, 'تحديث الاشتراك')
    FROM courses c
    WHERE c.is_active = true
    ON CONFLICT (organization_id, course_id)
    DO UPDATE SET
      access_type = EXCLUDED.access_type,
      expires_at = EXCLUDED.expires_at,
      granted_by = EXCLUDED.granted_by,
      notes = EXCLUDED.notes,
      updated_at = NOW();
  ELSE
    -- إلغاء الوصول للدورات إذا لم يكن مطلوباً
    DELETE FROM organization_course_access
    WHERE organization_id = p_organization_id;
  END IF;

  INSERT INTO subscription_history (
    organization_id,
    plan_id,
    action,
    from_status,
    to_status,
    amount,
    notes,
    created_at,
    created_by
  ) VALUES (
    p_organization_id,
    p_plan_id,
    'created',
    'none',
    p_status,
    COALESCE(p_amount_paid, 0),
    jsonb_build_object(
      'billing_cycle', p_billing_cycle,
      'notes', p_notes,
      'performed_by', auth.uid(),
      'training_courses_access', p_training_courses_access
    ),
    NOW(),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'subscription_id', v_new_subscription.id,
    'organization_id', p_organization_id,
    'status', p_status,
    'plan_code', v_plan.code,
    'start_date', v_new_subscription.start_date,
    'end_date', v_new_subscription.end_date,
    'training_courses_access', p_training_courses_access
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'يوجد اشتراك نشط بالفعل لهذه المؤسسة'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_upsert_subscription(UUID, UUID, TEXT, TEXT, DATE, DATE, NUMERIC, TEXT, TEXT, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION admin_upsert_subscription IS 'Fixed: Sets subscription_tier to NULL for canceled/expired subscriptions to prevent showing tier in organizations list';
