-- اختبار إدخال بيانات في جدول yalidine_fees والتحقق من مشاكل الحفظ
-- تنفيذ هذا الملف في واجهة قاعدة البيانات سيساعد في تشخيص المشكلة

-- 1. تعطيل المحفز yalidine_fees_redirect_trigger للتأكد من أنه لن يتدخل
ALTER TABLE yalidine_fees DISABLE TRIGGER yalidine_fees_redirect_trigger;

-- 2. حذف السجلات الاختبارية القديمة إن وجدت (اختياري)
DELETE FROM yalidine_fees WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe' AND from_wilaya_id = 40 AND to_wilaya_id IN (1, 2, 3);

-- 3. التحقق من وجود ولايات صالحة
SELECT 'عدد الولايات المتاحة: ' || COUNT(*) AS province_check FROM yalidine_provinces_global;

-- 4. إدخال بيانات تجريبية
INSERT INTO yalidine_fees (
  organization_id, from_wilaya_id, to_wilaya_id, commune_id,
  from_wilaya_name, to_wilaya_name, commune_name,
  express_home, express_desk, economic_home, economic_desk,
  is_home_available, is_stop_desk_available,
  zone, retour_fee, cod_percentage, insurance_percentage, oversize_fee,
  home_fee, stop_desk_fee, last_updated_at
) VALUES (
  'fed872f9-1ade-4351-b020-5598fda976fe', 40, 1, 0,
  'خنشلة', 'أدرار', 'مركز',
  1200, 1000, NULL, NULL,
  TRUE, TRUE,
  1, 200, 0.5, 0, 0,
  1200, 1000, CURRENT_TIMESTAMP
), (
  'fed872f9-1ade-4351-b020-5598fda976fe', 40, 2, 0,
  'خنشلة', 'الشلف', 'مركز',
  1100, 900, NULL, NULL,
  TRUE, TRUE,
  1, 200, 0.5, 0, 0,
  1100, 900, CURRENT_TIMESTAMP
), (
  'fed872f9-1ade-4351-b020-5598fda976fe', 40, 3, 0,
  'خنشلة', 'الأغواط', 'مركز',
  1300, 1100, NULL, NULL,
  TRUE, TRUE,
  1, 200, 0.5, 0, 0,
  1300, 1100, CURRENT_TIMESTAMP
);

-- 5. التحقق من نجاح عملية الإدخال
SELECT 'عدد السجلات بعد الإدخال: ' || COUNT(*) AS insert_check 
FROM yalidine_fees 
WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe' AND from_wilaya_id = 40 AND to_wilaya_id IN (1, 2, 3);

-- 6. التحقق من عدد السجلات الإجمالي في الجدول
SELECT 'إجمالي سجلات الجدول: ' || COUNT(*) AS total_check FROM yalidine_fees;

-- 7. التحقق من جدول yalidine_fees_new
SELECT 'عدد السجلات في yalidine_fees_new: ' || COUNT(*) AS new_table_check FROM yalidine_fees_new;

-- 8. التحقق من المحفزات النشطة على الجدول
SELECT trigger_name, trigger_enabled
FROM (
  SELECT t.tgname AS trigger_name,
         CASE WHEN t.tgenabled = 'D' THEN 'معطل' ELSE 'مفعل' END AS trigger_enabled
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'yalidine_fees'
) subq;

-- 9. التحقق من قيود المفتاح الأجنبي
SELECT constraint_name, table_name, column_name, 
       referenced_table_name, referenced_column_name
FROM (
  SELECT 
    kcu.constraint_name,
    ccu.table_name AS table_name,
    kcu.column_name,
    ccu.table_name AS referenced_table_name,
    ccu.column_name AS referenced_column_name
  FROM information_schema.constraint_column_usage ccu
  JOIN information_schema.key_column_usage kcu
    ON ccu.constraint_name = kcu.constraint_name
  JOIN information_schema.table_constraints tc
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.table_name = 'yalidine_fees'
) subq;

-- 10. التحقق من وجود أي خطأ في الجدول
DO $$
DECLARE
  v_error_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_error_count FROM (
    SELECT id, organization_id, from_wilaya_id, to_wilaya_id, commune_id, COUNT(*) 
    FROM yalidine_fees
    GROUP BY id, organization_id, from_wilaya_id, to_wilaya_id, commune_id
    HAVING COUNT(*) > 1
  ) dupes;
  
  IF v_error_count > 0 THEN
    RAISE NOTICE 'تم العثور على % تكرار في المفاتيح الأساسية', v_error_count;
  ELSE
    RAISE NOTICE 'لا توجد تكرارات في المفاتيح الأساسية';
  END IF;
END $$;

-- 11. إصلاح قيد المفتاح الفريد (إذا كان غير موجود)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'yalidine_fees'
    AND constraint_name = 'yalidine_fees_organization_from_to_commune_key'
  ) THEN
    EXECUTE 'ALTER TABLE yalidine_fees ADD CONSTRAINT yalidine_fees_organization_from_to_commune_key UNIQUE (organization_id, from_wilaya_id, to_wilaya_id, commune_id)';
    RAISE NOTICE 'تم إضافة قيد المفتاح الفريد';
  ELSE
    RAISE NOTICE 'قيد المفتاح الفريد موجود بالفعل';
  END IF;
END $$;

-- 12. فحص نوعية البيانات في الأعمدة الهامة
SELECT 
  pg_typeof(organization_id) AS organization_id_type,
  pg_typeof(from_wilaya_id) AS from_wilaya_id_type,
  pg_typeof(to_wilaya_id) AS to_wilaya_id_type,
  pg_typeof(commune_id) AS commune_id_type,
  pg_typeof(express_home) AS express_home_type,
  pg_typeof(express_desk) AS express_desk_type
FROM yalidine_fees
LIMIT 1; 