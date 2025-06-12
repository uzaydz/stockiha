-- ملف إصلاح شامل لمشاكل تسجيل الدخول
-- يحل مشاكل auth_user_id = null و مشاكل RLS

-- ==================================================
-- 1. عرض المستخدمين الذين لديهم مشاكل
-- ==================================================

SELECT 
  'المستخدمون الذين لديهم auth_user_id = null' as description,
  COUNT(*) as count
FROM users 
WHERE auth_user_id IS NULL;

SELECT 
  id,
  email,
  name,
  auth_user_id,
  role,
  created_at,
  'يحتاج إصلاح' as status
FROM users 
WHERE auth_user_id IS NULL
ORDER BY created_at DESC;

-- ==================================================
-- 2. إصلاح المستخدمين الموجودين
-- ==================================================

-- إصلاح المستخدمين الذين لديهم مطابقة في auth.users
UPDATE users 
SET auth_user_id = users.id,
    updated_at = NOW()
WHERE auth_user_id IS NULL 
  AND users.id IN (
    SELECT au.id 
    FROM auth.users au 
    WHERE au.email = users.email
  );

-- ==================================================
-- 3. إصلاح المستخدم الحالي المحدد
-- ==================================================

-- إصلاح المستخدم u0z0ay0dz@gmail.com
UPDATE users 
SET auth_user_id = id,
    updated_at = NOW()
WHERE email = 'u0z0ay0dz@gmail.com' 
  AND auth_user_id IS NULL;

-- ==================================================
-- 4. التحقق من النتائج
-- ==================================================

SELECT 
  'تم إصلاحهم' as description,
  COUNT(*) as count
FROM users 
WHERE auth_user_id IS NOT NULL 
  AND updated_at > NOW() - INTERVAL '5 minutes';

SELECT 
  id,
  email,
  name,
  auth_user_id,
  role,
  updated_at,
  'تم إصلاحه' as status
FROM users 
WHERE auth_user_id IS NOT NULL 
  AND updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC;

-- ==================================================
-- 5. عرض أي مستخدمين ما زالت لديهم مشاكل
-- ==================================================

SELECT 
  id,
  email,
  name,
  auth_user_id,
  role,
  created_at,
  'ما زال يحتاج إصلاح' as status
FROM users 
WHERE auth_user_id IS NULL
ORDER BY created_at DESC;

-- ==================================================
-- 6. إنشاء trigger لمنع المشكلة مستقبلاً
-- ==================================================

-- دالة لضمان تعيين auth_user_id عند إنشاء مستخدم جديد
CREATE OR REPLACE FUNCTION ensure_auth_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا لم يتم تعيين auth_user_id، استخدم id
  IF NEW.auth_user_id IS NULL THEN
    NEW.auth_user_id := NEW.id;
  END IF;
  
  -- تحديث وقت التعديل
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للتشغيل عند INSERT و UPDATE
DROP TRIGGER IF EXISTS trigger_ensure_auth_user_id ON users;
CREATE TRIGGER trigger_ensure_auth_user_id
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_auth_user_id();

-- ==================================================
-- 7. إنشاء دالة للإصلاح التلقائي
-- ==================================================

CREATE OR REPLACE FUNCTION auto_fix_user_auth_id(user_email TEXT)
RETURNS JSON AS $$
DECLARE
  user_record users%ROWTYPE;
  auth_record auth.users%ROWTYPE;
  result JSON;
BEGIN
  -- البحث عن المستخدم في جدول users
  SELECT * INTO user_record 
  FROM users 
  WHERE email = user_email 
  LIMIT 1;
  
  -- البحث عن المستخدم في auth.users
  SELECT * INTO auth_record 
  FROM auth.users 
  WHERE email = user_email 
  LIMIT 1;
  
  -- إذا كان المستخدم موجود في users ولكن auth_user_id فارغ
  IF user_record.id IS NOT NULL AND user_record.auth_user_id IS NULL AND auth_record.id IS NOT NULL THEN
    UPDATE users 
    SET auth_user_id = auth_record.id,
        updated_at = NOW()
    WHERE id = user_record.id;
    
    result := json_build_object(
      'success', true,
      'action', 'fixed',
      'message', 'تم إصلاح auth_user_id',
      'user_id', user_record.id,
      'email', user_email
    );
  ELSIF user_record.id IS NOT NULL AND user_record.auth_user_id IS NOT NULL THEN
    result := json_build_object(
      'success', true,
      'action', 'already_fixed',
      'message', 'المستخدم محدث بالفعل',
      'user_id', user_record.id,
      'email', user_email
    );
  ELSE
    result := json_build_object(
      'success', false,
      'action', 'not_found',
      'message', 'المستخدم غير موجود',
      'user_id', null,
      'email', user_email
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION auto_fix_user_auth_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_fix_user_auth_id(TEXT) TO service_role;

-- ==================================================
-- 8. اختبار الدالة الجديدة
-- ==================================================

-- اختبار الدالة على المستخدم الحالي
SELECT auto_fix_user_auth_id('u0z0ay0dz@gmail.com') as fix_result;

-- ==================================================
-- 9. تقرير نهائي
-- ==================================================

SELECT 
  'تقرير نهائي' as report_type,
  (SELECT COUNT(*) FROM users WHERE auth_user_id IS NOT NULL) as users_fixed,
  (SELECT COUNT(*) FROM users WHERE auth_user_id IS NULL) as users_still_broken,
  (SELECT COUNT(*) FROM users) as total_users;

-- عرض جميع المستخدمين مع حالتهم
SELECT 
  id,
  email,
  name,
  CASE 
    WHEN auth_user_id IS NOT NULL THEN 'محدث بشكل صحيح'
    ELSE 'يحتاج إصلاح'
  END as status,
  auth_user_id,
  role,
  created_at,
  updated_at
FROM users 
ORDER BY 
  CASE WHEN auth_user_id IS NULL THEN 0 ELSE 1 END,
  created_at DESC; 