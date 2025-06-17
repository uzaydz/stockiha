-- =============================================================================
-- نظام التدقيق المحسن - حل نهائي لمشكلة settings_audit_log
-- يركز على تخزين الفروقات فقط بدلاً من البيانات الكاملة
-- =============================================================================

-- 1. إنشاء جدول محسن للتدقيق
CREATE TABLE IF NOT EXISTS settings_audit_log_optimized (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  setting_type TEXT NOT NULL, -- 'user', 'organization', 'store'
  setting_key TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  table_name TEXT NOT NULL,
  record_id UUID,
  
  -- تخزين الفروقات فقط بدلاً من البيانات الكاملة
  changed_fields JSONB, -- قائمة الحقول التي تغيرت فقط
  field_changes JSONB, -- الفروقات: {"field": {"old": "value1", "new": "value2"}}
  
  -- للحالات الخاصة
  is_major_change BOOLEAN DEFAULT FALSE, -- للتحديثات المهمة فقط
  summary TEXT, -- ملخص التغيير بدلاً من البيانات الكاملة
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- فهارس مُحسنة
  CONSTRAINT valid_action_type CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
  CONSTRAINT valid_setting_type CHECK (setting_type IN ('user', 'organization', 'store'))
);

-- 2. فهارس محسنة للأداء
CREATE INDEX IF NOT EXISTS idx_audit_optimized_org_time 
ON settings_audit_log_optimized(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_optimized_setting_type 
ON settings_audit_log_optimized(setting_type, setting_key);

CREATE INDEX IF NOT EXISTS idx_audit_optimized_major_changes 
ON settings_audit_log_optimized(is_major_change, created_at DESC) 
WHERE is_major_change = TRUE;

-- 3. دالة ذكية لحساب الفروقات
CREATE OR REPLACE FUNCTION calculate_field_differences(
  old_data JSONB,
  new_data JSONB,
  ignore_fields TEXT[] DEFAULT ARRAY['updated_at', 'created_at']
) RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  key TEXT;
  old_val JSONB;
  new_val JSONB;
BEGIN
  -- مقارنة كل حقل في البيانات الجديدة
  FOR key IN SELECT jsonb_object_keys(new_data)
  LOOP
    -- تجاهل الحقول المستبعدة
    IF key = ANY(ignore_fields) THEN
      CONTINUE;
    END IF;
    
    old_val := old_data->key;
    new_val := new_data->key;
    
    -- إذا كان هناك تغيير
    IF old_val IS DISTINCT FROM new_val THEN
      result := result || jsonb_build_object(
        key, 
        jsonb_build_object(
          'old', COALESCE(old_val, 'null'),
          'new', COALESCE(new_val, 'null')
        )
      );
    END IF;
  END LOOP;
  
  -- مقارنة الحقول المحذوفة
  FOR key IN SELECT jsonb_object_keys(old_data)
  LOOP
    IF key = ANY(ignore_fields) THEN
      CONTINUE;
    END IF;
    
    IF NOT new_data ? key THEN
      result := result || jsonb_build_object(
        key,
        jsonb_build_object(
          'old', old_data->key,
          'new', 'null'
        )
      );
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. دالة محسنة لتسجيل التغييرات
CREATE OR REPLACE FUNCTION log_settings_change_optimized()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  user_org_id UUID;
  current_user_id UUID;
  setting_key TEXT;
  field_changes JSONB;
  changed_fields TEXT[];
  is_major BOOLEAN := FALSE;
  change_summary TEXT;
  old_json JSONB;
  new_json JSONB;
BEGIN
  -- الحصول على معرف المستخدم
  current_user_id := auth.uid();
  
  -- تحديد setting_key من معاملات المحفز
  setting_key := COALESCE(TG_ARGV[0], TG_TABLE_NAME);
  
  -- تحديد المؤسسة حسب نوع الجدول
  IF TG_TABLE_NAME = 'organization_settings' THEN
    org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  ELSIF TG_TABLE_NAME = 'user_settings' THEN
    BEGIN
      SELECT u.organization_id INTO user_org_id 
      FROM users u 
      WHERE u.id = COALESCE(NEW.user_id, OLD.user_id);
      
      org_id := user_org_id;
    EXCEPTION WHEN OTHERS THEN
      org_id := NULL;
    END;
  ELSIF TG_TABLE_NAME = 'store_settings' THEN
    org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  END IF;
  
  -- معالجة حسب نوع العملية
  IF TG_OP = 'INSERT' THEN
    -- للإدراج: تسجيل ملخص فقط
    change_summary := format('تم إنشاء %s جديد', setting_key);
    is_major := TRUE;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- للتحديث: حساب الفروقات فقط
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    
    field_changes := calculate_field_differences(old_json, new_json);
    
    -- إذا لم تكن هناك تغييرات حقيقية، تجاهل
    IF field_changes = '{}' THEN
      RETURN NEW;
    END IF;
    
    -- استخراج أسماء الحقول المتغيرة
    SELECT array_agg(key) INTO changed_fields
    FROM jsonb_object_keys(field_changes) AS key;
    
    -- تحديد إذا كان التغيير مهماً
    is_major := (
      array_length(changed_fields, 1) > 3 OR
      'settings' = ANY(changed_fields) OR
      'component_type' = ANY(changed_fields)
    );
    
    change_summary := format(
      'تم تحديث %s حقل في %s: %s',
      array_length(changed_fields, 1),
      setting_key,
      array_to_string(changed_fields[1:3], '، ')
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    -- للحذف: تسجيل ملخص فقط
    change_summary := format('تم حذف %s', setting_key);
    is_major := TRUE;
  END IF;
  
  -- تسجيل في الجدول المحسن فقط للتغييرات المهمة أو إذا كان مطلوب
  IF is_major OR setting_key LIKE '%important%' THEN
    INSERT INTO settings_audit_log_optimized (
      user_id,
      organization_id,
      setting_type,
      setting_key,
      action_type,
      table_name,
      record_id,
      changed_fields,
      field_changes,
      is_major_change,
      summary,
      created_at
    )
    VALUES (
      current_user_id,
      org_id,
      CASE 
        WHEN TG_TABLE_NAME = 'user_settings' THEN 'user'
        WHEN TG_TABLE_NAME = 'store_settings' THEN 'store'
        ELSE 'organization'
      END,
      setting_key,
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      changed_fields,
      field_changes,
      is_major,
      change_summary,
      NOW()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
  
EXCEPTION WHEN OTHERS THEN
  -- تسجيل صامت للأخطاء
  RAISE WARNING 'خطأ في نظام التدقيق المحسن: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. استبدال المحفزات القديمة
DROP TRIGGER IF EXISTS user_settings_audit_trigger ON user_settings;
DROP TRIGGER IF EXISTS organization_settings_audit_trigger ON organization_settings;
DROP TRIGGER IF EXISTS store_settings_audit_trigger ON store_settings;

-- إنشاء محفزات محسنة جديدة
CREATE TRIGGER user_settings_audit_trigger_optimized
AFTER INSERT OR UPDATE OR DELETE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change_optimized('user_settings');

CREATE TRIGGER organization_settings_audit_trigger_optimized
AFTER INSERT OR UPDATE OR DELETE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change_optimized('organization_settings');

CREATE TRIGGER store_settings_audit_trigger_optimized
AFTER INSERT OR UPDATE OR DELETE ON store_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change_optimized('store_settings');

-- 6. وظيفة لتنظيف السجلات القديمة تلقائياً
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- حذف السجلات غير المهمة الأقدم من 7 أيام
  DELETE FROM settings_audit_log_optimized 
  WHERE created_at < NOW() - INTERVAL '7 days'
  AND is_major_change = FALSE;
  
  -- حذف السجلات المهمة الأقدم من 90 يوماً
  DELETE FROM settings_audit_log_optimized 
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND is_major_change = TRUE;
  
  -- ضغط الجدول
  VACUUM settings_audit_log_optimized;
END;
$$ LANGUAGE plpgsql;

-- 7. جدولة التنظيف التلقائي (يتطلب pg_cron)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs();');

-- 8. إنشاء view لعرض التدقيق بشكل مفهوم
CREATE OR REPLACE VIEW audit_log_readable AS
SELECT 
  sal.id,
  u.name as user_name,
  u.email as user_email,
  o.name as organization_name,
  sal.setting_type,
  sal.setting_key,
  sal.action_type,
  sal.summary,
  sal.changed_fields,
  sal.field_changes,
  sal.is_major_change,
  sal.created_at
FROM settings_audit_log_optimized sal
LEFT JOIN users u ON u.id = sal.user_id
LEFT JOIN organizations o ON o.id = sal.organization_id
ORDER BY sal.created_at DESC; 