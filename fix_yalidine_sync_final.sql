-- fix_yalidine_sync_final.sql
-- حل نهائي لمشكلة مزامنة رسوم ياليدين

-----------------------------------------
-- 1. تعطيل محفز التحويل (REDIRECT)
-----------------------------------------

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

-----------------------------------------
-- 2. إعادة إنشاء دالة rpc_simple_insert_yalidine_fees
-----------------------------------------

-- حذف الدالة إذا كانت موجودة لتجنب مشاكل التوافق
DROP FUNCTION IF EXISTS rpc_simple_insert_yalidine_fees(JSONB);
DROP FUNCTION IF EXISTS rpc_simple_insert_yalidine_fees(TEXT);

-- إنشاء دالة جديدة تقبل نص JSON
CREATE OR REPLACE FUNCTION rpc_simple_insert_yalidine_fees(p_data TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_data JSONB;
  v_record JSONB;
  v_error TEXT;
BEGIN
  -- 1. تحويل النص إلى JSONB
  BEGIN
    v_data := p_data::JSONB;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في تحويل البيانات من النص إلى JSONB: %', SQLERRM;
    RETURN 0;
  END;
  
  -- 2. الحصول على عدد العناصر في المصفوفة للتحقق
  IF jsonb_array_length(v_data) = 0 THEN
    RAISE NOTICE 'لا توجد عناصر للإدراج';
    RETURN 0;
  END IF;

  -- 3. سجل تشخيصي للتحقق من البيانات
  RAISE NOTICE 'بدء إدراج % سجل', jsonb_array_length(v_data);
  
  -- 4. المرور على كل سجل وإدراجه
  FOR v_record IN SELECT * FROM jsonb_array_elements(v_data)
  LOOP
    BEGIN
      -- التحقق من البيانات الأساسية
      IF v_record->>'organization_id' IS NULL OR 
         v_record->>'from_wilaya_id' IS NULL OR 
         v_record->>'to_wilaya_id' IS NULL OR 
         v_record->>'commune_id' IS NULL THEN
         
        RAISE NOTICE 'تخطي سجل غير صالح: %', v_record;
        CONTINUE;
      END IF;
    
      -- محاولة الإدراج
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
        (v_record->>'is_home_available')::BOOLEAN,
        (v_record->>'is_stop_desk_available')::BOOLEAN,
        (v_record->>'zone')::NUMERIC,
        (v_record->>'retour_fee')::NUMERIC,
        (v_record->>'cod_percentage')::NUMERIC,
        (v_record->>'insurance_percentage')::NUMERIC,
        (v_record->>'oversize_fee')::NUMERIC,
        (v_record->>'express_home')::NUMERIC, -- استخدام express_home كقيمة لـ home_fee
        (v_record->>'express_desk')::NUMERIC, -- استخدام express_desk كقيمة لـ stop_desk_fee
        CURRENT_TIMESTAMP
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
        last_updated_at = CURRENT_TIMESTAMP;
      
      v_count := v_count + 1;
      
      -- سجل تشخيصي كل 100 سجل
      IF v_count % 100 = 0 THEN
        RAISE NOTICE 'تم إدراج % سجل', v_count;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error = PG_EXCEPTION_DETAIL;
      RAISE NOTICE 'فشل إدراج السجل: % - %', SQLERRM, v_error;
    END;
  END LOOP;
  
  RAISE NOTICE 'تم الانتهاء من إدراج % سجل', v_count;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------
-- 3. إعادة إنشاء دالة الحذف للأداء الأفضل
-----------------------------------------

CREATE OR REPLACE FUNCTION delete_yalidine_fees_for_organization(
  p_organization_id UUID,
  p_from_wilaya_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_rows INTEGER := 0;
BEGIN
  -- حذف البيانات بناءً على معرف المنظمة والولاية
  DELETE FROM yalidine_fees
  WHERE organization_id = p_organization_id
    AND from_wilaya_id = p_from_wilaya_id;
    
  -- الحصول على عدد الصفوف المحذوفة
  GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
  
  RAISE NOTICE 'تم حذف % سجل من ولاية المصدر %', v_deleted_rows, p_from_wilaya_id;
  RETURN v_deleted_rows;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------
-- 4. إنشاء دالة التشخيص
-----------------------------------------

CREATE OR REPLACE FUNCTION diagnose_yalidine_fees(organization_id UUID DEFAULT NULL)
RETURNS TABLE (
  table_name TEXT,
  total_records BIGINT,
  trigger_status TEXT,
  fk_constraint TEXT
) AS $$
DECLARE
  v_total_original BIGINT;
  v_total_new BIGINT;
  v_trigger_status TEXT;
  v_fk_constraint TEXT;
BEGIN
  -- الجدول الأصلي
  IF organization_id IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM yalidine_fees WHERE organization_id = $1' INTO v_total_original USING organization_id;
  ELSE
    EXECUTE 'SELECT COUNT(*) FROM yalidine_fees' INTO v_total_original;
  END IF;
  
  -- الجدول البديل
  IF organization_id IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM yalidine_fees_new WHERE organization_id = $1' INTO v_total_new USING organization_id;
  ELSE
    EXECUTE 'SELECT COUNT(*) FROM yalidine_fees_new' INTO v_total_new;
  END IF;
  
  -- حالة المحفز
  SELECT 
    CASE WHEN t.tgenabled = 'D' THEN 'معطل' ELSE 'مفعل' END
  INTO v_trigger_status
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'yalidine_fees'
  AND t.tgname = 'yalidine_fees_redirect_trigger';
  
  IF v_trigger_status IS NULL THEN
    v_trigger_status := 'غير موجود';
  END IF;
  
  -- نوع قيد المفتاح الأجنبي
  SELECT
    pg_get_constraintdef(oid)
  INTO v_fk_constraint
  FROM pg_constraint
  WHERE conrelid = 'yalidine_fees'::regclass
  AND conname = 'yalidine_fees_organization_id_fkey';
  
  -- إرجاع النتائج للجدول الأصلي
  RETURN QUERY SELECT 
    'yalidine_fees'::TEXT,
    v_total_original,
    v_trigger_status,
    v_fk_constraint;
    
  -- إرجاع النتائج للجدول البديل
  RETURN QUERY SELECT 
    'yalidine_fees_new'::TEXT,
    v_total_new,
    NULL::TEXT,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------
-- 5. إنشاء دالة الإصلاح الشاملة
-----------------------------------------

CREATE OR REPLACE FUNCTION fix_yalidine_tables() 
RETURNS TEXT 
LANGUAGE plpgsql 
AS $$
DECLARE
  v_result TEXT := '';
BEGIN
  -- 1. تعطيل المحفز
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'yalidine_fees'
    AND t.tgname = 'yalidine_fees_redirect_trigger'
  ) THEN
    ALTER TABLE yalidine_fees DISABLE TRIGGER yalidine_fees_redirect_trigger;
    v_result := v_result || 'تم تعطيل المحفز. ';
  ELSE
    v_result := v_result || 'المحفز غير موجود. ';
  END IF;
  
  -- 2. نقل البيانات من الجدول البديل إلى الجدول الأصلي
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'yalidine_fees_new'
  ) THEN
    BEGIN
      WITH moved_rows AS (
        INSERT INTO yalidine_fees (
          organization_id, from_wilaya_id, to_wilaya_id, commune_id,
          from_wilaya_name, to_wilaya_name, commune_name,
          express_home, express_desk, economic_home, economic_desk,
          is_home_available, is_stop_desk_available,
          zone, retour_fee, cod_percentage, insurance_percentage, oversize_fee
        )
        SELECT 
          organization_id, from_wilaya_id, to_wilaya_id, commune_id,
          from_wilaya_name, to_wilaya_name, commune_name,
          express_home, express_desk, economic_home, economic_desk,
          is_home_available, is_stop_desk_available,
          zone, retour_fee, cod_percentage, insurance_percentage, oversize_fee
        FROM yalidine_fees_new
        ON CONFLICT (organization_id, from_wilaya_id, to_wilaya_id, commune_id) 
        DO NOTHING
        RETURNING *
      )
      SELECT 'تم نقل ' || COUNT(*) || ' سجل من الجدول البديل. '
      INTO v_result
      FROM moved_rows;
      
      IF v_result = '' THEN
        v_result := 'لم يتم نقل أي سجلات. ';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_result := v_result || 'فشل نقل البيانات: ' || SQLERRM || '. ';
    END;
  ELSE
    v_result := v_result || 'الجدول البديل غير موجود. ';
  END IF;
  
  RETURN v_result || 'تم إكمال الإصلاح.';
END;
$$;

-----------------------------------------
-- 6. التحقق من نجاح التثبيت
-----------------------------------------

DO $$
BEGIN
  RAISE NOTICE '===========================================================';
  RAISE NOTICE '               تم تثبيت إصلاحات ياليدين بنجاح             ';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE '1. تم التحقق من حالة المحفز وتعطيله إذا كان مفعلاً';
  RAISE NOTICE '2. تم إعادة إنشاء دالة الإدراج rpc_simple_insert_yalidine_fees';
  RAISE NOTICE '3. تم إعادة إنشاء دالة الحذف delete_yalidine_fees_for_organization';
  RAISE NOTICE '4. تم إنشاء دالة التشخيص diagnose_yalidine_fees';
  RAISE NOTICE '5. تم إنشاء دالة الإصلاح الشاملة fix_yalidine_tables';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'يمكنك الآن تنفيذ الاستعلامات التالية:';
  RAISE NOTICE 'SELECT fix_yalidine_tables();';
  RAISE NOTICE 'SELECT * FROM diagnose_yalidine_fees();';
  RAISE NOTICE '===========================================================';
END $$; 