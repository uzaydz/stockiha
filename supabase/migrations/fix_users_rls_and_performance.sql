-- Comprehensive RLS and Performance Fix for 'users' and 'online_orders'
-- This script is idempotent and can be safely run multiple times.
-- V3: Corrects the order of operations. Policies must be dropped before functions.

BEGIN;

-- STEP 1: Drop all existing, conflicting RLS policies on all relevant tables.
-- This MUST be done first to remove dependencies on the helper functions before they are dropped.

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT polname FROM pg_policy WHERE polrelid = 'public.users'::regclass
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.polname) || ' ON public.users;';
    END LOOP;
END;
$$;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT polname FROM pg_policy WHERE polrelid = 'public.online_orders'::regclass
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.polname) || ' ON public.online_orders;';
    END LOOP;
END;
$$;


-- STEP 2: Drop the old helper functions.
-- Now that the policies that depend on them are gone, they can be safely dropped.

DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS get_my_claim(TEXT);
DROP FUNCTION IF EXISTS get_current_user_organization_id();
DROP FUNCTION IF EXISTS is_current_user_org_admin();
DROP FUNCTION IF EXISTS is_super_admin();
DROP FUNCTION IF EXISTS fix_missing_auth_user_ids();


-- STEP 3: Create efficient, secure helper functions.

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    user_id := auth.uid();
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)
RETURNS JSONB AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb ->> claim, auth.jwt() ->> claim)::jsonb;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_current_user_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM public.users
    WHERE auth_user_id = get_current_user_id()
    LIMIT 1;
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_current_user_org_admin()
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    SELECT is_org_admin INTO is_admin
    FROM public.users
    WHERE auth_user_id = get_current_user_id()
    LIMIT 1;
    RETURN COALESCE(is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_super_admin_flag BOOLEAN;
BEGIN
    SELECT is_super_admin INTO is_super_admin_flag
    FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
  RETURN COALESCE(is_super_admin_flag, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- STEP 4: Data Integrity Fix Function.
CREATE OR REPLACE FUNCTION fix_missing_auth_user_ids()
RETURNS VOID AS $$
BEGIN
    CREATE TEMP TABLE users_to_update AS
    SELECT u.id AS user_id, a.id AS auth_id
    FROM public.users u
    JOIN auth.users a ON u.email = a.email
    WHERE u.auth_user_id IS NULL;

    UPDATE public.users
    SET auth_user_id = tmp.auth_id
    FROM users_to_update tmp
    WHERE public.users.id = tmp.user_id;

    DROP TABLE users_to_update;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- STEP 5: Clean up and optimize indexes.
DROP INDEX IF EXISTS public.idx_users_organization_id;
DROP INDEX IF EXISTS public.idx_users_org_id;
DROP INDEX IF EXISTS public.idx_users_auth_uid;
DROP INDEX IF EXISTS public.idx_users_auth_active;
DROP INDEX IF EXISTS public.idx_users_org_permissions;
DROP INDEX IF EXISTS public.idx_users_auth_active_org;
DROP INDEX IF EXISTS public.idx_users_org_admin_lookup;

CREATE INDEX IF NOT EXISTS idx_users_org_id_admin_auth_id ON public.users (organization_id, is_org_admin, auth_user_id);


-- STEP 6: Create new, unified, and secure RLS policies.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

CREATE POLICY "Enable SELECT for users based on permissions"
ON public.users
FOR SELECT
USING (
    (auth.uid() = auth_user_id) OR
    (is_current_user_org_admin() AND organization_id = get_current_user_organization_id()) OR
    is_super_admin()
);

CREATE POLICY "Enable INSERT for users based on permissions"
ON public.users
FOR INSERT
WITH CHECK (
    (auth.uid() = auth_user_id) OR
    (is_current_user_org_admin() AND organization_id = get_current_user_organization_id()) OR
    is_super_admin()
);

CREATE POLICY "Enable UPDATE for users based on permissions"
ON public.users
FOR UPDATE
USING (
    (auth.uid() = auth_user_id) OR
    (is_current_user_org_admin() AND organization_id = get_current_user_organization_id()) OR
    is_super_admin()
)
WITH CHECK (
    (auth.uid() = auth_user_id) OR
    (is_current_user_org_admin() AND organization_id = get_current_user_organization_id()) OR
    is_super_admin()
);

CREATE POLICY "Enable DELETE for users based on permissions"
ON public.users
FOR DELETE
USING (
    (auth.uid() = auth_user_id) OR
    (is_current_user_org_admin() AND organization_id = get_current_user_organization_id()) OR
    is_super_admin()
);


-- STEP 7: Apply RLS to `online_orders`.
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_orders FORCE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for organization members on online_orders"
ON public.online_orders
FOR ALL
USING (
    (organization_id = get_current_user_organization_id()) OR
    is_super_admin()
)
WITH CHECK (
    (organization_id = get_current_user_organization_id()) OR
    is_super_admin()
);

COMMIT;