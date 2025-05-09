-- إجراء مخزن معدل للاختبار
CREATE OR REPLACE FUNCTION process_online_order_test(
  p_full_name TEXT,
  p_phone TEXT,
  p_province TEXT,
  p_address TEXT,
  p_delivery_company TEXT,
  p_payment_method TEXT,
  p_notes TEXT,
  p_product_id UUID,
  p_product_color_id UUID,
  p_product_size_id UUID,
  p_size_name TEXT,
  p_quantity INTEGER,
  p_unit_price NUMERIC,
  p_total_price NUMERIC,
  p_delivery_fee NUMERIC,
  p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_address_id UUID;
  v_order_id UUID;
  v_customer_order_number INTEGER := 1;
BEGIN
  -- 1. إنشاء عميل جديد
  INSERT INTO guest_customers (name, phone, organization_id)
  VALUES (p_full_name, p_phone, p_organization_id)
  RETURNING id INTO v_customer_id;
  
  -- 2. إنشاء عنوان جديد
  INSERT INTO addresses (
    customer_id,
    name,
    state,
    street_address,
    country,
    organization_id
  )
  VALUES (
    v_customer_id,
    p_full_name,
    p_province,
    p_address,
    'الجزائر',
    p_organization_id
  )
  RETURNING id INTO v_address_id;
  
  -- 3. اختبار للمخرجات
  RETURN jsonb_build_object(
    'status', 'success',
    'customer_id', v_customer_id,
    'address_id', v_address_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql;

-- حل مشكلة تعارض الدوال في process_online_order_new

-- 1. حذف النسخ الموجودة من الدالة لتجنب التعارض
DROP FUNCTION IF EXISTS process_online_order_new(text, text, text, text, text, text, text, text, text, text, uuid, uuid, uuid, text, integer, numeric, numeric, numeric, uuid, jsonb);
DROP FUNCTION IF EXISTS process_online_order_new(text, text, text, text, uuid, uuid, text, text, text, text, text, text, uuid, uuid, text, integer, numeric, numeric, numeric, jsonb);
DROP FUNCTION IF EXISTS process_online_order_new(text, text, text, text, text, text, text, text, text, text, uuid, uuid, uuid, text, integer, numeric, numeric, numeric, uuid);

-- 2. إنشاء دالة جديدة محسنة تدعم البيانات المخصصة
CREATE OR REPLACE FUNCTION process_online_order_new(
  p_full_name TEXT,
  p_phone TEXT,
  p_province TEXT,
  p_municipality TEXT,
  p_address TEXT,
  p_city TEXT,
  p_delivery_company TEXT,
  p_delivery_option TEXT,
  p_payment_method TEXT,
  p_notes TEXT,
  p_product_id UUID,
  p_product_color_id UUID,
  p_product_size_id UUID,
  p_size_name TEXT,
  p_quantity INTEGER,
  p_unit_price NUMERIC,
  p_total_price NUMERIC,
  p_delivery_fee NUMERIC,
  p_organization_id UUID,
  p_form_data JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_address_id UUID;
  v_order_id UUID;
  v_order_item_id UUID;
  v_customer_order_number INTEGER;
  v_product_name TEXT;
  v_color_name TEXT;
BEGIN
  -- 1. إنشاء أو تحديث بيانات العميل
  SELECT id INTO v_customer_id FROM guest_customers 
  WHERE phone = p_phone AND organization_id = p_organization_id
  LIMIT 1;
  
  IF v_customer_id IS NULL THEN
    INSERT INTO guest_customers (name, phone, organization_id)
    VALUES (p_full_name, p_phone, p_organization_id)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE guest_customers 
    SET name = p_full_name 
    WHERE id = v_customer_id;
  END IF;
  
  -- 2. إنشاء عنوان جديد للطلب
  INSERT INTO addresses (
    customer_id, 
    name, 
    state, 
    city,
    street_address, 
    country,
    organization_id
  )
  VALUES (
    v_customer_id,
    p_full_name,
    p_province,
    COALESCE(p_municipality, p_city, 'غير محدد'),
    p_address,
    'الجزائر',
    p_organization_id
  )
  RETURNING id INTO v_address_id;
  
  -- 3. الحصول على رقم الطلب التالي
  SELECT COALESCE(MAX(customer_order_number), 0) + 1 
  INTO v_customer_order_number 
  FROM online_orders 
  WHERE organization_id = p_organization_id;
  
  -- 4. إنشاء الطلب
  INSERT INTO online_orders (
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
    shipping_option,
    shipping_cost,
    notes,
    organization_id,
    customer_order_number,
    form_data
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
    v_address_id,
    p_delivery_company,
    p_delivery_option,
    p_delivery_fee,
    p_notes,
    p_organization_id,
    v_customer_order_number,
    p_form_data
  )
  RETURNING id INTO v_order_id;
  
  -- 5. الحصول على اسم المنتج
  SELECT name INTO v_product_name FROM products WHERE id = p_product_id;
  
  -- الحصول على اسم اللون إذا كان متوفراً
  IF p_product_color_id IS NOT NULL THEN
    SELECT name INTO v_color_name FROM product_colors WHERE id = p_product_color_id;
  END IF;
  
  -- 6. إنشاء عنصر الطلب مع معلومات اللون والمقاس
  INSERT INTO online_order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    total_price,
    organization_id,
    color_id,
    color_name,
    size_id,
    size_name,
    selected_price
  )
  VALUES (
    v_order_id,
    p_product_id,
    v_product_name,
    p_quantity,
    p_unit_price,
    p_total_price,
    p_organization_id,
    p_product_color_id,
    v_color_name,
    p_product_size_id,
    p_size_name,
    p_unit_price
  )
  RETURNING id INTO v_order_item_id;
  
  -- 7. تحديث المخزون - مع مراعاة اللون والمقاس
  IF p_product_size_id IS NOT NULL THEN
    -- خفض المخزون من المقاس
    UPDATE product_sizes
    SET quantity = quantity - p_quantity
    WHERE id = p_product_size_id;
  ELSIF p_product_color_id IS NOT NULL THEN
    -- خفض المخزون من اللون
    UPDATE product_colors
    SET quantity = quantity - p_quantity
    WHERE id = p_product_color_id;
  ELSE
    -- خفض المخزون من المنتج الرئيسي
    UPDATE products
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_product_id;
  END IF;
  
  -- 8. إرجاع معلومات الطلب
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_customer_order_number,
    'status', 'success'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql;

-- 3. إضافة تعليق توثيقي للدالة
COMMENT ON FUNCTION process_online_order_new(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  UUID, UUID, UUID, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, UUID, JSONB
) IS 'دالة معالجة الطلبات الجديدة التي تدعم حفظ البيانات المخصصة من النماذج المخصصة';

-- 4. التأكد من أن عمود form_data موجود في جدول online_orders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'online_orders' AND column_name = 'form_data'
  ) THEN
    ALTER TABLE online_orders ADD COLUMN form_data JSONB DEFAULT NULL;
  END IF;
END $$; 