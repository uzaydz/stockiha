-- إصلاح شامل لمشكلة إعدادات تحسين محركات البحث (SEO)
-- هذا الملف يعالج:
-- 1. مشكلة عدم حفظ إعدادات SEO
-- 2. مشكلة عدم ظهور النطاقات المخصصة بأسمائها الصحيحة

-- 1. إنشاء دالة محسنة لتحديث إعدادات SEO
CREATE OR REPLACE FUNCTION public.update_store_seo_settings(
    _organization_id UUID,
    _settings JSONB
)
RETURNS JSONB AS $$
DECLARE
    updated_settings JSONB;
    existing_id UUID;
    v_user_id UUID;
    v_user_org_id UUID;
    v_is_admin BOOLEAN;
    v_has_permission BOOLEAN;
BEGIN
    -- الحصول على معرف المستخدم الحالي
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لتحديث إعدادات SEO';
    END IF;

    -- التحقق من صلاحية المستخدم
    SELECT 
        u.organization_id,
        u.is_org_admin OR u.is_super_admin,
        COALESCE(u.permissions->>'manageOrganizationSettings' = 'true', false)
    INTO 
        v_user_org_id,
        v_is_admin,
        v_has_permission
    FROM 
        users u
    WHERE 
        u.id = v_user_id;
    
    IF v_user_org_id IS NULL OR (v_user_org_id != _organization_id AND NOT v_is_admin) THEN
        RAISE EXCEPTION 'غير مصرح لك بتعديل بيانات هذه المؤسسة';
    END IF;
    
    IF NOT (v_is_admin OR v_has_permission) THEN
        RAISE EXCEPTION 'يجب أن تكون مديراً أو تملك صلاحيات إدارة إعدادات المؤسسة';
    END IF;

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
        
        -- التحقق من أن التحديث تم بنجاح
        IF updated_settings IS NULL THEN
            RAISE EXCEPTION 'فشل تحديث إعدادات SEO، لم يتم العثور على السجل بعد التحديث';
        END IF;
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
        
        -- التحقق من أن الإدراج تم بنجاح
        IF updated_settings IS NULL THEN
            RAISE EXCEPTION 'فشل إنشاء إعدادات SEO جديدة';
        END IF;
    END IF;
    
    -- تنظيف ذاكرة التخزين المؤقت لـ SEO إذا كانت موجودة
    DELETE FROM public.seo_cache 
    WHERE organization_id = _organization_id 
    AND cache_type LIKE 'seo_%';
    
    RETURN updated_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات المطلوبة
