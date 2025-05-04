-- order_processing.sql
-- This file contains SQL functions for handling order processing and customer order numbering

-- 1. Add a column to the 'orders' table for customer-specific order number
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_order_number INTEGER;

-- 2. Create a function to generate sequential order numbers for each customer
CREATE OR REPLACE FUNCTION generate_customer_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_order_number INTEGER;
BEGIN
  -- Find the highest order number for this customer
  SELECT COALESCE(MAX(customer_order_number), 0) + 1 INTO next_order_number
  FROM orders
  WHERE customer_id = NEW.customer_id;
  
  -- Set the customer-specific order number
  NEW.customer_order_number := next_order_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a trigger to automatically set the customer order number
DROP TRIGGER IF EXISTS set_customer_order_number ON orders;
CREATE TRIGGER set_customer_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_customer_order_number();

-- 4. Function to create a guest customer and process online order
CREATE OR REPLACE FUNCTION process_online_order(
  p_full_name TEXT,
  p_phone TEXT,
  p_province TEXT,
  p_address TEXT,
  p_delivery_company TEXT,
  p_payment_method TEXT,
  p_notes TEXT,
  p_product_id UUID,
  p_product_color_id UUID,
  p_quantity INTEGER,
  p_unit_price NUMERIC,
  p_total_price NUMERIC,
  p_delivery_fee NUMERIC,
  p_organization_id UUID
) RETURNS JSON AS $$
DECLARE
  v_customer_id UUID;
  v_address_id UUID;
  v_order_id UUID;
  v_order_item_id UUID;
  v_order_number INTEGER;
  v_order_slug TEXT;
  v_item_slug TEXT;
BEGIN
  -- 1. Create or find the customer
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = p_phone AND organization_id = p_organization_id;
  
  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (name, phone, organization_id)
    VALUES (p_full_name, p_phone, p_organization_id)
    RETURNING id INTO v_customer_id;
  END IF;
  
  -- 2. Create address record
  INSERT INTO addresses (
    user_id, 
    name, 
    street_address, 
    city, 
    state, 
    postal_code, 
    country, 
    phone, 
    is_default,
    organization_id
  )
  VALUES (
    v_customer_id,
    p_full_name,
    p_address,
    '', -- city (not provided in form)
    p_province,
    '', -- postal_code (not provided in form)
    'Algeria',
    p_phone,
    TRUE,
    p_organization_id
  )
  RETURNING id INTO v_address_id;
  
  -- 3. Generate slugs
  v_order_slug := 'ord-' || FLOOR(RANDOM() * 100000000)::TEXT;
  v_item_slug := 'item-' || FLOOR(RANDOM() * 100000000)::TEXT;
  
  -- 4. Create the order - EXPLICITLY including slug column
  INSERT INTO orders (
    customer_id,
    subtotal,
    tax,
    discount,
    total,
    status,
    payment_method,
    payment_status,
    shipping_address_id,
    shipping_method,
    shipping_cost,
    notes,
    is_online,
    organization_id,
    slug -- Include slug column explicitly
  )
  VALUES (
    v_customer_id,
    p_total_price,
    0, -- tax
    0, -- discount
    p_total_price + p_delivery_fee, -- total
    'pending', -- status
    p_payment_method, -- payment_method
    'pending', -- payment_status
    v_address_id, -- shipping_address_id
    p_delivery_company, -- shipping_method
    p_delivery_fee, -- shipping_cost
    p_notes, -- notes
    TRUE, -- is_online
    p_organization_id,
    v_order_slug -- Provide slug value
  )
  RETURNING id, customer_order_number INTO v_order_id, v_order_number;
  
  -- 5. Add order item - EXPLICITLY including slug column
  INSERT INTO order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    total_price,
    is_digital,
    organization_id,
    slug, -- Include slug column explicitly
    name
  )
  SELECT
    v_order_id,
    p_product_id,
    p.name,
    p_quantity,
    p_unit_price,
    p_total_price,
    FALSE, -- is_digital
    p_organization_id,
    v_item_slug, -- Provide slug value
    p.name
  FROM products p
  WHERE p.id = p_product_id
  RETURNING id INTO v_order_item_id;
  
  -- 6. If a color is specified, update the order item with color information
  IF p_product_color_id IS NOT NULL THEN
    -- Update the inventory for this specific color
    UPDATE product_colors
    SET quantity = quantity - p_quantity
    WHERE id = p_product_color_id AND organization_id = p_organization_id;
  ELSE
    -- Update the general product inventory
    UPDATE products
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_product_id AND organization_id = p_organization_id;
  END IF;
  
  -- 7. Return order information as JSON
  RETURN json_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'order_slug', v_order_slug,
    'customer_id', v_customer_id
  );
END;
$$ LANGUAGE plpgsql; 