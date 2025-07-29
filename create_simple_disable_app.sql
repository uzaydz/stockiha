-- =============================================================================
-- 🔧 إنشاء دالة بسيطة لإلغاء تفعيل التطبيق
-- =============================================================================

-- حذف الدالة القديمة المعطلة
DROP FUNCTION IF EXISTS disable_organization_app(UUID, TEXT);

-- إنشاء دالة جديدة بسيطة لإلغاء التفعيل
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
BEGIN
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

SELECT 'تم إنشاء دالة إلغاء تفعيل التطبيق البسيطة بنجاح' as status; 