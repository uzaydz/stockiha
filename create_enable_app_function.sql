-- =============================================================================
-- 🔧 إنشاء دالة تفعيل التطبيق
-- =============================================================================

-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS enable_organization_app_simple(UUID, VARCHAR(50));

-- إنشاء دالة جديدة لتفعيل التطبيق
CREATE OR REPLACE FUNCTION enable_organization_app_simple(
  org_id UUID,
  app_id_param VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- التحقق من صلاحية المستخدم
  SELECT u.role INTO user_role
  FROM users u
  WHERE u.auth_user_id = auth.uid()
  AND u.organization_id = org_id
  AND u.is_active = true;
  
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول لهذه المؤسسة';
  END IF;
  
  IF user_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'صلاحيات غير كافية لتفعيل التطبيقات';
  END IF;
  
  -- تفعيل التطبيق أو إنشاؤه
  INSERT INTO organization_apps (organization_id, app_id, is_enabled, installed_at, configuration, created_at, updated_at)
  VALUES (org_id, app_id_param, true, NOW(), '{}'::jsonb, NOW(), NOW())
  ON CONFLICT (organization_id, app_id) 
  DO UPDATE SET 
    is_enabled = true,
    updated_at = NOW();
    
  RETURN true;
END;
$$;

-- إعطاء الصلاحيات المطلوبة
GRANT EXECUTE ON FUNCTION enable_organization_app_simple(UUID, VARCHAR(50)) TO authenticated;

-- تسجيل النجاح
DO $$
BEGIN
  RAISE NOTICE 'تم إنشاء دالة تفعيل التطبيق بنجاح';
END $$; 