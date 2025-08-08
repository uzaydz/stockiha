-- =============================================================================
-- 🔧 إنشاء دالة إلغاء تفعيل التطبيق
-- =============================================================================

-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS disable_organization_app_simple(UUID, VARCHAR(50));

-- إنشاء دالة جديدة لإلغاء تفعيل التطبيق
CREATE OR REPLACE FUNCTION disable_organization_app_simple(
  p_org_id UUID,
  p_app_id VARCHAR(50)
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_affected_rows INTEGER;
  v_user_role TEXT;
BEGIN
  -- التحقق من صلاحية المستخدم
  SELECT u.role INTO v_user_role
  FROM users u
  WHERE u.auth_user_id = auth.uid()
  AND u.organization_id = p_org_id
  AND u.is_active = true;
  
  IF v_user_role IS NULL THEN
    RETURN QUERY
    SELECT FALSE as success, 'غير مصرح لك بالوصول لهذه المؤسسة' as message;
    RETURN;
  END IF;
  
  IF v_user_role NOT IN ('admin', 'owner') THEN
    RETURN QUERY
    SELECT FALSE as success, 'صلاحيات غير كافية لإلغاء تفعيل التطبيقات' as message;
    RETURN;
  END IF;

  -- تحديث حالة التطبيق لإلغاء التفعيل
  UPDATE organization_apps 
  SET is_enabled = false, updated_at = NOW()
  WHERE organization_apps.organization_id = p_org_id 
  AND organization_apps.app_id = p_app_id;

  -- الحصول على عدد الصفوف المتأثرة
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  -- إرجاع النتيجة
  IF v_affected_rows > 0 THEN
    RETURN QUERY
    SELECT TRUE as success, 'تم إلغاء تفعيل التطبيق بنجاح' as message;
  ELSE
    RETURN QUERY
    SELECT FALSE as success, 'التطبيق غير موجود أو غير مفعل مسبقاً' as message;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعطاء الصلاحيات المطلوبة
GRANT EXECUTE ON FUNCTION disable_organization_app_simple(UUID, VARCHAR(50)) TO authenticated;

-- تسجيل النجاح
DO $$
BEGIN
  RAISE NOTICE 'تم إنشاء دالة إلغاء تفعيل التطبيق بنجاح';
END $$; 