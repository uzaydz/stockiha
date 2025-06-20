-- دالة متقدمة لجلب المنتجات مع Pagination والفلترة
CREATE OR REPLACE FUNCTION get_pos_products_paginated(
  p_organization_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50,
  p_search_query TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'name',
  p_sort_order TEXT DEFAULT 'ASC',
  p_include_variants BOOLEAN DEFAULT TRUE
) 
RETURNS TABLE (
  products JSONB,
  total_count BIGINT,
  page_count INTEGER,
  current_page INTEGER,
  has_next_page BOOLEAN
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_offset INTEGER;
  v_total_count BIGINT;
  v_page_count INTEGER;
  v_products JSONB;
BEGIN
  -- حساب الـ offset
  v_offset := (p_page - 1) * p_page_size;
  
  -- التحقق من القيم
  IF p_page < 1 THEN p_page := 1; END IF;
  IF p_page_size < 1 THEN p_page_size := 50; END IF;
  IF p_page_size > 200 THEN p_page_size := 200; END IF; -- حد أقصى 200 منتج
  
  -- حساب إجمالي المنتجات المطابقة للشروط
  SELECT COUNT(*)
  INTO v_total_count
  FROM products p
  LEFT JOIN product_categories pc ON p.category_id = pc.id
  WHERE p.organization_id = p_organization_id
    AND p.is_active = TRUE
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (
      p_search_query IS NULL 
      OR p_search_query = ''
      OR (
        p.name ILIKE '%' || p_search_query || '%'
        OR p.description ILIKE '%' || p_search_query || '%'
        OR p.sku ILIKE '%' || p_search_query || '%'
        OR p.barcode = p_search_query
      )
    );
  
  -- حساب عدد الصفحات
  v_page_count := CEIL(v_total_count::NUMERIC / p_page_size);
  
  -- جلب المنتجات مع المعلومات الكاملة
  WITH paginated_products AS (
    SELECT 
      p.*,
      pc.name as category_name,
      pc.description as category_description,
      -- حساب المخزون الفعلي من المتغيرات
      CASE 
        WHEN p.has_variants AND p_include_variants THEN
          COALESCE((
            SELECT SUM(
              CASE 
                WHEN pcol.has_sizes THEN
                  (SELECT SUM(ps.quantity) FROM product_sizes ps WHERE ps.color_id = pcol.id)
                ELSE pcol.quantity
              END
            )
            FROM product_colors pcol
            WHERE pcol.product_id = p.id
          ), p.stock_quantity)
        ELSE p.stock_quantity
      END as actual_stock,
      -- جلب المتغيرات إذا كانت مطلوبة
      CASE 
        WHEN p.has_variants AND p_include_variants THEN
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', pcol.id,
                'name', pcol.name,
                'color_code', pcol.color_code,
                'image_url', pcol.image_url,
                'quantity', pcol.quantity,
                'price', pcol.price,
                'barcode', pcol.barcode,
                'is_default', pcol.is_default,
                'has_sizes', pcol.has_sizes,
                'sizes', CASE 
                  WHEN pcol.has_sizes THEN
                    (
                      SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', ps.id,
                          'size_name', ps.size_name,
                          'quantity', ps.quantity,
                          'price', ps.price,
                          'barcode', ps.barcode,
                          'is_default', ps.is_default
                        )
                        ORDER BY ps.is_default DESC, ps.size_name
                      )
                      FROM product_sizes ps
                      WHERE ps.color_id = pcol.id
                    )
                  ELSE NULL
                END
              )
              ORDER BY pcol.is_default DESC, pcol.name
            )
            FROM product_colors pcol
            WHERE pcol.product_id = p.id
          )
        ELSE NULL
      END as variants
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE p.organization_id = p_organization_id
      AND p.is_active = TRUE
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (
        p_search_query IS NULL 
        OR p_search_query = ''
        OR (
          p.name ILIKE '%' || p_search_query || '%'
          OR p.description ILIKE '%' || p_search_query || '%'
          OR p.sku ILIKE '%' || p_search_query || '%'
          OR p.barcode = p_search_query
        )
      )
    ORDER BY
      CASE 
        WHEN p_sort_by = 'name' AND p_sort_order = 'ASC' THEN p.name
      END ASC,
      CASE 
        WHEN p_sort_by = 'name' AND p_sort_order = 'DESC' THEN p.name
      END DESC,
      CASE 
        WHEN p_sort_by = 'price' AND p_sort_order = 'ASC' THEN p.price
      END ASC,
      CASE 
        WHEN p_sort_by = 'price' AND p_sort_order = 'DESC' THEN p.price
      END DESC,
      CASE 
        WHEN p_sort_by = 'stock' AND p_sort_order = 'ASC' THEN p.stock_quantity
      END ASC,
      CASE 
        WHEN p_sort_by = 'stock' AND p_sort_order = 'DESC' THEN p.stock_quantity
      END DESC,
      CASE 
        WHEN p_sort_by = 'created' AND p_sort_order = 'ASC' THEN p.created_at
      END ASC,
      CASE 
        WHEN p_sort_by = 'created' AND p_sort_order = 'DESC' THEN p.created_at
      END DESC
    LIMIT p_page_size
    OFFSET v_offset
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pp.id,
      'name', pp.name,
      'description', pp.description,
      'price', pp.price,
      'compareAtPrice', pp.compare_at_price,
      'sku', pp.sku,
      'barcode', pp.barcode,
      'category', pp.category_name,
      'category_id', pp.category_id,
      'thumbnailImage', pp.thumbnail_image,
      'images', pp.images,
      'stockQuantity', pp.actual_stock,
      'stock_quantity', pp.actual_stock,
      'has_variants', pp.has_variants,
      'use_sizes', pp.use_sizes,
      'isDigital', pp.is_digital,
      'isNew', pp.is_new,
      'isFeatured', pp.is_featured,
      'isActive', pp.is_active,
      'variants', pp.variants,
      'features', pp.features,
      'specifications', pp.specifications,
      'brand', pp.brand,
      'wholesale_price', pp.wholesale_price,
      'partial_wholesale_price', pp.partial_wholesale_price,
      'min_wholesale_quantity', pp.min_wholesale_quantity,
      'min_partial_wholesale_quantity', pp.min_partial_wholesale_quantity,
      'allow_retail', pp.allow_retail,
      'allow_wholesale', pp.allow_wholesale,
      'allow_partial_wholesale', pp.allow_partial_wholesale,
      'createdAt', pp.created_at,
      'updatedAt', pp.updated_at
    )
  )
  INTO v_products
  FROM paginated_products pp;
  
  -- إرجاع النتائج
  RETURN QUERY
  SELECT 
    COALESCE(v_products, '[]'::jsonb) as products,
    v_total_count as total_count,
    v_page_count as page_count,
    p_page as current_page,
    (p_page < v_page_count) as has_next_page;
