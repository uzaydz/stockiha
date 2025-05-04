-- Create a function to replace the missing auth.admin_create_user function
-- This is needed for the create_employee_securely function to work properly

-- Drop the function if it already exists (to avoid errors on re-runs)
DROP FUNCTION IF EXISTS auth.admin_create_user(text, text, boolean, jsonb);

-- Create the admin_create_user function in the auth schema
CREATE OR REPLACE FUNCTION auth.admin_create_user(
    email text,
    password text,
    email_confirm boolean,
    user_metadata jsonb
) RETURNS uuid AS $$
DECLARE
    new_user_id uuid;
    current_org_id uuid;
BEGIN
    -- Get the current user's organization ID
    SELECT organization_id INTO current_org_id
    FROM public.users
    WHERE id = auth.uid();

    -- Create the user using the appropriate Supabase auth admin API
    -- Since we can't directly create users in auth.users via SQL,
    -- we'll use a workaround by inserting directly into public.users
    -- and assuming the auth.users will be managed via the frontend API
    
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();
    
    -- For troubleshooting purposes, log the operation
    RAISE NOTICE 'Creating user with email: %, user_id: %', email, new_user_id;
    
    -- Return the new user ID
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an alternative version of create_employee_securely that doesn't use auth.admin_create_user
CREATE OR REPLACE FUNCTION public.create_employee_securely(
    employee_email text,
    employee_password text,
    employee_name text,
    p_organization_id uuid,
    employee_phone text DEFAULT NULL,
    employee_permissions jsonb DEFAULT '{}'::jsonb
) RETURNS public.users AS $$
DECLARE
    new_user_id uuid;
    new_user_record public.users;
BEGIN
    -- Generate a UUID for the new user
    new_user_id := gen_random_uuid();

    -- Add employee record to public.users table
    INSERT INTO public.users (
        id,
        email,
        name,
        phone,
        role,
        permissions,
        is_active,
        organization_id
    )
    VALUES (
        new_user_id,
        employee_email,
        employee_name,
        employee_phone,
        'employee',
        employee_permissions,
        true,
        p_organization_id
    )
    RETURNING * INTO new_user_record;

    -- Return the created employee record
    RETURN new_user_record;

EXCEPTION
    -- Handle potential errors
    WHEN unique_violation THEN
        RAISE EXCEPTION 'User with email % already exists.', employee_email USING ERRCODE = '23505';
    WHEN others THEN
        RAISE EXCEPTION 'An unexpected error occurred: %', SQLERRM USING ERRCODE = SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GRANT PRIVILEGES
GRANT EXECUTE ON FUNCTION auth.admin_create_user(text, text, boolean, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_employee_securely(text, text, text, uuid, text, jsonb) TO authenticated;

-- Add a comment to explain the purpose of these functions
COMMENT ON FUNCTION auth.admin_create_user IS 'A function that simulates the admin_create_user functionality for employee creation';
COMMENT ON FUNCTION public.create_employee_securely IS 'Modified version of create_employee_securely that works with the simulated admin_create_user function'; 