-- =====================================================
-- SUPER ADMIN PERFORMANCE & SECURITY IMPROVEMENTS
-- Migration: 20251102_super_admin_performance_security
-- =====================================================

-- =====================================================
-- PART 0: GET USER BASIC INFO FUNCTION
-- =====================================================

-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS get_user_basic_info(UUID);

-- Create the function with correct signature
CREATE OR REPLACE FUNCTION get_user_basic_info(
  p_auth_user_id UUID
)
RETURNS TABLE (
  id UUID,
  auth_user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_super_admin BOOLEAN,
  is_org_admin BOOLEAN,
  is_active BOOLEAN,
  organization_id UUID
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Return user basic information
  RETURN QUERY
  SELECT
    u.id,
    u.auth_user_id,
    au.email,
    u.full_name,
    u.role,
    COALESCE(u.is_super_admin, FALSE) as is_super_admin,
    COALESCE(u.is_org_admin, FALSE) as is_org_admin,
    COALESCE(u.is_active, TRUE) as is_active,
    u.organization_id
  FROM users u
  LEFT JOIN auth.users au ON au.id = u.auth_user_id
  WHERE u.auth_user_id = p_auth_user_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_basic_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_basic_info(UUID) TO anon;

COMMENT ON FUNCTION get_user_basic_info IS 'Get basic user information for authentication and authorization checks';

-- =====================================================
-- PART 1: AUDIT LOGGING TABLE
-- =====================================================

-- Create audit_logs table for tracking all super admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  changes JSONB,
  metadata JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT CHECK (status IN ('success', 'failure', 'partial')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- Add comment
COMMENT ON TABLE audit_logs IS 'Audit trail for all critical super admin actions';

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only super admins can view audit logs
CREATE POLICY "Super admins can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.is_super_admin = true
        AND users.is_active = true
    )
  );

