-- دالة للحصول على معلومات أعمدة جدول معين
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM
    pg_catalog.pg_attribute a
  JOIN
    pg_catalog.pg_class t ON a.attrelid = t.oid
  JOIN
    pg_catalog.pg_namespace n ON t.relnamespace = n.oid
  JOIN
    pg_catalog.pg_type tp ON a.atttypid = tp.oid
  LEFT JOIN
    information_schema.columns c ON 
      c.table_name = t.relname AND
      c.column_name = a.attname AND
      c.table_schema = n.nspname
  WHERE
    n.nspname = 'public' AND
    t.relname = table_name AND
    a.attnum > 0 AND
    NOT a.attisdropped
  ORDER BY
    a.attnum;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 