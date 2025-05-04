-- ملف إصلاح قاعدة تحديث المنتجات
-- تاريخ: 2024-11-08
-- المشكلة: خطأ "cannot perform UPDATE RETURNING on relation "products""
-- السبب: عدم وجود بند RETURNING في قاعدة تحديث المنتجات

-- 1. حذف القاعدة الحالية
DROP RULE IF EXISTS products_update_rule ON public.products;

-- 2. إنشاء/تحديث وظيفة process_product_update للتأكد من إرجاع كافة البيانات المطلوبة
CREATE OR REPLACE FUNCTION process_product_update(
  OLD public.products,
  NEW public.products
) RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result public.products;
BEGIN
  -- التحقق من صلاحيات المستخدم
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = OLD.organization_id
    AND users.is_active = true
    AND (users.is_org_admin = true OR users.role IN ('owner', 'admin', 'manager'))
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بتحديث هذا المنتج';
  END IF;

  -- تحديث المنتج
  UPDATE public.products p
  SET
    name = NEW.name,
    description = NEW.description,
    price = NEW.price,
    purchase_price = NEW.purchase_price,
    compare_at_price = NEW.compare_at_price,
    wholesale_price = NEW.wholesale_price,
    partial_wholesale_price = NEW.partial_wholesale_price,
    min_wholesale_quantity = NEW.min_wholesale_quantity,
    min_partial_wholesale_quantity = NEW.min_partial_wholesale_quantity,
    allow_retail = NEW.allow_retail,
    allow_wholesale = NEW.allow_wholesale,
    allow_partial_wholesale = NEW.allow_partial_wholesale,
    sku = NEW.sku,
    barcode = NEW.barcode,
    category_id = NEW.category_id,
    category = NEW.category,
    subcategory_id = NEW.subcategory_id,
    stock_quantity = NEW.stock_quantity,
    thumbnail_image = NEW.thumbnail_image,
    images = NEW.images,
    is_digital = NEW.is_digital,
    brand = NEW.brand,
    is_new = NEW.is_new,
    is_featured = NEW.is_featured,
    features = NEW.features,
    specifications = NEW.specifications,
    has_variants = NEW.has_variants,
    show_price_on_landing = NEW.show_price_on_landing,
    updated_at = COALESCE(NEW.updated_at, now())
  WHERE p.id = OLD.id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- 3. إنشاء قاعدة جديدة مع بند RETURNING
CREATE RULE products_update_rule AS
ON UPDATE TO public.products
DO INSTEAD
  SELECT * FROM process_product_update(OLD, NEW);

-- 4. إعادة إنشاء القاعدة الثانية للتحكم في تحديث last_inventory_update
DROP RULE IF EXISTS prevent_direct_update_on_last_inventory_update ON public.products;

CREATE RULE prevent_direct_update_on_last_inventory_update AS
ON UPDATE TO public.products
WHERE (NEW.last_inventory_update IS DISTINCT FROM OLD.last_inventory_update)
DO INSTEAD SELECT 1;

-- 5. إضافة تعليق توضيحي للقاعدة الجديدة
COMMENT ON RULE products_update_rule ON public.products IS 'قاعدة تحديث المنتجات مع استخدام بند RETURNING'; 