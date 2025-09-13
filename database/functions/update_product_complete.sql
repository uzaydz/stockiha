-- ================================================
-- إصلاح مشكلة الصور في دالة update_product_complete
-- ================================================

-- حذف الدالة القديمة لتجنب تضارب المعاملات
DROP FUNCTION IF EXISTS update_product_complete(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, uuid);

CREATE OR REPLACE FUNCTION update_product_complete(
  p_product_id UUID,
  p_product_data JSONB,
  p_advanced_settings JSONB DEFAULT NULL,
  p_marketing_settings JSONB DEFAULT NULL,
  p_colors JSONB DEFAULT NULL,
  p_images JSONB DEFAULT NULL,
  p_wholesale_tiers JSONB DEFAULT NULL,
  p_special_offers_config JSONB DEFAULT NULL,
  p_advanced_description JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_product_record RECORD;
  v_color_record RECORD;
  v_color_id UUID;
  v_size_record RECORD;
  v_total_stock INTEGER := 0;
  v_has_variants BOOLEAN := FALSE;
  v_publication_status TEXT;
  v_publish_at TIMESTAMPTZ;
BEGIN
  -- بدء المعاملة (Transaction)
  BEGIN
    
    -- 1. تحديث المنتج الرئيسي
    -- الحصول على البيانات الحالية للمنتج أولاً
    SELECT publication_status INTO v_publication_status 
    FROM products WHERE id = p_product_id;
    
    -- حساب حالة النشر والقيم الزمنية قبل التحديث
    v_publication_status := COALESCE(
      (p_product_data->>'publication_status'),
      v_publication_status
    );
    IF v_publication_status IS NULL THEN
      v_publication_status := 'published';
    END IF;
    IF v_publication_status NOT IN ('draft','scheduled','published','archived') THEN
      v_publication_status := 'published';
    END IF;
    v_publish_at := CASE 
      WHEN p_product_data ? 'publish_at' AND (p_product_data->>'publish_at') IS NOT NULL AND (p_product_data->>'publish_at') != ''
      THEN (p_product_data->>'publish_at')::TIMESTAMPTZ
      ELSE NULL
    END;

    UPDATE products 
    SET 
      name = COALESCE((p_product_data->>'name')::TEXT, name),
      description = COALESCE((p_product_data->>'description')::TEXT, description),
      price = COALESCE((p_product_data->>'price')::NUMERIC, price),
      purchase_price = COALESCE((p_product_data->>'purchase_price')::NUMERIC, purchase_price),
      compare_at_price = CASE 
        WHEN p_product_data ? 'compare_at_price' AND (p_product_data->>'compare_at_price') IS NOT NULL AND (p_product_data->>'compare_at_price') != '' 
        THEN (p_product_data->>'compare_at_price')::NUMERIC 
        ELSE compare_at_price 
      END,
      sku = COALESCE((p_product_data->>'sku')::TEXT, sku),
      barcode = COALESCE((p_product_data->>'barcode')::TEXT, barcode),
      category_id = CASE 
        WHEN p_product_data ? 'category_id' AND (p_product_data->>'category_id') IS NOT NULL AND (p_product_data->>'category_id') != '' 
        THEN (p_product_data->>'category_id')::UUID 
        ELSE category_id 
      END,
      subcategory_id = CASE 
        WHEN p_product_data ? 'subcategory_id' AND (p_product_data->>'subcategory_id') IS NOT NULL AND (p_product_data->>'subcategory_id') != '' 
        THEN (p_product_data->>'subcategory_id')::UUID 
        ELSE subcategory_id 
      END,
      brand = COALESCE((p_product_data->>'brand')::TEXT, brand),
      thumbnail_image = COALESCE((p_product_data->>'thumbnail_image')::TEXT, thumbnail_image),
      has_variants = COALESCE((p_product_data->>'has_variants')::BOOLEAN, has_variants),
      show_price_on_landing = COALESCE((p_product_data->>'show_price_on_landing')::BOOLEAN, show_price_on_landing),
      is_featured = COALESCE((p_product_data->>'is_featured')::BOOLEAN, is_featured),
      is_new = COALESCE((p_product_data->>'is_new')::BOOLEAN, is_new),
      use_sizes = COALESCE((p_product_data->>'use_sizes')::BOOLEAN, use_sizes),
      is_sold_by_unit = COALESCE((p_product_data->>'is_sold_by_unit')::BOOLEAN, is_sold_by_unit),
      unit_type = COALESCE((p_product_data->>'unit_type')::TEXT, unit_type),
      use_variant_prices = COALESCE((p_product_data->>'use_variant_prices')::BOOLEAN, use_variant_prices),
      unit_purchase_price = CASE 
        WHEN p_product_data ? 'unit_purchase_price' AND (p_product_data->>'unit_purchase_price') IS NOT NULL AND (p_product_data->>'unit_purchase_price') != '' 
        THEN (p_product_data->>'unit_purchase_price')::NUMERIC 
        ELSE unit_purchase_price 
      END,
      unit_sale_price = CASE 
        WHEN p_product_data ? 'unit_sale_price' AND (p_product_data->>'unit_sale_price') IS NOT NULL AND (p_product_data->>'unit_sale_price') != '' 
        THEN (p_product_data->>'unit_sale_price')::NUMERIC 
        ELSE unit_sale_price 
      END,
      form_template_id = CASE 
        WHEN p_product_data ? 'form_template_id' AND (p_product_data->>'form_template_id') IS NOT NULL AND (p_product_data->>'form_template_id') != '' 
        THEN (p_product_data->>'form_template_id')::UUID 
        ELSE form_template_id 
      END,
      shipping_provider_id = CASE 
        WHEN p_product_data ? 'shipping_provider_id' AND (p_product_data->>'shipping_provider_id') IS NOT NULL AND (p_product_data->>'shipping_provider_id') != '' 
        THEN (p_product_data->>'shipping_provider_id')::INTEGER 
        ELSE shipping_provider_id 
      END,
      use_shipping_clone = COALESCE((p_product_data->>'use_shipping_clone')::BOOLEAN, use_shipping_clone),
      shipping_clone_id = CASE 
        WHEN p_product_data ? 'shipping_clone_id' AND (p_product_data->>'shipping_clone_id') IS NOT NULL AND (p_product_data->>'shipping_clone_id') != '' 
        THEN (p_product_data->>'shipping_clone_id')::INTEGER 
        ELSE shipping_clone_id 
      END,
      is_digital = COALESCE((p_product_data->>'is_digital')::BOOLEAN, is_digital),
      features = CASE 
        WHEN p_product_data ? 'features' AND (p_product_data->>'features') IS NOT NULL 
        THEN ARRAY(SELECT jsonb_array_elements_text((p_product_data->>'features')::JSONB))
        ELSE features 
      END,
      specifications = COALESCE((p_product_data->>'specifications')::JSONB, specifications),
      name_for_shipping = COALESCE((p_product_data->>'name_for_shipping')::TEXT, name_for_shipping),
      allow_retail = COALESCE((p_product_data->>'allow_retail')::BOOLEAN, allow_retail),
      allow_wholesale = COALESCE((p_product_data->>'allow_wholesale')::BOOLEAN, allow_wholesale),
      allow_partial_wholesale = COALESCE((p_product_data->>'allow_partial_wholesale')::BOOLEAN, allow_partial_wholesale),
      wholesale_price = CASE 
        WHEN p_product_data ? 'wholesale_price' AND (p_product_data->>'wholesale_price') IS NOT NULL AND (p_product_data->>'wholesale_price') != '' 
        THEN (p_product_data->>'wholesale_price')::NUMERIC 
        ELSE wholesale_price 
      END,
      partial_wholesale_price = CASE 
        WHEN p_product_data ? 'partial_wholesale_price' AND (p_product_data->>'partial_wholesale_price') IS NOT NULL AND (p_product_data->>'partial_wholesale_price') != '' 
        THEN (p_product_data->>'partial_wholesale_price')::NUMERIC 
        ELSE partial_wholesale_price 
      END,
      min_wholesale_quantity = CASE 
        WHEN p_product_data ? 'min_wholesale_quantity' AND (p_product_data->>'min_wholesale_quantity') IS NOT NULL AND (p_product_data->>'min_wholesale_quantity') != '' 
        THEN (p_product_data->>'min_wholesale_quantity')::INTEGER 
        ELSE min_wholesale_quantity 
      END,
      min_partial_wholesale_quantity = CASE 
        WHEN p_product_data ? 'min_partial_wholesale_quantity' AND (p_product_data->>'min_partial_wholesale_quantity') IS NOT NULL AND (p_product_data->>'min_partial_wholesale_quantity') != '' 
        THEN (p_product_data->>'min_partial_wholesale_quantity')::INTEGER 
        ELSE min_partial_wholesale_quantity 
      END,
      stock_quantity = CASE 
        WHEN p_product_data ? 'stock_quantity' AND (p_product_data->>'stock_quantity') IS NOT NULL 
        THEN (p_product_data->>'stock_quantity')::INTEGER 
        ELSE stock_quantity 
      END,
      slug = CASE 
        WHEN p_product_data ? 'slug' AND (p_product_data->>'slug') IS NOT NULL AND (p_product_data->>'slug') != '' 
        THEN (p_product_data->>'slug')::TEXT 
        ELSE slug 
      END,
      special_offers_config = CASE 
        WHEN p_special_offers_config IS NOT NULL THEN p_special_offers_config
        WHEN p_product_data ? 'special_offers_config' AND (p_product_data->>'special_offers_config') IS NOT NULL 
        THEN (p_product_data->>'special_offers_config')::JSONB
        ELSE special_offers_config 
      END,
      advanced_description = CASE 
        WHEN p_advanced_description IS NOT NULL THEN p_advanced_description
        ELSE advanced_description 
      END,
      publication_status = v_publication_status,
      publish_at = v_publish_at,
      published_at = CASE 
        WHEN (p_product_data->>'publication_status') = 'published' AND published_at IS NULL THEN NOW()
        ELSE published_at
      END,
      is_active = CASE 
        WHEN v_publication_status = 'published' THEN TRUE
        ELSE FALSE
      END,
      updated_by_user_id = CASE 
        WHEN p_user_id IS NOT NULL THEN p_user_id 
        ELSE updated_by_user_id 
      END,
      updated_at = NOW()
    WHERE id = p_product_id
    RETURNING * INTO v_product_record;

    -- التحقق من نجاح التحديث
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found with id: %', p_product_id;
    END IF;

    -- الحصول على قيمة has_variants المحدثة
    v_has_variants := v_product_record.has_variants;

            -- 2. تحديث الإعدادات المتقدمة (باستخدام الحقول الموجودة فعلاً)
        IF p_advanced_settings IS NOT NULL THEN
          INSERT INTO product_advanced_settings (
            product_id,
            skip_cart,
            enable_sticky_buy_button,
            require_login_to_purchase,
            prevent_repeat_purchase,
            disable_quantity_selection,
            enable_stock_notification,
            show_fake_visitor_counter,
            enable_fake_low_stock,
            show_recent_purchases
          ) VALUES (
            p_product_id,
            COALESCE((p_advanced_settings->>'skip_cart')::BOOLEAN, FALSE),
            COALESCE((p_advanced_settings->>'enable_sticky_buy_button')::BOOLEAN, FALSE),
            COALESCE((p_advanced_settings->>'require_login_to_purchase')::BOOLEAN, FALSE),
            COALESCE((p_advanced_settings->>'prevent_repeat_purchase')::BOOLEAN, FALSE),
            COALESCE((p_advanced_settings->>'disable_quantity_selection')::BOOLEAN, FALSE),
            COALESCE((p_advanced_settings->>'enable_stock_notification')::BOOLEAN, FALSE),
            COALESCE((p_advanced_settings->>'show_fake_visitor_counter')::BOOLEAN, FALSE),
            COALESCE((p_advanced_settings->>'enable_fake_low_stock')::BOOLEAN, FALSE),
            COALESCE((p_advanced_settings->>'show_recent_purchases')::BOOLEAN, FALSE)
          )
          ON CONFLICT (product_id) 
          DO UPDATE SET
            skip_cart = COALESCE((p_advanced_settings->>'skip_cart')::BOOLEAN, product_advanced_settings.skip_cart),
            enable_sticky_buy_button = COALESCE((p_advanced_settings->>'enable_sticky_buy_button')::BOOLEAN, product_advanced_settings.enable_sticky_buy_button),
            require_login_to_purchase = COALESCE((p_advanced_settings->>'require_login_to_purchase')::BOOLEAN, product_advanced_settings.require_login_to_purchase),
            prevent_repeat_purchase = COALESCE((p_advanced_settings->>'prevent_repeat_purchase')::BOOLEAN, product_advanced_settings.prevent_repeat_purchase),
            disable_quantity_selection = COALESCE((p_advanced_settings->>'disable_quantity_selection')::BOOLEAN, product_advanced_settings.disable_quantity_selection),
            enable_stock_notification = COALESCE((p_advanced_settings->>'enable_stock_notification')::BOOLEAN, product_advanced_settings.enable_stock_notification),
            show_fake_visitor_counter = COALESCE((p_advanced_settings->>'show_fake_visitor_counter')::BOOLEAN, product_advanced_settings.show_fake_visitor_counter),
            enable_fake_low_stock = COALESCE((p_advanced_settings->>'enable_fake_low_stock')::BOOLEAN, product_advanced_settings.enable_fake_low_stock),
            show_recent_purchases = COALESCE((p_advanced_settings->>'show_recent_purchases')::BOOLEAN, product_advanced_settings.show_recent_purchases);
        END IF;

            -- 3. تحديث إعدادات التسويق (فقط إذا كانت موجودة)
        IF p_marketing_settings IS NOT NULL THEN
          INSERT INTO product_marketing_settings (
            product_id,
            organization_id,
            -- Facebook Pixel Settings
            enable_facebook_pixel,
            facebook_pixel_id,
            facebook_standard_events,
            facebook_advanced_matching_enabled,
            facebook_conversations_api_enabled,
            enable_facebook_conversion_api,
            facebook_access_token,
            facebook_test_event_code,
            facebook_dataset_id,
            -- TikTok Pixel Settings
            enable_tiktok_pixel,
            tiktok_pixel_id,
            tiktok_standard_events,
            tiktok_advanced_matching_enabled,
            tiktok_events_api_enabled,
            tiktok_access_token,
            tiktok_test_event_code,
            -- Snapchat Pixel Settings
            enable_snapchat_pixel,
            snapchat_pixel_id,
            snapchat_standard_events,
            snapchat_advanced_matching_enabled,
            snapchat_events_api_enabled,
            snapchat_api_token,
            snapchat_test_event_code,
            -- Google Ads Tracking Settings
            enable_google_ads_tracking,
            google_ads_conversion_id,
            google_ads_conversion_label,
            google_gtag_id,
            google_ads_global_site_tag_enabled,
            google_ads_event_snippets,
            google_ads_phone_conversion_number,
            google_ads_phone_conversion_label,
            google_ads_enhanced_conversions_enabled,
            -- Review Settings
            enable_reviews,
            reviews_verify_purchase,
            reviews_auto_approve,
            allow_images_in_reviews,
            enable_review_replies,
            review_display_style,
            -- Fake Engagement Settings
            enable_fake_star_ratings,
            fake_star_rating_value,
            fake_star_rating_count,
            enable_fake_purchase_counter,
            fake_purchase_count,
            -- Offer Timer Settings
            offer_timer_enabled,
            offer_timer_title,
            offer_timer_type,
            offer_timer_duration_minutes,
            offer_timer_end_date,
            offer_timer_display_style
          ) VALUES (
            p_product_id,
            v_product_record.organization_id,
            -- Facebook Pixel Settings
            COALESCE((p_marketing_settings->>'enable_facebook_pixel')::BOOLEAN, FALSE),
            (p_marketing_settings->>'facebook_pixel_id')::TEXT,
            (p_marketing_settings->>'facebook_standard_events')::JSONB,
            COALESCE((p_marketing_settings->>'facebook_advanced_matching_enabled')::BOOLEAN, FALSE),
            COALESCE((p_marketing_settings->>'facebook_conversations_api_enabled')::BOOLEAN, FALSE),
            COALESCE((p_marketing_settings->>'enable_facebook_conversion_api')::BOOLEAN, FALSE),
            (p_marketing_settings->>'facebook_access_token')::TEXT,
            (p_marketing_settings->>'facebook_test_event_code')::TEXT,
            (p_marketing_settings->>'facebook_dataset_id')::TEXT,
            -- TikTok Pixel Settings
            COALESCE((p_marketing_settings->>'enable_tiktok_pixel')::BOOLEAN, FALSE),
            (p_marketing_settings->>'tiktok_pixel_id')::TEXT,
            (p_marketing_settings->>'tiktok_standard_events')::JSONB,
            COALESCE((p_marketing_settings->>'tiktok_advanced_matching_enabled')::BOOLEAN, FALSE),
            COALESCE((p_marketing_settings->>'tiktok_events_api_enabled')::BOOLEAN, FALSE),
            (p_marketing_settings->>'tiktok_access_token')::TEXT,
            (p_marketing_settings->>'tiktok_test_event_code')::TEXT,
            -- Snapchat Pixel Settings
            COALESCE((p_marketing_settings->>'enable_snapchat_pixel')::BOOLEAN, FALSE),
            (p_marketing_settings->>'snapchat_pixel_id')::TEXT,
            (p_marketing_settings->>'snapchat_standard_events')::JSONB,
            COALESCE((p_marketing_settings->>'snapchat_advanced_matching_enabled')::BOOLEAN, FALSE),
            COALESCE((p_marketing_settings->>'snapchat_events_api_enabled')::BOOLEAN, FALSE),
            (p_marketing_settings->>'snapchat_api_token')::TEXT,
            (p_marketing_settings->>'snapchat_test_event_code')::TEXT,
            -- Google Ads Tracking Settings
            COALESCE((p_marketing_settings->>'enable_google_ads_tracking')::BOOLEAN, FALSE),
            (p_marketing_settings->>'google_ads_conversion_id')::TEXT,
            (p_marketing_settings->>'google_ads_conversion_label')::TEXT,
            (p_marketing_settings->>'google_gtag_id')::TEXT,
            COALESCE((p_marketing_settings->>'google_ads_global_site_tag_enabled')::BOOLEAN, FALSE),
            (p_marketing_settings->>'google_ads_event_snippets')::JSONB,
            (p_marketing_settings->>'google_ads_phone_conversion_number')::TEXT,
            (p_marketing_settings->>'google_ads_phone_conversion_label')::TEXT,
            COALESCE((p_marketing_settings->>'google_ads_enhanced_conversions_enabled')::BOOLEAN, FALSE),
            -- Review Settings
            COALESCE((p_marketing_settings->>'enable_reviews')::BOOLEAN, TRUE),
            COALESCE((p_marketing_settings->>'reviews_verify_purchase')::BOOLEAN, FALSE),
            COALESCE((p_marketing_settings->>'reviews_auto_approve')::BOOLEAN, TRUE),
            COALESCE((p_marketing_settings->>'allow_images_in_reviews')::BOOLEAN, TRUE),
            COALESCE((p_marketing_settings->>'enable_review_replies')::BOOLEAN, TRUE),
            (p_marketing_settings->>'review_display_style')::TEXT,
            -- Fake Engagement Settings
            COALESCE((p_marketing_settings->>'enable_fake_star_ratings')::BOOLEAN, FALSE),
            (p_marketing_settings->>'fake_star_rating_value')::NUMERIC,
            (p_marketing_settings->>'fake_star_rating_count')::INTEGER,
            COALESCE((p_marketing_settings->>'enable_fake_purchase_counter')::BOOLEAN, FALSE),
            (p_marketing_settings->>'fake_purchase_count')::INTEGER,
            -- Offer Timer Settings
            COALESCE((p_marketing_settings->>'offer_timer_enabled')::BOOLEAN, FALSE),
            (p_marketing_settings->>'offer_timer_title')::TEXT,
            (p_marketing_settings->>'offer_timer_type')::TEXT,
            (p_marketing_settings->>'offer_timer_duration_minutes')::INTEGER,
            CASE 
              WHEN (p_marketing_settings->>'offer_timer_end_date') IS NOT NULL AND (p_marketing_settings->>'offer_timer_end_date') != '' 
              THEN (p_marketing_settings->>'offer_timer_end_date')::TIMESTAMP WITH TIME ZONE 
              ELSE NULL 
            END,
            (p_marketing_settings->>'offer_timer_display_style')::TEXT
          )
          ON CONFLICT (product_id) 
          DO UPDATE SET
            -- Facebook Pixel Settings
            enable_facebook_pixel = COALESCE((p_marketing_settings->>'enable_facebook_pixel')::BOOLEAN, product_marketing_settings.enable_facebook_pixel),
            facebook_pixel_id = COALESCE((p_marketing_settings->>'facebook_pixel_id')::TEXT, product_marketing_settings.facebook_pixel_id),
            facebook_standard_events = COALESCE((p_marketing_settings->>'facebook_standard_events')::JSONB, product_marketing_settings.facebook_standard_events),
            facebook_advanced_matching_enabled = COALESCE((p_marketing_settings->>'facebook_advanced_matching_enabled')::BOOLEAN, product_marketing_settings.facebook_advanced_matching_enabled),
            facebook_conversations_api_enabled = COALESCE((p_marketing_settings->>'facebook_conversations_api_enabled')::BOOLEAN, product_marketing_settings.facebook_conversations_api_enabled),
            enable_facebook_conversion_api = COALESCE((p_marketing_settings->>'enable_facebook_conversion_api')::BOOLEAN, product_marketing_settings.enable_facebook_conversion_api),
            facebook_access_token = COALESCE((p_marketing_settings->>'facebook_access_token')::TEXT, product_marketing_settings.facebook_access_token),
            facebook_test_event_code = COALESCE((p_marketing_settings->>'facebook_test_event_code')::TEXT, product_marketing_settings.facebook_test_event_code),
            facebook_dataset_id = COALESCE((p_marketing_settings->>'facebook_dataset_id')::TEXT, product_marketing_settings.facebook_dataset_id),
            -- TikTok Pixel Settings
            enable_tiktok_pixel = COALESCE((p_marketing_settings->>'enable_tiktok_pixel')::BOOLEAN, product_marketing_settings.enable_tiktok_pixel),
            tiktok_pixel_id = COALESCE((p_marketing_settings->>'tiktok_pixel_id')::TEXT, product_marketing_settings.tiktok_pixel_id),
            tiktok_standard_events = COALESCE((p_marketing_settings->>'tiktok_standard_events')::JSONB, product_marketing_settings.tiktok_standard_events),
            tiktok_advanced_matching_enabled = COALESCE((p_marketing_settings->>'tiktok_advanced_matching_enabled')::BOOLEAN, product_marketing_settings.tiktok_advanced_matching_enabled),
            tiktok_events_api_enabled = COALESCE((p_marketing_settings->>'tiktok_events_api_enabled')::BOOLEAN, product_marketing_settings.tiktok_events_api_enabled),
            tiktok_access_token = COALESCE((p_marketing_settings->>'tiktok_access_token')::TEXT, product_marketing_settings.tiktok_access_token),
            tiktok_test_event_code = COALESCE((p_marketing_settings->>'tiktok_test_event_code')::TEXT, product_marketing_settings.tiktok_test_event_code),
            -- Snapchat Pixel Settings
            enable_snapchat_pixel = COALESCE((p_marketing_settings->>'enable_snapchat_pixel')::BOOLEAN, product_marketing_settings.enable_snapchat_pixel),
            snapchat_pixel_id = COALESCE((p_marketing_settings->>'snapchat_pixel_id')::TEXT, product_marketing_settings.snapchat_pixel_id),
            snapchat_standard_events = COALESCE((p_marketing_settings->>'snapchat_standard_events')::JSONB, product_marketing_settings.snapchat_standard_events),
            snapchat_advanced_matching_enabled = COALESCE((p_marketing_settings->>'snapchat_advanced_matching_enabled')::BOOLEAN, product_marketing_settings.snapchat_advanced_matching_enabled),
            snapchat_events_api_enabled = COALESCE((p_marketing_settings->>'snapchat_events_api_enabled')::BOOLEAN, product_marketing_settings.snapchat_events_api_enabled),
            snapchat_api_token = COALESCE((p_marketing_settings->>'snapchat_api_token')::TEXT, product_marketing_settings.snapchat_api_token),
            snapchat_test_event_code = COALESCE((p_marketing_settings->>'snapchat_test_event_code')::TEXT, product_marketing_settings.snapchat_test_event_code),
            -- Google Ads Tracking Settings
            enable_google_ads_tracking = COALESCE((p_marketing_settings->>'enable_google_ads_tracking')::BOOLEAN, product_marketing_settings.enable_google_ads_tracking),
            google_ads_conversion_id = COALESCE((p_marketing_settings->>'google_ads_conversion_id')::TEXT, product_marketing_settings.google_ads_conversion_id),
            google_ads_conversion_label = COALESCE((p_marketing_settings->>'google_ads_conversion_label')::TEXT, product_marketing_settings.google_ads_conversion_label),
            google_gtag_id = COALESCE((p_marketing_settings->>'google_gtag_id')::TEXT, product_marketing_settings.google_gtag_id),
            google_ads_global_site_tag_enabled = COALESCE((p_marketing_settings->>'google_ads_global_site_tag_enabled')::BOOLEAN, product_marketing_settings.google_ads_global_site_tag_enabled),
            google_ads_event_snippets = COALESCE((p_marketing_settings->>'google_ads_event_snippets')::JSONB, product_marketing_settings.google_ads_event_snippets),
            google_ads_phone_conversion_number = COALESCE((p_marketing_settings->>'google_ads_phone_conversion_number')::TEXT, product_marketing_settings.google_ads_phone_conversion_number),
            google_ads_phone_conversion_label = COALESCE((p_marketing_settings->>'google_ads_phone_conversion_label')::TEXT, product_marketing_settings.google_ads_phone_conversion_label),
            google_ads_enhanced_conversions_enabled = COALESCE((p_marketing_settings->>'google_ads_enhanced_conversions_enabled')::BOOLEAN, product_marketing_settings.google_ads_enhanced_conversions_enabled),
            -- Review Settings
            enable_reviews = COALESCE((p_marketing_settings->>'enable_reviews')::BOOLEAN, product_marketing_settings.enable_reviews),
            reviews_verify_purchase = COALESCE((p_marketing_settings->>'reviews_verify_purchase')::BOOLEAN, product_marketing_settings.reviews_verify_purchase),
            reviews_auto_approve = COALESCE((p_marketing_settings->>'reviews_auto_approve')::BOOLEAN, product_marketing_settings.reviews_auto_approve),
            allow_images_in_reviews = COALESCE((p_marketing_settings->>'allow_images_in_reviews')::BOOLEAN, product_marketing_settings.allow_images_in_reviews),
            enable_review_replies = COALESCE((p_marketing_settings->>'enable_review_replies')::BOOLEAN, product_marketing_settings.enable_review_replies),
            review_display_style = COALESCE((p_marketing_settings->>'review_display_style')::TEXT, product_marketing_settings.review_display_style),
            -- Fake Engagement Settings
            enable_fake_star_ratings = COALESCE((p_marketing_settings->>'enable_fake_star_ratings')::BOOLEAN, product_marketing_settings.enable_fake_star_ratings),
            fake_star_rating_value = COALESCE((p_marketing_settings->>'fake_star_rating_value')::NUMERIC, product_marketing_settings.fake_star_rating_value),
            fake_star_rating_count = COALESCE((p_marketing_settings->>'fake_star_rating_count')::INTEGER, product_marketing_settings.fake_star_rating_count),
            enable_fake_purchase_counter = COALESCE((p_marketing_settings->>'enable_fake_purchase_counter')::BOOLEAN, product_marketing_settings.enable_fake_purchase_counter),
            fake_purchase_count = COALESCE((p_marketing_settings->>'fake_purchase_count')::INTEGER, product_marketing_settings.fake_purchase_count),
            -- Offer Timer Settings
            offer_timer_enabled = COALESCE((p_marketing_settings->>'offer_timer_enabled')::BOOLEAN, product_marketing_settings.offer_timer_enabled),
            offer_timer_title = COALESCE((p_marketing_settings->>'offer_timer_title')::TEXT, product_marketing_settings.offer_timer_title),
            offer_timer_type = COALESCE((p_marketing_settings->>'offer_timer_type')::TEXT, product_marketing_settings.offer_timer_type),
            offer_timer_duration_minutes = COALESCE((p_marketing_settings->>'offer_timer_duration_minutes')::INTEGER, product_marketing_settings.offer_timer_duration_minutes),
            offer_timer_end_date = CASE 
              WHEN (p_marketing_settings->>'offer_timer_end_date') IS NOT NULL AND (p_marketing_settings->>'offer_timer_end_date') != '' 
              THEN (p_marketing_settings->>'offer_timer_end_date')::TIMESTAMP WITH TIME ZONE 
              ELSE product_marketing_settings.offer_timer_end_date 
            END,
            offer_timer_display_style = COALESCE((p_marketing_settings->>'offer_timer_display_style')::TEXT, product_marketing_settings.offer_timer_display_style);
        END IF;

    -- 4. معالجة الألوان والمتغيرات
    IF p_colors IS NOT NULL THEN
      -- حذف الألوان والمقاسات القديمة (CASCADE سيحذف المقاسات تلقائياً)
      DELETE FROM product_colors WHERE product_id = p_product_id;
      
      -- إدراج الألوان الجديدة
      FOR v_color_record IN 
        SELECT * FROM jsonb_array_elements(p_colors)
      LOOP
        INSERT INTO product_colors (
          product_id,
          name,
          color_code,
          image_url,
          quantity,
          is_default,
          barcode,
          has_sizes,
          price,
          purchase_price,
          variant_number
        ) VALUES (
          p_product_id,
          (v_color_record.value->>'name')::TEXT,
          (v_color_record.value->>'color_code')::TEXT,
          (v_color_record.value->>'image_url')::TEXT,
          COALESCE((v_color_record.value->>'quantity')::INTEGER, 0),
          COALESCE((v_color_record.value->>'is_default')::BOOLEAN, FALSE),
          (v_color_record.value->>'barcode')::TEXT,
          COALESCE((v_color_record.value->>'has_sizes')::BOOLEAN, FALSE),
          (v_color_record.value->>'price')::NUMERIC,
          (v_color_record.value->>'purchase_price')::NUMERIC,
          (v_color_record.value->>'variant_number')::INTEGER
        ) RETURNING id INTO v_color_id;

        -- إدراج المقاسات إذا كانت موجودة
        IF v_color_record.value ? 'sizes' AND jsonb_array_length(v_color_record.value->'sizes') > 0 THEN
          FOR v_size_record IN 
            SELECT * FROM jsonb_array_elements(v_color_record.value->'sizes')
          LOOP
            INSERT INTO product_sizes (
              color_id,
              product_id,
              size_name,
              quantity,
              price,
              purchase_price,
              barcode,
              is_default
            ) VALUES (
              v_color_id,
              p_product_id,
              (v_size_record.value->>'size_name')::TEXT,
              COALESCE((v_size_record.value->>'quantity')::INTEGER, 0),
              (v_size_record.value->>'price')::NUMERIC,
              (v_size_record.value->>'purchase_price')::NUMERIC,
              (v_size_record.value->>'barcode')::TEXT,
              COALESCE((v_size_record.value->>'is_default')::BOOLEAN, FALSE)
            );
          END LOOP;
        END IF;
      END LOOP;
    END IF;

    -- حساب إجمالي المخزون (فقط للمنتجات التي لها متغيرات)
      IF v_has_variants THEN
      -- إذا كان المنتج له متغيرات، احسب من جدول الألوان
        SELECT COALESCE(SUM(quantity), 0) INTO v_total_stock
        FROM product_colors 
        WHERE product_id = p_product_id;
        
      -- تحديث stock_quantity في جدول المنتجات ليعكس مجموع الألوان
        UPDATE products 
        SET stock_quantity = v_total_stock
        WHERE id = p_product_id;
    END IF;

    -- 5. معالجة الصور
    IF p_images IS NOT NULL THEN
      -- حذف الصور القديمة من جدول product_images
      DELETE FROM product_images WHERE product_id = p_product_id;

      -- إدراج الصور الجديدة في جدول product_images
      INSERT INTO product_images (product_id, image_url, sort_order)
      SELECT
        p_product_id,
        (value->>'image_url')::TEXT,
        (ROW_NUMBER() OVER(ORDER BY (value->>'image_url')))::INTEGER
      FROM jsonb_array_elements(p_images);

      -- تحديث حقل images في جدول products (ليس additional_images)
      UPDATE products
      SET images = (
        SELECT array_agg((value->>'image_url')::TEXT ORDER BY (value->>'image_url'))
        FROM jsonb_array_elements(p_images)
      )
      WHERE id = p_product_id;
    ELSE
      -- إذا لم يتم تمرير صور، امسح جميع الصور من جدول product_images
      DELETE FROM product_images WHERE product_id = p_product_id;

      -- امسح حقل images في جدول products
      UPDATE products
      SET images = NULL
      WHERE id = p_product_id;
    END IF;

    -- 6. معالجة أسعار الجملة
    IF p_wholesale_tiers IS NOT NULL THEN
      -- حذف أسعار الجملة القديمة
      DELETE FROM wholesale_tiers WHERE product_id = p_product_id;
      
      -- إدراج أسعار الجملة الجديدة
      INSERT INTO wholesale_tiers (product_id, organization_id, min_quantity, price)
      SELECT 
        p_product_id,
        v_product_record.organization_id,
        (value->>'min_quantity')::INTEGER,
        (value->>'price_per_unit')::NUMERIC
      FROM jsonb_array_elements(p_wholesale_tiers);
    END IF;

    -- 7. جلب القيمة الحديثة للمخزون من قاعدة البيانات
    SELECT stock_quantity INTO v_total_stock FROM products WHERE id = p_product_id;
    
    SELECT jsonb_build_object(
      'success', true,
      'product_id', p_product_id,
      'updated_at', v_product_record.updated_at,
      'total_stock', v_total_stock,
      'has_variants', v_has_variants,
      'message', 'Product updated successfully in single transaction'
    ) INTO v_result;

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- إذا حدث خطأ، سيتم rollback تلقائياً
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to update product: ' || SQLERRM
      );
  END;
END;
$$;

-- ================================================
-- تحديث لإصلاح مشكلة الصور المحذوفة
-- ================================================
-- هذا التحديث يضمن أن حقل additional_images في جدول products
-- يتم تحديثه بشكل صحيح عند حذف/إضافة الصور

-- يمكنك تشغيل هذا التحديث في Supabase SQL Editor:

-- UPDATE products SET additional_images = NULL WHERE id = 'your-product-id';

-- لتنظيف جميع المنتجات من الروابط المكسورة:
-- UPDATE products SET additional_images = NULL WHERE additional_images IS NOT NULL;