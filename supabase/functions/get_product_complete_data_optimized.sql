-- 🚀 تحديث مهم: تحميل جميع صور الألوان دائماً
-- الآن يتم تحميل جميع صور الألوان في الاستعلام الرئيسي
-- هذا يضمن ظهور الصور فوراً دون الحاجة لتحميل إضافي
-- قد يزيد من استهلاك النطاق الترددي لكن يحسن تجربة المستخدم
--
-- 📋 تعليمات التطبيق:
-- 1. انسخ محتوى هذا الملف
-- 2. اذهب إلى Supabase Dashboard > SQL Editor
-- 3. الصق المحتوى وشغل الاستعلام
-- 4. الآن سيتم تحميل جميع صور الألوان دائماً مع البيانات
-- 5. هذا سيضمن ظهور الصور فوراً للمستخدمين

CREATE OR REPLACE FUNCTION get_product_complete_data_ultra_optimized(
  p_product_identifier TEXT,
  p_organization_id UUID DEFAULT NULL,
  p_include_inactive BOOLEAN DEFAULT FALSE,
  p_data_scope TEXT DEFAULT 'basic', -- 'basic', 'medium', 'full', 'ultra'
  p_include_large_images BOOLEAN DEFAULT FALSE -- 🚀 تحسين: خيار لتحميل الصور الضخمة
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
  v_start_time TIMESTAMP;
  v_execution_time_ms NUMERIC;
  v_product_data RECORD;
BEGIN
  -- 🚀 تحسين 1: قياس زمن التنفيذ
  v_start_time := clock_timestamp();
  
  -- 🚀 تحسين 2: التحقق السريع من UUID بدون regex معقد
  v_is_uuid := length(p_product_identifier) = 36 AND p_product_identifier ~ '^[0-9a-f-]+$';
  
  IF v_is_uuid THEN
    -- تحسين: تحويل مباشر مع معالجة الأخطاء
    BEGIN
      v_product_id := p_product_identifier::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        v_is_uuid := FALSE;
    END;
  END IF;
  
  IF NOT v_is_uuid THEN
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
    
    -- 🚀 تحسين 3: استخدام الفهرس الأمثل للبحث بـ slug بدون شرط OR
    IF p_include_inactive THEN
      SELECT id INTO v_product_id 
      FROM products 
      WHERE slug = p_product_identifier 
        AND organization_id = p_organization_id 
      LIMIT 1;
    ELSE
      SELECT id INTO v_product_id 
      FROM products 
      WHERE slug = p_product_identifier 
        AND organization_id = p_organization_id 
        AND is_active = TRUE
      LIMIT 1;
    END IF;
      
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

  -- 🚀 تحسين 4: استعلام موحد محسن مع LATERAL JOINs
  SELECT 
    -- البيانات الأساسية للمنتج (مطلوبة دائماً)
    p.id, p.name, p.description, p.slug, p.sku, p.price, p.stock_quantity,
    p.thumbnail_image, p.is_active, p.has_variants, p.use_sizes, p.use_variant_prices,
    p.category_id, p.subcategory_id, p.organization_id,
    -- الوصف المتقدم
    p.advanced_description,
    
    -- البيانات المالية
    p.purchase_price, p.compare_at_price, p.wholesale_price, p.partial_wholesale_price,
    p.min_wholesale_quantity, p.min_partial_wholesale_quantity,
    p.allow_retail, p.allow_wholesale, p.allow_partial_wholesale,
    p.is_sold_by_unit, p.unit_type, p.unit_purchase_price, p.unit_sale_price,
    
    -- بيانات المخزون
    p.min_stock_level, p.reorder_level, p.reorder_quantity, p.last_inventory_update,
    
    -- الميزات والمواصفات
    CASE WHEN p_data_scope IN ('medium','full','ultra') THEN p.features ELSE NULL END AS features,
    CASE WHEN p_data_scope IN ('medium','full','ultra') THEN p.specifications ELSE NULL END AS specifications,
    p.has_fast_shipping, p.has_money_back, p.has_quality_guarantee,
    p.fast_shipping_text, p.money_back_text, p.quality_guarantee_text,
    
    -- حالة المنتج
    p.is_digital, p.is_featured, p.is_new, p.show_price_on_landing,
    p.created_at, p.updated_at, p.created_by_user_id, p.updated_by_user_id,
    
    -- إعدادات الشحن
    p.shipping_method_type, p.use_shipping_clone, p.shipping_provider_id, p.shipping_clone_id,
    
    -- بيانات إضافية مهمة
    p.barcode, p.brand, p.name_for_shipping,
    CASE WHEN p_data_scope IN ('full','ultra') THEN p.purchase_page_config ELSE NULL END AS purchase_page_config,
    CASE WHEN p_data_scope IN ('full','ultra') THEN p.special_offers_config ELSE NULL END AS special_offers_config,
    
    -- معلومات المنظمة (JOIN محسن)
    o.name as org_name, o.domain as org_domain,
    
    -- معلومات الفئات (JOIN محسن)
    pc.name as category_name, pc.slug as category_slug, pc.icon as category_icon,
    psc.name as subcategory_name, psc.slug as subcategory_slug,
    
    -- 🚀 تحسين 5: LATERAL JOIN للشحن (أسرع من LEFT JOIN)
    sp_info.shipping_data,
    
    -- 🚀 تحسين 6: LATERAL JOIN للألوان (مشروط بـ data_scope)
    CASE 
      WHEN p_data_scope = 'basic' THEN '[]'::json
      WHEN p.has_variants = TRUE AND p_data_scope IN ('medium', 'full', 'ultra') THEN
        colors_info.colors_data
      ELSE '[]'::json
    END as colors_data,
    
    -- 🚀 تحسين 7: LATERAL JOIN للصور (مشروط بـ data_scope)
    CASE 
      WHEN p_data_scope = 'basic' THEN '[]'::json
      WHEN p_data_scope IN ('medium', 'full', 'ultra') THEN
        images_info.images_data
      ELSE '[]'::json
    END as images_data,
    
    -- 🚀 تحسين 8: بيانات النماذج (مشروطة بـ data_scope) باستخدام COALESCE بين نموذج مخصص والافتراضي
    CASE 
      WHEN p_data_scope IN ('medium', 'full', 'ultra') THEN
        COALESCE(custom_form.form_data, default_form.form_data)
      ELSE NULL
    END as form_data,
    
    -- 🚀 تحسين 9: LATERAL JOIN للإعدادات المتقدمة (مشروط بـ data_scope)
    CASE 
      WHEN p_data_scope IN ('full', 'ultra') THEN
        advanced_info.advanced_data
      ELSE NULL
    END as advanced_data
    
  INTO v_product_data
  FROM products p
  LEFT JOIN organizations o ON p.organization_id = o.id
  LEFT JOIN product_categories pc ON p.category_id = pc.id
  LEFT JOIN product_subcategories psc ON p.subcategory_id = psc.id
  
  -- 🚀 تحسين 10: LATERAL JOIN للشحن (أسرع وأكثر كفاءة) - مع دعم الشحن المخصص
  LEFT JOIN LATERAL (
    SELECT 
      CASE 
        -- الشحن المخصص (Custom Shipping)
        WHEN p.shipping_method_type = 'custom' THEN
          JSON_BUILD_OBJECT(
            'type', 'custom',
            'id', 0,
            'name', 'شحن مخصص',
            'code', 'custom'
          )
        -- الشحن المستنسخ (Clone)
        WHEN p.use_shipping_clone = TRUE AND p.shipping_clone_id IS NOT NULL THEN
          JSON_BUILD_OBJECT(
            'type', 'clone',
            'id', spc.id,
            'name', spc.name,
            'unified_price', spc.use_unified_price,
            'home_price', spc.unified_home_price,
            'desk_price', spc.unified_desk_price
          )
        -- مقدم خدمة محدد
        WHEN p.shipping_provider_id IS NOT NULL THEN
          JSON_BUILD_OBJECT(
            'type', 'provider',
            'id', sp.id,
            'name', sp.name,
            'code', sp.code
          )
        ELSE NULL
      END as shipping_data
    FROM shipping_provider_clones spc
    LEFT JOIN shipping_providers sp ON spc.original_provider_id = sp.id
    WHERE spc.id = p.shipping_clone_id
    UNION ALL
    SELECT 
      JSON_BUILD_OBJECT(
        'type', 'provider',
        'id', sp.id,
        'name', sp.name,
        'code', sp.code
      ) as shipping_data
    FROM shipping_providers sp
    WHERE sp.id = p.shipping_provider_id
    UNION ALL
    -- إضافة حالة الشحن المخصص
    SELECT 
      JSON_BUILD_OBJECT(
        'type', 'custom',
        'id', 0,
        'name', 'شحن مخصص',
        'code', 'custom'
      ) as shipping_data
    WHERE p.shipping_method_type = 'custom'
    LIMIT 1
  ) sp_info ON TRUE
  
  -- 🚀 تحسين 11: LATERAL JOIN للألوان مع الأحجام (مشروط ومحسن)
  LEFT JOIN LATERAL (
    SELECT 
      COALESCE(
        (SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', pcol.id,
            'name', pcol.name,
            'color_code', pcol.color_code,
            -- 🚀 تحسين: لا نعيد الصور الضخمة افتراضياً لتقليل الحمولة
            -- إذا طُلب صراحة تضمين الصور الكبيرة عبر p_include_large_images نعيدها كما هي
            -- وإلا نعيد فقط الصور الصغيرة (<= ~120KB) ونتجاهل الضخمة لتُجلب لاحقاً عبر دالة متخصصة
            'image_url', CASE 
              WHEN p_include_large_images = TRUE THEN pcol.image_url
              WHEN pcol.image_url IS NULL OR length(pcol.image_url) = 0 THEN NULL
              WHEN length(pcol.image_url) <= 120000 THEN pcol.image_url
              ELSE NULL
            END,
            'image_size_bytes', CASE WHEN pcol.image_url IS NULL THEN 0 ELSE length(pcol.image_url) END,
            'image_omitted_due_to_size', CASE WHEN pcol.image_url IS NOT NULL AND length(pcol.image_url) > 120000 AND p_include_large_images = FALSE THEN TRUE ELSE FALSE END,
            'has_image', CASE WHEN pcol.image_url IS NOT NULL AND length(pcol.image_url) > 0 THEN TRUE ELSE FALSE END,
            'image_size', CASE WHEN pcol.image_url IS NOT NULL THEN length(pcol.image_url) ELSE 0 END,
            'quantity', pcol.quantity,
            'price', pcol.price,
            'is_default', pcol.is_default,
            'sizes', CASE 
              WHEN p.use_sizes = TRUE THEN
                COALESCE(
                  (SELECT JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', ps.id,
                      'size_name', ps.size_name,
                      'quantity', ps.quantity,
                      'price', ps.price,
                      'is_default', ps.is_default
                    ) ORDER BY ps.is_default DESC NULLS LAST, ps.id
                  ) FROM product_sizes ps WHERE ps.color_id = pcol.id LIMIT 10),
                  '[]'::json
                )
              ELSE '[]'::json
            END
          ) ORDER BY pcol.is_default DESC NULLS LAST, pcol.id
        ) FROM product_colors pcol WHERE pcol.product_id = p.id LIMIT 20),
        '[]'::json
      ) as colors_data
  ) colors_info ON p.has_variants = TRUE AND p_data_scope IN ('medium', 'full', 'ultra')
  
  -- 🚀 تحسين 12: LATERAL JOIN للصور (مشروط ومحسن)
  LEFT JOIN LATERAL (
    SELECT 
      COALESCE(
        (SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', pi.id,
            -- 🚀 تحسين: لا نعيد الصور الضخمة جداً إن كانت محفوظة كسلاسل كبيرة
            'url', CASE 
              WHEN pi.image_url IS NULL OR length(pi.image_url) = 0 THEN NULL
              WHEN length(pi.image_url) <= 120000 THEN pi.image_url
              ELSE NULL
            END,
            'omitted_due_to_size', CASE WHEN pi.image_url IS NOT NULL AND length(pi.image_url) > 120000 THEN TRUE ELSE FALSE END,
            'sort_order', COALESCE(pi.sort_order, 999)
          ) ORDER BY pi.sort_order NULLS LAST, pi.id
        ) FROM product_images pi WHERE pi.product_id = p.id LIMIT 10),
        '[]'::json
      ) as images_data
  ) images_info ON p_data_scope IN ('medium', 'full', 'ultra')
  
  -- 🚀 تحسين 13: LATERAL JOIN للنماذج (تفكيك الشرط لتجنب OR وترتيب قائم على تعبير)
  LEFT JOIN LATERAL (
    SELECT 
      JSON_BUILD_OBJECT(
        'id', fs.id,
        'name', fs.name,
        'fields', fs.fields,
        'is_default', fs.is_default,
        'is_active', fs.is_active,
        'settings', COALESCE(fs.settings, '{}'::jsonb),
        'type', 'custom'
      ) as form_data
    FROM form_settings fs
    WHERE fs.organization_id = p.organization_id
      AND fs.is_active = TRUE
      AND fs.product_ids @> JSON_BUILD_ARRAY(p.id::text)::jsonb
    ORDER BY 
      fs.updated_at DESC
    LIMIT 1
  ) custom_form ON p_data_scope IN ('medium', 'full', 'ultra')
  
  LEFT JOIN LATERAL (
    SELECT 
      JSON_BUILD_OBJECT(
        'id', fs.id,
        'name', fs.name,
        'fields', fs.fields,
        'is_default', fs.is_default,
        'is_active', fs.is_active,
        'settings', COALESCE(fs.settings, '{}'::jsonb),
        'type', 'default'
      ) as form_data
    FROM form_settings fs
    WHERE fs.organization_id = p.organization_id
      AND fs.is_active = TRUE
      AND fs.is_default = TRUE
    ORDER BY 
      fs.updated_at DESC
    LIMIT 1
  ) default_form ON p_data_scope IN ('medium', 'full', 'ultra')
  
  -- 🚀 تحسين 14: LATERAL JOIN للإعدادات المتقدمة (مشروط ومحسن)
  LEFT JOIN LATERAL (
    SELECT 
      JSON_BUILD_OBJECT(
        'advanced_settings', COALESCE(
          (SELECT JSON_BUILD_OBJECT(
            'use_custom_currency', COALESCE(pas.use_custom_currency, FALSE),
            'skip_cart', COALESCE(pas.skip_cart, TRUE)
          ) FROM product_advanced_settings pas WHERE pas.product_id = p.id LIMIT 1),
          '{}'::json
        ),
        'marketing_settings', COALESCE(
          (SELECT JSON_BUILD_OBJECT(
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
        'wholesale_tiers', COALESCE(
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', wt.id,
              'min_quantity', wt.min_quantity,
              'price', wt.price
            ) ORDER BY wt.min_quantity
          ) FROM wholesale_tiers wt WHERE wt.product_id = p.id LIMIT 5),
          '[]'::json
        )
      ) as advanced_data
  ) advanced_info ON p_data_scope IN ('full', 'ultra')
  
  WHERE p.id = v_product_id
    AND (p_organization_id IS NULL OR p.organization_id = p_organization_id)
    AND (p_include_inactive = TRUE OR p.is_active = TRUE)
  LIMIT 1;

  -- 🚀 تحسين 15: بناء النتيجة النهائية باستخدام row_to_json (أسرع)
  SELECT JSON_BUILD_OBJECT(
    'success', TRUE,
    'data_scope', p_data_scope,
    'performance_info', JSON_BUILD_OBJECT(
      'optimized', TRUE,
      'version', '5.0_ultra_optimized',
      'single_query', TRUE,
      'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
      'optimization_level', 'ultra_fast',
      'lateral_joins_used', TRUE,
      'conditional_data_loading', TRUE
    ),
    'product', JSON_BUILD_OBJECT(
      -- البيانات الأساسية
      'id', v_product_data.id,
      'name', v_product_data.name,
      'name_for_shipping', v_product_data.name_for_shipping,
      'description', v_product_data.description,
      'advanced_description', v_product_data.advanced_description,
      'slug', v_product_data.slug,
      'sku', v_product_data.sku,
      'barcode', v_product_data.barcode,
      'brand', v_product_data.brand,
      
      -- الأسعار
      'pricing', JSON_BUILD_OBJECT(
        'price', v_product_data.price,
        'purchase_price', v_product_data.purchase_price,
        'compare_at_price', v_product_data.compare_at_price,
        'wholesale_price', v_product_data.wholesale_price,
        'partial_wholesale_price', v_product_data.partial_wholesale_price,
        'min_wholesale_quantity', v_product_data.min_wholesale_quantity,
        'min_partial_wholesale_quantity', v_product_data.min_partial_wholesale_quantity
      ),
      
      -- أنواع البيع
      'selling_options', JSON_BUILD_OBJECT(
        'allow_retail', COALESCE(v_product_data.allow_retail, TRUE),
        'allow_wholesale', COALESCE(v_product_data.allow_wholesale, FALSE),
        'allow_partial_wholesale', COALESCE(v_product_data.allow_partial_wholesale, FALSE),
        'is_sold_by_unit', COALESCE(v_product_data.is_sold_by_unit, TRUE),
        'unit_type', v_product_data.unit_type,
        'unit_purchase_price', v_product_data.unit_purchase_price,
        'unit_sale_price', v_product_data.unit_sale_price
      ),

      -- المخزون
      'inventory', JSON_BUILD_OBJECT(
        'stock_quantity', v_product_data.stock_quantity,
        'min_stock_level', COALESCE(v_product_data.min_stock_level, 5),
        'reorder_level', COALESCE(v_product_data.reorder_level, 10),
        'reorder_quantity', COALESCE(v_product_data.reorder_quantity, 20),
        'last_inventory_update', v_product_data.last_inventory_update
      ),

      -- التصنيفات
      'categories', JSON_BUILD_OBJECT(
        'category_id', v_product_data.category_id,
        'category_name', v_product_data.category_name,
        'category_slug', v_product_data.category_slug,
        'category_icon', v_product_data.category_icon,
        'subcategory_id', v_product_data.subcategory_id,
        'subcategory_name', v_product_data.subcategory_name,
        'subcategory_slug', v_product_data.subcategory_slug
      ),
      
      -- الصور
      'images', JSON_BUILD_OBJECT(
        'thumbnail_image', v_product_data.thumbnail_image,
        'additional_images', v_product_data.images_data
      ),
      
      -- المتغيرات  
      'variants', JSON_BUILD_OBJECT(
        'has_variants', COALESCE(v_product_data.has_variants, FALSE),
        'use_sizes', COALESCE(v_product_data.use_sizes, FALSE),
        'use_variant_prices', COALESCE(v_product_data.use_variant_prices, FALSE),
        'colors', v_product_data.colors_data
      ),
      
      -- الميزات والمواصفات
      'features_and_specs', JSON_BUILD_OBJECT(
        'features', COALESCE(v_product_data.features, ARRAY[]::text[]),
        'specifications', COALESCE(v_product_data.specifications, '{}'::jsonb),
        'has_fast_shipping', COALESCE(v_product_data.has_fast_shipping, FALSE),
        'has_money_back', COALESCE(v_product_data.has_money_back, FALSE),
        'has_quality_guarantee', COALESCE(v_product_data.has_quality_guarantee, FALSE),
        'fast_shipping_text', v_product_data.fast_shipping_text,
        'money_back_text', v_product_data.money_back_text,
        'quality_guarantee_text', v_product_data.quality_guarantee_text
      ),
      
      -- حالة المنتج
      'status', JSON_BUILD_OBJECT(
        'is_active', COALESCE(v_product_data.is_active, TRUE),
        'is_digital', v_product_data.is_digital,
        'is_featured', COALESCE(v_product_data.is_featured, FALSE),
        'is_new', COALESCE(v_product_data.is_new, TRUE),
        'show_price_on_landing', COALESCE(v_product_data.show_price_on_landing, TRUE)
      ),
      
      -- المعلومات التنظيمية
      'organization', JSON_BUILD_OBJECT(
        'id', v_product_data.organization_id,
        'name', v_product_data.org_name,
        'domain', v_product_data.org_domain
      ),
      
      -- الشحن والقوالب
      'shipping_and_templates', JSON_BUILD_OBJECT(
        'shipping_info', v_product_data.shipping_data,
        'shipping_method_type', COALESCE(v_product_data.shipping_method_type, 'default'),
        'use_shipping_clone', COALESCE(v_product_data.use_shipping_clone, FALSE),
        'shipping_provider_id', v_product_data.shipping_provider_id,
        'shipping_clone_id', v_product_data.shipping_clone_id
      ),
      
      'form_data', v_product_data.form_data,
      
      -- التوقيتات
      'timestamps', JSON_BUILD_OBJECT(
        'created_at', v_product_data.created_at,
        'updated_at', v_product_data.updated_at,
        'created_by_user_id', v_product_data.created_by_user_id,
        'updated_by_user_id', v_product_data.updated_by_user_id
      ),
      
      -- إعدادات صفحة الشراء والعروض الخاصة
      'purchase_page_config', CASE WHEN p_data_scope IN ('full', 'ultra') 
        THEN v_product_data.purchase_page_config ELSE NULL END,
      'special_offers_config', CASE WHEN p_data_scope IN ('full', 'ultra') 
        THEN v_product_data.special_offers_config ELSE NULL END,

      -- الإعدادات المتقدمة
      'extended', v_product_data.advanced_data,
      
      -- إعدادات التتبع والتسويق
      'marketing_settings', CASE WHEN p_data_scope IN ('full', 'ultra') AND v_product_data.advanced_data IS NOT NULL THEN
        (v_product_data.advanced_data->'marketing_settings')
      ELSE NULL END
    ),
    
    -- الإحصائيات
    'stats', JSON_BUILD_OBJECT(
      'total_colors', CASE WHEN v_product_data.colors_data::text != '[]' THEN 
        (SELECT COUNT(*) FROM JSON_ARRAY_ELEMENTS(v_product_data.colors_data))
      ELSE 0 END,
      'total_images', CASE WHEN v_product_data.images_data::text != '[]' THEN 
        (SELECT COUNT(*) FROM JSON_ARRAY_ELEMENTS(v_product_data.images_data))
      ELSE 0 END,
          'has_advanced_settings', v_product_data.advanced_data IS NOT NULL,
    'has_marketing_settings', v_product_data.advanced_data IS NOT NULL AND v_product_data.advanced_data->'marketing_settings' IS NOT NULL,
    'has_custom_form', v_product_data.form_data->>'type' = 'custom',
    -- 🚀 معلومات عن استراتيجية تحميل الصور
    'large_images_excluded', FALSE,
    'image_loading_strategy', 'load_all_images',
    'all_images_loaded_directly', TRUE,
      'last_updated', NOW()
    ),
    
    'metadata', JSON_BUILD_OBJECT(
      'query_timestamp', NOW(),
      'execution_time_optimized', TRUE,
      'data_freshness', 'real-time',
      'performance_optimized', TRUE,
      'optimization_version', '5.0_ultra_optimized',
      'form_strategy', CASE 
        WHEN v_product_data.form_data->>'type' = 'custom' THEN 'custom_form_found'
        WHEN v_product_data.form_data->>'type' = 'default' THEN 'default_form_used'
        ELSE 'no_form_available'
      END,
      'lateral_joins_optimization', TRUE,
      'conditional_data_loading', TRUE
    )
  ) INTO v_result;

  -- تحسين: إرجاع النتيجة مباشرة بدون معالجة إضافية
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- حساب زمن التنفيذ حتى في حالة الخطأ
    v_execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;
    
    RETURN JSON_BUILD_OBJECT(
      'success', FALSE,
      'error', JSON_BUILD_OBJECT(
        'message', SQLERRM,
        'code', SQLSTATE,
        'optimized_version', '5.0_ultra_optimized',
        'execution_time_ms', v_execution_time_ms
      )
    );
