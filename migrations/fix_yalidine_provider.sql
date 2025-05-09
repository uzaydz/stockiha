-- Fix Yalidine provider configuration
UPDATE shipping_providers 
SET name = 'Yalidine', 
    code = 'yalidine',
    base_url = 'https://api.yalidine.app/v1/' 
WHERE id = 5;

-- Insert provider settings if they don't exist
INSERT INTO shipping_provider_settings 
(organization_id, provider_id, api_token, api_key, is_enabled, created_at, updated_at)
SELECT 
  'fed872f9-1ade-4351-b020-5598fda976fe', -- The organization ID from the error logs
  5, -- The provider ID for Yalidine
  '86289860825230294974', -- Actual Yalidine API ID
  'c5ceGQvvk7XxPYEHs8uD02mapnsAVgmqfHebdNBKl234hZFCyTwXl4wVjFRJoZCh', -- Actual Yalidine API Token
  true, -- Enable the provider
  now(), -- Created timestamp
  now() -- Updated timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM shipping_provider_settings 
  WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe' AND provider_id = 5
); 