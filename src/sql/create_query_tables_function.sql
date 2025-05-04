-- دالة لتنفيذ استعلام SQL وإرجاع النتائج كجدول
-- هذا يمكن استخدامه كبديل للوصول المباشر إلى الجداول المعلوماتية

CREATE OR REPLACE FUNCTION query_tables(query_text text)
RETURNS SETOF json AS $$
DECLARE
  result json;
BEGIN
  -- استخدام استعلام ديناميكي لتنفيذ الاستعلام المطلوب
  FOR result IN EXECUTE query_text
  LOOP
    RETURN NEXT result;
  END LOOP;
  RETURN;
EXCEPTION WHEN OTHERS THEN
  -- إرجاع خطأ كبيانات JSON
  RETURN QUERY SELECT json_build_object(
    'error', true,
    'message', SQLERRM,
    'code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 