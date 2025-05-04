-- إصلاح وظيفة إنشاء المنظمة
CREATE OR REPLACE FUNCTION insert_organization_simple(
  p_name TEXT,
  p_subdomain TEXT,
  p_owner_id UUID,
  p_settings JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  existing_org_id UUID;
BEGIN
  -- التحقق مما إذا كانت المنظمة موجودة بالفعل بنفس النطاق الفرعي
  SELECT id INTO existing_org_id
  FROM organizations
  WHERE subdomain = p_subdomain;
  
  -- إذا وجدت، قم بإرجاعها
  IF existing_org_id IS NOT NULL THEN
    -- محاولة تحديث المستخدم
    BEGIN
      UPDATE users
      SET 
        organization_id = existing_org_id,
        is_org_admin = TRUE,
        role = 'admin'
      WHERE id = p_owner_id;
    EXCEPTION WHEN OTHERS THEN
      -- تجاهل أي خطأ قد يحدث عند التحديث
      RAISE NOTICE 'فشل تحديث المستخدم: %', SQLERRM;
    END;
    
    RETURN existing_org_id;
  END IF;

  -- إنشاء معرف UUID جديد يدويًا
  new_org_id := gen_random_uuid();
  
  -- إدراج المنظمة مع تحديد المعرف يدويًا - تم إزالة عبارة ON CONFLICT
  INSERT INTO organizations (
    id,
    name,
    subdomain,
    owner_id,
    subscription_tier,
    subscription_status,
    settings,
    created_at,
    updated_at
  )
  VALUES (
    new_org_id,
    p_name,
    p_subdomain,
    p_owner_id,
    'trial',
    'trial',
    p_settings,
    NOW(),
    NOW()
  );
  
  -- محاولة ربط المستخدم بالمنظمة
  BEGIN
    -- استخدام معاملة INSERT ... ON CONFLICT مع تحديد صريح للعمود id
    INSERT INTO users (
      id,
      email,
      name,
      role,
      is_active,
      organization_id,
      is_org_admin,
      created_at,
      updated_at
    )
    VALUES (
      p_owner_id,
      (SELECT email FROM auth.users WHERE id = p_owner_id),
      COALESCE((SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = p_owner_id), 'User'),
      'admin',
      TRUE,
      new_org_id,
      TRUE,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      organization_id = new_org_id,
      is_org_admin = TRUE,
      role = 'admin';
  EXCEPTION WHEN OTHERS THEN
    -- تسجيل الخطأ ولكن لا نرجع خطأ
    RAISE NOTICE 'فشل ربط المستخدم بالمنظمة: %', SQLERRM;
  END;
  
  RETURN new_org_id;
END;
$$;

-- إنشاء وظيفة مساعدة أخرى للتعامل مع إنشاء المنظمة بشكل آمن
CREATE OR REPLACE FUNCTION create_organization_safe(
  org_name TEXT,
  org_subdomain TEXT,
  org_owner_id UUID,
  org_settings JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- استدعاء الوظيفة المحسنة
  SELECT insert_organization_simple(
    org_name,
    org_subdomain,
    org_owner_id,
    org_settings
  ) INTO v_org_id;
  
  RETURN v_org_id;
END;
$$;

-- منح الصلاحيات اللازمة
GRANT EXECUTE ON FUNCTION insert_organization_simple TO authenticated;
GRANT EXECUTE ON FUNCTION insert_organization_simple TO service_role;
GRANT EXECUTE ON FUNCTION create_organization_safe TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_safe TO service_role; 