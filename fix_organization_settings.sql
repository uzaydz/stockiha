-- إصلاح لمشكلة تحديث إعدادات المؤسسة
-- هذا الملف يقوم بالتحقق من صحة وظيفة update_organization_settings ويقوم بتصحيحها

-- تحديث وظيفة update_organization_settings للتأكد من أنها تقوم بحفظ التغييرات بشكل صحيح
CREATE OR REPLACE FUNCTION update_organization_settings(
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
RETURNS organization_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings organization_settings;
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_old_values JSONB;
BEGIN
  -- التحقق من وجود المؤسسة وصلاحية المستخدم
  SELECT auth.uid() INTO v_user_id;
  
  SELECT u.is_org_admin OR u.is_super_admin INTO v_is_admin
  FROM users u
  WHERE u.id = v_user_id AND (u.organization_id = org_id OR u.is_super_admin = true);
  
  IF v_is_admin IS NULL OR NOT v_is_admin THEN
    RAISE EXCEPTION 'ليس لديك صلاحية تحديث إعدادات المؤسسة';
  END IF;
  
  -- حفظ القيم القديمة قبل التحديث للتدقيق
  SELECT row_to_json(os)::jsonb INTO v_old_values
  FROM organization_settings os
  WHERE os.organization_id = org_id;
  
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
      custom_js = COALESCE(p_custom_js, custom_js),
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
      display_text_with_logo,
      created_at,
      updated_at
    ) VALUES (
      org_id,
      COALESCE(p_theme_primary_color, '#0099FF'),
      COALESCE(p_theme_secondary_color, '#6c757d'),
      COALESCE(p_theme_mode, 'light'),
      COALESCE(p_site_name, ''),
      p_custom_css,
      p_logo_url,
      p_favicon_url,
      COALESCE(p_default_language, 'ar'),
      p_custom_js,
      p_custom_header,
      p_custom_footer,
      COALESCE(p_enable_registration, true),
      COALESCE(p_enable_public_site, true),
      COALESCE(p_display_text_with_logo, true),
      NOW(),
      NOW()
    ) RETURNING * INTO v_settings;
  END IF;
  
  -- إضافة سجل تدقيق للتحديث
  INSERT INTO settings_audit_log (
    user_id,
    organization_id,
    setting_type,
    setting_key,
    old_value,
    old_values,
    new_value,
    new_values,
    action_type,
    table_name,
    record_id,
    created_at
  ) VALUES (
    v_user_id,
    org_id,
    'organization',
    'general_settings',
    v_old_values::text,
    v_old_values,
    row_to_json(v_settings)::text,
    row_to_json(v_settings)::jsonb,
    'UPDATE',
    'organization_settings',
    v_settings.id,
    NOW()
  );
  
  -- تحديث ذاكرة التخزين المؤقت لإعدادات المؤسسة
  -- (يتم التعامل مع هذا في الواجهة الأمامية)
  
  RETURN v_settings;
END;
$$;

-- إنشاء وظيفة لإصلاح بيانات custom_js التي قد تكون تالفة
CREATE OR REPLACE FUNCTION fix_invalid_custom_js()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_rec RECORD;
  v_is_valid BOOLEAN;
  v_fixed_js TEXT;
BEGIN
  -- البحث عن جميع السجلات التي تحتوي على custom_js 
  FOR v_rec IN 
    SELECT id, organization_id, custom_js 
    FROM organization_settings 
    WHERE custom_js IS NOT NULL
  LOOP
    -- التحقق من صحة JSON
    BEGIN
      PERFORM (v_rec.custom_js::jsonb);
      v_is_valid := TRUE;
    EXCEPTION WHEN OTHERS THEN
      v_is_valid := FALSE;
    END;
    
    -- إذا كان JSON غير صالح، نقوم بتصحيحه
    IF NOT v_is_valid THEN
      -- إنشاء هيكل JSON أساسي صالح
      v_fixed_js := '{"trackingPixels":{"facebook":{"enabled":false,"pixelId":""},"tiktok":{"enabled":false,"pixelId":""},"snapchat":{"enabled":false,"pixelId":""},"google":{"enabled":false,"pixelId":""}}}';
      
      -- تحديث السجل بالقيمة المصححة
      UPDATE organization_settings 
      SET custom_js = v_fixed_js, updated_at = NOW()
      WHERE id = v_rec.id;
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- تشغيل وظيفة إصلاح البيانات
SELECT fix_invalid_custom_js(); 