-- Inventory System Update SQL
-- This file contains SQL statements to update the database for inventory logging and minimum stock level features

-- 1. Set defaults for existing products that don't have min_stock_level, reorder_level, and reorder_quantity
UPDATE products 
SET min_stock_level = 5,
    reorder_level = 10,
    reorder_quantity = 20
WHERE min_stock_level IS NULL 
   OR reorder_level IS NULL 
   OR reorder_quantity IS NULL;

-- 2. Create index on inventory_log for product_id to improve query performance
CREATE INDEX IF NOT EXISTS idx_inventory_log_product_id ON inventory_log(product_id);

-- 3. Create index on products for reorder tracking
CREATE INDEX IF NOT EXISTS idx_products_reorder ON products(reorder_level, stock_quantity);

-- 4. Add constraints to ensure logical values in products table
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS check_reorder_levels;

ALTER TABLE products 
ADD CONSTRAINT check_reorder_levels 
CHECK (reorder_level >= min_stock_level);

-- 5. Add foreign key constraint for inventory_log.created_by to users.id
-- First, handle any NULL values in created_by
UPDATE inventory_log
SET created_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE created_by IS NULL;

-- Then add the constraint
ALTER TABLE inventory_log
DROP CONSTRAINT IF EXISTS inventory_log_created_by_fkey;

ALTER TABLE inventory_log
ADD CONSTRAINT inventory_log_created_by_fkey
FOREIGN KEY (created_by) REFERENCES users(id);

-- 6. Create or update the function to handle inventory updates
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert record in inventory_log table
    INSERT INTO inventory_log (
        product_id,
        quantity,
        previous_stock,
        new_stock,
        type,
        reference_id,
        reference_type,
        notes,
        created_by,
        created_at
    ) VALUES (
        NEW.id,
        NEW.stock_quantity - OLD.stock_quantity,
        OLD.stock_quantity,
        NEW.stock_quantity,
        CASE 
            WHEN NEW.stock_quantity > OLD.stock_quantity THEN 'addition'
            ELSE 'reduction'
        END,
        NULL,  -- To be set by application
        'system',
        'Automatic stock update',
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1),  -- Default to an admin user
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to log inventory changes
DROP TRIGGER IF EXISTS trigger_log_inventory_change ON products;

CREATE TRIGGER trigger_log_inventory_change
AFTER UPDATE OF stock_quantity
ON products
FOR EACH ROW
WHEN (NEW.stock_quantity <> OLD.stock_quantity)
EXECUTE FUNCTION log_inventory_change();

-- 8. Create a function to check if a product needs reordering
CREATE OR REPLACE FUNCTION needs_reordering(p_stock_quantity INTEGER, p_reorder_level INTEGER) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_stock_quantity <= p_reorder_level;
END;
$$ LANGUAGE plpgsql;

-- 9. Update the inventory_status view (if exists) or create it if needed
-- First check if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' AND table_name = 'inventory_status'
    ) THEN
        -- Drop the existing view
        DROP VIEW inventory_status;
    END IF;
    
    -- Create new view
    EXECUTE '
    CREATE OR REPLACE VIEW inventory_status AS
    SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock_quantity AS current_stock,
        p.min_stock_level,
        p.reorder_level,
        p.reorder_quantity,
        CASE 
            WHEN p.stock_quantity <= p.min_stock_level THEN ''critical''
            WHEN p.stock_quantity <= p.reorder_level THEN ''low''
            ELSE ''normal''
        END AS status,
        COALESCE(
            (SELECT SUM(oi.quantity) 
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE oi.product_id = p.id 
             AND o.created_at >= NOW() - INTERVAL ''30 days''
             AND o.status != ''cancelled''),
            0
        ) AS last_30_days_sales,
        COALESCE(
            (SELECT SUM(oi.quantity)::numeric / 30 
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE oi.product_id = p.id 
             AND o.created_at >= NOW() - INTERVAL ''30 days''
             AND o.status != ''cancelled''),
            0
        ) AS avg_daily_sales,
        CASE
            WHEN p.stock_quantity > 0 AND 
                 (SELECT SUM(oi.quantity)::numeric / 30 
                  FROM order_items oi
                  JOIN orders o ON oi.order_id = o.id
                  WHERE oi.product_id = p.id 
                  AND o.created_at >= NOW() - INTERVAL ''30 days''
                  AND o.status != ''cancelled'') > 0 
            THEN FLOOR(p.stock_quantity / 
                       (SELECT SUM(oi.quantity)::numeric / 30 
                        FROM order_items oi
                        JOIN orders o ON oi.order_id = o.id
                        WHERE oi.product_id = p.id 
                        AND o.created_at >= NOW() - INTERVAL ''30 days''
                        AND o.status != ''cancelled''))
            ELSE NULL
        END AS estimated_days_remaining
    FROM products p;
    ';
END $$;

-- 10. Create a view for products that need reordering
CREATE OR REPLACE VIEW products_to_reorder AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.stock_quantity,
    p.min_stock_level,
    p.reorder_level,
    p.reorder_quantity,
    CASE 
        WHEN p.stock_quantity <= p.min_stock_level THEN 'critical'
        WHEN p.stock_quantity <= p.reorder_level THEN 'low'
        ELSE 'normal'
    END AS status,
    p.purchase_price,
    (p.reorder_quantity * p.purchase_price) AS estimated_cost
FROM 
    products p
WHERE 
    p.stock_quantity <= p.reorder_level
ORDER BY 
    (p.stock_quantity <= p.min_stock_level) DESC,
    p.stock_quantity ASC;

-- 11. Create a view to join inventory_log with users for easy querying
CREATE OR REPLACE VIEW inventory_log_with_users AS
SELECT 
    il.*,
    u.name AS created_by_name,
    u.email AS created_by_email
FROM 
    inventory_log il
LEFT JOIN 
    users u ON il.created_by = u.id;

-- 12. Refresh the statistics
ANALYZE products;
ANALYZE inventory_log; 