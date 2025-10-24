-- دالة لجلب جميع البكسلات والـ Conversion APIs السابقة للمؤسسة
-- تاريخ الإنشاء: 2025-10-11

CREATE OR REPLACE FUNCTION get_organization_previous_tracking_pixels(
    p_organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_facebook_pixels JSONB;
    v_google_tracking JSONB;
    v_tiktok_pixels JSONB;
BEGIN
    -- جلب جميع بكسلات Facebook المستخدمة سابقاً
    WITH facebook_data AS (
        SELECT 
            pms.facebook_pixel_id as pixel_id,
            pms.enable_facebook_conversion_api as conversion_api_enabled,
            pms.facebook_access_token as access_token,
            pms.facebook_test_event_code as test_event_code,
            COUNT(DISTINCT pms.product_id) as product_count,
            MAX(pms.updated_at) as last_used,
            MIN(pms.created_at) as created_at
        FROM product_marketing_settings pms
        INNER JOIN products p ON pms.product_id = p.id
        WHERE p.organization_id = p_organization_id
            AND pms.facebook_pixel_id IS NOT NULL
            AND pms.facebook_pixel_id != ''
        GROUP BY pms.facebook_pixel_id, pms.enable_facebook_conversion_api, 
                 pms.facebook_access_token, pms.facebook_test_event_code
    )
    SELECT jsonb_agg(jsonb_build_object(
        'pixel_id', pixel_id,
        'conversion_api_enabled', conversion_api_enabled,
        'access_token', access_token,
        'test_event_code', test_event_code,
        'product_count', product_count,
        'last_used', last_used,
        'created_at', created_at
    )) INTO v_facebook_pixels
    FROM facebook_data;

    -- جلب جميع معرفات Google Ads المستخدمة سابقاً
    WITH google_data AS (
        SELECT 
            pms.google_gtag_id as gtag_id,
            pms.google_ads_conversion_id as conversion_id,
            pms.google_ads_conversion_label as conversion_label,
            pms.google_ads_enhanced_conversions_enabled as enhanced_conversions,
            COUNT(DISTINCT pms.product_id) as product_count,
            MAX(pms.updated_at) as last_used,
            MIN(pms.created_at) as created_at
        FROM product_marketing_settings pms
        INNER JOIN products p ON pms.product_id = p.id
        WHERE p.organization_id = p_organization_id
            AND (pms.google_gtag_id IS NOT NULL OR pms.google_ads_conversion_id IS NOT NULL)
            AND (pms.google_gtag_id != '' OR pms.google_ads_conversion_id != '')
        GROUP BY pms.google_gtag_id, pms.google_ads_conversion_id, 
                 pms.google_ads_conversion_label, pms.google_ads_enhanced_conversions_enabled
    )
    SELECT jsonb_agg(jsonb_build_object(
        'gtag_id', gtag_id,
        'conversion_id', conversion_id,
        'conversion_label', conversion_label,
        'enhanced_conversions', enhanced_conversions,
        'product_count', product_count,
        'last_used', last_used,
        'created_at', created_at
    )) INTO v_google_tracking
    FROM google_data;

    -- جلب جميع بكسلات TikTok المستخدمة سابقاً
    WITH tiktok_data AS (
        SELECT 
            pms.tiktok_pixel_id as pixel_id,
            pms.tiktok_events_api_enabled as events_api_enabled,
            pms.tiktok_access_token as access_token,
            pms.tiktok_test_event_code as test_event_code,
            COUNT(DISTINCT pms.product_id) as product_count,
            MAX(pms.updated_at) as last_used,
            MIN(pms.created_at) as created_at
        FROM product_marketing_settings pms
        INNER JOIN products p ON pms.product_id = p.id
        WHERE p.organization_id = p_organization_id
            AND pms.tiktok_pixel_id IS NOT NULL
            AND pms.tiktok_pixel_id != ''
        GROUP BY pms.tiktok_pixel_id, pms.tiktok_events_api_enabled, 
                 pms.tiktok_access_token, pms.tiktok_test_event_code
    )
    SELECT jsonb_agg(jsonb_build_object(
        'pixel_id', pixel_id,
        'events_api_enabled', events_api_enabled,
        'access_token', access_token,
        'test_event_code', test_event_code,
        'product_count', product_count,
        'last_used', last_used,
        'created_at', created_at
    )) INTO v_tiktok_pixels
    FROM tiktok_data;

    -- بناء النتيجة النهائية
    v_result := jsonb_build_object(
        'facebook_pixels', COALESCE(v_facebook_pixels, '[]'::jsonb),
        'google_tracking', COALESCE(v_google_tracking, '[]'::jsonb),
        'tiktok_pixels', COALESCE(v_tiktok_pixels, '[]'::jsonb),
        'organization_id', p_organization_id,
        'fetched_at', NOW()
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_pms_org_facebook_pixel 
    ON product_marketing_settings(facebook_pixel_id) 
    WHERE facebook_pixel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pms_org_google_tracking 
    ON product_marketing_settings(google_gtag_id, google_ads_conversion_id) 
    WHERE google_gtag_id IS NOT NULL OR google_ads_conversion_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pms_org_tiktok_pixel 
    ON product_marketing_settings(tiktok_pixel_id) 
    WHERE tiktok_pixel_id IS NOT NULL;

-- تعليق على الدالة
COMMENT ON FUNCTION get_organization_previous_tracking_pixels(UUID) IS 
'جلب جميع البكسلات والـ Conversion APIs المستخدمة سابقاً في المؤسسة مع إحصائيات الاستخدام';