GRANT EXECUTE ON FUNCTION public.update_store_seo_settings(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_store_seo_settings(UUID, JSONB) TO service_role;

-- 2. إنشاء وظيفة لجلب إعدادات SEO بشكل آمن
CREATE OR REPLACE FUNCTION public.get_seo_settings_safe(
    _organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
    seo_settings JSONB;
BEGIN
    -- جلب إعدادات SEO
    SELECT settings INTO seo_settings
    FROM public.store_settings
    WHERE organization_id = _organization_id
    AND component_type = 'seo_settings'
    AND is_active = true
    LIMIT 1;
    
    -- إذا لم يتم العثور على إعدادات، إرجاع كائن فارغ
    IF seo_settings IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;
    
    RETURN seo_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إضافة وظيفة لإصلاح إعدادات SEO للمتجر asray
CREATE OR REPLACE FUNCTION public.fix_asray_seo_settings()
RETURNS VOID AS $$
DECLARE
    org_id UUID := '560e2c06-d13c-4853-abcf-d41f017469cf';
    custom_js_data JSONB;
    seo_settings JSONB;
    existing_id UUID;
BEGIN
    -- الحصول على البيانات الحالية من custom_js
    SELECT custom_js::JSONB INTO custom_js_data
    FROM public.organization_settings 
    WHERE organization_id = org_id;
    
    IF custom_js_data IS NOT NULL AND custom_js_data ? 'seoSettings' THEN
        seo_settings := custom_js_data->'seoSettings';
        
        -- تحسين إعدادات SEO للمتجر asray
        seo_settings := jsonb_set(seo_settings, '{title}', '"ASRAY Collection - مجموعة أزراي للأزياء"');
        seo_settings := jsonb_set(seo_settings, '{description}', '"متجر ASRAY Collection للأزياء الحديثة والأناقة العصرية - تشكيلة متنوعة من الملابس والإكسسوارات"');
        seo_settings := jsonb_set(seo_settings, '{keywords}', '"أزياء، ملابس، ASRAY، أزراي، موضة، تسوق أونلاين، ملابس نسائية، إكسسوارات"');
        
        -- التحقق من وجود إعدادات SEO في الجدول المخصص
        SELECT id INTO existing_id
        FROM public.store_settings
        WHERE organization_id = org_id
        AND component_type = 'seo_settings';
        
        -- إذا لم تكن موجودة، إضافتها
        IF existing_id IS NULL THEN
            INSERT INTO public.store_settings (
                organization_id,
                component_type,
                settings,
                is_active,
                order_index
            ) VALUES (
                org_id,
                'seo_settings',
                seo_settings,
                true,
                1
            );
            
            RAISE NOTICE 'تم إنشاء إعدادات SEO جديدة لمتجر ASRAY';
        ELSE
            -- تحديث الإعدادات الموجودة
            UPDATE public.store_settings
            SET settings = seo_settings,
                updated_at = NOW()
            WHERE id = existing_id;
            
            RAISE NOTICE 'تم تحديث إعدادات SEO لمتجر ASRAY';
        END IF;
        
        -- تحديث custom_js أيضاً
        UPDATE public.organization_settings
        SET custom_js = jsonb_set(custom_js_data::jsonb, '{seoSettings}', seo_settings)::text
        WHERE organization_id = org_id;
        
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. تنفيذ إصلاح إعدادات SEO لمتجر asray
SELECT public.fix_asray_seo_settings();

-- 5. إنشاء وظيفة لجلب Meta Tags ديناميكياً للنطاقات المخصصة
CREATE OR REPLACE FUNCTION public.get_dynamic_meta_tags(
    _organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
    org_data RECORD;
    seo_data JSONB;
    meta_tags JSONB := '{}'::jsonb;
BEGIN
    -- جلب بيانات المؤسسة
    SELECT 
        o.name,
        o.subdomain,
        o.description,
        os.logo_url,
        os.site_name
    INTO org_data
    FROM organizations o
    LEFT JOIN organization_settings os ON o.id = os.organization_id
    WHERE o.id = _organization_id;
    
    -- جلب إعدادات SEO
    seo_data := public.get_seo_settings_safe(_organization_id);
    
    -- إنشاء Meta Tags
    meta_tags := jsonb_build_object(
        'title', COALESCE(seo_data->>'title', org_data.site_name, org_data.name, 'متجر إلكتروني'),
        'description', COALESCE(seo_data->>'description', org_data.description, 'متجر إلكتروني متطور'),
        'site_name', COALESCE(org_data.site_name, org_data.name, 'متجر إلكتروني'),
        'image', COALESCE(seo_data->>'default_image_url', org_data.logo_url, ''),
        'url', 'https://' || org_data.subdomain || '.stockiha.com',
        'type', 'website',
        'keywords', COALESCE(seo_data->>'keywords', ''),
        'robots', 'index, follow'
    );
    
    RETURN meta_tags;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_store_settings_org_component
ON store_settings(organization_id, component_type);

CREATE INDEX IF NOT EXISTS idx_store_settings_seo
ON store_settings(organization_id) 
WHERE component_type = 'seo_settings';

-- 7. تحديث سياسات الأمان
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة أولاً إذا كانت موجودة
DROP POLICY IF EXISTS read_store_settings_policy ON store_settings;
DROP POLICY IF EXISTS update_store_seo_policy ON store_settings;
DROP POLICY IF EXISTS insert_store_seo_policy ON store_settings;

-- سياسة للقراءة
CREATE POLICY read_store_settings_policy ON store_settings
FOR SELECT
USING (
    auth.uid() IN (
        SELECT u.id FROM users u 
        WHERE u.organization_id = store_settings.organization_id
        OR u.is_super_admin = true
    )
);

-- سياسة للتحديث
CREATE POLICY update_store_seo_policy ON store_settings
FOR UPDATE
USING (
    component_type = 'seo_settings' AND 
    auth.uid() IN (
        SELECT u.id FROM users u 
        WHERE u.organization_id = store_settings.organization_id
        AND (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
        OR u.is_super_admin = true
    )
);

-- سياسة للإدراج
CREATE POLICY insert_store_seo_policy ON store_settings
FOR INSERT
WITH CHECK (
    component_type = 'seo_settings' AND
    auth.uid() IN (
        SELECT u.id FROM users u 
        WHERE u.organization_id = store_settings.organization_id
        AND (u.is_org_admin = true OR u.permissions->>'manageOrganizationSettings' = 'true')
        OR u.is_super_admin = true
    )
);

-- 8. إضافة تعليقات توضيحية
COMMENT ON FUNCTION public.update_store_seo_settings IS 'تحديث إعدادات SEO مع التحقق من الصلاحيات وضمان الحفظ الصحيح';
COMMENT ON FUNCTION public.get_seo_settings_safe IS 'جلب إعدادات SEO بشكل آمن';
COMMENT ON FUNCTION public.get_dynamic_meta_tags IS 'جلب Meta Tags ديناميكياً للنطاقات المخصصة';

-- 9. إنشاء View لتسهيل الوصول لإعدادات SEO
CREATE OR REPLACE VIEW public.organization_seo_view AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.subdomain,
    ss.settings as seo_settings,
    os.site_name,
    os.logo_url,
    public.get_dynamic_meta_tags(o.id) as meta_tags
FROM organizations o
LEFT JOIN store_settings ss ON o.id = ss.organization_id AND ss.component_type = 'seo_settings'
LEFT JOIN organization_settings os ON o.id = os.organization_id;

-- منح صلاحية الوصول للـ View
GRANT SELECT ON public.organization_seo_view TO authenticated;

COMMIT; 