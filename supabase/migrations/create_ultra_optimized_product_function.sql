-- ===============================================================================
-- دالة محسنة لجلب جميع بيانات صفحة المنتج في استعلام واحد
-- تهدف لتقليل 16+ استدعاء إلى استدعاء واحد فقط
-- ===============================================================================

CREATE OR REPLACE FUNCTION get_ultra_optimized_product_page_data(
  p_slug TEXT,
  p_org_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
STABLE -- البيانات لا تتغير خلال المعاملة الواحدة
SECURITY DEFINER -- تشغيل بصلاحيات المالك لتجاوز RLS عند الحاجة
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
  v_result JSONB;
BEGIN
  -- التحقق من وجود المنتج أولاً
  SELECT id INTO v_product_id
  FROM products 
  WHERE slug = p_slug 
    AND organization_id = p_org_id 
    AND is_active = true
  LIMIT 1;
  
  -- إذا لم يوجد المنتج، إرجاع null
  IF v_product_id IS NULL THEN
    RETURN jsonb_build_object(
      'product', null,
      'error', 'Product not found or not active',
      'timestamp', EXTRACT(EPOCH FROM NOW())
    );
  END IF;
  
  -- استعلام واحد معقد يجمع كل البيانات المطلوبة
  WITH 
  -- 1. بيانات المنتج الأساسية مع الفئات
  product_base AS (
    SELECT 
      p.*,
      pc.name as category_name,
      pc.slug as category_slug,
      psc.name as subcategory_name,
      psc.slug as subcategory_slug
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    LEFT JOIN product_subcategories psc ON p.subcategory_id = psc.id
    WHERE p.id = v_product_id
  ),
  
  -- 2. ألوان المنتج مع المقاسات
  product_colors_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', pc.id,
        'name', pc.name,
        'color_code', pc.color_code,
        'image_url', pc.image_url,
        'quantity', pc.quantity,
        'price', pc.price,
        'is_default', pc.is_default,
        'barcode', pc.barcode,
        'has_sizes', pc.has_sizes,
        'product_id', pc.product_id
      )
      ORDER BY pc.is_default DESC, pc.id
    ), '[]'::jsonb) as colors
    FROM product_colors pc
    WHERE pc.product_id = v_product_id
  ),
  
  -- 3. مقاسات المنتج
  product_sizes_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ps.id,
        'product_id', ps.product_id,
        'color_id', ps.color_id,
        'size_name', ps.size_name,
        'quantity', ps.quantity,
        'price', ps.price,
        'barcode', ps.barcode,
        'is_default', ps.is_default
      )
      ORDER BY ps.color_id, ps.is_default DESC, ps.id
    ), '[]'::jsonb) as sizes
    FROM product_sizes ps
    WHERE ps.product_id = v_product_id
  ),
  
  -- 4. صور إضافية للمنتج
  product_images_data AS (
    SELECT COALESCE(jsonb_agg(
      pi.image_url ORDER BY pi.sort_order, pi.id
    ), '[]'::jsonb) as additional_images
    FROM product_images pi
    WHERE pi.product_id = v_product_id
  ),
  
  -- 5. إعدادات النماذج
  form_settings_data AS (
    SELECT jsonb_build_object(
      'id', fs.id,
      'name', fs.name,
      'is_default', fs.is_default,
      'is_active', fs.is_active,
      'settings', fs.settings,
      'fields', fs.fields
    ) as form_settings
    FROM form_settings fs
    JOIN product_base pb ON fs.id = pb.form_template_id
    WHERE fs.organization_id = p_org_id
      AND fs.is_active = true
    LIMIT 1
  ),
  
  -- 6. إعدادات التسويق للمنتج (مُصحح - لا يوجد is_active)
  marketing_settings_data AS (
    SELECT jsonb_build_object(
      'id', pms.id,
      'product_id', pms.product_id,
      'organization_id', pms.organization_id,
      'enable_reviews', pms.enable_reviews,
      'reviews_verify_purchase', pms.reviews_verify_purchase,
      'reviews_auto_approve', pms.reviews_auto_approve,
      'allow_images_in_reviews', pms.allow_images_in_reviews,
      'enable_review_replies', pms.enable_review_replies,
      'review_display_style', pms.review_display_style,
      'enable_fake_star_ratings', pms.enable_fake_star_ratings,
      'fake_star_rating_value', pms.fake_star_rating_value,
      'fake_star_rating_count', pms.fake_star_rating_count,
      'enable_fake_purchase_counter', pms.enable_fake_purchase_counter,
      'fake_purchase_count', pms.fake_purchase_count,
      'offer_timer_enabled', pms.offer_timer_enabled,
      'offer_timer_title', pms.offer_timer_title,
      'offer_timer_type', pms.offer_timer_type,
      'offer_timer_end_date', pms.offer_timer_end_date,
      'offer_timer_duration_minutes', pms.offer_timer_duration_minutes,
      'test_mode', pms.test_mode
    ) as marketing_settings
    FROM product_marketing_settings pms
    WHERE pms.product_id = v_product_id
    LIMIT 1
  ),
  
  -- 7. مراجعات المنتج (مُصحح)
  product_reviews_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', pr.id,
        'product_id', pr.product_id,
        'user_id', pr.user_id,
        'rating', pr.rating,
        'comment', pr.comment,  -- مُصحح من review_text
        'images', pr.images,
        'is_verified_purchase', pr.is_verified_purchase,  -- مُصحح من is_verified
        'is_approved', pr.is_approved,
        'admin_reply_text', pr.admin_reply_text,
        'created_at', pr.created_at,
        'approved_at', pr.approved_at
      )
      ORDER BY pr.is_approved DESC, pr.is_verified_purchase DESC, pr.created_at DESC
    ), '[]'::jsonb) as reviews
    FROM product_reviews pr
    WHERE pr.product_id = v_product_id
      AND pr.is_approved = true  -- مُصحح من is_active
    LIMIT 10 -- تحديد عدد المراجعات لتحسين الأداء
  ),
  
  -- 8. بيانات الشحن - الولايات
  shipping_provinces_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ypg.id,
        'name', ypg.name,
        'is_deliverable', ypg.is_deliverable
      )
      ORDER BY ypg.name
    ), '[]'::jsonb) as provinces
    FROM yalidine_provinces_global ypg
    WHERE ypg.is_deliverable = true
  ),
  
  -- 9. بيانات الشحن - مزودي الشحن المستنسخين
  shipping_provider_clones_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', spc.id,
        'organization_id', spc.organization_id,
        'original_provider_id', spc.original_provider_id,
        'name', spc.name,
        'is_active', spc.is_active,
        'is_home_delivery_enabled', spc.is_home_delivery_enabled,
        'is_desk_delivery_enabled', spc.is_desk_delivery_enabled,
        'use_unified_price', spc.use_unified_price,
        'unified_home_price', spc.unified_home_price,
        'unified_desk_price', spc.unified_desk_price
      )
      ORDER BY spc.created_at DESC
    ), '[]'::jsonb) as provider_clones
    FROM shipping_provider_clones spc
    WHERE spc.organization_id = p_org_id
      AND spc.is_active = true
  ),
  
  -- 10. بيانات الشحن - إعدادات مزودي الشحن
  shipping_provider_settings_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', sps.id,
        'organization_id', sps.organization_id,
        'provider_id', sps.provider_id,
        'is_enabled', sps.is_enabled,
        'settings', sps.settings,
        'provider_info', jsonb_build_object(
          'code', sp.code,
          'name', sp.name
        )
      )
      ORDER BY sps.created_at DESC
    ), '[]'::jsonb) as provider_settings
    FROM shipping_provider_settings sps
    JOIN shipping_providers sp ON sps.provider_id = sp.id
    WHERE sps.organization_id = p_org_id
      AND sps.is_enabled = true
  ),
  
  -- 11. مزود الشحن الافتراضي
  default_shipping_provider_data AS (
    SELECT jsonb_build_object(
      'provider_id', sps.provider_id,
      'provider_code', sp.code,
      'provider_name', sp.name,
      'settings', sps.settings
    ) as default_provider
    FROM shipping_provider_settings sps
    JOIN shipping_providers sp ON sps.provider_id = sp.id
    WHERE sps.organization_id = p_org_id
      AND sps.is_enabled = true
    ORDER BY sps.created_at DESC
    LIMIT 1
  ),
  
  -- 12. بيانات المؤسسة
  organization_data AS (
    SELECT jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'domain', o.domain,
      'logo_url', o.logo_url,
      'settings', os.settings
    ) as org_data
    FROM organizations o
    LEFT JOIN organization_settings os ON o.id = os.organization_id
    WHERE o.id = p_org_id
  ),
  
  -- 13. إعدادات المتجر (جميع المكونات)
  store_settings_data AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ss.id,
        'component_type', ss.component_type,
        'settings', ss.settings,
        'is_active', ss.is_active,
        'order_index', ss.order_index
      )
      ORDER BY ss.order_index, ss.component_type
    ), '[]'::jsonb) as store_settings
    FROM store_settings ss
    WHERE ss.organization_id = p_org_id
      AND ss.is_active = true
  ),
  
  -- 14. إعدادات التحويل والتتبع
  conversion_settings_data AS (
    SELECT jsonb_build_object(
      'facebook_pixel_id', os.settings->>'facebook_pixel_id',
      'google_analytics_id', os.settings->>'google_analytics_id',
      'conversion_tracking', os.settings->'conversion_tracking',
      'product_specific_tracking', jsonb_build_object(
        'product_id', v_product_id,
        'track_view', true,
        'track_add_to_cart', true,
        'track_purchase', true
      )
    ) as conversion_settings
    FROM organization_settings os
    WHERE os.organization_id = p_org_id
  )
  
  -- الاستعلام الرئيسي الذي يجمع كل البيانات
  SELECT jsonb_build_object(
    'product', jsonb_build_object(
      'id', pb.id,
      'name', pb.name,
      'slug', pb.slug,
      'price', pb.price,
      'compare_at_price', pb.compare_at_price,
      'stock_quantity', pb.stock_quantity,
      'description', pb.description,
      'short_description', SUBSTRING(pb.description, 1, 150),
      'thumbnail_image', pb.thumbnail_image,
      'has_fast_shipping', pb.has_fast_shipping,
      'has_money_back', pb.has_money_back,
      'has_quality_guarantee', pb.has_quality_guarantee,
      'fast_shipping_text', pb.fast_shipping_text,
      'money_back_text', pb.money_back_text,
      'quality_guarantee_text', pb.quality_guarantee_text,
      'purchase_page_config', pb.purchase_page_config,
      'is_new', pb.is_new,
      'is_featured', pb.is_featured,
      'use_sizes', pb.use_sizes,
      'has_variants', pb.has_variants,
      'form_template_id', pb.form_template_id,
      'organization_id', pb.organization_id,
      'shipping_clone_id', pb.shipping_clone_id,
      'shipping_provider_id', pb.shipping_provider_id,
      'shipping_method_type', pb.shipping_method_type,
      'category', CASE 
        WHEN pb.category_name IS NOT NULL THEN
          jsonb_build_object(
            'id', pb.category_id,
            'name', pb.category_name,
            'slug', pb.category_slug
          )
        ELSE null
      END,
      'subcategory', CASE 
        WHEN pb.subcategory_name IS NOT NULL THEN
          jsonb_build_object(
            'id', pb.subcategory_id,
            'name', pb.subcategory_name,
            'slug', pb.subcategory_slug
          )
        ELSE null
      END
    ),
    'colors', COALESCE(pcd.colors, '[]'::jsonb),
    'sizes', COALESCE(psd.sizes, '[]'::jsonb),
    'additional_images', COALESCE(pid.additional_images, '[]'::jsonb),
    'form_settings', fsd.form_settings,
    'marketing_settings', msd.marketing_settings,
    'reviews', COALESCE(prd.reviews, '[]'::jsonb),
    'shipping_data', jsonb_build_object(
      'provinces', COALESCE(spd.provinces, '[]'::jsonb),
      'provider_clones', COALESCE(spcd.provider_clones, '[]'::jsonb),
      'provider_settings', COALESCE(spsd.provider_settings, '[]'::jsonb),
      'default_provider', dspd.default_provider
    ),
    'organization_data', od.org_data,
    'store_settings', COALESCE(ssd.store_settings, '[]'::jsonb),
    'conversion_settings', csd.conversion_settings,
    'performance_info', jsonb_build_object(
      'query_timestamp', EXTRACT(EPOCH FROM NOW()),
      'product_id', v_product_id,
      'data_freshness', 'real_time'
    )
  ) INTO v_result
  FROM product_base pb
  LEFT JOIN product_colors_data pcd ON true
  LEFT JOIN product_sizes_data psd ON true
  LEFT JOIN product_images_data pid ON true
  LEFT JOIN form_settings_data fsd ON true
  LEFT JOIN marketing_settings_data msd ON true
  LEFT JOIN product_reviews_data prd ON true
  LEFT JOIN shipping_provinces_data spd ON true
  LEFT JOIN shipping_provider_clones_data spcd ON true
  LEFT JOIN shipping_provider_settings_data spsd ON true
  LEFT JOIN default_shipping_provider_data dspd ON true
  LEFT JOIN organization_data od ON true
  LEFT JOIN store_settings_data ssd ON true
  LEFT JOIN conversion_settings_data csd ON true;
  
  RETURN v_result;
