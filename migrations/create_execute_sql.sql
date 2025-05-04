-- إنشاء دالة تسمح بتنفيذ استعلامات SQL مخصصة
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE query;
END;
$$; 