-- RLS Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- PART 2: AUDIT LOGGING HELPER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION log_super_admin_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'medium',
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get user info
  SELECT id, email INTO v_user_id, v_user_email
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    user_email,
    action,
    resource_type,
    resource_id,
    changes,
    metadata,
    severity,
    status,
    error_message
  ) VALUES (
    v_user_id,
    v_user_email,
    p_action,
    p_resource_type,
    p_resource_id,
    p_changes,
    p_metadata,
    p_severity,
    p_status,
    p_error_message
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_super_admin_action TO authenticated;

-- =====================================================
-- PART 3: PERFORMANCE INDEXES
-- =====================================================

-- Organizations table indexes
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status
  ON organizations(subscription_status)
  WHERE subscription_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_subscription_tier
  ON organizations(subscription_tier)
  WHERE subscription_tier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_created_at
  ON organizations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organizations_name_trgm
  ON organizations USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_organizations_domain
  ON organizations(domain)
  WHERE domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_subdomain
  ON organizations(subdomain)
  WHERE subdomain IS NOT NULL;

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
  ON users(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_is_active
  ON users(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_users_is_super_admin
  ON users(is_super_admin)
  WHERE is_super_admin = true;

CREATE INDEX IF NOT EXISTS idx_users_is_org_admin
  ON users(is_org_admin)
  WHERE is_org_admin = true;

CREATE INDEX IF NOT EXISTS idx_users_role
  ON users(role)
  WHERE role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_organization_id
  ON users(organization_id)
  WHERE organization_id IS NOT NULL;

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(status)
  WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders(created_at DESC);

-- Note: organization_id column doesn't exist in orders table
-- CREATE INDEX IF NOT EXISTS idx_orders_organization_id
--   ON orders(organization_id)
--   WHERE organization_id IS NOT NULL;

-- Note: created_by column doesn't exist in orders table - use employee_id instead
CREATE INDEX IF NOT EXISTS idx_orders_employee_id
  ON orders(employee_id)
  WHERE employee_id IS NOT NULL;

-- Organization subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_org_subs_organization_id_status
  ON organization_subscriptions(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_org_subs_status
  ON organization_subscriptions(status)
  WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_subs_created_at
  ON organization_subscriptions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_subs_end_date
  ON organization_subscriptions(end_date)
  WHERE end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_subs_plan_id
  ON organization_subscriptions(plan_id)
  WHERE plan_id IS NOT NULL;

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity
  ON products(stock_quantity);

CREATE INDEX IF NOT EXISTS idx_products_organization_id
  ON products(organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON products(created_at DESC);

-- Subscription plans indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active
  ON subscription_plans(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_code
  ON subscription_plans(code)
  WHERE code IS NOT NULL;

-- =====================================================
-- PART 4: UPDATE EXISTING RPC FUNCTIONS WITH AUDIT LOGGING
-- =====================================================

-- Update admin_upsert_subscription to include audit logging
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
  v_old_subscription organization_subscriptions%ROWTYPE;
  v_valid_status CONSTANT TEXT[] := ARRAY['pending','active','expired','canceled'];
  v_valid_billing CONSTANT TEXT[] := ARRAY['monthly','yearly'];
  v_effective_end DATE;
  v_is_update BOOLEAN := FALSE;
BEGIN
  -- Enhanced authorization check
  SELECT is_super_admin, is_active, auth_user_id
  INTO v_is_super, v_is_active, v_auth_id
  FROM users
  WHERE auth_user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  IF NOT COALESCE(v_is_super, FALSE) THEN
    PERFORM log_super_admin_action(
      'subscription_upsert_failed',
      'subscription',
      p_organization_id,
      NULL,
      jsonb_build_object('reason', 'unauthorized'),
      'high',
      'failure',
      'Unauthorized access attempt'
    );
    RAISE EXCEPTION 'not_authorized' USING HINT = 'Super admin access required';
  END IF;

  IF v_auth_id IS NULL OR v_auth_id != auth.uid() THEN
    RAISE EXCEPTION 'authentication_mismatch';
  END IF;

  -- Validation
  IF p_status IS NULL OR NOT (p_status = ANY (v_valid_status)) THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF p_billing_cycle IS NULL OR NOT (p_billing_cycle = ANY (v_valid_billing)) THEN
    RAISE EXCEPTION 'invalid_billing_cycle';
  END IF;

  IF p_amount_paid < 0 OR p_amount_paid > 99999999.99 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  IF p_currency IS NOT NULL AND UPPER(TRIM(p_currency)) NOT IN ('DZD', 'USD', 'EUR') THEN
    RAISE EXCEPTION 'invalid_currency';
  END IF;

  SELECT * INTO v_plan FROM subscription_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  -- Calculate end date
  IF p_end_date IS NULL THEN
    v_effective_end := CASE
      WHEN p_billing_cycle = 'monthly' THEN p_start_date + INTERVAL '1 month'
      ELSE p_start_date + INTERVAL '1 year'
    END::DATE;
  ELSE
    v_effective_end := p_end_date;
  END IF;

  -- Check for existing subscription
  SELECT * INTO v_old_subscription
  FROM organization_subscriptions
  WHERE organization_id = p_organization_id
    AND status IN ('active', 'pending', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;

  v_is_update := v_old_subscription.id IS NOT NULL;

  -- Upsert subscription (existing logic)
  IF NOT v_is_update THEN
    INSERT INTO organization_subscriptions (
      organization_id, plan_id, status, billing_cycle, start_date, end_date,
      amount_paid, currency, payment_method, payment_reference, is_auto_renew,
      lifetime_courses_access, accessible_courses, courses_access_expires_at
    ) VALUES (
      p_organization_id, p_plan_id, p_status, p_billing_cycle, p_start_date, v_effective_end,
      COALESCE(p_amount_paid, 0), COALESCE(NULLIF(TRIM(p_currency), ''), 'DZD'),
      'admin_manual', p_notes, FALSE, p_training_courses_access,
      '[]'::JSONB, CASE WHEN p_training_courses_access THEN NULL ELSE v_effective_end END
    ) RETURNING * INTO v_new_subscription;
  ELSE
    UPDATE organization_subscriptions
    SET
      plan_id = p_plan_id, status = p_status, billing_cycle = p_billing_cycle,
      start_date = p_start_date, end_date = v_effective_end,
      amount_paid = COALESCE(p_amount_paid, 0),
      currency = COALESCE(NULLIF(TRIM(p_currency), ''), 'DZD'),
      updated_at = NOW()
    WHERE id = v_old_subscription.id
    RETURNING * INTO v_new_subscription;
  END IF;

  -- Update organizations table
  UPDATE organizations
  SET subscription_id = v_new_subscription.id,
      subscription_status = p_status,
      subscription_tier = v_plan.code,
      updated_at = NOW()
  WHERE id = p_organization_id;

  -- Log action
  PERFORM log_super_admin_action(
    CASE WHEN v_is_update THEN 'subscription_updated' ELSE 'subscription_created' END,
    'subscription',
    v_new_subscription.id,
    jsonb_build_object(
      'old', row_to_json(v_old_subscription),
      'new', row_to_json(v_new_subscription)
    ),
    jsonb_build_object(
      'organization_id', p_organization_id,
      'plan_code', v_plan.code,
      'notes', p_notes
    ),
    'high',
    'success'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'subscription_id', v_new_subscription.id,
    'organization_id', p_organization_id,
    'status', p_status
  );

EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_super_admin_action(
      'subscription_upsert_failed',
      'subscription',
      p_organization_id,
      NULL,
      jsonb_build_object('error', SQLERRM),
      'high',
      'failure',
      SQLERRM
    );
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- PART 5: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION admin_upsert_subscription TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON INDEX idx_organizations_subscription_status IS 'Performance: Filter by subscription status';
COMMENT ON INDEX idx_organizations_name_trgm IS 'Performance: Fast text search on organization names';
COMMENT ON INDEX idx_users_auth_user_id IS 'Performance: Fast user lookup by auth ID';
COMMENT ON INDEX idx_org_subs_organization_id_status IS 'Performance: Fast subscription lookup by org and status';

-- =====================================================
-- PART 6: FIX admin_get_organizations_with_subscriptions
-- =====================================================

-- Update the function to handle NULL is_active properly
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

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING HINT = 'User must be authenticated';
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

COMMENT ON FUNCTION admin_get_organizations_with_subscriptions IS 'Get organizations with subscription data for super admin - handles NULL is_active properly';
