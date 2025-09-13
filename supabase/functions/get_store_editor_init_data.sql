-- get_store_editor_init_data: returns all store-editor bootstrap data in one call
-- Input: p_organization_id (UUID)
-- Output: jsonb with keys: organization_details, organization_settings, store_layout_components,
--         categories, subcategories, featured_products, shipping_info, performance_info

CREATE OR REPLACE FUNCTION public.get_store_editor_init_data(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time timestamp := clock_timestamp();
BEGIN
  IF p_organization_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'organization_id_required'
    );
  END IF;

  WITH
  org_data AS (
    SELECT 
      o.id,
      o.name,
      o.subdomain,
      o.domain,
      o.logo_url,
      o.description,
      o.created_at,
      o.updated_at
    FROM organizations o
    WHERE o.id = p_organization_id
    LIMIT 1
  ),
  org_settings AS (
    SELECT 
      os.*
    FROM organization_settings os
    WHERE os.organization_id = p_organization_id
    LIMIT 1
  ),
  categories_data AS (
    SELECT 
      pc.id,
      pc.name,
      pc.description,
      pc.slug,
      pc.icon,
      pc.image_url,
      pc.is_active,
      pc.type,
      pc.created_at,
      pc.updated_at
    FROM product_categories pc
    WHERE pc.organization_id = p_organization_id AND pc.is_active = TRUE
    ORDER BY pc.name ASC
  ),
  subcategories_data AS (
    SELECT 
      psc.id,
      psc.category_id,
      psc.name,
      psc.description,
      psc.slug,
      psc.icon,
      psc.image_url,
      psc.is_active,
      psc.created_at,
      psc.updated_at
    FROM product_subcategories psc
    WHERE psc.organization_id = p_organization_id AND psc.is_active = TRUE
    ORDER BY psc.name ASC
  ),
  featured_products_data AS (
    SELECT 
      p.id,
      p.name,
      p.slug,
      p.description,
      p.price,
      p.compare_at_price,
      p.thumbnail_image,
      p.is_featured,
      p.is_new,
      p.stock_quantity,
      p.created_at,
      p.updated_at
    FROM products p
    WHERE p.organization_id = p_organization_id
      AND p.is_active = TRUE
      AND p.is_featured = TRUE
    ORDER BY p.created_at DESC
    LIMIT 12
  ),
  store_layout_data AS (
    SELECT 
      ss.id,
      ss.component_type,
      ss.settings,
      ss.is_active,
      ss.order_index
    FROM store_settings ss
    WHERE ss.organization_id = p_organization_id
      AND ss.is_active = TRUE
    ORDER BY ss.order_index ASC
  ),
  testimonials_data AS (
    SELECT 
      id,
      customer_name,
      customer_avatar,
      rating,
      comment,
      product_name,
      product_image,
      created_at
    FROM customer_testimonials
    WHERE organization_id = p_organization_id AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 12
  ),
  shipping_data AS (
    SELECT EXISTS (
      SELECT 1
      FROM shipping_provider_settings sps
      JOIN shipping_providers sp ON sp.id = sps.provider_id
      WHERE sps.organization_id = p_organization_id
        AND sps.is_enabled = TRUE
        AND sp.is_active = TRUE
      LIMIT 1
    ) AS has_shipping_providers
  )
  SELECT jsonb_build_object(
    'organization_details', to_jsonb(od),
    'organization_settings', to_jsonb(os),
    'categories', COALESCE((SELECT jsonb_agg(to_jsonb(cd)) FROM categories_data cd), '[]'::jsonb),
    'subcategories', COALESCE((SELECT jsonb_agg(to_jsonb(sd)) FROM subcategories_data sd), '[]'::jsonb),
    'featured_products', COALESCE((SELECT jsonb_agg(to_jsonb(fp)) FROM featured_products_data fp), '[]'::jsonb),
    'store_layout_components', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sld.id,
        'type', sld.component_type,
        'settings', sld.settings,
        'is_active', sld.is_active,
        'order_index', sld.order_index
      )) FROM store_layout_data sld
    ), '[]'::jsonb),
    'testimonials', COALESCE((SELECT jsonb_agg(to_jsonb(td)) FROM testimonials_data td), '[]'::jsonb),
    'shipping_info', jsonb_build_object(
      'has_shipping_providers', (SELECT has_shipping_providers FROM shipping_data),
      'default_shipping_zone_id', NULL,
      'default_shipping_zone_details', NULL
    ),
    'performance_info', jsonb_build_object(
      'version', '1.0',
      'execution_time_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
      'unified', TRUE
    )
  )
  FROM org_data od
  LEFT JOIN org_settings os ON TRUE
  LIMIT 1;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM
  );
END;
$$;
