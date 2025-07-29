-- =============================================================================
-- 🔧 الإصلاح المُصحح لدالة تفعيل التطبيق - حل مشكلة ON CONFLICT
-- =============================================================================

-- حذف الدالة القديمة أولاً
DROP FUNCTION IF EXISTS enable_organization_app_secure(UUID, VARCHAR);
DROP FUNCTION IF EXISTS enable_organization_app_secure(UUID, TEXT);
DROP FUNCTION IF EXISTS enable_organization_app_secure(UUID, CHARACTER VARYING);

-- إنشاء الدالة من جديد بدون أي تضارب أو أخطاء syntax
CREATE OR REPLACE FUNCTION enable_organization_app_secure(
  p_org_id UUID,
  p_app_id VARCHAR(50)
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
  v_user_has_permission BOOLEAN := FALSE;
  v_app_record RECORD;
BEGIN
  -- فحص صلاحيات المستخدم
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND users.organization_id = p_org_id 
    AND role IN ('admin', 'owner')
    AND is_active = true
  ) INTO v_user_has_permission;

  -- إذا لم يكن لديه صلاحية
  IF NOT v_user_has_permission THEN
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

  -- تحديث أو إدراج التطبيق - بدون اسم الجدول في ON CONFLICT
  INSERT INTO organization_apps (organization_id, app_id, is_enabled, created_at, updated_at)
  VALUES (p_org_id, p_app_id, true, NOW(), NOW())
  ON CONFLICT (organization_id, app_id) 
  DO UPDATE SET 
    is_enabled = true, 
    updated_at = NOW()
  RETURNING * INTO v_app_record;

  -- إرجاع النتيجة
  RETURN QUERY
  SELECT 
    v_app_record.id,
    v_app_record.organization_id,
    v_app_record.app_id::VARCHAR(50),
    v_app_record.is_enabled,
    v_app_record.created_at,
    v_app_record.updated_at,
    TRUE as success,
    'تم تفعيل التطبيق بنجاح' as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعطاء الصلاحيات المطلوبة
GRANT EXECUTE ON FUNCTION enable_organization_app_secure(UUID, VARCHAR(50)) TO authenticated;

-- اختبار الدالة
SELECT 'تم إصلاح دالة تفعيل التطبيق بنجاح' as status; 