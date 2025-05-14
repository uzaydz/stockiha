-- إصلاح جداول ياليدين واستعادة مزامنة البيانات
-- تاريخ الإنشاء: 2025-05-10

-- 1. إصلاح وظيفة اختبار إدخال الرسوم
CREATE OR REPLACE FUNCTION test_yalidine_fees_insert(
  p_organization_id UUID,
  p_from_wilaya_id INTEGER,
  p_to_wilaya_id INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_result TEXT;
  v_count_before INTEGER;
  v_count_after INTEGER;
BEGIN
  -- الحصول على عدد السجلات قبل الإدخال
  SELECT COUNT(*) INTO v_count_before FROM yalidine_fees
  WHERE organization_id = p_organization_id
  AND from_wilaya_id = p_from_wilaya_id 
  AND to_wilaya_id = p_to_wilaya_id;
  
  -- إزالة أي بيانات اختبار موجودة مسبقاً
  DELETE FROM yalidine_fees
  WHERE organization_id = p_organization_id
  AND from_wilaya_id = p_from_wilaya_id 
  AND to_wilaya_id = p_to_wilaya_id;
  
  -- إدخال بيانات الاختبار
  BEGIN
    INSERT INTO yalidine_fees (
      organization_id, from_wilaya_id, to_wilaya_id, commune_id,
      from_wilaya_name, to_wilaya_name, commune_name,
      express_home, express_desk, zone, 
      last_updated_at
    ) VALUES (
      p_organization_id, p_from_wilaya_id, p_to_wilaya_id, 0,
      'الجزائر', 'عنابة', 'مركز',
      1500, 1300, 2,
      CURRENT_TIMESTAMP
    );
    
    -- الحصول على عدد السجلات بعد الإدخال
    SELECT COUNT(*) INTO v_count_after FROM yalidine_fees
    WHERE organization_id = p_organization_id
    AND from_wilaya_id = p_from_wilaya_id 
    AND to_wilaya_id = p_to_wilaya_id;
    
    -- التحقق من نجاح الإدخال
    IF v_count_after > v_count_before THEN
      v_result := 'نجاح: تم إدخال سجل الاختبار بنجاح';
    ELSE
      v_result := 'فشل: سجل الاختبار غير موجود بعد الإدخال';
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    v_result := 'خطأ: ' || SQLERRM;
  END;
  
  RETURN v_result;
END;
$$;

-- 2. تحسين وظيفة تعيين الحقول
CREATE OR REPLACE FUNCTION yalidine_map_fees_fields(data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    -- نسخ البيانات الأصلية
    result := data;
    
    -- تعيين قيم الحقول البديلة بشكل متبادل
    IF data ? 'home_fee' AND (NOT data ? 'express_home' OR (data->>'express_home')::NUMERIC = 0) THEN
        result := jsonb_set(result, '{express_home}', data->'home_fee');
    ELSIF data ? 'express_home' AND (NOT data ? 'home_fee' OR (data->>'home_fee')::NUMERIC = 0) THEN
        result := jsonb_set(result, '{home_fee}', data->'express_home');
    END IF;
    
    IF data ? 'stop_desk_fee' AND (NOT data ? 'express_desk' OR (data->>'express_desk')::NUMERIC = 0) THEN
        result := jsonb_set(result, '{express_desk}', data->'stop_desk_fee');
    ELSIF data ? 'express_desk' AND (NOT data ? 'stop_desk_fee' OR (data->>'stop_desk_fee')::NUMERIC = 0) THEN
        result := jsonb_set(result, '{stop_desk_fee}', data->'express_desk');
    END IF;
    
    -- ضمان وجود قيم افتراضية للحقول المطلوبة
    IF NOT data ? 'commune_id' OR data->>'commune_id' IS NULL THEN
        result := jsonb_set(result, '{commune_id}', '0');
    END IF;
    
    -- التأكد من وجود القيم الإضافية للحقول الأخرى
    IF NOT data ? 'zone' OR data->>'zone' IS NULL THEN
        result := jsonb_set(result, '{zone}', '0');
    END IF;
    
    IF NOT data ? 'retour_fee' OR data->>'retour_fee' IS NULL THEN
        result := jsonb_set(result, '{retour_fee}', '0');
    END IF;
    
    IF NOT data ? 'cod_percentage' OR data->>'cod_percentage' IS NULL THEN
        result := jsonb_set(result, '{cod_percentage}', '0');
    END IF;
    
    IF NOT data ? 'insurance_percentage' OR data->>'insurance_percentage' IS NULL THEN
        result := jsonb_set(result, '{insurance_percentage}', '0');
    END IF;
    
    IF NOT data ? 'oversize_fee' OR data->>'oversize_fee' IS NULL THEN
        result := jsonb_set(result, '{oversize_fee}', '0');
    END IF;
    
    IF NOT data ? 'economic_home' OR data->>'economic_home' IS NULL THEN
        result := jsonb_set(result, '{economic_home}', '0');
    END IF;
    
    IF NOT data ? 'economic_desk' OR data->>'economic_desk' IS NULL THEN
        result := jsonb_set(result, '{economic_desk}', '0');
    END IF;
    
    RETURN result;
END;
$$;

-- 3. تحسين وظيفة إدخال البيانات
CREATE OR REPLACE FUNCTION rpc_simple_insert_yalidine_fees(p_data text)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_data JSONB;
  v_mapped_data JSONB;
  v_record JSONB;
BEGIN
  -- تحويل المدخلات إلى JSONB
  v_data := p_data::JSONB;
  
  -- التحقق من التنسيق
  IF jsonb_typeof(v_data) != 'array' THEN
    RAISE EXCEPTION 'يجب أن تكون البيانات مصفوفة JSON';
  END IF;
  
  -- معالجة كل سجل
  FOR v_record IN SELECT * FROM jsonb_array_elements(v_data)
  LOOP
    -- تحويل أسماء الحقول
    v_mapped_data := yalidine_map_fees_fields(v_record);
    
    BEGIN
      -- إدراج أو تحديث السجل بعد التحويل
      INSERT INTO yalidine_fees (
        organization_id, from_wilaya_id, to_wilaya_id, commune_id,
        from_wilaya_name, to_wilaya_name, commune_name,
        express_home, express_desk, economic_home, economic_desk,
        is_home_available, is_stop_desk_available,
        zone, retour_fee, cod_percentage, insurance_percentage, oversize_fee,
        home_fee, stop_desk_fee, last_updated_at
      ) VALUES (
        (v_mapped_data->>'organization_id')::UUID,
        (v_mapped_data->>'from_wilaya_id')::INTEGER,
        (v_mapped_data->>'to_wilaya_id')::INTEGER,
        COALESCE((v_mapped_data->>'commune_id')::INTEGER, 0),
        v_mapped_data->>'from_wilaya_name',
        v_mapped_data->>'to_wilaya_name',
        COALESCE(v_mapped_data->>'commune_name', ''),
        COALESCE((v_mapped_data->>'express_home')::NUMERIC, (v_mapped_data->>'home_fee')::NUMERIC, 0),
        COALESCE((v_mapped_data->>'express_desk')::NUMERIC, (v_mapped_data->>'stop_desk_fee')::NUMERIC, 0),
        COALESCE((v_mapped_data->>'economic_home')::NUMERIC, 0),
        COALESCE((v_mapped_data->>'economic_desk')::NUMERIC, 0),
        COALESCE((v_mapped_data->>'is_home_available')::BOOLEAN, TRUE),
        COALESCE((v_mapped_data->>'is_stop_desk_available')::BOOLEAN, TRUE),
        COALESCE((v_mapped_data->>'zone')::INTEGER, 0),
        COALESCE((v_mapped_data->>'retour_fee')::NUMERIC, 0),
        COALESCE((v_mapped_data->>'cod_percentage')::NUMERIC, 0),
        COALESCE((v_mapped_data->>'insurance_percentage')::NUMERIC, 0),
        COALESCE((v_mapped_data->>'oversize_fee')::NUMERIC, 0),
        COALESCE((v_mapped_data->>'home_fee')::NUMERIC, (v_mapped_data->>'express_home')::NUMERIC, 0),
        COALESCE((v_mapped_data->>'stop_desk_fee')::NUMERIC, (v_mapped_data->>'express_desk')::NUMERIC, 0),
        COALESCE(
          (v_mapped_data->>'last_updated_at')::TIMESTAMP WITH TIME ZONE,
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
      RAISE NOTICE 'فشل إدخال السجل %: %', v_count, SQLERRM;
    END;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- 4. وظيفة لحل مشكلة الفروق بين جدولي الرسوم
CREATE OR REPLACE FUNCTION fix_yalidine_tables()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- نقل أي سجلات من الجدول البديل إلى الجدول الرئيسي
    INSERT INTO yalidine_fees (
        organization_id, from_wilaya_id, to_wilaya_id, commune_id,
        from_wilaya_name, to_wilaya_name, commune_name,
        express_home, express_desk, economic_home, economic_desk,
        is_home_available, is_stop_desk_available,
        zone, retour_fee, cod_percentage, insurance_percentage, oversize_fee,
        home_fee, stop_desk_fee, last_updated_at
    )
    SELECT
        organization_id, from_wilaya_id, to_wilaya_id, COALESCE(commune_id, 0),
        from_wilaya_name, to_wilaya_name, COALESCE(commune_name, ''),
        COALESCE(express_home, 0), COALESCE(express_desk, 0),
        COALESCE(economic_home, 0), COALESCE(economic_desk, 0),
        COALESCE(is_home_available, TRUE), COALESCE(is_stop_desk_available, TRUE),
        COALESCE(zone, 0), COALESCE(retour_fee, 0),
        COALESCE(cod_percentage, 0), COALESCE(insurance_percentage, 0),
        COALESCE(oversize_fee, 0),
        COALESCE(home_fee, express_home, 0), COALESCE(stop_desk_fee, express_desk, 0),
        COALESCE(last_updated_at, CURRENT_TIMESTAMP)
    FROM yalidine_fees_new
    ON CONFLICT (organization_id, from_wilaya_id, to_wilaya_id, commune_id)
    DO UPDATE
    SET
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
        
    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- تمكين المحفز بعد إكمال عملية الإصلاح
    ALTER TABLE yalidine_fees ENABLE TRIGGER yalidine_fees_redirect_trigger;
    
    RETURN 'تم نقل ' || v_count || ' سجل من الجدول البديل. تم إكمال الإصلاح.';
END;
$$;

-- 5. وظيفة إضافية للتنظيف والإصلاح
CREATE OR REPLACE FUNCTION cleanup_duplicate_yalidine_fees()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
    v_temp_table TEXT := 'temp_yalidine_fees_' || floor(random() * 1000)::TEXT;
BEGIN
    -- إنشاء جدول مؤقت للسجلات الفريدة
    EXECUTE 'CREATE TEMP TABLE ' || v_temp_table || ' AS
    SELECT DISTINCT ON (organization_id, from_wilaya_id, to_wilaya_id, commune_id)
        id, organization_id, from_wilaya_id, to_wilaya_id, commune_id
    FROM yalidine_fees';
    
    -- حذف السجلات المكررة
    EXECUTE 'DELETE FROM yalidine_fees yf
    WHERE NOT EXISTS (
        SELECT 1 FROM ' || v_temp_table || ' t
        WHERE t.id = yf.id
    )';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- إسقاط الجدول المؤقت
    EXECUTE 'DROP TABLE ' || v_temp_table;
    
    RETURN v_count;
END;
$$;

-- 6. وظيفة للتشخيص
CREATE OR REPLACE FUNCTION diagnose_yalidine_fees()
RETURNS TABLE (
    issue TEXT,
    count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    
    -- التحقق من قيم null أو صفرية في الحقول الأساسية
    SELECT 'قيم خاطئة أو فارغة في from_wilaya_id', COUNT(*)
    FROM yalidine_fees WHERE from_wilaya_id IS NULL OR from_wilaya_id <= 0
    UNION ALL
    SELECT 'قيم خاطئة أو فارغة في to_wilaya_id', COUNT(*)
    FROM yalidine_fees WHERE to_wilaya_id IS NULL OR to_wilaya_id <= 0
    UNION ALL
    SELECT 'قيم خاطئة أو فارغة في express_home وhome_fee', COUNT(*)
    FROM yalidine_fees WHERE express_home IS NULL AND home_fee IS NULL
    UNION ALL
    SELECT 'قيم خاطئة أو فارغة في express_desk وstop_desk_fee', COUNT(*)
    FROM yalidine_fees WHERE express_desk IS NULL AND stop_desk_fee IS NULL
    UNION ALL
    
    -- التحقق من تطابق أسماء الولايات
    SELECT 'عدم تطابق في from_wilaya_name', COUNT(*)
    FROM yalidine_fees f
    LEFT JOIN yalidine_provinces_global p ON f.from_wilaya_id = p.id
    WHERE p.id IS NOT NULL AND f.from_wilaya_name != p.name_ar
    UNION ALL
    SELECT 'عدم تطابق في to_wilaya_name', COUNT(*)
    FROM yalidine_fees f
    LEFT JOIN yalidine_provinces_global p ON f.to_wilaya_id = p.id
    WHERE p.id IS NOT NULL AND f.to_wilaya_name != p.name_ar;
END;
$$;

-- 7. التنفيذ الفوري للإصلاح
SELECT fix_yalidine_tables();
SELECT cleanup_duplicate_yalidine_fees(); 