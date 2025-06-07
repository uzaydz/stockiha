-- ======================================================================
-- إصلاح دالة calculate_shipping_fee - إزالة الأسعار الافتراضية
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
    FOR r IN SELECT routine_name, routine_type 
             FROM information_schema.routines 
             WHERE routine_schema = 'public' 
             AND routine_name = 'calculate_shipping_fee'
    LOOP
        EXECUTE 'DROP ' || r.routine_type || ' IF EXISTS ' || r.routine_name || ' CASCADE';
    END LOOP;
END $$;

-- إنشاء الدالة الجديدة بدون أسعار افتراضية
CREATE OR REPLACE FUNCTION calculate_shipping_fee(
  p_org_id UUID,
  p_to_wilaya_id INT,
  p_to_municipality_id INT,
  p_delivery_type TEXT,
  p_weight NUMERIC DEFAULT 1
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fee NUMERIC := 0;
  v_from_wilaya_id INT;
  v_debug_info TEXT := '';
BEGIN
  -- التحقق من صحة المعاملات المدخلة
  IF p_org_id IS NULL OR p_to_wilaya_id IS NULL OR p_to_municipality_id IS NULL OR p_delivery_type IS NULL THEN
    RAISE LOG 'calculate_shipping_fee: Invalid parameters - org_id=%, wilaya_id=%, municipality_id=%, delivery_type=%', 
      p_org_id, p_to_wilaya_id, p_to_municipality_id, p_delivery_type;
    RETURN 0; -- إرجاع 0 بدلاً من أسعار افتراضية
  END IF;

  -- الحصول على ولاية المنشأ الصحيحة من الجدول الفعلي
  SELECT DISTINCT from_wilaya_id
  INTO v_from_wilaya_id
  FROM yalidine_fees
  WHERE organization_id = p_org_id
    AND from_wilaya_id IS NOT NULL
  LIMIT 1;
  
  -- إذا لم توجد بيانات للمؤسسة، إرجاع 0
  IF v_from_wilaya_id IS NULL THEN
    RAISE LOG 'calculate_shipping_fee: No data found for organization: %', p_org_id;
    RETURN 0;
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
  
  -- إضافة رسوم الوزن الإضافي للتوصيل المنزلي فقط إذا وُجد سعر أساسي
  IF p_delivery_type = 'home' AND p_weight > 1 AND v_fee > 0 THEN
    v_fee := v_fee + ((p_weight - 1) * 100);
  END IF;
  
  -- إنشاء معلومات التشخيص
  v_debug_info := format(
    'calculate_shipping_fee: org=%s, from_wilaya=%s, to_wilaya=%s, municipality=%s, type=%s, weight=%s -> fee=%s',
    p_org_id, v_from_wilaya_id, p_to_wilaya_id, p_to_municipality_id, p_delivery_type, p_weight, v_fee
  );
  
  RAISE LOG '%', v_debug_info;
  
  -- إذا لا يزال السعر 0، لا نستخدم أسعار افتراضية
  IF v_fee IS NULL OR v_fee = 0 THEN
    RAISE LOG 'calculate_shipping_fee: No fee data available for org=%, wilaya=%, municipality=%', p_org_id, p_to_wilaya_id, p_to_municipality_id;
    RETURN 0; -- إرجاع 0 فقط، بدون أسعار افتراضية
  END IF;
  
  RETURN COALESCE(v_fee, 0);
END;
$$;

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION calculate_shipping_fee(UUID, INT, INT, TEXT, NUMERIC) IS 
'دالة حساب أسعار الشحن - تعتمد على البيانات الحقيقية فقط بدون أسعار افتراضية';

-- التحقق من إنشاء الدالة بنجاح
SELECT 
  'تم إنشاء الدالة بنجاح' as status,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_shipping_fee';

-- اختبار سريع للدالة الجديدة
SELECT 
  'اختبار الدالة الجديدة' as test_info,
  calculate_shipping_fee('fed872f9-1ade-4351-b020-5598fda976fe'::uuid, 8, 817, 'home', 1) as home_fee_817,
  calculate_shipping_fee('fed872f9-1ade-4351-b020-5598fda976fe'::uuid, 8, 817, 'desk', 1) as desk_fee_817,
  calculate_shipping_fee('fed872f9-1ade-4351-b020-5598fda976fe'::uuid, 8, 801, 'home', 1) as home_fee_801,
  calculate_shipping_fee('fed872f9-1ade-4351-b020-5598fda976fe'::uuid, 8, 801, 'desk', 1) as desk_fee_801; 