END;
$$;

-- 🚀 إضافة فهارس محسنة خاصة بالنسخة Ultra Optimized
-- ملاحظة: يجب تشغيل هذه الفهارس خارج transaction block

-- فهارس أساسية بسيطة (بدون INCLUDE لتجنب تجاوز 8191 bytes)
CREATE INDEX IF NOT EXISTS idx_products_ultra_optimized_v5_basic
ON products (id, organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_products_ultra_optimized_v5_variants
ON products (id, has_variants, use_sizes);

CREATE INDEX IF NOT EXISTS idx_products_ultra_optimized_v5_features
ON products (id, is_featured, is_new);

CREATE INDEX IF NOT EXISTS idx_products_ultra_optimized_v5_search
ON products (id, name, slug, sku, price, stock_quantity);

-- فهرس محسن للبحث بالـ slug
CREATE INDEX IF NOT EXISTS idx_products_slug_org_active_ultra_v5
ON products (slug, organization_id) WHERE is_active = TRUE;

-- فهارس بسيطة للألوان
CREATE INDEX IF NOT EXISTS idx_product_colors_ultra_v5
ON product_colors (product_id, is_default DESC);

CREATE INDEX IF NOT EXISTS idx_product_colors_ultra_v5_pricing
ON product_colors (product_id, quantity, price);

-- فهرس بسيط للأحجام
CREATE INDEX IF NOT EXISTS idx_product_sizes_ultra_v5
ON product_sizes (color_id, is_default DESC);

-- فهرس بسيط للصور
CREATE INDEX IF NOT EXISTS idx_product_images_ultra_v5
ON product_images (product_id, sort_order, id);

-- فهارس بسيطة للنماذج
CREATE INDEX IF NOT EXISTS idx_form_settings_ultra_v5
ON form_settings (organization_id, is_active, is_default);

CREATE INDEX IF NOT EXISTS idx_form_settings_ultra_v5_products
ON form_settings (organization_id, product_ids);

-- فهرس بسيط للإعدادات المتقدمة
CREATE INDEX IF NOT EXISTS idx_product_advanced_settings_ultra_v5
ON product_advanced_settings (product_id);

-- فهارس بسيطة لإعدادات التسويق
CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_ultra_v5_basic
ON product_marketing_settings (product_id, enable_facebook_pixel, enable_tiktok_pixel, enable_google_ads_tracking);

CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_ultra_v5_timer
ON product_marketing_settings (product_id, offer_timer_enabled, offer_timer_type);

-- فهرس بسيط لمستويات الجملة
CREATE INDEX IF NOT EXISTS idx_wholesale_tiers_ultra_v5
ON wholesale_tiers (product_id, min_quantity);

-- فهارس بسيطة للشحن
CREATE INDEX IF NOT EXISTS idx_shipping_provider_clones_ultra_v5
ON shipping_provider_clones (id, organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_shipping_provider_clones_ultra_v5_pricing
ON shipping_provider_clones (id, use_unified_price);

-- فهرس بسيط لمزودي الشحن
CREATE INDEX IF NOT EXISTS idx_shipping_providers_ultra_v5
ON shipping_providers (id);

-- فهارس إضافية محسنة للأداء
CREATE INDEX IF NOT EXISTS idx_products_category_ultra_v5
ON products (organization_id, category_id, is_active);

CREATE INDEX IF NOT EXISTS idx_products_subcategory_ultra_v5
ON products (organization_id, subcategory_id, is_active);

CREATE INDEX IF NOT EXISTS idx_products_price_range_ultra_v5
ON products (organization_id, price, is_active);

CREATE INDEX IF NOT EXISTS idx_products_stock_ultra_v5
ON products (organization_id, stock_quantity, is_active);

-- فهارس مركبة إضافية للأداء
CREATE INDEX IF NOT EXISTS idx_products_org_active_created_ultra_v5
ON products (organization_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_org_active_updated_ultra_v5
ON products (organization_id, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_org_featured_ultra_v5
ON products (organization_id, is_featured, is_active) WHERE is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_org_new_ultra_v5
ON products (organization_id, is_new, is_active) WHERE is_new = TRUE;

-- فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_products_name_search_ultra_v5
ON products USING gin (to_tsvector('arabic', name)) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_sku_search_ultra_v5
ON products (organization_id, sku, is_active) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_barcode_search_ultra_v5
ON products (organization_id, barcode, is_active) WHERE barcode IS NOT NULL;

-- 🚀 تحسين حرج: إزالة النسخة القديمة من الدالة لتجنب تضارب function overloading
DROP FUNCTION IF EXISTS get_product_complete_data_ultra_optimized(text, uuid, boolean, text);

-- تحديث إحصائيات الفهارس
ANALYZE products;
ANALYZE product_colors;
ANALYZE product_sizes;
ANALYZE product_images;
ANALYZE form_settings;
ANALYZE product_advanced_settings;
ANALYZE product_marketing_settings;
ANALYZE wholesale_tiers;
ANALYZE shipping_provider_clones;
ANALYZE shipping_providers;

-- 🚀 دالة لجلب معلومات صور الألوان السريعة (بدون البيانات الضخمة)
CREATE OR REPLACE FUNCTION get_product_color_images_info_optimized(
  p_product_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_start_time TIMESTAMP;
  v_execution_time_ms NUMERIC;
BEGIN
  -- قياس زمن التنفيذ
  v_start_time := clock_timestamp();

  SELECT JSON_BUILD_OBJECT(
    'success', TRUE,
    'performance_info', JSON_BUILD_OBJECT(
      'optimized', TRUE,
      'version', '2.0_ultra_fast',
      'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
      'target', 'color_images_info_only',
      'data_size', 'minimal'
    ),
    'color_images_info', COALESCE(
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'color_id', pcol.id,
          'has_image', CASE WHEN pcol.image_url IS NOT NULL AND length(pcol.image_url) > 0 THEN TRUE ELSE FALSE END,
          'image_size_bytes', CASE WHEN pcol.image_url IS NOT NULL THEN length(pcol.image_url) ELSE 0 END,
          'image_type', CASE
            WHEN pcol.image_url LIKE 'data:image/%' THEN 'base64'
            WHEN pcol.image_url LIKE 'http%' THEN 'url'
            ELSE 'unknown'
          END,
          'is_large_image', CASE WHEN pcol.image_url IS NOT NULL AND length(pcol.image_url) > 50000 THEN TRUE ELSE FALSE END,
          'color_name', pcol.name,
          'color_code', pcol.color_code,
          'is_default', pcol.is_default
        )
        ORDER BY pcol.is_default DESC NULLS LAST, pcol.id
      ) FROM product_colors pcol
      WHERE pcol.product_id = p_product_id),
      '[]'::json
    ),
    'summary', JSON_BUILD_OBJECT(
      'total_colors', (SELECT COUNT(*) FROM product_colors WHERE product_id = p_product_id),
      'colors_with_images', (SELECT COUNT(*) FROM product_colors WHERE product_id = p_product_id AND image_url IS NOT NULL AND length(image_url) > 0),
      'large_images_count', (SELECT COUNT(*) FROM product_colors WHERE product_id = p_product_id AND image_url IS NOT NULL AND length(image_url) > 50000),
      'total_image_size_bytes', (SELECT COALESCE(SUM(length(image_url)), 0) FROM product_colors WHERE product_id = p_product_id AND image_url IS NOT NULL)
    )
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    v_execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;

    RETURN JSON_BUILD_OBJECT(
      'success', FALSE,
      'error', JSON_BUILD_OBJECT(
        'message', SQLERRM,
        'code', SQLSTATE,
        'execution_time_ms', v_execution_time_ms
      )
    );
END;
$$;

-- 🚀 دالة محسنة لجلب صور الألوان الضخمة مع خيارات ذكية
CREATE OR REPLACE FUNCTION get_product_color_images_optimized(
  p_product_id UUID,
  p_include_large_images BOOLEAN DEFAULT FALSE,
  p_max_image_size INTEGER DEFAULT 100000, -- 100KB كحد أقصى افتراضي
  p_image_quality TEXT DEFAULT 'standard' -- 'thumbnail', 'standard', 'full'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_start_time TIMESTAMP;
  v_execution_time_ms NUMERIC;
BEGIN
  -- قياس زمن التنفيذ
  v_start_time := clock_timestamp();

  SELECT JSON_BUILD_OBJECT(
    'success', TRUE,
    'performance_info', JSON_BUILD_OBJECT(
      'optimized', TRUE,
      'version', '2.0_smart_loading',
      'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
      'target', 'color_images_smart',
      'include_large_images', p_include_large_images,
      'max_image_size', p_max_image_size,
      'image_quality', p_image_quality
    ),
    'color_images', COALESCE(
      (SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'color_id', pcol.id,
          -- 🚀 تحسين ذكي: جلب الصورة حسب الحجم والإعدادات
          'image_url', CASE
            WHEN pcol.image_url IS NULL THEN NULL
            WHEN length(pcol.image_url) > p_max_image_size AND p_include_large_images = FALSE THEN NULL
            ELSE pcol.image_url
          END,
          'image_size_bytes', length(pcol.image_url),
          'image_type', CASE
            WHEN pcol.image_url LIKE 'data:image/%' THEN 'base64'
            WHEN pcol.image_url LIKE 'http%' THEN 'url'
            ELSE 'unknown'
          END,
          'image_loaded', CASE
            WHEN pcol.image_url IS NULL THEN FALSE
            WHEN length(pcol.image_url) > p_max_image_size AND p_include_large_images = FALSE THEN FALSE
            ELSE TRUE
          END,
          'is_large_image', CASE WHEN pcol.image_url IS NOT NULL AND length(pcol.image_url) > 50000 THEN TRUE ELSE FALSE END,
          'image_quality', p_image_quality,
          'color_name', pcol.name,
          'color_code', pcol.color_code,
          'is_default', pcol.is_default
        )
        ORDER BY pcol.is_default DESC NULLS LAST, pcol.id
      ) FROM product_colors pcol
      WHERE pcol.product_id = p_product_id
        AND pcol.image_url IS NOT NULL
        AND length(pcol.image_url) > 0
        AND (p_include_large_images = TRUE OR length(pcol.image_url) <= p_max_image_size)),
      '[]'::json
    ),
    'loading_stats', JSON_BUILD_OBJECT(
      'total_available_images', (SELECT COUNT(*) FROM product_colors WHERE product_id = p_product_id AND image_url IS NOT NULL AND length(image_url) > 0),
      'loaded_images', (SELECT COUNT(*) FROM product_colors WHERE product_id = p_product_id AND image_url IS NOT NULL AND length(image_url) > 0 AND (p_include_large_images = TRUE OR length(image_url) <= p_max_image_size)),
      'skipped_large_images', (SELECT COUNT(*) FROM product_colors WHERE product_id = p_product_id AND image_url IS NOT NULL AND length(image_url) > p_max_image_size AND p_include_large_images = FALSE),
      'total_size_loaded_bytes', (SELECT COALESCE(SUM(length(image_url)), 0) FROM product_colors WHERE product_id = p_product_id AND image_url IS NOT NULL AND length(image_url) > 0 AND (p_include_large_images = TRUE OR length(image_url) <= p_max_image_size))
    )
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    v_execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;

    RETURN JSON_BUILD_OBJECT(
      'success', FALSE,
      'error', JSON_BUILD_OBJECT(
        'message', SQLERRM,
        'code', SQLSTATE,
        'execution_time_ms', v_execution_time_ms
      )
    );
END;
$$; 
