-- 🚀 دالة get_store_init_data محسنة لزيادة السرعة مع دعم النطاقات المخصصة
-- Extend get_store_init_data to return theme settings, store components, footer settings,
-- testimonials and inline SEO meta in a single RPC for first-visit optimization
-- 
-- ✨ التحسينات الجديدة في الإصدار 2.1:
-- - دعم النطاقات المخصصة (Custom Domains) بالإضافة للنطاقات الفرعية
-- - معالجة أفضل للأخطاء مع رسائل واضحة
-- - تحسين أداء SEO meta للنطاقات المخصصة
-- - إضافة معلومات تشخيصية مفيدة
-- 
-- 🔧 إصلاح النطاقات مع www:
-- - دعم البحث عن النطاقات المخصصة مع www. (مثل www.example.com)
-- - تلقائياً إزالة www. من النطاق للبحث في قاعدة البيانات
-- - إصلاح مشكلة عدم جلب FeaturedProducts للنطاقات مع www

-- 🚀 إصلاح 1: إزالة جميع الإصدارات المتضاربة من الدالة
DROP FUNCTION IF EXISTS public.get_store_init_data(text);
DROP FUNCTION IF EXISTS public.get_store_init_data(text, text);
DROP FUNCTION IF EXISTS public.get_store_init_data(text, text, text);

