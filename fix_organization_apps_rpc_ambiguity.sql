-- =============================================================================
-- 🔧 إصلاح مشكلة التضارب في أسماء الأعمدة في دوال RPC
-- =============================================================================

-- إصلاح دالة تعطيل التطبيق
CREATE OR REPLACE FUNCTION disable_organization_app_secure(
  org_id UUID,
  app_id_param TEXT
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  app_id TEXT,
  is_enabled BOOLEAN,
  updated_at TIMESTAMPTZ,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  user_has_permission BOOLEAN := FALSE;
  app_record RECORD;
BEGIN
  -- فحص صلاحيات المستخدم - إصلاح التضارب في أسماء الأعمدة
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid() 
    AND u.organization_id = org_id 
    AND u.role IN ('admin', 'owner')
    AND u.is_active = true
  ) INTO user_has_permission;

  -- إذا لم يكن لديه صلاحية
  IF NOT user_has_permission THEN
    RETURN QUERY
    SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::BOOLEAN, 
      NULL::TIMESTAMPTZ,
      FALSE as success,
      'ليس لديك صلاحية لتعطيل التطبيقات في هذه المؤسسة' as message;
    RETURN;
  END IF;

  -- تعطيل التطبيق - استخدام اسم مستعار واضح
  UPDATE organization_apps oa
  SET is_enabled = false, updated_at = NOW()
  WHERE oa.organization_id = org_id AND oa.app_id = app_id_param
  RETURNING * INTO app_record;

  -- إرجاع النتيجة
  RETURN QUERY
  SELECT 
    app_record.id,
    app_record.organization_id,
    app_record.app_id,
    app_record.is_enabled,
    app_record.updated_at,
    TRUE as success,
    'تم تعطيل التطبيق بنجاح' as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إصلاح دالة تفعيل التطبيق أيضاً
CREATE OR REPLACE FUNCTION enable_organization_app_secure(
  org_id UUID,
  app_id_param TEXT
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  app_id TEXT,
  is_enabled BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  user_has_permission BOOLEAN := FALSE;
  app_record RECORD;
BEGIN
  -- فحص صلاحيات المستخدم - إصلاح التضارب في أسماء الأعمدة
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid() 
    AND u.organization_id = org_id 
    AND u.role IN ('admin', 'owner')
    AND u.is_active = true
  ) INTO user_has_permission;

  -- إذا لم يكن لديه صلاحية
  IF NOT user_has_permission THEN
    RETURN QUERY
    SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::BOOLEAN, 
      NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ,
      FALSE as success,
      'ليس لديك صلاحية لتفعيل التطبيقات في هذه المؤسسة' as message;
    RETURN;
  END IF;

  -- تحديث أو إدراج التطبيق - استخدام اسم مستعار واضح
  INSERT INTO organization_apps (organization_id, app_id, is_enabled, created_at, updated_at)
  VALUES (org_id, app_id_param, true, NOW(), NOW())
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
    app_record.app_id,
    app_record.is_enabled,
    app_record.created_at,
    app_record.updated_at,
    TRUE as success,
    'تم تفعيل التطبيق بنجاح' as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعطاء الصلاحيات المطلوبة
GRANT EXECUTE ON FUNCTION enable_organization_app_secure(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION disable_organization_app_secure(UUID, TEXT) TO authenticated;

SELECT 'تم إصلاح دوال RPC بنجاح' as status; 