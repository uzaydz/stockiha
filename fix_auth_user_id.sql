-- إصلاح ربط auth_user_id في جدول users
-- هذا الملف يقوم بربط المستخدمين في جدول users مع auth.users

-- أولاً: تحديث auth_user_id للمستخدمين الموجودين
UPDATE users 
SET auth_user_id = id 
WHERE auth_user_id IS NULL 
AND id IN (SELECT id FROM auth.users);

-- التحقق من النتائج
SELECT 
  u.id,
  u.email,
  u.name,
  u.auth_user_id,
  au.email as auth_email,
  CASE 
    WHEN u.auth_user_id IS NOT NULL THEN 'مربوط'
    ELSE 'غير مربوط'
  END as status
FROM users u
LEFT JOIN auth.users au ON u.auth_user_id = au.id
ORDER BY u.created_at DESC
LIMIT 10;

-- إنشاء دالة لجلب الملف الشخصي بطريقة محسنة
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  job_title text,
  bio text,
  birth_date date,
  gender text,
  address text,
  city text,
  country text,
  role text,
  is_org_admin boolean,
  is_super_admin boolean,
  status text,
  last_activity_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  whatsapp_phone text,
  whatsapp_connected boolean,
  whatsapp_enabled boolean,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  current_user_id := auth.uid();
  
  -- التحقق من أن المستخدم مصادق عليه
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير مصادق عليه';
  END IF;
  
  -- جلب بيانات المستخدم
  RETURN QUERY
  SELECT 
    u.id,
    COALESCE(u.email, au.email) as email,
    u.name,
    u.first_name,
    u.last_name,
    u.phone,
    u.avatar_url,
    u.job_title,
    u.bio,
    u.birth_date,
    u.gender,
    u.address,
    u.city,
    u.country,
    u.role,
    u.is_org_admin,
    u.is_super_admin,
    u.status,
    u.last_activity_at,
    u.created_at,
    u.updated_at,
    u.whatsapp_phone,
    u.whatsapp_connected,
    u.whatsapp_enabled,
    u.organization_id
  FROM users u
  LEFT JOIN auth.users au ON u.id = au.id OR u.auth_user_id = au.id
  WHERE u.id = current_user_id OR u.auth_user_id = current_user_id;
END;
$$;

-- منح الصلاحيات للمستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION get_user_profile() TO authenticated;

-- إنشاء دالة لتحديث الملف الشخصي
CREATE OR REPLACE FUNCTION update_user_profile(
  profile_data jsonb
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  updated_profile record;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  current_user_id := auth.uid();
  
  -- التحقق من أن المستخدم مصادق عليه
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المستخدم غير مصادق عليه'
    );
  END IF;
  
  -- تحديث بيانات المستخدم
  UPDATE users 
  SET 
    name = COALESCE(profile_data->>'name', name),
    first_name = COALESCE(profile_data->>'first_name', first_name),
    last_name = COALESCE(profile_data->>'last_name', last_name),
    phone = COALESCE(profile_data->>'phone', phone),
    job_title = COALESCE(profile_data->>'job_title', job_title),
    bio = COALESCE(profile_data->>'bio', bio),
    birth_date = COALESCE((profile_data->>'birth_date')::date, birth_date),
    gender = COALESCE(profile_data->>'gender', gender),
    address = COALESCE(profile_data->>'address', address),
    city = COALESCE(profile_data->>'city', city),
    country = COALESCE(profile_data->>'country', country),
    status = COALESCE(profile_data->>'status', status),
    whatsapp_phone = COALESCE(profile_data->>'whatsapp_phone', whatsapp_phone),
    whatsapp_enabled = COALESCE((profile_data->>'whatsapp_enabled')::boolean, whatsapp_enabled),
    updated_at = NOW()
  WHERE id = current_user_id OR auth_user_id = current_user_id
  RETURNING *;
  
  -- التحقق من نجاح التحديث
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'المستخدم غير موجود'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم تحديث الملف الشخصي بنجاح'
  );
END;
$$;

-- منح الصلاحيات للمستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION update_user_profile(jsonb) TO authenticated; 