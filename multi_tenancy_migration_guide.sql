-- Multi-tenancy Migration Guide
-- This file provides a step-by-step approach to safely implement the multi-tenancy changes in a production environment

------------------------------------------------------------------
-- MIGRATION PLANNING AND PREPARATION
------------------------------------------------------------------

-- 1. BACKUP THE DATABASE BEFORE STARTING
-- Make a complete backup of the database before starting any migrations
-- This is critical for rollback if needed

-- 2. SCHEDULE MAINTENANCE WINDOW
-- The migration may require temporary service disruption
-- Schedule an appropriate maintenance window

-- 3. TEST IN STAGING ENVIRONMENT
-- Test all migration steps in a staging environment that mirrors production

------------------------------------------------------------------
-- STEP 1: ADD MISSING COLUMNS WITHOUT CONSTRAINTS
------------------------------------------------------------------

-- First, add all required organization_id columns without NOT NULL constraints
-- This allows adding the columns without requiring immediate data population

-- Add organization_id to service_progress if not exists
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'service_progress' 
               AND column_name = 'organization_id') THEN
    ALTER TABLE service_progress ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
END $$;

-- Add organization_id to employee_salaries if not exists
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'employee_salaries' 
               AND column_name = 'organization_id') THEN
    ALTER TABLE employee_salaries ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
END $$;

-- Add organization_id to employee_activities if not exists
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'employee_activities' 
               AND column_name = 'organization_id') THEN
    ALTER TABLE employee_activities ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
END $$;

-- Add organization_id to addresses if not exists
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'addresses' 
               AND column_name = 'organization_id') THEN
    ALTER TABLE addresses ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
END $$;

-- Add organization_id to order_items if not exists
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'order_items' 
               AND column_name = 'organization_id') THEN
    ALTER TABLE order_items ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
END $$;

------------------------------------------------------------------
-- STEP 2: DATA POPULATION - FILL ORGANIZATION_ID VALUES
------------------------------------------------------------------

-- Populate organization_id in service_progress
UPDATE service_progress sp
SET organization_id = sb.organization_id
FROM service_bookings sb
WHERE sp.service_booking_id = sb.id
AND sp.organization_id IS NULL;

-- Populate organization_id in employee_salaries
UPDATE employee_salaries es
SET organization_id = u.organization_id
FROM users u
WHERE es.employee_id = u.id
AND es.organization_id IS NULL;

-- Populate organization_id in employee_activities
UPDATE employee_activities ea
SET organization_id = u.organization_id
FROM users u
WHERE ea.employee_id = u.id
AND ea.organization_id IS NULL;

-- Populate organization_id in addresses
UPDATE addresses a
SET organization_id = u.organization_id
FROM users u
WHERE a.user_id = u.id
AND a.organization_id IS NULL;

-- Populate organization_id in order_items
UPDATE order_items oi
SET organization_id = o.organization_id
FROM orders o
WHERE oi.order_id = o.id
AND oi.organization_id IS NULL;

-- Handle any NULL organization_id values in products
UPDATE products
SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL;

-- Handle any NULL organization_id values in services
UPDATE services
SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL;

-- Handle any NULL organization_id values in orders
UPDATE orders
SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL;

-- Handle any NULL organization_id values in transactions
UPDATE transactions
SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL;

-- Handle any NULL organization_id values in customers
UPDATE customers
SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL;

------------------------------------------------------------------
-- STEP 3: ADD NOT NULL CONSTRAINTS
------------------------------------------------------------------

-- After data population, add NOT NULL constraints

-- Check data integrity before adding constraints
SELECT 'service_progress' as table_name, COUNT(*) as null_org_ids
FROM service_progress WHERE organization_id IS NULL
UNION ALL
SELECT 'employee_salaries', COUNT(*)
FROM employee_salaries WHERE organization_id IS NULL
UNION ALL
SELECT 'employee_activities', COUNT(*)
FROM employee_activities WHERE organization_id IS NULL
UNION ALL
SELECT 'addresses', COUNT(*)
FROM addresses WHERE organization_id IS NULL
UNION ALL
SELECT 'order_items', COUNT(*)
FROM order_items WHERE organization_id IS NULL
UNION ALL
SELECT 'products', COUNT(*)
FROM products WHERE organization_id IS NULL
UNION ALL
SELECT 'services', COUNT(*)
FROM services WHERE organization_id IS NULL
UNION ALL
SELECT 'orders', COUNT(*)
FROM orders WHERE organization_id IS NULL
UNION ALL
SELECT 'transactions', COUNT(*)
FROM transactions WHERE organization_id IS NULL
UNION ALL
SELECT 'customers', COUNT(*)
FROM customers WHERE organization_id IS NULL;

-- Only add NOT NULL constraints if all data is properly populated
ALTER TABLE service_progress ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE employee_salaries ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE employee_activities ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE addresses ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE services ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE product_categories ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE inventory_log ALTER COLUMN organization_id SET NOT NULL;

