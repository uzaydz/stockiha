-- دالة مخصصة لاسترجاع المنتجات مع معلومات الفئات في استعلام واحد
CREATE OR REPLACE FUNCTION get_products_with_categories(org_id UUID, active_only BOOLEAN DEFAULT true)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER 
AS $$
DECLARE
  result JSON;
BEGIN
  WITH product_data AS (
    SELECT 
      p.id,
      p.name,
      p.description,
      p.price,
      p.compare_at_price,
      p.thumbnail_image,
      p.stock_quantity,
      p.category_id,
      p.subcategory_id,
      p.organization_id,
      p.has_variants,
      p.use_sizes,
      p.created_at,
      p.updated_at,
      p.is_active,
      pc.name AS category_name,
      pc.slug AS category_slug,
      ps.name AS subcategory_name,
      ps.slug AS subcategory_slug
    FROM 
      products p
    LEFT JOIN
      product_categories pc ON p.category_id = pc.id
    LEFT JOIN
      product_subcategories ps ON p.subcategory_id = ps.id
    WHERE 
      p.organization_id = org_id
      AND (NOT active_only OR p.is_active = true)
  )
  
  SELECT json_agg(
    json_build_object(
      'id', pd.id,
      'name', pd.name,
      'description', pd.description,
      'price', pd.price,
      'compare_at_price', pd.compare_at_price,
      'thumbnail_image', pd.thumbnail_image,
      'stock_quantity', pd.stock_quantity,
      'has_variants', pd.has_variants,
      'use_sizes', pd.use_sizes,
      'is_active', pd.is_active,
      'created_at', pd.created_at,
      'updated_at', pd.updated_at,
      'category', json_build_object(
        'id', pd.category_id,
        'name', pd.category_name,
        'slug', pd.category_slug
      ),
      'subcategory', 
      CASE WHEN pd.subcategory_id IS NOT NULL THEN
        json_build_object(
          'id', pd.subcategory_id,
          'name', pd.subcategory_name,
          'slug', pd.subcategory_slug
        )
      ELSE NULL END
    )
  ) INTO result
  FROM product_data pd;
  
  -- إذا لم توجد منتجات، إرجاع مصفوفة فارغة بدلاً من NULL
  IF result IS NULL THEN
    result = '[]'::JSON;
  END IF;
  
  RETURN result;
END;
$$;

-- منح صلاحيات الوصول
GRANT EXECUTE ON FUNCTION get_products_with_categories(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_products_with_categories(UUID, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION get_products_with_categories(UUID, BOOLEAN) TO service_role; 