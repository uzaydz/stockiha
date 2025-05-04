-- دالة آمنة لإنشاء منظمة جديدة مع تسجيل العملية في جدول التدقيق
-- تم تصميم الدالة لمعالجة التحديات الحالية:
-- 1. معالجة مشكلة user_id الفارغ في جدول settings_audit_log
-- 2. تجنب الإدراج المكرر في جدول organization_settings (تصادم unique_org_settings)
-- 3. التأكد من إجراء كل العمليات داخل معاملة واحدة (transaction)

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
BEGIN
  -- التحقق من صحة البيانات المدخلة
  IF org_data IS NULL OR user_id IS NULL THEN
    RAISE EXCEPTION 'بيانات المنظمة ومعرف المستخدم مطلوبان';
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
      IF SQLERRM LIKE '%organizations_subdomain_key%' THEN
        -- إذا كان النطاق الفرعي موجودًا بالفعل
        SELECT id INTO new_org_id
        FROM organizations
        WHERE subdomain = org_data->>'subdomain';
        
        RAISE NOTICE 'استرجاع المنظمة الموجودة مسبقًا بمعرف: %', new_org_id;
        RETURN new_org_id;
      ELSIF SQLERRM LIKE '%unique_org_settings%' THEN
        -- إذا كانت الإعدادات موجودة بالفعل
        RAISE NOTICE 'إعدادات المنظمة موجودة بالفعل، تخطي إنشاء الإعدادات';
        RETURN new_org_id;
      ELSE
        -- إعادة إثارة الخطأ إذا كان نوعًا آخر من تكرار البيانات
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