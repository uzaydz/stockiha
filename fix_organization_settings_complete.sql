-- إصلاح شامل لمشاكل حفظ إعدادات المؤسسة
-- هذا الملف يحل جميع المشاكل المتعلقة بحفظ وتطبيق إعدادات المتجر

-- 1. إنشاء دالة محسنة لتحديث إعدادات المؤسسة
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
  v_is_admin BOOLEAN DEFAULT FALSE;
  v_old_values JSONB;
  v_custom_js_validated TEXT;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  SELECT auth.uid() INTO v_user_id;
  
  -- التحقق من وجود المستخدم
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير مسجل الدخول';
  END IF;
  
  -- التحقق من صلاحيات المستخدم بطريقة محسنة
  SELECT 
    CASE 
      WHEN u.is_super_admin = true THEN true
      WHEN u.is_org_admin = true AND u.organization_id = org_id THEN true
      WHEN u.permissions->>'manageOrganizationSettings' = 'true' AND u.organization_id = org_id THEN true
      ELSE false
    END INTO v_is_admin
  FROM users u
  WHERE u.id = v_user_id;
  
  -- إذا لم يتم العثور على المستخدم أو ليس لديه صلاحيات
  IF v_is_admin IS NULL OR NOT v_is_admin THEN
    RAISE EXCEPTION 'ليس لديك صلاحية تحديث إعدادات المؤسسة. معرف المستخدم: %, معرف المؤسسة: %', v_user_id, org_id;
  END IF;
  
  -- التحقق من وجود المؤسسة
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = org_id) THEN
    RAISE EXCEPTION 'المؤسسة غير موجودة: %', org_id;
  END IF;
  
  -- التحقق من صحة JSON في custom_js
  IF p_custom_js IS NOT NULL THEN
    BEGIN
      -- محاولة تحويل النص إلى JSONB للتحقق من صحته
      PERFORM p_custom_js::jsonb;
      v_custom_js_validated := p_custom_js;
    EXCEPTION WHEN OTHERS THEN
      -- إذا فشل التحويل، استخدم قيمة افتراضية
      v_custom_js_validated := '{}';
      RAISE WARNING 'قيمة custom_js غير صالحة، تم استخدام قيمة افتراضية: %', SQLERRM;
    END;
  ELSE
    v_custom_js_validated := p_custom_js;
  END IF;
  
  -- حفظ القيم القديمة للتدقيق
  SELECT row_to_json(os)::jsonb INTO v_old_values
  FROM organization_settings os
  WHERE os.organization_id = org_id;
  
  -- تحديث الإعدادات الموجودة أو إنشاء إعدادات جديدة
  IF EXISTS (SELECT 1 FROM organization_settings WHERE organization_id = org_id) THEN
    -- تحديث الإعدادات الموجودة
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
      custom_js = COALESCE(v_custom_js_validated, custom_js),
      custom_header = COALESCE(p_custom_header, custom_header),
      custom_footer = COALESCE(p_custom_footer, custom_footer),
      enable_registration = COALESCE(p_enable_registration, enable_registration),
      enable_public_site = COALESCE(p_enable_public_site, enable_public_site),
      display_text_with_logo = COALESCE(p_display_text_with_logo, display_text_with_logo),
      updated_at = NOW()
    WHERE organization_id = org_id
    RETURNING * INTO v_settings;
  ELSE
    -- إنشاء إعدادات جديدة
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
      COALESCE(p_site_name, 'متجر جديد'),
      p_custom_css,
      p_logo_url,
      p_favicon_url,
      COALESCE(p_default_language, 'ar'),
      v_custom_js_validated,
      p_custom_header,
      p_custom_footer,
      COALESCE(p_enable_registration, true),
      COALESCE(p_enable_public_site, true),
      COALESCE(p_display_text_with_logo, true),
      NOW(),
      NOW()
    ) RETURNING * INTO v_settings;
  END IF;
  
  -- التحقق من نجاح العملية
  IF v_settings IS NULL THEN
    RAISE EXCEPTION 'فشل في حفظ إعدادات المؤسسة';
  END IF;
  
  -- إضافة سجل تدقيق
  BEGIN
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
      COALESCE(v_old_values::text, 'NULL'),
      v_old_values,
      row_to_json(v_settings)::text,
      row_to_json(v_settings)::jsonb,
      CASE WHEN v_old_values IS NULL THEN 'INSERT' ELSE 'UPDATE' END,
      'organization_settings',
      v_settings.id,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- لا نريد أن يفشل التحديث بسبب مشكلة في التدقيق
    RAISE WARNING 'فشل في إضافة سجل التدقيق: %', SQLERRM;
  END;
  
  RETURN v_settings;
