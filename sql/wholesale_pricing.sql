-- Add wholesale pricing columns to products table
ALTER TABLE products 
ADD COLUMN wholesale_price NUMERIC DEFAULT NULL,
ADD COLUMN partial_wholesale_price NUMERIC DEFAULT NULL,
ADD COLUMN min_wholesale_quantity INTEGER DEFAULT NULL,
ADD COLUMN min_partial_wholesale_quantity INTEGER DEFAULT NULL,
ADD COLUMN allow_retail BOOLEAN DEFAULT TRUE,
ADD COLUMN allow_wholesale BOOLEAN DEFAULT FALSE,
ADD COLUMN allow_partial_wholesale BOOLEAN DEFAULT FALSE;

-- Add wholesale tiers to allow multiple price points based on quantity
CREATE TABLE IF NOT EXISTS wholesale_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  organization_id UUID NOT NULL,
  
  -- Each tier must have a higher quantity than the previous one
  CONSTRAINT wholesale_tiers_min_quantity_check CHECK (min_quantity > 0),
  
  -- Add RLS for organization isolation
  CONSTRAINT wholesale_tiers_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE CASCADE
);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_wholesale_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_wholesale_tiers_updated_at
BEFORE UPDATE ON wholesale_tiers
FOR EACH ROW
EXECUTE FUNCTION update_wholesale_tiers_updated_at();

-- Add RLS policies for wholesale_tiers
ALTER TABLE wholesale_tiers ENABLE ROW LEVEL SECURITY;

-- RLS policy for select
CREATE POLICY wholesale_tiers_select_policy ON wholesale_tiers
FOR SELECT
USING (organization_id = auth.current_user_auth_id() OR 
      organization_id IN (
        SELECT id FROM organizations 
        WHERE id = wholesale_tiers.organization_id AND 
              id IN (SELECT organization_id FROM users WHERE auth_id = auth.current_user_auth_id())
      ));

-- RLS policy for insert
CREATE POLICY wholesale_tiers_insert_policy ON wholesale_tiers
FOR INSERT
WITH CHECK (organization_id = auth.current_user_auth_id() OR 
           organization_id IN (
             SELECT id FROM organizations 
             WHERE id = wholesale_tiers.organization_id AND 
                   id IN (SELECT organization_id FROM users WHERE auth_id = auth.current_user_auth_id())
           ));

-- RLS policy for update
CREATE POLICY wholesale_tiers_update_policy ON wholesale_tiers
FOR UPDATE
USING (organization_id = auth.current_user_auth_id() OR 
      organization_id IN (
        SELECT id FROM organizations 
        WHERE id = wholesale_tiers.organization_id AND 
              id IN (SELECT organization_id FROM users WHERE auth_id = auth.current_user_auth_id())
      ));

-- RLS policy for delete
CREATE POLICY wholesale_tiers_delete_policy ON wholesale_tiers
FOR DELETE
USING (organization_id = auth.current_user_auth_id() OR 
      organization_id IN (
        SELECT id FROM organizations 
        WHERE id = wholesale_tiers.organization_id AND 
              id IN (SELECT organization_id FROM users WHERE auth_id = auth.current_user_auth_id())
      ));

-- Function to get appropriate price based on quantity
CREATE OR REPLACE FUNCTION get_product_price_for_quantity(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
  v_retail_price NUMERIC;
  v_wholesale_price NUMERIC;
  v_partial_wholesale_price NUMERIC;
  v_min_wholesale_quantity INTEGER;
  v_min_partial_wholesale_quantity INTEGER;
  v_allow_retail BOOLEAN;
  v_allow_wholesale BOOLEAN;
  v_allow_partial_wholesale BOOLEAN;
  v_tier_price NUMERIC;
BEGIN
  -- Get product pricing information
  SELECT 
    price, 
    wholesale_price, 
    partial_wholesale_price,
    min_wholesale_quantity, 
    min_partial_wholesale_quantity,
    allow_retail,
    allow_wholesale,
    allow_partial_wholesale
  INTO 
    v_retail_price, 
    v_wholesale_price, 
    v_partial_wholesale_price,
    v_min_wholesale_quantity, 
    v_min_partial_wholesale_quantity,
    v_allow_retail,
    v_allow_wholesale,
    v_allow_partial_wholesale
  FROM products
  WHERE id = p_product_id;
  
  -- Check for pricing tiers first (highest priority)
  SELECT price INTO v_tier_price
  FROM wholesale_tiers
  WHERE product_id = p_product_id
    AND min_quantity <= p_quantity
  ORDER BY min_quantity DESC
  LIMIT 1;
  
  IF v_tier_price IS NOT NULL THEN
    RETURN v_tier_price;
  END IF;
  
  -- Then check wholesale pricing
  IF v_allow_wholesale AND v_wholesale_price IS NOT NULL AND v_min_wholesale_quantity IS NOT NULL AND p_quantity >= v_min_wholesale_quantity THEN
    RETURN v_wholesale_price;
  END IF;
  
  -- Then check partial wholesale pricing
  IF v_allow_partial_wholesale AND v_partial_wholesale_price IS NOT NULL AND v_min_partial_wholesale_quantity IS NOT NULL AND p_quantity >= v_min_partial_wholesale_quantity THEN
    RETURN v_partial_wholesale_price;
  END IF;
  
  -- Fall back to retail price if allowed
  IF v_allow_retail THEN
    RETURN v_retail_price;
  END IF;
  
  -- If retail is not allowed and no other pricing applies, return NULL
  RETURN NULL;
END;
$$ LANGUAGE plpgsql; 