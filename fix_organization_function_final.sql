-- Drop existing functions to avoid any conflicts
DROP FUNCTION IF EXISTS create_organization_safe;
DROP FUNCTION IF EXISTS insert_organization_simple;

-- Create the fixed insert_organization_simple function
CREATE OR REPLACE FUNCTION insert_organization_simple(
  p_name TEXT,
  p_subdomain TEXT,
  p_owner_id UUID,
  p_settings JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  existing_org_id UUID;
BEGIN
  -- Check if organization already exists with same subdomain
  SELECT id INTO existing_org_id
  FROM organizations
  WHERE subdomain = p_subdomain;
  
  -- If found, return it
  IF existing_org_id IS NOT NULL THEN
    -- Try to update user
    BEGIN
      UPDATE users
      SET 
        organization_id = existing_org_id,
        is_org_admin = TRUE,
        role = 'admin'
      WHERE id = p_owner_id;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore any errors that may occur during update
      RAISE NOTICE 'فشل تحديث المستخدم: %', SQLERRM;
    END;
    
    RETURN existing_org_id;
  END IF;

  -- Create a new UUID manually
  new_org_id := gen_random_uuid();
  
  -- Insert organization with manual ID specification - no ON CONFLICT
  INSERT INTO organizations (
    id,
    name,
    subdomain,
    owner_id,
    subscription_tier,
    subscription_status,
    settings,
    created_at,
    updated_at
  )
  VALUES (
    new_org_id,
    p_name,
    p_subdomain,
    p_owner_id,
    'trial',
    'trial',
    p_settings,
    NOW(),
    NOW()
  );
  
  -- Try to link user to organization
  BEGIN
    -- Check if user exists
    IF EXISTS (SELECT 1 FROM users WHERE id = p_owner_id) THEN
      -- Update existing user
      UPDATE users
      SET 
        organization_id = new_org_id,
        is_org_admin = TRUE,
        role = 'admin'
      WHERE id = p_owner_id;
    ELSE
      -- Insert new user record
      INSERT INTO users (
        id,
        email,
        name,
        role,
        is_active,
        organization_id,
        is_org_admin,
        created_at,
        updated_at
      )
      VALUES (
        p_owner_id,
        (SELECT email FROM auth.users WHERE id = p_owner_id),
        COALESCE((SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = p_owner_id), 'User'),
        'admin',
        TRUE,
        new_org_id,
        TRUE,
        NOW(),
        NOW()
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE NOTICE 'فشل ربط المستخدم بالمنظمة: %', SQLERRM;
  END;
  
  RETURN new_org_id;
END;
$$;

-- Create the fixed create_organization_safe function
CREATE OR REPLACE FUNCTION create_organization_safe(
  p_name TEXT,
  p_subdomain TEXT,
  p_owner_id UUID,
  p_settings JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Call the improved function - IMPORTANT: match the parameter names exactly!
  SELECT insert_organization_simple(
    p_name,
    p_subdomain,
    p_owner_id,
    p_settings
  ) INTO v_org_id;
  
  RETURN v_org_id;
END;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION insert_organization_simple TO authenticated;
GRANT EXECUTE ON FUNCTION insert_organization_simple TO service_role;
GRANT EXECUTE ON FUNCTION create_organization_safe TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_safe TO service_role; 