END;
$$;

-- 2. حذف الدالة القديمة وإعادة إنشائها بنوع الإرجاع الصحيح
DROP FUNCTION IF EXISTS get_organization_theme(UUID);

CREATE OR REPLACE FUNCTION get_organization_theme(p_organization_id UUID)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من وجود إعدادات للمؤسسة
  IF EXISTS (SELECT 1 FROM organization_settings WHERE organization_id = p_organization_id) THEN
    -- إرجاع إعدادات الثيم من جدول إعدادات المؤسسة
    RETURN QUERY
    SELECT jsonb_build_object(
      'organization_id', organization_id,
      'theme_primary_color', COALESCE(theme_primary_color, '#0099FF'),
      'theme_secondary_color', COALESCE(theme_secondary_color, '#6c757d'),
      'theme_mode', COALESCE(theme_mode, 'light'),
      'site_name', COALESCE(site_name, 'متجر جديد'),
      'logo_url', logo_url,
      'favicon_url', favicon_url,
      'custom_css', custom_css,
      'custom_js', custom_js,
      'custom_header', custom_header,
      'custom_footer', custom_footer
    )
    FROM organization_settings
    WHERE organization_id = p_organization_id;
  ELSE
    -- إرجاع إعدادات افتراضية إذا لم تكن هناك إعدادات للمؤسسة
    RETURN QUERY
    SELECT jsonb_build_object(
      'organization_id', p_organization_id,
      'theme_primary_color', '#0099FF',
      'theme_secondary_color', '#6c757d',
      'theme_mode', 'light',
      'site_name', 'متجر جديد',
      'logo_url', NULL,
      'favicon_url', NULL,
      'custom_css', NULL,
      'custom_js', NULL,
      'custom_header', NULL,
      'custom_footer', NULL
    );
  END IF;
END;
$$;

-- 3. إنشاء دالة للتحقق من صلاحيات المستخدم
CREATE OR REPLACE FUNCTION check_user_organization_permissions(
  user_id UUID,
  org_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN DEFAULT FALSE;
BEGIN
  SELECT 
    CASE 
      WHEN u.is_super_admin = true THEN true
      WHEN u.is_org_admin = true AND u.organization_id = org_id THEN true
      WHEN u.permissions->>'manageOrganizationSettings' = 'true' AND u.organization_id = org_id THEN true
      ELSE false
    END INTO v_has_permission
  FROM users u
  WHERE u.id = user_id;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- 4. تحديث سياسات الأمان
DROP POLICY IF EXISTS read_organization_settings ON organization_settings;
DROP POLICY IF EXISTS insert_organization_settings ON organization_settings;
DROP POLICY IF EXISTS update_organization_settings ON organization_settings;
DROP POLICY IF EXISTS delete_organization_settings ON organization_settings;

-- سياسة القراءة: يمكن لأي مستخدم في المؤسسة قراءة الإعدادات
CREATE POLICY read_organization_settings ON organization_settings
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT u.id FROM users u WHERE u.organization_id = organization_settings.organization_id
    ) OR
    auth.uid() IN (
      SELECT u.id FROM users u WHERE u.is_super_admin = true
    )
  );

-- سياسة الإدخال: فقط المستخدمون ذوو الصلاحيات
CREATE POLICY insert_organization_settings ON organization_settings
  FOR INSERT
  WITH CHECK (
    check_user_organization_permissions(auth.uid(), organization_id)
  );

-- سياسة التحديث: فقط المستخدمون ذوو الصلاحيات
CREATE POLICY update_organization_settings ON organization_settings
  FOR UPDATE
  USING (
    check_user_organization_permissions(auth.uid(), organization_id)
  );

-- سياسة الحذف: فقط المستخدمون ذوو الصلاحيات
CREATE POLICY delete_organization_settings ON organization_settings
  FOR DELETE
  USING (
    check_user_organization_permissions(auth.uid(), organization_id)
  );

-- 5. منح الصلاحيات للوظائف
GRANT EXECUTE ON FUNCTION update_organization_settings(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT, VARCHAR, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_theme(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_organization_permissions(UUID, UUID) TO authenticated;

-- 6. إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_settings_updated_at ON organization_settings(updated_at);

-- 7. إضافة تعليقات للوظائف
COMMENT ON FUNCTION update_organization_settings IS 'تحديث إعدادات المؤسسة مع التحقق من الصلاحيات والتدقيق';
COMMENT ON FUNCTION get_organization_theme IS 'الحصول على إعدادات ثيم المؤسسة مع القيم الافتراضية';
COMMENT ON FUNCTION check_user_organization_permissions IS 'التحقق من صلاحيات المستخدم لإدارة إعدادات المؤسسة'; 