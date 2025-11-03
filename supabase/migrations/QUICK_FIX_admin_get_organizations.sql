-- =====================================================
-- QUICK FIX: admin_get_organizations_with_subscriptions
-- تحديث سريع لحل مشكلة "authentication_required"
-- =====================================================

-- التحديث: إضافة تشخيص أفضل للمصادقة
CREATE OR REPLACE FUNCTION admin_get_organizations_with_subscriptions(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_tier TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  subscription_status TEXT,
  subscription_tier TEXT,
  created_at TIMESTAMPTZ,
  domain TEXT,
  subdomain TEXT,
  users_count BIGINT,
  subscription_id UUID,
  plan_id UUID,
  plan_name TEXT,
  plan_code TEXT,
  subscription_state TEXT,
  billing_cycle TEXT,
  start_date DATE,
  end_date DATE,
  days_remaining INTEGER,
  amount_paid NUMERIC,
  last_updated TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_is_super BOOLEAN;
  v_is_active BOOLEAN;
  v_auth_id UUID;
  v_limit INT;
  v_sanitized_search TEXT;
BEGIN
  -- Get authenticated user ID
  v_auth_id := auth.uid();

  -- تشخيص: طباعة معلومات التصحيح
  RAISE NOTICE 'DEBUG: auth.uid() = %', v_auth_id;
  RAISE NOTICE 'DEBUG: current_user = %', current_user;
  RAISE NOTICE 'DEBUG: session_user = %', session_user;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required'
      USING HINT = 'User must be authenticated',
            DETAIL = format('auth.uid() returned NULL. current_user=%s, session_user=%s', current_user, session_user);
  END IF;

  -- Enhanced authorization check - use auth_user_id and handle NULL is_active
  SELECT COALESCE(is_super_admin, false), COALESCE(is_active, true)
  INTO v_is_super, v_is_active
  FROM users
  WHERE auth_user_id = v_auth_id
  LIMIT 1;

  -- Check if user was found
  IF v_is_super IS NULL THEN
    RAISE EXCEPTION 'user_not_found'
      USING HINT = 'User record not found in database',
            DETAIL = format('No user found with auth_user_id %s', v_auth_id);
  END IF;

  -- Verify super admin status
  IF NOT v_is_super THEN
    RAISE EXCEPTION 'not_authorized'
      USING HINT = 'Super admin access required',
            DETAIL = format('User %s is not a super admin (is_super_admin=%s)', v_auth_id, v_is_super);
  END IF;

  -- Verify active account
  IF NOT v_is_active THEN
    RAISE EXCEPTION 'account_inactive'
      USING HINT = 'Account is inactive',
            DETAIL = format('User %s account is not active', v_auth_id);
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);

  -- Sanitize search parameter to prevent SQL injection patterns
  v_sanitized_search := CASE
    WHEN p_search IS NULL OR p_search = '' THEN NULL
    ELSE REPLACE(REPLACE(REPLACE(p_search, '%', '\%'), '_', '\_'), '\\', '\\\\')
  END;

  RETURN QUERY
  WITH filtered_orgs AS (
    SELECT o.*
    FROM organizations o
    WHERE (p_status IS NULL OR p_status = '' OR o.subscription_status = p_status)
      AND (p_tier IS NULL OR p_tier = '' OR o.subscription_tier = p_tier)
      AND (
        v_sanitized_search IS NULL OR
        o.name ILIKE '%' || v_sanitized_search || '%' ESCAPE '\' OR
        COALESCE(o.domain, '') ILIKE '%' || v_sanitized_search || '%' ESCAPE '\' OR
        COALESCE(o.subdomain, '') ILIKE '%' || v_sanitized_search || '%' ESCAPE '\'
      )
    ORDER BY o.created_at DESC
    LIMIT v_limit
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  )
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.subscription_status,
    o.subscription_tier,
    o.created_at,
    o.domain,
    o.subdomain,
    COALESCE(u.user_count, 0) AS users_count,
    os.id AS subscription_id,
    os.plan_id,
    sp.name AS plan_name,
    sp.code AS plan_code,
    os.status AS subscription_state,
    os.billing_cycle,
    os.start_date,
    os.end_date,
    CASE
      WHEN os.end_date IS NULL THEN NULL
      ELSE GREATEST(0, (os.end_date::date - CURRENT_DATE))
    END AS days_remaining,
    os.amount_paid,
    COALESCE(os.updated_at, o.updated_at) AS last_updated
  FROM filtered_orgs o
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS user_count
    FROM users u
    WHERE u.organization_id = o.id
  ) u ON TRUE
  LEFT JOIN LATERAL (
    SELECT os_inner.*
    FROM organization_subscriptions os_inner
    WHERE os_inner.organization_id = o.id
    ORDER BY os_inner.created_at DESC
    LIMIT 1
  ) os ON TRUE
  LEFT JOIN subscription_plans sp ON sp.id = os.plan_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_get_organizations_with_subscriptions(TEXT, TEXT, TEXT, INT, INT) TO authenticated;

COMMENT ON FUNCTION admin_get_organizations_with_subscriptions IS 'Get organizations with subscription data for super admin - handles NULL is_active properly with debug logging';

-- ✅ التحديث مكتمل
-- لتطبيق هذا التحديث:
-- 1. افتح Supabase SQL Editor
-- 2. الصق هذا الكود
-- 3. اضغط RUN
-- 4. أعد تحميل صفحة Organizations
