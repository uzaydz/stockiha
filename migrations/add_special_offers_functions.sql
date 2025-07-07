-- Migration: Add helper functions for special offers
-- Purpose: Add utility functions for managing special offers

-- Function to get products with active special offers
CREATE OR REPLACE FUNCTION get_products_with_special_offers(org_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  price NUMERIC,
  special_offers_config JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.price,
    p.special_offers_config
  FROM public.products p
  WHERE 
    p.organization_id = org_id
    AND p.is_active = true
    AND (p.special_offers_config->>'enabled')::boolean = true
    AND jsonb_array_length(p.special_offers_config->'offers') > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate best price for a quantity from special offers
CREATE OR REPLACE FUNCTION calculate_special_offer_price(
  product_id UUID, 
  quantity INTEGER
)
RETURNS TABLE (
  best_price NUMERIC,
  offer_name TEXT,
  savings NUMERIC,
  free_quantity INTEGER
) AS $$
DECLARE
  product_record RECORD;
  offer_record JSONB;
  current_offer JSONB;
  best_offer JSONB := NULL;
  best_total_price NUMERIC := NULL;
  base_price NUMERIC;
BEGIN
  -- Get product details
  SELECT p.price, p.special_offers_config 
  INTO product_record 
  FROM public.products p 
  WHERE p.id = product_id;

  IF NOT FOUND OR NOT (product_record.special_offers_config->>'enabled')::boolean THEN
    -- Return base price if no special offers
    RETURN QUERY SELECT 
      product_record.price * quantity,
      NULL::TEXT,
      0::NUMERIC,
      0::INTEGER;
    RETURN;
  END IF;

  base_price := product_record.price;

  -- Loop through offers to find best deal
  FOR offer_record IN 
    SELECT jsonb_array_elements(product_record.special_offers_config->'offers')
  LOOP
    current_offer := offer_record;
    
    -- Check if quantity meets minimum requirement
    IF quantity >= (current_offer->>'quantity')::INTEGER THEN
      DECLARE
        offer_total_price NUMERIC := (current_offer->>'discountedPrice')::NUMERIC;
        offer_quantity INTEGER := (current_offer->>'quantity')::INTEGER;
        bonus_quantity INTEGER := COALESCE((current_offer->>'bonusQuantity')::INTEGER, 0);
        
        -- Calculate effective price for requested quantity
        actual_price NUMERIC := offer_total_price * (quantity::NUMERIC / offer_quantity::NUMERIC);
      BEGIN
        IF best_total_price IS NULL OR actual_price < best_total_price THEN
          best_total_price := actual_price;
          best_offer := current_offer;
        END IF;
      END;
    END IF;
  END LOOP;

  -- Return best offer or base price
  IF best_offer IS NOT NULL THEN
    RETURN QUERY SELECT 
      best_total_price,
      (best_offer->>'name')::TEXT,
      (base_price * quantity) - best_total_price,
      COALESCE((best_offer->>'bonusQuantity')::INTEGER, 0);
  ELSE
    RETURN QUERY SELECT 
      base_price * quantity,
      NULL::TEXT,
      0::NUMERIC,
      0::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate special offer structure
CREATE OR REPLACE FUNCTION validate_special_offer_json(offer_json JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    offer_json ? 'id' AND
    offer_json ? 'name' AND
    offer_json ? 'quantity' AND
    offer_json ? 'originalPrice' AND
    offer_json ? 'discountedPrice' AND
    offer_json ? 'discountPercentage' AND
    jsonb_typeof(offer_json->'quantity') = 'number' AND
    jsonb_typeof(offer_json->'originalPrice') = 'number' AND
    jsonb_typeof(offer_json->'discountedPrice') = 'number' AND
    jsonb_typeof(offer_json->'discountPercentage') = 'number' AND
    (offer_json->>'quantity')::INTEGER > 0 AND
    (offer_json->>'originalPrice')::NUMERIC > 0 AND
    (offer_json->>'discountedPrice')::NUMERIC > 0 AND
    (offer_json->>'discountPercentage')::NUMERIC >= 0 AND
    (offer_json->>'discountPercentage')::NUMERIC <= 100
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_products_with_special_offers(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_special_offer_price(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_special_offer_json(JSONB) TO authenticated; 