-- إصلاح دالة حذف بيانات yalidine_fees
-- هذا الملف يصحح خطأ "aggregate functions are not allowed in RETURNING"

-- حذف الدالة السابقة التي تسبب الخطأ
DROP FUNCTION IF EXISTS delete_yalidine_fees_for_organization(UUID, INTEGER);

-- إنشاء نسخة محسنة من الدالة
CREATE OR REPLACE FUNCTION delete_yalidine_fees_for_organization(
  p_organization_id UUID,
  p_from_wilaya_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_rows INTEGER;
BEGIN
  -- حذف البيانات وتخزين عدد الصفوف المحذوفة في متغير
  WITH deleted AS (
    DELETE FROM yalidine_fees
    WHERE organization_id = p_organization_id
      AND from_wilaya_id = p_from_wilaya_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_rows FROM deleted;
  
  -- إذا كان المتغير فارغاً، نعيد 0
  IF v_deleted_rows IS NULL THEN
    v_deleted_rows := 0;
  END IF;
  
  -- إرجاع عدد الصفوف المحذوفة
  RETURN v_deleted_rows;
END;
$$ LANGUAGE plpgsql;

-- إضافة تعليق على الدالة المحسنة
COMMENT ON FUNCTION delete_yalidine_fees_for_organization(UUID, INTEGER) IS 'دالة آمنة لحذف سجلات yalidine_fees لمؤسسة وولاية مصدر محددة'; 