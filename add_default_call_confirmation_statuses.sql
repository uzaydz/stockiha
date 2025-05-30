-- إنشاء وظيفة لإضافة حالات تأكيد المكالمات الافتراضية
CREATE OR REPLACE FUNCTION add_default_call_confirmation_statuses(
  p_organization_id UUID
) RETURNS VOID AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- التحقق من وجود حالات تأكيد مكالمات للمؤسسة
  SELECT EXISTS (
    SELECT 1 FROM call_confirmation_statuses WHERE organization_id = p_organization_id
  ) INTO v_exists;
  
  -- إذا كانت الحالات موجودة بالفعل، لا تقم بإضافة المزيد
  IF v_exists THEN
    RAISE NOTICE 'حالات تأكيد المكالمات موجودة بالفعل للمؤسسة %', p_organization_id;
    RETURN;
  END IF;
  
  -- إضافة الحالات الافتراضية
  INSERT INTO call_confirmation_statuses (name, organization_id, color, icon, is_default, created_at, updated_at)
  VALUES
    ('مؤكد', p_organization_id, '#10B981', 'check-circle', TRUE, NOW(), NOW()),
    ('غير مؤكد', p_organization_id, '#F43F5E', 'x-circle', FALSE, NOW(), NOW()),
    ('لم يتم الرد', p_organization_id, '#F59E0B', 'phone-missed', FALSE, NOW(), NOW()),
    ('الاتصال لاحقاً', p_organization_id, '#6366F1', 'clock', FALSE, NOW(), NOW());
    
  RAISE NOTICE 'تمت إضافة حالات تأكيد المكالمات الافتراضية للمؤسسة %', p_organization_id;
END;
$$ LANGUAGE plpgsql;

-- إضافة حالات تأكيد المكالمات الافتراضية للمؤسسة الحالية
SELECT add_default_call_confirmation_statuses('fed872f9-1ade-4351-b020-5598fda976fe');

-- التحقق من الحالات المضافة
SELECT * FROM call_confirmation_statuses WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'; 