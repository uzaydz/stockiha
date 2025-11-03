-- ═══════════════════════════════════════════════════════════════════
-- 🚀 تطبيق جميع التحديثات دفعة واحدة
-- التاريخ: 2025-11-02
-- الوصف: هذا الملف يطبق جميع التحديثات اللازمة لنظام طلبات الاشتراك
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- الجزء 1: إصلاح Foreign Key Constraint
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '🔧 جاري إصلاح Foreign Key Constraint...';

    -- حذف الـ constraint القديم إذا كان موجوداً
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'activation_codes_subscription_id_fkey'
        AND table_name = 'activation_codes'
    ) THEN
        ALTER TABLE activation_codes
        DROP CONSTRAINT activation_codes_subscription_id_fkey;

        RAISE NOTICE '✅ تم حذف الـ constraint القديم';
    END IF;
END $$;

-- إضافة الـ constraint الجديد
ALTER TABLE activation_codes
ADD CONSTRAINT activation_codes_subscription_id_fkey
FOREIGN KEY (subscription_id)
REFERENCES organization_subscriptions(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════
-- الجزء 2: تحديث دالة admin_get_subscription_requests
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '🔧 جاري تحديث دالة admin_get_subscription_requests...';
END $$;

-- حذف الدالة القديمة
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

-- ═══════════════════════════════════════════════════════════════════
-- الجزء 3: إنشاء Storage Bucket
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '🔧 جاري إنشاء Storage Bucket...';
END $$;

-- إنشاء الـ bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subscriptions',
  'subscriptions',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf']::text[];

-- ═══════════════════════════════════════════════════════════════════
-- الجزء 4: إنشاء Storage Policies
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '🔧 جاري إنشاء Storage Policies...';
END $$;

-- حذف الـ policies القديمة إذا كانت موجودة
DROP POLICY IF EXISTS "Allow authenticated users to upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow super admin to view all payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own payment proofs" ON storage.objects;

-- إنشاء الـ policies
CREATE POLICY "Allow authenticated users to upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'subscriptions' AND
  (storage.foldername(name))[1] = 'payment_proofs'
);

CREATE POLICY "Allow users to view their own payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'subscriptions' AND
  (storage.foldername(name))[1] = 'payment_proofs'
);

CREATE POLICY "Allow super admin to view all payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'subscriptions' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
    AND is_super_admin = true
  )
);

CREATE POLICY "Allow users to delete their own payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'subscriptions' AND
  (storage.foldername(name))[1] = 'payment_proofs'
);

-- ═══════════════════════════════════════════════════════════════════
-- ✅ اكتمل التطبيق بنجاح
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅✅✅ تم تطبيق جميع التحديثات بنجاح! ✅✅✅';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 ما تم تطبيقه:';
  RAISE NOTICE '   ✅ إصلاح Foreign Key Constraint';
  RAISE NOTICE '   ✅ تحديث دالة admin_get_subscription_requests';
  RAISE NOTICE '   ✅ إنشاء Storage Bucket (subscriptions)';
  RAISE NOTICE '   ✅ إنشاء Storage Policies';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 الخطوات التالية:';
  RAISE NOTICE '   1. قم بتحديث الصفحة في المتصفح (Ctrl+Shift+R أو Cmd+Shift+R)';
  RAISE NOTICE '   2. جرب إنشاء طلب اشتراك جديد';
  RAISE NOTICE '   3. جرب رفع ملف إثبات الدفع';
  RAISE NOTICE '   4. من حساب Super Admin، راجع الطلب';
  RAISE NOTICE '   5. جرب قبول الطلب لتفعيل الاشتراك';
  RAISE NOTICE '';
  RAISE NOTICE '📍 صفحة طلبات الاشتراك للسوبر أدمين:';
  RAISE NOTICE '   /super-admin/subscription-requests';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '💡 نصيحة: إذا واجهت أي مشاكل، تحقق من Console Log في المتصفح';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- الجزء 5: إصلاح دالة admin_approve_subscription_request
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '🔧 جاري إصلاح دالة admin_approve_subscription_request...';
END $$;

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
