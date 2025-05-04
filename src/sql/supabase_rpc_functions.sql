-- ملف إعداد دوال الـ RPC المطلوبة لتكامل Supabase مع التصدير والاستيراد
-- يمكنك تنفيذ هذا الملف دفعة واحدة في SQL Editor في Supabase

-- 1. حذف وإنشاء دالة get_available_tables
DROP FUNCTION IF EXISTS get_available_tables();
CREATE OR REPLACE FUNCTION get_available_tables()
RETURNS TABLE(table_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
END;
$$ LANGUAGE plpgsql;

-- 2. حذف وإنشاء دالة get_table_columns
DROP FUNCTION IF EXISTS get_table_columns(text);
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable text, column_default text) AS $$
BEGIN
  RETURN QUERY
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = p_table_name;
END;
$$ LANGUAGE plpgsql;

-- 3. حذف وإنشاء دالة get_primary_keys
DROP FUNCTION IF EXISTS get_primary_keys(text);
CREATE OR REPLACE FUNCTION get_primary_keys(p_table_name text)
RETURNS TABLE(column_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = p_table_name;
END;
$$ LANGUAGE plpgsql;

-- 4. حذف وإنشاء دالة get_table_indexes
DROP FUNCTION IF EXISTS get_table_indexes(text);
CREATE OR REPLACE FUNCTION get_table_indexes(p_table_name text)
RETURNS TABLE(index_name text, column_names text) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.relname AS index_name,
    string_agg(a.attname, ', ') AS column_names
  FROM
    pg_class t,
    pg_class i,
    pg_index ix,
    pg_attribute a
  WHERE
    t.oid = ix.indrelid
    AND i.oid = ix.indexrelid
    AND a.attrelid = t.oid
    AND a.attnum = ANY(ix.indkey)
    AND t.relkind = 'r'
    AND t.relname = p_table_name
  GROUP BY
    i.relname;
END;
$$ LANGUAGE plpgsql;

-- 5. حذف وإنشاء دالة query_tables
DROP FUNCTION IF EXISTS query_tables(text, integer);
CREATE OR REPLACE FUNCTION query_tables(p_table_name text, p_limit integer DEFAULT 100)
RETURNS SETOF RECORD AS $$
DECLARE
  sql text;
BEGIN
  sql := format('select * from %I limit %s', p_table_name, p_limit);
  RETURN QUERY EXECUTE sql;
END;
$$ LANGUAGE plpgsql; 