-- =====================================================
-- RLS tuning for inventory tables and orders
-- Tables: inventory_log, product_colors, product_images, orders
-- Pattern: get_current_organization_id() + check_user_permissions_for_org()
-- =====================================================

-- Ensure RLS enabled (idempotent)
ALTER TABLE IF EXISTS public.inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

-- ==========================
-- inventory_log
-- ==========================

-- Drop legacy/conflicting policies if present
DROP POLICY IF EXISTS inventory_log_allow_all ON public.inventory_log;
DROP POLICY IF EXISTS inventory_log_select ON public.inventory_log;
DROP POLICY IF EXISTS inventory_log_insert ON public.inventory_log;
DROP POLICY IF EXISTS inventory_log_update ON public.inventory_log;
DROP POLICY IF EXISTS inventory_log_delete ON public.inventory_log;

-- SELECT: org match + (viewInventory OR manageInventory OR manageProducts)
CREATE POLICY IF NOT EXISTS inventory_log_select_employee ON public.inventory_log
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('viewInventory')
            OR public.check_user_permissions_for_org('manageInventory')
            OR public.check_user_permissions_for_org('manageProducts')
        )
    );

-- INSERT: org match + manageInventory or manageProducts
CREATE POLICY IF NOT EXISTS inventory_log_insert_employee ON public.inventory_log
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageInventory')
            OR public.check_user_permissions_for_org('manageProducts')
        )
    );

-- UPDATE: org match + manageInventory or manageProducts
CREATE POLICY IF NOT EXISTS inventory_log_update_employee ON public.inventory_log
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
    )
    WITH CHECK (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageInventory')
            OR public.check_user_permissions_for_org('manageProducts')
        )
    );

-- DELETE: restrict; allow only org/super admins via helper (manageInventory implies)
CREATE POLICY IF NOT EXISTS inventory_log_delete_employee ON public.inventory_log
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageInventory')
            OR public.check_user_permissions_for_org('manageProducts')
        )
    );

-- ==========================
-- product_colors (variants)
-- ==========================

-- Drop broad policies
DROP POLICY IF EXISTS "أي شخص يمكنه قراءة ألوان المنتجات" ON public.product_colors;
DROP POLICY IF EXISTS "فقط المسؤولون عن المؤسسة يمكنهم إدارة ألوان المنتجات" ON public.product_colors;
DROP POLICY IF EXISTS product_colors_select_public ON public.product_colors;
DROP POLICY IF EXISTS product_colors_select_employee ON public.product_colors;
DROP POLICY IF EXISTS product_colors_modify_employee ON public.product_colors;

-- Public read of colors for active products only (storefront)
CREATE POLICY IF NOT EXISTS product_colors_select_public ON public.product_colors
    FOR SELECT TO anon, public
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id AND p.is_active = true
        )
    );

-- Employee read: same org products (active or not)
CREATE POLICY IF NOT EXISTS product_colors_select_employee ON public.product_colors
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND p.organization_id = public.get_current_organization_id()
        )
    );

-- INSERT/UPDATE/DELETE: org match + manageInventory or manageProducts
CREATE POLICY IF NOT EXISTS product_colors_modify_employee ON public.product_colors
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND p.organization_id = public.get_current_organization_id()
        )
        AND (
            public.check_user_permissions_for_org('manageInventory')
            OR public.check_user_permissions_for_org('manageProducts')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND p.organization_id = public.get_current_organization_id()
        )
        AND (
            public.check_user_permissions_for_org('manageInventory')
            OR public.check_user_permissions_for_org('manageProducts')
        )
    );

-- ==========================
-- product_images
-- ==========================

DROP POLICY IF EXISTS "أي شخص يمكنه قراءة صور المنتجات" ON public.product_images;
DROP POLICY IF EXISTS "فقط المسؤولون عن المؤسسة يمكنهم إدارة صور المنتجات" ON public.product_images;
DROP POLICY IF EXISTS product_images_select_public ON public.product_images;
DROP POLICY IF EXISTS product_images_select_employee ON public.product_images;
DROP POLICY IF EXISTS product_images_modify_employee ON public.product_images;

-- Public read of images for active products
CREATE POLICY IF NOT EXISTS product_images_select_public ON public.product_images
    FOR SELECT TO anon, public
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id AND p.is_active = true
        )
    );

-- Employee read: same org
CREATE POLICY IF NOT EXISTS product_images_select_employee ON public.product_images
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND p.organization_id = public.get_current_organization_id()
        )
    );

-- INSERT/UPDATE/DELETE: org match + manageProducts (images managed with products)
CREATE POLICY IF NOT EXISTS product_images_modify_employee ON public.product_images
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND p.organization_id = public.get_current_organization_id()
        )
        AND public.check_user_permissions_for_org('manageProducts')
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND p.organization_id = public.get_current_organization_id()
        )
        AND public.check_user_permissions_for_org('manageProducts')
    );

-- ==========================
-- orders (higher risk)
-- ==========================

-- Drop legacy/conflicting policies (best-effort)
DROP POLICY IF EXISTS "allow_all" ON public.orders;
DROP POLICY IF EXISTS orders_select_public ON public.orders;
DROP POLICY IF EXISTS orders_select_employee ON public.orders;
DROP POLICY IF EXISTS orders_insert_employee ON public.orders;
DROP POLICY IF EXISTS orders_update_employee ON public.orders;
DROP POLICY IF EXISTS orders_delete_employee ON public.orders;
DROP POLICY IF EXISTS org_tenant_orders_select ON public.orders;
DROP POLICY IF EXISTS org_tenant_orders_insert ON public.orders;
DROP POLICY IF EXISTS org_tenant_orders_update ON public.orders;
DROP POLICY IF EXISTS org_tenant_orders_delete ON public.orders;

-- SELECT: org match + (viewOrders OR manageOrders OR accessPOS)
CREATE POLICY IF NOT EXISTS orders_select_employee ON public.orders
    FOR SELECT TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('viewOrders')
            OR public.check_user_permissions_for_org('manageOrders')
            OR public.check_user_permissions_for_org('accessPOS')
        )
    );

-- INSERT: org match + (manageOrders OR accessPOS)
CREATE POLICY IF NOT EXISTS orders_insert_employee ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageOrders')
            OR public.check_user_permissions_for_org('accessPOS')
        )
    );

-- UPDATE: org match + (updateOrderStatus OR manageOrders)
CREATE POLICY IF NOT EXISTS orders_update_employee ON public.orders
    FOR UPDATE TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
    )
    WITH CHECK (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('updateOrderStatus')
            OR public.check_user_permissions_for_org('manageOrders')
        )
    );

-- DELETE: restrict heavily (org/super admins via helper) — optional; default OFF if you prefer soft-delete
CREATE POLICY IF NOT EXISTS orders_delete_employee ON public.orders
    FOR DELETE TO authenticated
    USING (
        organization_id = public.get_current_organization_id()
        AND (
            public.check_user_permissions_for_org('manageOrders')
        )
    );

-- Note: Consider keeping table-level DELETE unused and relying on RPCs for safe deletions.
