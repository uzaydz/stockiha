-- ملف SQL شامل لضمان عمل نظام اللغة الافتراضية
-- تم إنشاؤه بعد تحليل قاعدة البيانات الحالية

-- ===============================
-- 1. التحقق من وجود حقل default_language وتحديثه إذا لزم الأمر
-- ===============================

-- التحقق من وجود الحقل وإضافته إذا لم يكن موجوداً (احتياطي)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' 
        AND column_name = 'default_language'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN default_language VARCHAR(10) DEFAULT 'ar';
    END IF;
END $$;

-- تحديث القيمة الافتراضية إذا لزم الأمر
ALTER TABLE organization_settings 
ALTER COLUMN default_language SET DEFAULT 'ar';

-- ===============================
-- 2. إنشاء/تحديث دالة للحصول على اللغة الافتراضية
-- ===============================

CREATE OR REPLACE FUNCTION get_organization_default_language(org_id UUID)
RETURNS VARCHAR(10)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_language VARCHAR(10);
    v_user_id UUID;
BEGIN
    -- الحصول على معرف المستخدم الحالي
    SELECT auth.uid() INTO v_user_id;
    
    -- محاولة الحصول على اللغة الافتراضية للمؤسسة
    SELECT default_language INTO v_language
    FROM organization_settings
    WHERE organization_id = org_id;
    
    -- إذا لم توجد إعدادات للمؤسسة، إرجاع العربية كافتراضي
    IF v_language IS NULL THEN
        v_language := 'ar';
    END IF;
    
    -- التحقق من صحة اللغة المحفوظة
    IF v_language NOT IN ('ar', 'en', 'fr') THEN
        v_language := 'ar';
    END IF;
    
    RETURN v_language;
END;
$$;

-- ===============================
-- 3. إنشاء/تحديث دالة لتحديث اللغة الافتراضية
-- ===============================

