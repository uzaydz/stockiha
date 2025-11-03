-- Script لتحديث كلمة مرور السوبر أدمين
-- استخدم هذا Script مرة واحدة فقط لتحديث كلمة المرور

-- البحث عن حساب السوبر أدمين
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- البحث عن المستخدم
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'oussamaguetnri@gmail.com'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'تم العثور على المستخدم: %', v_user_id;

    -- تحديث كلمة المرور (اختر كلمة مرور قوية جديدة)
    -- كلمة المرور الجديدة: Ktobi3110@Super#2024
    -- (12+ حرف، أحرف كبيرة، صغيرة، أرقام، ورموز خاصة)

    UPDATE auth.users
    SET
      encrypted_password = crypt('Ktobi3110@Super#2024', gen_salt('bf')),
      updated_at = NOW()
    WHERE id = v_user_id;

    RAISE NOTICE 'تم تحديث كلمة المرور بنجاح!';
    RAISE NOTICE 'كلمة المرور الجديدة: Ktobi3110@Super#2024';
  ELSE
    RAISE NOTICE 'لم يتم العثور على المستخدم';
  END IF;
END $$;

-- التحقق من التحديث
SELECT
  auth.users.id,
  auth.users.email,
  public.users.is_super_admin,
  auth.users.created_at,
  auth.users.updated_at
FROM auth.users
JOIN public.users ON auth.users.id = public.users.auth_user_id
WHERE auth.users.email = 'oussamaguetnri@gmail.com';
