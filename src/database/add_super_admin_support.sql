-- Add super admin support to database
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'is_super_admin'
    ) THEN
        -- Add is_super_admin column
        ALTER TABLE public.users
        ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
        
        -- Add comment
        COMMENT ON COLUMN public.users.is_super_admin IS 'Flag to indicate if the user is a super admin with access to all organizations';
        
        RAISE NOTICE 'Column is_super_admin added to users table successfully';
    ELSE
        RAISE NOTICE 'Column is_super_admin already exists in users table';
    END IF;
END
$$;

-- Add RLS policy for super admins (they can access all data)
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if the column exists
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'is_super_admin'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE EXCEPTION 'Column is_super_admin does not exist in users table. Please run the first part of the script first.';
    ELSE
        RAISE NOTICE 'Column is_super_admin exists, proceeding with creating policies';
    END IF;
    
    -- Create policy for super admins to access all organizations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND policyname = 'Allow super admin access to all organizations'
    ) THEN
        CREATE POLICY "Allow super admin access to all organizations" 
        ON organizations
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.is_super_admin = TRUE
            )
        );
        
        RAISE NOTICE 'Created policy for super admin access to organizations';
    END IF;
    
    -- Create policy for super admins to access all users
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Allow super admin access to all users'
    ) THEN
        CREATE POLICY "Allow super admin access to all users" 
        ON users
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.is_super_admin = TRUE
            )
        );
        
        RAISE NOTICE 'Created policy for super admin access to users';
    END IF;
    
    -- Create policies for other main tables to allow super admin access
    
    -- Products
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' 
        AND policyname = 'Allow super admin access to all products'
    ) THEN
        CREATE POLICY "Allow super admin access to all products" 
        ON products
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.is_super_admin = TRUE
            )
        );
        
        RAISE NOTICE 'Created policy for super admin access to products';
    END IF;
    
    -- Orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' 
        AND policyname = 'Allow super admin access to all orders'
    ) THEN
        CREATE POLICY "Allow super admin access to all orders" 
        ON orders
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.is_super_admin = TRUE
            )
        );
        
        RAISE NOTICE 'Created policy for super admin access to orders';
    END IF;
    
    -- Invoices
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'invoices' 
        AND policyname = 'Allow super admin access to all invoices'
    ) THEN
        CREATE POLICY "Allow super admin access to all invoices" 
        ON invoices
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.is_super_admin = TRUE
            )
        );
        
        RAISE NOTICE 'Created policy for super admin access to invoices';
    END IF;
END
$$;

-- Function to create or update a super admin user
CREATE OR REPLACE FUNCTION create_super_admin(
    p_email TEXT,
    p_name TEXT,
    p_password TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if the user exists in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;
    
    -- If not exists in auth.users, create new auth user
    -- Note: In a real implementation, you would use Supabase Admin API or UI to create this user
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User does not exist in auth.users. Please create the user through Supabase Auth UI or API first.';
        RETURN;
    END IF;
    
    -- Check if user exists in public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
        -- Update existing user to be super admin
        UPDATE public.users
        SET 
            is_super_admin = TRUE,
            role = 'super_admin',
            is_active = TRUE,
            name = p_name,
            updated_at = NOW()
        WHERE email = p_email;
        
        RAISE NOTICE 'Updated existing user to super admin: %', p_email;
    ELSE
        -- Create new user in public.users
        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            is_active,
            is_super_admin,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            p_email,
            p_name,
            'super_admin',
            TRUE,
            TRUE,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created new super admin user: %', p_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example usage:
-- SELECT create_super_admin('admin@example.com', 'Super Admin'); 