END;
$$;

-- إنشاء فهرس إضافي لتحسين أداء البحث
CREATE INDEX IF NOT EXISTS idx_products_search_optimized 
ON products USING gin(
  to_tsvector('arabic', name || ' ' || COALESCE(description, '') || ' ' || sku || ' ' || COALESCE(barcode, ''))
) 
WHERE is_active = TRUE;

-- دالة للبحث السريع عن المنتجات (للـ autocomplete)
CREATE OR REPLACE FUNCTION search_products_autocomplete(
  p_organization_id UUID,
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  barcode TEXT,
  price NUMERIC,
  stock_quantity INTEGER,
  thumbnail_image TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.sku,
    p.barcode,
    p.price,
    p.stock_quantity,
    p.thumbnail_image
  FROM products p
  WHERE p.organization_id = p_organization_id
    AND p.is_active = TRUE
    AND (
      p.name ILIKE p_search_query || '%'
      OR p.sku ILIKE p_search_query || '%'
      OR p.barcode = p_search_query
    )
  ORDER BY
    CASE 
      WHEN p.barcode = p_search_query THEN 1
      WHEN p.sku ILIKE p_search_query || '%' THEN 2
      WHEN p.name ILIKE p_search_query || '%' THEN 3
      ELSE 4
    END,
    p.name
  LIMIT p_limit;
END;
$$;

-- دالة لجلب إحصائيات المنتجات للوحة التحكم
CREATE OR REPLACE FUNCTION get_pos_products_stats(
  p_organization_id UUID
)
RETURNS TABLE (
  total_products BIGINT,
  active_products BIGINT,
  low_stock_products BIGINT,
  out_of_stock_products BIGINT,
  products_with_variants BIGINT,
  total_categories BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE TRUE) as total_products,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_products,
    COUNT(*) FILTER (WHERE is_active = TRUE AND stock_quantity > 0 AND stock_quantity <= COALESCE(min_stock_level, 5)) as low_stock_products,
    COUNT(*) FILTER (WHERE is_active = TRUE AND stock_quantity = 0) as out_of_stock_products,
    COUNT(*) FILTER (WHERE is_active = TRUE AND has_variants = TRUE) as products_with_variants,
    (SELECT COUNT(DISTINCT category_id) FROM products WHERE organization_id = p_organization_id AND category_id IS NOT NULL) as total_categories
  FROM products
  WHERE organization_id = p_organization_id;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_pos_products_paginated TO authenticated;
GRANT EXECUTE ON FUNCTION search_products_autocomplete TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_products_stats TO authenticated; 