-- إصلاح مشكلة "ON CONFLICT specification" في جدول المنظمات

-- 1. إزالة القيود المتكررة الموجودة على حقل subdomain
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subdomain_key;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subdomain_unique;

-- 2. إعادة إنشاء قيد فريد واحد على حقل subdomain
ALTER TABLE organizations ADD CONSTRAINT organizations_subdomain_unique UNIQUE (subdomain);

-- 3. إزالة قيد الفرادة المركب إذا كان مطلوبًا
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_name_subdomain_key;

-- 4. تعديل الوظائف المستخدمة لإنشاء المنظمة
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
  SELECT id INTO existing_org_id
  FROM organizations
  WHERE subdomain = org_data->>'subdomain';
  
  IF existing_org_id IS NOT NULL THEN
    RAISE NOTICE 'تم العثور على منظمة بنفس النطاق الفرعي: %', existing_org_id;
    RETURN existing_org_id;
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
      org_data->>'subscription_tier',
      org_data->>'subscription_status',
      org_data->'settings'
    )
    RETURNING id INTO new_org_id;
    
    -- التحقق من وجود سجل في جدول إعدادات المنظمة
    SELECT EXISTS (
      SELECT 1 FROM organization_settings 
      WHERE organization_id = new_org_id
    ) INTO settings_exists;
    
    -- إذا لم يكن هناك سجل إعدادات، قم بإنشائه يدويًا
    IF NOT settings_exists THEN
      INSERT INTO organization_settings (
        organization_id,
        theme_primary_color,
        theme_secondary_color,
        theme_mode,
        site_name,
        default_language
      ) VALUES (
        new_org_id,
        '#0099ff',
        '#6c757d',
        'light',
        org_data->>'name',
        'ar'
      );
    END IF;
    
    -- إضافة سجل في جدول التدقيق
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
    
    -- تحديث المستخدم ليرتبط بالمنظمة الجديدة
    UPDATE users
    SET 
      organization_id = new_org_id,
      is_org_admin = TRUE,
      role = 'admin'
    WHERE id = user_id;
    
    RETURN new_org_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'حدث تكرار في البيانات، محاولة التعافي...';
      
      -- محاولة الحصول على معرف المنظمة الموجودة
      SELECT id INTO existing_org_id
      FROM organizations
      WHERE subdomain = org_data->>'subdomain';
      
      IF existing_org_id IS NOT NULL THEN
        RAISE NOTICE 'استرجاع المنظمة الموجودة مسبقًا بمعرف: %', existing_org_id;
        RETURN existing_org_id;
      ELSE
        -- إعادة إثارة الخطأ إذا لم نتمكن من العثور على المنظمة الموجودة
        RAISE;
      END IF;
    WHEN OTHERS THEN
      RAISE NOTICE 'حدث خطأ: %', SQLERRM;
      RAISE;
  END;
END;
$$;

-- منح صلاحيات تنفيذ الدالة
GRANT EXECUTE ON FUNCTION create_organization_with_audit(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_with_audit(JSONB, UUID) TO service_role; 