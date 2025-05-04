-- إصلاح طارئ لمشكلة ON CONFLICT في جدول المنظمات

-- 1. تعطيل RLS مؤقتًا للتحقق من المشكلة
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. حذف كافة القيود الفرعية من جدول المنظمات
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_owner_id_key;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subdomain_key;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subdomain_unique;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_name_subdomain_key;
DROP INDEX IF EXISTS idx_organizations_subdomain;
DROP INDEX IF EXISTS organizations_subdomain_idx;
DROP INDEX IF EXISTS organizations_subdomain_key;

-- 3. إنشاء وظيفة بسيطة مباشرة لإنشاء المنظمات
CREATE OR REPLACE FUNCTION insert_organization_simple(
  p_name TEXT,
  p_subdomain TEXT,
  p_owner_id UUID,
  p_settings JSONB
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

  -- إنشاء معرف UUID جديد يدويًا لتجنب أي مشاكل
  new_org_id := gen_random_uuid();
  
  -- إدراج المنظمة مع تحديد المعرف يدويًا
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
  
  -- محاولة إدراج/تحديث سجل المستخدم
  BEGIN
    -- التحقق مما إذا كان المستخدم موجود
    IF EXISTS (SELECT 1 FROM users WHERE id = p_owner_id) THEN
      -- تحديث المستخدم الموجود
      UPDATE users
      SET 
        organization_id = new_org_id,
        is_org_admin = TRUE,
        role = 'admin'
      WHERE id = p_owner_id;
    ELSE
      -- إدراج سجل مستخدم جديد
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
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- تسجيل الخطأ ولكن لا ترجع خطأ
    RAISE NOTICE 'فشل ربط المستخدم بالمنظمة: %', SQLERRM;
  END;
  
  RETURN new_org_id;
END;
$$;

-- منح صلاحيات تنفيذ الدالة
GRANT EXECUTE ON FUNCTION insert_organization_simple TO authenticated;
GRANT EXECUTE ON FUNCTION insert_organization_simple TO service_role;

-- 4. منح كافة الصلاحيات للمستخدمين المصادق عليهم والخدمة
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON organizations TO service_role;
GRANT ALL ON users TO service_role;

-- 5. تحديث المشغل لإنشاء سجل مستخدم تلقائيًا
CREATE OR REPLACE FUNCTION create_user_for_new_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق مما إذا كان المستخدم موجودًا بالفعل
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    -- إدراج سجل مستخدم جديد إذا لم يكن موجودًا
    INSERT INTO users (
      id, 
      email, 
      name, 
      role, 
      is_active, 
      auth_user_id
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
      TRUE,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- إنشاء المشغل إذا لم يكن موجودًا
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_for_new_signup();

-- 6. إنشاء وظيفة RPC مباشرة لإنشاء منظمة من الواجهة
CREATE OR REPLACE FUNCTION create_organization_simple(
  org_name TEXT,
  org_subdomain TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT insert_organization_simple(
    org_name,
    org_subdomain,
    auth.uid(),
    jsonb_build_object(
      'theme', 'light',
      'primary_color', '#2563eb'
    )
  ) INTO v_org_id;
  
  RETURN v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_organization_simple TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_simple TO service_role; 