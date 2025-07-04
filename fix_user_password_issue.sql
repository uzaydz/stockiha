-- إصلاح مشكلة كلمات المرور للمستخدمين الموجودين
-- المشكلة: كلمات المرور لا تتطابق مع ما يدخله المستخدم عند محاولة تسجيل الدخول

-- 1. تحديث كلمة المرور للمستخدم الأول
UPDATE auth.users 
SET 
  encrypted_password = crypt('123456', gen_salt('bf')), -- كلمة مرور بسيطة للاختبار
  updated_at = now()
WHERE email = 'uz256vaydzx0x@gmail.com';

-- 2. تحديث كلمة المرور للمستخدم الثاني  
UPDATE auth.users 
SET 
  encrypted_password = crypt('123456', gen_salt('bf')), -- نفس كلمة المرور للاختبار
  updated_at = now()
WHERE email = 'dalelou01ssam01ag@gmail.com';

-- 3. التأكد من أن المستخدمين مفعلين
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmed_at = COALESCE(confirmed_at, now()),
  updated_at = now()
WHERE email IN ('uz256vaydzx0x@gmail.com', 'dalelou01ssam01ag@gmail.com');

-- 4. إنشاء function لإعادة تعيين كلمة المرور بشكل آمن
CREATE OR REPLACE FUNCTION reset_user_password(user_email text, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من وجود المستخدم
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'المستخدم غير موجود: %', user_email;
  END IF;
  
  -- تحديث كلمة المرور
  UPDATE auth.users 
  SET 
    encrypted_password = crypt(new_password, gen_salt('bf')),
    updated_at = now()
  WHERE email = user_email;
  
  -- تسجيل العملية
  INSERT INTO audit_logs (
    action, 
    details, 
    user_id, 
    created_at
  ) VALUES (
    'password_reset',
    jsonb_build_object(
      'email', user_email,
      'reset_at', now()
    ),
    (SELECT id FROM auth.users WHERE email = user_email),
    now()
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'فشل في إعادة تعيين كلمة المرور: %', SQLERRM;
END;
$$;

-- 5. إنشاء function لاختبار تسجيل الدخول
CREATE OR REPLACE FUNCTION test_user_login(user_email text, test_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_password text;
  is_match boolean;
BEGIN
  -- جلب كلمة المرور المشفرة
  SELECT encrypted_password INTO stored_password
  FROM auth.users 
  WHERE email = user_email;
  
  IF stored_password IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود أو لا يملك كلمة مرور: %', user_email;
  END IF;
  
  -- اختبار تطابق كلمة المرور
  is_match := (stored_password = crypt(test_password, stored_password));
  
  RETURN is_match;
END;
$$;

-- 6. تشخيص حالة المستخدمين
SELECT 
  email,
  encrypted_password IS NOT NULL as has_password,
  LENGTH(encrypted_password) as password_length,
  email_confirmed_at IS NOT NULL as email_confirmed,
  confirmed_at IS NOT NULL as confirmed,
  created_at,
  last_sign_in_at,
  banned_until,
  deleted_at
FROM auth.users 
WHERE email IN ('uz256vaydzx0x@gmail.com', 'dalelou01ssam01ag@gmail.com')
ORDER BY created_at DESC;

-- 7. اختبار كلمات المرور بعد التحديث
SELECT 
  email,
  test_user_login(email, '123456') as password_test_result
FROM auth.users 
WHERE email IN ('uz256vaydzx0x@gmail.com', 'dalelou01ssam01ag@gmail.com'); 