-- إصلاح سياسات RLS لجدول product_marketing_settings
-- هذا الملف يحل مشكلة خطأ 403 (Forbidden) عند الوصول إلى جدول product_marketing_settings

-- 1. إنشاء سياسة للقراءة (SELECT)
CREATE POLICY "Enable read access for organization members" ON product_marketing_settings
    FOR SELECT
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

-- 2. إنشاء سياسة للإدراج (INSERT)  
CREATE POLICY "Enable insert for organization members" ON product_marketing_settings
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

-- 3. إنشاء سياسة للتحديث (UPDATE)
CREATE POLICY "Enable update for organization members" ON product_marketing_settings
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

-- 4. إنشاء سياسة للحذف (DELETE)
CREATE POLICY "Enable delete for organization members" ON product_marketing_settings
    FOR DELETE
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
        )
    );

-- 5. إنشاء سياسة خاصة للمطورين/المدراء (للوصول الكامل)
CREATE POLICY "Enable full access for developers" ON product_marketing_settings
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id 
            FROM organization_members 
            WHERE role IN ('owner', 'admin', 'developer')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id 
            FROM organization_members 
            WHERE role IN ('owner', 'admin', 'developer')
        )
    );

-- 6. إنشاء trigger لإنشاء سجل product_marketing_settings تلقائياً عند إنشاء منتج جديد
CREATE OR REPLACE FUNCTION create_default_product_marketing_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- إنشاء سجل product_marketing_settings بالقيم الافتراضية
  INSERT INTO product_marketing_settings (
    product_id,
    organization_id,
    enable_reviews,
    reviews_verify_purchase,
    reviews_auto_approve,
    allow_images_in_reviews,
    enable_review_replies,
    review_display_style,
    enable_fake_star_ratings,
    fake_star_rating_value,
    fake_star_rating_count,
    enable_fake_purchase_counter,
    fake_purchase_count,
    enable_facebook_pixel,
    facebook_standard_events,
    facebook_advanced_matching_enabled,
    facebook_conversations_api_enabled,
    enable_tiktok_pixel,
    tiktok_standard_events,
    tiktok_advanced_matching_enabled,
    tiktok_events_api_enabled,
    enable_snapchat_pixel,
    snapchat_standard_events,
    snapchat_advanced_matching_enabled,
    snapchat_events_api_enabled,
    enable_google_ads_tracking,
    google_ads_global_site_tag_enabled,
    google_ads_event_snippets,
    google_ads_enhanced_conversions_enabled,
    offer_timer_enabled,
    offer_timer_display_style,
    offer_timer_end_action,
    offer_timer_restart_for_new_session,
    loyalty_points_enabled,
    redeem_points_for_discount,
    points_expiration_months,
    offer_timer_show_on_specific_pages_only,
    enable_facebook_conversion_api,
    test_mode
  ) VALUES (
    NEW.id,
    NEW.organization_id,
    true,  -- enable_reviews
    true,  -- reviews_verify_purchase
    true,  -- reviews_auto_approve
    true,  -- allow_images_in_reviews
    true,  -- enable_review_replies
    'stars_summary',  -- review_display_style
    false,  -- enable_fake_star_ratings
    4.5,    -- fake_star_rating_value
    100,    -- fake_star_rating_count
    false,  -- enable_fake_purchase_counter
    50,     -- fake_purchase_count
    false,  -- enable_facebook_pixel
    '{}',   -- facebook_standard_events
    false,  -- facebook_advanced_matching_enabled
    false,  -- facebook_conversations_api_enabled
    false,  -- enable_tiktok_pixel
    '{}',   -- tiktok_standard_events
    false,  -- tiktok_advanced_matching_enabled
    false,  -- tiktok_events_api_enabled
    false,  -- enable_snapchat_pixel
    '{}',   -- snapchat_standard_events
    false,  -- snapchat_advanced_matching_enabled
    false,  -- snapchat_events_api_enabled
    false,  -- enable_google_ads_tracking
    false,  -- google_ads_global_site_tag_enabled
    '{}',   -- google_ads_event_snippets
    false,  -- google_ads_enhanced_conversions_enabled
    false,  -- offer_timer_enabled
    'countdown',  -- offer_timer_display_style
    'hide',       -- offer_timer_end_action
    false,  -- offer_timer_restart_for_new_session
    false,  -- loyalty_points_enabled
    false,  -- redeem_points_for_discount
    0,      -- points_expiration_months
    false,  -- offer_timer_show_on_specific_pages_only
    false,  -- enable_facebook_conversion_api
    true    -- test_mode
  )
  ON CONFLICT (product_id) DO NOTHING;  -- تجنب التكرار إذا كان السجل موجود
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. إنشاء trigger على جدول products لإنشاء product_marketing_settings تلقائياً
DROP TRIGGER IF EXISTS create_product_marketing_settings_trigger ON products;
CREATE TRIGGER create_product_marketing_settings_trigger
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION create_default_product_marketing_settings();

-- 8. إضافة index للأداء
CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_org_id 
ON product_marketing_settings(organization_id);

CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_product_id 
ON product_marketing_settings(product_id);

-- 9. إنشاء view مساعد للوصول السهل
CREATE OR REPLACE VIEW user_product_marketing_settings AS
SELECT pms.*
FROM product_marketing_settings pms
INNER JOIN organization_members om ON pms.organization_id = om.organization_id
WHERE om.user_id = auth.uid();

-- منح الصلاحيات للـ view
GRANT SELECT ON user_product_marketing_settings TO authenticated;

-- 10. إصلاح أي سجلات منتجات موجودة بدون product_marketing_settings
INSERT INTO product_marketing_settings (
  product_id,
  organization_id,
  enable_reviews,
  test_mode
)
SELECT DISTINCT
  p.id,
  p.organization_id,
  true,
  true
FROM products p
LEFT JOIN product_marketing_settings pms ON p.id = pms.product_id
WHERE pms.product_id IS NULL;

-- تأكيد تطبيق السياسات
NOTIFY pgrst, 'reload config'; 