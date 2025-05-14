-- Script to fix the PostgreSQL error: "there is no parameter $1" in the origin_wilaya_id trigger
-- This script drops and recreates the trigger and trigger function with a correct implementation

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_yalidine_settings_has_origin_wilaya ON shipping_provider_settings;

-- Drop the existing trigger function
DROP FUNCTION IF EXISTS add_origin_wilaya_id_to_settings();

-- Create a proper function that doesn't rely on parameters
CREATE OR REPLACE FUNCTION add_origin_wilaya_id_to_settings()
RETURNS trigger AS $$
DECLARE
    yalidine_id INTEGER;
BEGIN
    -- Get Yalidine provider ID directly in the function
    SELECT id INTO yalidine_id FROM shipping_providers WHERE code = 'yalidine';
    
    -- Check if the provider is Yalidine
    IF NEW.provider_id = yalidine_id THEN
        -- If settings is NULL, initialize it as an empty object
        IF NEW.settings IS NULL THEN
            NEW.settings := '{}'::jsonb;
        END IF;
    END IF;
    
    -- Return the updated record
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER ensure_yalidine_settings_has_origin_wilaya
BEFORE INSERT OR UPDATE ON shipping_provider_settings
FOR EACH ROW
EXECUTE FUNCTION add_origin_wilaya_id_to_settings();

-- Update existing records if needed
UPDATE shipping_provider_settings 
SET settings = '{}'::jsonb 
WHERE settings IS NULL 
  AND provider_id = (SELECT id FROM shipping_providers WHERE code = 'yalidine');

-- Add comment to document the fix
COMMENT ON FUNCTION add_origin_wilaya_id_to_settings() IS 'Fixed function that initializes settings field for Yalidine provider without relying on parameters'; 