-- Function: admin_get_dashboard_stats
-- وصف: إرجاع إحصائيات Dashboard مجمعة للسوبر أدمين - محسّنة للأداء
-- يستخدم aggregation بدلاً من fetch all rows

CREATE OR REPLACE FUNCTION admin_get_dashboard_stats()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_is_super BOOLEAN;
  v_is_active BOOLEAN;
  v_auth_id UUID;
  v_result JSONB;
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

  -- Build aggregated statistics using efficient queries
  SELECT jsonb_build_object(
    'organizations', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE subscription_status = 'active'),
        'trial', COUNT(*) FILTER (WHERE subscription_status = 'trial'),
        'expired', COUNT(*) FILTER (WHERE subscription_status = 'expired'),
        'pending', COUNT(*) FILTER (WHERE subscription_status = 'pending'),
        'this_month', COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)),
        'by_tier', jsonb_object_agg(
          COALESCE(subscription_tier, 'none'),
          tier_count
        )
      )
      FROM (
        SELECT
          COALESCE(subscription_tier, 'none') as subscription_tier,
          COUNT(*) as tier_count
        FROM organizations
        GROUP BY subscription_tier
      ) tier_stats,
      organizations
    ),
    'users', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE is_active = true),
        'inactive', COUNT(*) FILTER (WHERE is_active = false),
        'org_admins', COUNT(*) FILTER (WHERE is_org_admin = true),
        'super_admins', COUNT(*) FILTER (WHERE is_super_admin = true),
        'this_month', COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)),
        'by_role', jsonb_object_agg(
          COALESCE(role, 'user'),
          role_count
        )
      )
      FROM (
        SELECT
          COALESCE(role, 'user') as role,
          COUNT(*) as role_count
        FROM users
        GROUP BY role
      ) role_stats,
      users
    ),
    'products', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'total_stock', COALESCE(SUM(stock_quantity), 0),
        'low_stock', COUNT(*) FILTER (WHERE stock_quantity < 10),
        'out_of_stock', COUNT(*) FILTER (WHERE stock_quantity = 0),
        'total_value', COALESCE(SUM(price * stock_quantity), 0)
      )
      FROM products
    ),
    'orders', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'processing', COUNT(*) FILTER (WHERE status = 'processing'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'total_revenue', COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0),
        'this_month', COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)),
        'this_month_revenue', COALESCE(SUM(total) FILTER (
          WHERE status = 'completed'
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0),
        'today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
        'today_revenue', COALESCE(SUM(total) FILTER (
          WHERE status = 'completed'
          AND created_at >= CURRENT_DATE
        ), 0)
      )
      FROM orders
    ),
    'subscriptions', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'expired', COUNT(*) FILTER (WHERE status = 'expired'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'canceled'),
        'expiring_soon', COUNT(*) FILTER (
          WHERE status = 'active'
          AND end_date IS NOT NULL
          AND end_date <= CURRENT_DATE + INTERVAL '7 days'
        ),
        'total_revenue', COALESCE(SUM(amount_paid), 0),
        'this_month_revenue', COALESCE(SUM(amount_paid) FILTER (
          WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0)
      )
      FROM organization_subscriptions
    ),
    'system', jsonb_build_object(
      'database_size', pg_database_size(current_database()),
      'timestamp', NOW(),
      'cache_ttl', 300  -- 5 minutes cache recommendation
    )
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_dashboard_stats() TO authenticated;

-- Create index on commonly filtered columns if not exists
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status
  ON organizations(subscription_status);

CREATE INDEX IF NOT EXISTS idx_organizations_subscription_tier
  ON organizations(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_organizations_created_at
  ON organizations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_is_active
  ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_users_role
  ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status
  ON organization_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_created_at
  ON organization_subscriptions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_stock_quantity
  ON products(stock_quantity);

-- Comment on function
COMMENT ON FUNCTION admin_get_dashboard_stats() IS
'Returns aggregated dashboard statistics for super admin.
Optimized for performance - uses aggregation instead of fetching all rows.
Cache result for 5 minutes on client side.';
