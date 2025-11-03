-- =====================================================
-- GET USER BASIC INFO
-- Function to get basic user information for authentication
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_basic_info(
  p_auth_user_id UUID
)
RETURNS TABLE (
  id UUID,
  auth_user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_super_admin BOOLEAN,
  is_org_admin BOOLEAN,
  is_active BOOLEAN,
  organization_id UUID
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Return user basic information
  RETURN QUERY
  SELECT
    u.id,
    u.auth_user_id,
    au.email,
    u.full_name,
    u.role,
    COALESCE(u.is_super_admin, FALSE) as is_super_admin,
    COALESCE(u.is_org_admin, FALSE) as is_org_admin,
    COALESCE(u.is_active, TRUE) as is_active,
    u.organization_id
  FROM users u
  LEFT JOIN auth.users au ON au.id = u.auth_user_id
  WHERE u.auth_user_id = p_auth_user_id
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_basic_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_basic_info(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION get_user_basic_info IS 'Get basic user information for authentication and authorization checks';
