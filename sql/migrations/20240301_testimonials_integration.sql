-- Migration: Testimonials Integration
-- This migration adds necessary functions and views for integrating testimonials with landing pages

-- Make sure customer_testimonials table has is_active column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_testimonials' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE customer_testimonials ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END
$$;

-- Function to create or update a testimonial component
CREATE OR REPLACE FUNCTION upsert_testimonial_component(
  p_landing_page_id UUID,
  p_settings JSONB,
  p_position INTEGER,
  p_component_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_component_id UUID;
BEGIN
  IF p_component_id IS NULL THEN
    -- Create new component
    INSERT INTO landing_page_components(
      landing_page_id,
      type,
      settings,
      is_active,
      position,
      created_at,
      updated_at
    ) VALUES (
      p_landing_page_id,
      'testimonials',
      p_settings,
      TRUE,
      p_position,
      NOW(),
      NOW()
    ) RETURNING id INTO v_component_id;
  ELSE
    -- Update existing component
    UPDATE landing_page_components
    SET 
      settings = p_settings,
      position = p_position,
      updated_at = NOW()
    WHERE id = p_component_id
    RETURNING id INTO v_component_id;
  END IF;

  RETURN v_component_id;
END;
$$ LANGUAGE plpgsql;

-- Function to fetch testimonials for a specific component
CREATE OR REPLACE FUNCTION get_testimonials_for_component(
  p_component_id UUID
) RETURNS TABLE (
  component_id UUID,
  component_settings JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as component_id,
    settings as component_settings
  FROM landing_page_components
  WHERE id = p_component_id AND type = 'testimonials';
END;
$$ LANGUAGE plpgsql;

-- Function to sync testimonial items with customer_testimonials table
CREATE OR REPLACE FUNCTION sync_testimonial_items(
  p_organization_id UUID,
  p_testimonial_ids TEXT[]
) RETURNS VOID AS $$
BEGIN
  -- Set is_active = true for testimonials in the list
  UPDATE customer_testimonials
  SET is_active = TRUE
  WHERE organization_id = p_organization_id 
  AND id::TEXT = ANY(p_testimonial_ids);
  
  -- Set is_active = false for testimonials not in the list
  UPDATE customer_testimonials
  SET is_active = FALSE
  WHERE organization_id = p_organization_id 
  AND is_active = TRUE
  AND id::TEXT <> ALL(p_testimonial_ids);
END;
$$ LANGUAGE plpgsql;

-- View to get active testimonials with organization ID
CREATE OR REPLACE VIEW active_testimonials AS
SELECT 
  id,
  organization_id,
  customer_name,
  customer_avatar,
  rating,
  comment,
  verified,
  purchase_date,
  product_name,
  product_image,
  created_at,
  updated_at
FROM customer_testimonials
WHERE is_active = TRUE;

-- Trigger to update the updated_at timestamp whenever a testimonial is updated
CREATE OR REPLACE FUNCTION update_testimonial_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists to avoid errors
DROP TRIGGER IF EXISTS update_testimonial_timestamp_trigger ON customer_testimonials;

-- Create the trigger
CREATE TRIGGER update_testimonial_timestamp_trigger
BEFORE UPDATE ON customer_testimonials
FOR EACH ROW
EXECUTE FUNCTION update_testimonial_timestamp();

-- Add index on customer_testimonials for better performance
CREATE INDEX IF NOT EXISTS idx_customer_testimonials_org_active 
ON customer_testimonials(organization_id, is_active);

-- Insert default types for landing page components if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'landing_page_component_type'
    ) THEN
        CREATE TYPE landing_page_component_type AS ENUM (
            'header', 'hero', 'features', 'pricing', 'testimonials', 
            'cta', 'faq', 'contact', 'footer'
        );
    ELSE
        -- Check if testimonials type exists in enum
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'landing_page_component_type')
            AND enumlabel = 'testimonials'
        ) THEN
            ALTER TYPE landing_page_component_type ADD VALUE 'testimonials';
        END IF;
    END IF;
END
$$; 