-- الحل النهائي لمشكلة yalidine_fees
-- هذا الملف يجمع جميع الإصلاحات المطلوبة في ملف واحد متكامل

-----------------------------------------
-- 1. إصلاح قيود المفاتيح الأجنبية
-----------------------------------------

-- إصلاح قيد المفتاح الأجنبي organization_id
ALTER TABLE yalidine_fees
DROP CONSTRAINT IF EXISTS yalidine_fees_organization_id_fkey,
ADD CONSTRAINT yalidine_fees_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(id) ON DELETE RESTRICT;

-- إصلاح قيود الفهارس والفرادة
DROP INDEX IF EXISTS idx_yalidine_fees_org;
DROP INDEX IF EXISTS idx_yalidine_fees_route;
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_org ON yalidine_fees(organization_id);
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_route ON yalidine_fees(from_wilaya_id, to_wilaya_id, organization_id);

-- إضافة قيد الفرادة
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

-----------------------------------------
-- 2. دالة حذف البيانات القديمة
-----------------------------------------

-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS delete_yalidine_fees_for_organization(UUID, INTEGER);

-- إنشاء دالة محسنة للحذف
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

-----------------------------------------
-- 3. دوال الإدراج والتحديث
-----------------------------------------

-- دالة إدراج أو تحديث سجل واحد
CREATE OR REPLACE FUNCTION upsert_yalidine_fee(
  p_organization_id UUID,
  p_from_wilaya_id INTEGER,
  p_to_wilaya_id INTEGER,
  p_commune_id INTEGER,
  p_from_wilaya_name VARCHAR DEFAULT NULL,
  p_to_wilaya_name VARCHAR DEFAULT NULL,
  p_commune_name VARCHAR DEFAULT NULL,
  p_zone INTEGER DEFAULT NULL,
  p_retour_fee INTEGER DEFAULT NULL,
  p_cod_percentage FLOAT DEFAULT NULL,
  p_insurance_percentage FLOAT DEFAULT NULL,
  p_oversize_fee INTEGER DEFAULT NULL,
  p_express_home INTEGER DEFAULT NULL,
  p_express_desk INTEGER DEFAULT NULL,
  p_economic_home INTEGER DEFAULT NULL,
  p_economic_desk INTEGER DEFAULT NULL,
  p_is_home_available BOOLEAN DEFAULT TRUE,
  p_is_stop_desk_available BOOLEAN DEFAULT TRUE,
  p_home_fee INTEGER DEFAULT NULL,
  p_stop_desk_fee INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_inserted_id INTEGER;
BEGIN
  -- مزامنة القيم بين الحقول المتشابهة
  p_home_fee := COALESCE(p_home_fee, p_express_home);
  p_express_home := COALESCE(p_express_home, p_home_fee);
  p_stop_desk_fee := COALESCE(p_stop_desk_fee, p_express_desk);
  p_express_desk := COALESCE(p_express_desk, p_stop_desk_fee);

  -- محاولة تحديث السجل إذا كان موجوداً
  UPDATE yalidine_fees
  SET 
    from_wilaya_name = COALESCE(p_from_wilaya_name, from_wilaya_name),
    to_wilaya_name = COALESCE(p_to_wilaya_name, to_wilaya_name),
    commune_name = COALESCE(p_commune_name, commune_name),
    zone = COALESCE(p_zone, zone),
    retour_fee = COALESCE(p_retour_fee, retour_fee),
    cod_percentage = COALESCE(p_cod_percentage, cod_percentage),
    insurance_percentage = COALESCE(p_insurance_percentage, insurance_percentage),
    oversize_fee = COALESCE(p_oversize_fee, oversize_fee),
    express_home = COALESCE(p_express_home, express_home),
    express_desk = COALESCE(p_express_desk, express_desk),
    economic_home = COALESCE(p_economic_home, economic_home),
    economic_desk = COALESCE(p_economic_desk, economic_desk),
    is_home_available = COALESCE(p_is_home_available, is_home_available),
    is_stop_desk_available = COALESCE(p_is_stop_desk_available, is_stop_desk_available),
    home_fee = COALESCE(p_home_fee, home_fee),
    stop_desk_fee = COALESCE(p_stop_desk_fee, stop_desk_fee),
    last_updated_at = CURRENT_TIMESTAMP
  WHERE 
    organization_id = p_organization_id AND
    from_wilaya_id = p_from_wilaya_id AND
    to_wilaya_id = p_to_wilaya_id AND
    commune_id = p_commune_id
  RETURNING id INTO v_inserted_id;

  -- إذا لم يتم تحديث أي سجل، يتم إدراج سجل جديد
  IF v_inserted_id IS NULL THEN
    INSERT INTO yalidine_fees (
      organization_id, from_wilaya_id, to_wilaya_id, commune_id,
      from_wilaya_name, to_wilaya_name, commune_name, zone,
      retour_fee, cod_percentage, insurance_percentage, oversize_fee,
      express_home, express_desk, economic_home, economic_desk,
      is_home_available, is_stop_desk_available,
      home_fee, stop_desk_fee, last_updated_at
    ) VALUES (
      p_organization_id, p_from_wilaya_id, p_to_wilaya_id, p_commune_id,
      p_from_wilaya_name, p_to_wilaya_name, p_commune_name, p_zone,
      p_retour_fee, p_cod_percentage, p_insurance_percentage, p_oversize_fee,
      p_express_home, p_express_desk, p_economic_home, p_economic_desk,
      p_is_home_available, p_is_stop_desk_available,
      p_home_fee, p_stop_desk_fee, CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_inserted_id;
  END IF;

  -- إرجاع معرف السجل
  RETURN v_inserted_id;
END;
$$ LANGUAGE plpgsql;

-- دالة إدراج أو تحديث مجموعة من السجلات
CREATE OR REPLACE FUNCTION batch_upsert_yalidine_fees(
  p_data JSONB
) RETURNS INTEGER AS $$
DECLARE
  v_record JSONB;
  v_count INTEGER := 0;
BEGIN
  -- معالجة كل سجل في المصفوفة
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    PERFORM upsert_yalidine_fee(
      (v_record->>'organization_id')::UUID,
      (v_record->>'from_wilaya_id')::INTEGER,
      (v_record->>'to_wilaya_id')::INTEGER,
      (v_record->>'commune_id')::INTEGER,
      v_record->>'from_wilaya_name',
      v_record->>'to_wilaya_name',
      v_record->>'commune_name',
      (v_record->>'zone')::INTEGER,
      (v_record->>'retour_fee')::INTEGER,
      (v_record->>'cod_percentage')::FLOAT,
      (v_record->>'insurance_percentage')::FLOAT,
      (v_record->>'oversize_fee')::INTEGER,
      (v_record->>'express_home')::INTEGER,
      (v_record->>'express_desk')::INTEGER,
      (v_record->>'economic_home')::INTEGER,
      (v_record->>'economic_desk')::INTEGER,
      (v_record->>'is_home_available')::BOOLEAN,
      (v_record->>'is_stop_desk_available')::BOOLEAN,
      (v_record->>'home_fee')::INTEGER,
      (v_record->>'stop_desk_fee')::INTEGER
    );
    v_count := v_count + 1;
  END LOOP;

  -- إرجاع عدد السجلات التي تمت معالجتها
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------
-- 4. دالة للتحقق من صحة البيانات
-----------------------------------------

-- دالة للتحقق من صحة البيانات
CREATE OR REPLACE FUNCTION check_yalidine_fees_health(
  p_organization_id UUID DEFAULT NULL
)
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
  v_query TEXT;
BEGIN
  -- جمع الإحصائيات
  SELECT 
    pg_stat_get_tuples_inserted('yalidine_fees'::regclass),
    pg_stat_get_tuples_deleted('yalidine_fees'::regclass)
  INTO 
    v_inserts, v_deletes;
  
  -- عدد السجلات في الجدول (مع فلترة حسب المؤسسة إذا تم تحديدها)
  IF p_organization_id IS NOT NULL THEN
    v_query := 'SELECT COUNT(*) FROM yalidine_fees WHERE organization_id = $1';
    EXECUTE v_query INTO v_total USING p_organization_id;
  ELSE
    v_query := 'SELECT COUNT(*) FROM yalidine_fees';
    EXECUTE v_query INTO v_total;
  END IF;
  
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

-----------------------------------------
-- 5. ترغر لمزامنة الحقول
-----------------------------------------

-- دالة مزامنة الحقول المتشابهة
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

-- إنشاء ترغر لمزامنة الحقول
DROP TRIGGER IF EXISTS sync_yalidine_fees_columns_trigger ON yalidine_fees;

CREATE TRIGGER sync_yalidine_fees_columns_trigger
BEFORE INSERT OR UPDATE ON yalidine_fees
FOR EACH ROW EXECUTE FUNCTION sync_yalidine_fees_columns();

-----------------------------------------
-- 6. إضافة تعليقات وتوثيق
-----------------------------------------

-- إضافة تعليقات على الدوال والجدول
COMMENT ON TABLE yalidine_fees IS 'جدول رسوم ياليدين الذي تم إصلاحه لمنع الحذف التلقائي للسجلات';
COMMENT ON FUNCTION delete_yalidine_fees_for_organization(UUID, INTEGER) IS 'دالة آمنة لحذف سجلات yalidine_fees لمؤسسة وولاية مصدر محددة';
COMMENT ON FUNCTION upsert_yalidine_fee(UUID, INTEGER, INTEGER, INTEGER, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER, FLOAT, FLOAT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN, INTEGER, INTEGER) IS 'دالة لإدراج أو تحديث سجل واحد في جدول yalidine_fees';
COMMENT ON FUNCTION batch_upsert_yalidine_fees(JSONB) IS 'دالة لإدراج أو تحديث مجموعة من السجلات في جدول yalidine_fees';
COMMENT ON FUNCTION check_yalidine_fees_health(UUID) IS 'دالة للتحقق من صحة البيانات في جدول yalidine_fees';
COMMENT ON FUNCTION sync_yalidine_fees_columns() IS 'دالة لمزامنة الحقول المتشابهة في جدول yalidine_fees'; 