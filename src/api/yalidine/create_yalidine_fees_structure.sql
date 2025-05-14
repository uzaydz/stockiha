-- إنشاء هيكل جديد لتخزين أسعار التوصيل من ياليدين
-- هذا السكربت يقوم بإنشاء الوظائف اللازمة لتخزين وإدارة أسعار التوصيل

-- تأكد من وجود الحقول الإضافية في جدول yalidine_fees
DO $$ 
BEGIN
  -- إضافة حقل zone إذا لم يكن موجودًا
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yalidine_fees' AND column_name = 'zone') THEN
    ALTER TABLE yalidine_fees ADD COLUMN zone INTEGER;
  END IF;

  -- إضافة حقل retour_fee إذا لم يكن موجودًا
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yalidine_fees' AND column_name = 'retour_fee') THEN
    ALTER TABLE yalidine_fees ADD COLUMN retour_fee INTEGER;
  END IF;

  -- إضافة حقل cod_percentage إذا لم يكن موجودًا
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yalidine_fees' AND column_name = 'cod_percentage') THEN
    ALTER TABLE yalidine_fees ADD COLUMN cod_percentage DOUBLE PRECISION;
  END IF;

  -- إضافة حقل insurance_percentage إذا لم يكن موجودًا
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yalidine_fees' AND column_name = 'insurance_percentage') THEN
    ALTER TABLE yalidine_fees ADD COLUMN insurance_percentage DOUBLE PRECISION;
  END IF;

  -- إضافة حقل oversize_fee إذا لم يكن موجودًا
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yalidine_fees' AND column_name = 'oversize_fee') THEN
    ALTER TABLE yalidine_fees ADD COLUMN oversize_fee INTEGER;
  END IF;

  -- إضافة حقل express_home إذا لم يكن موجودًا
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yalidine_fees' AND column_name = 'express_home') THEN
    ALTER TABLE yalidine_fees ADD COLUMN express_home INTEGER;
  END IF;

  -- إضافة حقل express_desk إذا لم يكن موجودًا
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yalidine_fees' AND column_name = 'express_desk') THEN
    ALTER TABLE yalidine_fees ADD COLUMN express_desk INTEGER;
  END IF;

  -- إضافة حقل economic_home إذا لم يكن موجودًا
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yalidine_fees' AND column_name = 'economic_home') THEN
    ALTER TABLE yalidine_fees ADD COLUMN economic_home INTEGER;
  END IF;

  -- إضافة حقل economic_desk إذا لم يكن موجودًا
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yalidine_fees' AND column_name = 'economic_desk') THEN
    ALTER TABLE yalidine_fees ADD COLUMN economic_desk INTEGER;
  END IF;

  -- إضافة حقل last_updated_at إذا لم يكن موجودًا
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'yalidine_fees' AND column_name = 'last_updated_at') THEN
    ALTER TABLE yalidine_fees ADD COLUMN last_updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- إنشاء دالة لإدخال أسعار التوصيل بشكل فعال
CREATE OR REPLACE FUNCTION simple_insert_yalidine_fees(
  p_data JSONB,
  p_organization_id UUID
) RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
  fee_record JSONB;
BEGIN
  -- حذف السجلات القديمة للولاية المصدر
  IF jsonb_array_length(p_data) > 0 THEN
    DELETE FROM yalidine_fees
    WHERE organization_id = p_organization_id
    AND from_wilaya_id = (p_data->0->>'from_wilaya_id')::INTEGER;
  END IF;

  -- إدخال السجلات الجديدة
  FOR fee_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    INSERT INTO yalidine_fees (
      organization_id,
      from_wilaya_id,
      to_wilaya_id,
      commune_id,
      from_wilaya_name,
      to_wilaya_name,
      commune_name,
      zone,
      retour_fee,
      cod_percentage,
      insurance_percentage,
      oversize_fee,
      express_home,
      express_desk,
      economic_home,
      economic_desk,
      last_updated_at,
      is_home_available,
      is_stop_desk_available,
      home_fee,
      stop_desk_fee
    ) VALUES (
      p_organization_id,
      (fee_record->>'from_wilaya_id')::INTEGER,
      (fee_record->>'to_wilaya_id')::INTEGER,
      (fee_record->>'commune_id')::INTEGER,
      fee_record->>'from_wilaya_name',
      fee_record->>'to_wilaya_name',
      fee_record->>'commune_name',
      (fee_record->>'zone')::INTEGER,
      (fee_record->>'retour_fee')::INTEGER,
      (fee_record->>'cod_percentage')::DOUBLE PRECISION,
      (fee_record->>'insurance_percentage')::DOUBLE PRECISION,
      (fee_record->>'oversize_fee')::INTEGER,
      (fee_record->>'express_home')::INTEGER,
      (fee_record->>'express_desk')::INTEGER,
      (fee_record->>'economic_home')::INTEGER,
      (fee_record->>'economic_desk')::INTEGER,
      NOW(),
      COALESCE((fee_record->>'express_home')::INTEGER, 0) > 0,
      COALESCE((fee_record->>'express_desk')::INTEGER, 0) > 0,
      COALESCE((fee_record->>'express_home')::INTEGER, 0),
      COALESCE((fee_record->>'express_desk')::INTEGER, 0)
    )
    ON CONFLICT (organization_id, from_wilaya_id, to_wilaya_id, commune_id)
    DO UPDATE SET
      from_wilaya_name = EXCLUDED.from_wilaya_name,
      to_wilaya_name = EXCLUDED.to_wilaya_name,
      commune_name = EXCLUDED.commune_name,
      zone = EXCLUDED.zone,
      retour_fee = EXCLUDED.retour_fee,
      cod_percentage = EXCLUDED.cod_percentage,
      insurance_percentage = EXCLUDED.insurance_percentage,
      oversize_fee = EXCLUDED.oversize_fee,
      express_home = EXCLUDED.express_home,
      express_desk = EXCLUDED.express_desk,
      economic_home = EXCLUDED.economic_home,
      economic_desk = EXCLUDED.economic_desk,
      last_updated_at = NOW(),
      is_home_available = EXCLUDED.is_home_available,
      is_stop_desk_available = EXCLUDED.is_stop_desk_available,
      home_fee = EXCLUDED.home_fee,
      stop_desk_fee = EXCLUDED.stop_desk_fee;
      
    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لحساب رسوم التوصيل لطرد محدد