CREATE OR REPLACE FUNCTION update_organization_default_language(
    org_id UUID,
    new_language VARCHAR(10)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_has_permission BOOLEAN DEFAULT FALSE;
    v_updated_rows INTEGER;
BEGIN
    -- التحقق من صحة اللغة المرسلة
    IF new_language NOT IN ('ar', 'en', 'fr') THEN
        RAISE EXCEPTION 'اللغة غير مدعومة. الخيارات المتاحة: ar, en, fr';
    END IF;
    
    -- الحصول على معرف المستخدم الحالي
    SELECT auth.uid() INTO v_user_id;
    
    -- التحقق من وجود المستخدم
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'المستخدم غير مسجل الدخول';
    END IF;
    
    -- التحقق من صلاحيات المستخدم
    SELECT 
        CASE 
            WHEN u.is_super_admin = true THEN true
            WHEN u.is_org_admin = true AND u.organization_id = org_id THEN true
            WHEN u.permissions->>'manageOrganizationSettings' = 'true' AND u.organization_id = org_id THEN true
            ELSE false
        END INTO v_has_permission
    FROM users u
    WHERE u.id = v_user_id;
    
    -- إذا لم يتم العثور على المستخدم أو ليس لديه صلاحيات
    IF v_has_permission IS NULL OR NOT v_has_permission THEN
        RAISE EXCEPTION 'ليس لديك صلاحية تحديث إعدادات المؤسسة';
    END IF;
    
    -- محاولة تحديث الإعدادات الموجودة
    UPDATE organization_settings
    SET 
        default_language = new_language,
        updated_at = NOW()
    WHERE organization_id = org_id;
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    
    -- إذا لم توجد إعدادات، إنشاء إعدادات جديدة
    IF v_updated_rows = 0 THEN
        INSERT INTO organization_settings (
            organization_id,
            default_language,
            theme_primary_color,
            theme_secondary_color,
            theme_mode,
            enable_registration,
            enable_public_site,
            display_text_with_logo,
            created_at,
            updated_at
        ) VALUES (
            org_id,
            new_language,
            '#0099FF',
            '#6c757d',
            'light',
            true,
            true,
            true,
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN TRUE;
END;
$$;

-- ===============================
-- 4. إنشاء دالة للحصول على جميع إعدادات المؤسسة مع التحقق من اللغة
-- ===============================

CREATE OR REPLACE FUNCTION get_organization_settings_with_language(org_id UUID)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    theme_primary_color VARCHAR,
    theme_secondary_color VARCHAR,
    theme_mode VARCHAR,
    site_name VARCHAR,
    custom_css TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    default_language VARCHAR,
    custom_js TEXT,
    custom_header TEXT,
    custom_footer TEXT,
    enable_registration BOOLEAN,
    enable_public_site BOOLEAN,
    display_text_with_logo BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        os.id,
        os.organization_id,
        os.theme_primary_color,
        os.theme_secondary_color,
        os.theme_mode,
        os.site_name,
        os.custom_css,
        os.logo_url,
        os.favicon_url,
        COALESCE(os.default_language, 'ar') as default_language,
        os.custom_js,
        os.custom_header,
        os.custom_footer,
        os.enable_registration,
        os.enable_public_site,
        os.display_text_with_logo,
        os.created_at,
        os.updated_at
    FROM organization_settings os
    WHERE os.organization_id = org_id;
    
    -- إذا لم توجد إعدادات، إرجاع إعدادات افتراضية
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::UUID,
            org_id,
            '#0099FF'::VARCHAR,
            '#6c757d'::VARCHAR,
            'light'::VARCHAR,
            'متجر جديد'::VARCHAR,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            'ar'::VARCHAR,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            true::BOOLEAN,
            true::BOOLEAN,
            true::BOOLEAN,
            NOW()::TIMESTAMPTZ,
            NOW()::TIMESTAMPTZ;
    END IF;
END;
$$;

-- ===============================
-- 5. منح الصلاحيات للدوال
-- ===============================

-- منح صلاحيات للمستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION get_organization_default_language(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_organization_default_language(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_settings_with_language(UUID) TO authenticated;

-- منح صلاحيات محدودة للمستخدمين المجهولين (للمتاجر العامة)
GRANT EXECUTE ON FUNCTION get_organization_default_language(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_organization_settings_with_language(UUID) TO anon;

-- ===============================
-- 6. تحديث البيانات الموجودة للتأكد من وجود قيم صحيحة
-- ===============================

-- تحديث أي قيم null أو غير صحيحة في default_language
UPDATE organization_settings 
SET default_language = 'ar'
WHERE default_language IS NULL 
   OR default_language NOT IN ('ar', 'en', 'fr');

-- ===============================
-- 7. إنشاء فهرس لتحسين الأداء
-- ===============================

-- إنشاء فهرس على organization_id و default_language للبحث السريع
CREATE INDEX IF NOT EXISTS idx_organization_settings_language 
ON organization_settings(organization_id, default_language);

-- ===============================
-- 8. إنشاء trigger لضمان صحة البيانات عند الإدراج/التحديث
-- ===============================

CREATE OR REPLACE FUNCTION validate_organization_language()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- التحقق من صحة اللغة
    IF NEW.default_language IS NOT NULL AND NEW.default_language NOT IN ('ar', 'en', 'fr') THEN
        NEW.default_language := 'ar';
    END IF;
    
    -- تعيين قيمة افتراضية إذا كانت null
    IF NEW.default_language IS NULL THEN
        NEW.default_language := 'ar';
    END IF;
    
    RETURN NEW;
END;
$$;

-- إنشاء trigger على جدول organization_settings
DROP TRIGGER IF EXISTS trigger_validate_organization_language ON organization_settings;
CREATE TRIGGER trigger_validate_organization_language
    BEFORE INSERT OR UPDATE OF default_language ON organization_settings
    FOR EACH ROW
    EXECUTE FUNCTION validate_organization_language();

-- ===============================
-- 9. إنشاء view لسهولة الوصول للبيانات
-- ===============================

CREATE OR REPLACE VIEW organization_language_settings AS
SELECT 
    os.organization_id,
    o.name as organization_name,
    o.subdomain,
    os.default_language,
    os.site_name,
    os.enable_public_site,
    os.updated_at as language_updated_at
FROM organization_settings os
LEFT JOIN organizations o ON o.id = os.organization_id
WHERE os.default_language IS NOT NULL;

-- منح صلاحيات للـ view
GRANT SELECT ON organization_language_settings TO authenticated;
GRANT SELECT ON organization_language_settings TO anon;

-- ===============================
-- تم بنجاح! النظام جاهز للاستخدام
-- ===============================

-- للاختبار، يمكنك استخدام:
-- SELECT get_organization_default_language('organization-id-here');
-- SELECT update_organization_default_language('organization-id-here', 'en');
-- SELECT * FROM get_organization_settings_with_language('organization-id-here'); 