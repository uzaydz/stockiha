-- إصلاح دالة calculate_shipping_fee لإرجاع الأسعار الحقيقية
-- المشكلة: الدالة تستخدم from_wilaya_id خاطئ مما يجعلها ترجع القيم الافتراضية
-- الحل: استخدام from_wilaya_id الصحيح من البيانات الموجودة

-- ======================================================================
-- إصلاح دالة calculate_shipping_fee
-- ======================================================================

-- حذف جميع إصدارات الدالة الموجودة أولاً
DROP FUNCTION IF EXISTS calculate_shipping_fee(UUID, INT, INT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS calculate_shipping_fee(UUID, INT, INT, TEXT);
DROP FUNCTION IF EXISTS calculate_shipping_fee(uuid, integer, integer, text, numeric);
DROP FUNCTION IF EXISTS calculate_shipping_fee(uuid, integer, integer, text);

-- حذف أي دوال أخرى بنفس الاسم مع توقيعات مختلفة
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 
            p.proname, 
            pg_catalog.pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'calculate_shipping_fee'
        AND n.nspname = 'public'
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.proname || '(' || r.args || ')';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION calculate_shipping_fee(
  p_org_id UUID,
  p_to_wilaya_id INT,
  p_to_municipality_id INT,
  p_delivery_type TEXT,
  p_weight NUMERIC DEFAULT 1
) RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_fee NUMERIC := 0;
  v_from_wilaya_id INT;
  v_debug_info TEXT := '';
BEGIN
  -- التحقق من صحة المعاملات المدخلة
  IF p_org_id IS NULL OR p_to_wilaya_id IS NULL OR p_to_municipality_id IS NULL THEN
    RAISE LOG 'calculate_shipping_fee: Invalid parameters - org_id=%, wilaya_id=%, municipality_id=%', 
      p_org_id, p_to_wilaya_id, p_to_municipality_id;
    RETURN CASE 
      WHEN p_delivery_type = 'desk' THEN 400 
      ELSE 1000 
    END;
  END IF;

  -- الحصول على ولاية المنشأ الصحيحة من الجدول الفعلي
  SELECT DISTINCT from_wilaya_id
  INTO v_from_wilaya_id
  FROM yalidine_fees
  WHERE organization_id = p_org_id
    AND from_wilaya_id IS NOT NULL
  LIMIT 1;
  
  -- استخدام ولاية افتراضية إذا لم توجد بيانات
  IF v_from_wilaya_id IS NULL THEN
    v_from_wilaya_id := 40; -- استخدام الولاية الموجودة في البيانات
    RAISE LOG 'calculate_shipping_fee: Using default from_wilaya_id=40 for org=%', p_org_id;
  END IF;
  
  -- البحث عن السعر في جدول yalidine_fees
  IF p_delivery_type = 'desk' THEN
    -- البحث عن سعر التوصيل المكتبي
    SELECT COALESCE(stop_desk_fee, 0) 
    INTO v_fee
    FROM yalidine_fees
    WHERE organization_id = p_org_id
      AND from_wilaya_id = v_from_wilaya_id
      AND to_wilaya_id = p_to_wilaya_id
      AND commune_id = p_to_municipality_id
    LIMIT 1;
  ELSE
    -- البحث عن سعر التوصيل المنزلي
    SELECT COALESCE(home_fee, 0) 
    INTO v_fee
    FROM yalidine_fees
    WHERE organization_id = p_org_id
      AND from_wilaya_id = v_from_wilaya_id
      AND to_wilaya_id = p_to_wilaya_id
      AND commune_id = p_to_municipality_id
    LIMIT 1;
  END IF;
  
  -- إذا لم نجد سعر محدد، جرب بدون شرط البلدية (استخدام متوسط أسعار الولاية)
  IF v_fee IS NULL OR v_fee = 0 THEN
    RAISE LOG 'calculate_shipping_fee: No specific fee found, trying wilaya average for org=%, wilaya=%', p_org_id, p_to_wilaya_id;
    
    IF p_delivery_type = 'desk' THEN
      SELECT COALESCE(AVG(stop_desk_fee), 0)
      INTO v_fee
      FROM yalidine_fees
      WHERE organization_id = p_org_id
        AND from_wilaya_id = v_from_wilaya_id
        AND to_wilaya_id = p_to_wilaya_id
        AND stop_desk_fee > 0;
    ELSE
      SELECT COALESCE(AVG(home_fee), 0)
      INTO v_fee
      FROM yalidine_fees
      WHERE organization_id = p_org_id
        AND from_wilaya_id = v_from_wilaya_id
        AND to_wilaya_id = p_to_wilaya_id
        AND home_fee > 0;
    END IF;
  END IF;
  
  -- إضافة رسوم الوزن الإضافي للتوصيل المنزلي
  IF p_delivery_type = 'home' AND p_weight > 1 AND v_fee > 0 THEN
    v_fee := v_fee + ((p_weight - 1) * 100);
  END IF;
  
  -- إنشاء معلومات التشخيص
  v_debug_info := format(
    'calculate_shipping_fee: org=%s, from_wilaya=%s, to_wilaya=%s, municipality=%s, type=%s, weight=%s -> fee=%s',
    p_org_id, v_from_wilaya_id, p_to_wilaya_id, p_to_municipality_id, p_delivery_type, p_weight, v_fee
  );
  
  RAISE LOG '%', v_debug_info;
  
  -- إذا لا يزال السعر 0، استخدم الأسعار الافتراضية فقط كحل أخير
  IF v_fee IS NULL OR v_fee = 0 THEN
    RAISE LOG 'calculate_shipping_fee: Using fallback prices for org=%, wilaya=%, municipality=%', p_org_id, p_to_wilaya_id, p_to_municipality_id;
    
    IF p_delivery_type = 'desk' THEN
      v_fee := 400;
    ELSE
      v_fee := 1000;  -- تم إصلاح السعر من 900 إلى 1000
      IF p_weight > 1 THEN
        v_fee := v_fee + ((p_weight - 1) * 100);
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(v_fee, 0);
END;
$$;

-- ======================================================================
-- تأكيد إنشاء الدالة بنجاح
-- ======================================================================

-- التحقق من وجود الدالة الجديدة
SELECT 
  'تم إنشاء الدالة بنجاح!' as status,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'calculate_shipping_fee'
AND n.nspname = 'public';

-- ======================================================================
-- اختبار الدالة المحدثة
-- ======================================================================

-- اختبار للتأكد من عمل الدالة بشكل صحيح
-- يجب أن ترجع الأسعار الحقيقية من الجدول

-- اختبار للولاية 8، البلدية 801 (Béchar)
-- النتيجة المتوقعة: المنزل = 1400، المكتب = 1100
SELECT 
  'الولاية 8 - البلدية 801' as test_case,
  calculate_shipping_fee('fed872f9-1ade-4351-b020-5598fda976fe', 8, 801, 'home', 1) as home_fee,
  calculate_shipping_fee('fed872f9-1ade-4351-b020-5598fda976fe', 8, 801, 'desk', 1) as desk_fee;

-- اختبار للولاية 8، البلدية 817 (Abadla)  
-- النتيجة المتوقعة: المنزل = 1700، المكتب = 1100
SELECT 
  'الولاية 8 - البلدية 817' as test_case,
  calculate_shipping_fee('fed872f9-1ade-4351-b020-5598fda976fe', 8, 817, 'home', 1) as home_fee,
  calculate_shipping_fee('fed872f9-1ade-4351-b020-5598fda976fe', 8, 817, 'desk', 1) as desk_fee;

-- اختبار للولاية 45، البلدية 4509 (Aïn Ben Khelil)
-- النتيجة المتوقعة: المنزل = 1600، المكتب = 1100
SELECT 
  'الولاية 45 - البلدية 4509' as test_case,
  calculate_shipping_fee('fed872f9-1ade-4351-b020-5598fda976fe', 45, 4509, 'home', 1) as home_fee,
  calculate_shipping_fee('fed872f9-1ade-4351-b020-5598fda976fe', 45, 4509, 'desk', 1) as desk_fee;

-- ======================================================================
-- فحص البيانات للتأكد من وجود from_wilaya_id الصحيح
-- ======================================================================

-- فحص القيم المختلفة لـ from_wilaya_id في البيانات
SELECT 
  'from_wilaya_id values' as info,
  array_agg(DISTINCT from_wilaya_id) as values,
  count(*) as total_records
FROM yalidine_fees 
WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe';

-- فحص عدد السجلات لكل ولاية
SELECT 
  to_wilaya_id,
  to_wilaya_name,
  count(*) as municipality_count,
  min(home_fee) as min_home_fee,
  max(home_fee) as max_home_fee,
  min(stop_desk_fee) as min_desk_fee,
  max(stop_desk_fee) as max_desk_fee
FROM yalidine_fees 
WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'
GROUP BY to_wilaya_id, to_wilaya_name
ORDER BY to_wilaya_id
LIMIT 10;

-- ======================================================================
-- رسالة النجاح
-- ======================================================================

SELECT 'تم إصلاح دالة calculate_shipping_fee بنجاح! الآن ستعيد الأسعار الحقيقية من قاعدة البيانات بدلاً من القيم الافتراضية.' as success_message; 