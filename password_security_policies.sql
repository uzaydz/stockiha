-- سياسات الأمان لنظام تغيير كلمة المرور
-- هذا الملف يحتوي على إعدادات الأمان المطلوبة

-- 1. إنشاء دالة للتحقق من قوة كلمة المرور
CREATE OR REPLACE FUNCTION check_password_strength(password text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  min_length boolean := length(password) >= 8;
  has_uppercase boolean := password ~ '[A-Z]';
  has_lowercase boolean := password ~ '[a-z]';
  has_number boolean := password ~ '[0-9]';
  has_special boolean := password ~ '[!@#$%^&*(),.?":{}|<>]';
  is_strong boolean;
BEGIN
  is_strong := min_length AND has_uppercase AND has_lowercase AND has_number AND has_special;
  
  result := jsonb_build_object(
    'is_strong', is_strong,
    'requirements', jsonb_build_object(
      'min_length', min_length,
      'has_uppercase', has_uppercase,
      'has_lowercase', has_lowercase,
      'has_number', has_number,
      'has_special', has_special
    )
  );
  
  RETURN result;
END;
$$;

-- 2. إنشاء جدول لتسجيل محاولات تغيير كلمة المرور
CREATE TABLE IF NOT EXISTS password_change_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_at timestamptz DEFAULT NOW(),
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  failure_reason text,
  created_at timestamptz DEFAULT NOW()
);

-- 3. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_password_change_logs_user_id ON password_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_password_change_logs_changed_at ON password_change_logs(changed_at);

-- 4. تفعيل RLS على جدول password_change_logs
ALTER TABLE password_change_logs ENABLE ROW LEVEL SECURITY;

-- 5. سياسة للسماح للمستخدمين برؤية سجلاتهم فقط
CREATE POLICY "Users can view their own password change logs"
ON password_change_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 6. سياسة للسماح بإدراج سجلات جديدة
CREATE POLICY "Users can insert their own password change logs"
ON password_change_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7. سياسة للمديرين لرؤية جميع السجلات
CREATE POLICY "Admins can view all password change logs"
ON password_change_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (users.is_super_admin = true OR users.is_org_admin = true)
  )
);

-- 8. دالة لتسجيل محاولة تغيير كلمة المرور
CREATE OR REPLACE FUNCTION log_password_change(
  success_status boolean DEFAULT true,
  failure_reason_text text DEFAULT NULL,
  client_ip inet DEFAULT NULL,
  client_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO password_change_logs (
    user_id,
    success,
    failure_reason,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    success_status,
    failure_reason_text,
    client_ip,
    client_user_agent
  );
END;
$$;

-- 9. دالة للحصول على إحصائيات تغيير كلمة المرور للمستخدم
CREATE OR REPLACE FUNCTION get_password_change_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  total_changes integer;
  successful_changes integer;
  failed_changes integer;
  last_change timestamptz;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'المستخدم غير مصادق عليه');
  END IF;
  
  -- حساب الإحصائيات
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE success = true),
    COUNT(*) FILTER (WHERE success = false),
    MAX(changed_at)
  INTO total_changes, successful_changes, failed_changes, last_change
  FROM password_change_logs
  WHERE user_id = current_user_id;
  
  result := jsonb_build_object(
    'total_changes', COALESCE(total_changes, 0),
    'successful_changes', COALESCE(successful_changes, 0),
    'failed_changes', COALESCE(failed_changes, 0),
    'last_change', last_change,
    'success_rate', 
      CASE 
        WHEN total_changes > 0 THEN 
          ROUND((successful_changes::decimal / total_changes::decimal) * 100, 2)
        ELSE 0 
      END
  );
  
  RETURN result;
END;
$$;

-- 10. دالة للتحقق من محاولات تغيير كلمة المرور المتكررة
CREATE OR REPLACE FUNCTION check_password_change_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  recent_attempts integer;
  max_attempts integer := 5; -- الحد الأقصى للمحاولات في الساعة
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- حساب المحاولات في الساعة الماضية
  SELECT COUNT(*)
  INTO recent_attempts
  FROM password_change_logs
  WHERE user_id = current_user_id
    AND changed_at > NOW() - INTERVAL '1 hour';
  
  RETURN recent_attempts < max_attempts;
END;
$$;

