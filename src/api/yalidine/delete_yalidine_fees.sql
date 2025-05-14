-- حذف بيانات أسعار التوصيل القديمة
-- هذا السكربت يقوم بحذف جميع البيانات المتعلقة بأسعار التوصيل من ياليدين
-- يمكن تنفيذه على مستوى منظمة محددة أو على جميع المنظمات

-- إنشاء دالة لحذف بيانات أسعار التوصيل لمنظمة محددة
CREATE OR REPLACE FUNCTION delete_yalidine_fees_for_organization(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- حذف بيانات الأسعار
  DELETE FROM yalidine_fees
  WHERE organization_id = p_organization_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- إعادة عدد السجلات المحذوفة
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لحذف بيانات أسعار التوصيل لجميع المنظمات
CREATE OR REPLACE FUNCTION delete_all_yalidine_fees()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- حذف بيانات الأسعار
  DELETE FROM yalidine_fees;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- إعادة عدد السجلات المحذوفة
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- مثال على استخدام الدالة لمنظمة محددة:
-- SELECT delete_yalidine_fees_for_organization('00000000-0000-0000-0000-000000000000');

-- مثال على استخدام الدالة لجميع المنظمات:
-- SELECT delete_all_yalidine_fees();
