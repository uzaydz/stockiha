-- إعادة إنشاء وظيفة تحديث حالة تأكيد الإتصال للطلب
DROP FUNCTION IF EXISTS update_order_call_confirmation;

CREATE OR REPLACE FUNCTION update_order_call_confirmation(
  p_order_id UUID,
  p_status_id INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_found BOOLEAN;
  v_organization_id UUID;
  v_status_org_id UUID;
BEGIN
  -- التحقق من وجود الطلب
  SELECT EXISTS (
    SELECT 1 FROM online_orders WHERE id = p_order_id
  ) INTO v_found;
  
  IF NOT v_found THEN
    RAISE EXCEPTION 'الطلب غير موجود: %', p_order_id;
  END IF;
  
  -- التحقق من وجود حالة تأكيد الاتصال
  SELECT EXISTS (
    SELECT 1 FROM call_confirmation_statuses WHERE id = p_status_id
  ) INTO v_found;
  
  IF NOT v_found THEN
    RAISE EXCEPTION 'حالة تأكيد الاتصال غير موجودة: %', p_status_id;
  END IF;
  
  -- التحقق من تطابق المؤسسة بين الطلب وحالة تأكيد الاتصال
  SELECT organization_id INTO v_organization_id FROM online_orders WHERE id = p_order_id;
  SELECT organization_id INTO v_status_org_id FROM call_confirmation_statuses WHERE id = p_status_id;
  
  IF v_organization_id <> v_status_org_id THEN
    RAISE EXCEPTION 'حالة تأكيد الاتصال لا تنتمي إلى نفس المؤسسة';
  END IF;
  
  -- تحديث بيانات الطلب
  UPDATE online_orders SET
    call_confirmation_status_id = p_status_id,
    call_confirmation_notes = COALESCE(p_notes, call_confirmation_notes),
    call_confirmation_updated_at = NOW(),
    call_confirmation_updated_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql; 