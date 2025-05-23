-- التأكد من وجود المخططات المطلوبة
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS public;

-- إضافة الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
DROP EXTENSION IF EXISTS pg_net CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions; -- pg_net functions are in 'net', wrappers in 'extensions'

-- منح الصلاحيات على المخططات
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- حذف الأنواع القديمة إذا كانت موجودة (http_header قد لا يكون ضرورياً إذا استخدمنا jsonb مباشرة)
DROP TYPE IF EXISTS public.shipping_calculation_result CASCADE;
DROP TYPE IF EXISTS public.http_header CASCADE;

-- إنشاء الأنواع المطلوبة
CREATE TYPE public.http_header AS ( -- لا يزال مفيدًا للتوضيح ، ولكنه غير مستخدم مباشرة في http_post
  field text,
  value text
);

CREATE TYPE public.shipping_calculation_result AS (
  success boolean,
  price numeric,
  error text
);

-- منح الصلاحيات على الأنواع الجديدة
GRANT USAGE ON TYPE public.http_header TO postgres, anon, authenticated, service_role;
GRANT USAGE ON TYPE public.shipping_calculation_result TO postgres, anon, authenticated, service_role;

-- إنشاء وظيفة حساب سعر الشحن
CREATE OR REPLACE FUNCTION public.calculate_zrexpress_shipping(
  p_organization_id uuid,
  p_wilaya_id text,
  p_is_home_delivery boolean DEFAULT true
)
RETURNS public.shipping_calculation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions -- extensions schema for http_post wrapper
AS $$
DECLARE
  v_settings record;
  v_response jsonb;
  v_result shipping_calculation_result;
  v_request_body jsonb;
  v_request_headers jsonb;
BEGIN
  -- الحصول على إعدادات ZR Express
  SELECT 
    ps.api_token,
    ps.api_key,
    sp.base_url
  INTO v_settings
  FROM shipping_provider_settings ps
  JOIN shipping_providers sp ON sp.id = ps.provider_id
  WHERE ps.organization_id = p_organization_id
    AND sp.code = 'zrexpress'
  LIMIT 1;

  -- التحقق من وجود الإعدادات
  IF v_settings IS NULL THEN
    RETURN (false, 0, 'لم يتم العثور على إعدادات ZR Express')::shipping_calculation_result;
  END IF;

  -- إعداد جسم الطلب
  v_request_body := jsonb_build_object(
    'IDWilaya', p_wilaya_id,
    'TypeLivraison', CASE WHEN p_is_home_delivery THEN '0' ELSE '1' END
  );

  -- إعداد headers كـ jsonb
  v_request_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'token', v_settings.api_token,
    'key', v_settings.api_key
  );

  -- إرسال طلب HTTP باستخدام extensions.http_post
  -- الترتيب الصحيح: url, body, headers
  SELECT 
    content::jsonb INTO v_response
  FROM 
    extensions.http_post(
      url := v_settings.base_url || '/tarification',
      body := v_request_body, -- الجسم أولاً
      headers := v_request_headers -- ثم الرؤوس
    );

  -- معالجة الاستجابة
  IF v_response IS NOT NULL THEN
    -- البحث عن السعر المناسب في مصفوفة الأسعار
    -- يجب التأكد من أن v_response هو مصفوفة JSON إذا كان هذا هو المتوقع
    IF jsonb_typeof(v_response) = 'array' THEN
      WITH price_data AS (
        SELECT 
          (value->>'Domicile')::numeric as home_price,
          (value->>'Stopdesk')::numeric as desk_price
        FROM jsonb_array_elements(v_response) as value
        WHERE (value->>'IDWilaya')::text = p_wilaya_id
      )
      SELECT 
        CASE 
          WHEN p_is_home_delivery THEN home_price
          ELSE desk_price
        END INTO v_result.price
      FROM price_data;

      IF v_result.price IS NOT NULL AND v_result.price > 0 THEN
        v_result.success := true;
        v_result.error := NULL;
      ELSE
        v_result.success := false;
        v_result.price := 0;
        v_result.error := 'لم يتم العثور على سعر للولاية المحددة في الاستجابة.';
      END IF;
    ELSE 
      -- إذا لم تكن الاستجابة مصفوفة, قد يكون هناك خطأ من API
      -- أو أن هيكل الاستجابة مختلف عما هو متوقع
      v_result.success := false;
      v_result.price := 0;
      v_result.error := 'استجابة ZR Express ليست بالتنسيق المتوقع (ليست مصفوفة). الاستجابة: ' || v_response::text;
    END IF;
  ELSE
    v_result.success := false;
    v_result.price := 0;
    v_result.error := 'فشل في الاتصال بخدمة ZR Express أو لم يتم استلام محتوى.';
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN (false, 0, SQLERRM)::shipping_calculation_result;
END;
$$;

-- منح الصلاحيات على الوظيفة
GRANT EXECUTE ON FUNCTION public.calculate_zrexpress_shipping TO postgres, anon, authenticated, service_role; 