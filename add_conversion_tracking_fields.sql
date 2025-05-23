-- إضافة الحقول المفقودة لتتبع التحويلات في جدول product_marketing_settings
-- تاريخ الإنشاء: 2024

-- إضافة حقل تفعيل Facebook Conversion API
ALTER TABLE product_marketing_settings 
ADD COLUMN IF NOT EXISTS enable_facebook_conversion_api BOOLEAN DEFAULT false;

-- إضافة حقل معرف Facebook Dataset (مطلوب لـ Conversion API)
ALTER TABLE product_marketing_settings 
ADD COLUMN IF NOT EXISTS facebook_dataset_id TEXT;

-- إضافة حقل تسمية التحويل من Google Ads
ALTER TABLE product_marketing_settings 
ADD COLUMN IF NOT EXISTS google_ads_conversion_label TEXT;

-- إضافة حقل Google Tag ID (gtag) لتتبع أفضل
ALTER TABLE product_marketing_settings 
ADD COLUMN IF NOT EXISTS google_gtag_id TEXT;

-- إضافة حقل وضع الاختبار لجميع المنصات
ALTER TABLE product_marketing_settings 
ADD COLUMN IF NOT EXISTS test_mode BOOLEAN DEFAULT true;

-- إنشاء جدول لتسجيل أحداث التحويل
CREATE TABLE IF NOT EXISTS conversion_events (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- purchase, view_content, add_to_cart, etc.
    platform VARCHAR(20) NOT NULL, -- facebook, google, tiktok
    user_data JSONB, -- بيانات المستخدم المشفرة للتتبع
    custom_data JSONB, -- بيانات مخصصة للحدث
    event_id VARCHAR(100) UNIQUE, -- معرف فريد للحدث لتجنب التكرار
    timestamp TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP,
    sent_at TIMESTAMP
);

-- إنشاء جدول لتتبع إعدادات التحويل لكل مؤسسة (Global Settings)
CREATE TABLE IF NOT EXISTS organization_conversion_settings (
    id SERIAL PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Facebook Global Settings
    facebook_app_id VARCHAR(50),
    facebook_app_secret TEXT,
    facebook_business_id VARCHAR(50),
    
    -- Google Global Settings
    google_measurement_id VARCHAR(50), -- GA4 Measurement ID
    google_ads_customer_id VARCHAR(50),
    google_analytics_property_id VARCHAR(50),
    
    -- TikTok Global Settings
    tiktok_app_id VARCHAR(50),
    tiktok_app_secret TEXT,
    
    -- إعدادات عامة
    default_currency_code VARCHAR(3) DEFAULT 'DZD',
    enable_enhanced_conversions BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(organization_id)
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_conversion_events_product_id ON conversion_events(product_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_order_id ON conversion_events(order_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_platform ON conversion_events(platform);
CREATE INDEX IF NOT EXISTS idx_conversion_events_status ON conversion_events(status);
CREATE INDEX IF NOT EXISTS idx_conversion_events_timestamp ON conversion_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_type ON conversion_events(event_type);

-- تحديث البيانات الموجودة لتكون متوافقة
UPDATE product_marketing_settings 
SET test_mode = true 
WHERE test_mode IS NULL;

-- إضافة تعليقات للجداول
COMMENT ON TABLE conversion_events IS 'سجل أحداث التحويل لجميع المنصات';
COMMENT ON TABLE organization_conversion_settings IS 'إعدادات التحويل العامة لكل مؤسسة';

-- إنشاء دالة لتسجيل حدث تحويل
CREATE OR REPLACE FUNCTION log_conversion_event(
    p_product_id UUID,
    p_order_id UUID,
    p_event_type VARCHAR(50),
    p_platform VARCHAR(20),
    p_user_data JSONB DEFAULT NULL,
    p_custom_data JSONB DEFAULT NULL,
    p_event_id VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    -- إدراج الحدث في الجدول
    INSERT INTO conversion_events (
        product_id, order_id, event_type, platform, 
        user_data, custom_data, event_id
    )
    VALUES (
        p_product_id, p_order_id, p_event_type, p_platform,
        p_user_data, p_custom_data, p_event_id
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لجلب إعدادات التحويل لمنتج معين
CREATE OR REPLACE FUNCTION get_product_conversion_settings(p_product_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_settings JSONB;
    v_org_settings JSONB;
    v_organization_id UUID;
BEGIN
    -- الحصول على معرف المؤسسة
    SELECT organization_id INTO v_organization_id
    FROM products 
    WHERE id = p_product_id;
    
    -- الحصول على إعدادات المنتج
    SELECT jsonb_build_object(
        'facebook', jsonb_build_object(
            'enabled', COALESCE(enable_facebook_pixel, false),
            'pixel_id', facebook_pixel_id,
            'conversion_api_enabled', COALESCE(enable_facebook_conversion_api, false),
            'access_token', facebook_access_token,
            'dataset_id', facebook_dataset_id,
            'test_event_code', facebook_test_event_code
        ),
        'google', jsonb_build_object(
            'enabled', COALESCE(enable_google_ads_tracking, false),
            'conversion_id', google_ads_conversion_id,
            'conversion_label', google_ads_conversion_label,
            'gtag_id', google_gtag_id,
            'enhanced_conversions', COALESCE(google_ads_enhanced_conversions_enabled, false)
        ),
        'tiktok', jsonb_build_object(
            'enabled', COALESCE(enable_tiktok_pixel, false),
            'pixel_id', tiktok_pixel_id,
            'access_token', tiktok_access_token,
            'events_api_enabled', COALESCE(tiktok_events_api_enabled, false),
            'test_event_code', tiktok_test_event_code
        ),
        'test_mode', COALESCE(test_mode, true)
    ) INTO v_settings
    FROM product_marketing_settings
    WHERE product_id = p_product_id;
    
    -- الحصول على الإعدادات العامة للمؤسسة
    SELECT jsonb_build_object(
        'facebook_app_id', facebook_app_id,
        'google_measurement_id', google_measurement_id,
        'tiktok_app_id', tiktok_app_id,
        'default_currency', default_currency_code
    ) INTO v_org_settings
    FROM organization_conversion_settings
    WHERE organization_id = v_organization_id;
    
    -- دمج الإعدادات
    RETURN jsonb_build_object(
        'product_settings', COALESCE(v_settings, '{}'::jsonb),
        'organization_settings', COALESCE(v_org_settings, '{}'::jsonb)
    );
END;
$$ LANGUAGE plpgsql; 