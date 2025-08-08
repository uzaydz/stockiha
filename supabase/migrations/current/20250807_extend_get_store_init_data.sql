-- Extend get_store_init_data to return theme settings, store components, footer settings,
-- testimonials and inline SEO meta in a single RPC for first-visit optimization

CREATE OR REPLACE FUNCTION public.get_store_init_data(org_subdomain text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  -- Organization
  v_org_id UUID;
  v_org_name TEXT;
  v_org_logo_url TEXT;
  v_org_description TEXT;
  v_org_created_at TIMESTAMPTZ;
  v_org_updated_at TIMESTAMPTZ;
  v_org_currency TEXT;
  v_org_language TEXT;
  v_org_contact_email TEXT;
  v_org_default_country TEXT;
  v_org_subdomain_db TEXT;
  v_org_domain TEXT;
  v_org_is_active BOOLEAN;
  v_org_industry TEXT;
  v_org_business_type TEXT;
  v_org_timezone TEXT;

  -- Organization settings (columns)
  v_settings_id UUID;
  v_site_name TEXT;
  v_settings_logo_url TEXT;
  v_favicon_url TEXT;
  v_display_text_with_logo BOOLEAN;
  v_default_language_settings TEXT;
  v_enable_public_site BOOLEAN;
  v_enable_registration BOOLEAN;
  v_theme_primary_color TEXT;
  v_theme_secondary_color TEXT;
  v_theme_mode TEXT;
  v_custom_css TEXT;
  v_custom_js_header TEXT;
  v_custom_js_footer TEXT;

  -- Store logical config (safe defaults)
  v_store_layout TEXT := NULL;
  v_show_featured_products BOOLEAN := TRUE;
  v_show_newest_products BOOLEAN := TRUE;
  v_show_best_selling_products BOOLEAN := TRUE;
  v_show_discounted_products BOOLEAN := TRUE;
  v_show_categories_in_header BOOLEAN := TRUE;
  v_show_categories_in_sidebar BOOLEAN := FALSE;
  v_show_subcategories BOOLEAN := TRUE;
  v_default_product_view TEXT := 'grid';
  v_products_per_page INT := 12;
  v_show_breadcrumbs BOOLEAN := TRUE;
  v_show_reviews BOOLEAN := TRUE;
  v_require_login_to_view BOOLEAN := FALSE;
  v_enable_wishlist BOOLEAN := FALSE;
  v_enable_product_comparison BOOLEAN := FALSE;
  v_checkout_process_type TEXT := 'default';
  v_payment_methods JSONB := NULL;
  v_default_shipping_zone_id_settings UUID := NULL;
  v_tax_settings JSONB := NULL;

  -- Aggregates
  v_categories_json JSON;
  v_subcategories_json JSON;
  v_featured_products_json JSON;
  v_store_layout_components_json JSON;

  -- Footer + Testimonials + SEO
  v_footer_settings_json JSON := '{}'::json;
  v_testimonials_json JSON := '[]'::json;
  v_seo_json JSON := '{}'::json;

  -- Shipping
  v_has_shipping_providers BOOLEAN;
  v_actual_default_shipping_zone_id UUID;
  v_default_shipping_zone_details JSON;
BEGIN
  -- 1) Organization
  SELECT
    o.id, o.name, o.logo_url, o.description, o.created_at, o.updated_at,
    NULL AS currency,
    o.settings->>'language' AS language,
    o.settings->>'contact_email' AS contact_email,
    o.settings->>'default_country' AS default_country,
    o.subdomain, o.domain,
    o.settings->>'industry' AS industry,
    o.settings->>'business_type' AS business_type,
    o.settings->>'timezone' AS timezone
  INTO
    v_org_id, v_org_name, v_org_logo_url, v_org_description, v_org_created_at, v_org_updated_at,
    v_org_currency,
    v_org_language,
    v_org_contact_email,
    v_org_default_country,
    v_org_subdomain_db, v_org_domain,
    v_org_industry,
    v_org_business_type,
    v_org_timezone
  FROM organizations o
  WHERE o.subdomain = org_subdomain
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN json_build_object('error', 'Organization not found for subdomain: ' || org_subdomain);
  END IF;

  v_org_is_active := TRUE;

  -- 2) Organization Settings
  SELECT
    os.id,
    os.site_name,
    os.logo_url,
    os.favicon_url,
    os.display_text_with_logo,
    os.default_language,
    os.enable_public_site,
    os.enable_registration,
    os.theme_primary_color,
    os.theme_secondary_color,
    os.theme_mode,
    os.custom_css,
    os.custom_header,
    os.custom_footer
  INTO
    v_settings_id,
    v_site_name,
    v_settings_logo_url,
    v_favicon_url,
    v_display_text_with_logo,
    v_default_language_settings,
    v_enable_public_site,
    v_enable_registration,
    v_theme_primary_color,
    v_theme_secondary_color,
    v_theme_mode,
    v_custom_css,
    v_custom_js_header,
    v_custom_js_footer
  FROM organization_settings os
  WHERE os.organization_id = v_org_id
  LIMIT 1;

  IF v_settings_id IS NOT NULL AND v_enable_public_site IS FALSE THEN
    v_org_is_active := FALSE;
  END IF;

  -- 3) Categories
  SELECT COALESCE(json_agg(c_agg ORDER BY c_agg.name ASC), '[]'::json)
  INTO v_categories_json
  FROM (
    SELECT
      pc.id, pc.name, pc.description, pc.slug, pc.icon, pc.image_url,
      pc.is_active, pc.type, pc.created_at, pc.updated_at,
      (SELECT COUNT(*) FROM products p_count
       WHERE p_count.category_id = pc.id
         AND p_count.is_active = TRUE
         AND p_count.organization_id = v_org_id) as product_count
    FROM product_categories pc
    WHERE pc.organization_id = v_org_id AND pc.is_active = TRUE
  ) c_agg;

  -- 4) Subcategories
  SELECT COALESCE(json_agg(sc_agg ORDER BY sc_agg.name ASC), '[]'::json)
  INTO v_subcategories_json
  FROM (
    SELECT
      psc.id, psc.category_id, psc.name, psc.description, psc.slug,
      NULL AS icon,
      NULL AS image_url,
      psc.is_active,
      psc.created_at, psc.updated_at
    FROM product_subcategories psc
    JOIN product_categories pc_join ON psc.category_id = pc_join.id
    WHERE pc_join.organization_id = v_org_id AND psc.is_active = TRUE
  ) sc_agg;

  -- 5) Featured products
  SELECT COALESCE(json_agg(fp_agg ORDER BY fp_agg.created_at DESC), '[]'::json)
  INTO v_featured_products_json
  FROM (
    SELECT
      p.id, p.name, p.slug, p.description,
      p.price,
      p.compare_at_price,
      p.sku, p.stock_quantity,
      p.is_featured, p.is_active,
      p.thumbnail_image AS thumbnail_url,
      p.organization_id, p.category_id, p.subcategory_id,
      p.created_at, p.updated_at,
      c.name as category_name, c.slug as category_slug,
      sc.name as subcategory_name, sc.slug as subcategory_slug
    FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    LEFT JOIN product_subcategories sc ON p.subcategory_id = sc.id
    WHERE p.organization_id = v_org_id AND p.is_featured = TRUE AND p.is_active = TRUE
    LIMIT 10
  ) fp_agg;

  -- 6) Shipping
  SELECT EXISTS (
    SELECT 1 FROM shipping_provider_settings sps
    JOIN shipping_providers sp ON sps.provider_id = sp.id
    WHERE sps.organization_id = v_org_id AND sps.is_enabled = TRUE AND sp.is_active = TRUE
  ) INTO v_has_shipping_providers;

  v_actual_default_shipping_zone_id := v_default_shipping_zone_id_settings;

  IF v_actual_default_shipping_zone_id IS NOT NULL THEN
    SELECT json_build_object(
      'id', sz.id, 'name', sz.name, 'countries', sz.countries,
      'is_active', sz.is_active, 'description', sz.description
    ) INTO v_default_shipping_zone_details
    FROM shipping_zones sz
    WHERE sz.id = v_actual_default_shipping_zone_id AND sz.organization_id = v_org_id AND sz.is_active = TRUE;
  ELSE
    v_default_shipping_zone_details = NULL;
  END IF;

  -- 7) Store layout components (unquoted identifiers to avoid escaping issues)
  SELECT COALESCE(json_agg(slc_agg ORDER BY slc_agg.order_index ASC), '[]'::json)
  INTO v_store_layout_components_json
  FROM (
    SELECT
      ss.id,
      ss.component_type AS type,
      ss.settings,
      ss.is_active AS is_active,
      ss.order_index AS order_index
    FROM store_settings ss
    WHERE ss.organization_id = v_org_id AND ss.is_active = TRUE
  ) slc_agg;

  -- 8) Footer settings
  SELECT COALESCE(to_json(fs.settings), '{}'::json)
  INTO v_footer_settings_json
  FROM (
    SELECT ss.settings
    FROM store_settings ss
    WHERE ss.organization_id = v_org_id AND ss.is_active = TRUE AND ss.component_type = 'footer'
    ORDER BY ss.order_index
    LIMIT 1
  ) fs;

  -- 9) Testimonials (latest 10)
  SELECT COALESCE(json_agg(t_agg ORDER BY t_agg.created_at DESC), '[]'::json)
  INTO v_testimonials_json
  FROM (
    SELECT id, customer_name, customer_avatar, rating, comment, product_name, product_image, created_at
    FROM customer_testimonials
    WHERE organization_id = v_org_id AND is_active = TRUE
    LIMIT 10
  ) t_agg;

  -- 10) Inline SEO meta
  v_seo_json := json_build_object(
    'title', COALESCE(v_site_name, v_org_name, 'متجر إلكتروني'),
    'description', COALESCE(v_org_description, 'متجر إلكتروني متطور'),
    'site_name', COALESCE(v_site_name, v_org_name, 'متجر إلكتروني'),
    'image', COALESCE(v_settings_logo_url, v_org_logo_url, ''),
    'url', CASE WHEN v_org_subdomain_db IS NOT NULL THEN 'https://' || v_org_subdomain_db || '.stockiha.com' ELSE NULL END,
    'type', 'website',
    'keywords', ''
  );

  -- 11) Final JSON
  RETURN json_build_object(
    'organization_details', json_build_object(
      'id', v_org_id, 'name', v_org_name, 'logo_url', v_org_logo_url, 'description', v_org_description,
      'created_at', v_org_created_at, 'updated_at', v_org_updated_at, 'currency', v_org_currency,
      'language', v_org_language, 'contact_email', v_org_contact_email, 'default_country', v_org_default_country,
      'subdomain', v_org_subdomain_db, 'domain', v_org_domain, 'is_active', v_org_is_active,
      'industry', v_org_industry, 'business_type', v_org_business_type, 'timezone', v_org_timezone
    ),
    'organization_settings', json_build_object(
      'id', v_settings_id, 'organization_id', v_org_id, 'site_name', v_site_name,
      'logo_url', v_settings_logo_url, 'favicon_url', v_favicon_url,
      'display_text_with_logo', v_display_text_with_logo, 'default_language', v_default_language_settings,
      'enable_public_site', v_enable_public_site, 'enable_registration', v_enable_registration,
      'theme_primary_color', v_theme_primary_color, 'theme_secondary_color', v_theme_secondary_color,
      'theme_mode', v_theme_mode,
      'theme_font', NULL,
      'store_layout', v_store_layout,
      'show_featured_products', v_show_featured_products,
      'show_newest_products', v_show_newest_products,
      'show_best_selling_products', v_show_best_selling_products,
      'show_discounted_products', v_show_discounted_products,
      'show_categories_in_header', v_show_categories_in_header,
      'show_categories_in_sidebar', v_show_categories_in_sidebar,
      'show_subcategories', v_show_subcategories,
      'default_product_view', v_default_product_view,
      'products_per_page', v_products_per_page,
      'show_breadcrumbs', v_show_breadcrumbs,
      'show_reviews', v_show_reviews,
      'require_login_to_view', v_require_login_to_view,
      'enable_wishlist', v_enable_wishlist,
      'enable_product_comparison', v_enable_product_comparison,
      'checkout_process_type', v_checkout_process_type,
      'payment_methods', v_payment_methods,
      'default_shipping_zone_id', v_actual_default_shipping_zone_id,
      'tax_settings', v_tax_settings,
      'custom_css', v_custom_css,
      'custom_js_header', v_custom_js_header,
      'custom_js_footer', v_custom_js_footer
    ),
    'categories', v_categories_json,
    'subcategories', v_subcategories_json,
    'featured_products', v_featured_products_json,
    'shipping_info', json_build_object(
      'has_shipping_providers', v_has_shipping_providers,
      'default_shipping_zone_id', v_actual_default_shipping_zone_id,
      'default_shipping_zone_details', v_default_shipping_zone_details
    ),
    'store_layout_components', v_store_layout_components_json,
    'footer_settings', v_footer_settings_json,
    'testimonials', v_testimonials_json,
    'seo_meta', v_seo_json
  );
END;
$function$;


