-- Multi-tenancy Implementation for Bazaar Console
-- This SQL file contains all the necessary modifications to implement complete multi-tenancy
-- where each admin has their own data

-- 1. Ensure organization_id exists in all entity tables
-- Check existing tables and add organization_id where missing

-- Add NOT NULL constraint to organization_id columns where appropriate
ALTER TABLE products ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE services ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE product_categories ALTER COLUMN organization_id SET NOT NULL;

-- 2. Add organization_id column to tables that don't already have it
-- Check if inventory tables need organization_id
ALTER TABLE inventory_log ALTER COLUMN organization_id SET NOT NULL;

-- Add organization_id to service_progress if not exists
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'service_progress' 
                AND column_name = 'organization_id') THEN
    ALTER TABLE service_progress ADD COLUMN organization_id UUID REFERENCES organizations(id);
    
    -- Populate from related service_bookings
    UPDATE service_progress sp
    SET organization_id = sb.organization_id
    FROM service_bookings sb
    WHERE sp.service_booking_id = sb.id;
    
    -- Make it NOT NULL after populating
    ALTER TABLE service_progress ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Add organization_id to employee_salaries if not exists
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'employee_salaries' 
                AND column_name = 'organization_id') THEN
    ALTER TABLE employee_salaries ADD COLUMN organization_id UUID REFERENCES organizations(id);
    
    -- Populate from related users (employees)
    UPDATE employee_salaries es
    SET organization_id = u.organization_id
    FROM users u
    WHERE es.employee_id = u.id;
    
    -- Make it NOT NULL after populating
    ALTER TABLE employee_salaries ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Add organization_id to employee_activities if not exists
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'employee_activities' 
                AND column_name = 'organization_id') THEN
    ALTER TABLE employee_activities ADD COLUMN organization_id UUID REFERENCES organizations(id);
    
    -- Populate from related users (employees)
    UPDATE employee_activities ea
    SET organization_id = u.organization_id
    FROM users u
    WHERE ea.employee_id = u.id;
    
    -- Make it NOT NULL after populating
    ALTER TABLE employee_activities ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Add organization_id to addresses if not exists
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'addresses' 
                AND column_name = 'organization_id') THEN
    ALTER TABLE addresses ADD COLUMN organization_id UUID REFERENCES organizations(id);
    
    -- Populate from related users
    UPDATE addresses a
    SET organization_id = u.organization_id
    FROM users u
    WHERE a.user_id = u.id;
    
    -- Make it NOT NULL after populating
    ALTER TABLE addresses ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Add organization_id to order_items if not exists
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'order_items' 
                AND column_name = 'organization_id') THEN
    ALTER TABLE order_items ADD COLUMN organization_id UUID REFERENCES organizations(id);
    
    -- Populate from related orders
    UPDATE order_items oi
    SET organization_id = o.organization_id
    FROM orders o
    WHERE oi.order_id = o.id;
    
    -- Make it NOT NULL after populating
    ALTER TABLE order_items ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- 3. Create or update indexes to support organization-based queries
-- Index for products
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(organization_id);

-- Index for services
CREATE INDEX IF NOT EXISTS idx_services_org_id ON services(organization_id);

-- Index for orders
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(organization_id);

-- Index for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(organization_id);

-- Index for customers
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(organization_id);

-- Index for addresses
CREATE INDEX IF NOT EXISTS idx_addresses_org_id ON addresses(organization_id);

-- Index for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_org_id ON order_items(organization_id);

-- Index for employee_salaries
CREATE INDEX IF NOT EXISTS idx_employee_salaries_org_id ON employee_salaries(organization_id);

-- Index for employee_activities
CREATE INDEX IF NOT EXISTS idx_employee_activities_org_id ON employee_activities(organization_id);

-- Index for service_progress
CREATE INDEX IF NOT EXISTS idx_service_progress_org_id ON service_progress(organization_id);

-- Index for inventory_log
CREATE INDEX IF NOT EXISTS idx_inventory_log_org_id ON inventory_log(organization_id);

-- Index for product_categories
CREATE INDEX IF NOT EXISTS idx_product_categories_org_id ON product_categories(organization_id);

-- Index for users
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org_admin ON users(organization_id, is_org_admin);

-- 4. Update Row Level Security (RLS) policies to enforce multi-tenancy
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

-- Drop existing policies that don't align with multi-tenancy
DROP POLICY IF EXISTS "Allow select for all users" ON products;
DROP POLICY IF EXISTS "products_select_policy" ON products;

-- Create new RLS policies for each table
-- Products policies
CREATE POLICY "org_tenant_products_select" ON products
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_products_insert" ON products
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_products_update" ON products
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_products_delete" ON products
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Services policies
DROP POLICY IF EXISTS "Enable read access for all users" ON services;
DROP POLICY IF EXISTS "services_select_policy" ON services;

CREATE POLICY "org_tenant_services_select" ON services
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_services_insert" ON services
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_services_update" ON services
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_services_delete" ON services
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Orders policies
DROP POLICY IF EXISTS "orders_select_policy" ON orders;

