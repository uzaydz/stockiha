-- SQL Migration to update yalidine_fees table to better support origin wilaya

-- Update yalidine_fees to include a FK to yalidine_provinces
ALTER TABLE IF EXISTS yalidine_fees
DROP CONSTRAINT IF EXISTS yalidine_fees_from_wilaya_id_fkey,
ADD CONSTRAINT yalidine_fees_from_wilaya_id_fkey
FOREIGN KEY (from_wilaya_id)
REFERENCES yalidine_provinces_global(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS yalidine_fees
DROP CONSTRAINT IF EXISTS yalidine_fees_to_wilaya_id_fkey,
ADD CONSTRAINT yalidine_fees_to_wilaya_id_fkey
FOREIGN KEY (to_wilaya_id)
REFERENCES yalidine_provinces_global(id) ON DELETE CASCADE;

-- Create a function to retrieve the origin wilaya from settings
CREATE OR REPLACE FUNCTION get_yalidine_origin_wilaya(org_id UUID)
RETURNS INTEGER AS $$
DECLARE
    origin_wilaya_id INTEGER;
BEGIN
    -- Get the origin wilaya ID from settings JSON
    SELECT (settings->>'origin_wilaya_id')::INTEGER INTO origin_wilaya_id
    FROM shipping_provider_settings
    WHERE organization_id = org_id
    AND provider_id = (SELECT id FROM shipping_providers WHERE code = 'yalidine')
    LIMIT 1;
    
    -- Return the origin wilaya ID or default to Algiers (16) if not set
    RETURN COALESCE(origin_wilaya_id, 16);
END;
$$ LANGUAGE plpgsql;

-- Create a view that combines origin settings with rates
CREATE OR REPLACE VIEW yalidine_delivery_rates AS
SELECT 
    f.organization_id,
    f.from_wilaya_id,
    f.from_wilaya_name,
    f.to_wilaya_id,
    f.to_wilaya_name,
    f.zone,
    f.commune_id,
    f.commune_name,
    f.economic_home,
    f.economic_desk,
    f.express_home,
    f.express_desk,
    f.retour_fee,
    f.cod_percentage,
    f.insurance_percentage,
    f.oversize_fee,
    f.last_updated_at,
    CASE
        WHEN s.settings->>'origin_wilaya_id' IS NOT NULL THEN TRUE
        ELSE FALSE
    END AS has_custom_origin
FROM 
    yalidine_fees f
JOIN 
    shipping_provider_settings s ON f.organization_id = s.organization_id
WHERE 
    s.provider_id = (SELECT id FROM shipping_providers WHERE code = 'yalidine');

-- Comment on objects
COMMENT ON FUNCTION get_yalidine_origin_wilaya IS 'Returns the origin wilaya ID for a given organization, falling back to Algiers (16) if not set';
COMMENT ON VIEW yalidine_delivery_rates IS 'Combines yalidine fees with origin wilaya settings'; 