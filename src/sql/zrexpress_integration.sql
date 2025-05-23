-- Update ZR Express API URL and ensure it exists
UPDATE shipping_providers 
SET 
  base_url = 'https://procolis.com/api_v1/', 
  name = 'ZR Express',
  is_active = true
WHERE code = 'zrexpress';

-- Insert if not exists
INSERT INTO shipping_providers (code, name, base_url, is_active)
SELECT 'zrexpress', 'ZR Express', 'https://procolis.com/api_v1/', true
WHERE NOT EXISTS (SELECT 1 FROM shipping_providers WHERE code = 'zrexpress');

-- Create a view to unify shipping data retrieval
CREATE OR REPLACE VIEW shipping_data_view AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  sp.id as provider_id,
  sp.code as provider_code,
  sp.name as provider_name,
  sps.is_enabled,
  sps.api_token,
  sps.api_key,
  sps.auto_shipping,
  sps.track_updates,
  sps.settings
FROM 
  organizations o
LEFT JOIN 
  shipping_provider_settings sps ON o.id = sps.organization_id
LEFT JOIN 
  shipping_providers sp ON sps.provider_id = sp.id
WHERE 
  sps.is_enabled = true;

-- Add a helper function to get all available shipping providers for an organization
CREATE OR REPLACE FUNCTION get_available_shipping_providers(org_id UUID)
RETURNS TABLE (
  provider_id INTEGER,
  provider_code TEXT,
  provider_name TEXT,
  is_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as provider_id,
    sp.code as provider_code,
    sp.name as provider_name,
    COALESCE(sps.is_enabled, false) as is_enabled
  FROM 
    shipping_providers sp
  LEFT JOIN 
    shipping_provider_settings sps ON sp.id = sps.provider_id AND sps.organization_id = org_id
  WHERE 
    sp.is_active = true
  ORDER BY
    sp.id;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate shipping API credentials when they change
CREATE OR REPLACE FUNCTION validate_shipping_credentials()
RETURNS TRIGGER AS $$
BEGIN
  -- Here we could add validation logic if needed
  -- For now just ensuring the record is properly set
  IF NEW.api_token IS NULL OR NEW.api_key IS NULL THEN
    NEW.is_enabled = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_update_shipping_credentials
BEFORE UPDATE ON shipping_provider_settings
FOR EACH ROW
EXECUTE FUNCTION validate_shipping_credentials();

-- Add comment explaining purpose of this SQL file
COMMENT ON TABLE shipping_providers IS 'Stores information about all integrated shipping providers';
COMMENT ON TABLE shipping_provider_settings IS 'Organization-specific settings for shipping providers'; 