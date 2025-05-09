-- حل مشكلة عمود shipping_option غير الموجود في جدول online_orders

-- 1. إضافة عمود shipping_option إلى جدول online_orders
ALTER TABLE online_orders 
  ADD COLUMN IF NOT EXISTS shipping_option TEXT;

-- 2. إعادة إنشاء وظيفة process_online_order_new مع معالجة المشكلة
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
  
  -- 2. إنشاء عنوان جديد للطلب - مع معالجة جميع الأعمدة المطلوبة
  INSERT INTO addresses (
    customer_id, 
    name, 
    state, 
    city,
    street_address, 
    country,
    organization_id,
    postal_code,
    phone,
    municipality,
    is_default
  )
  VALUES (
    v_customer_id,
    p_full_name,
    p_province,
    COALESCE(p_city, p_municipality, 'غير محدد'),
    p_address,
    'الجزائر',
    p_organization_id,
    '00000',  -- قيمة افتراضية للرمز البريدي
    p_phone,  -- استخدام رقم الهاتف من البيانات
    p_municipality,
    TRUE -- تعيين كعنوان افتراضي
  )
  RETURNING id INTO v_address_id;
  
  -- 3. الحصول على رقم الطلب التالي
  SELECT COALESCE(MAX(customer_order_number), 0) + 1 
  INTO v_customer_order_number 
  FROM online_orders 
  WHERE organization_id = p_organization_id;
  
  -- 4. إنشاء الطلب (مع تخطي عمود shipping_option)
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
    shipping_cost,
    notes,
    organization_id,
    customer_order_number,
    form_data,
    slug,
    shipping_option  -- إضافة عمود shipping_option بعد إنشائه
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
    p_delivery_fee,
    p_notes,
    p_organization_id,
    v_customer_order_number,
    p_form_data,
    'order-' || v_customer_order_number,  -- إنشاء slug فريد
    p_delivery_option  -- استخدام خيار التوصيل المقدم
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
    selected_price,
    slug,  -- إضافة slug لتجنب خطأ آخر
    name   -- إضافة name لتجنب خطأ آخر
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
    p_unit_price,
    'item-' || v_customer_order_number || '-1',  -- إنشاء slug فريد
    v_product_name  -- اسم المنتج كاسم للعنصر
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