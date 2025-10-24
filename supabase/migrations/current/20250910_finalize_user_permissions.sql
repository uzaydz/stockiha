-- =====================================================
-- Finalize unified user + permissions RPC and helpers
-- Safe, incremental migration: installs final function version
-- Adds supporting indexes and grants, without altering existing RLS
-- =====================================================

-- 1) Drop old function signatures to avoid ambiguity
DROP FUNCTION IF EXISTS get_user_with_permissions_unified(UUID, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS get_user_with_permissions_unified(UUID);
DROP FUNCTION IF EXISTS get_user_with_permissions_unified();

-- 2) Supporting indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id_active ON public.users(auth_user_id, is_active) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_permissions_gin ON public.users USING gin(permissions) WHERE permissions IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_subscription_status ON public.organizations(id, subscription_status, subscription_tier);

-- 3) Final unified function (stable, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_with_permissions_unified(
    p_auth_user_id UUID DEFAULT NULL,
    p_include_subscription_data BOOLEAN DEFAULT true,
    p_calculate_permissions BOOLEAN DEFAULT true
)
RETURNS TABLE (
    user_id UUID,
    auth_user_id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    organization_id UUID,
    organization_name TEXT,
    organization_status TEXT,
    is_active BOOLEAN,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN,
    permissions JSONB,
    user_status TEXT,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    has_inventory_access BOOLEAN,
    can_manage_products BOOLEAN,
    can_view_reports BOOLEAN,
    can_manage_users BOOLEAN,
    can_manage_orders BOOLEAN,
    can_access_pos BOOLEAN,
    can_manage_settings BOOLEAN,
    subscription_status TEXT,
    subscription_tier TEXT,
    trial_end_date TIMESTAMPTZ,
    subscription_active BOOLEAN,
    total_permissions_count INTEGER,
    active_permissions_count INTEGER,
    two_factor_enabled BOOLEAN,
    account_locked BOOLEAN,
    last_login_at TIMESTAMPTZ,
    debug_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID;
    v_start_time TIMESTAMPTZ;
BEGIN
    v_start_time := clock_timestamp();
    v_user_id := COALESCE(p_auth_user_id, auth.uid());
    IF v_user_id IS NULL THEN RETURN; END IF;

    RETURN QUERY
    WITH user_data AS (
        SELECT 
            u.id AS user_internal_id,
            u.auth_user_id,
            u.email,
            u.name,
            u.role,
            u.organization_id,
            u.is_active,
            COALESCE(u.is_org_admin, false) AS is_org_admin,
            COALESCE(u.is_super_admin, false) AS is_super_admin,
            COALESCE(u.permissions, '{}'::jsonb) AS permissions,
            COALESCE(u.status, 'offline') AS status,
            u.last_activity_at,
            u.created_at,
            COALESCE(u.two_factor_enabled, false) AS two_factor_enabled,
            CASE WHEN u.account_locked_until IS NOT NULL AND u.account_locked_until > NOW() THEN true ELSE false END AS account_locked,
            -- last_login fallback to last_activity
            u.last_activity_at AS last_login_at
        FROM public.users u
        WHERE (u.auth_user_id = v_user_id OR u.id = v_user_id)
          AND u.is_active = true
        LIMIT 1
    ),
    org_data AS (
        SELECT 
            o.id AS org_id,
            o.name AS org_name,
            COALESCE(o.subscription_status, 'inactive') AS subscription_status,
            COALESCE(o.subscription_tier, 'free') AS subscription_tier,
            CASE 
                WHEN p_include_subscription_data THEN (
                    SELECT os.trial_ends_at
                    FROM organization_subscriptions os
                    WHERE os.organization_id = o.id AND os.status = 'active'
                    ORDER BY os.created_at DESC
                    LIMIT 1
                )
                ELSE NULL
            END AS trial_end_date,
            CASE 
                WHEN o.subscription_status = 'active' THEN true
                WHEN o.subscription_status = 'trial' AND EXISTS (
                    SELECT 1 FROM organization_subscriptions os
                    WHERE os.organization_id = o.id AND os.status = 'active'
                      AND (os.trial_ends_at IS NULL OR os.trial_ends_at > NOW())
                ) THEN true
                ELSE false
            END AS subscription_active
        FROM user_data ud
        LEFT JOIN public.organizations o ON ud.organization_id = o.id
    ),
    permission_calculations AS (
        SELECT 
            CASE 
                WHEN ud.is_super_admin THEN true
                WHEN ud.is_org_admin THEN true
                WHEN ud.permissions->'viewInventory' = to_jsonb(true) THEN true
                WHEN ud.permissions->'manageInventory' = to_jsonb(true) THEN true
                ELSE false
            END AS has_inventory_access,
            CASE 
                WHEN ud.is_super_admin THEN true
                WHEN ud.is_org_admin THEN true
                WHEN ud.permissions->'manageProducts' = to_jsonb(true) THEN true
                WHEN ud.permissions->'addProducts' = to_jsonb(true) THEN true
                WHEN ud.permissions->'editProducts' = to_jsonb(true) THEN true
                ELSE false
            END AS can_manage_products,
            CASE 
                WHEN ud.is_super_admin THEN true
                WHEN ud.is_org_admin THEN true
                WHEN ud.permissions->'viewReports' = to_jsonb(true) THEN true
                WHEN ud.permissions->'viewSalesReports' = to_jsonb(true) THEN true
                WHEN ud.permissions->'viewFinancialReports' = to_jsonb(true) THEN true
                WHEN ud.permissions->'call_center'->'can_view_reports' = to_jsonb(true) THEN true
                ELSE false
            END AS can_view_reports,
            CASE 
                WHEN ud.is_super_admin THEN true
                WHEN ud.is_org_admin THEN true
                WHEN ud.permissions->'manageUsers' = to_jsonb(true) THEN true
                WHEN ud.permissions->'manageEmployees' = to_jsonb(true) THEN true
                ELSE false
            END AS can_manage_users,
            CASE 
                WHEN ud.is_super_admin THEN true
                WHEN ud.is_org_admin THEN true
                WHEN ud.permissions->'manageOrders' = to_jsonb(true) THEN true
                WHEN ud.permissions->'viewOrders' = to_jsonb(true) THEN true
                WHEN ud.permissions->'updateOrderStatus' = to_jsonb(true) THEN true
                WHEN ud.permissions->'call_center'->'can_update_orders' = to_jsonb(true) THEN true
                WHEN ud.permissions->'call_center'->'can_view_orders' = to_jsonb(true) THEN true
                ELSE false
            END AS can_manage_orders,
            CASE 
                WHEN ud.is_super_admin THEN true
                WHEN ud.is_org_admin THEN true
                WHEN ud.permissions->'accessPOS' = to_jsonb(true) THEN true
                WHEN ud.permissions->'processPayments' = to_jsonb(true) THEN true
                ELSE false
            END AS can_access_pos,
            CASE 
                WHEN ud.is_super_admin THEN true
                WHEN ud.is_org_admin THEN true
                WHEN ud.permissions->'viewSettings' = to_jsonb(true) THEN true
                WHEN ud.permissions->'manageOrganizationSettings' = to_jsonb(true) THEN true
                WHEN ud.permissions->'manageProfileSettings' = to_jsonb(true) THEN true
                ELSE false
            END AS can_manage_settings
        FROM user_data ud
    )
    SELECT 
        ud.user_internal_id,
        ud.auth_user_id,
        ud.email,
        ud.name,
        ud.role,
        ud.organization_id,
        od.org_name,
        od.subscription_status,
        ud.is_active,
        ud.is_org_admin,
        ud.is_super_admin,
        ud.permissions,
        ud.status,
        ud.last_activity_at,
        ud.created_at,
        CASE WHEN p_calculate_permissions THEN pc.has_inventory_access ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_manage_products ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_view_reports ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_manage_users ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_manage_orders ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_access_pos ELSE NULL END,
        CASE WHEN p_calculate_permissions THEN pc.can_manage_settings ELSE NULL END,
        CASE WHEN p_include_subscription_data THEN od.subscription_status ELSE NULL END,
        CASE WHEN p_include_subscription_data THEN od.subscription_tier ELSE NULL END,
        CASE WHEN p_include_subscription_data THEN od.trial_end_date ELSE NULL END,
        CASE WHEN p_include_subscription_data THEN od.subscription_active ELSE NULL END,
        (SELECT COUNT(*)::INT FROM jsonb_object_keys(ud.permissions)) AS total_permissions_count,
        (
            SELECT COUNT(*)::INT
            FROM jsonb_each(ud.permissions) AS kv(key, value)
            WHERE jsonb_typeof(value) = 'boolean' AND value = to_jsonb(true)
        ) AS active_permissions_count,
        ud.two_factor_enabled,
        ud.account_locked,
        ud.last_login_at,
        jsonb_build_object(
            'query_method', CASE WHEN ud.auth_user_id = v_user_id THEN 'auth_user_id' ELSE 'user_id' END,
            'execution_time_ms', ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000, 2),
            'user_found', ud.user_internal_id IS NOT NULL,
            'organization_found', od.org_id IS NOT NULL,
            'cache_friendly', true,
            'function_version', '2.3.0-final'
        ) AS debug_info
    FROM user_data ud
    CROSS JOIN org_data od
    LEFT JOIN permission_calculations pc ON p_calculate_permissions = true;
END;
$$;

COMMENT ON FUNCTION public.get_user_with_permissions_unified(UUID, BOOLEAN, BOOLEAN) IS
'Unified user + permissions RPC (v2.3.0-final). Uses last_activity_at instead of last_sign_in_at; trial_ends_at.
Returns computed permissions to simplify frontend checks.';

GRANT EXECUTE ON FUNCTION public.get_user_with_permissions_unified(UUID, BOOLEAN, BOOLEAN) TO authenticated, service_role;

-- 4) Helper: fast single-permission check
CREATE OR REPLACE FUNCTION public.check_user_permission_fast(
    p_permission_name TEXT,
    p_auth_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID;
    v_result BOOLEAN := false;
BEGIN
    v_user_id := COALESCE(p_auth_user_id, auth.uid());
    IF v_user_id IS NULL THEN RETURN false; END IF;

    SELECT CASE
             WHEN u.is_super_admin = true THEN true
             WHEN u.is_org_admin = true THEN true
             WHEN u.permissions->p_permission_name = to_jsonb(true) THEN true
             ELSE false
           END
    INTO v_result
    FROM public.users u
    WHERE (u.auth_user_id = v_user_id OR u.id = v_user_id)
      AND u.is_active = true
    LIMIT 1;

    RETURN COALESCE(v_result, false);
END;
$$;

COMMENT ON FUNCTION public.check_user_permission_fast(TEXT, UUID) IS 'Fast single-permission check honoring org/super admin flags.';
GRANT EXECUTE ON FUNCTION public.check_user_permission_fast(TEXT, UUID) TO authenticated, service_role;

-- 5) Helper: basic user info only
CREATE OR REPLACE FUNCTION public.get_user_basic_info(
    p_auth_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    auth_user_id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    organization_id UUID,
    is_active BOOLEAN,
    is_org_admin BOOLEAN,
    is_super_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := COALESCE(p_auth_user_id, auth.uid());
    IF v_user_id IS NULL THEN RETURN; END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.auth_user_id,
        u.email,
        u.name,
        u.role,
        u.organization_id,
        u.is_active,
        COALESCE(u.is_org_admin, false),
        COALESCE(u.is_super_admin, false)
    FROM public.users u
    WHERE (u.auth_user_id = v_user_id OR u.id = v_user_id)
      AND u.is_active = true
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_user_basic_info(UUID) IS 'Basic user info, faster and minimal';
GRANT EXECUTE ON FUNCTION public.get_user_basic_info(UUID) TO authenticated, service_role;
