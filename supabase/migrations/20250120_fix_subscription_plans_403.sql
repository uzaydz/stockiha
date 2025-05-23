-- Migration: Fix 403 error for subscription_plans table
-- Date: 2025-01-20
-- Issue: subscription_plans table returns 403 Forbidden due to missing RLS policies

-- Enable RLS on subscription_plans table
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "public_read_subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "dev_full_access_subscription_plans" ON subscription_plans;

-- Create public read policy for subscription plans
-- Subscription plans are public information that should be readable by everyone
CREATE POLICY "subscription_plans_public_read"
  ON subscription_plans
  FOR SELECT
  USING (true);

-- Create authenticated write policy for subscription plans
-- Only authenticated users can create/update/delete subscription plans
CREATE POLICY "subscription_plans_authenticated_write"
  ON subscription_plans
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Verify the fix by checking policies
DO $$
BEGIN
  RAISE NOTICE 'RLS Policies created successfully for subscription_plans table';
  RAISE NOTICE 'You can now access subscription_plans without 403 errors';
END $$; 