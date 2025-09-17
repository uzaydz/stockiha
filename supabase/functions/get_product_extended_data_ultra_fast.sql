-- 🚀 دالة البيانات المتقدمة فائقة السرعة
-- هذه الدالة تجلب البيانات المتقدمة للمنتج (التسويق، النماذج، الإعدادات)
-- مخصصة لصفحات تفاصيل المنتج والإعدادات المتقدمة
-- محسنة للسرعة ولا تكرر البيانات الأساسية

-- 📋 تعليمات التطبيق:
-- 1. انسخ محتوى هذا الملف
-- 2. اذهب إلى Supabase Dashboard > SQL Editor
-- 3. الصق المحتوى وشغل الاستعلام
-- 4. هذه الدالة تجلب البيانات المتقدمة فقط
-- 5. للبيانات الأساسية استخدم get_product_basic_data_ultra_fast

CREATE OR REPLACE FUNCTION get_product_extended_data_ultra_fast(
  p_product_id UUID,
  p_include_large_images BOOLEAN DEFAULT FALSE, -- تحكم في تحميل الصور الضخمة
  p_include_marketing_data BOOLEAN DEFAULT TRUE, -- تحكم في تحميل بيانات التسويق
  p_include_form_data BOOLEAN DEFAULT TRUE, -- تحكم في تحميل بيانات النماذج
  p_include_advanced_settings BOOLEAN DEFAULT TRUE, -- تحكم في تحميل الإعدادات المتقدمة
  p_data_detail_level TEXT DEFAULT 'full' -- 'standard', 'full', 'ultra'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET work_mem = '256MB' -- 🔥 تحسين: ذاكرة أكبر للبيانات المتقدمة
AS $$
DECLARE
  v_result JSON;
  v_start_time TIMESTAMP;
  v_product_data RECORD;
  v_product_exists BOOLEAN;
BEGIN
  -- 🚀 تحسين 1: قياس زمن التنفيذ
  v_start_time := clock_timestamp();
  
  -- 🚀 تحسين 2: التحقق من وجود المنتج أولاً (استعلام سريع)
  SELECT EXISTS(SELECT 1 FROM products WHERE id = p_product_id) INTO v_product_exists;
  
  IF NOT v_product_exists THEN
    RETURN JSON_BUILD_OBJECT(
      'success', FALSE,
      'error', JSON_BUILD_OBJECT(
        'message', 'Product not found',
        'code', 'PRODUCT_NOT_FOUND'
      )
    );
  END IF;

  -- 🚀 تحسين 3: استعلام متقدم محسن للبيانات المتخصصة
  SELECT 
    -- البيانات الأساسية للمراجع فقط (بدون تكرار)
    p.id, p.organization_id, p.has_variants, p.use_sizes,
    
    -- البيانات المتقدمة الثقيلة
    CASE WHEN p_data_detail_level IN ('full', 'ultra') THEN p.features ELSE NULL END AS features,
    CASE WHEN p_data_detail_level IN ('full', 'ultra') THEN p.specifications ELSE NULL END AS specifications,
    CASE WHEN p_data_detail_level IN ('full', 'ultra') THEN p.purchase_page_config ELSE NULL END AS purchase_page_config,
    CASE WHEN p_data_detail_level IN ('full', 'ultra') THEN p.special_offers_config ELSE NULL END AS special_offers_config,
    
    -- النصوص المتقدمة
    p.fast_shipping_text, p.money_back_text, p.quality_guarantee_text,
    
    -- بيانات الشحن المتقدمة
    p.shipping_provider_id, p.shipping_clone_id,
    
    -- بيانات التسعير المتقدمة
    p.partial_wholesale_price, p.min_wholesale_quantity, p.min_partial_wholesale_quantity,
    p.allow_partial_wholesale, p.unit_type, p.unit_purchase_price, p.unit_sale_price,
    
    -- بيانات المخزون المتقدمة
    p.reorder_level, p.reorder_quantity,
    
    -- 🚀 تحسين 4: LATERAL JOIN للشحن المتقدم
    sp_info.shipping_extended_data,
    
    -- 🚀 تحسين 5: LATERAL JOIN للألوان المتقدمة (مع الصور)
    CASE 
      WHEN p.has_variants = TRUE THEN colors_extended_info.colors_extended_data
      ELSE '[]'::json
    END as colors_extended_data,
    
    -- 🚀 تحسين 6: LATERAL JOIN للصور المتقدمة
    images_extended_info.images_extended_data,
    
    -- 🚀 تحسين 7: LATERAL JOIN للنماذج المتقدمة
    CASE
      WHEN p_include_form_data = TRUE THEN form_extended_info.form_extended_data
      ELSE NULL
    END as form_extended_data,
    
    -- 🚀 تحسين 8: LATERAL JOIN للإعدادات المتقدمة
    CASE 
      WHEN p_include_advanced_settings = TRUE THEN advanced_extended_info.advanced_extended_data
      ELSE NULL
    END as advanced_extended_data,
    
    -- 🚀 تحسين 9: LATERAL JOIN لبيانات التسويق المتقدمة
    CASE 
      WHEN p_include_marketing_data = TRUE THEN marketing_extended_info.marketing_extended_data
      ELSE NULL
    END as marketing_extended_data
    
  INTO v_product_data
  FROM products p
  
  -- 🔥 تحسين 10: LATERAL JOIN للشحن المتقدم (مع التفاصيل الكاملة)
  LEFT JOIN LATERAL (
    SELECT JSON_BUILD_OBJECT(
      'shipping_provider', CASE
        WHEN p.shipping_provider_id IS NOT NULL THEN
          JSON_BUILD_OBJECT(
            'id', sp.id,
            'name', sp.name,
            'code', sp.code
          )
        ELSE NULL
      END,
      'shipping_clone', CASE
        WHEN p.use_shipping_clone = TRUE AND p.shipping_clone_id IS NOT NULL THEN
          JSON_BUILD_OBJECT(
            'id', spc.id,
            'name', spc.name,
            'original_provider_id', spc.original_provider_id,
            'organization_id', spc.organization_id,
            'use_unified_price', spc.use_unified_price,
            'unified_home_price', spc.unified_home_price,
            'unified_desk_price', spc.unified_desk_price
          )
        ELSE NULL
      END
    ) as shipping_extended_data
    FROM shipping_providers sp, shipping_provider_clones spc
    WHERE sp.id = p.shipping_provider_id 
       OR spc.id = p.shipping_clone_id
    LIMIT 1
  ) sp_info ON TRUE
  
  -- 🔥 تحسين 11: LATERAL JOIN للألوان المتقدمة (مع الصور والأحجام)
  LEFT JOIN LATERAL (
    SELECT JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', pcol.id,
        'name', pcol.name,
        'color_code', pcol.color_code,
        'quantity', pcol.quantity,
        'price', pcol.price,
        'is_default', pcol.is_default,
        -- 🚀 تحسين: تحكم ذكي في تحميل الصور
        'image_url', CASE
          WHEN p_include_large_images = TRUE THEN pcol.image_url
          WHEN pcol.image_url IS NULL OR length(pcol.image_url) = 0 THEN NULL
          WHEN length(pcol.image_url) <= 100000 THEN pcol.image_url -- 100KB كحد أقصى
          ELSE NULL
        END,
        'image_metadata', JSON_BUILD_OBJECT(
          'has_image', CASE WHEN pcol.image_url IS NOT NULL AND length(pcol.image_url) > 0 THEN TRUE ELSE FALSE END,
          'image_size_bytes', CASE WHEN pcol.image_url IS NOT NULL THEN length(pcol.image_url) ELSE 0 END,
          'is_large_image', CASE WHEN pcol.image_url IS NOT NULL AND length(pcol.image_url) > 100000 THEN TRUE ELSE FALSE END,
          'image_type', CASE
            WHEN pcol.image_url LIKE 'data:image/%' THEN 'base64'
            WHEN pcol.image_url LIKE 'http%' THEN 'url'
            ELSE 'unknown'
          END
        ),
        -- الأحجام المتقدمة
        'sizes', CASE
          WHEN p.use_sizes = TRUE THEN (
            SELECT COALESCE(JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', ps.id,
                'size_name', ps.size_name,
                'quantity', ps.quantity,
                'price', ps.price,
                'is_default', ps.is_default
              ) ORDER BY ps.is_default DESC NULLS LAST, ps.id
            ), '[]'::json)
            FROM product_sizes ps WHERE ps.color_id = pcol.id
          )
          ELSE '[]'::json
        END
      ) ORDER BY pcol.is_default DESC NULLS LAST, pcol.id
    ) as colors_extended_data
    FROM product_colors pcol
    WHERE pcol.product_id = p.id
    LIMIT 20 -- 🔥 تحسين: زيادة العدد للبيانات المتقدمة
  ) colors_extended_info ON p.has_variants = TRUE
  
  -- 🔥 تحسين 12: LATERAL JOIN للصور المتقدمة
  LEFT JOIN LATERAL (
    SELECT JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', pi.id,
        'url', CASE
          WHEN p_include_large_images = TRUE THEN pi.image_url
          WHEN pi.image_url IS NULL OR length(pi.image_url) = 0 THEN NULL
          WHEN length(pi.image_url) <= 100000 THEN pi.image_url
          ELSE NULL
        END,
        'sort_order', COALESCE(pi.sort_order, 999),
        'image_metadata', JSON_BUILD_OBJECT(
          'size_bytes', CASE WHEN pi.image_url IS NOT NULL THEN length(pi.image_url) ELSE 0 END,
          'is_large_image', CASE WHEN pi.image_url IS NOT NULL AND length(pi.image_url) > 100000 THEN TRUE ELSE FALSE END,
          'image_type', CASE
            WHEN pi.image_url LIKE 'data:image/%' THEN 'base64'
            WHEN pi.image_url LIKE 'http%' THEN 'url'
            ELSE 'unknown'
          END
        )
      ) ORDER BY pi.sort_order NULLS LAST, pi.id
    ) as images_extended_data
    FROM product_images pi
    WHERE pi.product_id = p.id
    LIMIT 15 -- 🔥 تحسين: زيادة العدد للبيانات المتقدمة
  ) images_extended_info ON TRUE
  
  -- 🔥 تحسين 13: LATERAL JOIN للنماذج المتقدمة
  LEFT JOIN LATERAL (
    SELECT JSON_BUILD_OBJECT(
      'custom_form', (
        SELECT JSON_BUILD_OBJECT(
          'id', fs.id,
          'name', fs.name,
          'fields', fs.fields,
          'is_active', fs.is_active,
          'created_at', fs.created_at,
          'updated_at', fs.updated_at,
          'type', 'custom'
        )
        FROM form_settings fs
        WHERE fs.organization_id = p.organization_id
          AND fs.is_active = TRUE
          AND fs.product_ids @> JSON_BUILD_ARRAY(p.id::text)::jsonb
        ORDER BY fs.updated_at DESC
        LIMIT 1
      ),
      'default_form', (
        SELECT JSON_BUILD_OBJECT(
          'id', fs.id,
          'name', fs.name,
          'fields', fs.fields,
          'is_active', fs.is_active,
          'created_at', fs.created_at,
          'updated_at', fs.updated_at,
          'type', 'default'
        )
        FROM form_settings fs
        WHERE fs.organization_id = p.organization_id
          AND fs.is_active = TRUE
          AND fs.is_default = TRUE
        ORDER BY fs.updated_at DESC
        LIMIT 1
      ),
      'organization_forms', (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', fs.id,
            'name', fs.name,
            'is_default', fs.is_default,
            'is_active', fs.is_active,
            'product_count', CASE
              WHEN fs.product_ids IS NOT NULL
              THEN (SELECT COUNT(*) FROM JSON_ARRAY_ELEMENTS(fs.product_ids::json))
              ELSE 0
            END
          ) ORDER BY fs.is_default DESC, fs.updated_at DESC
        )
        FROM form_settings fs
        WHERE fs.organization_id = p.organization_id
          AND fs.is_active = TRUE
        LIMIT 5
      )
    ) as form_extended_data
  ) form_extended_info ON p_include_form_data = TRUE
  
  -- 🔥 تحسين 14: LATERAL JOIN للإعدادات المتقدمة
  LEFT JOIN LATERAL (
    SELECT JSON_BUILD_OBJECT(
      'product_advanced_settings', COALESCE((
        SELECT JSON_BUILD_OBJECT(
          'use_custom_currency', COALESCE(pas.use_custom_currency, FALSE),
          'skip_cart', COALESCE(pas.skip_cart, TRUE)
        )
        FROM product_advanced_settings pas
        WHERE pas.product_id = p.id
        LIMIT 1
      ), '{}'::json),
      'wholesale_tiers', (
        SELECT COALESCE(JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', wt.id,
            'min_quantity', wt.min_quantity,
            'price', wt.price,
            'created_at', wt.created_at,
            'updated_at', wt.updated_at
          ) ORDER BY wt.min_quantity
        ), '[]'::json)
        FROM wholesale_tiers wt 
        WHERE wt.product_id = p.id 
        LIMIT 10
      ),
      'product_bundles', '[]'::json
    ) as advanced_extended_data
  ) advanced_extended_info ON p_include_advanced_settings = TRUE
  
  -- 🔥 تحسين 15: LATERAL JOIN لبيانات التسويق المتقدمة
  LEFT JOIN LATERAL (
    SELECT JSON_BUILD_OBJECT(
      'marketing_settings', COALESCE((
        SELECT JSON_BUILD_OBJECT(
            'offer_timer_enabled', COALESCE(pms.offer_timer_enabled, FALSE),
            'offer_timer_title', pms.offer_timer_title,
            'offer_timer_type', pms.offer_timer_type,
            'offer_timer_end_date', pms.offer_timer_end_date,
            'enable_reviews', COALESCE(pms.enable_reviews, TRUE),
            'reviews_verify_purchase', COALESCE(pms.reviews_verify_purchase, FALSE),
            'reviews_auto_approve', COALESCE(pms.reviews_auto_approve, TRUE),
            'test_mode', COALESCE(pms.test_mode, TRUE),
            'facebook', JSON_BUILD_OBJECT(
              'enabled', COALESCE(pms.enable_facebook_pixel, FALSE),
              'pixel_id', pms.facebook_pixel_id,
              'conversion_api_enabled', COALESCE(pms.enable_facebook_conversion_api, FALSE),
              'access_token', pms.facebook_access_token,
              'test_event_code', pms.facebook_test_event_code,
              'dataset_id', pms.facebook_dataset_id,
              'advanced_matching_enabled', COALESCE(pms.facebook_advanced_matching_enabled, FALSE)
            ),
            'tiktok', JSON_BUILD_OBJECT(
              'enabled', COALESCE(pms.enable_tiktok_pixel, FALSE),
              'pixel_id', pms.tiktok_pixel_id,
              'events_api_enabled', COALESCE(pms.tiktok_events_api_enabled, FALSE),
              'access_token', pms.tiktok_access_token,
              'test_event_code', pms.tiktok_test_event_code,
              'advanced_matching_enabled', COALESCE(pms.tiktok_advanced_matching_enabled, FALSE)
            ),
            'google', JSON_BUILD_OBJECT(
              'enabled', COALESCE(pms.enable_google_ads_tracking, FALSE),
              'gtag_id', pms.google_gtag_id,
              'ads_conversion_id', pms.google_ads_conversion_id,
              'ads_conversion_label', pms.google_ads_conversion_label
            )
          ) FROM product_marketing_settings pms WHERE pms.product_id = p.id LIMIT 1),
          '{}'::json
        ),
      'seo_settings', NULL
    ) as marketing_extended_data
  ) marketing_extended_info ON p_include_marketing_data = TRUE
  
  WHERE p.id = p_product_id
  LIMIT 1;

  -- 🚀 تحسين 16: بناء النتيجة النهائية المتقدمة
  SELECT JSON_BUILD_OBJECT(
    'success', TRUE,
    'data_type', 'extended',
    'performance_info', JSON_BUILD_OBJECT(
      'optimized', TRUE,
      'version', '1.0_ultra_fast_extended',
      'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
      'optimization_level', 'ultra_fast_extended',
      'specialized_data', TRUE,
      'advanced_joins', TRUE,
      'detail_level', p_data_detail_level
    ),
    'product_extended', JSON_BUILD_OBJECT(
      -- معرف المنتج للربط
      'product_id', v_product_data.id,
      'organization_id', v_product_data.organization_id,
      
      -- الميزات والمواصفات المتقدمة
      'features_and_specs', JSON_BUILD_OBJECT(
        'features', COALESCE(v_product_data.features, ARRAY[]::text[]),
        'specifications', COALESCE(v_product_data.specifications, '{}'::jsonb),
        'feature_texts', JSON_BUILD_OBJECT(
          'fast_shipping_text', v_product_data.fast_shipping_text,
          'money_back_text', v_product_data.money_back_text,
          'quality_guarantee_text', v_product_data.quality_guarantee_text
        )
      ),
      
      -- التسعير المتقدم
      'advanced_pricing', JSON_BUILD_OBJECT(
        'partial_wholesale_price', v_product_data.partial_wholesale_price,
        'min_wholesale_quantity', v_product_data.min_wholesale_quantity,
        'min_partial_wholesale_quantity', v_product_data.min_partial_wholesale_quantity,
        'allow_partial_wholesale', COALESCE(v_product_data.allow_partial_wholesale, FALSE),
        'unit_type', v_product_data.unit_type,
        'unit_purchase_price', v_product_data.unit_purchase_price,
        'unit_sale_price', v_product_data.unit_sale_price,
        'wholesale_tiers', CASE 
          WHEN v_product_data.advanced_extended_data IS NOT NULL 
          THEN (v_product_data.advanced_extended_data->'wholesale_tiers')
          ELSE '[]'::json 
        END
      ),
      
      -- المخزون المتقدم
      'advanced_inventory', JSON_BUILD_OBJECT(
        'reorder_level', COALESCE(v_product_data.reorder_level, 10),
        'reorder_quantity', COALESCE(v_product_data.reorder_quantity, 20)
      ),
      
      -- الشحن المتقدم
      'shipping_extended', v_product_data.shipping_extended_data,
      
      -- المتغيرات المتقدمة (مع الصور والأحجام)
      'variants_extended', JSON_BUILD_OBJECT(
        'has_variants', COALESCE(v_product_data.has_variants, FALSE),
        'use_sizes', COALESCE(v_product_data.use_sizes, FALSE),
        'colors_with_details', v_product_data.colors_extended_data
      ),
      
      -- الصور المتقدمة
      'images_extended', v_product_data.images_extended_data,
      
      -- النماذج المتقدمة
      'forms_extended', v_product_data.form_extended_data,
      
      -- الإعدادات المتقدمة
      'settings_extended', v_product_data.advanced_extended_data,
      
      -- التسويق المتقدم
      'marketing_extended', v_product_data.marketing_extended_data,
      
      -- إعدادات صفحة الشراء والعروض
      'page_configs', JSON_BUILD_OBJECT(
        'purchase_page_config', v_product_data.purchase_page_config,
        'special_offers_config', v_product_data.special_offers_config
      )
    ),
    
    -- الإحصائيات المتقدمة
    'extended_stats', JSON_BUILD_OBJECT(
      'colors_with_images_count', CASE 
        WHEN v_product_data.colors_extended_data::text != '[]' THEN 
          (SELECT COUNT(*) FROM JSON_ARRAY_ELEMENTS(v_product_data.colors_extended_data) 
           WHERE (value->>'image_url') IS NOT NULL)
        ELSE 0 
      END,
      'total_sizes_count', CASE 
        WHEN v_product_data.colors_extended_data::text != '[]' THEN 
          (SELECT SUM((value->'sizes'->>'array_length')::int) 
           FROM JSON_ARRAY_ELEMENTS(v_product_data.colors_extended_data))
        ELSE 0 
      END,
      'has_custom_form', CASE 
        WHEN v_product_data.form_extended_data IS NOT NULL 
        THEN (v_product_data.form_extended_data->'custom_form') IS NOT NULL
        ELSE FALSE 
      END,
      'has_marketing_settings', v_product_data.marketing_extended_data IS NOT NULL,
      'has_advanced_settings', v_product_data.advanced_extended_data IS NOT NULL,
      'data_detail_level', p_data_detail_level,
      'large_images_included', p_include_large_images,
      'last_updated', NOW()
    ),
    
    'metadata', JSON_BUILD_OBJECT(
      'query_timestamp', NOW(),
      'data_type', 'extended_only',
      'performance_optimized', TRUE,
      'optimization_version', '1.0_ultra_fast_extended',
      'specialized_query', TRUE,
      'advanced_data_loading', TRUE
    )
  ) INTO v_result;

  -- إرجاع النتيجة مباشرة
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
      'success', FALSE,
      'error', JSON_BUILD_OBJECT(
        'message', SQLERRM,
        'code', SQLSTATE,
        'optimized_version', '1.0_ultra_fast_extended',
        'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
      )
    );
