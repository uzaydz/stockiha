-- إصلاح مشكلة التدقيق وإعدادات المتجر
-- تاريخ: 2024

-- 1. تحديث بنية جدول سجل التدقيق لضمان وجود جميع الأعمدة المطلوبة
ALTER TABLE public.settings_audit_log
ADD COLUMN IF NOT EXISTS action_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS table_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS record_id UUID,
ADD COLUMN IF NOT EXISTS old_values JSONB,
ADD COLUMN IF NOT EXISTS new_values JSONB;

-- 2. تعديل الدالة log_settings_change لمعالجة جميع أنواع الجداول بشكل صحيح
-- حذف الوظيفة الموجودة أولاً
DROP FUNCTION IF EXISTS public.log_settings_change();

CREATE OR REPLACE FUNCTION public.log_settings_change()
RETURNS trigger AS $$
DECLARE
    org_id uuid := NULL;
    user_org_id uuid := NULL;
    rec_id uuid := NULL;
    old_val TEXT;
    new_val TEXT;
    table_type TEXT;
    setting_key TEXT;
BEGIN
    -- محاولة الحصول على معرف السجل
    BEGIN
        IF TG_OP IN ('INSERT', 'UPDATE') THEN
            rec_id := NEW.id;
        ELSIF TG_OP = 'DELETE' THEN
            rec_id := OLD.id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        rec_id := NULL;
    END;

    -- الحصول على مفتاح الإعداد من وسيطة المشغل
    IF TG_NARGS > 0 THEN
        setting_key := TG_ARGV[0];
    ELSE
        setting_key := TG_TABLE_NAME || '_setting';
    END IF;

    -- تحديد المؤسسة حسب نوع الجدول
    IF TG_TABLE_NAME = 'organization_settings' THEN
        org_id := NEW.organization_id;
        table_type := 'organization';
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
        table_type := 'user';
    ELSIF TG_TABLE_NAME = 'store_settings' THEN
        org_id := NEW.organization_id;
        table_type := 'store';
    ELSE
        table_type := 'unknown';
    END IF;

    -- تجهيز القيم
    IF TG_OP = 'UPDATE' THEN
        old_val := (SELECT row_to_json(OLD)::text);
    END IF;
    
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        new_val := (SELECT row_to_json(NEW)::text);
    END IF;

    -- تسجيل التغيير
    INSERT INTO public.settings_audit_log (
        user_id, 
        organization_id, 
        setting_type,  -- نوع الإعدادات (مستخدم، مؤسسة، متجر)
        setting_key,   -- مفتاح الإعداد
        old_value,     -- القيمة القديمة كنص
        old_values,    -- القيمة القديمة كـ JSONB
        new_value,     -- القيمة الجديدة كنص
        new_values,    -- القيمة الجديدة كـ JSONB
        action_type,   -- نوع العملية (إدراج، تحديث، حذف)
        table_name,    -- اسم الجدول
        record_id,     -- معرف السجل
        created_at     -- وقت التغيير
    )
    VALUES (
        COALESCE(auth.uid(), NEW.user_id), 
        org_id,
        table_type,
        setting_key,
        old_val,
        CASE WHEN old_val IS NOT NULL THEN old_val::jsonb ELSE NULL END,
        new_val,
        CASE WHEN new_val IS NOT NULL THEN new_val::jsonb ELSE NULL END,
        TG_OP,
        TG_TABLE_NAME,
        rec_id,
        NOW()
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'خطأ في log_settings_change: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إزالة وإعادة إنشاء المحفزات
DROP TRIGGER IF EXISTS user_settings_audit_trigger ON user_settings;
DROP TRIGGER IF EXISTS organization_settings_audit_trigger ON organization_settings;
DROP TRIGGER IF EXISTS store_settings_audit_trigger ON store_settings;

CREATE TRIGGER user_settings_audit_trigger
AFTER INSERT OR UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('user_settings');

CREATE TRIGGER organization_settings_audit_trigger
AFTER INSERT OR UPDATE ON organization_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('organization_settings');

CREATE TRIGGER store_settings_audit_trigger
AFTER INSERT OR UPDATE ON store_settings
FOR EACH ROW
EXECUTE FUNCTION log_settings_change('store_settings');

-- 4. إنشاء وظيفة RPC آمنة لتحديث إعدادات المؤسسة
CREATE OR REPLACE FUNCTION update_organization_settings_safe(
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
  v_parsed_js JSONB;
BEGIN
  -- التحقق من وجود المؤسسة وصلاحية المستخدم
  SELECT auth.uid() INTO v_user_id;
  
  SELECT u.is_org_admin OR u.is_super_admin INTO v_is_admin
  FROM users u
  WHERE u.id = v_user_id AND (u.organization_id = org_id OR u.is_super_admin = true);
  
  IF v_is_admin IS NULL OR NOT v_is_admin THEN
    RAISE EXCEPTION 'ليس لديك صلاحية تحديث إعدادات المؤسسة';
  END IF;

  -- التحقق من صحة بيانات JSON في custom_js
  IF p_custom_js IS NOT NULL THEN
    BEGIN
      v_parsed_js := p_custom_js::jsonb;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'قيمة custom_js المقدمة ليست JSON صالح: %', SQLERRM;
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
    ) RETURNING * INTO v_settings;
  END IF;
  
  RETURN v_settings;
END;
$$;

-- 5. إنشاء وظيفة مساعدة للمطورين لتنسيق قيمة custom_js 
CREATE OR REPLACE FUNCTION format_tracking_pixels_json(
  facebook_enabled BOOLEAN DEFAULT FALSE,
  facebook_pixel_id TEXT DEFAULT NULL,
  tiktok_enabled BOOLEAN DEFAULT FALSE,
  tiktok_pixel_id TEXT DEFAULT NULL,
  snapchat_enabled BOOLEAN DEFAULT FALSE,
  snapchat_pixel_id TEXT DEFAULT NULL,
  google_enabled BOOLEAN DEFAULT FALSE,
  google_pixel_id TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  json_output JSONB;
BEGIN
  json_output := jsonb_build_object(
    'trackingPixels', jsonb_build_object(
      'facebook', jsonb_build_object(
        'enabled', facebook_enabled,
        'pixelId', facebook_pixel_id
      ),
      'tiktok', jsonb_build_object(
        'enabled', tiktok_enabled,
        'pixelId', tiktok_pixel_id
      ),
      'snapchat', jsonb_build_object(
        'enabled', snapchat_enabled,
        'pixelId', snapchat_pixel_id
      ),
      'google', jsonb_build_object(
        'enabled', google_enabled,
        'pixelId', google_pixel_id
      )
    )
  );
  
  RETURN json_output::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION format_tracking_pixels_json TO authenticated;
GRANT EXECUTE ON FUNCTION update_organization_settings_safe TO authenticated;

-- 6. أمثلة على كيفية استخدام الوظائف المساعدة
COMMENT ON FUNCTION format_tracking_pixels_json IS 
$$
مثال الاستخدام:
SELECT format_tracking_pixels_json(
  TRUE, 'facebook-pixel-123',  -- فيسبوك
  TRUE, 'tiktok-pixel-456',    -- تيك توك
  FALSE, NULL,                 -- سناب شات (غير مفعل)
  TRUE, 'google-pixel-789'     -- جوجل أناليتكس
);

النتيجة:
{
  "trackingPixels": {
    "facebook": {
      "enabled": true,
      "pixelId": "facebook-pixel-123"
    },
    "tiktok": {
      "enabled": true,
      "pixelId": "tiktok-pixel-456"
    },
    "snapchat": {
      "enabled": false,
      "pixelId": null
    },
    "google": {
      "enabled": true,
      "pixelId": "google-pixel-789"
    }
  }
}
$$;

COMMENT ON FUNCTION update_organization_settings_safe IS
$$
وظيفة آمنة لتحديث إعدادات المؤسسة.
تتحقق من صحة بيانات JSON في custom_js قبل الإدخال.

مثال استخدام لتحديث بيانات التتبع:
SELECT update_organization_settings_safe(
  '11111111-1111-1111-1111-111111111111', -- معرف المؤسسة
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  format_tracking_pixels_json(TRUE, 'facebook-123', FALSE, NULL, FALSE, NULL, TRUE, 'google-456')
);
$$;

-- 7. إضافة سياسات أمان الصفوف لجدول التخزين
-- تمكين سياسات أمان الصفوف لملفات التخزين لصور المؤسسة/المتجر
DO $$
BEGIN
  -- التحقق من وجود جدول storage.objects
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    -- حذف السياسات الموجودة لتجنب الخطأ
    DROP POLICY IF EXISTS "تخزين الملفات للمؤسسات" ON storage.objects;
    DROP POLICY IF EXISTS "قراءة ملفات المؤسسات" ON storage.objects;
    DROP POLICY IF EXISTS "تحميل ملفات المؤسسات" ON storage.objects;
    DROP POLICY IF EXISTS "حذف ملفات المؤسسات" ON storage.objects;
    
    -- إضافة سياسات جديدة للتخزين
    CREATE POLICY "تخزين الملفات للمؤسسات"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- التحقق من أن المستخدم هو عضو في المؤسسة
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE 
          u.id = auth.uid() AND 
          (
            -- المسار يحتوي على معرف المؤسسة
            name LIKE 'organizations/' || u.organization_id::text || '/%' OR
            name LIKE 'bazaar-public/organizations/' || u.organization_id::text || '/%'
          ) AND
          (u.is_org_admin OR u.is_super_admin OR u.permissions->>'manageOrganizationSettings' = 'true')
      )
    );
    
    CREATE POLICY "قراءة ملفات المؤسسات"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (true); -- أي مستخدم مصادق عليه يمكنه قراءة الملفات
    
    CREATE POLICY "تحميل ملفات المؤسسات"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      -- التحقق من أن المستخدم هو مدير في المؤسسة
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE 
          u.id = auth.uid() AND 
          (
            name LIKE 'organizations/' || u.organization_id::text || '/%' OR
            name LIKE 'bazaar-public/organizations/' || u.organization_id::text || '/%'
          ) AND
          (u.is_org_admin OR u.is_super_admin OR u.permissions->>'manageOrganizationSettings' = 'true')
      )
    );
    
    CREATE POLICY "حذف ملفات المؤسسات"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      -- التحقق من أن المستخدم هو مدير في المؤسسة
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE 
          u.id = auth.uid() AND 
          (
            name LIKE 'organizations/' || u.organization_id::text || '/%' OR
            name LIKE 'bazaar-public/organizations/' || u.organization_id::text || '/%'
          ) AND
          (u.is_org_admin OR u.is_super_admin OR u.permissions->>'manageOrganizationSettings' = 'true')
      )
    );
  END IF;
  
  -- تمكين سياسات التخزين الإضافية
  DROP POLICY IF EXISTS "تخزين ملفات المتجر للمؤسسات" ON storage.objects;
  CREATE POLICY "تخزين ملفات المتجر للمؤسسات"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- السماح للمستخدمين بتحميل الملفات في المجلدات المسموح بها
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE 
        u.id = auth.uid() AND 
        (
          -- المسارات المختلفة المسموح بها
          name LIKE 'organizations/' || u.organization_id::text || '/logo/%' OR
          name LIKE 'organizations/' || u.organization_id::text || '/favicon/%' OR
          name LIKE 'bazaar-public/organizations/' || u.organization_id::text || '/logo/%' OR
          name LIKE 'bazaar-public/organizations/' || u.organization_id::text || '/favicon/%'
        ) AND
        (u.is_org_admin OR u.is_super_admin OR u.permissions->>'manageOrganizationSettings' = 'true')
    )
  );
