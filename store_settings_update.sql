-- تحديث نظام إعدادات المتجر لدعم بكسل التتبع والمزيد من الإعدادات

-- التأكد من وجود امتداد uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- التحقق من وجود جدول إعدادات المتجر وتحديثه إذا لزم الأمر
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organization_settings'
  ) THEN
    -- إنشاء جدول إعدادات المؤسسة
    CREATE TABLE organization_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      theme_primary_color VARCHAR(20) NOT NULL DEFAULT '#0099ff',
      theme_secondary_color VARCHAR(20) NOT NULL DEFAULT '#6c757d',
      theme_mode VARCHAR(10) DEFAULT 'light', -- (light, dark, auto)
      site_name VARCHAR(100),
      custom_css TEXT DEFAULT NULL,
      logo_url TEXT DEFAULT NULL,
      favicon_url TEXT DEFAULT NULL,
      default_language VARCHAR(10) NOT NULL DEFAULT 'ar',
      custom_js TEXT DEFAULT NULL,
      custom_header TEXT DEFAULT NULL,
      custom_footer TEXT DEFAULT NULL,
      enable_registration BOOLEAN DEFAULT TRUE,
      enable_public_site BOOLEAN DEFAULT TRUE,
      display_text_with_logo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      CONSTRAINT unique_org_settings UNIQUE (organization_id)
    );
    
    -- إضافة تعليق للجدول
    COMMENT ON TABLE organization_settings IS 'إعدادات المتجر الإلكتروني للمؤسسة';
  ELSE
    -- تحديث الجدول إذا كان موجوداً بالفعل
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'display_text_with_logo') THEN
        ALTER TABLE organization_settings ADD COLUMN display_text_with_logo BOOLEAN DEFAULT TRUE;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'custom_js') THEN
        ALTER TABLE organization_settings ADD COLUMN custom_js TEXT DEFAULT NULL;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'custom_header') THEN
        ALTER TABLE organization_settings ADD COLUMN custom_header TEXT DEFAULT NULL;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'custom_footer') THEN
        ALTER TABLE organization_settings ADD COLUMN custom_footer TEXT DEFAULT NULL;
      END IF;
    END;
  END IF;
END $$;

-- إنشاء دالة المشغل لتحديث وقت التعديل
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- التحقق من وجود المشغل وإنشائه إذا لزم الأمر
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'set_timestamp_organization_settings'
  ) THEN
    CREATE TRIGGER set_timestamp_organization_settings
    BEFORE UPDATE ON organization_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  END IF;
END $$;

-- تفعيل أمان مستوى الصف
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة إن وجدت
DROP POLICY IF EXISTS read_organization_settings ON organization_settings;
DROP POLICY IF EXISTS insert_organization_settings ON organization_settings;
DROP POLICY IF EXISTS update_organization_settings ON organization_settings;
DROP POLICY IF EXISTS delete_organization_settings ON organization_settings;
DROP POLICY IF EXISTS admin_organization_settings ON organization_settings;

-- إنشاء سياسات الأمان
-- سياسة القراءة: يمكن لأي مستخدم في المؤسسة قراءة الإعدادات
CREATE POLICY read_organization_settings ON organization_settings
  FOR SELECT
  USING (auth.uid() IN (
    SELECT u.id FROM users u WHERE u.organization_id = organization_settings.organization_id
  ));

-- سياسة الإدخال: فقط مديرو المؤسسة والمستخدمون ذوو الصلاحيات يمكنهم إنشاء إعدادات
CREATE POLICY insert_organization_settings ON organization_settings
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT u.id FROM users u 
    WHERE u.organization_id = organization_settings.organization_id 
    AND (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
  ));

-- سياسة التحديث: فقط مديرو المؤسسة والمستخدمون ذوو الصلاحيات يمكنهم تحديث الإعدادات
CREATE POLICY update_organization_settings ON organization_settings
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT u.id FROM users u 
    WHERE u.organization_id = organization_settings.organization_id
    AND (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
  ));

