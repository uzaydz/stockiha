-- إصلاح مشكلة أسعار الجملة في قاعدة البيانات
-- 1. التحقق من وجود أعمدة للسعر الجملة وإضافتها إذا لم تكن موجودة
DO $$
BEGIN
  -- إضافة عمود is_wholesale إذا لم يكن موجودًا
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'is_wholesale'
  ) THEN
    ALTER TABLE order_items ADD COLUMN is_wholesale BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'تمت إضافة عمود is_wholesale بنجاح';
  ELSE
    RAISE NOTICE 'عمود is_wholesale موجود بالفعل';
  END IF;
  
  -- إضافة عمود original_price إذا لم يكن موجودًا
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE order_items ADD COLUMN original_price NUMERIC;
    RAISE NOTICE 'تمت إضافة عمود original_price بنجاح';
  ELSE
    RAISE NOTICE 'عمود original_price موجود بالفعل';
  END IF;
END
$$;

-- 2. إنشاء أو تحديث الوظيفة المسؤولة عن حساب سعر الجملة
CREATE OR REPLACE FUNCTION get_product_price_for_quantity(p_product_id UUID, p_quantity INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  v_price NUMERIC;
  v_product RECORD;
BEGIN
  -- الحصول على معلومات المنتج
  SELECT 
    price, 
    wholesale_price, 
    partial_wholesale_price, 
    min_wholesale_quantity, 
    min_partial_wholesale_quantity,
    allow_wholesale,
    allow_partial_wholesale
  INTO v_product
  FROM products
  WHERE id = p_product_id;
  
  -- إذا لم يتم العثور على المنتج، إرجاع NULL
  IF v_product IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- تحقق من تطبيق سعر الجملة الكامل
  IF v_product.allow_wholesale IS TRUE 
     AND v_product.wholesale_price IS NOT NULL 
     AND v_product.min_wholesale_quantity IS NOT NULL 
     AND p_quantity >= v_product.min_wholesale_quantity THEN
    v_price := v_product.wholesale_price;
  
  -- تحقق من تطبيق سعر الجملة الجزئي
  ELSIF v_product.allow_partial_wholesale IS TRUE 
        AND v_product.partial_wholesale_price IS NOT NULL 
        AND v_product.min_partial_wholesale_quantity IS NOT NULL 
        AND p_quantity >= v_product.min_partial_wholesale_quantity THEN
    v_price := v_product.partial_wholesale_price;
  
  -- السعر العادي
  ELSE
    v_price := v_product.price;
  END IF;
  
  RETURN v_price;
END;
$$ LANGUAGE plpgsql;

-- 3. تحديث بيانات الطلبات السابقة وتعيين قيمة is_wholesale الصحيحة
UPDATE order_items oi
SET is_wholesale = CASE
    WHEN oi.unit_price < p.price THEN TRUE
    ELSE FALSE
  END,
  original_price = CASE
    WHEN oi.unit_price < p.price THEN p.price
    ELSE NULL
  END
FROM products p
WHERE oi.product_id = p.id
  AND oi.is_wholesale IS NULL;

-- 4. إنشاء وظيفة لحساب إجمالي المبيعات بالجملة
CREATE OR REPLACE FUNCTION calculate_wholesale_sales(p_start_date TIMESTAMP, p_end_date TIMESTAMP)
RETURNS TABLE (
  total_wholesale_sales NUMERIC,
  total_wholesale_items INTEGER,
  total_wholesale_savings NUMERIC,
  wholesale_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH 
    total_sales AS (
      SELECT COALESCE(SUM(total), 0) as all_sales
      FROM orders
      WHERE created_at BETWEEN p_start_date AND p_end_date
        AND status != 'cancelled'
    ),
    wholesale_items AS (
      SELECT 
        SUM(oi.total_price) as wholesale_sales,
        SUM(oi.quantity) as wholesale_items,
        SUM((oi.original_price - oi.unit_price) * oi.quantity) as savings
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.is_wholesale = TRUE
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled'
    )
  SELECT 
    COALESCE(wholesale_items.wholesale_sales, 0) as total_wholesale_sales,
    COALESCE(wholesale_items.wholesale_items, 0) as total_wholesale_items,
    COALESCE(wholesale_items.savings, 0) as total_wholesale_savings,
    CASE 
      WHEN total_sales.all_sales > 0 THEN 
        ROUND((COALESCE(wholesale_items.wholesale_sales, 0) / total_sales.all_sales) * 100, 2)
      ELSE 0
    END as wholesale_percentage
  FROM total_sales, wholesale_items;
END;
$$ LANGUAGE plpgsql; 