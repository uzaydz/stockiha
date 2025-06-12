-- إصلاح المستخدمين الذين لديهم auth_user_id = null
-- هذا المشكل يسبب مشاكل في RLS (Row Level Security)

-- أولاً، دعنا نرى المستخدمين الذين لديهم مشكلة
SELECT 
  id,
  email,
  name,
  auth_user_id,
  created_at
FROM users 
WHERE auth_user_id IS NULL
ORDER BY created_at DESC;

-- إصلاح المستخدمين بتحديث auth_user_id ليطابق id
UPDATE users 
SET auth_user_id = id,
    updated_at = NOW()
WHERE auth_user_id IS NULL 
  AND id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = users.email
  );

-- التحقق من النتيجة
SELECT 
  id,
  email,
  name,
  auth_user_id,
  'Fixed' as status
FROM users 
WHERE auth_user_id = id 
  AND updated_at > NOW() - INTERVAL '1 minute';

-- عرض أي مستخدمين ما زالت لديهم مشكلة
SELECT 
  id,
  email,
  name,
  auth_user_id,
  'Still broken' as status
FROM users 
WHERE auth_user_id IS NULL; 