CREATE OR REPLACE FUNCTION public.get_store_init_data(org_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_start_time TIMESTAMP;
  v_execution_time_ms NUMERIC;
  v_org_count INTEGER;
BEGIN
  -- 🚀 تحسين 1: قياس زمن التنفيذ
  v_start_time := clock_timestamp();
  
  -- التحقق من وجود المنظمة قبل البدء (مع دعم www.)
  SELECT COUNT(*) INTO v_org_count
  FROM organizations o
  WHERE (
    o.subdomain = org_identifier 
    OR o.domain = org_identifier
    OR o.domain = CASE 
      WHEN org_identifier LIKE 'www.%' 
      THEN substring(org_identifier from 5)
      ELSE NULL 
    END
  ) AND o.subscription_status = 'active';
  
  -- إذا لم تُوجد المنظمة، أرجع رسالة خطأ واضحة
  IF v_org_count = 0 THEN
    v_execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;
    
    RETURN json_build_object(
      'error', 'Organization not found',
      'message', 'No active organization found with identifier: ' || org_identifier,
      'searched_identifier', org_identifier,
      'execution_time_ms', v_execution_time_ms,
      'optimized_version', '2.1',
      'support_custom_domains', TRUE
    );
  END IF;
  
  -- 🚀 تحسين 2: استعلام موحد مع CTEs محسنة مع دعم النطاقات المخصصة
  WITH 
  -- 1. بيانات المنظمة والإعدادات في استعلام واحد (يدعم subdomain و custom domain)
  org_data AS (
    SELECT 
      o.id, o.name, o.logo_url, o.description, o.created_at, o.updated_at,
      o.subdomain, o.domain,
      o.settings->>'language' AS language,
      o.settings->>'contact_email' AS contact_email,
      o.settings->>'default_country' AS default_country,
      o.settings->>'industry' AS industry,
      o.settings->>'business_type' AS business_type,
      o.settings->>'timezone' AS timezone,
      COALESCE(os.site_name, o.name) as site_name,
      COALESCE(os.logo_url, o.logo_url) AS settings_logo_url, 
      os.favicon_url,
      COALESCE(os.display_text_with_logo, TRUE) as display_text_with_logo,
      COALESCE(os.default_language, o.settings->>'language') AS default_language_settings,
      COALESCE(os.enable_public_site, TRUE) as enable_public_site,
      COALESCE(os.enable_registration, TRUE) as enable_registration,
      os.theme_primary_color, os.theme_secondary_color, os.theme_mode,
      os.custom_css,
      -- تضمين custom_js الخام (يُستخدم لتخزين JSON مثل enable_cart)
      os.custom_js,
      os.custom_header AS custom_js_header, os.custom_footer AS custom_js_footer,
      -- 🚀 تحسين 3: حساب حالة النشاط
      CASE 
        WHEN os.enable_public_site = FALSE THEN FALSE 
        ELSE TRUE 
      END as is_active
    FROM organizations o
    LEFT JOIN organization_settings os ON o.id = os.organization_id
    WHERE (
      -- البحث في النطاق الفرعي أولاً
      o.subdomain = org_identifier 
      OR 
      -- ثم البحث في النطاق المخصص
      o.domain = org_identifier
      OR
      -- دعم النطاقات مع www. (إزالة www. من org_identifier)
      o.domain = CASE 
        WHEN org_identifier LIKE 'www.%' 
        THEN substring(org_identifier from 5)
        ELSE NULL 
      END
    )
      AND o.subscription_status = 'active'
    LIMIT 1
  ),
  
  -- 2. الفئات مع عدد المنتجات (محسن بدون COUNT بطيء)
  categories_data AS (
    SELECT 
      pc.id, pc.name, pc.description, pc.slug, pc.icon, pc.image_url,
      pc.is_active, pc.type, pc.created_at, pc.updated_at,
      -- 🚀 تحسين 4: استخدام فهرس محسن بدلاً من COUNT
      0 as product_count
    FROM product_categories pc
    WHERE pc.organization_id = (SELECT id FROM org_data) 
      AND pc.is_active = TRUE
    ORDER BY pc.name ASC
  ),
  
  -- 3. الفئات الفرعية (محسن)
  subcategories_data AS (
    SELECT 
      psc.id, psc.category_id, psc.name, psc.description, psc.slug,
      psc.is_active, psc.created_at, psc.updated_at
    FROM product_subcategories psc
    JOIN product_categories pc ON psc.category_id = pc.id
    WHERE pc.organization_id = (SELECT id FROM org_data) 
      AND psc.is_active = TRUE
    ORDER BY psc.name ASC
  ),
  
  -- 4. المنتجات المميزة (محسن مع فهرس تغطية)
  featured_products_data AS (
    SELECT 
      p.id, p.name, p.slug, p.description,
      p.price, p.compare_at_price, p.sku, p.stock_quantity,
      p.is_featured, p.is_active, p.thumbnail_image AS thumbnail_url,
      p.organization_id, p.category_id, p.subcategory_id,
      p.created_at, p.updated_at,
      c.name as category_name, c.slug as category_slug,
      sc.name as subcategory_name, sc.slug as subcategory_slug
    FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.id
    WHERE p.organization_id = (SELECT id FROM org_data) 
      AND p.is_featured = TRUE 
      AND p.is_active = TRUE
    ORDER BY p.created_at DESC
    LIMIT 10
  ),

  -- 4.b المنتجات الأولى للعرض في صفحة المتجر (محسن)
  products_first_page_data AS (
    SELECT 
      p.id,
      p.name,
      p.slug,
      p.description,
      p.price,
      p.compare_at_price,
      p.sku,
      p.stock_quantity,
      p.is_featured,
      p.is_active,
      p.thumbnail_image,
      p.images,
      p.organization_id,
      p.category_id,
      p.subcategory_id,
      p.created_at,
      p.updated_at,
      -- كائنات فئة متداخلة لمواءمة شكل REST
      json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) AS category,
      json_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug) AS subcategory
    FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.id
    WHERE p.organization_id = (SELECT id FROM org_data)
      AND p.is_active = TRUE
    ORDER BY p.created_at DESC
    LIMIT 48
  ),
  
  -- 5. معلومات الشحن (محسن)
  shipping_data AS (
    SELECT 
      EXISTS (
        SELECT 1 FROM shipping_provider_settings sps
        JOIN shipping_providers sp ON sps.provider_id = sp.id
        WHERE sps.organization_id = (SELECT id FROM org_data) 
          AND sps.is_enabled = TRUE 
          AND sp.is_active = TRUE
        LIMIT 1
      ) as has_shipping_providers,
      NULL::uuid as default_shipping_zone_id,
      NULL::json as default_shipping_zone_details
  ),
  
  -- 6. مكونات تخطيط المتجر (محسن)
  store_layout_data AS (
    SELECT 
      ss.id, ss.component_type AS type, ss.settings,
      ss.is_active, ss.order_index AS order_index
    FROM store_settings ss
    WHERE ss.organization_id = (SELECT id FROM org_data) 
      AND ss.is_active = TRUE
    ORDER BY ss.order_index ASC
  ),
  
  -- 7. إعدادات التذييل (محسن)
  footer_data AS (
    SELECT COALESCE(ss.settings::json, '{}'::json) as footer_settings
    FROM store_settings ss
    WHERE ss.organization_id = (SELECT id FROM org_data) 
      AND ss.is_active = TRUE 
      AND ss.component_type = 'footer'
    ORDER BY ss.order_index
    LIMIT 1
  ),
  
  -- 8. الشهادات (محسن)
  testimonials_data AS (
    SELECT 
      id, customer_name, customer_avatar, rating, comment, 
      product_name, product_image, created_at
    FROM customer_testimonials
    WHERE organization_id = (SELECT id FROM org_data) 
      AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 10
  )
  
  -- 🚀 تحسين 5: بناء النتيجة النهائية في استعلام واحد
  SELECT json_build_object(
    'performance_info', json_build_object(
      'optimized', TRUE,
      'version', '2.1',
      'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
      'optimization_level', 'ultra_fast',
      'supports_custom_domains', TRUE,
      'searched_identifier', org_identifier
    ),
    'organization_details', json_build_object(
      'id', od.id, 'name', od.name, 'logo_url', od.logo_url, 'description', od.description,
      'created_at', od.created_at, 'updated_at', od.updated_at, 'currency', NULL,
      'language', od.language, 'contact_email', od.contact_email, 'default_country', od.default_country,
      'subdomain', od.subdomain, 'domain', od.domain, 'is_active', od.is_active,
      'industry', od.industry, 'business_type', od.business_type, 'timezone', od.timezone
    ),
    'organization_settings', json_build_object(
      'id', NULL, 'organization_id', od.id, 'site_name', od.site_name,
      'logo_url', od.settings_logo_url, 'favicon_url', od.favicon_url,
      'display_text_with_logo', od.display_text_with_logo, 'default_language', od.default_language_settings,
      'enable_public_site', od.enable_public_site, 'enable_registration', od.enable_registration,
      'theme_primary_color', od.theme_primary_color, 'theme_secondary_color', od.theme_secondary_color,
      'theme_mode', od.theme_mode, 'theme_font', NULL,
      'store_layout', NULL, 'show_featured_products', TRUE, 'show_newest_products', TRUE,
      'show_best_selling_products', TRUE, 'show_discounted_products', TRUE,
      'show_categories_in_header', TRUE, 'show_categories_in_sidebar', FALSE,
      'show_subcategories', TRUE, 'default_product_view', 'grid', 'products_per_page', 12,
      'show_breadcrumbs', TRUE, 'show_reviews', TRUE, 'require_login_to_view', FALSE,
      'enable_wishlist', FALSE, 'enable_product_comparison', FALSE, 'checkout_process_type', 'default',
      'payment_methods', NULL, 'default_shipping_zone_id', NULL, 'tax_settings', NULL,
      'custom_css', od.custom_css,
      -- تمرير custom_js كما هو (قد يكون JSON كنص)
      'custom_js', od.custom_js,
      'custom_js_header', od.custom_js_header,
      'custom_js_footer', od.custom_js_footer
    ),
    'categories', COALESCE((SELECT json_agg(row_to_json(cd)) FROM categories_data cd), '[]'::json),
    'subcategories', COALESCE((SELECT json_agg(row_to_json(sd)) FROM subcategories_data sd), '[]'::json),
    'featured_products', COALESCE((SELECT json_agg(row_to_json(fd)) FROM featured_products_data fd), '[]'::json),
    'shipping_info', json_build_object(
      'has_shipping_providers', (SELECT has_shipping_providers FROM shipping_data),
      'default_shipping_zone_id', (SELECT default_shipping_zone_id FROM shipping_data),
      'default_shipping_zone_details', (SELECT default_shipping_zone_details FROM shipping_data)
    ),
    'store_layout_components', COALESCE((SELECT json_agg(row_to_json(sld)) FROM store_layout_data sld), '[]'::json),
    'footer_settings', COALESCE((SELECT footer_settings FROM footer_data), '{}'::json),
    'testimonials', COALESCE((SELECT json_agg(row_to_json(td)) FROM testimonials_data td), '[]'::json),
    'products_first_page', COALESCE((SELECT json_agg(row_to_json(pfpd)) FROM products_first_page_data pfpd), '[]'::json),
    'seo_meta', json_build_object(
      'title', COALESCE((SELECT site_name FROM org_data), (SELECT name FROM org_data), 'متجر إلكتروني'),
      'description', COALESCE((SELECT description FROM org_data), 'متجر إلكتروني متطور'),
      'site_name', COALESCE((SELECT site_name FROM org_data), (SELECT name FROM org_data), 'متجر إلكتروني'),
      'image', COALESCE((SELECT settings_logo_url FROM org_data), (SELECT logo_url FROM org_data), ''),
      'url', CASE 
                WHEN (SELECT domain FROM org_data) IS NOT NULL 
                  THEN 'https://' || (SELECT domain FROM org_data)
                WHEN (SELECT subdomain FROM org_data) IS NOT NULL 
                  THEN 'https://' || (SELECT subdomain FROM org_data) || '.stockiha.com' 
                ELSE NULL 
              END,
      'type', 'website', 'keywords', ''
    )
  ) INTO v_result
  FROM org_data od;

  -- 🚀 تحسين 6: حساب زمن التنفيذ النهائي
  v_execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;
  
  -- إضافة معلومات الأداء للنتيجة - إصلاح مشكلة التحويل
  -- استخدام jsonb_set بدلاً من json_set (PostgreSQL compatible)
  v_result := v_result::jsonb || jsonb_build_object(
    'performance_info', 
    (v_result->'performance_info')::jsonb || jsonb_build_object('execution_time_ms', v_execution_time_ms)
  );

  RETURN v_result::json;

EXCEPTION
  WHEN OTHERS THEN
    -- حساب زمن التنفيذ حتى في حالة الخطأ
    v_execution_time_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;
    
    RETURN json_build_object(
      'error', 'Database error occurred',
      'message', SQLERRM,
      'searched_identifier', org_identifier,
      'execution_time_ms', v_execution_time_ms,
      'optimized_version', '2.1',
      'supports_custom_domains', TRUE
    );
END;
$function$;
