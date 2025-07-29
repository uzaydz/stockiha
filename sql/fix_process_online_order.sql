-- تصحيح دالة process_online_order لتعمل مع النسخة الصحيحة من process_online_order_new
CREATE OR REPLACE FUNCTION process_online_order(
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
  p_organization_id UUID,
  p_stop_desk_id TEXT DEFAULT NULL
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
  -- متغيرات خصم المخزون التلقائي
  v_auto_deduct_inventory BOOLEAN := FALSE;
  v_org_settings TEXT;
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
  v_city := COALESCE(p_province, 'غير محدد');
  
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
      p_province,
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
    shipping_cost,
    notes,
    organization_id,
    customer_order_number
  )
  VALUES (
    v_customer_id,
    p_total_price,
    0,
    0,
    p_total_price + p_delivery_fee, -- الإجمالي = سعر المنتجات + رسوم الشحن
    'pending',
    COALESCE(p_payment_method, 'cod'),
    'pending',
    v_address_id,
    COALESCE(p_delivery_company, ''),
    p_delivery_fee,
    p_notes,
    p_organization_id,
    v_customer_order_number
  )
  RETURNING id INTO v_order_id;
  
  -- 5. الحصول على اسم المنتج
  SELECT name INTO v_product_name FROM products WHERE id = p_product_id;
  
  -- الحصول على اسم اللون إذا كان متوفراً
  IF p_product_color_id IS NOT NULL THEN
    SELECT name INTO v_color_name FROM product_colors WHERE id = p_product_color_id;
  END IF;
  
  -- 6. إنشاء عنصر الطلب
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
    COALESCE(p_unit_price, 0)
  )
  RETURNING id INTO v_order_item_id;
  
  -- 7. تحديث المخزون مع مراعاة إعدادات المؤسسة
  -- التحقق من إعدادات المؤسسة لخصم المخزون التلقائي
  SELECT custom_js INTO v_org_settings 
  FROM organization_settings 
  WHERE organization_id = p_organization_id;
  
  -- استخراج إعداد خصم المخزون التلقائي
  IF v_org_settings IS NOT NULL AND v_org_settings != '' THEN
    v_auto_deduct_inventory := COALESCE((v_org_settings::jsonb->>'auto_deduct_inventory')::BOOLEAN, FALSE);
  END IF;
  
  -- خصم المخزون فقط إذا كان مفعلاً في إعدادات المؤسسة
  IF v_auto_deduct_inventory = TRUE THEN
    IF p_product_color_id IS NOT NULL THEN
      -- خفض المخزون من اللون
      UPDATE product_colors
      SET quantity = quantity - COALESCE(p_quantity, 1)
      WHERE id = p_product_color_id;
    ELSE
      -- خفض المخزون من المنتج الرئيسي
      UPDATE products
      SET stock_quantity = stock_quantity - COALESCE(p_quantity, 1)
      WHERE id = p_product_id;
    END IF;
  END IF;
  
  -- 8. إرجاع معلومات الطلب
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_customer_order_number,
    'status', 'success',
    'auto_deduct_inventory', v_auto_deduct_inventory
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الأذونات
GRANT EXECUTE ON FUNCTION process_online_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, INTEGER, NUMERIC, NUMERIC, NUMERIC, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION process_online_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, INTEGER, NUMERIC, NUMERIC, NUMERIC, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_online_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, INTEGER, NUMERIC, NUMERIC, NUMERIC, UUID, TEXT) TO service_role;

-- تحديث cache Supabase
NOTIFY pgrst, 'reload schema'; 