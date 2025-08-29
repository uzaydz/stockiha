-- إصلاح مشكلة auth_user_id مرة واحدة وإلى الأبد
-- هذا الـ SQL يحل مشكلة عدم تطابق auth_user_id مع Supabase Auth

-- الخطوة 1: تحديث المستخدم المحدد (fghnbvn)
UPDATE users 
SET 
  auth_user_id = 'f2ffd6dd-dfe9-4340-8c67-d52376fa0291',
  updated_at = NOW()
WHERE 
  id = '342c52f5-b687-467e-ad34-490c73911bdb'
  AND email = 'uzaydz3ds8730730@gmail.com'
  AND name = 'fghnbvn';

-- الخطوة 2: التحقق من النتيجة
SELECT 
  id,
  name,
  email,
  role,
  auth_user_id,
  organization_id,
  is_active
FROM users 
WHERE email = 'uzaydz3ds8730730@gmail.com';

-- الخطوة 3: إنشاء دالة لإصلاح أي مشاكل مستقبلية
CREATE OR REPLACE FUNCTION fix_user_auth_link(
  user_email TEXT,
  correct_auth_user_id UUID
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  result JSONB;
BEGIN
  -- البحث عن المستخدم بالإيميل
  SELECT * INTO user_record 
  FROM users 
  WHERE email = user_email;
  
  -- التحقق من وجود المستخدم
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- تحديث auth_user_id
  UPDATE users 
  SET 
    auth_user_id = correct_auth_user_id,
    updated_at = NOW()
  WHERE email = user_email;
  
  -- إرجاع النتيجة
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إصلاح ربط المصادقة بنجاح',
    'user_id', user_record.id,
    'old_auth_user_id', user_record.auth_user_id,
    'new_auth_user_id', correct_auth_user_id
  );
END;
$$;

-- الخطوة 4: تطبيق الإصلاح على المستخدم الحالي
SELECT fix_user_auth_link(
  'uzaydz3ds8730730@gmail.com',
  'f2ffd6dd-dfe9-4340-8c67-d52376fa0291'::UUID
);

-- الخطوة 5: التحقق النهائي
SELECT 
  id,
  name, 
  email,
  role,
  auth_user_id,
  organization_id,
  permissions,
  is_active,
  CASE 
    WHEN auth_user_id = 'f2ffd6dd-dfe9-4340-8c67-d52376fa0291' THEN '✅ صحيح'
    ELSE '❌ خطأ'
  END as auth_status
FROM users 
WHERE email = 'uzaydz3ds8730730@gmail.com';
