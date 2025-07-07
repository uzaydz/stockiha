-- إنشاء جدول إعدادات التحويل المحسن
CREATE TABLE IF NOT EXISTS organization_conversion_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- إعدادات Facebook
    facebook_enabled BOOLEAN DEFAULT false,
    facebook_pixel_id VARCHAR(50),
    facebook_conversion_api_enabled BOOLEAN DEFAULT false,
    facebook_access_token TEXT,
    facebook_test_event_code VARCHAR(50),
    
    -- إعدادات Google
    google_enabled BOOLEAN DEFAULT false,
    google_gtag_id VARCHAR(50),
    google_ads_conversion_id VARCHAR(50),
    google_ads_conversion_label VARCHAR(100),
    
    -- إعدادات TikTok
    tiktok_enabled BOOLEAN DEFAULT false,
    tiktok_pixel_id VARCHAR(50),
    tiktok_events_api_enabled BOOLEAN DEFAULT false,
    tiktok_access_token TEXT,
    tiktok_test_event_code VARCHAR(50),
    
    -- إعدادات عامة
    test_mode BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id)
);

-- إنشاء جدول أحداث التحويل المحسن
CREATE TABLE IF NOT EXISTS conversion_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- معلومات الحدث
    event_type VARCHAR(50) NOT NULL, -- view_content, add_to_cart, initiate_checkout, purchase
    platform VARCHAR(20) NOT NULL, -- facebook, google, tiktok
    api_type VARCHAR(20) NOT NULL, -- pixel, conversion_api, events_api
    
    -- بيانات المنتج
    product_name VARCHAR(255),
    product_price DECIMAL(10,2),
    product_quantity INTEGER DEFAULT 1,
    product_image_url TEXT,
    selected_color VARCHAR(100),
    selected_size VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'DZD',
    
    -- بيانات المستخدم (مشفرة)
    user_email_hash VARCHAR(64), -- SHA-256 hash
    user_phone_hash VARCHAR(64), -- SHA-256 hash
    user_name_hash VARCHAR(64), -- SHA-256 hash
    
    -- معلومات الطلب (للأحداث المكتملة)
    order_id UUID,
    order_number VARCHAR(50),
    total_amount DECIMAL(10,2),
    
    -- معلومات التتبع
    event_id VARCHAR(100), -- معرف فريد للحدث
    pixel_event_id VARCHAR(100), -- معرف حدث البكسل
    conversion_api_event_id VARCHAR(100), -- معرف حدث Conversion API
    
    -- حالة الإرسال
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, retry
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- بيانات الاستجابة
    response_data JSONB,
    
    -- طوابع زمنية
    event_time TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- فهارس
    INDEX idx_conversion_events_org_product (organization_id, product_id),
    INDEX idx_conversion_events_event_type (event_type),
    INDEX idx_conversion_events_platform (platform),
    INDEX idx_conversion_events_status (status),
    INDEX idx_conversion_events_event_time (event_time),
    INDEX idx_conversion_events_order (order_id)
);

-- إنشاء جدول إحصائيات التحويل
CREATE TABLE IF NOT EXISTS conversion_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- فترة الإحصائية
    date DATE NOT NULL,
    
    -- إحصائيات الأحداث
    view_content_count INTEGER DEFAULT 0,
    add_to_cart_count INTEGER DEFAULT 0,
    initiate_checkout_count INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    
    -- إحصائيات المنصات
    facebook_events_count INTEGER DEFAULT 0,
    google_events_count INTEGER DEFAULT 0,
    tiktok_events_count INTEGER DEFAULT 0,
    
    -- إحصائيات النجاح/الفشل
    successful_events INTEGER DEFAULT 0,
    failed_events INTEGER DEFAULT 0,
    
    -- القيم المالية
    total_revenue DECIMAL(12,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, product_id, date)
);

-- إنشاء دالة تحديث الطوابع الزمنية
CREATE OR REPLACE FUNCTION update_conversion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة المشغلات
CREATE TRIGGER update_organization_conversion_settings_updated_at
    BEFORE UPDATE ON organization_conversion_settings
    FOR EACH ROW EXECUTE FUNCTION update_conversion_updated_at();

CREATE TRIGGER update_conversion_events_updated_at
    BEFORE UPDATE ON conversion_events
    FOR EACH ROW EXECUTE FUNCTION update_conversion_updated_at();

CREATE TRIGGER update_conversion_stats_updated_at
    BEFORE UPDATE ON conversion_stats
    FOR EACH ROW EXECUTE FUNCTION update_conversion_updated_at();

-- إضافة بيانات تجريبية للتطوير
INSERT INTO organization_conversion_settings (
    organization_id,
    facebook_enabled,
    facebook_pixel_id,
    facebook_conversion_api_enabled,
    tiktok_enabled,
    tiktok_pixel_id,
    tiktok_events_api_enabled,
    google_enabled,
    google_gtag_id,
    test_mode
) 
SELECT 
    id as organization_id,
    true as facebook_enabled,
    'YOUR_FACEBOOK_PIXEL_ID' as facebook_pixel_id,
    true as facebook_conversion_api_enabled,
    true as tiktok_enabled,
    'YOUR_TIKTOK_PIXEL_ID' as tiktok_pixel_id,
    true as tiktok_events_api_enabled,
    true as google_enabled,
    'YOUR_GOOGLE_GTAG_ID' as google_gtag_id,
    true as test_mode
FROM organizations 
WHERE NOT EXISTS (
    SELECT 1 FROM organization_conversion_settings 
    WHERE organization_conversion_settings.organization_id = organizations.id
)
LIMIT 1;

-- إنشاء دالة لتنظيف الأحداث القديمة
CREATE OR REPLACE FUNCTION cleanup_old_conversion_events()
RETURNS void AS $$
BEGIN
    -- حذف الأحداث الناجحة الأقدم من 30 يوماً
    DELETE FROM conversion_events 
    WHERE status = 'sent' 
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- حذف الأحداث الفاشلة الأقدم من 7 أيام
    DELETE FROM conversion_events 
    WHERE status = 'failed' 
    AND retry_count >= max_retries
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة لإعادة محاولة الأحداث الفاشلة
CREATE OR REPLACE FUNCTION retry_failed_conversion_events()
RETURNS TABLE(event_id UUID, retry_count INTEGER) AS $$
BEGIN
    RETURN QUERY
    UPDATE conversion_events 
    SET 
        status = 'pending',
        retry_count = retry_count + 1,
        updated_at = NOW()
    WHERE status = 'failed' 
    AND retry_count < max_retries
    AND created_at > NOW() - INTERVAL '24 hours'
    RETURNING id, conversion_events.retry_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE organization_conversion_settings IS 'إعدادات التتبع والتحويل لكل مؤسسة';
COMMENT ON TABLE conversion_events IS 'سجل جميع أحداث التحويل المرسلة للمنصات المختلفة';
COMMENT ON TABLE conversion_stats IS 'إحصائيات يومية لأحداث التحويل'; 