------------------------------------------------------------------
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
------------------------------------------------------------------

-- Create indexes to optimize queries by organization_id
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_org_id ON services(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_addresses_org_id ON addresses(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org_id ON order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_org_id ON employee_salaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_activities_org_id ON employee_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_progress_org_id ON service_progress(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_org_id ON inventory_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_org_id ON product_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org_admin ON users(organization_id, is_org_admin);

------------------------------------------------------------------
-- STEP 5: IMPLEMENT ROW LEVEL SECURITY (RLS)
------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies first
DO $$ 
BEGIN
  -- Products policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow select for all users') THEN
    DROP POLICY "Allow select for all users" ON products;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_select_policy') THEN
    DROP POLICY "products_select_policy" ON products;
  END IF;
  
  -- Services policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'Enable read access for all users') THEN
    DROP POLICY "Enable read access for all users" ON services;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'services_select_policy') THEN
    DROP POLICY "services_select_policy" ON services;
  END IF;
  
  -- Orders policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'orders_select_policy') THEN
    DROP POLICY "orders_select_policy" ON orders;
  END IF;
  
  -- Customers policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'customers_select_policy') THEN
    DROP POLICY "customers_select_policy" ON customers;
  END IF;
  
  -- Organizations policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'organizations_select_policy') THEN
    DROP POLICY "organizations_select_policy" ON organizations;
  END IF;
END $$;

-- Now create new RLS policies - examples for the most important tables
-- For the full list of policies, see the multi_tenancy_implementation.sql file

-- Products policies
CREATE POLICY "org_tenant_products_select" ON products
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_products_insert" ON products
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Organizations policies
CREATE POLICY "org_tenant_organizations_select" ON organizations
    FOR SELECT
    USING (id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_admin_organizations_update" ON organizations
    FOR UPDATE
    USING (id = (SELECT organization_id FROM users WHERE id = auth.uid() AND is_org_admin = true));

------------------------------------------------------------------
-- STEP 6: CREATE HELPER FUNCTIONS AND TRIGGERS
------------------------------------------------------------------

-- Create function to auto-set organization_id on insert
CREATE OR REPLACE FUNCTION set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id FROM users WHERE id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all relevant tables
CREATE TRIGGER set_products_organization_id
BEFORE INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_services_organization_id
BEFORE INSERT ON services
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

-- Add more triggers for other tables as needed from the implementation file

------------------------------------------------------------------
-- STEP 7: CREATE ADMIN FUNCTIONS
------------------------------------------------------------------

-- Function to create organizations
CREATE OR REPLACE FUNCTION create_organization(
    org_name TEXT,
    org_description TEXT DEFAULT NULL,
    org_logo_url TEXT DEFAULT NULL,
    org_domain TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    INSERT INTO organizations (
        id, 
        name, 
        description, 
        logo_url, 
        domain, 
        subscription_tier, 
        subscription_status, 
        created_at, 
        updated_at
    )
    VALUES (
        gen_random_uuid(), 
        org_name, 
        org_description, 
        org_logo_url, 
        org_domain, 
        'basic', 
        'active', 
        NOW(), 
        NOW()
    )
    RETURNING id INTO new_org_id;
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set a user as organization admin
CREATE OR REPLACE FUNCTION set_user_as_org_admin(
    user_id UUID,
    org_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET organization_id = org_id,
        is_org_admin = TRUE
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

------------------------------------------------------------------
-- STEP 8: CREATE REPORTING VIEWS
------------------------------------------------------------------

-- Create reporting views that respect multi-tenancy
CREATE OR REPLACE VIEW organization_order_summary AS
SELECT 
    u.organization_id,
    o.id as order_id,
    o.created_at,
    o.total,
    o.status,
    o.payment_status,
    c.name as customer_name,
    e.name as employee_name
FROM 
    orders o
JOIN 
    users u ON u.id = auth.uid()
LEFT JOIN 
    users c ON o.customer_id = c.id
LEFT JOIN 
    users e ON o.employee_id = e.id
WHERE 
    o.organization_id = u.organization_id;

------------------------------------------------------------------
-- STEP 9: VERIFY MIGRATION SUCCESS
------------------------------------------------------------------

-- Check that all tables have organization_id
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'organization_id'
ORDER BY table_name;

-- Check that RLS policies are properly set
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check that all records have organization_id set
SELECT 'products' as table_name, COUNT(*) as total_records, 
       COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as null_org_ids
FROM products
UNION ALL
SELECT 'services', COUNT(*), COUNT(CASE WHEN organization_id IS NULL THEN 1 END)
FROM services
UNION ALL
SELECT 'orders', COUNT(*), COUNT(CASE WHEN organization_id IS NULL THEN 1 END)
FROM orders
UNION ALL
SELECT 'customers', COUNT(*), COUNT(CASE WHEN organization_id IS NULL THEN 1 END)
FROM customers;

-- If all looks good, migration is complete! 