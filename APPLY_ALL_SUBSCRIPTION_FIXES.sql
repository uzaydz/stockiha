-- ═══════════════════════════════════════════════════════════════════
-- تطبيق جميع إصلاحات نظام الاشتراك والطلبات
-- التاريخ: 2025-11-02
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- الجزء 1: إصلاح foreign key constraint
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- محاولة حذف الـ constraint القديم
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'activation_codes_subscription_id_fkey'
        AND table_name = 'activation_codes'
    ) THEN
        ALTER TABLE activation_codes
        DROP CONSTRAINT activation_codes_subscription_id_fkey;

        RAISE NOTICE '✅ تم حذف الـ constraint القديم بنجاح';
    END IF;
END $$;

-- إضافة الـ constraint الجديد مع ON DELETE SET NULL
ALTER TABLE activation_codes
ADD CONSTRAINT activation_codes_subscription_id_fkey
FOREIGN KEY (subscription_id)
REFERENCES organization_subscriptions(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

RAISE NOTICE '✅ تم إضافة الـ constraint الجديد بنجاح';

-- ═══════════════════════════════════════════════════════════════════
-- الجزء 2: تحديث دالة admin_get_subscription_requests
-- ═══════════════════════════════════════════════════════════════════

-- حذف الدالة القديمة إن وجدت
DROP FUNCTION IF EXISTS admin_get_subscription_requests(TEXT, INTEGER, INTEGER);

-- إنشاء الدالة المحدثة
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

RAISE NOTICE '✅ تم تحديث دالة admin_get_subscription_requests بنجاح';

-- ═══════════════════════════════════════════════════════════════════
-- الجزء 3: تحديث دالة admin_terminate_subscription (اختياري)
-- ═══════════════════════════════════════════════════════════════════

-- يمكنك تطبيق هذا الجزء إذا لم يتم تطبيقه من قبل
-- راجع ملف: supabase/functions/admin_terminate_subscription.sql

-- ═══════════════════════════════════════════════════════════════════
-- اكتمل التطبيق بنجاح ✅
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ تم تطبيق جميع الإصلاحات بنجاح!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'الخطوات التالية:';
  RAISE NOTICE '1. قم بتحديث الصفحة في المتصفح';
  RAISE NOTICE '2. ادخل إلى صفحة طلبات الاشتراك: /super-admin/subscription-requests';
  RAISE NOTICE '3. تأكد من عدم وجود أخطاء في Console';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;
