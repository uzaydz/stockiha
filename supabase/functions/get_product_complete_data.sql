CREATE OR REPLACE FUNCTION get_product_complete_data(
  p_product_identifier TEXT, -- يمكن أن يكون UUID أو slug
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
  v_product_exists BOOLEAN := FALSE;
  v_org_id UUID;
  v_product_id UUID;
  v_form_data JSON;
  v_additional_images JSON;
  v_product_colors JSON;
  v_wholesale_tiers JSON;
  v_advanced_settings JSON;
  v_marketing_settings JSON;
  v_stats JSON;
  v_is_uuid BOOLEAN;
BEGIN
  -- التحقق إذا كان المعرف UUID أم slug
  v_is_uuid := p_product_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  -- الحصول على product_id الفعلي
  IF v_is_uuid THEN
    -- إذا كان UUID، استخدمه مباشرة
    v_product_id := p_product_identifier::UUID;
  ELSE
    -- إذا كان slug، احصل على ID من الدالة الموجودة
    IF p_organization_id IS NULL THEN
      RETURN JSON_BUILD_OBJECT(
        'success', FALSE,
        'error', JSON_BUILD_OBJECT(
          'message', 'Organization ID is required when using slug',
          'code', 'MISSING_ORGANIZATION_ID',
          'timestamp', NOW()
        )
      );
    END IF;
    
    SELECT get_product_id_by_slug(p_product_identifier, p_organization_id) INTO v_product_id;
    
    IF v_product_id IS NULL THEN
      RETURN JSON_BUILD_OBJECT(
        'success', FALSE,
        'error', JSON_BUILD_OBJECT(
          'message', 'Product not found with given slug',
          'code', 'PRODUCT_NOT_FOUND',
          'timestamp', NOW()
        )
      );
    END IF;
  END IF;

  -- التحقق من وجود المنتج أولاً
  SELECT 
    EXISTS(
      SELECT 1 FROM products 
      WHERE id = v_product_id 
      AND (p_organization_id IS NULL OR organization_id = p_organization_id)
      AND (p_include_inactive = TRUE OR is_active = TRUE)
    ),
    organization_id
  INTO v_product_exists, v_org_id
  FROM products 
  WHERE id = v_product_id;

  -- إذا لم يوجد المنتج، إرجاع خطأ
  IF NOT v_product_exists THEN
    RETURN JSON_BUILD_OBJECT(
      'success', FALSE,
      'error', JSON_BUILD_OBJECT(
        'message', 'Product not found',
        'code', 'PRODUCT_NOT_FOUND',
        'timestamp', NOW()
      )
    );
  END IF;

  -- جلب النماذج (مخصص أو افتراضي)
  IF p_data_scope IN ('medium', 'full', 'ultra') THEN
    SELECT COALESCE(
      -- 1. البحث عن نموذج مخصص مرتبط بهذا المنتج
      (
        SELECT JSON_BUILD_OBJECT(
          'id', fs.id,
          'name', fs.name,
          'fields', fs.fields,
          'is_default', fs.is_default,
          'is_active', fs.is_active,
          'settings', COALESCE(fs.settings, '{}'::jsonb),
          'type', 'custom',
          'created_at', fs.created_at,
          'updated_at', fs.updated_at
        )
        FROM form_settings fs
        WHERE fs.organization_id = v_org_id
        AND fs.is_active = TRUE
        AND fs.product_ids @> JSON_BUILD_ARRAY(v_product_id::text)::jsonb
        ORDER BY fs.updated_at DESC
        LIMIT 1
      ),
      -- 2. إذا لم يوجد نموذج مخصص، جلب النموذج الافتراضي
      (
        SELECT JSON_BUILD_OBJECT(
          'id', fs.id,
          'name', fs.name,
          'fields', fs.fields,
          'is_default', fs.is_default,
          'is_active', fs.is_active,
          'settings', COALESCE(fs.settings, '{}'::jsonb),
          'type', 'default',
          'created_at', fs.created_at,
          'updated_at', fs.updated_at
        )
        FROM form_settings fs
        WHERE fs.organization_id = v_org_id
        AND fs.is_active = TRUE
        AND fs.is_default = TRUE
        ORDER BY fs.updated_at DESC
        LIMIT 1
      )
    ) INTO v_form_data;
  END IF;

  -- جلب الصور الإضافية
  IF p_data_scope IN ('medium', 'full', 'ultra') THEN
    SELECT COALESCE(
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', pi.id,
          'url', pi.image_url,
          'sort_order', pi.sort_order
        ) ORDER BY pi.sort_order
      ) FROM product_images pi WHERE pi.product_id = v_product_id),
      '[]'::json
    ) INTO v_additional_images;
  ELSE
    v_additional_images := '[]'::json;
  END IF;

  -- جلب الألوان مع المقاسات
  IF p_data_scope IN ('medium', 'full', 'ultra') THEN
    SELECT COALESCE(
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', pcol.id,
          'name', pcol.name,
          'color_code', pcol.color_code,
          'image_url', pcol.image_url,
          'quantity', pcol.quantity,
          'price', pcol.price,
          'is_default', pcol.is_default,
          'sizes', COALESCE(
            (SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', ps.id,
                'size_name', ps.size_name,
                'quantity', ps.quantity,
                'price', ps.price,
                'is_default', ps.is_default
              ) ORDER BY ps.created_at
            ) FROM product_sizes ps WHERE ps.color_id = pcol.id),
            '[]'::json
          )
        ) ORDER BY pcol.created_at
      ) FROM product_colors pcol WHERE pcol.product_id = v_product_id),
      '[]'::json
    ) INTO v_product_colors;
  ELSE
    v_product_colors := '[]'::json;
  END IF;

  -- جلب مستويات الجملة
  IF p_data_scope IN ('full', 'ultra') THEN
    SELECT COALESCE(
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', wt.id,
          'min_quantity', wt.min_quantity,
          'price', wt.price
        ) ORDER BY wt.min_quantity
      ) FROM wholesale_tiers wt WHERE wt.product_id = v_product_id),
      '[]'::json
    ) INTO v_wholesale_tiers;
  ELSE
    v_wholesale_tiers := '[]'::json;
  END IF;

  -- جلب الإعدادات المتقدمة
  IF p_data_scope = 'ultra' THEN
    SELECT JSON_BUILD_OBJECT(
      'use_custom_currency', COALESCE(pas.use_custom_currency, FALSE),
      'skip_cart', COALESCE(pas.skip_cart, TRUE)
    ) INTO v_advanced_settings
    FROM product_advanced_settings pas 
    WHERE pas.product_id = v_product_id 
    LIMIT 1;
  END IF;

  -- جلب إعدادات التسويق
  IF p_data_scope = 'ultra' THEN
    -- جلب إعدادات مؤقت العرض مع إعدادات التحويل للمؤسسة
    WITH offer_timer_data AS (
      SELECT JSONB_BUILD_OBJECT(
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
        'offer_timer_specific_page_urls', COALESCE(pms.offer_timer_specific_page_urls, ARRAY[]::text[])
      ) as timer_settings,
      -- إعدادات المراجعات والتتبع
      JSONB_BUILD_OBJECT(
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
        'test_mode', COALESCE(pms.test_mode, TRUE)
      ) as general_settings,
      -- إعدادات Pixels والتتبع المحسنة
      JSONB_BUILD_OBJECT(
        -- Facebook Pixel & Conversion API
        'facebook', JSONB_BUILD_OBJECT(
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
        'tiktok', JSONB_BUILD_OBJECT(
          'enabled', COALESCE(pms.enable_tiktok_pixel, FALSE),
          'pixel_id', pms.tiktok_pixel_id,
          'events_api_enabled', COALESCE(pms.tiktok_events_api_enabled, FALSE),
          'access_token', pms.tiktok_access_token,
          'test_event_code', pms.tiktok_test_event_code,
          'advanced_matching_enabled', COALESCE(pms.tiktok_advanced_matching_enabled, FALSE),
          'standard_events', COALESCE(pms.tiktok_standard_events, '{}'::jsonb)
        ),
        -- Google Ads & Enhanced Conversions
        'google', JSONB_BUILD_OBJECT(
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
        'snapchat', JSONB_BUILD_OBJECT(
          'enabled', COALESCE(pms.enable_snapchat_pixel, FALSE),
          'pixel_id', pms.snapchat_pixel_id,
          'events_api_enabled', COALESCE(pms.snapchat_events_api_enabled, FALSE),
          'api_token', pms.snapchat_api_token,
          'test_event_code', pms.snapchat_test_event_code,
          'advanced_matching_enabled', COALESCE(pms.snapchat_advanced_matching_enabled, FALSE),
          'standard_events', COALESCE(pms.snapchat_standard_events, '{}'::jsonb)
        ),
        -- إعدادات عامة
        'test_mode', COALESCE(pms.test_mode, TRUE)
      ) as tracking_settings,
      -- إعدادات التحويل للمؤسسة
      COALESCE(
        (SELECT JSONB_BUILD_OBJECT(
          'organization_conversion_settings', JSONB_BUILD_OBJECT(
            'facebook_app_id', ocs.facebook_app_id,
            'facebook_business_id', ocs.facebook_business_id,
            'google_measurement_id', ocs.google_measurement_id,
            'google_ads_customer_id', ocs.google_ads_customer_id,
            'google_analytics_property_id', ocs.google_analytics_property_id,
            'tiktok_app_id', ocs.tiktok_app_id,
            'default_currency_code', COALESCE(ocs.default_currency_code, 'DZD'),
            'enable_enhanced_conversions', COALESCE(ocs.enable_enhanced_conversions, FALSE)
          )
        ) FROM organization_conversion_settings ocs WHERE ocs.organization_id = v_org_id),
        '{}'::jsonb
      ) as organization_settings,
      -- 🔧 إضافة معلومات تشخيصية للتطوير
      JSONB_BUILD_OBJECT(
        'debug_info', JSONB_BUILD_OBJECT(
          'product_id', v_product_id,
          'organization_id', v_org_id,
          'pms_found', CASE WHEN pms.id IS NOT NULL THEN TRUE ELSE FALSE END,
          'ocs_found', EXISTS(SELECT 1 FROM organization_conversion_settings WHERE organization_id = v_org_id),
          'offer_timer_enabled_raw', pms.offer_timer_enabled,
          'query_timestamp', NOW()
        )
      ) as debug_info
      FROM product_marketing_settings pms 
      WHERE pms.product_id = v_product_id 
      LIMIT 1
    )
    SELECT 
      (COALESCE(timer_settings, '{}'::jsonb) || 
       COALESCE(general_settings, '{}'::jsonb) || 
       COALESCE(tracking_settings, '{}'::jsonb) ||
       COALESCE(organization_settings, '{}'::jsonb) ||
       COALESCE(debug_info, '{}'::jsonb))::json
    INTO v_marketing_settings
    FROM offer_timer_data;
    
    -- إذا لم نجد بيانات، استخدم قيم افتراضية مع معلومات تشخيصية
    IF v_marketing_settings IS NULL THEN
      v_marketing_settings := JSON_BUILD_OBJECT(
        'offer_timer_enabled', FALSE,
        'test_mode', TRUE,
        'debug_info', JSON_BUILD_OBJECT(
          'error', 'No product_marketing_settings found',
          'product_id', v_product_id,
          'query_timestamp', NOW()
        )
      );
    END IF;
  END IF;

  -- إنشاء الإحصائيات
  SELECT JSON_BUILD_OBJECT(
    'total_colors', (SELECT COUNT(*) FROM product_colors WHERE product_id = v_product_id),
    'total_sizes', (
      SELECT COUNT(*) 
      FROM product_sizes ps 
      JOIN product_colors pc ON ps.color_id = pc.id 
      WHERE pc.product_id = v_product_id
    ),
    'total_images', (SELECT COUNT(*) FROM product_images WHERE product_id = v_product_id),
    'total_wholesale_tiers', (SELECT COUNT(*) FROM wholesale_tiers WHERE product_id = v_product_id),
    'has_advanced_settings', EXISTS(SELECT 1 FROM product_advanced_settings WHERE product_id = v_product_id),
    'has_marketing_settings', EXISTS(SELECT 1 FROM product_marketing_settings WHERE product_id = v_product_id),
    'has_custom_form', v_form_data->>'type' = 'custom',
    'last_updated', NOW()
  ) INTO v_stats;

  -- بناء النتيجة النهائية
  WITH main_product AS (
    SELECT 
      p.*,
      -- معلومات الفئة
      pc.name as category_name,
      pc.slug as category_slug,
      pc.icon as category_icon,
      pc.image_url as category_image,
      -- معلومات الفئة الفرعية
      psc.name as subcategory_name,
      psc.slug as subcategory_slug,
      -- معلومات مزود الشحن
      CASE 
        WHEN p.use_shipping_clone = TRUE AND p.shipping_clone_id IS NOT NULL THEN
          JSON_BUILD_OBJECT(
            'type', 'clone',
            'id', spc.id,
            'name', spc.name,
            'original_provider', sp.name,
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
      -- معلومات القالب
      CASE 
        WHEN p.form_template_id IS NOT NULL THEN
          JSON_BUILD_OBJECT(
            'id', ot.id,
            'name', ot.name,
            'type', ot.template_type,
            'is_default', ot.is_default
          )
        ELSE NULL
      END as template_info
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    LEFT JOIN product_subcategories psc ON p.subcategory_id = psc.id
    LEFT JOIN shipping_provider_clones spc ON p.shipping_clone_id = spc.id
    LEFT JOIN shipping_providers sp ON p.shipping_provider_id = sp.id OR spc.original_provider_id = sp.id
    LEFT JOIN organization_templates ot ON p.form_template_id = ot.id
    WHERE p.id = v_product_id
  )
  SELECT 
    JSON_BUILD_OBJECT(
      'success', TRUE,
      'data_scope', p_data_scope,
      'product', JSON_BUILD_OBJECT(
        -- البيانات الأساسية (موجودة في جميع النطاقات)
        'id', mp.id,
        'name', mp.name,
        'name_for_shipping', mp.name_for_shipping,
        'description', mp.description,
        'slug', mp.slug,
        'sku', mp.sku,
        'barcode', mp.barcode,
        'brand', mp.brand,
        
        -- الأسعار
        'pricing', JSON_BUILD_OBJECT(
          'price', mp.price,
          'purchase_price', mp.purchase_price,
          'compare_at_price', mp.compare_at_price,
          'wholesale_price', mp.wholesale_price,
          'partial_wholesale_price', mp.partial_wholesale_price,
          'min_wholesale_quantity', mp.min_wholesale_quantity,
          'min_partial_wholesale_quantity', mp.min_partial_wholesale_quantity
        ),
        
        -- أنواع البيع
        'selling_options', JSON_BUILD_OBJECT(
          'allow_retail', COALESCE(mp.allow_retail, TRUE),
          'allow_wholesale', COALESCE(mp.allow_wholesale, FALSE),
          'allow_partial_wholesale', COALESCE(mp.allow_partial_wholesale, FALSE),
          'is_sold_by_unit', COALESCE(mp.is_sold_by_unit, TRUE),
          'unit_type', mp.unit_type,
          'unit_purchase_price', mp.unit_purchase_price,
          'unit_sale_price', mp.unit_sale_price
        ),

        -- المخزون
        'inventory', JSON_BUILD_OBJECT(
          'stock_quantity', mp.stock_quantity,
          'min_stock_level', COALESCE(mp.min_stock_level, 5),
          'reorder_level', COALESCE(mp.reorder_level, 10),
          'reorder_quantity', COALESCE(mp.reorder_quantity, 20),
          'last_inventory_update', mp.last_inventory_update
        ),

        -- التصنيفات
        'categories', JSON_BUILD_OBJECT(
          'category_id', mp.category_id,
          'category_name', mp.category_name,
          'category_slug', mp.category_slug,
          'category_icon', mp.category_icon,
          'category_image', mp.category_image,
          'subcategory_id', mp.subcategory_id,
          'subcategory_name', mp.subcategory_name,
          'subcategory_slug', mp.subcategory_slug
        ),

        -- الصور
        'images', JSON_BUILD_OBJECT(
          'thumbnail_image', mp.thumbnail_image,
          'additional_images', v_additional_images
        ),

        -- المتغيرات
        'variants', JSON_BUILD_OBJECT(
          'has_variants', COALESCE(mp.has_variants, FALSE),
          'use_sizes', COALESCE(mp.use_sizes, FALSE),
          'use_variant_prices', COALESCE(mp.use_variant_prices, FALSE),
          'colors', v_product_colors
        ),

        -- الميزات والمواصفات
        'features_and_specs', JSON_BUILD_OBJECT(
          'features', COALESCE(mp.features, ARRAY[]::text[]),
          'specifications', COALESCE(mp.specifications, '{}'::jsonb),
          'has_fast_shipping', COALESCE(mp.has_fast_shipping, FALSE),
          'has_money_back', COALESCE(mp.has_money_back, FALSE),
          'has_quality_guarantee', COALESCE(mp.has_quality_guarantee, FALSE),
          'fast_shipping_text', mp.fast_shipping_text,
          'money_back_text', mp.money_back_text,
          'quality_guarantee_text', mp.quality_guarantee_text
        ),

        -- حالة المنتج
        'status', JSON_BUILD_OBJECT(
          'is_active', COALESCE(mp.is_active, TRUE),
          'is_digital', mp.is_digital,
          'is_featured', COALESCE(mp.is_featured, FALSE),
          'is_new', COALESCE(mp.is_new, TRUE),
          'show_price_on_landing', COALESCE(mp.show_price_on_landing, TRUE)
        ),

        -- معلومات التنظيم
        'organization', JSON_BUILD_OBJECT(
          'organization_id', mp.organization_id,
          'created_by_user_id', mp.created_by_user_id,
          'updated_by_user_id', mp.updated_by_user_id,
          'created_at', mp.created_at,
          'updated_at', mp.updated_at
        ),

        -- الشحن والقوالب
        'shipping_and_templates', JSON_BUILD_OBJECT(
          'shipping_info', mp.shipping_info,
          'template_info', mp.template_info,
          'shipping_method_type', COALESCE(mp.shipping_method_type, 'default'),
          'use_shipping_clone', COALESCE(mp.use_shipping_clone, FALSE)
        ),

        -- النماذج (مخصص أو افتراضي) 🆕
        'form_data', CASE WHEN p_data_scope IN ('medium', 'full', 'ultra') 
          THEN v_form_data ELSE NULL END,

        -- بيانات متقدمة (حسب النطاق)
        'wholesale_tiers', v_wholesale_tiers,
        'advanced_settings', v_advanced_settings,
        'marketing_settings', v_marketing_settings,

        -- إعدادات صفحة الشراء
        'purchase_page_config', CASE WHEN p_data_scope IN ('full', 'ultra') 
          THEN mp.purchase_page_config ELSE NULL END,

        -- العروض الخاصة
        'special_offers_config', CASE WHEN p_data_scope IN ('full', 'ultra') 
          THEN mp.special_offers_config ELSE NULL END
      ),
      
      -- الإحصائيات
      'stats', v_stats,
      
      -- معلومات إضافية
      'meta', JSON_BUILD_OBJECT(
        'query_timestamp', NOW(),
        'data_freshness', 'real_time',
        'performance_optimized', TRUE,
        'organization_id', v_org_id,
        'form_strategy', CASE 
          WHEN v_form_data->>'type' = 'custom' THEN 'custom_form_found'
          WHEN v_form_data->>'type' = 'default' THEN 'default_form_used'
          ELSE 'no_form_available'
        END
      )
    )
  INTO v_result
  FROM main_product mp;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- في حالة حدوث خطأ، إرجاع معلومات الخطأ
    RETURN JSON_BUILD_OBJECT(
      'success', FALSE,
      'error', JSON_BUILD_OBJECT(
        'message', SQLERRM,
        'code', SQLSTATE,
        'timestamp', NOW()
      )
    );
END;
$$; 