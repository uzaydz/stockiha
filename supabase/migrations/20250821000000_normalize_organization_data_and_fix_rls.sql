-- Comprehensive RLS, Performance, and Security Fix - V2
-- This script normalizes the database schema by adding organization_id to relevant tables,
-- backfills the new columns with data from parent tables, and then applies a unified,
-- high-performance RLS security model across the entire application.

BEGIN;

-- == PHASE 1: SCHEMA NORMALIZATION ==
-- Add the organization_id column to tables where it is missing but required for data isolation.
-- This is a critical step to simplify and accelerate RLS policies.

ALTER TABLE public.product_subcategories ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.subscription_categories ADD COLUMN IF NOT EXISTS organization_id UUID;
-- Add to any other tables you identify that are missing the column.


-- == PHASE 2: DATA BACKFILLING ==
-- Populate the newly added organization_id columns for existing records.
-- This ensures that historical data adheres to the new security model.

-- Backfill for product_subcategories from their parent product_categories
UPDATE public.product_subcategories psc
SET organization_id = pc.organization_id
FROM public.product_categories pc
WHERE psc.category_id = pc.id AND psc.organization_id IS NULL;

-- Backfill for subscription_services from their parent subscription_categories
-- First, ensure subscription_services has the column
ALTER TABLE public.subscription_services ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Then, backfill the data
UPDATE public.subscription_services ss
SET organization_id = sc.organization_id
FROM public.subscription_categories sc
WHERE ss.category_id = sc.id AND ss.organization_id IS NULL;


-- == PHASE 3: APPLY SECURITY, PERFORMANCE, AND FIXES ==

-- Step 3.1: Drop all existing, potentially conflicting RLS policies.
DROP POLICY IF EXISTS "products_public_access" ON public.products;
DROP POLICY IF EXISTS "product_update_policy" ON public.products;
DROP POLICY IF EXISTS "product_delete_policy" ON public.products;
-- ... Drop all other old policies across all tables as in the previous script ...
-- (A more robust way is to dynamically drop all policies on a table)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT relname FROM pg_class WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.relname) || ' DISABLE ROW LEVEL SECURITY;';
    END LOOP;
END$$;


-- Step 3.2: Create the central, high-performance function to get the current user's org ID.
CREATE OR REPLACE FUNCTION public.get_current_organization_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
  is_super_admin BOOLEAN;
BEGIN
  -- Check if the user is a super admin first
  SELECT u.is_super_admin, u.organization_id 
  INTO is_super_admin, org_id
  FROM public.users u
  WHERE u.id = auth.uid();

  -- Super admins bypass the RLS check by returning NULL, allowing them to see all data.
  IF is_super_admin THEN
    RETURN NULL;
  END IF;
  
  RETURN org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_organization_id() TO authenticated;


-- Step 3.3: Create a generic function to apply our standard RLS policies.
CREATE OR REPLACE FUNCTION create_org_based_rls_policies(table_name TEXT)
RETURNS void AS $$
BEGIN
    -- Enable RLS on the table
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    
    -- Drop existing policies to ensure a clean slate
    EXECUTE format('DROP POLICY IF EXISTS "Allow ALL for organization members" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Allow ALL for Super Admins" ON public.%I', table_name);

    -- Policy for organization members: Access is granted if organization_id matches.
    -- The get_current_organization_id() function handles the logic for the current user.
    EXECUTE format('CREATE POLICY "Allow ALL for organization members" ON public.%I FOR ALL USING (organization_id = public.get_current_organization_id()) WITH CHECK (organization_id = public.get_current_organization_id());', table_name);

    -- Policy for Super Admins: If get_current_organization_id() returns NULL, this policy grants access.
    EXECUTE format('CREATE POLICY "Allow ALL for Super Admins" ON public.%I FOR ALL USING (public.get_current_organization_id() IS NULL) WITH CHECK (public.get_current_organization_id() IS NULL);', table_name);

END;
$$ LANGUAGE plpgsql;


-- Step 3.4: Apply the unified RLS policies to all organization-specific tables.
-- NOTICE: 'users' table is EXCLUDED here and gets its own custom policies below.
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
SELECT create_org_based_rls_policies('transactions');
-- Add any other tables that need protection


-- Step 3.5: Create special-cased, non-circular RLS policies for the 'users' table.
-- This is critical to prevent a circular dependency where the policy on 'users'
-- calls a function that needs to read the 'users' table.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- First, drop any existing policies to avoid conflicts.
DROP POLICY IF EXISTS "Allow users to see and manage themselves" ON public.users;
DROP POLICY IF EXISTS "Allow users to see other users in their org" ON public.users;
DROP POLICY IF EXISTS "Allow org admins to manage users in their org" ON public.users;
DROP POLICY IF EXISTS "Allow users to see themselves and colleagues" ON public.users;
DROP POLICY IF EXISTS "Allow users to update their own profile and admins to update any" ON public.users;
DROP POLICY IF EXISTS "Allow org admins to insert users" ON public.users;
DROP POLICY IF EXISTS "Allow org admins to delete users" ON public.users;

