-- دالة لحذف سجلات yalidine_fees بشكل آمن
CREATE OR REPLACE FUNCTION delete_yalidine_fees_for_organization(
  p_organization_id UUID,
  p_from_wilaya_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
  deleted_rows INTEGER;
BEGIN
  -- عملية الحذف مع العد
  DELETE FROM yalidine_fees
  WHERE organization_id = p_organization_id
    AND from_wilaya_id = p_from_wilaya_id
  RETURNING COUNT(*) INTO deleted_rows;
  
  -- تأكيد العملية
  IF deleted_rows IS NULL THEN
    deleted_rows := 0;
  END IF;
  
  -- إرجاع عدد الصفوف المحذوفة
  RETURN deleted_rows;
END;
$$ LANGUAGE plpgsql; 