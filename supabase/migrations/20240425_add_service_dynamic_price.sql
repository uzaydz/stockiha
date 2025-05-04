-- Add a new boolean column to track if service has a dynamic price
ALTER TABLE services ADD COLUMN is_price_dynamic BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing services to have fixed price by default
UPDATE services SET is_price_dynamic = FALSE; 