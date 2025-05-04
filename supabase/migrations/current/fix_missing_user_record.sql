-- Check if the user already exists
DO $$
DECLARE
    user_exists BOOLEAN;
    auth_user_exists BOOLEAN;
BEGIN
    -- Check if user exists in public.users
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE id = '9ac928bb-562d-4bf6-a92a-b4bec647ede5'
    ) INTO user_exists;
    
    -- Check if user exists in auth.users
    SELECT EXISTS(
        SELECT 1 FROM auth.users 
        WHERE id = '9ac928bb-562d-4bf6-a92a-b4bec647ede5'
    ) INTO auth_user_exists;
    
    IF auth_user_exists AND NOT user_exists THEN
        -- Insert the missing user record
        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            permissions,
            is_active,
            organization_id,
            created_at,
            updated_at
        ) VALUES (
            '9ac928bb-562d-4bf6-a92a-b4bec647ede5',
            'uzaaaydztouta@gmail.com',
            'oussama dalel',
            'employee',
            '{
                "accessPOS": true,
                "viewOrders": true,
                "viewProducts": true,
                "viewServices": true,
                "viewCustomers": true, 
                "viewEmployees": true,
                "viewSettings": true,
                "processPayments": true,
                "manageProfileSettings": true,
                "manageAppearanceSettings": true,
                "manageSecuritySettings": true,
                "manageNotificationSettings": true
            }',
            true,
            '7519afc0-d068-4235-a0f2-f92935772e0c',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Added missing user record for ID: 9ac928bb-562d-4bf6-a92a-b4bec647ede5';
    ELSIF user_exists THEN
        RAISE NOTICE 'User already exists in public.users table';
    ELSE
        RAISE NOTICE 'Auth user does not exist, cannot create public user record';
    END IF;
END $$; 