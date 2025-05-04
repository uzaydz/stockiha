-- إصلاح مشكلة "null value in column "setting_type" of relation "settings_audit_log" violates not-null constraint"
-- في استدعاء وظيفة upsert_store_component

-- 1. تعديل دالة log_store_settings_changes لتضمين القيم المطلوبة لـ setting_type و setting_key
CREATE OR REPLACE FUNCTION log_store_settings_changes()
RETURNS trigger AS $$
DECLARE
  v_old_organization_id UUID;
  v_new_organization_id UUID;
  v_old_id UUID;
  v_new_id UUID;
  v_component_type TEXT;
BEGIN
  -- تحديد القيم المناسبة بناء على نوع العملية
  IF TG_OP = 'DELETE' THEN
    v_old_organization_id := OLD.organization_id;
    v_old_id := OLD.id;
    v_new_id := NULL;
    v_component_type := OLD.component_type;
  ELSE
    v_new_organization_id := NEW.organization_id;
    v_new_id := NEW.id;
    v_component_type := NEW.component_type;
    IF TG_OP = 'UPDATE' THEN
      v_old_id := OLD.id;
    ELSE
      v_old_id := NULL;
    END IF;
  END IF;

  INSERT INTO settings_audit_log (
    organization_id, 
    user_id, 
    action_type, 
    table_name, 
    record_id, 
    old_values, 
    new_values,
    setting_type,  -- إضافة حقل إلزامي
    setting_key    -- إضافة حقل إلزامي
  ) VALUES (
    COALESCE(v_new_organization_id, v_old_organization_id),
    auth.uid(),
    TG_OP,
    'store_settings',
    COALESCE(v_new_id, v_old_id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
      ELSE NULL
    END,
    CASE 
      WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)
      ELSE NULL
    END,
    'store',  -- تعيين قيمة ثابتة لـ setting_type
    'component_' || COALESCE(v_component_type, 'unknown')  -- تعيين قيمة ديناميكية لـ setting_key
  );
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. تصحيح السجلات القديمة التي قد تكون فارغة
UPDATE settings_audit_log
SET 
  setting_type = 'store',
  setting_key = COALESCE(setting_key, 'component_unknown')
WHERE 
  table_name = 'store_settings' AND 
  (setting_type IS NULL OR setting_key IS NULL);

-- 3. تحديث وظيفة upsert_store_component للتأكد من أنها تعمل بشكل صحيح
CREATE OR REPLACE FUNCTION upsert_store_component(
  p_organization_id UUID,
  p_component_id UUID,
  p_component_type TEXT,
  p_settings JSONB,
  p_is_active BOOLEAN,
  p_order_index INTEGER
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
    
    -- لا داعي لإضافة سجل تدقيق يدوي هنا، فهو سيتم إضافته بواسطة المحفز (trigger)
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
    
    -- لا داعي لإضافة سجل تدقيق يدوي هنا، فهو سيتم إضافته بواسطة المحفز (trigger)
  END IF;
  
  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. تحديث وظيفة delete_store_component أيضًا للعمل بشكل صحيح مع النظام المحدث
CREATE OR REPLACE FUNCTION delete_store_component(
  p_organization_id UUID,
  p_component_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_org_id UUID;
  v_is_admin BOOLEAN;
  v_has_permission BOOLEAN;
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

  -- حذف المكون (سيتم تسجيل التدقيق بواسطة المحفز)
  DELETE FROM store_settings 
  WHERE id = p_component_id AND organization_id = p_organization_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- 5. شرح تنفيذ الحل
COMMENT ON FUNCTION log_store_settings_changes IS '
تسجيل التغييرات على إعدادات المتجر مع ضمان عدم إرسال قيم فارغة لحقول إلزامية.
تم تعديل الدالة لتضمين:
1. setting_type: قيمة ثابتة "store"
2. setting_key: مبني على نوع المكون مع بادئة "component_"
';

COMMENT ON FUNCTION upsert_store_component IS '
إضافة أو تحديث مكون متجر، وتم تعديله للتوافق مع آلية التسجيل الجديدة.
لم نعد نضيف سجلات تدقيق يدوية هنا، بل نعتمد على المحفز (trigger).
';

COMMENT ON FUNCTION delete_store_component IS '
حذف مكون متجر، وتم تعديله ليتوافق مع آلية التسجيل الجديدة.
لم نعد نضيف سجلات تدقيق يدوية هنا، بل نعتمد على المحفز (trigger).
'; 