-- =====================================================
-- RLS tuning (low-risk first): product_categories, customers
-- Standardize on get_current_organization_id() + check_user_permissions_for_org()
-- Safe and idempotent: drops known legacy policies if they exist, enables RLS, creates new ones
-- =====================================================

-- Ensure RLS is enabled (idempotent)
ALTER TABLE IF EXISTS public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;

-- ==========================
-- product_categories
-- ==========================

-- Drop legacy/broad policies if present
DROP POLICY IF EXISTS "allow_all" ON public.product_categories;
DROP POLICY IF EXISTS "org_tenant_product_categories_select" ON public.product_categories;
DROP POLICY IF EXISTS "org_tenant_product_categories_insert" ON public.product_categories;
DROP POLICY IF EXISTS "org_tenant_product_categories_update" ON public.product_categories;
DROP POLICY IF EXISTS "org_tenant_product_categories_delete" ON public.product_categories;
DROP POLICY IF EXISTS "tenant_categories_select" ON public.product_categories;
DROP POLICY IF EXISTS "tenant_categories_insert" ON public.product_categories;
DROP POLICY IF EXISTS "tenant_categories_update" ON public.product_categories;
DROP POLICY IF EXISTS "tenant_categories_delete" ON public.product_categories;

-- SELECT for employees in same org
CREATE POLICY IF NOT EXISTS product_categories_select_employee ON public.product_categories
    FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
    );

-- INSERT requires org match + permission (manageProductCategories or manageProducts) or org/super (covered by helper)
CREATE POLICY IF NOT EXISTS product_categories_insert_employee ON public.product_categories
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageProductCategories')
            OR public.check_user_permissions_for_org('manageProducts')
        )
    );

-- UPDATE requires org match + permission
CREATE POLICY IF NOT EXISTS product_categories_update_employee ON public.product_categories
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
    )
    WITH CHECK (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageProductCategories')
            OR public.check_user_permissions_for_org('manageProducts')
        )
    );

-- DELETE restricted similarly (could be further limited to org admins if desired)
CREATE POLICY IF NOT EXISTS product_categories_delete_employee ON public.product_categories
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageProductCategories')
            OR public.check_user_permissions_for_org('manageProducts')
        )
    );

-- ==========================
-- customers
-- ==========================

-- Drop legacy/broad policies if present (best-effort)
DROP POLICY IF EXISTS "allow_all" ON public.customers;
DROP POLICY IF EXISTS "customers_select_public" ON public.customers;
DROP POLICY IF EXISTS "customers_select_employee" ON public.customers;
DROP POLICY IF EXISTS "tenant_customers_select" ON public.customers;
DROP POLICY IF EXISTS "tenant_customers_insert" ON public.customers;
DROP POLICY IF EXISTS "tenant_customers_update" ON public.customers;
DROP POLICY IF EXISTS "tenant_customers_delete" ON public.customers;
DROP POLICY IF EXISTS "org_tenant_customers_select" ON public.customers;
DROP POLICY IF EXISTS "org_tenant_customers_insert" ON public.customers;
DROP POLICY IF EXISTS "org_tenant_customers_update" ON public.customers;
DROP POLICY IF EXISTS "org_tenant_customers_delete" ON public.customers;

-- SELECT: employees in same org with viewing privileges
CREATE POLICY IF NOT EXISTS customers_select_employee ON public.customers
    FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('viewCustomers')
            OR public.check_user_permissions_for_org('manageCustomers')
            OR public.check_user_permissions_for_org('manageOrders')  -- allow POS/order operators to view
            OR public.check_user_permissions_for_org('accessPOS')
        )
    );

-- INSERT: org match + manageCustomers
CREATE POLICY IF NOT EXISTS customers_insert_employee ON public.customers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageCustomers')
        )
    );

-- UPDATE: org match + manageCustomers
CREATE POLICY IF NOT EXISTS customers_update_employee ON public.customers
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
    )
    WITH CHECK (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageCustomers')
        )
    );

-- DELETE: org match + manageCustomers (can be limited further to admins if needed)
CREATE POLICY IF NOT EXISTS customers_delete_employee ON public.customers
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageCustomers')
        )
    );

-- Note: SECURITY DEFINER RPCs should be used for bulk admin operations; service_role bypass remains via RPCs only.

