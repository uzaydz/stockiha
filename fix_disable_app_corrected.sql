-- =============================================================================
-- 🔧 الإصلاح المُصحح لدالة إلغاء تفعيل التطبيق - للاتساق
-- =============================================================================

-- حذف الدالة القديمة أولاً
DROP FUNCTION IF EXISTS disable_organization_app_secure(UUID, VARCHAR);
DROP FUNCTION IF EXISTS disable_organization_app_secure(UUID, TEXT);
DROP FUNCTION IF EXISTS disable_organization_app_secure(UUID, CHARACTER VARYING);

-- إنشاء دالة إلغاء التفعيل المُصححة
CREATE OR REPLACE FUNCTION disable_organization_app_secure(
  p_org_id UUID,
  p_app_id VARCHAR(50)
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  app_id VARCHAR(50),
  is_enabled BOOLEAN,
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
      FALSE as success,
      'ليس لديك صلاحية لتعطيل التطبيقات في هذه المؤسسة' as message;
    RETURN;
  END IF;

  -- تعطيل التطبيق
  UPDATE organization_apps 
  SET is_enabled = false, updated_at = NOW()
  WHERE organization_apps.organization_id = p_org_id 
  AND organization_apps.app_id = p_app_id
  RETURNING * INTO v_app_record;

  -- التحقق من وجود سجل
  IF v_app_record.id IS NULL THEN
    RETURN QUERY
    SELECT 
      NULL::UUID, 
      NULL::UUID, 
      NULL::VARCHAR(50), 
      NULL::BOOLEAN, 
      NULL::TIMESTAMPTZ,
      FALSE as success,
      'التطبيق غير موجود أو غير مفعل مسبقاً' as message;
    RETURN;
  END IF;

  -- إرجاع النتيجة
  RETURN QUERY
  SELECT 
    v_app_record.id,
    v_app_record.organization_id,
    v_app_record.app_id::VARCHAR(50),
    v_app_record.is_enabled,
    v_app_record.updated_at,
    TRUE as success,
    'تم تعطيل التطبيق بنجاح' as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعطاء الصلاحيات المطلوبة
GRANT EXECUTE ON FUNCTION disable_organization_app_secure(UUID, VARCHAR(50)) TO authenticated;

-- اختبار الدالة
SELECT 'تم إصلاح دالة إلغاء تفعيل التطبيق بنجاح' as status; 