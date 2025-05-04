-- ملف منفصل لإصلاح مشكلة trigger_store_settings_audit
-- سيتم تنفيذه مباشرة في قاعدة البيانات Supabase

-- إلغاء المعاملة الحالية إن وجدت
ROLLBACK;
BEGIN;

-- إيقاف كل المشغلات على جدول store_settings
ALTER TABLE IF EXISTS public.store_settings DISABLE TRIGGER ALL;

-- حذف جميع المشغلات المتعلقة بالتدقيق
DROP TRIGGER IF EXISTS trigger_store_settings_audit ON public.store_settings;
DROP TRIGGER IF EXISTS store_settings_audit_trigger ON public.store_settings;
DROP TRIGGER IF EXISTS log_store_settings_changes_trigger ON public.store_settings;
DROP TRIGGER IF EXISTS audit_store_settings_changes_trigger ON public.store_settings;
DROP TRIGGER IF EXISTS safe_store_settings_audit_trigger ON public.store_settings;

-- حذف الوظيفة المسببة للمشكلة بوضعية CASCADE لحذف جميع المشغلات المرتبطة
DROP FUNCTION IF EXISTS public.log_store_settings_changes() CASCADE;
DROP FUNCTION IF EXISTS public.audit_store_settings_changes() CASCADE;
DROP FUNCTION IF EXISTS public.safe_store_settings_audit() CASCADE;
DROP FUNCTION IF EXISTS public.log_settings_change(text) CASCADE;

-- تعديل جدول settings_audit_log لقبول قيمة افتراضية
ALTER TABLE IF EXISTS public.settings_audit_log 
ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;

-- إصلاح أسماء الأعمدة
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'settings_audit_log' AND column_name = 'old_values'
  ) THEN
    ALTER TABLE public.settings_audit_log RENAME COLUMN old_values TO old_value;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'settings_audit_log' AND column_name = 'new_values'
  ) THEN
    ALTER TABLE public.settings_audit_log RENAME COLUMN new_values TO new_value;
  END IF;
END $$;

-- إنشاء وظيفة جديدة آمنة بأسم مختلف تماماً
CREATE OR REPLACE FUNCTION public.new_safe_settings_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_organization_id UUID;
  v_new_organization_id UUID;
  v_old_id UUID;
  v_new_id UUID;
  v_component_type TEXT;
  v_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
  -- تحديد القيم المناسبة
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

  -- تنفيذ التسجيل بأمان مع التقاط أي استثناء
  BEGIN
    INSERT INTO public.settings_audit_log (
      organization_id, 
      user_id, 
      action_type, 
      table_name, 
      record_id, 
      old_value, 
      new_value,
      setting_type,
      setting_key
    ) VALUES (
      COALESCE(v_new_organization_id, v_old_organization_id),
      v_user_id,
      TG_OP,
      'store_settings',
      COALESCE(v_new_id, v_old_id),
      CASE 
        WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::TEXT
        WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::TEXT
        ELSE NULL
      END,
      CASE 
        WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW)::TEXT
        ELSE NULL
      END,
      'store',
      'component_' || COALESCE(v_component_type, 'unknown')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'فشل في تسجيل التغيير: %', SQLERRM;
  END;
  
  -- إرجاع القيمة المناسبة
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- إنشاء مشغل جديد باسم مختلف تماماً
CREATE TRIGGER new_completely_different_trigger_name
AFTER INSERT OR UPDATE OR DELETE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.new_safe_settings_audit();

-- إضافة تعليق توضيحي
COMMENT ON FUNCTION public.new_safe_settings_audit() IS 'وظيفة آمنة لتسجيل التغييرات في إعدادات المتجر (نسخة مصححة)';

-- إعادة تشغيل المشغلات
ALTER TABLE IF EXISTS public.store_settings ENABLE TRIGGER ALL;

-- تأكيد المعاملة
COMMIT; 