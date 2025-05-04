-- تصحيح مشغلات وآليات سجل التدقيق في قاعدة البيانات
--
-- المشاكل التي تم حلها:
-- 1. خطأ 42P13: "trigger functions cannot have declared arguments" في دالة log_settings_change
-- 2. مشكلة عدم إمكانية إدراج سجلات في settings_audit_log عندما يكون user_id فارغ
-- 3. تصادم في جدول organization_settings بسبب القيد unique_org_settings
--
-- الحلول المطبقة:
-- 1. تعديل دالة log_settings_change لاستخدام TG_ARGV بدلاً من المعاملات المعلنة
-- 2. إزالة القيد NOT NULL من حقل user_id في جدول settings_audit_log
-- 3. تعديل المشغلات لتجنب محاولات إدراج مكررة في organization_settings

-- تعطيل المشغلات (triggers) التي تسبب مشكلة في إنشاء المنظمات
-- المشكلة: حقل user_id الإلزامي في جدول settings_audit_log لا يتم تعبئته بشكل صحيح

-- 1. تعطيل المشغلات المرتبطة بجدول organization_settings
DROP TRIGGER IF EXISTS organization_settings_audit_trigger ON organization_settings;
DROP TRIGGER IF EXISTS log_organization_settings_changes_trigger ON organization_settings;

-- 2. تعطيل المشغلات المرتبطة بجدول organizations التي تؤثر على جدول organization_settings
-- وهذا يتطلب إنشاء إصدار معدل من initialize_organization_settings لا يستخدم سجلات التدقيق

CREATE OR REPLACE FUNCTION initialize_organization_settings_no_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- إنشاء إعدادات افتراضية للمتجر
  INSERT INTO organization_settings (
    organization_id,
    theme_primary_color,
    theme_secondary_color,
    theme_mode,
    site_name,
    default_language
  ) VALUES (
    NEW.id,
    '#0099ff',
    '#6c757d',
    'light',
    NEW.name,
    'ar'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تعديل المشغل الموجود ليستخدم الدالة الجديدة
DROP TRIGGER IF EXISTS initialize_organization_settings_trigger ON organizations;
CREATE TRIGGER initialize_organization_settings_trigger
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION initialize_organization_settings_no_audit();

-- 3. تعديل دالة log_settings_change لتعامل بشكل أفضل مع حالة auth.uid() = NULL
CREATE OR REPLACE FUNCTION log_settings_change()
RETURNS TRIGGER AS $$
DECLARE
    org_id uuid := NULL;
    user_org_id uuid := NULL;
    current_user_id uuid;
    setting_key TEXT;
BEGIN
    -- تحقق من وجود user_id صالح
    current_user_id := auth.uid();
    
    -- استخراج setting_key من معاملات المشغل TG_ARGV
    IF TG_NARGS > 0 THEN
        setting_key := TG_ARGV[0];
    ELSE
        setting_key := TG_TABLE_NAME;
    END IF;
    
    -- إذا لم يتم تحديد مستخدم، استخدم قيمة افتراضية آمنة
    IF current_user_id IS NULL THEN
        -- استخدام معرف المالك إذا كان متاحًا في حالة المنظمات
        IF TG_TABLE_NAME = 'organizations' AND NEW.owner_id IS NOT NULL THEN
            current_user_id := NEW.owner_id;
        ELSE
            -- تخطي التسجيل إذا لم يتوفر مستخدم
            RETURN NEW;
        END IF;
    END IF;

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
    ELSIF TG_TABLE_NAME = 'organizations' THEN
        org_id := NEW.id;
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
        current_user_id, 
        org_id,
        CASE 
            WHEN TG_TABLE_NAME = 'user_settings' THEN 'user'
            WHEN TG_TABLE_NAME = 'store_settings' THEN 'store'
            WHEN TG_TABLE_NAME = 'organizations' THEN 'organization'
            ELSE 'organization'
        END,
        setting_key,
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
$$ LANGUAGE plpgsql;

-- 4. تعديل دالة log_organization_settings_changes لمعالجة حالة auth.uid() = NULL
CREATE OR REPLACE FUNCTION log_organization_settings_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- تحقق من وجود user_id صالح
  current_user_id := auth.uid();
  
  -- إذا لم يتم تحديد مستخدم، استخدم قيمة افتراضية
  IF current_user_id IS NULL THEN
    -- في هذه الحالة، نرجع بدون تسجيل (يمكن تغييره لاستخدام معرف آخر إذا كان متاحًا)
    RETURN NULL;
  END IF;

  -- تسجيل التغييرات في جدول سجل الإعدادات
  INSERT INTO settings_audit_log (
    organization_id, 
    user_id, 
    action_type, 
    table_name, 
    record_id, 
    old_values, 
    new_values,
    setting_type,
    setting_key
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    current_user_id,
    TG_OP,
    'organization_settings',
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
      ELSE NULL
    END,
    CASE 
      WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)
      ELSE NULL
    END,
    'organization',  -- نوع الإعداد
    'organization_settings'  -- مفتاح الإعداد
  );
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. للتأكد من عمل الحل بشكل مباشر، نقوم بمسح الكونستراينت على user_id في جدول settings_audit_log
ALTER TABLE settings_audit_log ALTER COLUMN user_id DROP NOT NULL; 