-- =============================================================================
-- 🔧 إصلاح دالة تفعيل التطبيق - حل مشكلة التضارب في أسماء الأعمدة
-- =============================================================================

-- إصلاح دالة تفعيل التطبيق
CREATE OR REPLACE FUNCTION enable_organization_app_secure(
  org_id UUID,
  app_id_param VARCHAR(50)
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  app_id VARCHAR(50),
  is_enabled BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  user_has_permission BOOLEAN := FALSE;
  app_record RECORD;
  app_org_id UUID := org_id;
  app_id_value VARCHAR(50) := app_id_param;
BEGIN
  -- فحص صلاحيات المستخدم - استخدام متغيرات محلية لتجنب التضارب
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid() 
    AND u.organization_id = app_org_id 
    AND u.role IN ('admin', 'owner')
    AND u.is_active = true
  ) INTO user_has_permission;

  -- إذا لم يكن لديه صلاحية
  IF NOT user_has_permission THEN
    RETURN QUERY
    SELECT 
      NULL::UUID, 
      NULL::UUID, 
      NULL::VARCHAR(50), 
      NULL::BOOLEAN, 
      NULL::TIMESTAMPTZ, 
      NULL::TIMESTAMPTZ,
      FALSE as success,
      'ليس لديك صلاحية لتفعيل التطبيقات في هذه المؤسسة' as message;
    RETURN;
  END IF;

  -- تحديث أو إدراج التطبيق - استخدام المتغيرات المحلية
  INSERT INTO organization_apps (organization_id, app_id, is_enabled, created_at, updated_at)
  VALUES (app_org_id, app_id_value, true, NOW(), NOW())
  ON CONFLICT (organization_id, app_id) 
  DO UPDATE SET 
    is_enabled = true, 
    updated_at = NOW()
  RETURNING * INTO app_record;

  -- إرجاع النتيجة
  RETURN QUERY
  SELECT 
    app_record.id,
    app_record.organization_id,
    app_record.app_id::VARCHAR(50),
    app_record.is_enabled,
    app_record.created_at,
    app_record.updated_at,
    TRUE as success,
    'تم تفعيل التطبيق بنجاح' as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعطاء الصلاحيات المطلوبة
GRANT EXECUTE ON FUNCTION enable_organization_app_secure(UUID, VARCHAR(50)) TO authenticated;

SELECT 'تم إصلاح دالة تفعيل التطبيق بنجاح' as status; 