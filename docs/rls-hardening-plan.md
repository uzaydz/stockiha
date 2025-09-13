RLS Hardening Plan (Employees & Permissions)

Scope
- Unify authorization across DB using a single pattern: get_current_organization_id() + check_user_permissions_for_org(text).
- Minimize per-table policy drift; standardize action-level (SELECT/INSERT/UPDATE/DELETE).
- Keep service_role explicit for admin automations via GRANTs or SECURITY DEFINER functions.

Prerequisites
- Ensure these helpers are installed (CREATE OR REPLACE):
  - public.get_current_organization_id()  — resolves org via users.auth_user_id or id
  - public.check_user_permissions_for_org(permission_name TEXT) — honors super/org admin and explicit JSONB permissions

Target Tables and Operations
1) products
   - SELECT: allow
     - public store (anon): active products only
     - authenticated (employees): organization_id = get_current_organization_id()
   - INSERT/UPDATE: authenticated if organization_id = get_current_organization_id() AND check_user_permissions_for_org('manageProducts') OR is org/super admin
   - DELETE: authenticated if org/super admin (or manageProducts with stricter checks)

2) product_categories
   - SELECT: authenticated where organization_id = get_current_organization_id() OR public if explicitly public
   - INSERT/UPDATE/DELETE: same as products with 'manageProductCategories' or org/super admin

3) orders
   - SELECT: authenticated if organization_id = get_current_organization_id() AND (viewOrders OR manageOrders OR accessPOS)
   - INSERT: authenticated if organization_id matches AND (manageOrders OR accessPOS)
   - UPDATE: authenticated if organization_id matches AND (updateOrderStatus OR manageOrders OR accessPOS)
   - DELETE: usually disabled; if needed, org/super admin only

4) customers
   - SELECT: authenticated if organization_id = get_current_organization_id() AND (viewCustomers OR manageCustomers)
   - INSERT/UPDATE/DELETE: authenticated if organization_id matches AND manageCustomers OR org/super admin

5) inventory tables (inventory_log, product_variants, stock movements)
   - SELECT: authenticated if organization_id = get_current_organization_id() AND (viewInventory OR manageInventory OR manageProducts)
   - INSERT/UPDATE: authenticated if organization_id matches AND manageInventory OR manageProducts OR org/super admin
   - DELETE: disabled or org/super admin only

6) users (employees view)
   - SELECT: authenticated if organization_id = get_current_organization_id() AND (viewEmployees OR manageEmployees OR org/super admin)
   - INSERT/UPDATE/DELETE: through SECURITY DEFINER RPCs only (no direct DML from clients)

Policy Naming Convention
- `{table}_{action}_{audience}`. Examples:
  - products_select_public
  - products_select_employee
  - products_update_employee
  - products_delete_admin

Implementation Outline (per table)
- ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
- DROP POLICY IF EXISTS for old policies to avoid duplicates.
- CREATE POLICY using get_current_organization_id() + check_user_permissions_for_org().
- GRANT EXECUTE on helper functions to authenticated, service_role.

Rollout Plan
1) Verify helpers present (already included in fix_employee_data_access.sql); re-install via CREATE OR REPLACE if needed.
2) Start with low-risk tables: product_categories, customers.
3) Proceed to products and inventory after validation.
4) Finally adjust orders (has the most business logic; validate side effects carefully).
5) Keep admin automations on service_role via controlled RPCs.

Testing Checklist
- For each table/action, test with: super_admin, admin(owner), employee with/without explicit permission, unauthenticated.
- Validate no 403 regressions in Products/Orders pages.
- Monitor function debug_info (get_user_with_permissions_unified) and query plans.

Notes
- Some legacy policies use auth.jwt() or smart_auth_check(); migrate toward the unified helpers.
- Keep DELETE highly restricted.

