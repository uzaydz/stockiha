-- =====================================================
-- Optimized Inventory RPC Function
-- دالة محسّنة للمخزون - استدعاء واحد فقط
-- =====================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_inventory_optimized(uuid, text, text, text, integer, integer);

-- Create optimized function
CREATE OR REPLACE FUNCTION get_inventory_optimized(
  p_organization_id uuid,
  p_search text DEFAULT '',
  p_stock_filter text DEFAULT 'all',
  p_sort_by text DEFAULT 'name',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  name text,
  sku text,
  stock_quantity integer,
  price numeric,
  purchase_price numeric,
  thumbnail_image text,
  has_variants boolean,
  stock_status text,
  colors jsonb,
  variant_count integer,
  total_variant_stock integer,
  total_count bigint,
  filtered_count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_offset integer;
  v_total_count bigint;
  v_filtered_count bigint;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_page_size;
  
  -- Get total and filtered counts first (more efficient)
  WITH filtered_products AS (
    SELECT p.id
    FROM products p
    WHERE p.organization_id = p_organization_id
      AND p.is_active = true
      AND (
        p_search = '' OR
        p.name ILIKE '%' || p_search || '%' OR
        p.sku ILIKE '%' || p_search || '%' OR
        p.barcode ILIKE '%' || p_search || '%'
      )
      AND (
        p_stock_filter = 'all' OR
        (p_stock_filter = 'in-stock' AND p.stock_quantity > 5) OR
        (p_stock_filter = 'low-stock' AND p.stock_quantity > 0 AND p.stock_quantity <= 5) OR
        (p_stock_filter = 'out-of-stock' AND p.stock_quantity = 0)
      )
  )
  SELECT 
    COUNT(*) INTO v_filtered_count
  FROM filtered_products;
  
  SELECT COUNT(*) INTO v_total_count
  FROM products p
  WHERE p.organization_id = p_organization_id
    AND p.is_active = true;
  
  -- Return paginated results with colors and sizes
  RETURN QUERY
  WITH base_products AS (
    SELECT 
      p.id,
      p.name,
      p.sku,
      p.stock_quantity,
      p.price,
      p.purchase_price,
      p.thumbnail_image,
      p.has_variants,
      CASE 
        WHEN p.stock_quantity = 0 THEN 'out-of-stock'
        WHEN p.stock_quantity <= 5 THEN 'low-stock'
        ELSE 'in-stock'
      END as stock_status
    FROM products p
    WHERE p.organization_id = p_organization_id
      AND p.is_active = true
      AND (
        p_search = '' OR
        p.name ILIKE '%' || p_search || '%' OR
        p.sku ILIKE '%' || p_search || '%' OR
        p.barcode ILIKE '%' || p_search || '%'
      )
      AND (
        p_stock_filter = 'all' OR
        (p_stock_filter = 'in-stock' AND p.stock_quantity > 5) OR
        (p_stock_filter = 'low-stock' AND p.stock_quantity > 0 AND p.stock_quantity <= 5) OR
        (p_stock_filter = 'out-of-stock' AND p.stock_quantity = 0)
      )
    ORDER BY 
      CASE WHEN p_sort_by = 'name' THEN p.name END ASC,
      CASE WHEN p_sort_by = 'stock' THEN p.stock_quantity END DESC,
      CASE WHEN p_sort_by = 'price' THEN p.price END DESC,
      p.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset
  )
  SELECT 
    bp.id,
    bp.name,
    bp.sku,
    bp.stock_quantity,
    bp.price,
    bp.purchase_price,
    bp.thumbnail_image,
    bp.has_variants,
    bp.stock_status,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pc.id,
            'name', pc.name,
            'color_code', pc.color_code,
            'quantity', COALESCE(pc.quantity, 0),
            'has_sizes', COALESCE(pc.has_sizes, false),
            'sizes', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', ps.id,
                    'name', ps.size_name,
                    'quantity', COALESCE(ps.quantity, 0)
                  )
                  ORDER BY ps.created_at
                )
                FROM product_sizes ps
                WHERE ps.color_id = pc.id 
                  AND ps.product_id = bp.id
              ),
              '[]'::jsonb
            )
          )
          ORDER BY pc.created_at
        )
        FROM product_colors pc
        WHERE pc.product_id = bp.id
      ),
      '[]'::jsonb
    ) as colors,
    COALESCE(
      (
        SELECT COUNT(*)::integer
        FROM product_colors pc
        WHERE pc.product_id = bp.id
      ),
      0
    ) as variant_count,
    COALESCE(
      (
        SELECT SUM(pc.quantity)::integer
        FROM product_colors pc
        WHERE pc.product_id = bp.id
      ),
      0
    ) as total_variant_stock,
    v_total_count as total_count,
    v_filtered_count as filtered_count
  FROM base_products bp;
  
END;
$$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_org_active_stock 
  ON products(organization_id, is_active, stock_quantity) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_search 
  ON products(organization_id, name, sku, barcode) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_colors_product 
  ON product_colors(product_id);

CREATE INDEX IF NOT EXISTS idx_product_sizes_color_product 
  ON product_sizes(color_id, product_id);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_inventory_optimized TO authenticated;

COMMENT ON FUNCTION get_inventory_optimized IS 
'Optimized inventory function that returns products with colors and sizes in a single query.
Includes pagination and filtering. Does not include color images for better performance.';