-- سياسة الحذف: فقط مديرو المؤسسة والمستخدمون ذوو الصلاحيات يمكنهم حذف الإعدادات
CREATE POLICY delete_organization_settings ON organization_settings
  FOR DELETE
  USING (auth.uid() IN (
    SELECT u.id FROM users u 
    WHERE u.organization_id = organization_settings.organization_id
    AND (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
  ));

-- سياسة المدير الأعلى: يمكن للمدير الأعلى إدارة جميع الإعدادات
CREATE POLICY admin_organization_settings ON organization_settings
  FOR ALL
  USING (auth.uid() IN (
    SELECT u.id FROM users u WHERE u.is_super_admin = true
  ));

-- ========== إعداد سياسات التخزين لملفات المتجر ==========

-- التأكد من وجود دلو التخزين العام
DO $$
BEGIN
  -- التحقق من وجود دلو التخزين العام
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'bazaar-public'
  ) THEN
    -- إنشاء دلو التخزين العام
    INSERT INTO storage.buckets (id, name, public) VALUES ('bazaar-public', 'bazaar-public', TRUE);
    
    -- إعداد سياسة RLS
    CREATE POLICY "Public Access to bazaar-public" ON storage.objects FOR SELECT
    USING (bucket_id = 'bazaar-public');
  END IF;
END $$;

-- سياسات التخزين لمديري المؤسسات
DROP POLICY IF EXISTS "Organization Admin Storage Access" ON storage.objects;
CREATE POLICY "Organization Admin Storage Access" ON storage.objects
  USING (
    bucket_id = 'bazaar-public' AND
    (auth.uid() IN (
      SELECT u.id FROM users u 
      WHERE 
        -- المسار يبدأ بمعرف المؤسسة التي ينتمي إليها المستخدم
        (storage.foldername(name))[1] = 'organizations' AND
        (storage.foldername(name))[2] = u.organization_id::text AND
        (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
    ) OR
    -- أو المستخدم هو المدير الأعلى
    auth.uid() IN (SELECT id FROM users WHERE is_super_admin = true))
  );

-- سياسة الحذف
DROP POLICY IF EXISTS "Organization Admin Storage Delete" ON storage.objects;
CREATE POLICY "Organization Admin Storage Delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'bazaar-public' AND
    (auth.uid() IN (
      SELECT u.id FROM users u 
      WHERE 
        -- المسار يبدأ بمعرف المؤسسة التي ينتمي إليها المستخدم
        (storage.foldername(name))[1] = 'organizations' AND
        (storage.foldername(name))[2] = u.organization_id::text AND
        (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
    ) OR
    -- أو المستخدم هو المدير الأعلى
    auth.uid() IN (SELECT id FROM users WHERE is_super_admin = true))
  );

-- سياسة الإنشاء
DROP POLICY IF EXISTS "Organization Admin Storage Insert" ON storage.objects;
CREATE POLICY "Organization Admin Storage Insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'bazaar-public' AND
    (auth.uid() IN (
      SELECT u.id FROM users u 
      WHERE 
        -- المسار يبدأ بمعرف المؤسسة التي ينتمي إليها المستخدم
        (storage.foldername(name))[1] = 'organizations' AND
        (storage.foldername(name))[2] = u.organization_id::text AND
        (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
    ) OR
    -- أو المستخدم هو المدير الأعلى
    auth.uid() IN (SELECT id FROM users WHERE is_super_admin = true))
  );

-- إنشاء وظيفة للحصول على إعدادات المؤسسة
CREATE OR REPLACE FUNCTION get_organization_settings(org_id UUID)
RETURNS SETOF organization_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM organization_settings
  WHERE organization_id = org_id;
END
$$;

-- إنشاء وظيفة لتحديث إعدادات المؤسسة
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
BEGIN
  -- التحقق من وجود المؤسسة وصلاحية المستخدم
  SELECT auth.uid() INTO v_user_id;
  
  SELECT u.is_org_admin OR u.is_super_admin INTO v_is_admin
  FROM users u
  WHERE u.id = v_user_id AND (u.organization_id = org_id OR u.is_super_admin = true);
  
  IF v_is_admin IS NULL OR NOT v_is_admin THEN
    RAISE EXCEPTION 'ليس لديك صلاحية تحديث إعدادات المؤسسة';
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
      p_custom_js,
      p_custom_header,
      p_custom_footer,
      COALESCE(p_enable_registration, TRUE),
      COALESCE(p_enable_public_site, TRUE),
      COALESCE(p_display_text_with_logo, TRUE)
    )
    RETURNING * INTO v_settings;
  END IF;
  
  RETURN v_settings;
END
$$;

-- إنشاء مفهرس لتحسين أداء البحث
CREATE INDEX IF NOT EXISTS idx_organization_settings_organization_id 
ON organization_settings(organization_id);

-- دالة لتهيئة إعدادات المتجر عند إنشاء مؤسسة جديدة
CREATE OR REPLACE FUNCTION initialize_organization_settings()
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

-- إنشاء المشغل لتهيئة إعدادات المتجر تلقائيًا
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'initialize_organization_settings_trigger'
  ) THEN
    CREATE TRIGGER initialize_organization_settings_trigger
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION initialize_organization_settings();
  END IF;
END $$; 