-- حل بديل لمشكلة تحديث المنتجات
-- إنشاء دالة خاصة لتحديث المنتجات

-- 1. إنشاء وظيفة جديدة لتحديث المنتج وإرجاع البيانات المحدثة
CREATE OR REPLACE FUNCTION update_product_with_return(
  p_product_id UUID,
  p_data JSONB
)
RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product products;
  v_category_record RECORD;
  v_subcategory_record RECORD;
BEGIN
  -- التحقق من صلاحيات المستخدم
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = (SELECT organization_id FROM products WHERE id = p_product_id)
    AND users.is_active = true
    AND (users.is_org_admin = true OR users.role IN ('owner', 'admin', 'manager'))
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بتحديث هذا المنتج';
  END IF;

  -- تحديث المنتج
  UPDATE products
  SET
    name = COALESCE(p_data->>'name', name),
    description = COALESCE(p_data->>'description', description),
    price = COALESCE((p_data->>'price')::numeric, price),
    purchase_price = COALESCE((p_data->>'purchase_price')::numeric, purchase_price),
    compare_at_price = CASE WHEN p_data->>'compare_at_price' IS NULL THEN compare_at_price ELSE (p_data->>'compare_at_price')::numeric END,
    wholesale_price = CASE WHEN p_data->>'wholesale_price' IS NULL THEN wholesale_price ELSE (p_data->>'wholesale_price')::numeric END,
    partial_wholesale_price = CASE WHEN p_data->>'partial_wholesale_price' IS NULL THEN partial_wholesale_price ELSE (p_data->>'partial_wholesale_price')::numeric END,
    min_wholesale_quantity = CASE WHEN p_data->>'min_wholesale_quantity' IS NULL THEN min_wholesale_quantity ELSE (p_data->>'min_wholesale_quantity')::integer END,
    min_partial_wholesale_quantity = CASE WHEN p_data->>'min_partial_wholesale_quantity' IS NULL THEN min_partial_wholesale_quantity ELSE (p_data->>'min_partial_wholesale_quantity')::integer END,
    allow_retail = COALESCE((p_data->>'allow_retail')::boolean, allow_retail),
    allow_wholesale = COALESCE((p_data->>'allow_wholesale')::boolean, allow_wholesale),
    allow_partial_wholesale = COALESCE((p_data->>'allow_partial_wholesale')::boolean, allow_partial_wholesale),
    sku = COALESCE(p_data->>'sku', sku),
    barcode = COALESCE(p_data->>'barcode', barcode),
    category_id = CASE WHEN p_data->>'category_id' IS NULL THEN category_id ELSE (p_data->>'category_id')::uuid END,
    category = CASE WHEN p_data->>'category_id' IS NULL THEN category ELSE (p_data->>'category_id')::text END,
    subcategory_id = CASE WHEN p_data->>'subcategory_id' IS NULL THEN subcategory_id ELSE 
                          CASE WHEN p_data->>'subcategory_id' = '' OR p_data->>'subcategory_id' = 'null' THEN NULL 
                          ELSE (p_data->>'subcategory_id')::uuid END
                     END,
    stock_quantity = COALESCE((p_data->>'stock_quantity')::integer, stock_quantity),
    thumbnail_image = COALESCE(p_data->>'thumbnail_image', thumbnail_image),
    images = CASE WHEN p_data->'images' IS NULL THEN images ELSE (p_data->'images')::text[] END,
    is_digital = COALESCE((p_data->>'is_digital')::boolean, is_digital),
    brand = COALESCE(p_data->>'brand', brand),
    is_new = COALESCE((p_data->>'is_new')::boolean, is_new),
    is_featured = COALESCE((p_data->>'is_featured')::boolean, is_featured),
    features = CASE WHEN p_data->'features' IS NULL THEN features ELSE (p_data->'features')::text[] END,
    specifications = CASE WHEN p_data->'specifications' IS NULL THEN specifications ELSE p_data->'specifications' END,
    has_variants = COALESCE((p_data->>'has_variants')::boolean, has_variants),
    show_price_on_landing = COALESCE((p_data->>'show_price_on_landing')::boolean, show_price_on_landing),
    updated_at = now()
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  -- الحصول على بيانات الفئة
  SELECT id, name, slug INTO v_category_record
  FROM product_categories
  WHERE id = v_product.category_id;

  -- الحصول على بيانات الفئة الفرعية
  IF v_product.subcategory_id IS NOT NULL THEN
    SELECT id, name, slug INTO v_subcategory_record
    FROM product_subcategories
    WHERE id = v_product.subcategory_id;
  END IF;

  -- إرجاع المنتج المحدث
  RETURN QUERY
  SELECT 
    v_product.*,
    (ROW_TO_JSON(v_category_record) #>> '{}')::jsonb AS category_data,
    (CASE WHEN v_subcategory_record IS NULL THEN NULL ELSE (ROW_TO_JSON(v_subcategory_record) #>> '{}')::jsonb END) AS subcategory_data;
END;
$$;

-- 2. تعديل وظيفة لتحديث المنتج بدون قيمة بند RETURNING في الاستعلام
CREATE OR REPLACE FUNCTION update_product_without_returning(
  p_product_id UUID,
  p_data JSONB
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- التحقق من صلاحيات المستخدم
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = (SELECT organization_id FROM products WHERE id = p_product_id)
    AND users.is_active = true
    AND (users.is_org_admin = true OR users.role IN ('owner', 'admin', 'manager'))
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بتحديث هذا المنتج';
  END IF;

  -- تحديث المنتج
  UPDATE products
  SET
    name = COALESCE(p_data->>'name', name),
    description = COALESCE(p_data->>'description', description),
    price = COALESCE((p_data->>'price')::numeric, price),
    purchase_price = COALESCE((p_data->>'purchase_price')::numeric, purchase_price),
    compare_at_price = CASE WHEN p_data->>'compare_at_price' IS NULL THEN compare_at_price ELSE (p_data->>'compare_at_price')::numeric END,
    wholesale_price = CASE WHEN p_data->>'wholesale_price' IS NULL THEN wholesale_price ELSE (p_data->>'wholesale_price')::numeric END,
    partial_wholesale_price = CASE WHEN p_data->>'partial_wholesale_price' IS NULL THEN partial_wholesale_price ELSE (p_data->>'partial_wholesale_price')::numeric END,
    min_wholesale_quantity = CASE WHEN p_data->>'min_wholesale_quantity' IS NULL THEN min_wholesale_quantity ELSE (p_data->>'min_wholesale_quantity')::integer END,
    min_partial_wholesale_quantity = CASE WHEN p_data->>'min_partial_wholesale_quantity' IS NULL THEN min_partial_wholesale_quantity ELSE (p_data->>'min_partial_wholesale_quantity')::integer END,
    allow_retail = COALESCE((p_data->>'allow_retail')::boolean, allow_retail),
    allow_wholesale = COALESCE((p_data->>'allow_wholesale')::boolean, allow_wholesale),
    allow_partial_wholesale = COALESCE((p_data->>'allow_partial_wholesale')::boolean, allow_partial_wholesale),
    sku = COALESCE(p_data->>'sku', sku),
    barcode = COALESCE(p_data->>'barcode', barcode),
    category_id = CASE WHEN p_data->>'category_id' IS NULL THEN category_id ELSE (p_data->>'category_id')::uuid END,
    category = CASE WHEN p_data->>'category_id' IS NULL THEN category ELSE (p_data->>'category_id')::text END,
    subcategory_id = CASE WHEN p_data->>'subcategory_id' IS NULL THEN subcategory_id ELSE 
                          CASE WHEN p_data->>'subcategory_id' = '' OR p_data->>'subcategory_id' = 'null' THEN NULL 
                          ELSE (p_data->>'subcategory_id')::uuid END
                     END,
    stock_quantity = COALESCE((p_data->>'stock_quantity')::integer, stock_quantity),
    thumbnail_image = COALESCE(p_data->>'thumbnail_image', thumbnail_image),
    images = CASE WHEN p_data->'images' IS NULL THEN images ELSE (p_data->'images')::text[] END,
    is_digital = COALESCE((p_data->>'is_digital')::boolean, is_digital),
    brand = COALESCE(p_data->>'brand', brand),
    is_new = COALESCE((p_data->>'is_new')::boolean, is_new),
    is_featured = COALESCE((p_data->>'is_featured')::boolean, is_featured),
    features = CASE WHEN p_data->'features' IS NULL THEN features ELSE (p_data->'features')::text[] END,
    specifications = CASE WHEN p_data->'specifications' IS NULL THEN specifications ELSE p_data->'specifications' END,
    has_variants = COALESCE((p_data->>'has_variants')::boolean, has_variants),
    show_price_on_landing = COALESCE((p_data->>'show_price_on_landing')::boolean, show_price_on_landing),
    updated_at = now()
  WHERE id = p_product_id;

  RETURN FOUND;
END;
$$; 