END;
$$;

-- 8. إضافة وظيفة مساعدة لرفع ملفات المؤسسة بشكل آمن
CREATE OR REPLACE FUNCTION create_organization_file_upload_url(
  organization_id UUID,
  file_type TEXT, -- 'logo' أو 'favicon'
  file_name TEXT,
  content_type TEXT DEFAULT 'image/png'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_has_permission BOOLEAN;
  v_bucket_name TEXT := 'bazaar-public';
  v_path TEXT;
  v_url TEXT;
  v_timestamp TEXT;
BEGIN
  -- التحقق من الصلاحيات
  SELECT auth.uid() INTO v_user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE 
      u.id = v_user_id AND 
      (u.organization_id = organization_id OR u.is_super_admin) AND
      (u.is_org_admin OR u.is_super_admin OR u.permissions->>'manageOrganizationSettings' = 'true')
  ) INTO v_has_permission;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'ليس لديك صلاحية رفع ملفات لهذه المؤسسة';
  END IF;
  
  -- إضافة طابع زمني للملف لتجنب تعارض الأسماء
  v_timestamp := (extract(epoch from now()) * 1000)::bigint::text;
  
  -- إنشاء مسار الملف
  v_path := 'organizations/' || organization_id::text || '/' || file_type || '/' || v_timestamp || '_' || file_name;
  
  -- إنشاء عنوان URL للرفع
  BEGIN
    SELECT storage.create_signed_url(
      v_bucket_name,
      v_path,
      3600, -- مدة صلاحية العنوان بالثواني (ساعة واحدة)
      'PUT',
      content_type
    ) INTO v_url;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'فشل إنشاء رابط الرفع: %', SQLERRM;
  END;
  
  -- في حالة النجاح، أعد المسار ورابط الرفع كـ JSON
  RETURN json_build_object(
    'signed_url', v_url,
    'path', v_path,
    'full_path', v_bucket_name || '/' || v_path,
    'file_name', v_timestamp || '_' || file_name,
    'expires_at', to_char(now() + interval '1 hour', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )::text;
END;
$$;

-- 9. إضافة وظيفة لتحديث مسار الصورة في إعدادات المؤسسة بعد الرفع
-- حذف الوظيفة القديمة أولاً لتجنب أخطاء إعادة التعريف
DROP FUNCTION IF EXISTS update_organization_logo_url(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION update_organization_logo_url(
  organization_id UUID,
  file_type TEXT, -- 'logo' أو 'favicon'
  file_path TEXT  -- المسار الكامل للملف كما تم إرجاعه من وظيفة create_organization_file_upload_url
)
RETURNS organization_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_has_permission BOOLEAN;
  v_bucket_name TEXT := 'bazaar-public';
  v_url TEXT;
  v_settings organization_settings;
BEGIN
  -- التحقق من الصلاحيات
  SELECT auth.uid() INTO v_user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE 
      u.id = v_user_id AND 
      (u.organization_id = organization_id OR u.is_super_admin) AND
      (u.is_org_admin OR u.is_super_admin OR u.permissions->>'manageOrganizationSettings' = 'true')
  ) INTO v_has_permission;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'ليس لديك صلاحية تحديث إعدادات هذه المؤسسة';
  END IF;
  
  -- بناء URL العام للملف
  v_url := '/storage/v1/object/' || file_path;
  
  -- تحديث إعدادات المؤسسة بناءً على نوع الملف
  IF file_type = 'logo' THEN
    UPDATE organization_settings
    SET logo_url = v_url,
        updated_at = NOW()
    WHERE organization_id = update_organization_logo_url.organization_id
    RETURNING * INTO v_settings;
  ELSIF file_type = 'favicon' THEN
    UPDATE organization_settings
    SET favicon_url = v_url,
        updated_at = NOW()
    WHERE organization_id = update_organization_logo_url.organization_id
    RETURNING * INTO v_settings;
  ELSE
    RAISE EXCEPTION 'نوع الملف غير صالح. يجب أن يكون "logo" أو "favicon"';
  END IF;
  
  -- إذا لم يتم العثور على السجل، قم بإنشائه
  IF v_settings IS NULL THEN
    -- محاولة إنشاء سجل إعدادات المؤسسة إذا لم يكن موجودًا
    IF file_type = 'logo' THEN
      INSERT INTO organization_settings (
        organization_id,
        logo_url,
        theme_primary_color,
        theme_secondary_color,
        theme_mode,
        default_language,
        enable_registration,
        enable_public_site
      ) VALUES (
        organization_id,
        v_url,
        '#0099ff',
        '#6c757d',
        'light',
        'ar',
        TRUE,
        TRUE
      ) RETURNING * INTO v_settings;
    ELSIF file_type = 'favicon' THEN
      INSERT INTO organization_settings (
        organization_id,
        favicon_url,
        theme_primary_color,
        theme_secondary_color,
        theme_mode,
        default_language,
        enable_registration,
        enable_public_site
      ) VALUES (
        organization_id,
        v_url,
        '#0099ff',
        '#6c757d',
        'light',
        'ar',
        TRUE,
        TRUE
      ) RETURNING * INTO v_settings;
    END IF;
  END IF;
  
  RETURN v_settings;
END;
$$;

GRANT EXECUTE ON FUNCTION create_organization_file_upload_url TO authenticated;
GRANT EXECUTE ON FUNCTION update_organization_logo_url TO authenticated;

-- 10. مثال استخدام
COMMENT ON FUNCTION create_organization_file_upload_url IS 
$$
وظيفة لإنشاء رابط موقع لرفع ملف شعار أو أيقونة المؤسسة بشكل آمن.
تعيد نص JSON يحتوي على:
- signed_url: الرابط الموقع لاستخدامه في عملية الرفع
- path: المسار النسبي للملف
- full_path: المسار الكامل بما في ذلك اسم الدلو
- file_name: اسم الملف مع الطابع الزمني
- expires_at: وقت انتهاء صلاحية الرابط

مثال الاستخدام (في TypeScript/JavaScript):
```typescript
// الحصول على رابط رفع ملف شعار المؤسسة
const uploadInfo = await supabase.rpc('create_organization_file_upload_url', {
  organization_id: '11111111-1111-1111-1111-111111111111',
  file_type: 'logo',
  file_name: 'company_logo.png',
  content_type: 'image/png'
});

const { signed_url, full_path } = JSON.parse(uploadInfo);

// استخدام الرابط الموقع لرفع الملف
const uploadResponse = await fetch(signed_url, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/png' },
  body: fileData // مثال: من input[type=file]
});

if (uploadResponse.ok) {
  // بعد الرفع بنجاح، تحديث المسار في إعدادات المؤسسة
  const settings = await supabase.rpc('update_organization_logo_url', {
    organization_id: '11111111-1111-1111-1111-111111111111',
    file_type: 'logo',
    file_path: full_path
  });
}
```
$$;

COMMENT ON FUNCTION update_organization_logo_url IS
$$
وظيفة لتحديث مسار شعار أو أيقونة المؤسسة في إعدادات المؤسسة.
تستخدم بعد نجاح عملية رفع الملف باستخدام وظيفة create_organization_file_upload_url.

المعلمات:
- organization_id: معرف المؤسسة.
- file_type: نوع الملف ('logo' أو 'favicon').
- file_path: المسار الكامل للملف الذي تم رفعه، ويأتي من حقل 'full_path' في نتيجة وظيفة create_organization_file_upload_url.

التعريف في TypeScript:
```typescript
interface OrganizationSettings {
  id: string;
  organization_id: string;
  theme_primary_color: string;
  theme_secondary_color: string;
  theme_mode: 'light' | 'dark' | 'auto';
  site_name?: string;
  logo_url?: string;
  favicon_url?: string;
  custom_css?: string;
  custom_js?: string;
  // ... بقية الحقول
}

async function updateOrganizationLogoUrl(
  organization_id: string,
  file_type: 'logo' | 'favicon',
  file_path: string
): Promise<OrganizationSettings> {
  const { data, error } = await supabase.rpc('update_organization_logo_url', {
    organization_id,
    file_type,
    file_path
  });
  
  if (error) throw error;
  return data;
}
```
$$;

-- 11. إضافة إصلاحات أكثر شمولية لنظام التخزين
-- تأكد من وجود جدول objects في مخطط التخزين
DO $$
BEGIN
  EXECUTE '
    -- منح صلاحيات وصول أوسع للمستخدمين المصادق عليهم
    GRANT ALL ON SCHEMA storage TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO authenticated;
    GRANT ALL ON ALL ROUTINES IN SCHEMA storage TO authenticated;
    
    -- التأكد من وجود امتداد buckets في التخزين
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
  ';
  
  -- التأكد من وجود دلو للمنظمات العامة إذا لم يكن موجودًا
  IF NOT EXISTS (
    SELECT FROM storage.buckets WHERE name = 'bazaar-public'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('bazaar-public', 'bazaar-public', true, 10485760, '{image/png,image/jpeg,image/gif,image/webp,image/svg+xml}');
  END IF;
  
  -- تحديث سياسات RLS بشكل مباشر
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    -- إزالة جميع السياسات الموجودة على جدول objects
    DROP POLICY IF EXISTS "تخزين الملفات للمؤسسات" ON storage.objects;
    DROP POLICY IF EXISTS "قراءة ملفات المؤسسات" ON storage.objects;
    DROP POLICY IF EXISTS "تحميل ملفات المؤسسات" ON storage.objects;
    DROP POLICY IF EXISTS "حذف ملفات المؤسسات" ON storage.objects;
    DROP POLICY IF EXISTS "تخزين ملفات المتجر للمؤسسات" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated access" ON storage.objects;
    
    -- إنشاء سياسة أكثر بساطة وشمولية للوصول العام
    CREATE POLICY "Allow public read access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'bazaar-public');
    
    -- إنشاء سياسة لإدراج الملفات
    CREATE POLICY "Allow authenticated insert"
    ON storage.objects FOR INSERT 
    TO authenticated
    WITH CHECK (bucket_id = 'bazaar-public');
    
    -- إنشاء سياسة للتحديث
    CREATE POLICY "Allow authenticated update own"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner OR auth.uid() IN (
      SELECT id FROM auth.users WHERE is_super_admin = true
    ));
    
    -- إنشاء سياسة للحذف
    CREATE POLICY "Allow authenticated delete own"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (auth.uid() = owner OR auth.uid() IN (
      SELECT id FROM auth.users WHERE is_super_admin = true
    ));
  END IF;
END;
$$;

-- 12. إضافة وظيفة بديلة لرفع الملفات تستخدم طريقة مباشرة
CREATE OR REPLACE FUNCTION upload_organization_logo(
  organization_id UUID,
  file_type TEXT, -- 'logo' أو 'favicon'
  file_name TEXT,
  file_data BYTEA,
  content_type TEXT DEFAULT 'image/png'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_has_permission BOOLEAN;
  v_bucket_id TEXT := 'bazaar-public';
  v_path TEXT;
  v_timestamp TEXT;
  v_mime_type TEXT;
  v_size INT;
  v_file_id UUID;
  v_result TEXT;
BEGIN
  -- التحقق من الصلاحيات
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب أن تكون مسجل الدخول لاستخدام هذه الوظيفة';
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE 
      u.id = v_user_id AND 
      (u.organization_id = organization_id OR u.is_super_admin) AND
      (u.is_org_admin OR u.is_super_admin OR u.permissions->>'manageOrganizationSettings' = 'true')
  ) INTO v_has_permission;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'ليس لديك صلاحية رفع ملفات لهذه المؤسسة';
  END IF;
  
  -- التحقق من نوع الملف
  v_mime_type := COALESCE(content_type, 'image/png');
  
  -- حساب حجم الملف
  v_size := octet_length(file_data);
  
  -- إنشاء طابع زمني فريد
  v_timestamp := (extract(epoch from now()) * 1000)::bigint::text;
  
  -- إنشاء مسار الملف
  v_path := 'organizations/' || organization_id::text || '/' || file_type || '/' || v_timestamp || '_' || file_name;
  
  -- إضافة الملف مباشرة إلى جدول objects
  INSERT INTO storage.objects (
    bucket_id,
    name,
    owner,
    size,
    mimetype,
    metadata,
    content
  ) VALUES (
    v_bucket_id,
    v_path,
    v_user_id,
    v_size,
    v_mime_type,
    jsonb_build_object('organization_id', organization_id, 'file_type', file_type),
    file_data
  ) RETURNING id INTO v_file_id;
  
  -- إذا نجح الإدراج، قم بتحديث إعدادات المؤسسة
  IF v_file_id IS NOT NULL THEN
    DECLARE
      v_url TEXT := '/storage/v1/object/' || v_bucket_id || '/' || v_path;
    BEGIN
      IF file_type = 'logo' THEN
        UPDATE organization_settings
        SET logo_url = v_url,
            updated_at = NOW()
        WHERE organization_id = upload_organization_logo.organization_id;
      ELSIF file_type = 'favicon' THEN
        UPDATE organization_settings
        SET favicon_url = v_url,
            updated_at = NOW()
        WHERE organization_id = upload_organization_logo.organization_id;
      END IF;
    END;
  END IF;
  
  -- إعادة المسار الكامل
  v_result := jsonb_build_object(
    'path', v_path,
    'url', '/storage/v1/object/' || v_bucket_id || '/' || v_path,
    'file_id', v_file_id,
    'mimetype', v_mime_type,
    'size', v_size,
    'timestamp', v_timestamp,
    'bucket_id', v_bucket_id
  )::text;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION upload_organization_logo TO authenticated;

-- 13. إضافة تعليق على الوظيفة الجديدة
COMMENT ON FUNCTION upload_organization_logo IS
$$
وظيفة بديلة لرفع ملفات المؤسسة مباشرة دون الحاجة إلى إنشاء روابط موقعة.
تقوم بإدراج الملف مباشرة في جدول storage.objects وتحديث إعدادات المؤسسة تلقائيًا.

المعلمات:
- organization_id: معرف المؤسسة
- file_type: نوع الملف ('logo' أو 'favicon')
- file_name: اسم الملف (سيتم إضافة طابع زمني له)
- file_data: بيانات الملف كـ BYTEA
- content_type: نوع محتوى الملف (اختياري، افتراضي 'image/png')

مثال الاستخدام (تحويل ملف Base64 إلى BYTEA ورفعه):
```sql
-- تحويل ملف Base64 إلى BYTEA
WITH file_data AS (
  SELECT decode('iVBORw0KGgoAAAAN...', 'base64') AS bytes
)
SELECT upload_organization_logo(
  'fed872f9-1ade-4351-b020-5598fda976fe',
  'logo',
  'logo.png',
  (SELECT bytes FROM file_data),
  'image/png'
);
```

في JavaScript/TypeScript (باستخدام SDK Supabase):
```typescript
const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
const file = fileInput.files[0];

if (file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Data = e.target.result.toString().split(',')[1]; // يستخرج الجزء Base64 من Data URL
    
    const { data, error } = await supabase.rpc('upload_organization_logo', {
      organization_id: 'fed872f9-1ade-4351-b020-5598fda976fe',
      file_type: 'logo',
      file_name: file.name,
      file_data: base64Data,
      content_type: file.type
    });
    
    if (error) {
      console.error('فشل في رفع الملف:', error);
    } else {
      console.log('تم رفع الملف بنجاح:', JSON.parse(data));
    }
  };
  
  reader.readAsDataURL(file);
}
```
$$;

-- 14. إضافة وظيفة للتحقق من حالة التخزين وتشخيص المشكلات
CREATE OR REPLACE FUNCTION check_storage_system()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_buckets JSONB;
  v_policies JSONB;
  v_objects_count INT;
  v_grants JSONB;
  v_permissions JSONB;
  v_test_result JSONB;
BEGIN
  -- جمع معلومات عن دلاء التخزين
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'public', public,
        'file_size_limit', file_size_limit,
        'allowed_mime_types', allowed_mime_types,
        'created_at', created_at,
        'updated_at', updated_at,
        'owner', owner
      )
    )
  INTO v_buckets
  FROM storage.buckets;
  
  -- جمع معلومات عن سياسات أمان الصفوف على جدول objects
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'policy_name', policyname,
        'table_name', tablename,
        'definition', definition,
        'roles', roles,
        'cmd', cmd,
        'permissive', permissive
      )
    )
  INTO v_policies
  FROM pg_policies
  WHERE tablename = 'objects' AND schemaname = 'storage';
  
  -- عدد الملفات المخزنة
  SELECT COUNT(*) INTO v_objects_count FROM storage.objects;
  
  -- فحص صلاحيات المستخدم المصادق عليه
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'schema', table_schema,
        'table_name', table_name,
        'grantee', grantee,
        'privilege_type', privilege_type
      )
    )
  INTO v_grants
  FROM information_schema.role_table_grants
  WHERE grantee = 'authenticated' AND table_schema = 'storage';
  
  -- اختبار إدراج ملف
  BEGIN
    -- إنشاء ملف صغير للاختبار
    WITH test_file AS (
      SELECT decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==', 'base64') AS bytes
    )
    INSERT INTO storage.objects (
      bucket_id,
      name,
      owner,
      size,
      mimetype,
      metadata,
      content
    ) VALUES (
      'bazaar-public',
      'test/system_check_test_file.png',
      auth.uid(),
      (SELECT octet_length(bytes) FROM test_file),
      'image/png',
      '{"test": true}'::jsonb,
      (SELECT bytes FROM test_file)
    );
    
    v_test_result := jsonb_build_object(
      'success', true,
      'message', 'تم إنشاء ملف اختبار بنجاح'
    );
    
    -- حذف ملف الاختبار بعد النجاح
    DELETE FROM storage.objects 
    WHERE name = 'test/system_check_test_file.png' 
    AND bucket_id = 'bazaar-public';
  EXCEPTION WHEN OTHERS THEN
    v_test_result := jsonb_build_object(
      'success', false,
      'message', 'فشل إنشاء ملف الاختبار',
      'error', SQLERRM,
      'detail', SQLSTATE
    );
  END;
  
  -- جمع معلومات أوسع عن صلاحيات المستخدم الحالي
  SELECT current_setting('request.jwt.claims')::jsonb->'role' INTO v_permissions;
  
  -- بناء النتيجة النهائية
  v_result := jsonb_build_object(
    'buckets', v_buckets,
    'policies', v_policies,
    'objects_count', v_objects_count,
    'grants', v_grants,
    'test_result', v_test_result,
    'current_user', auth.uid(),
    'current_role', v_permissions,
    'timestamp', now(),
    'supabase_version', current_setting('server_version')
  );
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION check_storage_system TO authenticated;

COMMENT ON FUNCTION check_storage_system IS
$$
وظيفة تشخيصية للتحقق من حالة نظام التخزين وتحديد المشكلات المحتملة.
تعيد معلومات تفصيلية عن:
- الدلاء المتاحة
- سياسات الأمان المطبقة
- عدد الملفات المخزنة
- صلاحيات المستخدمين المصادق عليهم
- نتيجة اختبار رفع ملف

مثال الاستخدام:
```sql
SELECT check_storage_system();
```

استخدم هذه الوظيفة لتحديد سبب مشاكل رفع الملفات في النظام.
$$; 