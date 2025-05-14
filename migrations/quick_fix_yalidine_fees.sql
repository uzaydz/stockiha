-- إصلاح سريع لمشكلة حذف سجلات yalidine_fees

-- تعديل قيد المفتاح الأجنبي organization_id لمنع الحذف التلقائي
ALTER TABLE yalidine_fees
DROP CONSTRAINT IF EXISTS yalidine_fees_organization_id_fkey,
ADD CONSTRAINT yalidine_fees_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(id) ON DELETE RESTRICT;

-- إضافة الأعمدة المفقودة إذا لم تكن موجودة
DO $$
BEGIN
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yalidine_fees' AND column_name = 'is_home_available') THEN
      ALTER TABLE yalidine_fees ADD COLUMN is_home_available BOOLEAN DEFAULT TRUE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'خطأ عند إضافة العمود is_home_available: %', SQLERRM;
  END;
  
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yalidine_fees' AND column_name = 'is_stop_desk_available') THEN
      ALTER TABLE yalidine_fees ADD COLUMN is_stop_desk_available BOOLEAN DEFAULT TRUE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'خطأ عند إضافة العمود is_stop_desk_available: %', SQLERRM;
  END;
END $$;

-- إنشاء الدالة لمزامنة الأعمدة
CREATE OR REPLACE FUNCTION sync_yalidine_fees_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- مزامنة express_home و home_fee
  IF NEW.express_home IS NOT NULL AND NEW.home_fee IS DISTINCT FROM NEW.express_home THEN
    NEW.home_fee := NEW.express_home;
  ELSIF NEW.home_fee IS NOT NULL AND NEW.express_home IS DISTINCT FROM NEW.home_fee THEN
    NEW.express_home := NEW.home_fee;
  END IF;

  -- مزامنة express_desk و stop_desk_fee
  IF NEW.express_desk IS NOT NULL AND NEW.stop_desk_fee IS DISTINCT FROM NEW.express_desk THEN
    NEW.stop_desk_fee := NEW.express_desk;
  ELSIF NEW.stop_desk_fee IS NOT NULL AND NEW.express_desk IS DISTINCT FROM NEW.stop_desk_fee THEN
    NEW.express_desk := NEW.stop_desk_fee;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء أو إعادة بناء الترغر للجدول
DROP TRIGGER IF EXISTS sync_yalidine_fees_columns_trigger ON yalidine_fees;

CREATE TRIGGER sync_yalidine_fees_columns_trigger
BEFORE INSERT OR UPDATE ON yalidine_fees
FOR EACH ROW EXECUTE FUNCTION sync_yalidine_fees_columns();

-- إضافة تعليق على الجدول
COMMENT ON TABLE yalidine_fees IS 'Stores Yalidine shipping fees information. Fixed to prevent automatic deletion of records.';

-- حذف وإعادة إنشاء المؤشرات لتحسين الأداء
DROP INDEX IF EXISTS idx_yalidine_fees_org;
DROP INDEX IF EXISTS idx_yalidine_fees_route;
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_org ON yalidine_fees(organization_id);
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_route ON yalidine_fees(from_wilaya_id, to_wilaya_id, organization_id);

-- تحسين قيود الجدول
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

-- إنشاء دالة لفحص صحة البيانات
CREATE OR REPLACE FUNCTION check_yalidine_fees()
RETURNS TABLE (
  total_records BIGINT,
  inserts BIGINT,
  deletes BIGINT,
  health_status TEXT
) AS $$
DECLARE
  v_inserts BIGINT;
  v_deletes BIGINT;
  v_total BIGINT;
  v_status TEXT;
BEGIN
  -- جمع الإحصائيات
  SELECT 
    pg_stat_get_tuples_inserted('yalidine_fees'::regclass),
    pg_stat_get_tuples_deleted('yalidine_fees'::regclass),
    COUNT(*)
  INTO 
    v_inserts, v_deletes, v_total
  FROM yalidine_fees;
  
  -- تحديد حالة صحة البيانات
  IF v_total > 0 THEN
    v_status := 'جيد - يوجد بيانات في الجدول';
  ELSIF v_inserts > 0 AND v_total = 0 THEN
    v_status := 'سيء - تم إدخال سجلات ولكن تم حذفها جميعاً';
  ELSE
    v_status := 'غير معروف - لم يتم إدخال أي سجلات بعد';
  END IF;
  
  -- إرجاع النتائج
  RETURN QUERY
  SELECT 
    v_total,
    v_inserts,
    v_deletes,
    v_status;
END;
$$ LANGUAGE plpgsql; 