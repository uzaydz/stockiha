-- Migration to add support for CTA Button component type to landing pages
-- Date: 2023-10-25

-- Check if the component type already exists in the table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM landing_page_components 
        WHERE type = 'ctaButton' 
        LIMIT 1
    ) THEN
        -- Add example/template CTA button for organizations to use
        INSERT INTO landing_page_components (
            id, 
            landing_page_id, 
            type, 
            settings, 
            is_active, 
            position,
            created_at,
            updated_at
        )
        VALUES (
            uuid_generate_v4(), -- Generate a new UUID for the component
            NULL, -- This is a template, not associated with a specific landing page
            'ctaButton', 
            '{
                "text": "اضغط هنا",
                "variant": "default",
                "size": "lg",
                "roundness": "lg", 
                "shadow": "md",
                "animation": "scale",
                "effect": "elevate",
                "borderStyle": "solid",
                "fontWeight": "semibold",
                "scrollToId": "",
                "hasRipple": true,
                "hasPulsingBorder": false,
                "isGlowingText": false,
                "hasDoubleText": false,
                "secondaryText": "",
                "customTextColor": "",
                "customBgColor": "",
                "customBorderColor": "",
                "hoverTextColor": "",
                "iconPosition": "right",
                "iconType": "arrowLeft",
                "iconSpacing": "normal",
                "useCustomColors": false
            }'::jsonb,
            true, 
            0,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Added ctaButton template component';
    ELSE
        RAISE NOTICE 'ctaButton component type already exists';
    END IF;
END
$$;

-- Create a function to handle component settings validation
CREATE OR REPLACE FUNCTION validate_cta_button_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate required fields for CTA button
    IF NEW.type = 'ctaButton' THEN
        -- Ensure text is present
        IF NOT (NEW.settings ? 'text') OR NEW.settings->>'text' = '' THEN
            NEW.settings = jsonb_set(NEW.settings, '{text}', '"اضغط هنا"');
        END IF;
        
        -- Ensure variant is valid
        IF NOT (NEW.settings ? 'variant') THEN
            NEW.settings = jsonb_set(NEW.settings, '{variant}', '"default"');
        END IF;
        
        -- Ensure size is valid
        IF NOT (NEW.settings ? 'size') THEN
            NEW.settings = jsonb_set(NEW.settings, '{size}', '"default"');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate CTA button settings on insert/update
DROP TRIGGER IF EXISTS validate_cta_button_settings_trigger ON landing_page_components;
CREATE TRIGGER validate_cta_button_settings_trigger
BEFORE INSERT OR UPDATE ON landing_page_components
FOR EACH ROW
WHEN (NEW.type = 'ctaButton')
EXECUTE FUNCTION validate_cta_button_settings();

-- Add index to improve query performance for finding components by type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'idx_landing_page_components_type'
    ) THEN
        CREATE INDEX idx_landing_page_components_type ON landing_page_components(type);
        RAISE NOTICE 'Created index on landing_page_components.type';
    ELSE
        RAISE NOTICE 'Index on landing_page_components.type already exists';
    END IF;
END
$$; 