-- الإصلاح الشامل النهائي لمشاكل الشحن
-- تاريخ: 2025-01-27

-- ====================================================================
-- 1. التأكد من صحة دالة get_shipping_municipalities
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_shipping_municipalities(p_wilaya_id INT, p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
  v_count INTEGER;
BEGIN
  -- التحقق من صحة المعاملات
  IF p_wilaya_id IS NULL OR p_wilaya_id <= 0 THEN
    RAISE LOG 'get_shipping_municipalities: Invalid wilaya_id: %', p_wilaya_id;
    RETURN '[]'::jsonb;
  END IF;
  
  -- جلب البلديات من الجدول الصحيح
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ym.id,
      'name', COALESCE(ym.name, 'غير محدد'),
      'wilaya_id', ym.wilaya_id,
      'is_deliverable', COALESCE(ym.is_deliverable, true),
      'has_stop_desk', COALESCE(ym.has_stop_desk, false),
      'delivery_time_parcel', COALESCE(ym.delivery_time_parcel, 5),
      'delivery_time_payment', COALESCE(ym.delivery_time_payment, 2)
    )
    ORDER BY ym.name NULLS LAST
  ), '[]'::jsonb) 
  INTO v_result
  FROM yalidine_municipalities_global ym
  WHERE ym.wilaya_id = p_wilaya_id
    AND COALESCE(ym.is_deliverable, true) = true;
  
  -- عد النتائج
  SELECT jsonb_array_length(v_result) INTO v_count;
  
  -- تسجيل النتيجة للتشخيص
  RAISE LOG 'get_shipping_municipalities: wilaya_id=%, municipalities_count=%', p_wilaya_id, v_count;
  
  RETURN v_result;
END;
$$;

-- ====================================================================
-- 2. تحديث دالة calculate_shipping_fee لاستخدام الأسعار الحقيقية
-- ====================================================================

