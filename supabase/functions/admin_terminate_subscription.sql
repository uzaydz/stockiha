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
  v_subscription organization_subscriptions%ROWTYPE;
  v_organization organizations%ROWTYPE;
  v_termination_reason TEXT;
BEGIN
  -- التحقق من صلاحيات السوبر أدمن
  SELECT is_super_admin INTO v_is_super FROM users WHERE id = auth.uid();
  IF NOT COALESCE(v_is_super, FALSE) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not_authorized';
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

  -- إنهاء جميع الاشتراكات النشطة والتجريبية
  UPDATE organization_subscriptions
  SET 
    status = 'canceled',
    updated_at = NOW()
  WHERE organization_id = p_organization_id 
    AND status IN ('active', 'pending', 'trial');

  -- تحديث المؤسسة
  UPDATE organizations
  SET 
    subscription_status = 'canceled',
    subscription_tier = NULL,
    subscription_id = NULL,
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

  -- التأكد من إزالة جميع المراجع للاشتراك التجريبي (تحديث إضافي)
  UPDATE organizations
  SET 
    subscription_status = 'canceled',
    subscription_tier = NULL,
    subscription_id = NULL,
    updated_at = NOW()
  WHERE id = p_organization_id;

  -- تحديث إضافي لضمان إزالة جميع المراجع للاشتراك التجريبي
  UPDATE organizations
  SET 
    subscription_status = 'canceled',
    subscription_tier = NULL,
    subscription_id = NULL,
    updated_at = NOW()
  WHERE id = p_organization_id 
    AND (subscription_status = 'trial' OR subscription_tier = 'trial' OR subscription_status = 'active' OR subscription_status = 'pending');

  -- تحديث نهائي لضمان إزالة جميع المراجع للاشتراك التجريبي
  UPDATE organizations
  SET 
    subscription_status = 'canceled',
    subscription_tier = NULL,
    subscription_id = NULL,
    updated_at = NOW()
  WHERE id = p_organization_id;

  -- تحديث إضافي لضمان إزالة جميع المراجع للاشتراك التجريبي
  UPDATE organizations
  SET 
    subscription_status = 'canceled',
    subscription_tier = NULL,
    subscription_id = NULL,
    updated_at = NOW()
  WHERE id = p_organization_id;

  -- تحديث نهائي لضمان إزالة جميع المراجع للاشتراك التجريبي
  UPDATE organizations
  SET 
    subscription_status = 'canceled',
    subscription_tier = NULL,
    subscription_id = NULL,
    updated_at = NOW()
  WHERE id = p_organization_id;

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
          'performed_by', auth.uid()
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
