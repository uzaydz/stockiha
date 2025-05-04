-- fix_online_orders.sql
-- إصلاح مشكلة حفظ الطلبات الأونلاين في قاعدة البيانات

-- 1. إصلاح قيد التحقق في جدول inventory_log
DO $$
BEGIN
    -- حذف القيد الموجود
    ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_type_check;
    
    -- إضافة القيد من جديد مع دعم 'online_order'
    ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_type_check 
    CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order'));
    
    RAISE NOTICE 'تم تحديث قيد التحقق بنجاح';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'حدث خطأ أثناء تحديث قيد التحقق: %', SQLERRM;
END;
$$;

-- 2. فحص هيكل جدول العناوين ببساطة
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'addresses'
ORDER BY 
    ordinal_position;

-- 3. استعلام للتحقق من قيود المفتاح الأجنبي في جدول العناوين والطلبات
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('addresses', 'orders')
    AND kcu.column_name IN ('user_id', 'customer_id');

-- 3.5. إصلاح قيد المفتاح الأجنبي في جدول الطلبات
DO $$
BEGIN
    -- حذف القيد الأجنبي الحالي
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
    
    -- إضافة القيد الأجنبي الجديد الذي يربط مع جدول العملاء
    ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id);
    
    RAISE NOTICE 'تم تحديث قيد المفتاح الأجنبي بنجاح';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'حدث خطأ أثناء تحديث قيد المفتاح الأجنبي: %', SQLERRM;
END;
$$;

-- 4. إعادة إنشاء وظيفة معالجة الطلبات الأونلاين مع إصلاح مشكلة معرف المستخدم
CREATE OR REPLACE FUNCTION process_online_order_new(
  p_full_name TEXT,
  p_phone TEXT,
  p_province TEXT,
  p_address TEXT,
  p_delivery_company TEXT,
  p_payment_method TEXT,
  p_notes TEXT,
  p_product_id UUID,
  p_product_color_id UUID,
  p_quantity INTEGER,
  p_unit_price NUMERIC,
  p_total_price NUMERIC,
  p_delivery_fee NUMERIC,
  p_organization_id UUID
) RETURNS JSON AS $$
DECLARE
  v_customer_id UUID;
  v_address_id UUID;
  v_order_id UUID;
  v_order_item_id UUID;
  v_order_number INTEGER;
  v_order_slug TEXT;
  v_item_slug TEXT;
  v_product_name TEXT;
  v_user_id UUID;
  v_type_value TEXT := 'online_order';
BEGIN
  -- 1. إنشاء أو البحث عن العميل
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = p_phone AND organization_id = p_organization_id;
  
  IF v_customer_id IS NULL THEN
    -- إنشاء عميل جديد
    INSERT INTO customers (name, phone, organization_id)
    VALUES (p_full_name, p_phone, p_organization_id)
    RETURNING id INTO v_customer_id;
  END IF;
  
  -- 2. مباشرة إنشاء الطلب بدون عنوان
  -- بدلا من محاولة إنشاء عنوان، سنقوم بتخطي ذلك وإنشاء الطلب مباشرة
  
  -- 3. الحصول على اسم المنتج
  SELECT name INTO v_product_name
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id;
  
  -- 4. إنشاء slugs
  v_order_slug := 'ord-' || FLOOR(RANDOM() * 100000000)::TEXT;
  v_item_slug := 'itm-' || FLOOR(RANDOM() * 100000000)::TEXT;
  
  -- 5. إضافة الطلب في جدول orders بدون عنوان
  -- نستخدم NULL لحقل shipping_address_id
  INSERT INTO orders (
    customer_id,
    subtotal,
    tax,
    discount,
    total,
    status,
    payment_method,
    payment_status,
    shipping_address_id,
    shipping_method,
    shipping_cost,
    notes,
    is_online,
    organization_id,
    slug
  )
  VALUES (
    v_customer_id,
    p_total_price,
    0, 
    0, 
    p_total_price + p_delivery_fee,
    'pending',
    p_payment_method,
    'pending',
    NULL, -- نستخدم NULL للعنوان
    p_delivery_company,
    p_delivery_fee,
    p_notes || ' | العنوان: ' || p_province || ' - ' || p_address || ' | الاسم: ' || p_full_name || ' | الهاتف: ' || p_phone,
    TRUE, 
    p_organization_id,
    v_order_slug
  )
  RETURNING id, customer_order_number INTO v_order_id, v_order_number;
  
  -- 6. إضافة عناصر الطلب
  INSERT INTO order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    total_price,
    is_digital,
    organization_id,
    slug,
    name
  )
  VALUES (
    v_order_id,
    p_product_id,
    v_product_name,
    p_quantity,
    p_unit_price,
    p_total_price,
    FALSE, 
    p_organization_id,
    v_item_slug,
    v_product_name
  )
  RETURNING id INTO v_order_item_id;
  
  -- 7. تحديث المخزون للمنتج
  INSERT INTO inventory_log (
    product_id, 
    type, 
    quantity, 
    notes, 
    created_by, 
    organization_id,
    order_id
  )
  VALUES (
    p_product_id,
    v_type_value,
    -p_quantity,
    'بيع عبر المتجر الإلكتروني - طلب #' || v_order_number,
    NULL,
    p_organization_id,
    v_order_id
  );
  
  -- 8. إذا كان هناك لون محدد، يجب تحديث المخزون الخاص به
  IF p_product_color_id IS NOT NULL THEN
    UPDATE product_colors
    SET stock = stock - p_quantity
    WHERE id = p_product_color_id
    AND organization_id = p_organization_id;
  END IF;
  
  -- إرجاع النتيجة بنجاح
  RETURN json_build_object(
    'status', 'success',
    'order_id', v_order_id,
    'order_number', v_order_number,
    'customer_id', v_customer_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- 5. التحقق من حالة الجداول الهامة
SELECT
    t.table_name,
    COUNT(c.column_name) AS column_count
FROM
    information_schema.tables t
JOIN
    information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE
    t.table_schema = 'public'
    AND t.table_name IN ('orders', 'order_items', 'inventory_log', 'customers', 'products', 'product_colors', 'addresses')
GROUP BY
    t.table_name
ORDER BY
    t.table_name; 