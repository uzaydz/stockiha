-- Ensure unique custom shipping identifier per organization (only for custom where provider_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS ux_custom_shipping_identifier_per_org
ON public.shipping_provider_settings (organization_id, api_key)
WHERE provider_id IS NULL;

-- Ensure unique custom shipping service name per organization (stored inside JSON settings)
CREATE UNIQUE INDEX IF NOT EXISTS ux_custom_shipping_name_per_org
ON public.shipping_provider_settings (organization_id, ((settings ->> 'service_name')))
WHERE provider_id IS NULL;


