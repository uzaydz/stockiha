-- دالة للحصول على المفاتيح الأساسية لجدول معين
CREATE OR REPLACE FUNCTION get_primary_keys(table_name text)
RETURNS TABLE(
  column_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.attname::text as column_name
  FROM
    pg_index i
  JOIN
    pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
  JOIN
    pg_class c ON i.indrelid = c.oid
  JOIN
    pg_namespace n ON c.relnamespace = n.oid
  WHERE
    i.indisprimary AND
    n.nspname = 'public' AND
    c.relname = table_name
  ORDER BY
    a.attnum;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 