CREATE OR REPLACE FUNCTION public.calculate_shipping_fee(
  p_org_id UUID,
  p_wilaya_id INT,
  p_municipality_id INT,
  p_delivery_type TEXT,
  p_weight DECIMAL DEFAULT 1.0
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_fee INT;
  v_home_fee INT;
  v_desk_fee INT;
  v_debug_info TEXT;
BEGIN
  -- التحقق من صحة المعاملات
  IF p_org_id IS NULL OR p_wilaya_id IS NULL OR p_municipality_id IS NULL THEN
    RAISE LOG 'calculate_shipping_fee: Invalid parameters - org_id=%, wilaya_id=%, municipality_id=%', 
      p_org_id, p_wilaya_id, p_municipality_id;
    RETURN CASE 
      WHEN p_delivery_type = 'home' THEN 1000
      ELSE 400
    END;
  END IF;

  -- البحث عن الرسوم الحقيقية في قاعدة البيانات
  SELECT home_fee, stop_desk_fee
  INTO v_home_fee, v_desk_fee
  FROM yalidine_fees
  WHERE organization_id = p_org_id
    AND to_wilaya_id = p_wilaya_id
    AND commune_id = p_municipality_id
  LIMIT 1;

  -- تحديد الرسوم حسب نوع التوصيل
  IF p_delivery_type = 'home' THEN
    v_fee := COALESCE(v_home_fee, 1000);
  ELSE
    v_fee := COALESCE(v_desk_fee, 400);
  END IF;

  -- إنشاء معلومات التشخيص
  v_debug_info := format(
    'calculate_shipping_fee: org=%s, wilaya=%s, municipality=%s, type=%s -> fee=%s (home=%s, desk=%s)',
    p_org_id, p_wilaya_id, p_municipality_id, p_delivery_type, v_fee, v_home_fee, v_desk_fee
  );
  
  RAISE LOG '%', v_debug_info;

  RETURN v_fee;
END;
$$;

-- ====================================================================
-- 3. إنشاء دالة مساعدة لتشخيص مشاكل الشحن
-- ====================================================================

CREATE OR REPLACE FUNCTION public.debug_shipping_issue(
  p_org_id UUID,
  p_wilaya_id INT,
  p_municipality_id INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
  v_municipalities_count INT;
  v_fees_count INT;
  v_sample_fee RECORD;
BEGIN
  -- فحص البلديات
  SELECT COUNT(*) INTO v_municipalities_count
  FROM yalidine_municipalities_global
  WHERE wilaya_id = p_wilaya_id;

  -- فحص الرسوم
  SELECT COUNT(*) INTO v_fees_count
  FROM yalidine_fees
  WHERE organization_id = p_org_id
    AND to_wilaya_id = p_wilaya_id;

  -- جلب عينة من الرسوم
  SELECT home_fee, stop_desk_fee, commune_name
  INTO v_sample_fee
  FROM yalidine_fees
  WHERE organization_id = p_org_id
    AND to_wilaya_id = p_wilaya_id
  LIMIT 1;

  -- بناء التقرير
  v_result := jsonb_build_object(
    'wilaya_id', p_wilaya_id,
    'organization_id', p_org_id,
    'municipalities_count', v_municipalities_count,
    'fees_count', v_fees_count,
    'sample_fee', jsonb_build_object(
      'home_fee', v_sample_fee.home_fee,
      'stop_desk_fee', v_sample_fee.stop_desk_fee,
      'commune_name', v_sample_fee.commune_name
    ),
    'municipalities_function_test', get_shipping_municipalities(p_wilaya_id, p_org_id)
  );

  -- إذا تم تحديد بلدية معينة، فحص رسومها
  IF p_municipality_id IS NOT NULL THEN
    SELECT home_fee, stop_desk_fee, commune_name
    INTO v_sample_fee
    FROM yalidine_fees
    WHERE organization_id = p_org_id
      AND to_wilaya_id = p_wilaya_id
      AND commune_id = p_municipality_id;

    v_result := v_result || jsonb_build_object(
      'specific_municipality', jsonb_build_object(
        'municipality_id', p_municipality_id,
        'home_fee', v_sample_fee.home_fee,
        'stop_desk_fee', v_sample_fee.stop_desk_fee,
        'commune_name', v_sample_fee.commune_name,
        'calculated_home_fee', calculate_shipping_fee(p_org_id, p_wilaya_id, p_municipality_id, 'home'),
        'calculated_desk_fee', calculate_shipping_fee(p_org_id, p_wilaya_id, p_municipality_id, 'desk')
      )
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ====================================================================
-- 4. تحديث الفهارس لتحسين الأداء
-- ====================================================================

-- فهرس للبحث في البلديات
CREATE INDEX IF NOT EXISTS idx_yalidine_municipalities_wilaya 
ON yalidine_municipalities_global(wilaya_id) 
WHERE is_deliverable = true;

-- فهرس للبحث في الرسوم
CREATE INDEX IF NOT EXISTS idx_yalidine_fees_lookup 
ON yalidine_fees(organization_id, to_wilaya_id, commune_id);

-- فهرس للبحث في مزودي الشحن
CREATE INDEX IF NOT EXISTS idx_shipping_providers_code 
ON shipping_providers(code) 
WHERE is_active = true;

-- ====================================================================
-- 5. اختبارات التحقق
-- ====================================================================

-- اختبار 1: البلديات للولاية 10
SELECT 'TEST 1: Municipalities for wilaya 10' as test_name,
       jsonb_array_length(get_shipping_municipalities(10, 'fed872f9-1ade-4351-b020-5598fda976fe'::UUID)) as result;

-- اختبار 2: حساب رسوم الشحن
SELECT 'TEST 2: Shipping fee calculation' as test_name,
       calculate_shipping_fee('fed872f9-1ade-4351-b020-5598fda976fe'::UUID, 10, 1016, 'home') as result;

-- اختبار 3: تشخيص شامل
SELECT 'TEST 3: Full diagnosis for wilaya 10' as test_name,
       debug_shipping_issue('fed872f9-1ade-4351-b020-5598fda976fe'::UUID, 10, 1016) as result;

-- ====================================================================
-- 6. تنظيف البيانات المحتملة المشكلة
-- ====================================================================

-- حذف أي مزودي شحن غير صالحين أو مكررين
UPDATE shipping_providers SET is_active = false 
WHERE id IN (5, 6) AND code IN ('1', '5');

-- التأكد من أن ياليدين نشط
UPDATE shipping_providers SET is_active = true 
WHERE id = 1 AND code = 'yalidine';

-- ====================================================================
-- 7. إعداد قواعد الأمان
-- ====================================================================

-- منع إدراج قيم null في shipping_providers.id
ALTER TABLE shipping_providers 
ADD CONSTRAINT check_shipping_provider_id_not_null 
CHECK (id IS NOT NULL AND id > 0);

-- التأكد من صحة codes في shipping_providers
ALTER TABLE shipping_providers 
ADD CONSTRAINT check_shipping_provider_code_valid 
CHECK (code IS NOT NULL AND length(trim(code)) > 0);

-- ====================================================================
-- 8. سجلات النظام للمراقبة
-- ====================================================================

-- تسجيل اكتمال الإصلاح
DO $$
BEGIN
  RAISE LOG 'Shipping system comprehensive fix completed at %', now();
  RAISE LOG 'Fixed issues: shipping_providers null queries, municipalities loading, fee calculation';
END;
$$; 