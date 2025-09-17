-- Migration: Add admin_get_organizations_with_subscriptions function
-- Created: 2025-09-16 21:07:57

-- Function: admin_get_organizations_with_subscriptions
-- وصف: إرجاع قائمة المؤسسات مع أحدث معلومات الاشتراك للسوبر أدمين مع إمكانية التصفية والبحث

-- Drop the function if it exists with different return type
DROP FUNCTION IF EXISTS admin_get_organizations_with_subscriptions(TEXT, TEXT, TEXT, INT, INT);

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
  v_limit INT;
BEGIN
  SELECT is_super_admin INTO v_is_super FROM users WHERE id = auth.uid();
  IF NOT COALESCE(v_is_super, FALSE) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);

  RETURN QUERY
  WITH filtered_orgs AS (
    SELECT o.*
    FROM organizations o
    WHERE (p_status IS NULL OR p_status = '' OR o.subscription_status = p_status)
      AND (p_tier IS NULL OR p_tier = '' OR o.subscription_tier = p_tier)
      AND (
        p_search IS NULL OR p_search = '' OR
        o.name ILIKE '%' || p_search || '%' OR
        COALESCE(o.domain, '') ILIKE '%' || p_search || '%' OR
        COALESCE(o.subdomain, '') ILIKE '%' || p_search || '%'
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
    os.start_date::date AS start_date,
    os.end_date::date AS end_date,
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

GRANT EXECUTE ON FUNCTION admin_get_organizations_with_subscriptions(TEXT, TEXT, TEXT, INT, INT) TO authenticated;
