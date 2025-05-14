-- إنشاء دالة لاختبار الاتصال بـ API ياليدين من طرف الخادم
-- تتيح هذه الدالة تجاوز مشكلة CORS لأنها تنفذ على الخادم وليس في المتصفح

CREATE OR REPLACE FUNCTION public.test_yalidine_connection(
  api_id TEXT,
  api_token TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- تنفيذ كمالك قاعدة البيانات
SET search_path = public
AS $$
DECLARE
  response jsonb;
  http_status integer;
BEGIN
  -- استخدام pghttp للاتصال بـ API ياليدين من الخادم مباشرة
  SELECT
    status, content::jsonb INTO http_status, response
  FROM
    http((
      'GET',
      'https://api.yalidine.app/v1/wilayas/',
      ARRAY[
        ('X-API-ID', api_id)::http_header,
        ('X-API-TOKEN', api_token)::http_header,
        ('Content-Type', 'application/json')::http_header
      ],
      NULL,
      NULL
    ));

  -- التحقق من النتيجة
  IF http_status >= 200 AND http_status < 300 THEN
    -- نجاح الاتصال
    RETURN jsonb_build_object(
      'success', true,
      'status', http_status,
      'data', response
    );
  ELSE
    -- فشل الاتصال
    RETURN jsonb_build_object(
      'success', false,
      'status', http_status,
      'error', response
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- في حالة وقوع خطأ غير متوقع
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- منح صلاحيات تنفيذ الدالة لجميع المستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION public.test_yalidine_connection TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_yalidine_connection TO anon;

-- إضافة تعليق وصفي للدالة
COMMENT ON FUNCTION public.test_yalidine_connection IS 'اختبار الاتصال بـ API ياليدين من خلال خادم Supabase لتجاوز مشاكل CORS';

-- ملاحظة هامة: يجب تثبيت امتداد pg_http في قاعدة البيانات
-- ملاحظة هامة: يجب تنفيذ هذا الأمر كمستخدم فائق في قاعدة البيانات
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions"; 