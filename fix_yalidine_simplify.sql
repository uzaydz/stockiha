-- إصلاح جذري لمشكلة جداول أسعار ياليدين
-- تاريخ الإنشاء: 2025-05-10

-- 1. تعطيل المحفز الذي يسبب المشكلة
ALTER TABLE yalidine_fees DISABLE TRIGGER yalidine_fees_redirect_trigger;

-- 2. حذف الوظائف المعقدة المتعلقة بإدخال بيانات الرسوم
DROP FUNCTION IF EXISTS rpc_simple_insert_yalidine_fees(text);
DROP FUNCTION IF EXISTS rpc_simple_insert_yalidine_fees(jsonb);
DROP FUNCTION IF EXISTS yalidine_map_fees_fields(jsonb);
DROP FUNCTION IF EXISTS test_yalidine_fees_insert(uuid, integer, integer);
DROP FUNCTION IF EXISTS test_yalidine_fees_insert();
DROP FUNCTION IF EXISTS fix_yalidine_tables();
DROP FUNCTION IF EXISTS diagnose_yalidine_fees();
DROP FUNCTION IF EXISTS cleanup_duplicate_yalidine_fees();

-- 3. إنشاء وظيفة بسيطة وواضحة لإدخال بيانات الأسعار
CREATE OR REPLACE FUNCTION simple_insert_yalidine_fees(
  p_data jsonb,
  p_organization_id uuid
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_record jsonb;
BEGIN
  -- فحص صحة المدخلات
  IF jsonb_typeof(p_data) != 'array' THEN
    RAISE EXCEPTION 'يجب أن تكون البيانات مصفوفة JSON';
  END IF;
  
  -- معالجة كل سجل
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      -- إدراج السجل مع معالجة أسماء الحقول المختلفة
      INSERT INTO yalidine_fees (
        organization_id,
        from_wilaya_id,
        to_wilaya_id,
        commune_id,
        from_wilaya_name,
        to_wilaya_name,
        commune_name,
        express_home,
        express_desk,
        economic_home,
        economic_desk,
        is_home_available,
        is_stop_desk_available,
        home_fee,
        stop_desk_fee,
        zone,
        retour_fee,
        cod_percentage,
        insurance_percentage,
        oversize_fee,
        last_updated_at
      ) VALUES (
        p_organization_id,
        (v_record->>'wilaya_id')::INTEGER,
        (v_record->>'to_wilaya_id')::INTEGER,
        COALESCE((v_record->>'commune_id')::INTEGER, 0),
        v_record->>'from_wilaya_name',
        COALESCE(v_record->>'wilaya_name', v_record->>'to_wilaya_name'),
        COALESCE(v_record->>'commune_name', ''),
        COALESCE((v_record->>'home_fee')::INTEGER, (v_record->>'express_home')::INTEGER, 0),
        COALESCE((v_record->>'stop_desk_fee')::INTEGER, (v_record->>'express_desk')::INTEGER, 0),
        COALESCE((v_record->>'economic_home')::INTEGER, 0),
        COALESCE((v_record->>'economic_desk')::INTEGER, 0),
        COALESCE((v_record->>'is_home_available')::BOOLEAN, TRUE),
        COALESCE((v_record->>'is_stop_desk_available')::BOOLEAN, TRUE),
        COALESCE((v_record->>'home_fee')::INTEGER, (v_record->>'express_home')::INTEGER, 0),
        COALESCE((v_record->>'stop_desk_fee')::INTEGER, (v_record->>'express_desk')::INTEGER, 0),
        COALESCE((v_record->>'zone')::INTEGER, 0),
        COALESCE((v_record->>'retour_fee')::INTEGER, 0),
        COALESCE((v_record->>'cod_percentage')::NUMERIC, 0),
        COALESCE((v_record->>'insurance_percentage')::NUMERIC, 0),
        COALESCE((v_record->>'oversize_fee')::INTEGER, 0),
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
    EXCEPTION WHEN OTHERS THEN 
      RAISE NOTICE 'فشل إدخال السجل: %', SQLERRM;
    END;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- وظيفة بديلة تقبل نص JSON
CREATE OR REPLACE FUNCTION simple_insert_yalidine_fees(
  p_data text,
  p_organization_id uuid
)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN simple_insert_yalidine_fees(p_data::jsonb, p_organization_id);
END;
$$;

-- 4. تنظيف البيانات في جدول yalidine_fees (لا يحذف الجدول، فقط البيانات)
TRUNCATE TABLE yalidine_fees;

-- 5. حذف الجدول الزائد إذا كان مطلوباً (يمكن تعليق هذا السطر إذا كنت تريد الاحتفاظ بالجدول)
-- DROP TABLE yalidine_fees_new;

-- 6. إنشاء وظيفة لفحص حالة الجدول بعد الإصلاح
CREATE OR REPLACE FUNCTION check_yalidine_fees_status(p_organization_id uuid)
RETURNS TABLE (
  table_name text,
  record_count integer,
  status text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'yalidine_fees'::text as table_name,
    COUNT(*)::integer as record_count,
    'نشط'::text as status
  FROM yalidine_fees
  WHERE organization_id = p_organization_id;
  
  RETURN;
END;
$$; 