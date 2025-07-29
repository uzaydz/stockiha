-- إصلاح دالة get_dynamic_meta_tags - المشكلة في os.description
-- المشكلة: os.description لا يوجد في جدول organization_settings
-- الحل: استخدام o.description من جدول organizations

CREATE OR REPLACE FUNCTION public.get_dynamic_meta_tags(
    _organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
    org_data RECORD;
    seo_data JSONB;
    meta_tags JSONB := '{}'::jsonb;
BEGIN
    -- جلب بيانات المؤسسة (تم إصلاح المشكلة هنا)
    SELECT 
        o.name,
        o.subdomain,
        o.description,  -- من جدول organizations وليس organization_settings
        os.logo_url,
        os.site_name
    INTO org_data
    FROM organizations o
    LEFT JOIN organization_settings os ON o.id = os.organization_id
    WHERE o.id = _organization_id;
    
    -- التحقق من وجود المؤسسة
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'title', 'متجر إلكتروني',
            'description', 'متجر إلكتروني متطور',
            'site_name', 'متجر إلكتروني',
            'error', 'Organization not found'
        );
    END IF;
    
    -- جلب إعدادات SEO بشكل آمن
    BEGIN
        seo_data := public.get_seo_settings_safe(_organization_id);
    EXCEPTION WHEN OTHERS THEN
        seo_data := '{}'::jsonb;
    END;
    
    -- إنشاء Meta Tags
    meta_tags := jsonb_build_object(
        'title', COALESCE(seo_data->>'title', org_data.site_name, org_data.name, 'متجر إلكتروني'),
        'description', COALESCE(seo_data->>'description', org_data.description, 'متجر إلكتروني متطور'),
        'site_name', COALESCE(org_data.site_name, org_data.name, 'متجر إلكتروني'),
        'image', COALESCE(seo_data->>'default_image_url', org_data.logo_url, ''),
        'url', CASE 
            WHEN org_data.subdomain IS NOT NULL 
            THEN 'https://' || org_data.subdomain || '.stockiha.com'
            ELSE 'https://stockiha.com'
        END,
        'type', 'website',
        'keywords', COALESCE(seo_data->>'keywords', ''),
        'robots', 'index, follow'
    );
    
    RETURN meta_tags;
EXCEPTION WHEN OTHERS THEN
    -- في حالة أي خطأ، إرجاع قيم افتراضية
    RETURN jsonb_build_object(
        'title', 'متجر إلكتروني',
        'description', 'متجر إلكتروني متطور',
        'site_name', 'متجر إلكتروني',
        'image', '',
        'url', 'https://stockiha.com',
        'type', 'website',
        'keywords', '',
        'robots', 'index, follow',
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة تعليق توضيحي
COMMENT ON FUNCTION public.get_dynamic_meta_tags(UUID) IS 'جلب Meta Tags ديناميكياً للنطاقات المخصصة - تم إصلاح مشكلة os.description'; 