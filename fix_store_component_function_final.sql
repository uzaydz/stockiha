-- إصلاح نهائي لمشكلة تعارض الدوال upsert_store_component في قاعدة البيانات
-- هذا الملف يقوم بحذف كلتا النسختين من الدوال وإنشاء نسخة واحدة فقط بالترتيب الصحيح

-- أولاً: حذف جميع نسخ الدالة upsert_store_component
DROP FUNCTION IF EXISTS public.upsert_store_component(UUID, UUID, TEXT, JSONB, BOOLEAN, INTEGER);
DROP FUNCTION IF EXISTS public.upsert_store_component(UUID, TEXT, BOOLEAN, INTEGER, UUID, JSONB);
DROP FUNCTION IF EXISTS public.upsert_store_component(UUID, TEXT, BOOLEAN, INTEGER, UUID);
DROP FUNCTION IF EXISTS public.upsert_store_component(p_organization_id UUID, p_component_id UUID, p_component_type TEXT, p_settings JSONB, p_is_active BOOLEAN, p_order_index INTEGER);
DROP FUNCTION IF EXISTS public.upsert_store_component(p_component_id UUID, p_component_type TEXT, p_is_active BOOLEAN, p_order_index INTEGER, p_organization_id UUID, p_settings JSONB);

-- ثانياً: إنشاء نسخة واحدة من الدالة بالترتيب الصحيح الذي يتوقعه التطبيق
CREATE OR REPLACE FUNCTION public.upsert_store_component(
  p_component_id UUID,
  p_component_type TEXT,
  p_is_active BOOLEAN,
  p_order_index INTEGER,
  p_organization_id UUID,
  p_settings JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_has_permission BOOLEAN;
  v_result_id UUID;
  v_user_id UUID;
  v_component_type TEXT;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  v_user_id := auth.uid();
  
  -- التحقق من صلاحية المستخدم
  SELECT 
    u.organization_id,
    u.is_org_admin OR u.is_super_admin,
    COALESCE(u.permissions->>'manageOrganizationSettings' = 'true', false)
  INTO 
    v_user_org_id,
    v_is_admin,
    v_has_permission
  FROM 
    users u
  WHERE 
    u.id = v_user_id;
  
  IF v_user_org_id IS NULL OR (v_user_org_id != p_organization_id AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'غير مصرح لك بتعديل بيانات هذه المؤسسة';
  END IF;
  
  IF NOT (v_is_admin OR v_has_permission) THEN
    RAISE EXCEPTION 'يجب أن تكون مديراً أو تملك صلاحيات إدارة إعدادات المؤسسة';
  END IF;

  -- التأكد من أن نوع المكون ليس فارغاً
  v_component_type := COALESCE(p_component_type, 'unknown');

  -- إضافة أو تحديث المكون
  IF p_component_id IS NULL OR NOT EXISTS (SELECT 1 FROM store_settings ss WHERE ss.id = p_component_id) THEN
    -- إضافة مكون جديد
    INSERT INTO store_settings (
      organization_id,
      component_type,
      settings,
      is_active,
      order_index
    ) VALUES (
      p_organization_id,
      v_component_type,
      p_settings,
      p_is_active,
      p_order_index
    ) RETURNING id INTO v_result_id;
    
    -- إضافة سجل تدقيق يدوي للإضافة
    INSERT INTO settings_audit_log (
      user_id, 
      organization_id, 
      setting_type,
      setting_key, 
      old_value,
      new_value,
      action_type,
      table_name,
      record_id,
      created_at
    ) VALUES (
      v_user_id,
      p_organization_id,
      'store',
      'component_' || v_component_type,
      NULL,
      (SELECT row_to_json(ss)::text FROM store_settings ss WHERE ss.id = v_result_id),
      'INSERT',
      'store_settings',
      v_result_id,
      NOW()
    );
  ELSE
    -- تحديث مكون موجود
    UPDATE store_settings ss
    SET 
      component_type = v_component_type,
      settings = p_settings,
      is_active = p_is_active,
      order_index = p_order_index,
      updated_at = NOW()
    WHERE 
      ss.id = p_component_id AND 
      ss.organization_id = p_organization_id
    RETURNING ss.id INTO v_result_id;
    
    -- إضافة سجل تدقيق يدوي للتحديث
    INSERT INTO settings_audit_log (
      user_id, 
      organization_id, 
      setting_type,
      setting_key, 
      old_value,
      new_value,
      action_type,
      table_name,
      record_id,
      created_at
    ) VALUES (
      v_user_id,
      p_organization_id,
      'store',
      'component_' || v_component_type,
      (SELECT row_to_json(ss)::text FROM store_settings ss WHERE ss.id = p_component_id),
      (SELECT row_to_json(ss)::text FROM store_settings ss WHERE ss.id = v_result_id),
      'UPDATE',
      'store_settings',
      v_result_id,
      NOW()
    );
  END IF;
  
  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث دالة delete_store_component لضمان التوافق
CREATE OR REPLACE FUNCTION public.delete_store_component(
  p_organization_id UUID,
  p_component_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_has_permission BOOLEAN;
  v_component_type TEXT;
  v_user_id UUID;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  v_user_id := auth.uid();
  
  -- التحقق من صلاحية المستخدم
  SELECT 
    u.organization_id,
    u.is_org_admin OR u.is_super_admin,
    COALESCE(u.permissions->>'manageOrganizationSettings' = 'true', false)
  INTO 
    v_user_org_id,
    v_is_admin,
    v_has_permission
  FROM 
    users u
  WHERE 
    u.id = v_user_id;
  
  IF v_user_org_id IS NULL OR (v_user_org_id != p_organization_id AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'غير مصرح لك بحذف مكونات هذه المؤسسة';
  END IF;
  
  IF NOT (v_is_admin OR v_has_permission) THEN
    RAISE EXCEPTION 'يجب أن تكون مديراً أو تملك صلاحيات إدارة إعدادات المؤسسة';
  END IF;

  -- الحصول على نوع المكون قبل الحذف
  SELECT component_type INTO v_component_type
  FROM store_settings
  WHERE id = p_component_id AND organization_id = p_organization_id;

  -- حفظ البيانات القديمة قبل الحذف للتدقيق
  INSERT INTO settings_audit_log (
    user_id, 
    organization_id, 
    setting_type,
    setting_key, 
    old_value,
    new_value,
    action_type,
    table_name,
    record_id,
    created_at
  ) VALUES (
    v_user_id,
    p_organization_id,
    'store',
    'component_' || COALESCE(v_component_type, 'unknown'),
    (SELECT row_to_json(ss)::text FROM store_settings ss WHERE ss.id = p_component_id),
    NULL,
    'DELETE',
    'store_settings',
    p_component_id,
    NOW()
  );

  -- حذف المكون
  DELETE FROM store_settings 
  WHERE id = p_component_id AND organization_id = p_organization_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 