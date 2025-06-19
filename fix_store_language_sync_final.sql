-- ===============================================
-- إصلاح شامل ونهائي لمشكلة تزامن اللغة في المتجر
-- ===============================================

-- 1. التحقق من البيانات الحالية
SELECT 
    os.organization_id,
    os.default_language,
    os.site_name,
    os.updated_at,
    o.name as org_name,
    o.subdomain
FROM organization_settings os
LEFT JOIN organizations o ON o.id = os.organization_id
WHERE os.organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb';

-- 2. حذف الدوال الموجودة مسبقاً لتجنب التضارب
DROP FUNCTION IF EXISTS get_public_store_settings(UUID, TEXT);
DROP FUNCTION IF EXISTS update_organization_default_language(UUID, VARCHAR);
DROP FUNCTION IF EXISTS cleanup_expired_notifications();
DROP FUNCTION IF EXISTS check_language_sync_status(UUID);

-- 3. إنشاء دالة محسنة للحصول على إعدادات المتجر للزوار العموميين
CREATE OR REPLACE FUNCTION get_public_store_settings(
    p_organization_id UUID DEFAULT NULL,
    p_subdomain TEXT DEFAULT NULL
)
RETURNS TABLE (
    organization_id UUID,
    theme_primary_color VARCHAR,
    theme_secondary_color VARCHAR,
    theme_mode VARCHAR,
    site_name VARCHAR,
    logo_url TEXT,
    favicon_url TEXT,
    default_language VARCHAR,
    enable_public_site BOOLEAN,
    enable_registration BOOLEAN,
    display_text_with_logo BOOLEAN,
    custom_css TEXT,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- تحديد معرف المؤسسة
    IF p_organization_id IS NOT NULL THEN
        v_org_id := p_organization_id;
    ELSIF p_subdomain IS NOT NULL THEN
        SELECT id INTO v_org_id 
        FROM organizations 
        WHERE subdomain = p_subdomain;
        
        IF v_org_id IS NULL THEN
            RAISE EXCEPTION 'المؤسسة غير موجودة مع هذا النطاق الفرعي: %', p_subdomain;
        END IF;
    ELSE
        RAISE EXCEPTION 'يجب تقديم معرف المؤسسة أو النطاق الفرعي';
    END IF;

    -- إرجاع الإعدادات
    RETURN QUERY
    SELECT 
        os.organization_id,
        os.theme_primary_color,
        os.theme_secondary_color,
        os.theme_mode,
        os.site_name,
        os.logo_url,
        os.favicon_url,
        os.default_language,
        os.enable_public_site,
        os.enable_registration,
        os.display_text_with_logo,
        os.custom_css,
        os.updated_at
    FROM organization_settings os
    WHERE os.organization_id = v_org_id
    AND (os.enable_public_site IS NULL OR os.enable_public_site = true);
    
    -- إذا لم توجد إعدادات، إنشاء إعدادات افتراضية
    IF NOT FOUND THEN
        INSERT INTO organization_settings (
            organization_id,
            theme_primary_color,
            theme_secondary_color,
            theme_mode,
            site_name,
            default_language,
            enable_public_site,
            enable_registration,
            display_text_with_logo
        ) VALUES (
            v_org_id,
            '#3B82F6',
            '#10B981',
            'light',
            'متجري',
            'ar',
            true,
            true,
            false
        );
        
        -- إرجاع الإعدادات الجديدة
        RETURN QUERY
        SELECT 
            os.organization_id,
            os.theme_primary_color,
            os.theme_secondary_color,
            os.theme_mode,
            os.site_name,
            os.logo_url,
            os.favicon_url,
            os.default_language,
            os.enable_public_site,
            os.enable_registration,
            os.display_text_with_logo,
            os.custom_css,
            os.updated_at
        FROM organization_settings os
        WHERE os.organization_id = v_org_id;
    END IF;
END;
$$;

-- 3. إنشاء دالة لتحديث اللغة الافتراضية مع إشعارات
CREATE OR REPLACE FUNCTION update_organization_default_language(
    p_organization_id UUID,
    p_new_language VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_language VARCHAR;
    v_updated_settings organization_settings%ROWTYPE;
    v_result JSON;
BEGIN
    -- التحقق من صحة اللغة
    IF p_new_language NOT IN ('ar', 'en', 'fr') THEN
        RAISE EXCEPTION 'اللغة غير مدعومة: %. اللغات المدعومة: ar, en, fr', p_new_language;
    END IF;
    
    -- الحصول على اللغة القديمة
    SELECT default_language INTO v_old_language 
    FROM organization_settings 
    WHERE organization_id = p_organization_id;
    
    -- تحديث اللغة الافتراضية
    UPDATE organization_settings 
    SET 
        default_language = p_new_language,
        updated_at = NOW()
    WHERE organization_id = p_organization_id
    RETURNING * INTO v_updated_settings;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'لم يتم العثور على إعدادات للمؤسسة: %', p_organization_id;
    END IF;
    
    -- إنشاء إشعار للمتجر العام
    INSERT INTO public_notifications (
        organization_id,
        notification_type,
        data,
        created_at
    ) VALUES (
        p_organization_id,
        'language_updated',
        json_build_object(
            'old_language', v_old_language,
            'new_language', p_new_language,
            'timestamp', NOW()
        ),
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- إنشاء النتيجة
    v_result := json_build_object(
        'success', true,
        'old_language', v_old_language,
        'new_language', p_new_language,
        'updated_at', v_updated_settings.updated_at,
        'message', 'تم تحديث اللغة الافتراضية بنجاح'
    );
    
    RETURN v_result;
END;
$$;

-- 4. إنشاء جدول للإشعارات العامة إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    data JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_public_notifications_org_type 
ON public_notifications(organization_id, notification_type, created_at DESC);

-- 5. سياسة RLS للإشعارات العامة
ALTER TABLE public_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_public_notifications_read" ON public_notifications;
CREATE POLICY "allow_public_notifications_read" ON public_notifications
    FOR SELECT USING (true);

-- 6. دالة لتنظيف الإشعارات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public_notifications 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- 7. تحديث المؤسسة المحددة لضمان وجود إعدادات صحيحة
DO $$
DECLARE
    v_org_id UUID := '6c2ed605-0880-4e40-af50-78f80f7283bb';
    v_settings_exists BOOLEAN;
BEGIN
    -- التحقق من وجود الإعدادات
    SELECT EXISTS(
        SELECT 1 FROM organization_settings 
        WHERE organization_id = v_org_id
    ) INTO v_settings_exists;
    
    IF NOT v_settings_exists THEN
        -- إنشاء إعدادات افتراضية
        INSERT INTO organization_settings (
            organization_id,
            theme_primary_color,
            theme_secondary_color,
            theme_mode,
            site_name,
            default_language,
            enable_public_site,
            enable_registration,
            display_text_with_logo,
            created_at,
            updated_at
        ) VALUES (
            v_org_id,
            '#3B82F6',
            '#10B981',
            'light',
            'vcvcvfinal',
            'en', -- اللغة المحفوظة حالياً
            true,
            true,
            false,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'تم إنشاء إعدادات افتراضية للمؤسسة %', v_org_id;
    ELSE
        RAISE NOTICE 'الإعدادات موجودة للمؤسسة %', v_org_id;
    END IF;
END;
$$;

-- 8. منح الصلاحيات للدوال
GRANT EXECUTE ON FUNCTION get_public_store_settings(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_organization_default_language(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO authenticated;

-- 9. اختبار الدوال
SELECT 'اختبار الحصول على إعدادات المتجر' as test_name;
SELECT * FROM get_public_store_settings('6c2ed605-0880-4e40-af50-78f80f7283bb');

SELECT 'اختبار الحصول على إعدادات المتجر بالنطاق الفرعي' as test_name;
SELECT * FROM get_public_store_settings(NULL, 'testfinalfinalvhio');

-- 10. تنظيف الإشعارات المنتهية الصلاحية
SELECT cleanup_expired_notifications() as cleaned_notifications;

-- 11. إنشاء دالة للتحقق من تزامن اللغة
CREATE OR REPLACE FUNCTION check_language_sync_status(p_organization_id UUID)
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    current_value TEXT,
    notes TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- فحص وجود الإعدادات
    RETURN QUERY
    SELECT 
        'settings_exist'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM organization_settings WHERE organization_id = p_organization_id)
            THEN 'PASS' ELSE 'FAIL' END::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM organization_settings WHERE organization_id = p_organization_id)
            THEN 'إعدادات موجودة' ELSE 'إعدادات غير موجودة' END::TEXT,
        'التحقق من وجود إعدادات المؤسسة'::TEXT;
    
    -- فحص اللغة الافتراضية
    RETURN QUERY
    SELECT 
        'default_language'::TEXT,
        'INFO'::TEXT,
        COALESCE(os.default_language, 'غير محدد')::TEXT,
        'اللغة الافتراضية الحالية'::TEXT
    FROM organization_settings os
    WHERE os.organization_id = p_organization_id;
    
    -- فحص آخر تحديث
    RETURN QUERY
    SELECT 
        'last_updated'::TEXT,
        'INFO'::TEXT,
        COALESCE(os.updated_at::TEXT, 'غير محدد')::TEXT,
        'آخر تحديث للإعدادات'::TEXT
    FROM organization_settings os
    WHERE os.organization_id = p_organization_id;
    
    -- فحص صلاحيات RLS
    RETURN QUERY
    SELECT 
        'rls_policies'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'WARN' END::TEXT,
        COUNT(*)::TEXT,
        'عدد سياسات RLS المطبقة'::TEXT
    FROM pg_policies 
    WHERE tablename = 'organization_settings';
END;
$$;

-- تشغيل فحص التزامن
SELECT 'فحص حالة تزامن اللغة' as test_name;
SELECT * FROM check_language_sync_status('6c2ed605-0880-4e40-af50-78f80f7283bb');

-- 12. إنشاء تقرير نهائي
SELECT 
    '=== تقرير حالة إعدادات المتجر ===' as section,
    '' as details
UNION ALL
SELECT 
    'معرف المؤسسة:', 
    '6c2ed605-0880-4e40-af50-78f80f7283bb'
UNION ALL
SELECT 
    'اللغة الافتراضية الحالية:', 
    COALESCE(os.default_language, 'غير محدد')
FROM organization_settings os
WHERE os.organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
UNION ALL
SELECT 
    'آخر تحديث:', 
    COALESCE(os.updated_at::TEXT, 'غير محدد')
FROM organization_settings os
WHERE os.organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
UNION ALL
SELECT 
    'حالة المتجر العام:', 
    CASE WHEN os.enable_public_site THEN 'مفعل' ELSE 'معطل' END
FROM organization_settings os
WHERE os.organization_id = '6c2ed605-0880-4e40-af50-78f80f7283bb'
UNION ALL
SELECT 
    'الدوال المتاحة:', 
    'get_public_store_settings, update_organization_default_language'
UNION ALL
SELECT 
    'تاريخ الإصلاح:', 
    NOW()::TEXT;

-- رسالة نهائية
SELECT 
    '✅ تم إكمال الإصلاح الشامل لتزامن اللغة' as message,
    'يمكنك الآن اختبار تغيير اللغة في لوحة التحكم ومراقبة التحديث في المتجر' as instructions; 