END;
$$;

-- 🚀 إضافة فهارس محسنة للدالة المتقدمة

-- فهارس محسنة للإعدادات المتقدمة
CREATE INDEX IF NOT EXISTS idx_product_advanced_settings_extended_ultra_fast_v1
ON product_advanced_settings (product_id, use_custom_currency, skip_cart);

-- فهارس محسنة لإعدادات التسويق المتقدمة
CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_extended_ultra_fast_v1
ON product_marketing_settings (product_id, offer_timer_enabled, enable_reviews, test_mode);

CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_facebook_ultra_fast_v1
ON product_marketing_settings (product_id, enable_facebook_pixel, enable_facebook_conversion_api);

CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_tiktok_ultra_fast_v1
ON product_marketing_settings (product_id, enable_tiktok_pixel, tiktok_events_api_enabled);

CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_google_ultra_fast_v1
ON product_marketing_settings (product_id, enable_google_ads_tracking);

-- فهارس محسنة لمستويات الجملة
CREATE INDEX IF NOT EXISTS idx_wholesale_tiers_extended_ultra_fast_v1
ON wholesale_tiers (product_id, min_quantity);

-- فهارس محسنة لإعدادات السيو (إذا كان الجدول موجود)
-- CREATE INDEX IF NOT EXISTS idx_product_seo_settings_extended_ultra_fast_v1
-- ON product_seo_settings (product_id);

