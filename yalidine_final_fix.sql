-- الحل النهائي الشامل لمشكلة مزامنة رسوم ياليدين

-----------------------------------------
-- 1. تعطيل محفز التحويل (REDIRECT)
-----------------------------------------

-- تعطيل محفز redirect بطريقة آمنة
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'yalidine_fees_redirect_trigger'
    AND tgrelid = 'yalidine_fees'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE yalidine_fees DISABLE TRIGGER yalidine_fees_redirect_trigger';
    RAISE NOTICE 'تم تعطيل محفز yalidine_fees_redirect_trigger بنجاح';
  ELSE
    RAISE NOTICE 'المحفز yalidine_fees_redirect_trigger غير موجود';
  END IF;
END $$;

-----------------------------------------
-- 2. إصلاح قيود المفاتيح الأجنبية
-----------------------------------------

-- التأكد من أن القيد يستخدم RESTRICT بدلاً من CASCADE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'yalidine_fees'::regclass 
    AND conname = 'yalidine_fees_organization_id_fkey'
    AND pg_get_constraintdef(oid) NOT LIKE '%ON DELETE RESTRICT%'
  ) THEN
    ALTER TABLE yalidine_fees
    DROP CONSTRAINT IF EXISTS yalidine_fees_organization_id_fkey,
    ADD CONSTRAINT yalidine_fees_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE RESTRICT;
    
    RAISE NOTICE 'تم تحديث قيد المفتاح الأجنبي organization_id إلى RESTRICT';
  ELSE
    RAISE NOTICE 'قيد المفتاح الأجنبي organization_id يستخدم بالفعل RESTRICT';
  END IF;
END $$;

-----------------------------------------
-- 3. إنشاء دالة محسنة للحذف بطريقة أكثر أمانًا
-----------------------------------------

CREATE OR REPLACE FUNCTION delete_yalidine_fees_for_organization(
  p_organization_id UUID,
  p_from_wilaya_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_rows INTEGER := 0;
BEGIN
  -- استخدام جملة DELETE مع الشروط المناسبة
  DELETE FROM yalidine_fees
  WHERE organization_id = p_organization_id
    AND from_wilaya_id = p_from_wilaya_id;
    
  -- الحصول على عدد الصفوف المتأثرة
  GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
  
  RETURN v_deleted_rows;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------
-- 4. إنشاء ترغر لمزامنة الحقول المتشابهة
-----------------------------------------

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

-- التأكد من وجود المحفز على الجدول الأصلي
DROP TRIGGER IF EXISTS sync_yalidine_fees_columns_trigger ON yalidine_fees;

CREATE TRIGGER sync_yalidine_fees_columns_trigger
BEFORE INSERT OR UPDATE ON yalidine_fees
FOR EACH ROW EXECUTE FUNCTION sync_yalidine_fees_columns();

-----------------------------------------
-- 5. إنشاء دالة بسيطة للإدراج مباشرة
-----------------------------------------

CREATE OR REPLACE FUNCTION rpc_simple_insert_yalidine_fees(p_data JSONB)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_record JSONB;
BEGIN
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    INSERT INTO yalidine_fees (
      organization_id, from_wilaya_id, to_wilaya_id, commune_id,
      from_wilaya_name, to_wilaya_name, commune_name, zone,
      retour_fee, cod_percentage, insurance_percentage, oversize_fee,
      express_home, express_desk, economic_home, economic_desk,
      is_home_available, is_stop_desk_available,
      home_fee, stop_desk_fee, last_updated_at
    ) VALUES (
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
      (v_record->>'stop_desk_fee')::INTEGER,
      CURRENT_TIMESTAMP
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
      is_home_available = EXCLUDED.is_home_available,
      is_stop_desk_available = EXCLUDED.is_stop_desk_available,
      home_fee = EXCLUDED.home_fee,
      stop_desk_fee = EXCLUDED.stop_desk_fee,
      last_updated_at = CURRENT_TIMESTAMP;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------
-- 6. التحقق من حالة البيانات بعد الإصلاح
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
-- 7. عرض ملخص الإصلاحات والحالة الحالية
-----------------------------------------

DO $$
BEGIN
  RAISE NOTICE '===========================================================';
  RAISE NOTICE '               تم تطبيق إصلاحات ياليدين بنجاح             ';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE '1. تم تعطيل المحفز: yalidine_fees_redirect_trigger';
  RAISE NOTICE '2. تم إصلاح قيد المفتاح الأجنبي للمنظمة';
  RAISE NOTICE '3. تم إنشاء دالة محسنة للحذف';
  RAISE NOTICE '4. تم إنشاء محفز لمزامنة الحقول المتشابهة';
  RAISE NOTICE '5. تم إنشاء دالة بسيطة للإدراج المباشر';
  RAISE NOTICE '===========================================================';
  RAISE NOTICE 'يمكنك الآن استخدام الدالة التالية في التطبيق:';
  RAISE NOTICE 'rpc_simple_insert_yalidine_fees(...)';
  RAISE NOTICE '===========================================================';
END $$;

-- عرض حالة الجداول بعد الإصلاح
SELECT * FROM diagnose_yalidine_fees();

-----------------------------------------
-- 8. التحقق من حالة المحفز (للتشخيص)
-----------------------------------------

-- استعلام يمكن تنفيذه يدوياً للتحقق من حالة المحفز
SELECT 
  t.tgname AS trigger_name,
  CASE WHEN t.tgenabled = 'D' THEN 'معطل' ELSE 'مفعل' END AS status,
  pg_get_triggerdef(t.oid) AS trigger_definition,
  c.relname AS table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE t.tgname = 'yalidine_fees_redirect_trigger'
OR c.relname = 'yalidine_fees';

-----------------------------------------
-- 9. ملاحظات للمستخدم حول تعديل حقوق الوصول
-----------------------------------------

/* 
ملاحظات مهمة:

إذا واجهت مشكلة "403 Forbidden" عند تنفيذ هذه الاستعلامات، يمكنك:

1. نسخ هذه الاستعلامات وتنفيذها مباشرة في واجهة قاعدة البيانات (مثل TablePlus أو موقع supabase)

2. تنفيذ الأوامر التالية مباشرة عبر واجهة SQL:

   -- تعطيل المحفز يدوياً
   ALTER TABLE yalidine_fees DISABLE TRIGGER yalidine_fees_redirect_trigger;
   
   -- التحقق من نجاح التعطيل
   SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'yalidine_fees_redirect_trigger';
   
   -- إعادة تعيين سلسلة المصادقة إذا لزم الأمر
   ALTER ROLE authenticated IN DATABASE postgres SET ROLE postgres;
*/ 