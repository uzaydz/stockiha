-- وظيفة معالجة الطلبات عبر الإنترنت مع معالجة البيانات المفقودة
CREATE OR REPLACE FUNCTION process_online_order_new(
  p_full_name TEXT,
  p_phone TEXT,
  p_province TEXT, 
  p_municipality TEXT,
  p_address TEXT DEFAULT '',
  p_city TEXT DEFAULT NULL,
  p_delivery_company TEXT DEFAULT '',
  p_delivery_option TEXT DEFAULT 'home',
  p_payment_method TEXT DEFAULT 'cod',
  p_notes TEXT DEFAULT '',
  p_product_id UUID,
  p_product_color_id UUID DEFAULT NULL,
  p_product_size_id UUID DEFAULT NULL,
  p_size_name TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_unit_price NUMERIC DEFAULT 0,
  p_total_price NUMERIC DEFAULT 0,
  p_delivery_fee NUMERIC DEFAULT 0,
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
  v_city TEXT;
BEGIN
  -- التأكد من وجود القيم الأساسية
  IF p_full_name IS NULL OR p_phone IS NULL OR p_province IS NULL OR p_product_id IS NULL OR p_organization_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error', 'البيانات الأساسية مفقودة',
      'detail', 'يجب توفير الاسم ورقم الهاتف والولاية ومعرف المنتج ومعرف المؤسسة'
    );
  END IF;

  -- التأكد من وجود قيمة مناسبة للمدينة
  v_city := COALESCE(p_city, p_municipality, p_province, 'غير محدد');
  
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
  
  -- 2. إنشاء عنوان جديد
  BEGIN
    INSERT INTO addresses (
      customer_id,
      name,
      state,
      municipality,
      street_address,
      city,
      country,
      organization_id
    )
    VALUES (
      v_customer_id,
      p_full_name,
      p_province,
      COALESCE(p_municipality, p_province),
      COALESCE(p_address, 'غير محدد'),
      v_city,
      'الجزائر',
      p_organization_id
    )
    RETURNING id INTO v_address_id;
  EXCEPTION WHEN OTHERS THEN
    -- إذا فشل إدخال العنوان، أنشئ عنوانًا بالحد الأدنى من البيانات
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
      p_province,
      'غير محدد',
      'الجزائر',
      p_organization_id
    )
    RETURNING id INTO v_address_id;
  END;
  
  -- 3. الحصول على رقم الطلب التالي
  SELECT COALESCE(MAX(customer_order_number), 0) + 1 
  INTO v_customer_order_number 
  FROM online_orders 
  WHERE organization_id = p_organization_id;
  
  -- 4. إنشاء الطلب مع بيانات النموذج
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
    form_data
  )
  VALUES (
    v_customer_id,
    p_total_price,
    0,
    0,
    p_total_price + p_delivery_fee,
    'pending',
    COALESCE(p_payment_method, 'cod'),
    'pending',
    v_address_id,
    COALESCE(p_delivery_company, ''),
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
    COALESCE(p_quantity, 1),
    COALESCE(p_unit_price, 0),
    COALESCE(p_total_price, 0),
    p_organization_id,
    p_product_color_id,
    v_color_name,
    p_product_size_id,
    p_size_name,
    COALESCE(p_unit_price, 0)
  )
  RETURNING id INTO v_order_item_id;
  
  -- 7. تحديث المخزون - مع مراعاة اللون والمقاس
  IF p_product_size_id IS NOT NULL THEN
    -- خفض المخزون من المقاس
    UPDATE product_sizes
    SET quantity = quantity - COALESCE(p_quantity, 1)
    WHERE id = p_product_size_id;
  ELSIF p_product_color_id IS NOT NULL THEN
    -- خفض المخزون من اللون
    UPDATE product_colors
    SET quantity = quantity - COALESCE(p_quantity, 1)
    WHERE id = p_product_color_id;
  
    -- خفض المخزون من المنتج الرئيسي
    UPDATE products
    SET stock_quantity = stock_quantity - COALESCE(p_quantity, 1)
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