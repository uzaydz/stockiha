-- إصلاح مشكلة "null value in column "setting_type" of relation "settings_audit_log" violates not-null constraint"
-- تاريخ: 2025

-- السماح مؤقتاً بالقيم الفارغة في عمود setting_type لتسهيل عملية الإصلاح
ALTER TABLE settings_audit_log ALTER COLUMN setting_type DROP NOT NULL;

-- تصحيح السجلات القديمة - تحديث القيم الفارغة
UPDATE settings_audit_log
SET setting_type = 'store'
WHERE setting_type IS NULL AND (setting_key LIKE 'component_%' OR table_name = 'store_settings');

-- تعديل وظيفة upsert_store_component لضمان إرسال قيمة لـ setting_type عند إضافة سجلات التدقيق
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
    
    -- إضافة سجل تدقيق يدوي للإضافة
    -- مع التأكد من تعيين قيمة لحقل setting_type
    INSERT INTO settings_audit_log (
      user_id, 
      organization_id, 
      setting_type,  -- يجب تعيين قيمة هنا
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
      'store',  -- تعيين قيمة ثابتة "store" لحقل setting_type
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
    -- مع التأكد من تعيين قيمة لحقل setting_type
    INSERT INTO settings_audit_log (
      user_id, 
      organization_id, 
      setting_type,  -- يجب تعيين قيمة هنا
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
      'store',  -- تعيين قيمة ثابتة "store" لحقل setting_type
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

-- تحديث أيضاً وظيفة حذف المكون
CREATE OR REPLACE FUNCTION delete_store_component(
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

-- تحديث أي محفزات (triggers) أخرى قد تكون تؤثر على settings_audit_log
-- تحديث دالة log_settings_change المستخدمة في المحفزات
CREATE OR REPLACE FUNCTION log_settings_change() RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
    user_org_id UUID;
    setting_key TEXT := TG_ARGV[0];
BEGIN
    -- تحديد المؤسسة حسب نوع الجدول
    IF TG_TABLE_NAME = 'organization_settings' THEN
        org_id := NEW.organization_id;
    ELSIF TG_TABLE_NAME = 'user_settings' THEN
        BEGIN
            SELECT u.organization_id INTO user_org_id 
            FROM users u 
            WHERE u.id = NEW.user_id;
            
            IF FOUND THEN
                org_id := user_org_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            org_id := NULL;
        END;
    ELSIF TG_TABLE_NAME = 'store_settings' THEN
        org_id := NEW.organization_id;
    END IF;

    -- تسجيل التغيير مع تحديد نوع الإعدادات
    INSERT INTO public.settings_audit_log (
        user_id, 
        organization_id, 
        setting_type,  -- تأكد من تعيين قيمة هنا
        setting_key, 
        old_value,
        new_value,
        action_type,
        table_name,
        record_id,
        created_at
    ) VALUES (
        auth.uid(), 
        org_id,
        CASE  -- تحديد نوع الإعدادات بناءً على الجدول
            WHEN TG_TABLE_NAME = 'organization_settings' THEN 'organization'
            WHEN TG_TABLE_NAME = 'user_settings' THEN 'user'
            WHEN TG_TABLE_NAME = 'store_settings' THEN 'store'
            ELSE 'unknown'
        END,
        COALESCE(
            setting_key, 
            CASE  -- إذا كان الجدول store_settings، استخدم نوع المكون لاشتقاق المفتاح
                WHEN TG_TABLE_NAME = 'store_settings' THEN 'component_' || COALESCE(NEW.component_type, 'unknown')
                ELSE TG_TABLE_NAME || '_setting'
            END
        ),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::text ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::text ELSE NULL END,
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        NOW()
    );
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة تطبيق قيود NOT NULL بعد إصلاح البيانات
ALTER TABLE settings_audit_log ALTER COLUMN setting_type SET NOT NULL;

-- إضافة فهرس للتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_setting_type ON settings_audit_log (setting_type);

-- إضافة تعليمات للتنفيذ
-- يجب تنفيذ هذا الملف في قاعدة البيانات لإصلاح المشكلة
-- قم بتنفيذ هذا الملف كاملاً على قاعدة البيانات في Supabase
-- يمكن استخدام واجهة SQL Editor في لوحة تحكم Supabase 