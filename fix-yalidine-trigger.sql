-- حل مشكلة مزامنة رسوم شحن ياليدين
-- تعطيل المحفز الذي يقوم بتحويل البيانات

-- 1. تعطيل المحفز
DO $$
BEGIN
  -- التحقق من وجود المحفز
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'yalidine_fees'
    AND t.tgname = 'yalidine_fees_redirect_trigger'
  ) THEN
    -- تعطيل المحفز إذا كان موجوداً
    ALTER TABLE yalidine_fees DISABLE TRIGGER yalidine_fees_redirect_trigger;
    RAISE NOTICE 'تم تعطيل المحفز yalidine_fees_redirect_trigger';
  ELSE
    RAISE NOTICE 'المحفز yalidine_fees_redirect_trigger غير موجود';
  END IF;
END $$;

-- 2. التحقق من حالة البيانات
DO $$
DECLARE
  v_inserts_original BIGINT;
  v_deletes_original BIGINT;
  v_inserts_new BIGINT;
  v_deletes_new BIGINT;
  v_count_original BIGINT;
  v_count_new BIGINT;
BEGIN
  -- الحصول على إحصائيات العمليات
  SELECT 
    pg_stat_get_tuples_inserted('yalidine_fees'::regclass),
    pg_stat_get_tuples_deleted('yalidine_fees'::regclass)
  INTO 
    v_inserts_original, v_deletes_original;
    
  -- التحقق مما إذا كان الجدول الجديد موجوداً
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'yalidine_fees_new'
  ) THEN
    SELECT 
      pg_stat_get_tuples_inserted('yalidine_fees_new'::regclass),
      pg_stat_get_tuples_deleted('yalidine_fees_new'::regclass)
    INTO 
      v_inserts_new, v_deletes_new;
  ELSE
    v_inserts_new := 0;
    v_deletes_new := 0;
  END IF;
  
  -- الحصول على عدد السجلات الحالية
  EXECUTE 'SELECT COUNT(*) FROM yalidine_fees' INTO v_count_original;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'yalidine_fees_new'
  ) THEN
    EXECUTE 'SELECT COUNT(*) FROM yalidine_fees_new' INTO v_count_new;
  ELSE
    v_count_new := 0;
  END IF;
    
  -- عرض الإحصائيات
  RAISE NOTICE 'إحصائيات الجداول:';
  RAISE NOTICE 'yalidine_fees: تم إدخال % سجل، تم حذف % سجل، يوجد حالياً % سجل', 
    v_inserts_original, v_deletes_original, v_count_original;
  RAISE NOTICE 'yalidine_fees_new: تم إدخال % سجل، تم حذف % سجل، يوجد حالياً % سجل', 
    v_inserts_new, v_deletes_new, v_count_new;
END $$;

-- 3. تحسين دالة الحذف
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

-- 4. إنشاء دالة بسيطة لإدخال بيانات الرسوم
CREATE OR REPLACE FUNCTION rpc_simple_insert_yalidine_fees(p_data TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_data JSONB;
  v_record JSONB;
BEGIN
  -- تحويل البيانات من نص JSON إلى JSONB
  v_data := p_data::JSONB;
  
  -- التحقق من البيانات
  IF jsonb_typeof(v_data) != 'array' THEN
    RAISE EXCEPTION 'البيانات يجب أن تكون مصفوفة JSON';
  END IF;
  
  -- إدخال كل سجل
  FOR v_record IN SELECT * FROM jsonb_array_elements(v_data)
  LOOP
    -- إدخال السجل في الجدول
    INSERT INTO yalidine_fees (
      organization_id, from_wilaya_id, to_wilaya_id, commune_id,
      from_wilaya_name, to_wilaya_name, commune_name,
      express_home, express_desk, economic_home, economic_desk,
      is_home_available, is_stop_desk_available,
      zone, retour_fee, cod_percentage, insurance_percentage, oversize_fee,
      home_fee, stop_desk_fee, last_updated_at
    ) VALUES (
      (v_record->>'organization_id')::UUID,
      (v_record->>'from_wilaya_id')::INTEGER,
      (v_record->>'to_wilaya_id')::INTEGER,
      (v_record->>'commune_id')::INTEGER,
      v_record->>'from_wilaya_name',
      v_record->>'to_wilaya_name',
      v_record->>'commune_name',
      (v_record->>'express_home')::NUMERIC,
      (v_record->>'express_desk')::NUMERIC,
      (v_record->>'economic_home')::NUMERIC,
      (v_record->>'economic_desk')::NUMERIC,
      COALESCE((v_record->>'is_home_available')::BOOLEAN, TRUE),
      COALESCE((v_record->>'is_stop_desk_available')::BOOLEAN, TRUE),
      (v_record->>'zone')::INTEGER,
      (v_record->>'retour_fee')::NUMERIC,
      (v_record->>'cod_percentage')::NUMERIC,
      (v_record->>'insurance_percentage')::NUMERIC,
      (v_record->>'oversize_fee')::NUMERIC,
      (v_record->>'home_fee')::NUMERIC,
      (v_record->>'stop_desk_fee')::NUMERIC,
      COALESCE(
        (v_record->>'last_updated_at')::TIMESTAMP WITH TIME ZONE,
        CURRENT_TIMESTAMP
      )
    )
    ON CONFLICT (organization_id, from_wilaya_id, to_wilaya_id, commune_id) 
    DO UPDATE SET
      from_wilaya_name = EXCLUDED.from_wilaya_name,
      to_wilaya_name = EXCLUDED.to_wilaya_name,
      commune_name = EXCLUDED.commune_name,
      express_home = EXCLUDED.express_home,
      express_desk = EXCLUDED.express_desk,
      economic_home = EXCLUDED.economic_home,
      economic_desk = EXCLUDED.economic_desk,
      is_home_available = EXCLUDED.is_home_available,
      is_stop_desk_available = EXCLUDED.is_stop_desk_available,
      zone = EXCLUDED.zone,
      retour_fee = EXCLUDED.retour_fee,
      cod_percentage = EXCLUDED.cod_percentage,
      insurance_percentage = EXCLUDED.insurance_percentage,
      oversize_fee = EXCLUDED.oversize_fee,
      home_fee = EXCLUDED.home_fee,
      stop_desk_fee = EXCLUDED.stop_desk_fee,
      last_updated_at = EXCLUDED.last_updated_at;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql; 