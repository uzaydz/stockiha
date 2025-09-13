-- 🚀 دالة إحضار صفحة منتجات المتجر مع الفئات والفئات الفرعية
-- ترجع JSONB: { products: [...], categories: [...], subcategories: [...], meta: {...} }

DROP FUNCTION IF EXISTS public.get_store_products_page(text, integer, integer, boolean, text, uuid, uuid, numeric, numeric, text);

CREATE OR REPLACE FUNCTION public.get_store_products_page(
  org_identifier text,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 48,
  p_include_inactive boolean DEFAULT false,
  p_search text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_subcategory_id uuid DEFAULT NULL,
  p_min_price numeric DEFAULT 0,
  p_max_price numeric DEFAULT 1000000000,
  p_sort text DEFAULT 'newest'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_offset integer;
  v_total_count integer;
  v_total_pages integer;
  v_result jsonb;
BEGIN
  -- حل معرف المؤسسة: يدعم id أو subdomain أو domain (مع شطب www)
  SELECT o.id INTO v_org_id
  FROM organizations o
  WHERE (
    o.id::text = org_identifier
    OR o.subdomain = org_identifier
    OR o.domain = org_identifier
    OR o.domain = CASE WHEN org_identifier LIKE 'www.%' THEN substring(org_identifier from 5) ELSE NULL END
  )
  AND o.subscription_status = 'active'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN json_build_object(
      'error', 'Organization not found',
      'message', 'No active organization found with identifier: ' || org_identifier
    );
  END IF;

  -- حساب الإزاحة والعدد الكلي
  v_offset := GREATEST(0, (COALESCE(p_page, 1) - 1) * COALESCE(p_page_size, 48));

  WITH base_products AS (
    SELECT p.*
    FROM products p
    WHERE p.organization_id = v_org_id
      AND (p_include_inactive OR p.is_active = TRUE)
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_subcategory_id IS NULL OR p.subcategory_id = p_subcategory_id)
      AND (p.price BETWEEN COALESCE(p_min_price, 0) AND COALESCE(p_max_price, 1000000000))
      AND (
        p_search IS NULL OR p_search = '' OR 
        p.name ILIKE '%' || p_search || '%' OR p.description ILIKE '%' || p_search || '%'
      )
  ), counted AS (
    SELECT COUNT(*)::int AS cnt FROM base_products
  ), ordered AS (
    SELECT 
      bp.id,
      bp.name,
      bp.slug,
      bp.description,
      bp.price,
      bp.compare_at_price,
      bp.sku,
      bp.stock_quantity,
      bp.is_featured,
      bp.is_active,
      bp.thumbnail_image,
      bp.images,
      bp.organization_id,
      bp.category_id,
      bp.subcategory_id,
      bp.created_at,
      bp.updated_at,
      json_build_object('id', c.id, 'name', c.name, 'slug', c.slug) AS category,
      json_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug) AS subcategory
    FROM base_products bp
    LEFT JOIN product_categories c ON bp.category_id = c.id
    LEFT JOIN product_subcategories sc ON bp.subcategory_id = sc.id
    ORDER BY 
      CASE WHEN p_sort = 'name_asc' THEN bp.name END ASC,
      CASE WHEN p_sort = 'name_desc' THEN bp.name END DESC,
      CASE WHEN p_sort = 'price_low' THEN bp.price END ASC,
      CASE WHEN p_sort = 'price_high' THEN bp.price END DESC,
      CASE WHEN p_sort = 'newest' THEN bp.created_at END DESC,
      bp.created_at DESC
    OFFSET v_offset LIMIT COALESCE(p_page_size, 48)
  ), categories_data AS (
    SELECT pc.id, pc.name, pc.slug, pc.image_url, pc.is_active
    FROM product_categories pc
    WHERE pc.organization_id = v_org_id AND pc.is_active = TRUE
    ORDER BY pc.name ASC
  ), subcategories_data AS (
    SELECT psc.id, psc.category_id, psc.name, psc.slug, psc.is_active
    FROM product_subcategories psc
    JOIN product_categories pc ON psc.category_id = pc.id
    WHERE pc.organization_id = v_org_id AND psc.is_active = TRUE
    ORDER BY psc.name ASC
  )
  SELECT json_build_object(
    'products', COALESCE((SELECT json_agg(row_to_json(o)) FROM ordered o), '[]'::json),
    'categories', COALESCE((SELECT json_agg(row_to_json(cd)) FROM categories_data cd), '[]'::json),
    'subcategories', COALESCE((SELECT json_agg(row_to_json(sd)) FROM subcategories_data sd), '[]'::json),
    'meta', json_build_object(
      'total_count', (SELECT cnt FROM counted),
      'total_pages', CEIL((SELECT cnt FROM counted)::numeric / NULLIF(COALESCE(p_page_size, 48), 0))::int,
      'current_page', COALESCE(p_page, 1),
      'page_size', COALESCE(p_page_size, 48)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