CREATE POLICY "org_tenant_orders_select" ON orders
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_orders_insert" ON orders
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_orders_update" ON orders
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_orders_delete" ON orders
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Transactions policies
CREATE POLICY "org_tenant_transactions_select" ON transactions
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_transactions_insert" ON transactions
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_transactions_update" ON transactions
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_transactions_delete" ON transactions
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Customers policies
DROP POLICY IF EXISTS "customers_select_policy" ON customers;

CREATE POLICY "org_tenant_customers_select" ON customers
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_customers_insert" ON customers
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_customers_update" ON customers
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_customers_delete" ON customers
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Organizations policies
DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;

-- Allow users to see only their organization
CREATE POLICY "org_tenant_organizations_select" ON organizations
    FOR SELECT
    USING (id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Allow org admins to update their organization
CREATE POLICY "org_admin_organizations_update" ON organizations
    FOR UPDATE
    USING (id = (SELECT organization_id FROM users WHERE id = auth.uid() AND is_org_admin = true));

-- Product categories policies
CREATE POLICY "org_tenant_product_categories_select" ON product_categories
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_product_categories_insert" ON product_categories
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_product_categories_update" ON product_categories
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_product_categories_delete" ON product_categories
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Product subcategories policies (linked to categories with organization_id)
CREATE POLICY "org_tenant_product_subcategories_select" ON product_subcategories
    FOR SELECT
    USING (category_id IN (SELECT id FROM product_categories WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_tenant_product_subcategories_insert" ON product_subcategories
    FOR INSERT
    WITH CHECK (category_id IN (SELECT id FROM product_categories WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_tenant_product_subcategories_update" ON product_subcategories
    FOR UPDATE
    USING (category_id IN (SELECT id FROM product_categories WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())));

CREATE POLICY "org_tenant_product_subcategories_delete" ON product_subcategories
    FOR DELETE
    USING (category_id IN (SELECT id FROM product_categories WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())));

-- Address policies
CREATE POLICY "org_tenant_addresses_select" ON addresses
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_addresses_insert" ON addresses
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_addresses_update" ON addresses
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_addresses_delete" ON addresses
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Order items policies
CREATE POLICY "org_tenant_order_items_select" ON order_items
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_order_items_insert" ON order_items
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_order_items_update" ON order_items
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_order_items_delete" ON order_items
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Employee salaries policies
CREATE POLICY "org_tenant_employee_salaries_select" ON employee_salaries
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_employee_salaries_insert" ON employee_salaries
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_employee_salaries_update" ON employee_salaries
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_employee_salaries_delete" ON employee_salaries
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Employee activities policies
CREATE POLICY "org_tenant_employee_activities_select" ON employee_activities
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_employee_activities_insert" ON employee_activities
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_employee_activities_update" ON employee_activities
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_employee_activities_delete" ON employee_activities
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Service progress policies
CREATE POLICY "org_tenant_service_progress_select" ON service_progress
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_service_progress_insert" ON service_progress
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_service_progress_update" ON service_progress
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_service_progress_delete" ON service_progress
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Inventory log policies
CREATE POLICY "org_tenant_inventory_log_select" ON inventory_log
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_inventory_log_insert" ON inventory_log
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_inventory_log_update" ON inventory_log
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_tenant_inventory_log_delete" ON inventory_log
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- User policies
CREATE POLICY "org_tenant_users_select" ON users
    FOR SELECT
    USING (
        id = auth.uid() OR
        organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- 5. Add function to ensure organization_id is set on insert
CREATE OR REPLACE FUNCTION set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id FROM users WHERE id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to ensure organization_id is set on insert
CREATE TRIGGER set_products_organization_id
BEFORE INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_services_organization_id
BEFORE INSERT ON services
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_orders_organization_id
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_transactions_organization_id
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_customers_organization_id
BEFORE INSERT ON customers
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_addresses_organization_id
BEFORE INSERT ON addresses
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_order_items_organization_id
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_employee_salaries_organization_id
BEFORE INSERT ON employee_salaries
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_employee_activities_organization_id
BEFORE INSERT ON employee_activities
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_service_progress_organization_id
BEFORE INSERT ON service_progress
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_inventory_log_organization_id
BEFORE INSERT ON inventory_log
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

CREATE TRIGGER set_product_categories_organization_id
BEFORE INSERT ON product_categories
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

-- 6. Add functions to create organizations and organization admins
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

-- 7. Add view for reporting that respects multi-tenancy
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

-- 8. Add a view for inventory management
CREATE OR REPLACE VIEW organization_inventory_summary AS
SELECT 
    u.organization_id,
    p.id as product_id,
    p.name,
    p.sku,
    p.category,
    p.stock_quantity,
    p.min_stock_level,
    p.reorder_level,
    p.reorder_quantity,
    p.purchase_price,
    p.price
FROM 
    products p
JOIN 
    users u ON u.id = auth.uid()
WHERE 
    p.organization_id = u.organization_id;

-- 9. Add a view for financial reporting
CREATE OR REPLACE VIEW organization_financial_summary AS
SELECT 
    u.organization_id,
    date_trunc('day', t.created_at) as transaction_date,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses,
    SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as net_amount
FROM 
    transactions t
JOIN 
    users u ON u.id = auth.uid()
WHERE 
    t.organization_id = u.organization_id
GROUP BY 
    u.organization_id, transaction_date
ORDER BY 
    transaction_date DESC; 