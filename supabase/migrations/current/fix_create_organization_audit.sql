-- تعديل دالة create_organization_with_audit لمعالجة مشكلة user_id null

-- إعادة تعريف الدالة بشكل يتعامل بشكل أفضل مع user_id
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
  v_user_id UUID;
BEGIN
  -- التحقق من معرف المستخدم
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'معرف المستخدم لا يمكن أن يكون فارغاً';
  END IF;

  -- تخزين معرف المستخدم المؤكد
  v_user_id := user_id;

  -- إنشاء المؤسسة الجديدة
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
    (org_data->>'owner_id')::UUID,
    org_data->>'subscription_tier',
    org_data->>'subscription_status',
    org_data->'settings'
  )
  RETURNING id INTO new_org_id;
  
  -- إضافة سجل تدقيق مع معرف المستخدم المؤكد
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
    v_user_id,
    new_org_id,
    'organization',
    'creation',
    'INSERT',
    'organizations',
    new_org_id,
    org_data,
    NULL
  );
  
  -- تحديث المستخدم بمعرف المنظمة وجعله مسؤول
  UPDATE users
  SET 
    organization_id = new_org_id,
    is_org_admin = TRUE
  WHERE id = v_user_id;
  
  RETURN new_org_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'حدث خطأ في إنشاء المنظمة: %', SQLERRM;
    RAISE;
END;
$$;

-- منح صلاحيات تنفيذ الدالة
GRANT EXECUTE ON FUNCTION create_organization_with_audit(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_with_audit(JSONB, UUID) TO service_role; 