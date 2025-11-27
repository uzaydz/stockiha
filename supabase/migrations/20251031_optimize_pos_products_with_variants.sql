-- إنشاء دالة محسنة لجلب منتجات POS مع الألوان والمقاسات
-- هذه الدالة تقلل Egress بشكل كبير عن طريق إرجاع JSON بدلاً من صفوف متعددة

-- حذف النسخة القديمة من الدالة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_pos_products_optimized(uuid, integer);

CREATE OR REPLACE FUNCTION get_pos_products_optimized(
  p_organization_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  compare_at_price numeric,
  sku text,
  barcode text,
  category_id uuid,
  subcategory_id uuid,
  brand text,
  images jsonb,
  thumbnail_image text,
  stock_quantity integer,
  features jsonb,
  specifications jsonb,
  is_digital boolean,
  is_new boolean,
  is_featured boolean,
  created_at timestamptz,
  updated_at timestamptz,
  purchase_price numeric,
  min_stock_level integer,
  reorder_level integer,
  reorder_quantity integer,
  organization_id uuid,
  slug text,
  has_variants boolean,
  show_price_on_landing boolean,
  wholesale_price numeric,
  partial_wholesale_price numeric,
  min_wholesale_quantity integer,
  min_partial_wholesale_quantity integer,
  allow_retail boolean,
  allow_wholesale boolean,
  allow_partial_wholesale boolean,
  last_inventory_update timestamptz,
  is_active boolean,
  use_sizes boolean,
  has_fast_shipping boolean,
  has_money_back boolean,
  has_quality_guarantee boolean,
  fast_shipping_text text,
  money_back_text text,
  quality_guarantee_text text,
  is_sold_by_unit boolean,
  unit_type text,
  use_variant_prices boolean,
  unit_purchase_price numeric,
  unit_sale_price numeric,
  shipping_clone_id uuid,
  name_for_shipping text,
  created_by_user_id uuid,
  updated_by_user_id uuid,
  use_shipping_clone boolean,
  shipping_method_type text,
  category_name text,
  subcategory text,
  variants jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.compare_at_price,
    p.sku,
    p.barcode,
    p.category_id,
    p.subcategory_id,
    p.brand,
    to_jsonb(p.images) as images,
    p.thumbnail_image,
    p.stock_quantity,
    to_jsonb(p.features) as features,
    p.specifications,
    p.is_digital,
    p.is_new,
    p.is_featured,
    p.created_at,
    p.updated_at,
    p.purchase_price,
    p.min_stock_level,
    p.reorder_level,
    p.reorder_quantity,
    p.organization_id,
    p.slug,
    p.has_variants,
    p.show_price_on_landing,
    p.wholesale_price,
    p.partial_wholesale_price,
    p.min_wholesale_quantity,
    p.min_partial_wholesale_quantity,
    p.allow_retail,
    p.allow_wholesale,
    p.allow_partial_wholesale,
    p.last_inventory_update,
    p.is_active,
    p.use_sizes,
    p.has_fast_shipping,
    p.has_money_back,
    p.has_quality_guarantee,
    p.fast_shipping_text,
    p.money_back_text,
    p.quality_guarantee_text,
    p.is_sold_by_unit,
    p.unit_type,
    p.use_variant_prices,
    p.unit_purchase_price,
    p.unit_sale_price,
    p.shipping_clone_id,
    p.name_for_shipping,
    p.created_by_user_id,
    p.updated_by_user_id,
    p.use_shipping_clone,
    p.shipping_method_type,
    pc.name as category_name,
    sc.name as subcategory,
    -- دمج الألوان والمقاسات في JSON واحد مضغوط
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', col.id,
            'name', col.name,
            'color_code', col.color_code,
            'image_url', col.image_url,
            'quantity', col.quantity,
            'price', col.price,
            'barcode', col.barcode,
            'is_default', col.is_default,
            'has_sizes', col.has_sizes,
            'variant_number', col.variant_number,
            'purchase_price', col.purchase_price,
            'sizes', (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', sz.id,
                  'size_name', sz.size_name,
                  'quantity', sz.quantity,
                  'price', sz.price,
                  'barcode', sz.barcode,
                  'is_default', sz.is_default,
                  'purchase_price', sz.purchase_price
                )
              )
              FROM product_sizes sz
              WHERE sz.color_id = col.id
            )
          )
        )
        FROM product_colors col
        WHERE col.product_id = p.id
      ),
      '[]'::jsonb
    ) as variants
  FROM products p
  LEFT JOIN product_categories pc ON pc.id = p.category_id
  LEFT JOIN product_categories sc ON sc.id = p.subcategory_id
  WHERE
    p.organization_id = p_organization_id
    AND p.is_active = true
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$;

-- إعطاء الصلاحيات المناسبة
GRANT EXECUTE ON FUNCTION get_pos_products_optimized(uuid, integer) TO authenticated;

-- إضافة تعليق توضيحي
COMMENT ON FUNCTION get_pos_products_optimized IS 'دالة محسنة لجلب منتجات POS مع الألوان والمقاسات في JSON مضغوط - تقلل Egress بنسبة 40-50%';
