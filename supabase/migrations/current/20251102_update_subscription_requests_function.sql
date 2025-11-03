-- Migration: Update admin_get_subscription_requests function
-- التاريخ: 2025-11-02
-- الوصف: تحديث دالة admin_get_subscription_requests لإصلاح خطأ o.email

-- حذف الدالة القديمة وإعادة إنشائها
DROP FUNCTION IF EXISTS admin_get_subscription_requests(TEXT, INTEGER, INTEGER);

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

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION admin_get_subscription_requests(TEXT, INTEGER, INTEGER) TO authenticated;

-- تعليق
COMMENT ON FUNCTION admin_get_subscription_requests IS 'دالة للحصول على جميع طلبات الاشتراك (للسوبر أدمين فقط) - محدثة';
