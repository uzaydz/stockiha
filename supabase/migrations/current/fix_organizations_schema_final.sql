-- إصلاح مشكلة "ON CONFLICT specification" في جدول المنظمات

-- 1. إزالة القيود المتكررة الموجودة على حقل subdomain
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subdomain_key;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subdomain_unique;
DROP INDEX IF EXISTS idx_organizations_subdomain;
DROP INDEX IF EXISTS organizations_subdomain_idx;

-- 2. إعادة إنشاء قيد فريد واحد على حقل subdomain
ALTER TABLE organizations ADD CONSTRAINT organizations_subdomain_unique UNIQUE (subdomain);

-- 3. إزالة قيد الفرادة المركب إذا كان موجودًا
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_name_subdomain_key;

-- 4. إزالة قيد الفرادة على حقل owner_id إذا كان موجودًا
-- هذا يسمح للمستخدم بأن يكون مالكًا لأكثر من منظمة واحدة
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_owner_id_key;

-- 5. تعديل وظيفة إنشاء المنظمة لتجنب مشكلة ON CONFLICT
CREATE OR REPLACE FUNCTION create_organization_with_audit(
  org_data JSONB,
  user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  settings_exists BOOLEAN;
  existing_org_id UUID;
BEGIN
  -- التحقق من صحة البيانات المدخلة
  IF org_data IS NULL OR user_id IS NULL THEN
    RAISE EXCEPTION 'بيانات المنظمة ومعرف المستخدم مطلوبان';
  END IF;

  -- التحقق أولاً من وجود المنظمة بنفس النطاق الفرعي
  IF org_data->>'subdomain' IS NOT NULL THEN
    SELECT id INTO existing_org_id
    FROM organizations
    WHERE subdomain = org_data->>'subdomain';
    
    IF existing_org_id IS NOT NULL THEN
      RAISE NOTICE 'تم العثور على منظمة بنفس النطاق الفرعي: %', existing_org_id;
      
      -- محاولة ربط المستخدم بالمنظمة الموجودة
      BEGIN
        UPDATE users
        SET 
          organization_id = existing_org_id,
          is_org_admin = TRUE,
          role = 'admin'
        WHERE id = user_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'فشل في ربط المستخدم بالمنظمة الموجودة: %', SQLERRM;
      END;
      
      RETURN existing_org_id;
    END IF;
  END IF;

  -- بدء معاملة قاعدة البيانات
  BEGIN
    -- إنشاء المنظمة الجديدة
    INSERT INTO organizations (
      name,
      description,
      logo_url,
      domain,
      subdomain,
      owner_id,
      subscription_tier,
      subscription_status,
      settings
    )
    VALUES (
      org_data->>'name',
      org_data->>'description',
      org_data->>'logo_url',
      org_data->>'domain',
      org_data->>'subdomain',
      COALESCE((org_data->>'owner_id')::UUID, user_id),
      COALESCE(org_data->>'subscription_tier', 'trial'),
      COALESCE(org_data->>'subscription_status', 'trial'),
      COALESCE(org_data->'settings', '{}'::jsonb)
    )
    RETURNING id INTO new_org_id;
    
    -- إضافة سجل في جدول التدقيق
    BEGIN
      INSERT INTO settings_audit_log (
        user_id,
        organization_id,
        setting_type,
        setting_key,
        action_type,
        table_name,
        record_id,
        new_value,
        old_value
      )
      VALUES (
        user_id,
        new_org_id,
        'organization',
        'creation',
        'INSERT',
        'organizations',
        new_org_id,
        org_data::TEXT,
        NULL
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'فشل في إنشاء سجل التدقيق: %', SQLERRM;
    END;
    
    -- تحديث المستخدم ليرتبط بالمنظمة الجديدة
    BEGIN
      UPDATE users
      SET 
        organization_id = new_org_id,
        is_org_admin = TRUE,
        role = 'admin'
      WHERE id = user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'فشل في تحديث معلومات المستخدم: %', SQLERRM;
    END;
    
    RETURN new_org_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'حدث تكرار في البيانات، محاولة التعافي...';
      
      -- محاولة الحصول على معرف المنظمة الموجودة
      IF org_data->>'subdomain' IS NOT NULL THEN
        SELECT id INTO existing_org_id
        FROM organizations
        WHERE subdomain = org_data->>'subdomain';
        
        IF existing_org_id IS NOT NULL THEN
          RAISE NOTICE 'استرجاع المنظمة الموجودة مسبقًا بمعرف: %', existing_org_id;
          RETURN existing_org_id;
        END IF;
      END IF;
      
      -- محاولة البحث عن منظمة بنفس المالك
      IF org_data->>'owner_id' IS NOT NULL THEN
        SELECT id INTO existing_org_id
        FROM organizations
        WHERE owner_id = (org_data->>'owner_id')::UUID;
        
        IF existing_org_id IS NOT NULL THEN
          RAISE NOTICE 'استرجاع المنظمة الموجودة للمالك بمعرف: %', existing_org_id;
          RETURN existing_org_id;
        END IF;
      END IF;
      
      -- إعادة إثارة الخطأ إذا لم نتمكن من العثور على المنظمة الموجودة
      RAISE;
    WHEN OTHERS THEN
      RAISE NOTICE 'حدث خطأ: %', SQLERRM;
      RAISE;
  END;
END;
$$;

-- منح صلاحيات تنفيذ الدالة
GRANT EXECUTE ON FUNCTION create_organization_with_audit(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_with_audit(JSONB, UUID) TO service_role;

-- تحديث الدالة المساعدة لإنشاء المنظمة من الواجهة الأمامية
DROP FUNCTION IF EXISTS create_organization(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_organization(
  org_name TEXT,
  org_description TEXT DEFAULT NULL,
  org_domain TEXT DEFAULT NULL,
  org_subdomain TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
  existing_org_id UUID;
BEGIN
  -- التحقق من وجود النطاق الفرعي أولًا
  IF org_subdomain IS NOT NULL THEN
    SELECT id INTO existing_org_id 
    FROM organizations 
    WHERE subdomain = org_subdomain;
    
    IF existing_org_id IS NOT NULL THEN
      -- ربط المستخدم بالمنظمة الموجودة
      UPDATE users
      SET 
        organization_id = existing_org_id,
        is_org_admin = TRUE
      WHERE id = auth.uid();
      
      RETURN existing_org_id;
    END IF;
  END IF;
  
  -- إنشاء منظمة جديدة
  INSERT INTO organizations (
    name, 
    description, 
    domain, 
    subdomain, 
    owner_id,
    subscription_tier,
    subscription_status,
    settings
  )
  VALUES (
    org_name, 
    org_description, 
    org_domain, 
    org_subdomain, 
    auth.uid(),
    'trial',
    'trial',
    jsonb_build_object(
      'theme', 'light',
      'primary_color', '#2563eb'
    )
  )
  RETURNING id INTO org_id;
  
  -- تحديث المستخدم
  UPDATE users
  SET 
    organization_id = org_id,
    is_org_admin = TRUE
  WHERE id = auth.uid();
  
  RETURN org_id;
EXCEPTION
  WHEN unique_violation THEN
    -- في حالة تكرار النطاق الفرعي
    SELECT id INTO existing_org_id 
    FROM organizations 
    WHERE subdomain = org_subdomain;
    
    IF existing_org_id IS NOT NULL THEN
      RETURN existing_org_id;
    ELSE
      -- في حالة فشل العثور على المنظمة الموجودة
      RAISE;
    END IF;
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- منح صلاحيات لدالة create_organization
GRANT EXECUTE ON FUNCTION create_organization(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization(TEXT, TEXT, TEXT, TEXT) TO service_role; 