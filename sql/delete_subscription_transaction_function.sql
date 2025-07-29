-- دالة حذف معاملة اشتراك
CREATE OR REPLACE FUNCTION delete_subscription_transaction(
  p_transaction_id UUID
) RETURNS JSON AS $$
DECLARE
  v_organization_id TEXT;
  v_transaction_exists BOOLEAN;
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
  
  -- التحقق من نجاح الحذف
  IF NOT FOUND THEN
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