-- فهارس محسنة للنماذج المتقدمة
CREATE INDEX IF NOT EXISTS idx_form_settings_extended_ultra_fast_v1
ON form_settings (organization_id, is_active, is_default, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_settings_product_ids_extended_ultra_fast_v1
ON form_settings USING gin (product_ids);

-- فهارس محسنة للألوان مع الأحجام
CREATE INDEX IF NOT EXISTS idx_product_colors_extended_ultra_fast_v1
ON product_colors (product_id, id, is_default DESC, quantity, price);

CREATE INDEX IF NOT EXISTS idx_product_sizes_extended_ultra_fast_v1
ON product_sizes (color_id, id, is_default DESC, quantity, price);

-- فهارس محسنة للصور المتقدمة
CREATE INDEX IF NOT EXISTS idx_product_images_extended_ultra_fast_v1
ON product_images (product_id, sort_order, id);

-- فهارس محسنة للشحن المتقدم
CREATE INDEX IF NOT EXISTS idx_shipping_providers_extended_ultra_fast_v1
ON shipping_providers (id, name, code);

CREATE INDEX IF NOT EXISTS idx_shipping_provider_clones_extended_ultra_fast_v1
ON shipping_provider_clones (id, organization_id, original_provider_id);

-- تحديث إحصائيات الفهارس للبيانات المتقدمة
ANALYZE product_advanced_settings;
ANALYZE product_marketing_settings;
ANALYZE wholesale_tiers;
ANALYZE form_settings;
ANALYZE product_sizes;
ANALYZE shipping_providers;
ANALYZE shipping_provider_clones;

-- 🚀 دالة مساعدة لجلب صور الألوان الضخمة بشكل منفصل
CREATE OR REPLACE FUNCTION get_product_color_large_images(
  p_product_id UUID,
  p_color_ids UUID[] DEFAULT NULL -- تحديد ألوان معينة أو NULL لجميع الألوان
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_start_time TIMESTAMP;
BEGIN
  v_start_time := clock_timestamp();

  SELECT JSON_BUILD_OBJECT(
    'success', TRUE,
    'performance_info', JSON_BUILD_OBJECT(
      'optimized', TRUE,
      'version', '1.0_large_images_only',
      'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
      'target', 'large_color_images'
    ),
    'color_large_images', COALESCE(
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'color_id', pcol.id,
          'color_name', pcol.name,
          'image_url', pcol.image_url,
          'image_size_bytes', length(pcol.image_url),
          'image_type', CASE
            WHEN pcol.image_url LIKE 'data:image/%' THEN 'base64'
            WHEN pcol.image_url LIKE 'http%' THEN 'url'
            ELSE 'unknown'
          END
        ) ORDER BY pcol.is_default DESC NULLS LAST, pcol.id
      ) FROM product_colors pcol
      WHERE pcol.product_id = p_product_id
        AND pcol.image_url IS NOT NULL
        AND length(pcol.image_url) > 0
        AND (p_color_ids IS NULL OR pcol.id = ANY(p_color_ids))),
      '[]'::json
    )
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
      'success', FALSE,
      'error', JSON_BUILD_OBJECT(
        'message', SQLERRM,
        'code', SQLSTATE,
        'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
      )
    );
END;
$$;
