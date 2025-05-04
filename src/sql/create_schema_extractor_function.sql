-- Function to extract table schema for offline support
CREATE OR REPLACE FUNCTION public.get_table_schema(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  constraint_type text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    tc.constraint_type
  FROM 
    information_schema.columns c
  LEFT JOIN 
    information_schema.constraint_column_usage ccu 
    ON c.column_name = ccu.column_name 
    AND c.table_name = ccu.table_name
  LEFT JOIN 
    information_schema.table_constraints tc 
    ON ccu.constraint_name = tc.constraint_name 
    AND tc.table_name = c.table_name
  WHERE 
    c.table_schema = 'public' 
    AND c.table_name = table_name
  ORDER BY 
    c.ordinal_position;
$$; 