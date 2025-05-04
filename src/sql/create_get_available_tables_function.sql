-- دالة للحصول على قائمة الجداول المتاحة في قاعدة البيانات
CREATE OR REPLACE FUNCTION get_available_tables()
RETURNS text[] AS $$
DECLARE
  result text[];
BEGIN
  -- الحصول على قائمة الجداول من المخطط العام (public)
  SELECT ARRAY_AGG(tablename)
  INTO result
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'auth_%'
  ORDER BY tablename;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 