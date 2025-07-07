-- Migration: Add special_offers_config to products table
-- Purpose: Add support for special bundle offers and quantity discounts
-- This is separate from purchase_page_config.quantityOffers which serves different purpose

-- Add special_offers_config column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS special_offers_config JSONB DEFAULT '{"enabled": false, "offers": [], "displayStyle": "cards", "showSavings": true, "showUnitPrice": true, "currency": "دج"}'::jsonb;

-- Add comment to explain the column purpose
COMMENT ON COLUMN public.products.special_offers_config IS 'Configuration for special bundle offers and quantity-based pricing tiers. Different from purchase_page_config.quantityOffers which handles simple quantity discounts.';

-- Create index for better performance when querying products with special offers
CREATE INDEX IF NOT EXISTS idx_products_special_offers_enabled 
ON public.products 
USING GIN ((special_offers_config->'enabled')) 
WHERE (special_offers_config->>'enabled')::boolean = true;

-- Add validation constraint to ensure the JSON structure is valid
ALTER TABLE public.products 
ADD CONSTRAINT check_special_offers_config_structure 
CHECK (
  special_offers_config IS NULL OR 
  (
    jsonb_typeof(special_offers_config) = 'object' AND
    special_offers_config ? 'enabled' AND
    special_offers_config ? 'offers' AND
    special_offers_config ? 'displayStyle' AND
    special_offers_config ? 'showSavings' AND
    special_offers_config ? 'showUnitPrice' AND
    special_offers_config ? 'currency' AND
    jsonb_typeof(special_offers_config->'enabled') = 'boolean' AND
    jsonb_typeof(special_offers_config->'offers') = 'array' AND
    jsonb_typeof(special_offers_config->'showSavings') = 'boolean' AND
    jsonb_typeof(special_offers_config->'showUnitPrice') = 'boolean' AND
    jsonb_typeof(special_offers_config->'currency') = 'string'
  )
);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.products TO authenticated;

-- Add trigger to update updated_at when special_offers_config changes
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_products_updated_at'
  ) THEN
    CREATE TRIGGER trigger_products_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW
      EXECUTE FUNCTION update_products_updated_at();
  END IF;
END $$; 