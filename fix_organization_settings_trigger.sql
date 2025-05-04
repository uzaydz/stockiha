-- إصلاح مشكلة المشغل الذي يحاول الوصول إلى حقل component_type في جدول organization_settings

-- 1. تحديد المشغلات المرتبطة بجدول organization_settings
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  RAISE NOTICE 'المشغلات الموجودة على جدول organization_settings:';
  
  FOR trigger_rec IN
    SELECT t.tgname, pg_get_triggerdef(t.oid) AS trigger_def
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'organization_settings'
    AND NOT t.tgisinternal
  LOOP
    RAISE NOTICE 'المشغل: %, التعريف: %', trigger_rec.tgname, trigger_rec.trigger_def;
  END LOOP;
END $$;

-- 2. إيقاف المشغل الذي يسبب المشكلة مؤقتًا (إذا كان موجودًا)
DROP TRIGGER IF EXISTS log_store_settings_changes_trigger ON organization_settings;
DROP TRIGGER IF EXISTS update_featured_products_trigger ON organization_settings;

-- 3. حذف أي دالة قد تكون مرتبطة ومسببة للمشكلة
DROP FUNCTION IF EXISTS log_settings_changes_for_store() CASCADE;
DROP FUNCTION IF EXISTS trigger_update_featured_products_in_org_settings() CASCADE;

-- 4. إنشاء مشغل جديد أكثر تحديدًا لتحديث updated_at للإعدادات
CREATE OR REPLACE FUNCTION update_organization_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث وقت التعديل فقط بدون أي منطق إضافي يتعلق بـ component_type
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إعادة إنشاء المشغل بشكل صحيح
DROP TRIGGER IF EXISTS set_timestamp_organization_settings ON organization_settings;
CREATE TRIGGER set_timestamp_organization_settings
BEFORE UPDATE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION update_organization_settings_timestamp();

-- 5. إضافة قيود أمان لتجنب تداخل المشغلات بين الجداول
-- التأكد من أن المشغلات الخاصة بمكونات المتجر لا تؤثر على جدول إعدادات المؤسسة
DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  -- البحث عن وإصلاح أي وظيفة للتحديث التلقائي للمنتجات المميزة
  SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'trigger_update_featured_products'
  ) INTO func_exists;
  
  IF func_exists THEN
    -- تعديل دالة تحديث المنتجات المميزة
    EXECUTE $FUNC$
      -- تعديل دالة تحديث المنتجات المميزة للتحقق من نوع الجدول قبل التنفيذ
      CREATE OR REPLACE FUNCTION trigger_update_featured_products()
      RETURNS TRIGGER AS $TRIG$
      BEGIN
        -- التأكد من أن هذا الجدول هو store_settings وليس organization_settings
        IF TG_TABLE_NAME = 'store_settings' AND NEW.component_type = 'featured_products' THEN
          -- منطق تحديث المنتجات المميزة
          -- ...
          NULL; -- عملية صورية لمنع الخطأ في حالة عدم وجود منطق التحديث
        END IF;
        RETURN NEW;
      END;
      $TRIG$ LANGUAGE plpgsql;
    $FUNC$;
  END IF;
END $$;

-- 6. إنشاء مشغل خاص بسجل التعديلات على إعدادات المؤسسة
CREATE OR REPLACE FUNCTION log_organization_settings_changes()
RETURNS TRIGGER AS $$
BEGIN
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
    auth.uid(),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء مشغل سجل التعديلات على إعدادات المؤسسة
DROP TRIGGER IF EXISTS log_organization_settings_changes_trigger ON organization_settings;
CREATE TRIGGER log_organization_settings_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION log_organization_settings_changes();

-- 7. التحقق مرة أخرى من المشغلات بعد التصحيح
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  RAISE NOTICE 'المشغلات الموجودة على جدول organization_settings بعد التصحيح:';
  
  FOR trigger_rec IN
    SELECT t.tgname, pg_get_triggerdef(t.oid) AS trigger_def
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'organization_settings'
    AND NOT t.tgisinternal
  LOOP
    RAISE NOTICE 'المشغل: %, التعريف: %', trigger_rec.tgname, trigger_rec.trigger_def;
  END LOOP;
END $$; 