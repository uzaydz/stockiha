-- إنشاء وظيفة آمنة لإضافة حالات تأكيد المكالمات الافتراضية
-- هذه الوظيفة تعمل مع صلاحيات المشرف وتتجاوز سياسات RLS
CREATE OR REPLACE FUNCTION insert_call_confirmation_statuses_secure(
  organization_id UUID,
  user_id UUID DEFAULT NULL
)
RETURNS SETOF call_confirmation_statuses
SECURITY DEFINER -- هذا يجعل الوظيفة تعمل بصلاحيات مالك الوظيفة (المشرف)
SET search_path = public -- تحديد المسار للأمان
AS $$
DECLARE
  v_exists BOOLEAN;
  v_count INTEGER;
BEGIN
  -- التحقق من وجود حالات تأكيد مكالمات للمؤسسة
  SELECT EXISTS (
    SELECT 1 FROM call_confirmation_statuses WHERE organization_id = insert_call_confirmation_statuses_secure.organization_id
  ) INTO v_exists;
  
  -- إذا كانت الحالات موجودة بالفعل، إرجاع الحالات الموجودة
  IF v_exists THEN
    RETURN QUERY SELECT * FROM call_confirmation_statuses 
      WHERE organization_id = insert_call_confirmation_statuses_secure.organization_id
      ORDER BY is_default DESC, name ASC;
    RETURN;
  END IF;
  
  -- إدخال الحالات الافتراضية
  INSERT INTO call_confirmation_statuses (name, organization_id, color, icon, is_default, created_at, updated_at)
  VALUES
    ('مؤكد', organization_id, '#10B981', 'check-circle', TRUE, NOW(), NOW()),
    ('غير مؤكد', organization_id, '#F43F5E', 'x-circle', FALSE, NOW(), NOW()),
    ('لم يتم الرد', organization_id, '#F59E0B', 'phone-missed', FALSE, NOW(), NOW()),
    ('الاتصال لاحقاً', organization_id, '#6366F1', 'clock', FALSE, NOW(), NOW());
  
  -- إرجاع الحالات المضافة
  RETURN QUERY SELECT * FROM call_confirmation_statuses 
    WHERE organization_id = insert_call_confirmation_statuses_secure.organization_id
    ORDER BY is_default DESC, name ASC;
END;
$$ LANGUAGE plpgsql;

-- منح صلاحيات استخدام الوظيفة للمستخدمين المصرح لهم
GRANT EXECUTE ON FUNCTION insert_call_confirmation_statuses_secure TO authenticated;
GRANT EXECUTE ON FUNCTION insert_call_confirmation_statuses_secure TO service_role; 