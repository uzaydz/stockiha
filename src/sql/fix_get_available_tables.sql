-- حذف الدالة القديمة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_available_tables();

-- إنشاء الدالة بشكل مضمون
CREATE OR REPLACE FUNCTION get_available_tables()
RETURNS TABLE(table_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name IS NOT NULL;
END;
$$ LANGUAGE plpgsql; 