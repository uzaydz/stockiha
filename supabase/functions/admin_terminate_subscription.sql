-- Function: admin_terminate_subscription
-- وصف: يسمح للسوبر أدمين بإنهاء اشتراك مؤسسة مع خيار إبقاء الوصول للدورات

CREATE OR REPLACE FUNCTION admin_terminate_subscription(
  p_organization_id UUID,
  p_keep_courses_access BOOLEAN DEFAULT FALSE,
  p_termination_reason TEXT DEFAULT NULL,
  p_termination_notes TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_is_super BOOLEAN;
  v_is_active BOOLEAN;
  v_auth_id UUID;
  v_subscription organization_subscriptions%ROWTYPE;
  v_organization organizations%ROWTYPE;
  v_termination_reason TEXT;
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

  -- التحقق من وجود المؤسسة
  SELECT * INTO v_organization FROM organizations WHERE id = p_organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'organization_not_found';
  END IF;

  -- البحث عن الاشتراك النشط
  SELECT * INTO v_subscription 
  FROM organization_subscriptions 
  WHERE organization_id = p_organization_id 
    AND status IN ('active', 'pending', 'trial')
  ORDER BY created_at DESC 
  LIMIT 1;

  -- تحديد سبب الإنهاء
  v_termination_reason := COALESCE(p_termination_reason, 'admin_termination');

  -- ✅ FIX: أولاً، تحديث activation_codes لإزالة subscription_id لتجنب foreign key constraint
  -- هذا يحل مشكلة "violates foreign key constraint activation_codes_subscription_id_fkey"
  UPDATE activation_codes
  SET
    subscription_id = NULL,
    updated_at = NOW()
  WHERE organization_id = p_organization_id
    AND subscription_id IS NOT NULL;

  -- ✅ FIX: ثانياً، حذف الـ cache للاشتراكات الملغاة/المنتهية
  BEGIN
    DELETE FROM organization_subscription_cache
    WHERE organization_id = p_organization_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- تجاهل الخطأ إذا كان الجدول غير موجود
      NULL;
  END;

  -- ✅ FIX: ثالثاً، حذف جميع الاشتراكات الملغاة/المنتهية السابقة لتجنب unique constraint
  DELETE FROM organization_subscriptions
  WHERE organization_id = p_organization_id
    AND status IN ('canceled', 'expired');

  -- ✅ FIX: رابعاً، إنهاء جميع الاشتراكات النشطة والتجريبية وتحديث end_date إلى الآن
  UPDATE organization_subscriptions
  SET
    status = 'canceled',
    end_date = NOW(),  -- ✅ تحديث تاريخ النهاية إلى الآن عند الإلغاء
    updated_at = NOW()
  WHERE organization_id = p_organization_id
    AND status IN ('active', 'pending', 'trial');

  -- ✅ FIX: تحديث المؤسسة - إزالة الاشتراك تماماً وإلغاء الفترة التجريبية
  UPDATE organizations
  SET
    subscription_status = 'canceled',
    subscription_tier = NULL,
    subscription_id = NULL,
    -- ✅ إلغاء الفترة التجريبية بتعيين trial_end_date إلى الأمس
    settings = CASE
      WHEN settings IS NOT NULL THEN
        jsonb_set(
          settings,
          '{trial_end_date}',
          to_jsonb((CURRENT_DATE - INTERVAL '1 day')::TEXT)
        )
      ELSE
        jsonb_build_object('trial_end_date', (CURRENT_DATE - INTERVAL '1 day')::TEXT)
    END,
    updated_at = NOW()
  WHERE id = p_organization_id;

  -- إدارة الوصول للدورات
  IF NOT p_keep_courses_access THEN
    -- إلغاء الوصول للدورات
    DELETE FROM organization_course_access
    WHERE organization_id = p_organization_id;
  ELSE
    -- تحديث الوصول للدورات ليكون مدى الحياة
    UPDATE organization_course_access
    SET
      expires_at = NULL,
      notes = COALESCE(notes, '') || ' - تم إنهاء الاشتراك مع الاحتفاظ بالدورات مدى الحياة',
      updated_at = NOW()
    WHERE organization_id = p_organization_id;
  END IF;

  -- إضافة سجل في تاريخ الاشتراكات (إذا كان هناك اشتراك)
  IF v_subscription.id IS NOT NULL THEN
    BEGIN
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
        v_subscription.plan_id,
        'expired',
        v_subscription.status,
        'canceled',
        0,
        jsonb_build_object(
          'termination_reason', v_termination_reason,
          'termination_notes', p_termination_notes,
          'keep_courses_access', p_keep_courses_access,
          'performed_by', auth.uid(),
          'end_date_updated_to', NOW()  -- ✅ إضافة معلومات التحديث
        ),
        NOW(),
        auth.uid()
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- تجاهل الأخطاء في إدراج السجل
        NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'subscription_id', COALESCE(v_subscription.id, NULL),
    'organization_id', p_organization_id,
    'status', 'canceled',
    'end_date', NOW(),  -- ✅ إرجاع تاريخ النهاية المحدث
    'keep_courses_access', p_keep_courses_access,
    'termination_reason', v_termination_reason,
    'message', CASE
      WHEN v_subscription.id IS NOT NULL THEN 'تم إنهاء الاشتراك بنجاح'
      ELSE 'تم إنهاء جميع الاشتراكات النشطة والتجريبية'
    END
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_terminate_subscription(UUID, BOOLEAN, TEXT, TEXT) TO authenticated;
