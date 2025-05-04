-- حل شامل لمشكلة تحديث المنتجات
-- هذا الملف يحتوي على كل الخطوات المطلوبة لإصلاح مشكلة تحديث المنتجات
-- تاريخ: 2024-11-08

-- 1. إزالة القواعد الحالية
DROP RULE IF EXISTS products_update_rule ON public.products;
DROP RULE IF EXISTS prevent_direct_update_on_last_inventory_update ON public.products;

-- 2. إنشاء وظيفة التحديث التي ترجع المنتج كاملاً مع علاقاته
CREATE OR REPLACE FUNCTION update_product_and_return_full(
  product_id UUID,
  product_updates JSONB
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_product products;
  product_with_relations JSONB;
  category_data JSONB;
  subcategory_data JSONB;
BEGIN
  -- تحديث المنتج وحفظ البيانات المحدثة
  UPDATE products
  SET
    name = COALESCE(product_updates->>'name', name),
    description = COALESCE(product_updates->>'description', description),
    price = COALESCE((product_updates->>'price')::numeric, price),
    purchase_price = COALESCE((product_updates->>'purchase_price')::numeric, purchase_price),
    compare_at_price = CASE WHEN product_updates ? 'compare_at_price' AND product_updates->>'compare_at_price' IS NULL THEN NULL
                            WHEN product_updates ? 'compare_at_price' THEN (product_updates->>'compare_at_price')::numeric
                            ELSE compare_at_price END,
    wholesale_price = CASE WHEN product_updates ? 'wholesale_price' AND product_updates->>'wholesale_price' IS NULL THEN NULL
                           WHEN product_updates ? 'wholesale_price' THEN (product_updates->>'wholesale_price')::numeric
                           ELSE wholesale_price END,
    partial_wholesale_price = CASE WHEN product_updates ? 'partial_wholesale_price' AND product_updates->>'partial_wholesale_price' IS NULL THEN NULL
                                   WHEN product_updates ? 'partial_wholesale_price' THEN (product_updates->>'partial_wholesale_price')::numeric
                                   ELSE partial_wholesale_price END,
    min_wholesale_quantity = CASE WHEN product_updates ? 'min_wholesale_quantity' AND product_updates->>'min_wholesale_quantity' IS NULL THEN NULL
                                  WHEN product_updates ? 'min_wholesale_quantity' THEN (product_updates->>'min_wholesale_quantity')::integer
                                  ELSE min_wholesale_quantity END,
    min_partial_wholesale_quantity = CASE WHEN product_updates ? 'min_partial_wholesale_quantity' AND product_updates->>'min_partial_wholesale_quantity' IS NULL THEN NULL
                                          WHEN product_updates ? 'min_partial_wholesale_quantity' THEN (product_updates->>'min_partial_wholesale_quantity')::integer
                                          ELSE min_partial_wholesale_quantity END,
    allow_retail = COALESCE((product_updates->>'allow_retail')::boolean, allow_retail),
    allow_wholesale = COALESCE((product_updates->>'allow_wholesale')::boolean, allow_wholesale),
    allow_partial_wholesale = COALESCE((product_updates->>'allow_partial_wholesale')::boolean, allow_partial_wholesale),
    sku = COALESCE(product_updates->>'sku', sku),
    barcode = COALESCE(product_updates->>'barcode', barcode),
    category_id = CASE WHEN product_updates ? 'category_id' AND product_updates->>'category_id' IS NULL THEN NULL
                       WHEN product_updates ? 'category_id' THEN (product_updates->>'category_id')::uuid
                       ELSE category_id END,
    category = CASE WHEN product_updates ? 'category_id' AND product_updates->>'category_id' IS NULL THEN NULL
                    WHEN product_updates ? 'category_id' THEN (product_updates->>'category_id')::text
                    ELSE category END,
    subcategory_id = CASE WHEN product_updates ? 'subcategory_id' AND (product_updates->>'subcategory_id' IS NULL OR product_updates->>'subcategory_id' = '') THEN NULL
                          WHEN product_updates ? 'subcategory_id' THEN (product_updates->>'subcategory_id')::uuid
                          ELSE subcategory_id END,
    stock_quantity = COALESCE((product_updates->>'stock_quantity')::integer, stock_quantity),
    thumbnail_image = COALESCE(product_updates->>'thumbnail_image', thumbnail_image),
    images = CASE WHEN product_updates ? 'images' THEN (product_updates->'images')::text[]
                  ELSE images END,
    is_digital = COALESCE((product_updates->>'is_digital')::boolean, is_digital),
    brand = COALESCE(product_updates->>'brand', brand),
    is_new = COALESCE((product_updates->>'is_new')::boolean, is_new),
    is_featured = COALESCE((product_updates->>'is_featured')::boolean, is_featured),
    features = CASE WHEN product_updates ? 'features' THEN (product_updates->'features')::text[]
                    ELSE features END,
    specifications = CASE WHEN product_updates ? 'specifications' THEN product_updates->'specifications'
                          ELSE specifications END,
    has_variants = COALESCE((product_updates->>'has_variants')::boolean, has_variants),
    show_price_on_landing = COALESCE((product_updates->>'show_price_on_landing')::boolean, show_price_on_landing),
    updated_at = now()
  WHERE id = product_id
  RETURNING * INTO updated_product;
  
  -- التحقق من أن المنتج تم تحديثه
  IF updated_product IS NULL THEN
    RAISE EXCEPTION 'المنتج غير موجود أو لا يمكن تحديثه';
  END IF;
  
  -- الحصول على بيانات الفئة
  IF updated_product.category_id IS NOT NULL THEN
    SELECT json_build_object(
      'id', id,
      'name', name,
      'slug', slug
    ) INTO category_data
    FROM product_categories
    WHERE id = updated_product.category_id;
  ELSE
    category_data := NULL;
  END IF;
  
  -- الحصول على بيانات الفئة الفرعية
  IF updated_product.subcategory_id IS NOT NULL THEN
    SELECT json_build_object(
      'id', id,
      'name', name,
      'slug', slug
    ) INTO subcategory_data
    FROM product_subcategories
    WHERE id = updated_product.subcategory_id;
  ELSE
    subcategory_data := NULL;
  END IF;
  
  -- بناء الكائن النهائي مع العلاقات
  SELECT json_build_object(
    'id', updated_product.id,
    'name', updated_product.name,
    'description', updated_product.description,
    'price', updated_product.price,
    'purchase_price', updated_product.purchase_price,
    'compare_at_price', updated_product.compare_at_price,
    'wholesale_price', updated_product.wholesale_price,
    'partial_wholesale_price', updated_product.partial_wholesale_price,
    'min_wholesale_quantity', updated_product.min_wholesale_quantity,
    'min_partial_wholesale_quantity', updated_product.min_partial_wholesale_quantity,
    'allow_retail', updated_product.allow_retail,
    'allow_wholesale', updated_product.allow_wholesale,
    'allow_partial_wholesale', updated_product.allow_partial_wholesale,
    'sku', updated_product.sku,
    'barcode', updated_product.barcode,
    'category_id', updated_product.category_id,
    'subcategory_id', updated_product.subcategory_id,
    'stock_quantity', updated_product.stock_quantity,
    'thumbnail_image', updated_product.thumbnail_image,
    'images', updated_product.images,
    'is_digital', updated_product.is_digital,
    'brand', updated_product.brand,
    'is_new', updated_product.is_new,
    'is_featured', updated_product.is_featured,
    'features', updated_product.features,
    'specifications', updated_product.specifications,
    'organization_id', updated_product.organization_id,
    'slug', updated_product.slug,
    'has_variants', updated_product.has_variants,
    'show_price_on_landing', updated_product.show_price_on_landing,
    'created_at', updated_product.created_at,
    'updated_at', updated_product.updated_at,
    'category', category_data,
    'subcategory', subcategory_data
  ) INTO product_with_relations;
  
  RETURN product_with_relations;
END;
$$;

-- 3. إعادة إنشاء القاعدة للتحكم في last_inventory_update
CREATE RULE prevent_direct_update_on_last_inventory_update AS
ON UPDATE TO public.products
WHERE (NEW.last_inventory_update IS DISTINCT FROM OLD.last_inventory_update)
DO INSTEAD SELECT 1;

-- 4. إضافة تعليق توضيحي
COMMENT ON FUNCTION update_product_and_return_full IS 'وظيفة لتحديث المنتج وإرجاع البيانات المحدثة مع العلاقات';

-- تم بنجاح حل مشكلة تحديث المنتجات! 