-- Script to update RLS policies for organization_apps table
-- Run this in your Supabase SQL editor

-- Drop existing policies to recreate them with better error handling
DROP POLICY IF EXISTS "organization_apps_select_policy" ON organization_apps;
DROP POLICY IF EXISTS "organization_apps_insert_policy" ON organization_apps;
DROP POLICY IF EXISTS "organization_apps_update_policy" ON organization_apps;
DROP POLICY IF EXISTS "organization_apps_delete_policy" ON organization_apps;

-- Enable RLS if not already enabled
ALTER TABLE organization_apps ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow users to see apps for their organization
CREATE POLICY "organization_apps_select_policy" ON organization_apps
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.organization_id = organization_apps.organization_id
    AND users.is_active = true
  )
);

-- Insert policy: Allow admins and owners to install apps
CREATE POLICY "organization_apps_insert_policy" ON organization_apps
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.organization_id = organization_apps.organization_id
    AND users.role IN ('admin', 'owner')
    AND users.is_active = true
  )
);

-- Update policy: Allow admins and owners to modify apps (including upsert operations)
CREATE POLICY "organization_apps_update_policy" ON organization_apps
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.organization_id = organization_apps.organization_id
    AND users.role IN ('admin', 'owner')
    AND users.is_active = true
  )
);

-- Delete policy: Allow admins and owners to uninstall apps
CREATE POLICY "organization_apps_delete_policy" ON organization_apps
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.organization_id = organization_apps.organization_id
    AND users.role IN ('admin', 'owner')
    AND users.is_active = true
  )
);

-- Verify policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'organization_apps'
ORDER BY cmd, policyname; 