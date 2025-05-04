-- debug_logs.sql - SQL file for debugging database integration issues

-- Create a logging table to track database operations
CREATE TABLE IF NOT EXISTS public.debug_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  operation VARCHAR(255) NOT NULL,
  user_id UUID,
  organization_id UUID,
  details JSONB,
  error_message TEXT
);

-- Function to log authentication attempts
CREATE OR REPLACE FUNCTION log_auth_attempt(
  p_email TEXT,
  p_success BOOLEAN,
  p_user_id UUID DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.debug_logs (operation, user_id, details, error_message)
  VALUES (
    'auth_attempt', 
    p_user_id,
    jsonb_build_object(
      'email', p_email,
      'success', p_success,
      'timestamp', NOW()
    ),
    p_error
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin dashboard access
CREATE OR REPLACE FUNCTION log_dashboard_access(
  p_user_id UUID,
  p_organization_id UUID,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.debug_logs (operation, user_id, organization_id, details)
  VALUES (
    'dashboard_access', 
    p_user_id,
    p_organization_id,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log organization data retrieval
CREATE OR REPLACE FUNCTION log_organization_data(
  p_user_id UUID,
  p_organization_id UUID,
  p_subdomain TEXT,
  p_success BOOLEAN,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.debug_logs (operation, user_id, organization_id, details, error_message)
  VALUES (
    'organization_data', 
    p_user_id,
    p_organization_id,
    jsonb_build_object(
      'subdomain', p_subdomain,
      'success', p_success,
      'timestamp', NOW()
    ),
    p_error
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent log entries
CREATE OR REPLACE FUNCTION get_recent_logs(
  p_limit INTEGER DEFAULT 100,
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  "timestamp" TIMESTAMPTZ,
  operation VARCHAR(255),
  user_id UUID,
  organization_id UUID,
  details JSONB,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.timestamp, l.operation, l.user_id, l.organization_id, l.details, l.error_message
  FROM public.debug_logs l
  WHERE (p_user_id IS NULL OR l.user_id = p_user_id)
  AND (p_organization_id IS NULL OR l.organization_id = p_organization_id)
  ORDER BY l.timestamp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example of how to use the logging functions:
/*
-- Log an authentication attempt
SELECT log_auth_attempt('user@example.com', false, NULL, 'Invalid password');

-- Log a successful login
SELECT log_auth_attempt('admin@example.com', true, '12345678-1234-1234-1234-123456789012');

-- Log dashboard access
SELECT log_dashboard_access(
  '12345678-1234-1234-1234-123456789012', 
  '87654321-4321-4321-4321-210987654321',
  '{"browser": "Chrome", "ip": "192.168.1.1"}'
);

-- Get recent logs for a specific user
SELECT * FROM get_recent_logs(10, '12345678-1234-1234-1234-123456789012');
*/

-- First drop the existing function if it exists
DROP FUNCTION IF EXISTS check_user_organization_access(UUID, UUID);

-- Function for checking user access to an organization
CREATE OR REPLACE FUNCTION check_user_organization_access(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  -- Check if the user has access to the organization
  SELECT EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = p_user_id 
    AND organization_id = p_organization_id
  ) INTO v_has_access;
  
  -- Log the access check
  INSERT INTO public.debug_logs (
    operation, 
    user_id, 
    organization_id, 
    details, 
    error_message
  )
  VALUES (
    'check_organization_access', 
    p_user_id,
    p_organization_id,
    jsonb_build_object(
      'has_access', v_has_access,
      'timestamp', NOW()
    ),
    CASE WHEN NOT v_has_access THEN 'Access denied' ELSE NULL END
  );
  
  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 