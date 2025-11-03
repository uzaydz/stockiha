-- Migration: Create subscription_requests table
-- التاريخ: 2025-11-02
-- الوصف: إنشاء جدول لتخزين طلبات الاشتراك من العملاء

-- إنشاء جدول طلبات الاشتراك
CREATE TABLE IF NOT EXISTS subscription_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,

  -- معلومات الطلب
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'DZD',

  -- معلومات الدفع
  payment_method TEXT,
  payment_proof_url TEXT,
  payment_reference TEXT,
  payment_notes TEXT,

  -- معلومات إضافية
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  -- حالة الطلب
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),

  -- ملاحظات
  customer_notes TEXT,
  admin_notes TEXT,
  rejection_reason TEXT,

  -- من قام بالموافقة/الرفض
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,

  -- تواريخ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_subscription_requests_organization ON subscription_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_plan ON subscription_requests(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON subscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_created_at ON subscription_requests(created_at DESC);

-- إنشاء trigger للتحديث التلقائي لـ updated_at
CREATE OR REPLACE FUNCTION update_subscription_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_requests_updated_at
  BEFORE UPDATE ON subscription_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_requests_updated_at();

-- إنشاء RLS policies
ALTER TABLE subscription_requests ENABLE ROW LEVEL SECURITY;

-- السماح للمستخدمين بإنشاء طلبات لمؤسساتهم
CREATE POLICY "Users can create requests for their organization"
  ON subscription_requests
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- السماح للمستخدمين بعرض طلبات مؤسساتهم
CREATE POLICY "Users can view their organization requests"
  ON subscription_requests
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND is_super_admin = true
    )
  );

-- السماح للسوبر أدمين بعرض وتعديل جميع الطلبات
CREATE POLICY "Super admin can manage all requests"
  ON subscription_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND is_super_admin = true
    )
  );

-- دالة للحصول على جميع طلبات الاشتراك (للسوبر أدمين)
CREATE OR REPLACE FUNCTION admin_get_subscription_requests(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  request_id UUID,
  organization_id UUID,
  organization_name TEXT,
  organization_email TEXT,
  plan_id UUID,
  plan_name TEXT,
  plan_code TEXT,
  billing_cycle TEXT,
  amount DECIMAL,
  currency TEXT,
  payment_method TEXT,
  payment_proof_url TEXT,
  payment_reference TEXT,
  payment_notes TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT,
  customer_notes TEXT,
  admin_notes TEXT,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_is_super BOOLEAN;
BEGIN
  -- التحقق من صلاحيات السوبر أدمين
  SELECT is_super_admin INTO v_is_super
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF NOT COALESCE(v_is_super, FALSE) THEN
    RAISE EXCEPTION 'not_authorized' USING HINT = 'Super admin access required';
  END IF;

  RETURN QUERY
  SELECT
    sr.id,
    sr.organization_id,
    o.name AS organization_name,
    COALESCE(sr.contact_email, '') AS organization_email,
    sr.plan_id,
    sp.name AS plan_name,
    sp.code AS plan_code,
    sr.billing_cycle,
    sr.amount,
    sr.currency,
    sr.payment_method,
    sr.payment_proof_url,
    sr.payment_reference,
    sr.payment_notes,
    sr.contact_name,
    sr.contact_email,
    sr.contact_phone,
    sr.status,
    sr.customer_notes,
    sr.admin_notes,
    sr.rejection_reason,
    sr.reviewed_by,
    u.name AS reviewed_by_name,
    sr.reviewed_at,
    sr.created_at,
    sr.updated_at
  FROM subscription_requests sr
  LEFT JOIN organizations o ON sr.organization_id = o.id
  LEFT JOIN subscription_plans sp ON sr.plan_id = sp.id
  LEFT JOIN users u ON sr.reviewed_by = u.id
  WHERE (p_status IS NULL OR sr.status = p_status)
  ORDER BY sr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- دالة لإنشاء طلب اشتراك جديد
CREATE OR REPLACE FUNCTION create_subscription_request(
  p_organization_id UUID,
  p_plan_id UUID,
  p_billing_cycle TEXT,
  p_amount DECIMAL,
  p_currency TEXT DEFAULT 'DZD',
  p_payment_method TEXT DEFAULT NULL,
  p_payment_proof_url TEXT DEFAULT NULL,
  p_payment_reference TEXT DEFAULT NULL,
  p_payment_notes TEXT DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_request_id UUID;
  v_user_org_id UUID;
BEGIN
  -- التحقق من أن المستخدم ينتمي للمؤسسة
  SELECT organization_id INTO v_user_org_id
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_user_org_id != p_organization_id THEN
    RAISE EXCEPTION 'unauthorized' USING HINT = 'You can only create requests for your organization';
  END IF;

  -- إنشاء الطلب
  INSERT INTO subscription_requests (
    organization_id,
    plan_id,
    billing_cycle,
    amount,
    currency,
    payment_method,
    payment_proof_url,
    payment_reference,
    payment_notes,
    contact_name,
    contact_email,
    contact_phone,
    customer_notes,
    status
  ) VALUES (
    p_organization_id,
    p_plan_id,
    p_billing_cycle,
    p_amount,
    p_currency,
    p_payment_method,
    p_payment_proof_url,
    p_payment_reference,
    p_payment_notes,
    p_contact_name,
    p_contact_email,
    p_contact_phone,
    p_customer_notes,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'request_id', v_request_id,
    'message', 'تم إرسال طلب الاشتراك بنجاح'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

-- دالة لقبول طلب الاشتراك وتفعيل الحساب
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
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
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

  -- حساب تواريخ الاشتراك
  v_start_date := NOW();
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
    v_start_date::TEXT,
    v_end_date::TEXT,
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

-- دالة لرفض طلب الاشتراك
CREATE OR REPLACE FUNCTION admin_reject_subscription_request(
  p_request_id UUID,
  p_rejection_reason TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_is_super BOOLEAN;
BEGIN
  -- التحقق من صلاحيات السوبر أدمين
  SELECT is_super_admin INTO v_is_super
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF NOT COALESCE(v_is_super, FALSE) THEN
    RAISE EXCEPTION 'not_authorized' USING HINT = 'Super admin access required';
  END IF;

  -- تحديث حالة الطلب
  UPDATE subscription_requests
  SET
    status = 'rejected',
    rejection_reason = p_rejection_reason,
    admin_notes = p_admin_notes,
    reviewed_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1),
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found_or_already_processed';
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'تم رفض الطلب'
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
GRANT EXECUTE ON FUNCTION admin_get_subscription_requests(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_subscription_request(UUID, UUID, TEXT, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_subscription_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_subscription_request(UUID, TEXT, TEXT) TO authenticated;

-- تعليقات
COMMENT ON TABLE subscription_requests IS 'جدول طلبات الاشتراك من العملاء';
COMMENT ON FUNCTION admin_get_subscription_requests IS 'دالة للحصول على جميع طلبات الاشتراك (للسوبر أدمين فقط)';
COMMENT ON FUNCTION create_subscription_request IS 'دالة لإنشاء طلب اشتراك جديد';
COMMENT ON FUNCTION admin_approve_subscription_request IS 'دالة لقبول طلب الاشتراك وتفعيل الحساب';
COMMENT ON FUNCTION admin_reject_subscription_request IS 'دالة لرفض طلب الاشتراك';