CREATE OR REPLACE FUNCTION calculate_yalidine_delivery_fee(
  p_organization_id UUID,
  p_from_wilaya_id INTEGER,
  p_to_wilaya_id INTEGER,
  p_commune_id INTEGER,
  p_weight DOUBLE PRECISION,
  p_dimensions JSONB, -- {length, width, height} بالسنتيمتر
  p_is_stop_desk BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
  fee_record RECORD;
  volumetric_weight DOUBLE PRECISION;
  billable_weight DOUBLE PRECISION;
  overweight_fee INTEGER := 0;
  base_fee INTEGER;
  total_fee INTEGER;
  result JSONB;
BEGIN
  -- البحث عن سجل الرسوم المناسب
  SELECT * INTO fee_record FROM yalidine_fees
  WHERE organization_id = p_organization_id
  AND from_wilaya_id = p_from_wilaya_id
  AND to_wilaya_id = p_to_wilaya_id
  AND commune_id = p_commune_id;
  
  IF fee_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'لم يتم العثور على رسوم التوصيل لهذه الوجهة'
    );
  END IF;
  
  -- حساب الوزن الحجمي
  IF p_dimensions IS NOT NULL AND 
     p_dimensions ? 'length' AND 
     p_dimensions ? 'width' AND 
     p_dimensions ? 'height' THEN
    volumetric_weight := (p_dimensions->>'length')::DOUBLE PRECISION * 
                         (p_dimensions->>'width')::DOUBLE PRECISION * 
                         (p_dimensions->>'height')::DOUBLE PRECISION * 0.0002;
  ELSE
    volumetric_weight := 0;
  END IF;
  
  -- تحديد الوزن القابل للفوترة (الأكبر بين الوزن الفعلي والوزن الحجمي)
  billable_weight := GREATEST(p_weight, volumetric_weight);
  
  -- حساب رسوم الوزن الزائد (إذا كان الوزن أكبر من 5 كجم)
  IF billable_weight > 5 AND fee_record.oversize_fee IS NOT NULL THEN
    overweight_fee := FLOOR((billable_weight - 5) * fee_record.oversize_fee);
  END IF;
  
  -- تحديد الرسوم الأساسية بناءً على نوع التوصيل
  IF p_is_stop_desk THEN
    base_fee := COALESCE(fee_record.express_desk, fee_record.stop_desk_fee, 0);
  ELSE
    base_fee := COALESCE(fee_record.express_home, fee_record.home_fee, 0);
  END IF;
  
  -- حساب الرسوم الإجمالية
  total_fee := base_fee + overweight_fee;
  
  -- إعداد النتيجة
  result := jsonb_build_object(
    'success', TRUE,
    'base_fee', base_fee,
    'overweight_fee', overweight_fee,
    'total_fee', total_fee,
    'billable_weight', billable_weight,
    'details', jsonb_build_object(
      'from_wilaya', jsonb_build_object('id', fee_record.from_wilaya_id, 'name', fee_record.from_wilaya_name),
      'to_wilaya', jsonb_build_object('id', fee_record.to_wilaya_id, 'name', fee_record.to_wilaya_name),
      'commune', jsonb_build_object('id', fee_record.commune_id, 'name', fee_record.commune_name),
      'zone', fee_record.zone,
      'retour_fee', fee_record.retour_fee,
      'cod_percentage', fee_record.cod_percentage,
      'insurance_percentage', fee_record.insurance_percentage,
      'oversize_fee_per_kg', fee_record.oversize_fee
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