-- 11. دالة لإعادة تعيين محاولات تغيير كلمة المرور (للمديرين)
CREATE OR REPLACE FUNCTION reset_password_change_attempts(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
BEGIN
  current_user_id := auth.uid();
  
  -- التحقق من صلاحيات المدير
  SELECT (is_super_admin = true OR is_org_admin = true)
  INTO is_admin
  FROM users
  WHERE id = current_user_id;
  
  IF NOT is_admin THEN
    RETURN false;
  END IF;
  
  -- حذف السجلات القديمة للمستخدم المحدد
  DELETE FROM password_change_logs
  WHERE user_id = target_user_id
    AND changed_at > NOW() - INTERVAL '1 hour';
  
  RETURN true;
END;
$$;

-- 12. منح الصلاحيات للمستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION check_password_strength(text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_password_change(boolean, text, inet, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_password_change_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION check_password_change_rate_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_password_change_attempts(uuid) TO authenticated;

-- 13. إنشاء trigger لتسجيل تغييرات كلمة المرور تلقائياً
-- ملاحظة: هذا يتطلب إعداد إضافي في Supabase Edge Functions

-- 14. إعدادات إضافية للأمان
-- تحديث إعدادات auth في Supabase
-- يجب تطبيق هذه الإعدادات في Supabase Dashboard:

/*
Auth Settings:
- Password minimum length: 8
- Password complexity: enabled
- Password reuse prevention: enabled (last 5 passwords)
- Account lockout: enabled after 5 failed attempts
- Session timeout: 24 hours
- Email confirmation required: true
- Phone confirmation: optional
*/

-- 15. دالة للتحقق من آخر تغيير لكلمة المرور
CREATE OR REPLACE FUNCTION get_last_password_change()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  last_change timestamptz;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT MAX(changed_at)
  INTO last_change
  FROM password_change_logs
  WHERE user_id = current_user_id
    AND success = true;
  
  -- إذا لم توجد سجلات، استخدم تاريخ إنشاء الحساب
  IF last_change IS NULL THEN
    SELECT created_at
    INTO last_change
    FROM auth.users
    WHERE id = current_user_id;
  END IF;
  
  RETURN last_change;
END;
$$;

-- 16. دالة للتحقق من ضرورة تغيير كلمة المرور
CREATE OR REPLACE FUNCTION should_change_password()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_change timestamptz;
  max_age interval := '90 days'; -- تغيير كلمة المرور كل 90 يوم
BEGIN
  last_change := get_last_password_change();
  
  IF last_change IS NULL THEN
    RETURN true; -- إذا لم يتم تغيير كلمة المرور من قبل
  END IF;
  
  RETURN (NOW() - last_change) > max_age;
END;
$$;

-- منح الصلاحيات للدوال الجديدة
GRANT EXECUTE ON FUNCTION get_last_password_change() TO authenticated;
GRANT EXECUTE ON FUNCTION should_change_password() TO authenticated;

-- 17. إنشاء view لإحصائيات الأمان (للمديرين)
CREATE OR REPLACE VIEW password_security_stats AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  get_last_password_change() as last_password_change,
  should_change_password() as needs_password_change,
  (
    SELECT COUNT(*)
    FROM password_change_logs pcl
    WHERE pcl.user_id = u.id
      AND pcl.changed_at > NOW() - INTERVAL '30 days'
  ) as changes_last_30_days,
  (
    SELECT COUNT(*)
    FROM password_change_logs pcl
    WHERE pcl.user_id = u.id
      AND pcl.success = false
      AND pcl.changed_at > NOW() - INTERVAL '7 days'
  ) as failed_attempts_last_7_days
FROM users u
WHERE EXISTS (
  SELECT 1 FROM users admin_user
  WHERE admin_user.id = auth.uid()
    AND (admin_user.is_super_admin = true OR admin_user.is_org_admin = true)
);

-- منح صلاحية عرض الإحصائيات للمديرين
GRANT SELECT ON password_security_stats TO authenticated;

-- تعليقات ختامية
COMMENT ON FUNCTION check_password_strength IS 'التحقق من قوة كلمة المرور وإرجاع تقرير مفصل';
COMMENT ON FUNCTION log_password_change IS 'تسجيل محاولة تغيير كلمة المرور';
COMMENT ON FUNCTION get_password_change_stats IS 'الحصول على إحصائيات تغيير كلمة المرور للمستخدم الحالي';
COMMENT ON FUNCTION check_password_change_rate_limit IS 'التحقق من عدم تجاوز حد المحاولات المسموح';
COMMENT ON TABLE password_change_logs IS 'سجل محاولات تغيير كلمة المرور';
COMMENT ON VIEW password_security_stats IS 'إحصائيات الأمان لكلمات المرور (للمديرين فقط)'; 