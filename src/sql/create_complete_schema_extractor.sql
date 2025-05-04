-- دالة SQL لاستخراج كامل هيكل قاعدة البيانات
CREATE OR REPLACE FUNCTION get_complete_db_schema()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- استخراج كافة الجداول والأعمدة
  WITH tables_info AS (
    SELECT
      t.table_name,
      json_agg(
        json_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'is_nullable', c.is_nullable,
          'column_default', c.column_default
        ) ORDER BY c.ordinal_position
      ) AS columns,
      -- استخراج القيود (المفاتيح الأساسية والأجنبية)
      (
        SELECT json_agg(
          json_build_object(
            'constraint_name', tc.constraint_name,
            'constraint_type', tc.constraint_type,
            'foreign_table', ccu.table_name,
            'column_name', kcu.column_name,
            'foreign_column', ccu.column_name
          )
        )
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = t.table_name AND tc.table_schema = current_schema()
      ) AS constraints,
      -- استخراج الفهارس (استخدام pg_indexes مباشرة بدلاً من الاعتماد على indexrelid)
      (
        SELECT json_agg(
          json_build_object(
            'index_name', indexname,
            'index_def', indexdef
          )
        )
        FROM pg_indexes
        WHERE tablename = t.table_name AND schemaname = current_schema()
      ) AS indexes
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    WHERE t.table_schema = current_schema() 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'pg_%'
    AND t.table_name NOT LIKE 'auth_%'
    GROUP BY t.table_name
  ),
  -- استخراج الوظائف
  functions_info AS (
    SELECT json_agg(
      json_build_object(
        'function_name', p.proname,
        'function_def', pg_get_functiondef(p.oid)
      )
    ) AS functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = current_schema()
    AND p.proname NOT LIKE 'pg_%'
  ),
  -- استخراج المشغلات
  triggers_info AS (
    SELECT json_agg(
      json_build_object(
        'trigger_name', t.tgname,
        'table_name', c.relname,
        'trigger_def', pg_get_triggerdef(t.oid)
      )
    ) AS triggers
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = current_schema()
    AND t.tgname NOT LIKE 'pg_%'
  )
  
  SELECT json_build_object(
    'tables', (SELECT json_agg(row_to_json(tables_info)) FROM tables_info),
    'functions', (SELECT functions FROM functions_info),
    'triggers', (SELECT triggers FROM triggers_info)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 