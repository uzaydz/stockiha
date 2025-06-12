-- Comprehensive RLS, Performance, and Security Fix
-- This script completely overhauls the RLS policies for all organization-specific tables.
-- It introduces a centralized function for checking organization membership to boost performance
-- and applies a consistent, secure RLS policy model across the database.

BEGIN;

-- Step 1: Drop all existing, potentially conflicting RLS policies on affected tables.
-- This creates a clean slate to build the new, unified RLS system.

DROP POLICY IF EXISTS "products_public_access" ON public.products;
DROP POLICY IF EXISTS "product_update_policy" ON public.products;
DROP POLICY IF EXISTS "product_delete_policy" ON public.products;
DROP POLICY IF EXISTS "super_admin_products_policy" ON public.products;
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "services_select_policy" ON public.services;
DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "online_orders_select_policy" ON public.online_orders;
DROP POLICY IF EXISTS "product_categories_select_policy" ON public.product_categories;
DROP POLICY IF EXISTS "product_subcategories_select_policy" ON public.product_subcategories;
DROP POLICY IF EXISTS "pos_settings_select_policy" ON public.pos_settings;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "subscription_categories_select_policy" ON public.subscription_categories;
DROP POLICY IF EXISTS "subscription_services_select_policy" ON public.subscription_services;


-- Step 2: Create a single, efficient helper function to get the current user's organization ID.
-- This function is the cornerstone of the new RLS system. It's defined once
-- and used in all policies, avoiding slow, repetitive subqueries.
-- SECURITY DEFINER allows it to read the users table securely.

CREATE OR REPLACE FUNCTION public.get_current_organization_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- This query runs with the permissions of the function definer, not the calling user.
  -- It safely retrieves the organization_id from the users table based on the logged-in user's ID.
  SELECT organization_id INTO org_id
  FROM public.users
  WHERE id = auth.uid();
  RETURN org_id;
END;
$$;

-- Grant execute permission to authenticated users so they can use this function in policies.
GRANT EXECUTE ON FUNCTION public.get_current_organization_id() TO authenticated;


-- Step 3: Create and apply a new, consistent set of RLS policies for each table.
-- Each table gets a full set of policies for SELECT, INSERT, UPDATE, and DELETE,
-- all using the fast `get_current_organization_id()` helper function.
-- This ensures data is properly isolated between organizations for all types of operations.

-- Function to create policies for a given table
CREATE OR REPLACE FUNCTION create_org_based_rls_policies(table_name TEXT)
RETURNS void AS $$
BEGIN
    -- Enable RLS on the table if it's not already enabled
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    
    -- SELECT policy
    EXECUTE format('CREATE POLICY "Allow ALL for organization members" ON public.%I FOR ALL USING (organization_id = public.get_current_organization_id()) WITH CHECK (organization_id = public.get_current_organization_id());', table_name);

END;
$$ LANGUAGE plpgsql;

-- Apply policies to all relevant tables
SELECT create_org_based_rls_policies('products');
SELECT create_org_based_rls_policies('product_categories');
SELECT create_org_based_rls_policies('product_subcategories');
SELECT create_org_based_rls_policies('orders');
SELECT create_org_based_rls_policies('online_orders');
SELECT create_org_based_rls_policies('customers');
SELECT create_org_based_rls_policies('pos_settings');
SELECT create_org_based_rls_policies('subscription_categories');
SELECT create_org_based_rls_policies('subscription_services');
SELECT create_org_based_rls_policies('services');
SELECT create_org_based_rls_policies('users');
SELECT create_org_based_rls_policies('inventory_log');
SELECT create_org_based_rls_policies('expenses');
SELECT create_org_based_rls_policies('transactions');


-- Step 4: Add indexes on `organization_id` for all affected tables.
-- This is a critical performance optimization. It makes lookups based on the user's
-- organization extremely fast.

CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_organization_id ON public.product_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_subcategories_organization_id ON public.product_subcategories(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON public.orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_organization_id ON public.online_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_pos_settings_organization_id ON public.pos_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_categories_organization_id ON public.subscription_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_services_organization_id ON public.subscription_services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_organization_id ON public.services(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_organization_id ON public.inventory_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON public.transactions(organization_id);


-- Step 5: Fix RPC functions to be organization-aware.
-- These functions previously lacked organization filtering, causing them to either
-- fail or insecurely return data from all organizations.

-- get_top_categories
CREATE OR REPLACE FUNCTION public.get_top_categories(p_limit INT)
RETURNS TABLE(category_id UUID, category_name TEXT, category_slug TEXT, total_sales BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
      pc.id AS category_id,
      pc.name AS category_name,
      pc.slug AS category_slug,
      SUM(oi.quantity * oi.price) AS total_sales
  FROM public.online_order_items oi
  JOIN public.products p ON oi.product_id = p.id
  JOIN public.product_categories pc ON p.category_id = pc.id
  WHERE pc.organization_id = public.get_current_organization_id()
  GROUP BY pc.id, pc.name, pc.slug
  ORDER BY total_sales DESC
  LIMIT p_limit;
END;
$$;

-- get_top_products
CREATE OR REPLACE FUNCTION public.get_top_products(p_limit INT)
RETURNS TABLE(product_id UUID, product_name TEXT, total_sales BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
      p.id AS product_id,
      p.name AS product_name,
      SUM(oi.quantity) AS total_sales
  FROM public.online_order_items oi
  JOIN public.products p ON oi.product_id = p.id
  WHERE p.organization_id = public.get_current_organization_id()
  GROUP BY p.id, p.name
  ORDER BY total_sales DESC
  LIMIT p_limit;
END;
$$;

-- get_orders_stats
CREATE OR REPLACE FUNCTION public.get_orders_stats()
RETURNS TABLE(total_revenue NUMERIC, total_orders BIGINT, pending_orders BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
      COALESCE(SUM(total_price), 0) AS total_revenue,
      COUNT(id) AS total_orders,
      COUNT(id) FILTER (WHERE status = 'pending') AS pending_orders
  FROM public.online_orders
  WHERE organization_id = public.get_current_organization_id();
END;
$$;

-- get_pos_settings
-- This function was causing a 400 error because it was called without parameters.
-- We add a parameter for organization_id to be passed from the client,
-- but also default to the user's org ID for security and convenience.
CREATE OR REPLACE FUNCTION public.get_pos_settings(p_org_id UUID DEFAULT public.get_current_organization_id())
RETURNS SETOF public.pos_settings
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.pos_settings
  WHERE organization_id = p_org_id;
END;
$$;

COMMIT; 