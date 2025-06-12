-- دالة لإصلاح مشاكل المستخدمين المتعلقة بـ auth_user_id
CREATE OR REPLACE FUNCTION fix_user_auth_id(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record users%ROWTYPE;
  auth_user_record auth.users%ROWTYPE;
  result json;
BEGIN
  -- البحث عن المستخدم في جدول users
  SELECT * INTO user_record 
  FROM users 
  WHERE email = user_email 
  LIMIT 1;
  
  -- البحث عن المستخدم في جدول auth.users
  SELECT * INTO auth_user_record 
  FROM auth.users 
  WHERE email = user_email 
  LIMIT 1;
  
  -- إذا كان المستخدم موجود في auth.users ولكن غير موجود في users
  IF auth_user_record.id IS NOT NULL AND user_record.id IS NULL THEN
    INSERT INTO users (
      id, 
      auth_user_id, 
      email, 
      name, 
      role, 
      is_active,
      created_at,
      updated_at
    ) VALUES (
      auth_user_record.id,
      auth_user_record.id,
      auth_user_record.email,
      COALESCE(
        auth_user_record.raw_user_meta_data->>'name',
        auth_user_record.raw_user_meta_data->>'full_name',
        split_part(auth_user_record.email, '@', 1)
      ),
      COALESCE(auth_user_record.raw_user_meta_data->>'role', 'customer'),
      true,
      auth_user_record.created_at,
      NOW()
    );
    
    result := json_build_object(
      'success', true,
      'action', 'created',
      'message', 'تم إنشاء المستخدم بنجاح',
      'user_id', auth_user_record.id
    );
    
  -- إذا كان المستخدم موجود في users ولكن auth_user_id فارغ
  ELSIF user_record.id IS NOT NULL AND user_record.auth_user_id IS NULL AND auth_user_record.id IS NOT NULL THEN
    UPDATE users 
    SET auth_user_id = auth_user_record.id,
        updated_at = NOW()
    WHERE id = user_record.id;
    
    result := json_build_object(
      'success', true,
      'action', 'updated',
      'message', 'تم تحديث auth_user_id بنجاح',
      'user_id', user_record.id
    );
    
  -- إذا كان المستخدم موجود ومحدث بشكل صحيح
  ELSIF user_record.id IS NOT NULL AND user_record.auth_user_id IS NOT NULL THEN
    result := json_build_object(
      'success', true,
      'action', 'none',
      'message', 'المستخدم محدث بشكل صحيح',
      'user_id', user_record.id
    );
    
  -- إذا لم يتم العثور على المستخدم في auth.users
  ELSIF auth_user_record.id IS NULL THEN
    result := json_build_object(
      'success', false,
      'action', 'none',
      'message', 'المستخدم غير موجود في نظام المصادقة',
      'user_id', null
    );
    
  ELSE
    result := json_build_object(
      'success', false,
      'action', 'none',
      'message', 'حالة غير معروفة',
      'user_id', null
    );
  END IF;
  
  RETURN result;
END;
$$;

-- دالة لإصلاح جميع المستخدمين
CREATE OR REPLACE FUNCTION fix_all_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user_record auth.users%ROWTYPE;
  fix_result json;
  total_fixed integer := 0;
  total_errors integer := 0;
  results json[] := '{}';
BEGIN
  -- المرور عبر جميع المستخدمين في auth.users
  FOR auth_user_record IN 
    SELECT * FROM auth.users 
    WHERE email IS NOT NULL
  LOOP
    BEGIN
      -- إصلاح كل مستخدم
      SELECT fix_user_auth_id(auth_user_record.email) INTO fix_result;
      
      -- إضافة النتيجة إلى المصفوفة
      results := results || fix_result;
      
      -- عد النتائج
      IF (fix_result->>'success')::boolean THEN
        total_fixed := total_fixed + 1;
      ELSE
        total_errors := total_errors + 1;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        total_errors := total_errors + 1;
        results := results || json_build_object(
          'success', false,
          'action', 'error',
          'message', 'خطأ في معالجة المستخدم: ' || SQLERRM,
          'email', auth_user_record.email
        );
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'total_fixed', total_fixed,
    'total_errors', total_errors,
    'results', results
  );
END;
$$;

-- منح الصلاحيات للمستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION fix_user_auth_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_all_users() TO authenticated; 