-- دالة للحصول على فهارس جدول معين
CREATE OR REPLACE FUNCTION get_table_indexes(table_name text)
RETURNS TABLE(
  indexname text,
  indexdef text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c2.relname::text as indexname,
    pg_get_indexdef(i.indexrelid)::text as indexdef
  FROM
    pg_index i
  JOIN
    pg_class c ON i.indrelid = c.oid
  JOIN
    pg_class c2 ON i.indexrelid = c2.oid
  JOIN
    pg_namespace n ON c.relnamespace = n.oid
  WHERE
    n.nspname = 'public' AND
    c.relname = table_name AND
    c2.relname NOT LIKE '%_pkey'
  ORDER BY
    c2.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 