-- Add auth_user_id column to users table if it doesn't exist
DO $$
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' 
        AND column_name = 'auth_user_id'
    ) THEN
        -- Add the column
        ALTER TABLE public.users ADD COLUMN auth_user_id UUID;
        
        -- Add comment explaining the column's purpose
        COMMENT ON COLUMN public.users.auth_user_id IS 'Reference to the ID in auth.users table';
    END IF;
END $$; 