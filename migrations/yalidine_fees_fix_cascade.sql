-- إصلاح بسيط وسريع لمشكلة البيانات المحذوفة تلقائياً في جدول yalidine_fees
-- هذا الملف يقوم بإصلاح قيود المفاتيح الأجنبية ويضيف الوظائف اللازمة لمنع الحذف التلقائي

-- 1. إصلاح قيد المفتاح الأجنبي organization_id
ALTER TABLE yalidine_fees
DROP CONSTRAINT IF EXISTS yalidine_fees_organization_id_fkey,
ADD CONSTRAINT yalidine_fees_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(id) ON DELETE RESTRICT;

-- 2. إنشاء دالة لحذف السجلات بطريقة آمنة
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

-- 3. إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_org ON yalidine_fees(organization_id);
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_route ON yalidine_fees(from_wilaya_id, to_wilaya_id, organization_id);

-- 4. إضافة قيد فرادة لمنع تكرار السجلات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'yalidine_fees'::regclass AND conname = 'yalidine_fees_unique_combo'
  ) THEN
    ALTER TABLE yalidine_fees ADD CONSTRAINT yalidine_fees_unique_combo 
    UNIQUE (organization_id, from_wilaya_id, to_wilaya_id, commune_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'خطأ عند إضافة قيد الفرادة: %', SQLERRM;
END $$;

-- 5. إضافة تعليق على الجدول
COMMENT ON TABLE yalidine_fees IS 'Stores Yalidine shipping fees information. Fixed to prevent automatic deletion of records.';
COMMENT ON FUNCTION delete_yalidine_fees_for_organization(UUID, INTEGER) IS 'Safe function to delete yalidine fees for a specific organization and source wilaya'; 