-- Create a new helper function to check for admin status efficiently
CREATE OR REPLACE FUNCTION public.is_current_user_org_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND is_org_admin = true
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_current_user_org_admin() TO authenticated;


-- 1. SELECT Policy (REVISED):
-- Uses the fast helper function instead of a slow subquery.
CREATE POLICY "Allow users to see themselves and colleagues" ON public.users
FOR SELECT
USING (
  id = auth.uid()
  OR
  organization_id = public.get_current_organization_id()
);

-- 2. UPDATE Policy (REVISED):
-- A user can update their own profile.
-- An org admin can update any user in their own organization.
CREATE POLICY "Allow users to update their own profile and admins to update any" ON public.users
FOR UPDATE
USING (
    id = auth.uid() OR (public.is_current_user_org_admin() AND organization_id = public.get_current_organization_id())
)
WITH CHECK (
    id = auth.uid() OR (public.is_current_user_org_admin() AND organization_id = public.get_current_organization_id())
);

-- 3. INSERT Policy (REVISED):
-- Only organization admins can add new users to their organization.
CREATE POLICY "Allow org admins to insert users" ON public.users
FOR INSERT
WITH CHECK (
    public.is_current_user_org_admin() AND organization_id = public.get_current_organization_id()
);

-- 4. DELETE Policy (REVISED):
-- Only organization admins can delete users from their own org.
CREATE POLICY "Allow org admins to delete users" ON public.users
FOR DELETE
USING (
    public.is_current_user_org_admin() AND organization_id = public.get_current_organization_id()
);


-- Step 3.6: Add foreign key constraints and indexes for performance and data integrity.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_product_subcategories_organization_id' AND conrelid = 'public.product_subcategories'::regclass
    ) THEN
        ALTER TABLE public.product_subcategories
          ADD CONSTRAINT fk_product_subcategories_organization_id
          FOREIGN KEY (organization_id)
          REFERENCES public.organizations(id)
          ON DELETE CASCADE;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_subscription_categories_organization_id' AND conrelid = 'public.subscription_categories'::regclass
    ) THEN
        ALTER TABLE public.subscription_categories
          ADD CONSTRAINT fk_subscription_categories_organization_id
          FOREIGN KEY (organization_id)
          REFERENCES public.organizations(id)
          ON DELETE CASCADE;
    END IF;
END;
$$;
  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_subscription_services_organization_id' AND conrelid = 'public.subscription_services'::regclass
    ) THEN
        ALTER TABLE public.subscription_services
          ADD CONSTRAINT fk_subscription_services_organization_id
          FOREIGN KEY (organization_id)
          REFERENCES public.organizations(id)
          ON DELETE CASCADE;
    END IF;
END;
$$;

-- Create indexes on all the organization_id columns for fast lookups.
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_organization_id ON public.product_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_subcategories_organization_id ON public.product_subcategories(organization_id);
-- ... Add indexes for all other tables as in the previous script ...
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


-- Step 3.7: Fix RPC functions to be organization-aware.
-- We now drop the function before creating it to handle any signature changes.

-- get_top_categories
DROP FUNCTION IF EXISTS public.get_top_categories(INT);
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
  -- RLS will handle filtering, but adding it here is an extra layer of safety and can be clearer.
  WHERE pc.organization_id = public.get_current_organization_id()
  GROUP BY pc.id, pc.name, pc.slug
  ORDER BY total_sales DESC
  LIMIT p_limit;
END;
$$;

-- get_pos_settings
DROP FUNCTION IF EXISTS public.get_pos_settings(UUID);
CREATE OR REPLACE FUNCTION public.get_pos_settings(p_org_id UUID DEFAULT public.get_current_organization_id())
RETURNS SETOF public.pos_settings
LANGUAGE plpgsql
AS $$
BEGIN
  -- RLS is automatically applied, so we just need to select.
  -- The p_org_id parameter is used for explicit requests if needed.
  RETURN QUERY
  SELECT *
  FROM public.pos_settings
  WHERE organization_id = p_org_id;
END;
$$;

-- get_top_products
DROP FUNCTION IF EXISTS public.get_top_products(INT);
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
DROP FUNCTION IF EXISTS public.get_orders_stats();
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

-- Make sure all tables that were disabled are re-enabled
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT quote_ident(c.relname) as table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r' -- regular tables
        AND n.nspname = 'public'
        AND c.relname IN (
            'products', 'product_categories', 'product_subcategories', 'orders',
            'online_orders', 'customers', 'pos_settings', 'subscription_categories',
            'subscription_services', 'services', 'users', 'inventory_log', 'expenses', 'transactions'
        )
    ) LOOP
        EXECUTE 'ALTER TABLE public.' || r.table_name || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END$$;


COMMIT; 