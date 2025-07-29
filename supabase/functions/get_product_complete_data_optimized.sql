CREATE OR REPLACE FUNCTION get_product_complete_data_optimized(
  p_product_identifier TEXT,
  p_organization_id UUID DEFAULT NULL,
  p_include_inactive BOOLEAN DEFAULT FALSE,
  p_data_scope TEXT DEFAULT 'full' -- 'basic', 'medium', 'full', 'ultra'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_product_id UUID;
  v_org_id UUID;
  v_is_uuid BOOLEAN;
BEGIN
  -- 🚀 تحسين 1: التحقق من صحة UUID مرة واحدة
  v_is_uuid := p_product_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  IF v_is_uuid THEN
    v_product_id := p_product_identifier::UUID;
  ELSE
    -- إذا كان slug، استخدم الفهرس المحسن
    IF p_organization_id IS NULL THEN
      RETURN JSON_BUILD_OBJECT(
        'success', FALSE,
        'error', JSON_BUILD_OBJECT(
          'message', 'Organization ID is required when using slug',
          'code', 'MISSING_ORGANIZATION_ID'
        )
      );
    END IF;
    
    SELECT id INTO v_product_id 
    FROM products 
    WHERE slug = p_product_identifier 
      AND organization_id = p_organization_id 
      AND is_active = TRUE;
      
    IF v_product_id IS NULL THEN
      RETURN JSON_BUILD_OBJECT(
        'success', FALSE,
        'error', JSON_BUILD_OBJECT(
          'message', 'Product not found',
          'code', 'PRODUCT_NOT_FOUND'
        )
      );
    END IF;
  END IF;

  -- 🚀 تحسين 2: استعلام موحد للحصول على جميع البيانات
  WITH product_complete AS (
    SELECT 
      -- البيانات الأساسية للمنتج
      p.*,
      o.name as org_name,
      o.domain as org_domain,
      
      -- معلومات الفئات مع الفهارس
      pc.name as category_name,
      pc.slug as category_slug,
      pc.icon as category_icon,
      psc.name as subcategory_name,
      psc.slug as subcategory_slug,
      
      -- إعدادات الشحن المُجمعة
      CASE 
        WHEN p.use_shipping_clone = TRUE AND p.shipping_clone_id IS NOT NULL THEN
          JSON_BUILD_OBJECT(
            'type', 'clone',
            'id', spc.id,
            'name', spc.name,
            'unified_price', spc.use_unified_price,
            'home_price', spc.unified_home_price,
            'desk_price', spc.unified_desk_price
          )
        WHEN p.shipping_provider_id IS NOT NULL THEN
          JSON_BUILD_OBJECT(
            'type', 'provider',
            'id', sp.id,
            'name', sp.name,
            'code', sp.code
          )
        ELSE NULL
      END as shipping_info,
      
      -- 🚀 تحسين 3: جلب الألوان والأحجام في استعلام واحد مع LATERAL JOIN
      CASE WHEN p_data_scope IN ('medium', 'full', 'ultra') THEN
        COALESCE(
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', colors_with_sizes.id,
              'name', colors_with_sizes.name,
              'color_code', colors_with_sizes.color_code,
              'image_url', colors_with_sizes.image_url,
              'quantity', colors_with_sizes.quantity,
              'price', colors_with_sizes.price,
              'is_default', colors_with_sizes.is_default,
              'sizes', colors_with_sizes.sizes_data
            ) ORDER BY colors_with_sizes.is_default DESC, colors_with_sizes.created_at
          )
          FROM (
            SELECT 
              pcol.*,
              COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', ps.id,
                    'size_name', ps.size_name,
                    'quantity', ps.quantity,
                    'price', ps.price,
                    'is_default', ps.is_default
                  ) ORDER BY ps.is_default DESC, ps.created_at
                ) FILTER (WHERE ps.id IS NOT NULL),
                '[]'::json
              ) as sizes_data
            FROM product_colors pcol
            LEFT JOIN product_sizes ps ON ps.color_id = pcol.id
            WHERE pcol.product_id = v_product_id
            GROUP BY pcol.id, pcol.name, pcol.color_code, pcol.image_url, 
                     pcol.quantity, pcol.price, pcol.is_default, pcol.created_at
          ) colors_with_sizes),
          '[]'::json
        )
      ELSE '[]'::json
      END as colors_data,
      
      -- 🚀 تحسين 4: الصور المُحسنة
      CASE WHEN p_data_scope IN ('medium', 'full', 'ultra') THEN
        COALESCE(
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', pi.id,
              'url', pi.image_url,
              'sort_order', pi.sort_order
            ) ORDER BY pi.sort_order
          ) FROM product_images pi WHERE pi.product_id = v_product_id),
          '[]'::json
        )
      ELSE '[]'::json
      END as images_data,
      
      -- 🚀 تحسين 5: النماذج المُحسنة مع أولوية مخصص > افتراضي
      CASE WHEN p_data_scope IN ('medium', 'full', 'ultra') THEN
        COALESCE(
          (SELECT JSON_BUILD_OBJECT(
            'id', fs.id,
            'name', fs.name,
            'fields', fs.fields,
            'is_default', fs.is_default,
            'is_active', fs.is_active,
            'settings', COALESCE(fs.settings, '{}'::jsonb),
            'type', CASE 
              WHEN fs.product_ids @> JSON_BUILD_ARRAY(v_product_id::text)::jsonb THEN 'custom'
              ELSE 'default'
            END
          )
          FROM form_settings fs
          WHERE fs.organization_id = p.organization_id
            AND fs.is_active = TRUE
            AND (
              fs.product_ids @> JSON_BUILD_ARRAY(v_product_id::text)::jsonb OR
              fs.is_default = TRUE
            )
          ORDER BY 
            (fs.product_ids @> JSON_BUILD_ARRAY(v_product_id::text)::jsonb) DESC,
            fs.is_default DESC,
            fs.updated_at DESC
          LIMIT 1),
          NULL
        )
      ELSE NULL
      END as form_data,
      
      -- 🚀 تحسين 6: الإعدادات المتقدمة المُجمعة (فقط للنطاق ultra)
      CASE WHEN p_data_scope = 'ultra' THEN
        (SELECT JSON_BUILD_OBJECT(
          'advanced_settings', JSON_BUILD_OBJECT(
            'use_custom_currency', COALESCE(pas.use_custom_currency, FALSE),
            'skip_cart', COALESCE(pas.skip_cart, TRUE)
          ),
          'marketing_settings', JSON_BUILD_OBJECT(
            -- مؤقت العرض
            'offer_timer_enabled', COALESCE(pms.offer_timer_enabled, FALSE),
            'offer_timer_title', pms.offer_timer_title,
            'offer_timer_type', pms.offer_timer_type,
            'offer_timer_end_date', pms.offer_timer_end_date,
            'offer_timer_duration_minutes', pms.offer_timer_duration_minutes,
            'offer_timer_display_style', pms.offer_timer_display_style,
            'offer_timer_text_above', pms.offer_timer_text_above,
            'offer_timer_text_below', pms.offer_timer_text_below,
            'offer_timer_end_action', pms.offer_timer_end_action,
            'offer_timer_end_action_url', pms.offer_timer_end_action_url,
            'offer_timer_end_action_message', pms.offer_timer_end_action_message,
            'offer_timer_restart_for_new_session', COALESCE(pms.offer_timer_restart_for_new_session, FALSE),
            'offer_timer_cookie_duration_days', pms.offer_timer_cookie_duration_days,
            'offer_timer_show_on_specific_pages_only', COALESCE(pms.offer_timer_show_on_specific_pages_only, FALSE),
            'offer_timer_specific_page_urls', COALESCE(pms.offer_timer_specific_page_urls, ARRAY[]::text[]),
            
            -- إعدادات المراجعات
            'enable_reviews', COALESCE(pms.enable_reviews, TRUE),
            'reviews_verify_purchase', COALESCE(pms.reviews_verify_purchase, FALSE),
            'reviews_auto_approve', COALESCE(pms.reviews_auto_approve, TRUE),
            'allow_images_in_reviews', COALESCE(pms.allow_images_in_reviews, TRUE),
            'enable_review_replies', COALESCE(pms.enable_review_replies, TRUE),
            'review_display_style', COALESCE(pms.review_display_style, 'stars_summary'),
            'enable_fake_star_ratings', COALESCE(pms.enable_fake_star_ratings, FALSE),
            'fake_star_rating_value', pms.fake_star_rating_value,
            'fake_star_rating_count', pms.fake_star_rating_count,
            'enable_fake_purchase_counter', COALESCE(pms.enable_fake_purchase_counter, FALSE),
            'fake_purchase_count', pms.fake_purchase_count,
            'test_mode', COALESCE(pms.test_mode, TRUE),
            
            -- Facebook Pixel & Conversion API
            'facebook', JSON_BUILD_OBJECT(
              'enabled', COALESCE(pms.enable_facebook_pixel, FALSE),
              'pixel_id', pms.facebook_pixel_id,
              'conversion_api_enabled', COALESCE(pms.enable_facebook_conversion_api, FALSE),
              'access_token', pms.facebook_access_token,
              'test_event_code', pms.facebook_test_event_code,
              'advanced_matching_enabled', COALESCE(pms.facebook_advanced_matching_enabled, FALSE),
              'standard_events', COALESCE(pms.facebook_standard_events, '{}'::jsonb),
              'dataset_id', pms.facebook_dataset_id
            ),
            
            -- TikTok Pixel & Events API
            'tiktok', JSON_BUILD_OBJECT(
              'enabled', COALESCE(pms.enable_tiktok_pixel, FALSE),
              'pixel_id', pms.tiktok_pixel_id,
              'events_api_enabled', COALESCE(pms.tiktok_events_api_enabled, FALSE),
              'access_token', pms.tiktok_access_token,
              'test_event_code', pms.tiktok_test_event_code,
              'advanced_matching_enabled', COALESCE(pms.tiktok_advanced_matching_enabled, FALSE),
              'standard_events', COALESCE(pms.tiktok_standard_events, '{}'::jsonb)
            ),
            
            -- Google Ads & Enhanced Conversions
            'google', JSON_BUILD_OBJECT(
              'enabled', COALESCE(pms.enable_google_ads_tracking, FALSE),
              'gtag_id', pms.google_gtag_id,
              'ads_conversion_id', pms.google_ads_conversion_id,
              'ads_conversion_label', pms.google_ads_conversion_label,
              'enhanced_conversions_enabled', COALESCE(pms.google_ads_enhanced_conversions_enabled, FALSE),
              'global_site_tag_enabled', COALESCE(pms.google_ads_global_site_tag_enabled, FALSE),
              'event_snippets', COALESCE(pms.google_ads_event_snippets, '{}'::jsonb),
              'phone_conversion_number', pms.google_ads_phone_conversion_number,
              'phone_conversion_label', pms.google_ads_phone_conversion_label
            ),
            
            -- Snapchat Pixel & Events API
            'snapchat', JSON_BUILD_OBJECT(
              'enabled', COALESCE(pms.enable_snapchat_pixel, FALSE),
              'pixel_id', pms.snapchat_pixel_id,
              'events_api_enabled', COALESCE(pms.snapchat_events_api_enabled, FALSE),
              'api_token', pms.snapchat_api_token,
              'test_event_code', pms.snapchat_test_event_code,
              'advanced_matching_enabled', COALESCE(pms.snapchat_advanced_matching_enabled, FALSE),
              'standard_events', COALESCE(pms.snapchat_standard_events, '{}'::jsonb)
            )
          ),
          'wholesale_tiers', COALESCE(
            (SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', wt.id,
                'min_quantity', wt.min_quantity,
                'price', wt.price
              ) ORDER BY wt.min_quantity
            ) FROM wholesale_tiers wt WHERE wt.product_id = v_product_id),
            '[]'::json
          ),
          -- إعدادات التحويل للمؤسسة
          'organization_conversion_settings', COALESCE(
            (SELECT JSON_BUILD_OBJECT(
              'facebook_app_id', ocs.facebook_app_id,
              'facebook_business_id', ocs.facebook_business_id,
              'google_measurement_id', ocs.google_measurement_id,
              'google_ads_customer_id', ocs.google_ads_customer_id,
              'google_analytics_property_id', ocs.google_analytics_property_id,
              'tiktok_app_id', ocs.tiktok_app_id,
              'default_currency_code', COALESCE(ocs.default_currency_code, 'DZD'),
              'enable_enhanced_conversions', COALESCE(ocs.enable_enhanced_conversions, FALSE)
            ) FROM organization_conversion_settings ocs WHERE ocs.organization_id = p.organization_id),
            '{}'::json
          )
        )
        FROM product_advanced_settings pas
        FULL OUTER JOIN product_marketing_settings pms ON pms.product_id = pas.product_id
        WHERE pas.product_id = v_product_id OR pms.product_id = v_product_id
        LIMIT 1)
      ELSE NULL
      END as extended_settings
      
    FROM products p
    LEFT JOIN organizations o ON p.organization_id = o.id
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    LEFT JOIN product_subcategories psc ON p.subcategory_id = psc.id
    LEFT JOIN shipping_provider_clones spc ON p.shipping_clone_id = spc.id
    LEFT JOIN shipping_providers sp ON p.shipping_provider_id = sp.id OR spc.original_provider_id = sp.id
    WHERE p.id = v_product_id
      AND (p_organization_id IS NULL OR p.organization_id = p_organization_id)
      AND (p_include_inactive = TRUE OR p.is_active = TRUE)
  )
  
  -- 🚀 تحسين 7: بناء النتيجة مرة واحدة
  SELECT JSON_BUILD_OBJECT(
    'success', TRUE,
    'data_scope', p_data_scope,
    'performance_info', JSON_BUILD_OBJECT(
      'optimized', TRUE,
      'version', '2.0',
      'single_query', TRUE
    ),
    'product', JSON_BUILD_OBJECT(
      -- البيانات الأساسية
      'id', pc.id,
      'name', pc.name,
      'description', pc.description,
      'slug', pc.slug,
      'sku', pc.sku,
      'price', pc.price,
      'stock_quantity', pc.stock_quantity,
      'thumbnail_image', pc.thumbnail_image,
      'is_active', pc.is_active,
      'has_variants', pc.has_variants,
      'use_sizes', pc.use_sizes,
      
      -- التصنيفات
      'category', JSON_BUILD_OBJECT(
        'id', pc.category_id,
        'name', pc.category_name,
        'slug', pc.category_slug,
        'icon', pc.category_icon
      ),
      
      -- المعلومات التنظيمية
      'organization', JSON_BUILD_OBJECT(
        'id', pc.organization_id,
        'name', pc.org_name,
        'domain', pc.org_domain
      ),
      
      -- الصور
      'images', JSON_BUILD_OBJECT(
        'thumbnail_image', pc.thumbnail_image,
        'additional_images', pc.images_data
      ),
      
      -- المتغيرات  
      'variants', JSON_BUILD_OBJECT(
        'has_variants', COALESCE(pc.has_variants, FALSE),
        'use_sizes', COALESCE(pc.use_sizes, FALSE),
        'use_variant_prices', COALESCE(pc.use_variant_prices, FALSE),
        'colors', pc.colors_data
      ),
      
      'form_data', pc.form_data,
      
      -- الشحن والقوالب
      'shipping_and_templates', JSON_BUILD_OBJECT(
        'shipping_info', pc.shipping_info,
        'template_info', NULL, -- يمكن إضافته لاحقاً إذا احتجنا إليه
        'shipping_method_type', COALESCE(pc.shipping_method_type, 'default'),
        'use_shipping_clone', COALESCE(pc.use_shipping_clone, FALSE),
        'shipping_provider_id', pc.shipping_provider_id,
        'shipping_clone_id', pc.shipping_clone_id
      ),
      
      -- معلومات إضافية مفقودة من الدالة الأصلية
      'pricing', JSON_BUILD_OBJECT(
        'price', pc.price,
        'purchase_price', pc.purchase_price,
        'compare_at_price', pc.compare_at_price,
        'wholesale_price', pc.wholesale_price,
        'partial_wholesale_price', pc.partial_wholesale_price,
        'min_wholesale_quantity', pc.min_wholesale_quantity,
        'min_partial_wholesale_quantity', pc.min_partial_wholesale_quantity
      ),
      
      'selling_options', JSON_BUILD_OBJECT(
        'allow_retail', COALESCE(pc.allow_retail, TRUE),
        'allow_wholesale', COALESCE(pc.allow_wholesale, FALSE),
        'allow_partial_wholesale', COALESCE(pc.allow_partial_wholesale, FALSE),
        'is_sold_by_unit', COALESCE(pc.is_sold_by_unit, TRUE),
        'unit_type', pc.unit_type,
        'unit_purchase_price', pc.unit_purchase_price,
        'unit_sale_price', pc.unit_sale_price
      ),
      
      'inventory', JSON_BUILD_OBJECT(
        'stock_quantity', pc.stock_quantity,
        'min_stock_level', COALESCE(pc.min_stock_level, 5),
        'reorder_level', COALESCE(pc.reorder_level, 10),
        'reorder_quantity', COALESCE(pc.reorder_quantity, 20),
        'last_inventory_update', pc.last_inventory_update
      ),
      
      'features_and_specs', JSON_BUILD_OBJECT(
        'features', COALESCE(pc.features, ARRAY[]::text[]),
        'specifications', COALESCE(pc.specifications, '{}'::jsonb),
        'has_fast_shipping', COALESCE(pc.has_fast_shipping, FALSE),
        'has_money_back', COALESCE(pc.has_money_back, FALSE),
        'has_quality_guarantee', COALESCE(pc.has_quality_guarantee, FALSE),
        'fast_shipping_text', pc.fast_shipping_text,
        'money_back_text', pc.money_back_text,
        'quality_guarantee_text', pc.quality_guarantee_text
      ),
      
      'status', JSON_BUILD_OBJECT(
        'is_active', COALESCE(pc.is_active, TRUE),
        'is_digital', pc.is_digital,
        'is_featured', COALESCE(pc.is_featured, FALSE),
        'is_new', COALESCE(pc.is_new, TRUE),
        'show_price_on_landing', COALESCE(pc.show_price_on_landing, TRUE)
      ),
      
      'timestamps', JSON_BUILD_OBJECT(
        'created_at', pc.created_at,
        'updated_at', pc.updated_at,
        'created_by_user_id', pc.created_by_user_id,
        'updated_by_user_id', pc.updated_by_user_id
      ),
      
      -- إعدادات صفحة الشراء والعروض الخاصة
      'purchase_page_config', CASE WHEN p_data_scope IN ('full', 'ultra') 
        THEN pc.purchase_page_config ELSE NULL END,
      'special_offers_config', CASE WHEN p_data_scope IN ('full', 'ultra') 
        THEN pc.special_offers_config ELSE NULL END,

      -- الإعدادات المتقدمة (ultra فقط)
      'extended', pc.extended_settings
    ),
    
    -- الإحصائيات
    'stats', JSON_BUILD_OBJECT(
      'total_colors', COALESCE(ARRAY_LENGTH(STRING_TO_ARRAY(pc.colors_data::text, '"id"'), 1) - 1, 0),
      'total_images', COALESCE(ARRAY_LENGTH(STRING_TO_ARRAY(pc.images_data::text, '"id"'), 1) - 1, 0),
      'has_advanced_settings', pc.extended_settings IS NOT NULL,
      'has_marketing_settings', pc.extended_settings IS NOT NULL,
      'has_custom_form', pc.form_data->>'type' = 'custom',
      'last_updated', NOW()
    ),
    
    'metadata', JSON_BUILD_OBJECT(
      'query_timestamp', NOW(),
      'execution_time_optimized', TRUE,
      'data_freshness', 'real_time',
      'performance_optimized', TRUE,
      'form_strategy', CASE 
        WHEN pc.form_data->>'type' = 'custom' THEN 'custom_form_found'
        WHEN pc.form_data->>'type' = 'default' THEN 'default_form_used'
        ELSE 'no_form_available'
      END
    )
  ) INTO v_result
  FROM product_complete pc;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
      'success', FALSE,
      'error', JSON_BUILD_OBJECT(
        'message', SQLERRM,
        'code', SQLSTATE,
        'optimized_version', TRUE
      )
    );
END;
$$; 