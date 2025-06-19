-- Migration: إضافة حقل default_language إلى جدول organization_settings
-- التاريخ: 2024-01-01
-- الوصف: إضافة دعم للغة الافتراضية للمتجر

-- التحقق من وجود الجدول أولاً
DO $$ 
BEGIN
    -- التحقق من وجود جدول organization_settings
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organization_settings') THEN
        -- إنشاء الجدول إذا لم يكن موجود
        CREATE TABLE organization_settings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            theme_primary_color VARCHAR(20) DEFAULT '#3B82F6',
            theme_secondary_color VARCHAR(20) DEFAULT '#10B981',
            theme_mode VARCHAR(10) DEFAULT 'light', -- (light, dark, auto)
            site_name VARCHAR(100),
            custom_css TEXT,
            logo_url TEXT,
            favicon_url TEXT,
            default_language VARCHAR(10) DEFAULT 'ar',
            custom_js TEXT,
            custom_header TEXT,
            custom_footer TEXT,
            enable_registration BOOLEAN DEFAULT TRUE,
            enable_public_site BOOLEAN DEFAULT TRUE,
            display_text_with_logo BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- إنشاء فهارس
        CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_settings_unique ON organization_settings(organization_id);

        -- إنشاء trigger للتحديث التلقائي لـ updated_at
        CREATE OR REPLACE FUNCTION update_organization_settings_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_update_organization_settings_updated_at
            BEFORE UPDATE ON organization_settings
            FOR EACH ROW
            EXECUTE FUNCTION update_organization_settings_updated_at();

        RAISE NOTICE 'تم إنشاء جدول organization_settings مع حقل default_language';
    ELSE
        -- التحقق من وجود حقل default_language
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'organization_settings' 
                      AND column_name = 'default_language') THEN
            -- إضافة حقل default_language
            ALTER TABLE organization_settings 
            ADD COLUMN default_language VARCHAR(10) DEFAULT 'ar';
            
            RAISE NOTICE 'تم إضافة حقل default_language إلى جدول organization_settings';
        END IF;

        -- التحقق من وجود حقل display_text_with_logo
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'organization_settings' 
                      AND column_name = 'display_text_with_logo') THEN
            -- إضافة حقل display_text_with_logo
            ALTER TABLE organization_settings 
            ADD COLUMN display_text_with_logo BOOLEAN DEFAULT FALSE;
            
            RAISE NOTICE 'تم إضافة حقل display_text_with_logo إلى جدول organization_settings';
        END IF;
    END IF;

    -- تحديث السجلات الموجودة التي لا تحتوي على قيمة default_language
    UPDATE organization_settings 
    SET default_language = 'ar' 
    WHERE default_language IS NULL;

    RAISE NOTICE 'تم تحديث السجلات الموجودة لتحتوي على اللغة الافتراضية';

END $$;

-- إنشاء أو تحديث دالة للحصول على اللغة الافتراضية للمؤسسة
CREATE OR REPLACE FUNCTION get_organization_default_language(org_id UUID)
RETURNS VARCHAR(10)
LANGUAGE plpgsql
AS $$
DECLARE
    default_lang VARCHAR(10);
BEGIN
    SELECT default_language INTO default_lang
    FROM organization_settings
    WHERE organization_id = org_id;
    
    -- إذا لم توجد إعدادات أو لم تحدد لغة، أرجع العربية كافتراضية
    IF default_lang IS NULL THEN
        RETURN 'ar';
    END IF;
    
    RETURN default_lang;
END;
$$;

-- إنشاء أو تحديث دالة لتحديث اللغة الافتراضية
CREATE OR REPLACE FUNCTION update_organization_default_language(
    org_id UUID,
    new_language VARCHAR(10)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- التحقق من صحة كود اللغة
    IF new_language NOT IN ('ar', 'en', 'fr') THEN
        RAISE EXCEPTION 'كود اللغة غير مدعوم: %', new_language;
    END IF;

    -- تحديث اللغة الافتراضية
    UPDATE organization_settings
    SET default_language = new_language,
        updated_at = NOW()
    WHERE organization_id = org_id;

    -- إذا لم يؤثر التحديث على أي سجل، إنشاء سجل جديد
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
            display_text_with_logo
        ) VALUES (
            org_id,
            new_language,
            '#3B82F6',
            '#10B981',
            'light',
            'متجري',
            TRUE,
            TRUE,
            FALSE
        );
    END IF;

    RETURN TRUE;
END;
$$;

-- تعليق على الجدول والحقول
COMMENT ON TABLE organization_settings IS 'إعدادات المؤسسات والمتاجر الإلكترونية';
COMMENT ON COLUMN organization_settings.default_language IS 'اللغة الافتراضية للمتجر (ar, en, fr)';
COMMENT ON COLUMN organization_settings.display_text_with_logo IS 'عرض اسم المتجر مع الشعار';

-- إنشاء سياسات الأمان (RLS) إذا لم تكن موجودة
DO $$
BEGIN
    -- تفعيل RLS على الجدول
    ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
    
    -- سياسة للقراءة - يمكن للمستخدمين قراءة إعدادات منظمتهم
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'organization_settings' AND policyname = 'users_can_view_org_settings') THEN
        CREATE POLICY users_can_view_org_settings ON organization_settings
        FOR SELECT USING (
            organization_id IN (
                SELECT id FROM organizations 
                WHERE id = organization_id
            )
        );
    END IF;

    -- سياسة للتحديث - يمكن للمدراء تحديث إعدادات منظمتهم
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'organization_settings' AND policyname = 'admins_can_update_org_settings') THEN
        CREATE POLICY admins_can_update_org_settings ON organization_settings
        FOR UPDATE USING (
            organization_id IN (
                SELECT organization_id FROM users 
                WHERE id = auth.uid() 
                AND (is_org_admin = TRUE OR role = 'admin')
            )
        );
    END IF;

    -- سياسة للإدراج - يمكن للمدراء إنشاء إعدادات منظمتهم
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'organization_settings' AND policyname = 'admins_can_insert_org_settings') THEN
        CREATE POLICY admins_can_insert_org_settings ON organization_settings
        FOR INSERT WITH CHECK (
            organization_id IN (
                SELECT organization_id FROM users 
                WHERE id = auth.uid() 
                AND (is_org_admin = TRUE OR role = 'admin')
            )
        );
    END IF;

    RAISE NOTICE 'تم إنشاء سياسات الأمان لجدول organization_settings';
END $$; 