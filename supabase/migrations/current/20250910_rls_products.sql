-- =====================================================
-- RLS tuning for products (standardized, tenant-safe)
-- Pattern: get_current_organization_id() + check_user_permissions_for_org()
-- Public read for active products; employee org-scoped read; guarded writes
-- =====================================================

-- Ensure RLS enabled
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;

-- Drop a broad set of known/legacy/conflicting policies (best-effort, idempotent)
DROP POLICY IF EXISTS "allow_all" ON public.products;
DROP POLICY IF EXISTS "products_read_v2" ON public.products;
DROP POLICY IF EXISTS "products_insert_v2" ON public.products;
DROP POLICY IF EXISTS "products_update_v2" ON public.products;
DROP POLICY IF EXISTS "products_delete_v2" ON public.products;
DROP POLICY IF EXISTS "products_service_role_v2" ON public.products;
DROP POLICY IF EXISTS "products_read_secure" ON public.products;
DROP POLICY IF EXISTS "products_insert_secure" ON public.products;
DROP POLICY IF EXISTS "products_update_secure" ON public.products;
DROP POLICY IF EXISTS "products_delete_secure" ON public.products;
DROP POLICY IF EXISTS "products_service_role_access" ON public.products;
DROP POLICY IF EXISTS "products_create" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_insert_simple" ON public.products;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_authenticated_read" ON public.products;
DROP POLICY IF EXISTS "products_public_read_simple" ON public.products;
DROP POLICY IF EXISTS "products_update_simple" ON public.products;
DROP POLICY IF EXISTS "products_delete_simple" ON public.products;
DROP POLICY IF EXISTS "products_service_role_simple" ON public.products;
DROP POLICY IF EXISTS "org_tenant_products_select" ON public.products;
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "product_insert_policy_restricted" ON public.products;
DROP POLICY IF EXISTS "product_update_policy_restricted" ON public.products;
DROP POLICY IF EXISTS "product_delete_policy_restricted" ON public.products;
DROP POLICY IF EXISTS "super_admin_products_policy" ON public.products;

-- Public read for active products (storefront)
CREATE POLICY IF NOT EXISTS products_select_public ON public.products
    FOR SELECT
    TO anon, public
    USING (is_active = true);

-- Employee read: same org products (active or not)
CREATE POLICY IF NOT EXISTS products_select_employee ON public.products
    FOR SELECT
    TO authenticated
    USING (organization_id = public.get_current_organization_id());

-- INSERT: org match + add/edit/manage permission
CREATE POLICY IF NOT EXISTS products_insert_employee ON public.products
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageProducts')
            OR public.check_user_permissions_for_org('addProducts')
        )
    );

-- UPDATE: org match + edit/manage permission
CREATE POLICY IF NOT EXISTS products_update_employee ON public.products
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
    )
    WITH CHECK (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageProducts')
            OR public.check_user_permissions_for_org('editProducts')
        )
    );

-- DELETE: org match + manage permission (org/super admins pass via helper)
CREATE POLICY IF NOT EXISTS products_delete_employee ON public.products
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
        AND public.check_user_permissions_for_org('manageProducts')
    );

-- Note: service_role access should go through SECURITY DEFINER RPCs; avoid broad service_role table policies.

