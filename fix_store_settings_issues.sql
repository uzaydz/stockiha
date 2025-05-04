-- إصلاح مشكلة المشغلات والقيم غير الصالحة في organization_settings
-- تاريخ: إصدار 1.0

-- 1. إصلاح وظيفة log_settings_change لتجنب الوصول إلى component_type في organization_settings
CREATE OR REPLACE FUNCTION public.log_settings_change(setting_key TEXT DEFAULT NULL)
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
    user_org_id UUID;
    component_type_value TEXT;
BEGIN
    -- تحديد المؤسسة حسب نوع الجدول
    IF TG_TABLE_NAME = 'organization_settings' THEN
        org_id := NEW.organization_id;
        component_type_value := NULL; -- حقل غير موجود في organization_settings
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
        component_type_value := NULL; -- حقل غير موجود في user_settings
    ELSIF TG_TABLE_NAME = 'store_settings' THEN
        org_id := NEW.organization_id;
        component_type_value := NEW.component_type;
    END IF;

    -- تسجيل التغيير مع تحديد نوع الإعدادات
    INSERT INTO public.settings_audit_log (
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
        auth.uid(), 
        org_id,
        CASE
            WHEN TG_TABLE_NAME = 'organization_settings' THEN 'organization'
            WHEN TG_TABLE_NAME = 'user_settings' THEN 'user'
            WHEN TG_TABLE_NAME = 'store_settings' THEN 'store'
            ELSE 'unknown'
        END,
        COALESCE(
            setting_key, 
            CASE
                WHEN TG_TABLE_NAME = 'store_settings' AND component_type_value IS NOT NULL THEN 
                    'component_' || component_type_value
                ELSE 
                    TG_TABLE_NAME || '_setting'
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
$$;

-- 2. تحديث المشغل لاستخدام الوظيفة المعدلة
-- أولاً نحذف المشغل القديم ثم نعيد إنشاءه
DROP TRIGGER IF EXISTS organization_settings_audit_trigger ON organization_settings;

CREATE TRIGGER organization_settings_audit_trigger
AFTER INSERT OR UPDATE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('organization_settings');

-- 3. تحويل محتوى custom_js إلى JSON صالح بتهيئة بكسل التتبع إذا كان الحقل يحتوي على كود جافاسكريبت
-- نحتاج إلى تعديل قيمة custom_js للمؤسسة المحددة لتكون JSON صالح
DO $$
BEGIN
  UPDATE organization_settings
  SET custom_js = '{"trackingPixels": {"facebook": {"enabled": false, "pixelId": ""}, "tiktok": {"enabled": false, "pixelId": ""}, "snapchat": {"enabled": false, "pixelId": ""}, "google": {"enabled": false, "pixelId": ""}}}'
  WHERE organization_id = 'fed872f9-1ade-4351-b020-5598fda976fe'
  AND custom_js IS NOT NULL
  AND custom_js NOT LIKE '{%}';

  -- تحديث جميع السجلات الأخرى التي قد تحتوي على قيم غير صالحة
  UPDATE organization_settings
  SET custom_js = '{"trackingPixels": {"facebook": {"enabled": false, "pixelId": ""}, "tiktok": {"enabled": false, "pixelId": ""}, "snapchat": {"enabled": false, "pixelId": ""}, "google": {"enabled": false, "pixelId": ""}}}'
  WHERE custom_js IS NOT NULL
  AND custom_js NOT LIKE '{%}';
END;
$$;

-- 4. إنشاء وظيفة RPC مخصصة للتعامل مع تحديث الإعدادات بشكل آمن
CREATE OR REPLACE FUNCTION public.update_organization_settings_safe(
  org_id UUID,
  p_theme_primary_color VARCHAR(20) DEFAULT NULL,
  p_theme_secondary_color VARCHAR(20) DEFAULT NULL,
  p_theme_mode VARCHAR(10) DEFAULT NULL,
  p_site_name VARCHAR(100) DEFAULT NULL,
  p_custom_css TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_favicon_url TEXT DEFAULT NULL,
  p_default_language VARCHAR(10) DEFAULT NULL,
  p_custom_js TEXT DEFAULT NULL,
  p_custom_header TEXT DEFAULT NULL,
  p_custom_footer TEXT DEFAULT NULL,
  p_enable_registration BOOLEAN DEFAULT NULL,
  p_enable_public_site BOOLEAN DEFAULT NULL,
  p_display_text_with_logo BOOLEAN DEFAULT NULL
)
RETURNS SETOF organization_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings organization_settings;
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_custom_js TEXT;
BEGIN
  -- التحقق من وجود المؤسسة وصلاحية المستخدم
  SELECT auth.uid() INTO v_user_id;
  
  SELECT u.is_org_admin OR u.is_super_admin INTO v_is_admin
  FROM users u
  WHERE u.id = v_user_id AND (u.organization_id = org_id OR u.is_super_admin = true);
  
  IF v_is_admin IS NULL OR NOT v_is_admin THEN
    RAISE EXCEPTION 'ليس لديك صلاحية تحديث إعدادات المؤسسة';
  END IF;

  -- التحقق من صحة JSON
  IF p_custom_js IS NOT NULL THEN
    -- محاولة التحقق من صحة JSON
    BEGIN
      v_custom_js := p_custom_js;
      -- اختبار أن القيمة هي JSON صالح
      PERFORM json_typeof(v_custom_js::json);
    EXCEPTION WHEN OTHERS THEN
      -- إذا لم يكن JSON صالح، فاستخدم JSON افتراضي
      v_custom_js := '{"trackingPixels": {"facebook": {"enabled": false, "pixelId": ""}, "tiktok": {"enabled": false, "pixelId": ""}, "snapchat": {"enabled": false, "pixelId": ""}, "google": {"enabled": false, "pixelId": ""}}}';
    END;
  END IF;
  
  -- تحديث الإعدادات الموجودة أو إنشاء إعدادات جديدة
  IF EXISTS (SELECT 1 FROM organization_settings WHERE organization_id = org_id) THEN
    UPDATE organization_settings
    SET 
      theme_primary_color = COALESCE(p_theme_primary_color, theme_primary_color),
      theme_secondary_color = COALESCE(p_theme_secondary_color, theme_secondary_color),
      theme_mode = COALESCE(p_theme_mode, theme_mode),
      site_name = COALESCE(p_site_name, site_name),
      custom_css = COALESCE(p_custom_css, custom_css),
      logo_url = COALESCE(p_logo_url, logo_url),
      favicon_url = COALESCE(p_favicon_url, favicon_url),
      default_language = COALESCE(p_default_language, default_language),
      custom_js = COALESCE(v_custom_js, custom_js),
      custom_header = COALESCE(p_custom_header, custom_header),
      custom_footer = COALESCE(p_custom_footer, custom_footer),
      enable_registration = COALESCE(p_enable_registration, enable_registration),
      enable_public_site = COALESCE(p_enable_public_site, enable_public_site),
      display_text_with_logo = COALESCE(p_display_text_with_logo, display_text_with_logo),
      updated_at = NOW()
    WHERE organization_id = org_id
    RETURNING * INTO v_settings;
  ELSE
    INSERT INTO organization_settings (
      organization_id,
      theme_primary_color,
      theme_secondary_color,
      theme_mode,
      site_name,
      custom_css,
      logo_url,
      favicon_url,
      default_language,
      custom_js,
      custom_header,
      custom_footer,
      enable_registration,
      enable_public_site,
      display_text_with_logo
    ) VALUES (
      org_id,
      COALESCE(p_theme_primary_color, '#0099ff'),
      COALESCE(p_theme_secondary_color, '#6c757d'),
      COALESCE(p_theme_mode, 'light'),
      p_site_name,
      p_custom_css,
      p_logo_url,
      p_favicon_url,
      COALESCE(p_default_language, 'ar'),
      COALESCE(v_custom_js, '{"trackingPixels": {"facebook": {"enabled": false, "pixelId": ""}, "tiktok": {"enabled": false, "pixelId": ""}, "snapchat": {"enabled": false, "pixelId": ""}, "google": {"enabled": false, "pixelId": ""}}}'),
      p_custom_header,
      p_custom_footer,
      COALESCE(p_enable_registration, TRUE),
      COALESCE(p_enable_public_site, TRUE),
      COALESCE(p_display_text_with_logo, TRUE)
    )
    RETURNING * INTO v_settings;
  END IF;
  
  RETURN QUERY SELECT * FROM organization_settings WHERE id = v_settings.id;
END;
$$;

-- 5. تحديث كود العميل لاستخدام هذه الوظيفة
COMMENT ON FUNCTION update_organization_settings_safe IS 'وظيفة محسنة لتحديث إعدادات المؤسسة تتجنب مشاكل المشغلات وقيم JSON غير الصالحة'; 