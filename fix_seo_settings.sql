-- إصلاح مشكلة تحديث إعدادات تحسين محركات البحث (SEO)
-- هذا الملف يعالج المشكلة التي تظهر عند تحديث إعدادات SEO

-- 1. تحديث وظيفة update_store_seo_settings لتضمن عودة تحديثات صحيحة
CREATE OR REPLACE FUNCTION public.update_store_seo_settings(
    _organization_id UUID,
    _settings JSONB
)
RETURNS JSONB AS $$
DECLARE
    updated_settings JSONB;
    existing_id UUID;
BEGIN
    -- تحقق ما إذا كانت إعدادات SEO موجودة مسبقاً
    SELECT id INTO existing_id
    FROM public.store_settings
    WHERE organization_id = _organization_id
    AND component_type = 'seo_settings';
    
    -- تحديث إعدادات SEO إذا كانت موجودة
    IF existing_id IS NOT NULL THEN
        UPDATE public.store_settings
        SET 
            settings = _settings,
            updated_at = NOW()
        WHERE 
            id = existing_id
        RETURNING settings INTO updated_settings;
    -- إذا لم يتم العثور على إعدادات، إنشاء سجل جديد
    ELSE
        INSERT INTO public.store_settings (
            organization_id,
            component_type,
            settings,
            is_active,
            order_index
        ) VALUES (
            _organization_id,
            'seo_settings',
            _settings,
            true,
            (SELECT COALESCE(MAX(order_index), 0) + 1 FROM public.store_settings WHERE organization_id = _organization_id)
        )
        RETURNING settings INTO updated_settings;
    END IF;
    
    -- تنظيف ذاكرة التخزين المؤقت لـ SEO إذا كانت موجودة
    DELETE FROM public.seo_cache 
    WHERE organization_id = _organization_id 
    AND cache_type LIKE 'seo_%';
    
    RETURN updated_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. تحديث المشغل لجدول store_settings لمعالجة مشكلة old_values و new_values
DROP TRIGGER IF EXISTS trigger_store_settings_audit ON store_settings;

CREATE OR REPLACE FUNCTION public.log_store_settings_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_organization_id UUID;
  v_new_organization_id UUID;
  v_old_id UUID;
  v_new_id UUID;
  v_component_type TEXT;
  v_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
  -- محاولة الحصول على معرف المستخدم من متغيرات البيئة
  BEGIN
    v_user_id := NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END;
  
  IF v_user_id IS NULL THEN
    v_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;
  
  -- تحديد القيم بناءً على نوع العملية
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

  -- إعداد القيم النصية والـ JSONB
  DECLARE
    text_old_val TEXT;
    text_new_val TEXT;
    jsonb_old_val JSONB;
    jsonb_new_val JSONB;
  BEGIN
    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
      text_old_val := row_to_json(OLD)::TEXT;
      jsonb_old_val := row_to_json(OLD)::JSONB;
    END IF;
    
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      text_new_val := row_to_json(NEW)::TEXT;
      jsonb_new_val := row_to_json(NEW)::JSONB;
    END IF;
  END;

  -- إدخال سجل في جدول التدقيق مع استخدام الأعمدة الصحيحة
  BEGIN
    INSERT INTO public.settings_audit_log (
      organization_id, 
      user_id,
      action_type, 
      table_name, 
      record_id, 
      old_value,
      old_values,
      new_value,
      new_values,
      setting_type,
      setting_key
    ) VALUES (
      COALESCE(v_new_organization_id, v_old_organization_id),
      v_user_id,
      TG_OP,
      'store_settings',
      COALESCE(v_new_id, v_old_id),
      text_old_val,
      jsonb_old_val,
      text_new_val,
      jsonb_new_val,
      'store',
      'component_' || COALESCE(v_component_type, 'unknown')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'فشل في تسجيل التغيير في جدول التدقيق: %', SQLERRM;
  END;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء المشغل
CREATE TRIGGER trigger_store_settings_audit
AFTER INSERT OR UPDATE OR DELETE ON store_settings
FOR EACH ROW
EXECUTE FUNCTION log_store_settings_changes();

-- 3. تأكد من وجود مفتاح أساسي أو فهرس على الحقول المستخدمة كثيرًا للبحث
CREATE INDEX IF NOT EXISTS idx_store_settings_org_component
ON store_settings(organization_id, component_type);

-- 4. إنشاء وظيفة مساعدة للحصول على إعدادات SEO
CREATE OR REPLACE FUNCTION public.get_seo_settings_safe(
    _organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result_settings JSONB;
    default_settings JSONB := '{
        "title": "",
        "advanced": {
            "custom_head_tags": "",
            "bing_webmaster_id": "",
            "custom_robots_txt": "",
            "google_analytics_id": "",
            "google_tag_manager_id": "",
            "google_search_console_id": ""
        },
        "keywords": "",
        "robots_txt": "User-agent: *\nAllow: /",
        "description": "",
        "social_media": {
            "facebook_page": "",
            "linkedin_page": "",
            "twitter_handle": "",
            "instagram_handle": ""
        },
        "enable_sitemap": true,
        "structured_data": {
            "business_logo": "",
            "business_name": "",
            "business_type": "Store",
            "business_phone": "",
            "business_address": ""
        },
        "default_image_url": "",
        "enable_open_graph": true,
        "generate_meta_tags": true,
        "enable_schema_markup": true,
        "enable_twitter_cards": true,
        "enable_canonical_urls": true
    }';
BEGIN
    -- محاولة الحصول على الإعدادات
    SELECT settings INTO result_settings
    FROM public.store_settings
    WHERE organization_id = _organization_id
    AND component_type = 'seo_settings';
    
    -- إذا لم يتم العثور على إعدادات، استخدم الإعدادات الافتراضية
    IF result_settings IS NULL THEN
        RETURN default_settings;
    END IF;
    
    RETURN result_settings;
END;
$$ LANGUAGE plpgsql; 