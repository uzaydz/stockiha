-- Migration: Add shipping integration support to form_settings
-- Description: Utilizes the existing settings JSONB column to store shipping provider integration settings

-- Update the version of the upsert_form_settings function that includes p_settings
-- to specify p_shipping_integration
CREATE OR REPLACE FUNCTION upsert_form_settings(
    p_organization_id UUID,
    p_name TEXT,
    p_fields JSONB,
    p_product_ids JSONB DEFAULT '[]'::JSONB,
    p_is_default BOOLEAN DEFAULT FALSE,
    p_is_active BOOLEAN DEFAULT TRUE,
    p_shipping_integration JSONB DEFAULT '{"enabled": false, "provider": null}'::JSONB,
    p_form_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_form_id UUID;
    v_settings JSONB;
BEGIN
    -- Create settings JSON with shipping_integration
    v_settings := jsonb_build_object('shipping_integration', p_shipping_integration);

    -- إذا كانت الإعدادات الجديدة هي الافتراضية، نقوم بإلغاء تعيين الإعدادات الافتراضية السابقة
    IF p_is_default = true THEN
        UPDATE form_settings
        SET is_default = false
        WHERE organization_id = p_organization_id AND is_default = true AND id != COALESCE(p_form_id, uuid_nil());
    END IF;

    -- إذا كان هناك معرف للنموذج، نقوم بتحديثه، وإلا نقوم بإنشاء إعدادات جديدة
    IF p_form_id IS NOT NULL THEN
        UPDATE form_settings
        SET 
            name = p_name,
            fields = p_fields,
            product_ids = p_product_ids,
            is_default = p_is_default,
            is_active = p_is_active,
            settings = v_settings,
            updated_at = NOW()
        WHERE id = p_form_id AND organization_id = p_organization_id
        RETURNING id INTO v_form_id;
    ELSE
        INSERT INTO form_settings (
            organization_id,
            name,
            fields,
            product_ids,
            is_default,
            is_active,
            created_by,
            settings
        )
        VALUES (
            p_organization_id,
            p_name,
            p_fields,
            p_product_ids,
            p_is_default,
            p_is_active,
            auth.uid(),
            v_settings
        )
        RETURNING id INTO v_form_id;
    END IF;

    RETURN v_form_id;
END;
$$;

-- Add a function to get form settings with shipping integration data
CREATE OR REPLACE FUNCTION get_form_settings_with_shipping(
    p_organization_id UUID
) RETURNS TABLE (
    id UUID,
    name TEXT,
    fields JSONB,
    product_ids JSONB,
    is_default BOOLEAN,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    shipping_integration JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fs.id,
        fs.name,
        fs.fields,
        fs.product_ids,
        fs.is_default,
        fs.is_active,
        fs.created_at,
        fs.updated_at,
        COALESCE(fs.settings->'shipping_integration', '{"enabled": false, "provider": null}'::JSONB) AS shipping_integration
    FROM form_settings fs
    WHERE fs.organization_id = p_organization_id
    AND fs.deleted_at IS NULL
    ORDER BY fs.is_default DESC, fs.updated_at DESC;
END;
$$; 