END;
$$;

-- ===============================================================================
-- إنشاء الفهارس المحسنة للأداء
-- ===============================================================================

-- فهارس للمنتجات
CREATE INDEX IF NOT EXISTS idx_products_slug_org_active 
ON products (slug, organization_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_org_category_active 
ON products (organization_id, category_id) 
WHERE is_active = true;

-- فهارس لألوان المنتج
CREATE INDEX IF NOT EXISTS idx_product_colors_product_default 
ON product_colors (product_id, is_default DESC);

-- فهارس لمقاسات المنتج
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_color 
ON product_sizes (product_id, color_id, is_default DESC);

-- فهارس لصور المنتج
CREATE INDEX IF NOT EXISTS idx_product_images_product_sort 
ON product_images (product_id, sort_order);

-- فهارس لمراجعات المنتج (مُصحح)
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_approved_verified 
ON product_reviews (product_id, is_approved, is_verified_purchase DESC, created_at DESC) 
WHERE is_approved = true;

-- فهارس لإعدادات النماذج
CREATE INDEX IF NOT EXISTS idx_form_settings_org_active 
ON form_settings (organization_id, is_active) 
WHERE is_active = true;

-- فهارس لإعدادات التسويق (مُصحح - لا يوجد is_active)
CREATE INDEX IF NOT EXISTS idx_product_marketing_settings_product_org 
ON product_marketing_settings (product_id, organization_id);

-- فهارس لإعدادات المتجر
CREATE INDEX IF NOT EXISTS idx_store_settings_org_active_component 
ON store_settings (organization_id, is_active, component_type, order_index) 
WHERE is_active = true;

-- فهارس لمزودي الشحن المستنسخين
CREATE INDEX IF NOT EXISTS idx_shipping_provider_clones_org_active 
ON shipping_provider_clones (organization_id, is_active, created_at DESC) 
WHERE is_active = true;

-- فهارس لإعدادات مزودي الشحن
CREATE INDEX IF NOT EXISTS idx_shipping_provider_settings_org_enabled 
ON shipping_provider_settings (organization_id, is_enabled, created_at DESC) 
WHERE is_enabled = true;

-- فهرس للولايات القابلة للتوصيل
CREATE INDEX IF NOT EXISTS idx_yalidine_provinces_global_deliverable 
ON yalidine_provinces_global (is_deliverable, name) 
WHERE is_deliverable = true;

-- ===============================================================================
-- إنشاء دالة مساعدة للتحقق من صحة البيانات
-- ===============================================================================

CREATE OR REPLACE FUNCTION validate_product_page_data(p_slug TEXT, p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_validation JSONB;
BEGIN
  SELECT jsonb_build_object(
    'product_exists', EXISTS(
      SELECT 1 FROM products 
      WHERE slug = p_slug 
        AND organization_id = p_org_id 
        AND is_active = true
    ),
    'organization_exists', EXISTS(
      SELECT 1 FROM organizations 
      WHERE id = p_org_id
    ),
    'has_shipping_settings', EXISTS(
      SELECT 1 FROM shipping_provider_settings 
      WHERE organization_id = p_org_id 
        AND is_enabled = true
    ),
    'cache_key', format('product_page_%s_%s', p_org_id, p_slug),
    'validation_timestamp', EXTRACT(EPOCH FROM NOW())
  ) INTO v_validation;
  
  RETURN v_validation;
END;
$$;

-- ===============================================================================
-- منح الصلاحيات
-- ===============================================================================

GRANT EXECUTE ON FUNCTION get_ultra_optimized_product_page_data(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ultra_optimized_product_page_data(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_ultra_optimized_product_page_data(TEXT, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION validate_product_page_data(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_product_page_data(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION validate_product_page_data(TEXT, UUID) TO service_role;

-- ===============================================================================
-- تعليقات للتوثيق
-- ===============================================================================

COMMENT ON FUNCTION get_ultra_optimized_product_page_data(TEXT, UUID) IS 
'دالة محسنة لجلب جميع بيانات صفحة المنتج في استعلام واحد. 
تهدف لتقليل عدد الاستدعاءات من 16+ إلى استدعاء واحد فقط.
تتضمن: بيانات المنتج، الألوان، المقاسات، الصور، إعدادات النماذج والتسويق، 
بيانات الشحن، إعدادات المؤسسة والمتجر، وإعدادات التحويل.';

COMMENT ON FUNCTION validate_product_page_data(TEXT, UUID) IS 
'دالة مساعدة للتحقق من صحة البيانات قبل جلب بيانات صفحة المنتج.
مفيدة للتحقق السريع من وجود المنتج والمؤسسة.'; 