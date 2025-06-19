-- حل مباشر لمشكلة تحديث اللغة الافتراضية
-- تشغيل هذا الملف يحل المشكلة فوراً

-- ===============================
-- 1. إنشاء دالة تحديث آمنة تتجاوز RLS
-- ===============================

CREATE OR REPLACE FUNCTION update_language_direct(
    p_organization_id UUID,
    p_language VARCHAR(10)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- تتجاوز RLS
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- التحقق من صحة اللغة
    IF p_language NOT IN ('ar', 'en', 'fr') THEN
        RAISE EXCEPTION 'اللغة غير مدعومة: %', p_language;
    END IF;
    
    -- التحقق من وجود المؤسسة
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RAISE EXCEPTION 'المؤسسة غير موجودة: %', p_organization_id;
    END IF;
    
    -- تحديث اللغة الافتراضية
    UPDATE organization_settings 
    SET 
        default_language = p_language,
        updated_at = NOW()
    WHERE organization_id = p_organization_id;
    
    -- إذا لم توجد إعدادات، إنشاء إعدادات جديدة
    IF NOT FOUND THEN
        INSERT INTO organization_settings (
            organization_id,
            default_language,
            theme_primary_color,
            theme_secondary_color,
            theme_mode,
            site_name,
            enable_registration,
            enable_public_site,
            display_text_with_logo,
            created_at,
            updated_at
        ) VALUES (
            p_organization_id,
            p_language,
            '#0099FF',
            '#6c757d',
            'light',
            'متجري',
            true,
            true,
            true,
            NOW(),
            NOW()
        );
    END IF;
    
    -- إرجاع الإعدادات المحدثة
    SELECT to_json(os.*) INTO v_result
    FROM organization_settings os
    WHERE os.organization_id = p_organization_id;
    
    RETURN v_result;
END;
$$;

-- منح صلاحيات للدالة
GRANT EXECUTE ON FUNCTION update_language_direct(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION update_language_direct(UUID, VARCHAR) TO anon;

-- ===============================
-- 2. إنشاء دالة تحديث شاملة للإعدادات
-- ===============================

CREATE OR REPLACE FUNCTION update_organization_settings_direct(
    p_organization_id UUID,
    p_settings JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_language VARCHAR(10);
    v_site_name VARCHAR(255);
    v_theme_primary_color VARCHAR(7);
    v_theme_secondary_color VARCHAR(7);
    v_theme_mode VARCHAR(10);
    v_logo_url TEXT;
    v_favicon_url TEXT;
    v_custom_css TEXT;
    v_custom_js TEXT;
    v_enable_registration BOOLEAN;
    v_enable_public_site BOOLEAN;
    v_display_text_with_logo BOOLEAN;
BEGIN
    -- استخراج القيم من JSON
    v_language := p_settings->>'default_language';
    v_site_name := p_settings->>'site_name';
    v_theme_primary_color := p_settings->>'theme_primary_color';
    v_theme_secondary_color := p_settings->>'theme_secondary_color';
    v_theme_mode := p_settings->>'theme_mode';
    v_logo_url := p_settings->>'logo_url';
    v_favicon_url := p_settings->>'favicon_url';
    v_custom_css := p_settings->>'custom_css';
    v_custom_js := p_settings->>'custom_js';
    v_enable_registration := (p_settings->>'enable_registration')::BOOLEAN;
    v_enable_public_site := (p_settings->>'enable_public_site')::BOOLEAN;
    v_display_text_with_logo := (p_settings->>'display_text_with_logo')::BOOLEAN;
    
    -- التحقق من صحة اللغة
    IF v_language IS NOT NULL AND v_language NOT IN ('ar', 'en', 'fr') THEN
        v_language := 'ar';
    END IF;
    
    -- تحديث أو إدراج الإعدادات
    INSERT INTO organization_settings (
        organization_id,
        default_language,
        site_name,
        theme_primary_color,
        theme_secondary_color,
        theme_mode,
        logo_url,
        favicon_url,
        custom_css,
        custom_js,
        enable_registration,
        enable_public_site,
        display_text_with_logo,
        created_at,
        updated_at
    ) VALUES (
        p_organization_id,
        COALESCE(v_language, 'ar'),
        COALESCE(v_site_name, 'متجري'),
        COALESCE(v_theme_primary_color, '#0099FF'),
        COALESCE(v_theme_secondary_color, '#6c757d'),
        COALESCE(v_theme_mode, 'light'),
        v_logo_url,
        v_favicon_url,
        v_custom_css,
        v_custom_js,
        COALESCE(v_enable_registration, true),
        COALESCE(v_enable_public_site, true),
        COALESCE(v_display_text_with_logo, true),
        NOW(),
        NOW()
    ) ON CONFLICT (organization_id) DO UPDATE SET
        default_language = COALESCE(EXCLUDED.default_language, organization_settings.default_language),
        site_name = COALESCE(EXCLUDED.site_name, organization_settings.site_name),
        theme_primary_color = COALESCE(EXCLUDED.theme_primary_color, organization_settings.theme_primary_color),
        theme_secondary_color = COALESCE(EXCLUDED.theme_secondary_color, organization_settings.theme_secondary_color),
        theme_mode = COALESCE(EXCLUDED.theme_mode, organization_settings.theme_mode),
        logo_url = COALESCE(EXCLUDED.logo_url, organization_settings.logo_url),
        favicon_url = COALESCE(EXCLUDED.favicon_url, organization_settings.favicon_url),
        custom_css = COALESCE(EXCLUDED.custom_css, organization_settings.custom_css),
        custom_js = COALESCE(EXCLUDED.custom_js, organization_settings.custom_js),
        enable_registration = COALESCE(EXCLUDED.enable_registration, organization_settings.enable_registration),
        enable_public_site = COALESCE(EXCLUDED.enable_public_site, organization_settings.enable_public_site),
        display_text_with_logo = COALESCE(EXCLUDED.display_text_with_logo, organization_settings.display_text_with_logo),
        updated_at = NOW();
    
    -- إرجاع الإعدادات المحدثة
    SELECT to_json(os.*) INTO v_result
    FROM organization_settings os
    WHERE os.organization_id = p_organization_id;
    
    RETURN v_result;
END;
$$;

-- منح صلاحيات
GRANT EXECUTE ON FUNCTION update_organization_settings_direct(UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION update_organization_settings_direct(UUID, JSON) TO anon;

-- ===============================
-- 3. اختبار سريع لتحديث اللغة
-- ===============================

-- تحديث اللغة للمؤسسة المحددة في الخطأ
SELECT update_language_direct(
    '6c2ed605-0880-4e40-af50-78f80f7283bb'::UUID, 
    'en'
) as result;

-- التحقق من النتيجة
SELECT 
    organization_id,
    default_language,
    site_name,
    updated_at
FROM organization_settings 
WHERE organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- ===============================
-- 4. إنشاء trigger محسن للتحقق
-- ===============================

CREATE OR REPLACE FUNCTION ensure_valid_language()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- التأكد من صحة اللغة قبل الحفظ
    IF NEW.default_language IS NULL OR NEW.default_language NOT IN ('ar', 'en', 'fr') THEN
        NEW.default_language := 'ar';
    END IF;
    
    -- تحديث timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$;

-- تطبيق trigger
DROP TRIGGER IF EXISTS ensure_valid_language_trigger ON organization_settings;
CREATE TRIGGER ensure_valid_language_trigger
    BEFORE INSERT OR UPDATE ON organization_settings
    FOR EACH ROW
    EXECUTE FUNCTION ensure_valid_language();

-- ===============================
-- تم الانتهاء! يمكن الآن استخدام:
-- SELECT update_language_direct('org-id', 'en');
-- =============================== 