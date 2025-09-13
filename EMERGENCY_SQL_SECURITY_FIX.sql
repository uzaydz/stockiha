-- 🚨 EMERGENCY DATABASE SECURITY FIX
-- تنفيذ فوراً في Supabase SQL Editor لحذف الدوال الخطيرة

-- =====================================================
-- 1. حذف الدوال الخطيرة فوراً
-- =====================================================

-- حذف دالة exec_sql (خطر كارثي)
DROP FUNCTION IF EXISTS public.exec_sql(text);
DROP FUNCTION IF EXISTS public.execute_sql(text);
DROP FUNCTION IF EXISTS public.execute_sql_file(text);

-- حذف دالة query_tables (خطر عالي)  
DROP FUNCTION IF EXISTS public.query_tables(text);

-- حذف أي دوال مماثلة
DROP FUNCTION IF EXISTS public.run_sql(text);
DROP FUNCTION IF EXISTS public.execute_query(text);
DROP FUNCTION IF EXISTS public.dynamic_sql(text);

-- =====================================================
-- 2. فحص وإزالة أي دوال تحتوي على EXECUTE
-- =====================================================

-- عرض جميع الدوال التي تحتوي على EXECUTE (للمراجعة)
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%EXECUTE%'
  AND routine_name NOT IN (
    'get_orders_complete_data',
    'get_product_complete_data', 
    'update_product_complete',
    'create_org_based_rls_policies' -- دوال آمنة معروفة
  );

-- =====================================================
-- 3. تعزيز الأمان - منع إنشاء دوال خطيرة مستقبلاً
-- =====================================================

-- إنشاء دالة للتحقق من أمان الدوال الجديدة
CREATE OR REPLACE FUNCTION check_function_security()
RETURNS trigger AS $$
BEGIN
  -- منع إنشاء دوال تحتوي على EXECUTE مع معاملات نصية
  IF NEW.prosrc ILIKE '%EXECUTE%' AND NEW.prosrc ILIKE '%$1%' THEN
    RAISE EXCEPTION 'Security violation: Functions with EXECUTE and text parameters are not allowed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق trigger على إنشاء الدوال (اختياري - قد يؤثر على العمليات العادية)
-- CREATE TRIGGER prevent_dangerous_functions
--   BEFORE INSERT OR UPDATE ON pg_proc
--   FOR EACH ROW
--   EXECUTE FUNCTION check_function_security();

-- =====================================================
-- 4. تدقيق الأمان - فحص الدوال الحالية
-- =====================================================

-- عرض جميع الدوال مع SECURITY DEFINER (تحتاج مراجعة)
SELECT 
  routine_name,
  security_type,
  definer_rights,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND security_type = 'DEFINER'
ORDER BY routine_name;

-- =====================================================
-- 5. فحص RLS وتعزيزها
-- =====================================================

-- عرض الجداول بدون RLS (خطر أمني)
SELECT 
  schemaname, 
  tablename,
  rowsecurity,
  (SELECT count(*) 
   FROM pg_policies 
   WHERE tablename = pg_tables.tablename 
   AND schemaname = pg_tables.schemaname) as policy_count
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
ORDER BY tablename;

-- تفعيل RLS على الجداول المهمة (إذا لم تكن مفعلة)
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND rowsecurity = false
          AND tablename IN (
            'users', 'organizations', 'products', 'orders', 
            'online_orders', 'customers', 'transactions'
          )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
        RAISE NOTICE 'RLS enabled for table: %', table_record.tablename;
    END LOOP;
END $$;

-- =====================================================
-- 6. إنشاء audit log للأمان
-- =====================================================

-- جدول تسجيل العمليات الأمنية
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- تفعيل RLS على جدول الأمان
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- سياسة أمان: فقط super admins يمكنهم قراءة السجلات
CREATE POLICY "Super admins can read audit logs" ON security_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- منع التعديل أو الحذف من سجل الأمان
CREATE POLICY "No modifications to audit logs" ON security_audit_log
  FOR UPDATE USING (false);

CREATE POLICY "No deletions from audit logs" ON security_audit_log
  FOR DELETE USING (false);

-- =====================================================
-- 7. دالة آمنة لتسجيل الأحداث الأمنية
-- =====================================================

CREATE OR REPLACE FUNCTION log_security_event(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
)
RETURNS void AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
BEGIN
  -- الحصول على معلومات المستخدم الحالي
  SELECT u.id, u.email INTO current_user_id, current_user_email
  FROM users u
  WHERE u.auth_user_id = auth.uid();
  
  -- إدراج سجل الأمان
  INSERT INTO security_audit_log (
    user_id,
    user_email,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    severity
  ) VALUES (
    current_user_id,
    current_user_email,
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    p_severity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحية للمستخدمين المصادقين
GRANT EXECUTE ON FUNCTION log_security_event TO authenticated;

-- =====================================================
-- 8. تسجيل هذا الإصلاح الأمني
-- =====================================================

-- تسجيل أن الإصلاح الأمني تم تطبيقه
SELECT log_security_event(
  'EMERGENCY_SECURITY_FIX_APPLIED',
  'database_functions',
  NULL,
  '{"dangerous_functions": ["exec_sql", "execute_sql", "query_tables"]}'::jsonb,
  '{"action": "functions_dropped", "rls_enforced": true, "audit_log_created": true}'::jsonb,
  'critical'
);

-- =====================================================
-- 9. التحقق النهائي من نجاح الإصلاح
-- =====================================================

-- يجب أن يكون الناتج فارغاً (لا توجد دوال خطيرة)
SELECT 'CRITICAL: Dangerous functions still exist!' as alert, routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('exec_sql', 'execute_sql', 'query_tables', 'execute_sql_file')
UNION ALL
SELECT 'SUCCESS: All dangerous functions removed' as alert, 'none' as routine_name
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.routines 
  WHERE routine_schema = 'public'
    AND routine_name IN ('exec_sql', 'execute_sql', 'query_tables', 'execute_sql_file')
);

-- عرض ملخص الأمان
SELECT 
  'Database Security Status' as category,
  count(CASE WHEN routine_definition ILIKE '%EXECUTE%' THEN 1 END) as functions_with_execute,
  count(CASE WHEN security_type = 'DEFINER' THEN 1 END) as security_definer_functions,
  count(*) as total_functions
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- عرض حالة RLS
SELECT 
  'RLS Status' as category,
  count(CASE WHEN rowsecurity = true THEN 1 END) as tables_with_rls,
  count(CASE WHEN rowsecurity = false THEN 1 END) as tables_without_rls,
  count(*) as total_tables
FROM pg_tables 
WHERE schemaname = 'public';

-- =====================================================
-- 🎯 النتيجة المتوقعة:
-- - جميع الدوال الخطيرة محذوفة
-- - RLS مفعلة على الجداول المهمة  
-- - نظام audit logging مطبق
-- - قاعدة البيانات آمنة من SQL Injection
-- =====================================================
