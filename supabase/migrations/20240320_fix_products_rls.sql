-- تمكين RLS على جدول المنتجات
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- حذف القواعد والوظائف القديمة إذا وجدت
DROP RULE IF EXISTS products_update_rule ON public.products;
DROP FUNCTION IF EXISTS update_product_with_return;
DROP FUNCTION IF EXISTS process_product_update;

-- إنشاء وظيفة معالجة تحديث المنتج
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

-- إنشاء قاعدة DO INSTEAD للتحديث
CREATE OR REPLACE RULE products_update_rule AS
ON UPDATE TO public.products
DO INSTEAD
  SELECT process_product_update(OLD, NEW);

-- حذف السياسات القديمة إذا وجدت
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable update with returning for authenticated users" ON public.products;

-- إنشاء سياسة القراءة
CREATE POLICY "Enable read access for authenticated users" ON public.products
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = products.organization_id
    AND users.is_active = true
  )
);

-- إنشاء سياسة الإضافة
CREATE POLICY "Enable insert for authenticated users" ON public.products
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = products.organization_id
    AND users.is_active = true
    AND (users.is_org_admin = true OR users.role IN ('owner', 'admin', 'manager'))
  )
);

-- إنشاء سياسة التحديث
CREATE POLICY "Enable update for authenticated users" ON public.products
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = products.organization_id
    AND users.is_active = true
    AND (users.is_org_admin = true OR users.role IN ('owner', 'admin', 'manager'))
  )
);

-- إنشاء سياسة الحذف
CREATE POLICY "Enable delete for authenticated users" ON public.products
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = products.organization_id
    AND users.is_active = true
    AND (users.is_org_admin = true OR users.role IN ('owner', 'admin'))
  )
);

-- إضافة تعليقات توضيحية للجدول والسياسات
COMMENT ON TABLE public.products IS 'جدول المنتجات مع سياسات حماية على مستوى الصفوف';
COMMENT ON POLICY "Enable read access for authenticated users" ON public.products IS 'السماح بقراءة المنتجات للمستخدمين المصادق عليهم في نفس المؤسسة';
COMMENT ON POLICY "Enable insert for authenticated users" ON public.products IS 'السماح بإضافة المنتجات للمدراء والمشرفين والمالكين فقط';
COMMENT ON POLICY "Enable update for authenticated users" ON public.products IS 'السماح بتحديث المنتجات للمدراء والمشرفين والمالكين فقط';
COMMENT ON POLICY "Enable delete for authenticated users" ON public.products IS 'السماح بحذف المنتجات للمشرفين والمالكين فقط'; 