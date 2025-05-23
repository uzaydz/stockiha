-- إصلاح مشكلة conversion_settings_view وحفظ إعدادات التحويل
-- المشكلة: عدم تحديث الإعدادات في قاعدة البيانات رغم إدخالها في النموذج

-- 1. التأكد من وجود جميع الحقول المطلوبة في جدول product_marketing_settings
DO $$
BEGIN
    -- إضافة الحقول المفقودة إذا لم تكن موجودة
    
    -- حقول Facebook
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'product_marketing_settings' 
                   AND column_name = 'enable_facebook_conversion_api') THEN
        ALTER TABLE product_marketing_settings 
        ADD COLUMN enable_facebook_conversion_api BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'product_marketing_settings' 
                   AND column_name = 'facebook_dataset_id') THEN
        ALTER TABLE product_marketing_settings 
        ADD COLUMN facebook_dataset_id TEXT;
    END IF;
    
    -- حقول TikTok
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'product_marketing_settings' 
                   AND column_name = 'tiktok_events_api_enabled') THEN
        ALTER TABLE product_marketing_settings 
        ADD COLUMN tiktok_events_api_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'product_marketing_settings' 
                   AND column_name = 'tiktok_access_token') THEN
        ALTER TABLE product_marketing_settings 
        ADD COLUMN tiktok_access_token TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'product_marketing_settings' 
                   AND column_name = 'tiktok_test_event_code') THEN
        ALTER TABLE product_marketing_settings 
        ADD COLUMN tiktok_test_event_code TEXT;
    END IF;
    
    -- حقول Google
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'product_marketing_settings' 
                   AND column_name = 'google_gtag_id') THEN
        ALTER TABLE product_marketing_settings 
        ADD COLUMN google_gtag_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'product_marketing_settings' 
                   AND column_name = 'google_ads_conversion_label') THEN
        ALTER TABLE product_marketing_settings 
        ADD COLUMN google_ads_conversion_label TEXT;
    END IF;
    
    -- حقل وضع الاختبار العام
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'product_marketing_settings' 
                   AND column_name = 'test_mode') THEN
        ALTER TABLE product_marketing_settings 
        ADD COLUMN test_mode BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 2. إنشاء أو تحديث الـ view لإعدادات التحويل
DROP VIEW IF EXISTS conversion_settings_view;

CREATE OR REPLACE VIEW conversion_settings_view AS
SELECT 
    pms.product_id,
    p.organization_id,
    jsonb_build_object(
        'facebook', jsonb_build_object(
            'enabled', COALESCE(pms.enable_facebook_pixel, false),
            'pixel_id', pms.facebook_pixel_id,
            'conversion_api_enabled', COALESCE(pms.enable_facebook_conversion_api, false),
            'access_token', pms.facebook_access_token,
            'dataset_id', pms.facebook_dataset_id,
            'test_event_code', pms.facebook_test_event_code,
            'advanced_matching_enabled', COALESCE(pms.facebook_advanced_matching_enabled, false),
            'conversations_api_enabled', COALESCE(pms.facebook_conversations_api_enabled, false)
        ),
        'google', jsonb_build_object(
            'enabled', COALESCE(pms.enable_google_ads_tracking, false),
            'gtag_id', pms.google_gtag_id,
            'conversion_id', pms.google_ads_conversion_id,
            'conversion_label', pms.google_ads_conversion_label,
            'enhanced_conversions', COALESCE(pms.google_ads_enhanced_conversions_enabled, false),
            'global_site_tag_enabled', COALESCE(pms.google_ads_global_site_tag_enabled, false)
        ),
        'tiktok', jsonb_build_object(
            'enabled', COALESCE(pms.enable_tiktok_pixel, false),
            'pixel_id', pms.tiktok_pixel_id,
            'access_token', pms.tiktok_access_token,
            'events_api_enabled', COALESCE(pms.tiktok_events_api_enabled, false),
            'test_event_code', pms.tiktok_test_event_code,
            'advanced_matching_enabled', COALESCE(pms.tiktok_advanced_matching_enabled, false)
        ),
        'snapchat', jsonb_build_object(
            'enabled', COALESCE(pms.enable_snapchat_pixel, false),
            'pixel_id', pms.snapchat_pixel_id,
            'events_api_enabled', COALESCE(pms.snapchat_events_api_enabled, false),
            'api_token', pms.snapchat_api_token,
            'test_event_code', pms.snapchat_test_event_code,
            'advanced_matching_enabled', COALESCE(pms.snapchat_advanced_matching_enabled, false)
        ),
        'test_mode', COALESCE(pms.test_mode, true)
    ) AS settings
