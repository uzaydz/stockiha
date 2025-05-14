-- إضافة دالة إدراج وتحديث (upsert) لجدول yalidine_fees
-- هذا الملف يضيف دالة جديدة لحل مشكلة الإدراج والتحديث للسجلات

-- إنشاء دالة جديدة للإدراج والتحديث في جدول yalidine_fees
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
    express_home = COALESCE(p_express_home, p_home_fee, express_home),
    express_desk = COALESCE(p_express_desk, p_stop_desk_fee, express_desk),
    economic_home = COALESCE(p_economic_home, economic_home),
    economic_desk = COALESCE(p_economic_desk, economic_desk),
    is_home_available = COALESCE(p_is_home_available, is_home_available),
    is_stop_desk_available = COALESCE(p_is_stop_desk_available, is_stop_desk_available),
    home_fee = COALESCE(p_home_fee, p_express_home, home_fee),
    stop_desk_fee = COALESCE(p_stop_desk_fee, p_express_desk, stop_desk_fee),
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
      home_fee, stop_desk_fee
    ) VALUES (
      p_organization_id, p_from_wilaya_id, p_to_wilaya_id, p_commune_id,
      p_from_wilaya_name, p_to_wilaya_name, p_commune_name, p_zone,
      p_retour_fee, p_cod_percentage, p_insurance_percentage, p_oversize_fee,
      p_express_home, p_express_desk, p_economic_home, p_economic_desk,
      p_is_home_available, p_is_stop_desk_available,
      p_home_fee, p_stop_desk_fee
    )
    RETURNING id INTO v_inserted_id;
  END IF;

  -- إرجاع معرف السجل
  RETURN v_inserted_id;
END;
$$ LANGUAGE plpgsql;

-- إضافة دالة لإدراج مجموعة من سجلات yalidine_fees
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

-- إضافة تعليقات على الدوال
COMMENT ON FUNCTION upsert_yalidine_fee(UUID, INTEGER, INTEGER, INTEGER, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER, FLOAT, FLOAT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN, INTEGER, INTEGER) IS 'دالة لإدراج أو تحديث سجل واحد في جدول yalidine_fees';

COMMENT ON FUNCTION batch_upsert_yalidine_fees(JSONB) IS 'دالة لإدراج أو تحديث مجموعة من السجلات في جدول yalidine_fees'; 