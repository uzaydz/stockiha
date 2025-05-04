-- دالة SQL للتحقق من وجود دالة محددة في قاعدة البيانات
CREATE OR REPLACE FUNCTION check_function_exists(function_name text)
RETURNS boolean AS $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = current_schema()
      AND p.proname = function_name
  ) INTO func_exists;
  
  RETURN func_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 