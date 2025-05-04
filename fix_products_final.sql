-- حل نهائي لمشكلة تحديث المنتجات
-- تاريخ: 2024-11-08

-- 1. إنشاء وظيفة بسيطة للتحديث بدون استخدام RETURNING
CREATE OR REPLACE FUNCTION simple_update_product(
  p_id UUID,
  p_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- تحديث المنتج
  UPDATE products
  SET
    name = COALESCE(p_data->>'name', name),
    description = COALESCE(p_data->>'description', description),
    price = COALESCE((p_data->>'price')::numeric, price),
    purchase_price = COALESCE((p_data->>'purchase_price')::numeric, purchase_price),
    compare_at_price = CASE WHEN p_data ? 'compare_at_price' AND p_data->>'compare_at_price' IS NULL THEN NULL
                            WHEN p_data ? 'compare_at_price' THEN (p_data->>'compare_at_price')::numeric
                            ELSE compare_at_price END,
    wholesale_price = CASE WHEN p_data ? 'wholesale_price' AND p_data->>'wholesale_price' IS NULL THEN NULL
                           WHEN p_data ? 'wholesale_price' THEN (p_data->>'wholesale_price')::numeric
                           ELSE wholesale_price END,
    partial_wholesale_price = CASE WHEN p_data ? 'partial_wholesale_price' AND p_data->>'partial_wholesale_price' IS NULL THEN NULL
                                   WHEN p_data ? 'partial_wholesale_price' THEN (p_data->>'partial_wholesale_price')::numeric
                                   ELSE partial_wholesale_price END,
    min_wholesale_quantity = CASE WHEN p_data ? 'min_wholesale_quantity' AND p_data->>'min_wholesale_quantity' IS NULL THEN NULL
                                  WHEN p_data ? 'min_wholesale_quantity' THEN (p_data->>'min_wholesale_quantity')::integer
                                  ELSE min_wholesale_quantity END,
    min_partial_wholesale_quantity = CASE WHEN p_data ? 'min_partial_wholesale_quantity' AND p_data->>'min_partial_wholesale_quantity' IS NULL THEN NULL
                                          WHEN p_data ? 'min_partial_wholesale_quantity' THEN (p_data->>'min_partial_wholesale_quantity')::integer
                                          ELSE min_partial_wholesale_quantity END,
    allow_retail = COALESCE((p_data->>'allow_retail')::boolean, allow_retail),
    allow_wholesale = COALESCE((p_data->>'allow_wholesale')::boolean, allow_wholesale),
    allow_partial_wholesale = COALESCE((p_data->>'allow_partial_wholesale')::boolean, allow_partial_wholesale),
    sku = COALESCE(p_data->>'sku', sku),
    barcode = COALESCE(p_data->>'barcode', barcode),
    category_id = CASE WHEN p_data ? 'category_id' AND p_data->>'category_id' IS NULL THEN NULL
                       WHEN p_data ? 'category_id' THEN (p_data->>'category_id')::uuid
                       ELSE category_id END,
    category = CASE WHEN p_data ? 'category_id' AND p_data->>'category_id' IS NULL THEN NULL
                    WHEN p_data ? 'category_id' THEN (p_data->>'category_id')::text
                    ELSE category END,
    subcategory_id = CASE WHEN p_data ? 'subcategory_id' AND (p_data->>'subcategory_id' IS NULL OR p_data->>'subcategory_id' = '') THEN NULL
                          WHEN p_data ? 'subcategory_id' THEN (p_data->>'subcategory_id')::uuid
                          ELSE subcategory_id END,
    stock_quantity = COALESCE((p_data->>'stock_quantity')::integer, stock_quantity),
    thumbnail_image = COALESCE(p_data->>'thumbnail_image', thumbnail_image),
    images = CASE 
             WHEN p_data ? 'images' THEN 
               (SELECT ARRAY(SELECT jsonb_array_elements_text(p_data->'images')))
             ELSE images 
           END,
    is_digital = COALESCE((p_data->>'is_digital')::boolean, is_digital),
    brand = COALESCE(p_data->>'brand', brand),
    is_new = COALESCE((p_data->>'is_new')::boolean, is_new),
    is_featured = COALESCE((p_data->>'is_featured')::boolean, is_featured),
    features = CASE 
               WHEN p_data ? 'features' THEN 
                 (SELECT ARRAY(SELECT jsonb_array_elements_text(p_data->'features')))
               ELSE features 
             END,
    specifications = CASE WHEN p_data ? 'specifications' THEN p_data->'specifications'
                          ELSE specifications END,
    has_variants = COALESCE((p_data->>'has_variants')::boolean, has_variants),
    show_price_on_landing = COALESCE((p_data->>'show_price_on_landing')::boolean, show_price_on_landing),
    updated_at = now()
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$;

-- 2. إضافة تعليق توضيحي
COMMENT ON FUNCTION simple_update_product IS 'وظيفة بسيطة لتحديث المنتج بدون استخدام RETURNING';

-- إضافة حقول مواصفات المنتج الإضافية
ALTER TABLE products
ADD COLUMN IF NOT EXISTS has_fast_shipping BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_money_back BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_quality_guarantee BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fast_shipping_text TEXT DEFAULT 'شحن سريع لجميع الولايات (1-3 أيام)',
ADD COLUMN IF NOT EXISTS money_back_text TEXT DEFAULT 'ضمان استرداد المال خلال 14 يوم',
ADD COLUMN IF NOT EXISTS quality_guarantee_text TEXT DEFAULT 'ضمان جودة المنتج';

-- إنشاء وظيفة لتحديث المواصفات الإضافية للمنتج
CREATE OR REPLACE FUNCTION update_product_features(
    product_id UUID,
    p_has_fast_shipping BOOLEAN DEFAULT NULL,
    p_has_money_back BOOLEAN DEFAULT NULL,
    p_has_quality_guarantee BOOLEAN DEFAULT NULL,
    p_fast_shipping_text TEXT DEFAULT NULL,
    p_money_back_text TEXT DEFAULT NULL,
    p_quality_guarantee_text TEXT DEFAULT NULL
)
RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE products
    SET 
        has_fast_shipping = COALESCE(p_has_fast_shipping, has_fast_shipping),
        has_money_back = COALESCE(p_has_money_back, has_money_back),
        has_quality_guarantee = COALESCE(p_has_quality_guarantee, has_quality_guarantee),
        fast_shipping_text = COALESCE(p_fast_shipping_text, fast_shipping_text),
        money_back_text = COALESCE(p_money_back_text, money_back_text),
        quality_guarantee_text = COALESCE(p_quality_guarantee_text, quality_guarantee_text),
        updated_at = NOW()
    WHERE id = product_id
    RETURNING *;
END;
$$; 