FROM 
    product_marketing_settings pms
JOIN 
    products p ON pms.product_id = p.id;

-- 3. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_product_id 
ON product_marketing_settings(product_id);

CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_facebook_enabled 
ON product_marketing_settings(enable_facebook_pixel) WHERE enable_facebook_pixel = true;

CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_tiktok_enabled 
ON product_marketing_settings(enable_tiktok_pixel) WHERE enable_tiktok_pixel = true;

-- 4. إنشاء دالة لحفظ إعدادات التحويل
CREATE OR REPLACE FUNCTION save_conversion_settings(
    p_product_id UUID,
    p_organization_id UUID,
    p_facebook_enabled BOOLEAN DEFAULT false,
    p_facebook_pixel_id TEXT DEFAULT NULL,
    p_facebook_conversion_api_enabled BOOLEAN DEFAULT false,
    p_facebook_access_token TEXT DEFAULT NULL,
    p_facebook_dataset_id TEXT DEFAULT NULL,
    p_facebook_test_event_code TEXT DEFAULT NULL,
    p_tiktok_enabled BOOLEAN DEFAULT false,
    p_tiktok_pixel_id TEXT DEFAULT NULL,
    p_tiktok_access_token TEXT DEFAULT NULL,
    p_tiktok_events_api_enabled BOOLEAN DEFAULT false,
    p_tiktok_test_event_code TEXT DEFAULT NULL,
    p_google_enabled BOOLEAN DEFAULT false,
    p_google_gtag_id TEXT DEFAULT NULL,
    p_google_conversion_id TEXT DEFAULT NULL,
    p_google_conversion_label TEXT DEFAULT NULL,
    p_test_mode BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_record_exists BOOLEAN := false;
BEGIN
    -- التحقق من وجود سجل موجود
    SELECT EXISTS(
        SELECT 1 FROM product_marketing_settings 
        WHERE product_id = p_product_id
    ) INTO v_existing_record_exists;
    
    IF v_existing_record_exists THEN
        -- تحديث السجل الموجود
        UPDATE product_marketing_settings 
        SET 
            enable_facebook_pixel = p_facebook_enabled,
            facebook_pixel_id = p_facebook_pixel_id,
            enable_facebook_conversion_api = p_facebook_conversion_api_enabled,
            facebook_access_token = p_facebook_access_token,
            facebook_dataset_id = p_facebook_dataset_id,
            facebook_test_event_code = p_facebook_test_event_code,
            enable_tiktok_pixel = p_tiktok_enabled,
            tiktok_pixel_id = p_tiktok_pixel_id,
            tiktok_access_token = p_tiktok_access_token,
            tiktok_events_api_enabled = p_tiktok_events_api_enabled,
            tiktok_test_event_code = p_tiktok_test_event_code,
            enable_google_ads_tracking = p_google_enabled,
            google_gtag_id = p_google_gtag_id,
            google_ads_conversion_id = p_google_conversion_id,
            google_ads_conversion_label = p_google_conversion_label,
            test_mode = p_test_mode,
            updated_at = NOW()
        WHERE product_id = p_product_id;
    ELSE
        -- إنشاء سجل جديد
        INSERT INTO product_marketing_settings (
            product_id, organization_id,
            enable_facebook_pixel, facebook_pixel_id, enable_facebook_conversion_api,
            facebook_access_token, facebook_dataset_id, facebook_test_event_code,
            enable_tiktok_pixel, tiktok_pixel_id, tiktok_access_token,
            tiktok_events_api_enabled, tiktok_test_event_code,
            enable_google_ads_tracking, google_gtag_id, google_ads_conversion_id,
            google_ads_conversion_label, test_mode
        ) VALUES (
            p_product_id, p_organization_id,
            p_facebook_enabled, p_facebook_pixel_id, p_facebook_conversion_api_enabled,
            p_facebook_access_token, p_facebook_dataset_id, p_facebook_test_event_code,
            p_tiktok_enabled, p_tiktok_pixel_id, p_tiktok_access_token,
            p_tiktok_events_api_enabled, p_tiktok_test_event_code,
            p_google_enabled, p_google_gtag_id, p_google_conversion_id,
            p_google_conversion_label, p_test_mode
        );
    END IF;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في حفظ إعدادات التحويل: %', SQLERRM;
        RETURN false;
END;
$$;

-- 5. إنشاء دالة لتجربة حفظ إعدادات المنتج "بلابلابلالاب"
CREATE OR REPLACE FUNCTION test_save_blabblablab_conversion_settings()
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    current_settings JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_id UUID := '7779edee-7b0a-41c2-bd2a-d8753d6596ff';
    v_organization_id UUID := 'fed872f9-1ade-4351-b020-5598fda976fe';
    v_success BOOLEAN;
    v_settings JSONB;
BEGIN
    -- محاولة حفظ إعدادات تجريبية
    SELECT save_conversion_settings(
        v_product_id, v_organization_id,
        p_facebook_enabled := true,
        p_facebook_pixel_id := '1234567890123456',
        p_facebook_conversion_api_enabled := true,
        p_facebook_access_token := 'test_access_token',
        p_tiktok_enabled := true,
        p_tiktok_pixel_id := 'TT123456789',
        p_test_mode := true
    ) INTO v_success;
    
    -- جلب الإعدادات الحالية
    SELECT settings INTO v_settings
    FROM conversion_settings_view 
    WHERE product_id = v_product_id;
    
    RETURN QUERY SELECT 
        v_success,
        CASE 
            WHEN v_success THEN 'تم حفظ الإعدادات بنجاح'
            ELSE 'فشل في حفظ الإعدادات'
        END,
        COALESCE(v_settings, '{}'::jsonb);
END;
$$;

-- 6. إنشاء trigger لضمان التحديث التلقائي للـ timestamp
CREATE OR REPLACE FUNCTION update_product_marketing_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_marketing_settings_timestamp_trigger 
ON product_marketing_settings;

CREATE TRIGGER update_product_marketing_settings_timestamp_trigger
    BEFORE UPDATE ON product_marketing_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_product_marketing_settings_timestamp();

-- 7. إضافة تعليقات للجدول والحقول
COMMENT ON TABLE product_marketing_settings IS 'إعدادات التسويق والتحويل للمنتجات';
COMMENT ON COLUMN product_marketing_settings.enable_facebook_pixel IS 'تفعيل فيسبوك بيكسل';
COMMENT ON COLUMN product_marketing_settings.facebook_pixel_id IS 'معرف فيسبوك بيكسل';
COMMENT ON COLUMN product_marketing_settings.enable_facebook_conversion_api IS 'تفعيل Facebook Conversion API';
COMMENT ON COLUMN product_marketing_settings.test_mode IS 'وضع الاختبار لجميع منصات التتبع';

-- 8. تحديث البيانات الموجودة
UPDATE product_marketing_settings 
SET test_mode = true 
WHERE test_mode IS NULL;

-- إضافة organization_id للسجلات التي لا تحتوي عليه
UPDATE product_marketing_settings 
SET organization_id = (
    SELECT organization_id 
    FROM products 
    WHERE products.id = product_marketing_settings.product_id
)
WHERE organization_id IS NULL;

-- طباعة رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE 'تم تطبيق إصلاحات conversion_settings_view بنجاح!';
    RAISE NOTICE 'يمكنك الآن اختبار الحفظ باستخدام: SELECT * FROM test_save_blabblablab_conversion_settings();';
END $$; 