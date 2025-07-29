-- حذف جميع إصدارات الدالة القديمة
DROP FUNCTION IF EXISTS delete_subscription_transaction(TEXT);
DROP FUNCTION IF EXISTS delete_subscription_transaction(UUID);

-- إنشاء الدالة الجديدة مع نوع البيانات الصحيح
CREATE OR REPLACE FUNCTION delete_subscription_transaction(
  p_transaction_id UUID
) RETURNS JSON AS $$
DECLARE
  v_organization_id TEXT;
  v_rows_affected INTEGER;
BEGIN
  -- التحقق من وجود المعاملة
  SELECT organization_id INTO v_organization_id
  FROM subscription_transactions 
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'معاملة الاشتراك غير موجودة'
    );
  END IF;
  
  -- حذف المعاملة
  DELETE FROM subscription_transactions 
  WHERE id = p_transaction_id;
  
  -- التحقق من عدد الصفوف المحذوفة
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  IF v_rows_affected = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'فشل في حذف معاملة الاشتراك'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم حذف معاملة الاشتراك بنجاح'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'خطأ في حذف معاملة الاشتراك: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 