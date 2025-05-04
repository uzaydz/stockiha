-- إنشاء دالة تحديث المنتج بدون استخدام slug
CREATE OR REPLACE FUNCTION update_product_without_slug(
  p_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_price NUMERIC,
  p_purchase_price NUMERIC DEFAULT NULL,
  p_compare_at_price NUMERIC DEFAULT NULL,
  p_sku TEXT,
  p_barcode TEXT DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_subcategory_id UUID DEFAULT NULL,
  p_brand TEXT DEFAULT NULL,
  p_stock_quantity INTEGER,
  p_thumbnail_image TEXT,
  p_images JSONB DEFAULT NULL,
  p_is_digital BOOLEAN DEFAULT FALSE,
  p_is_new BOOLEAN DEFAULT FALSE,
  p_is_featured BOOLEAN DEFAULT FALSE,
  p_has_variants BOOLEAN DEFAULT FALSE,
  p_show_price_on_landing BOOLEAN DEFAULT TRUE
)
RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE products
  SET
    name = p_name,
    description = p_description,
    price = p_price,
    purchase_price = p_purchase_price,
    compare_at_price = p_compare_at_price,
    sku = p_sku,
    barcode = p_barcode,
    category_id = p_category_id,
    subcategory_id = p_subcategory_id,
    brand = p_brand,
    stock_quantity = p_stock_quantity,
    thumbnail_image = p_thumbnail_image,
    images = p_images,
    is_digital = p_is_digital,
    is_new = p_is_new,
    is_featured = p_is_featured,
    has_variants = p_has_variants,
    show_price_on_landing = p_show_price_on_landing,
    category = p_category_id::TEXT,
    updated_at = NOW()
  WHERE id = p_id
  RETURNING *;
END;
$$; 