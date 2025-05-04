-- إصلاح مشكلة "column "action_type" of relation "settings_audit_log" does not exist"
-- تاريخ: 2024

-- 1. إضافة عمود action_type لجدول settings_audit_log إذا لم يكن موجوداً
ALTER TABLE public.settings_audit_log
ADD COLUMN IF NOT EXISTS action_type VARCHAR(50);

-- 2. تعديل الدالة log_settings_change لتأخذ هذا العمود بعين الاعتبار
DROP TRIGGER IF EXISTS user_settings_audit_trigger ON user_settings;
DROP TRIGGER IF EXISTS organization_settings_audit_trigger ON organization_settings;
DROP TRIGGER IF EXISTS store_settings_audit_trigger ON store_settings;

-- 3. تحديث الدالة المسؤولة عن تسجيل التغييرات
CREATE OR REPLACE FUNCTION public.log_settings_change()
RETURNS trigger AS $$
DECLARE
    org_id uuid := NULL;
    user_org_id uuid := NULL;
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

    -- تسجيل التغيير مع تحديد نوع الإجراء (action_type)
    INSERT INTO public.settings_audit_log (
        user_id, 
        organization_id, 
        setting_type, 
        setting_key, 
        old_value, 
        new_value,
        action_type,
        created_at
    )
    VALUES (
        COALESCE(NEW.user_id, auth.uid()), 
        org_id,
        CASE 
            WHEN TG_TABLE_NAME = 'user_settings' THEN 'user'
            WHEN TG_TABLE_NAME = 'store_settings' THEN 'store'
            ELSE 'organization'
        END,
        TG_ARGV[0],
        CASE WHEN TG_OP = 'UPDATE' THEN 
            (SELECT row_to_json(OLD)::text) 
            ELSE NULL 
        END,
        (SELECT row_to_json(NEW)::text),
        TG_OP, -- 'INSERT' أو 'UPDATE' أو 'DELETE'
        NOW()
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'خطأ في log_settings_change: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. إعادة إنشاء المحفزات باستخدام الدالة المحدثة
CREATE TRIGGER user_settings_audit_trigger
AFTER INSERT OR UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('user_settings');

CREATE TRIGGER organization_settings_audit_trigger
AFTER INSERT OR UPDATE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('organization_settings');

-- 5. إضافة محفز لجدول store_settings
CREATE TRIGGER store_settings_audit_trigger
AFTER INSERT OR UPDATE ON store_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('store_settings');

-- 6. ضمان وجود السياسات الأمنية اللازمة
GRANT SELECT, INSERT ON public.settings_audit_log TO authenticated; 

-- 7. تحديث وظيفة upsert_store_component لتعمل مع إعدادات المتجر بشكل صحيح
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
      p_component_type,
      p_settings,
      p_is_active,
      p_order_index
    ) RETURNING id INTO v_result_id;
  ELSE
    -- تحديث مكون موجود
    UPDATE store_settings ss
    SET 
      component_type = p_component_type,
      settings = p_settings,
      is_active = p_is_active,
      order_index = p_order_index,
      updated_at = NOW()
    WHERE 
      ss.id = p_component_id AND 
      ss.organization_id = p_organization_id
    RETURNING ss.id INTO v_result_id;
  END IF;
  
  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- إضافة الأعمدة الناقصة
ALTER TABLE settings_audit_log 
ADD COLUMN IF NOT EXISTS old_values JSONB,
ADD COLUMN IF NOT EXISTS new_values JSONB;

-- تحديث البيانات الموجودة (اختياري)
-- تحويل القيم النصية القديمة إلى JSONB إذا كانت موجودة
UPDATE settings_audit_log
SET old_values = old_value::jsonb
WHERE old_value IS NOT NULL AND old_values IS NULL;

UPDATE settings_audit_log
SET new_values = new_value::jsonb
WHERE new_value IS NOT NULL AND new_values IS NULL;

-- الآن قم بالتحقق من وجود الأعمدة
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'settings_audit_log'
ORDER BY ordinal_position; 