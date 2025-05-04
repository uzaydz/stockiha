-- إصلاح لمشكلة القيد الأجنبي في جدول العناوين
-- المشكلة: يوجد قيد أجنبي يربط حقل customer_id في جدول addresses بجدول customers
-- بينما نحتاج إلى ربطه بجدول guest_customers للطلبات عبر الإنترنت

-- 1. إنشاء نسخة محدثة من وظيفة process_online_order_new لتستخدم جدول guest_customers
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
  p_product_size_id UUID,
  p_size_name TEXT,
  p_quantity INTEGER,
  p_unit_price NUMERIC,
  p_total_price NUMERIC,
  p_delivery_fee NUMERIC,
  p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_guest_customer_id UUID;
  v_address_id UUID;
  v_order_id UUID;
  v_order_item_id UUID;
  v_customer_order_number INTEGER;
  v_product_name TEXT;
  v_color_name TEXT;
BEGIN
  -- 1. إنشاء أو تحديث بيانات العميل الزائر
  SELECT id INTO v_guest_customer_id FROM guest_customers 
  WHERE phone = p_phone AND organization_id = p_organization_id
  LIMIT 1;
  
  IF v_guest_customer_id IS NULL THEN
    -- إنشاء سجل عميل زائر جديد
    INSERT INTO guest_customers (name, phone, organization_id)
    VALUES (p_full_name, p_phone, p_organization_id)
    RETURNING id INTO v_guest_customer_id;
  ELSE
    -- تحديث بيانات العميل الزائر الموجود
    UPDATE guest_customers 
    SET name = p_full_name 
    WHERE id = v_guest_customer_id;
  END IF;

  -- 2. إنشاء العنوان باستخدام معرف العميل الزائر
  -- نستخدم العنوان مباشرة في متغير حقل العنوان (street_address) بدلاً من حقل اسم العنوان (name)
  BEGIN
    INSERT INTO addresses (
      customer_id,     -- معرف العميل الزائر
      name,            -- إسم مستلم الطلب
      street_address,  -- عنوان الشارع
      city,            -- المدينة/الولاية
      state,           -- المقاطعة
      postal_code,     -- الرمز البريدي (اختياري)
      country,         -- الدولة
      phone,           -- رقم الهاتف
      organization_id  -- معرف المنظمة
    )
    VALUES (
      v_guest_customer_id,
      p_full_name,
      p_address,
      p_province,
      p_province,
      '00000',         -- قيمة افتراضية للرمز البريدي
      'الجزائر',       -- قيمة افتراضية للدولة
      p_phone,
      p_organization_id
    )
    RETURNING id INTO v_address_id;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'error', SQLERRM,
        'detail', SQLSTATE,
        'context', 'فشل في إنشاء أو تحديث العنوان'
      );
  END;

  -- 3. الحصول على رقم الطلب التالي
  SELECT COALESCE(MAX(customer_order_number), 0) + 1 
  INTO v_customer_order_number 
  FROM online_orders 
  WHERE organization_id = p_organization_id;
  
  -- 4. إنشاء الطلب
  BEGIN
    INSERT INTO online_orders (
      customer_id,
      subtotal,
      total,
      status,
      payment_method,
      payment_status,
      shipping_cost,
      notes,
      organization_id,
      slug,
      customer_order_number,
      tax,              -- إضافة الضريبة (مطلوبة)
      discount,         -- إضافة الخصم (مطلوب في معظم الحالات)
      shipping_address_id, -- معرف عنوان الشحن
      shipping_method,  -- طريقة الشحن
      created_at,       -- تاريخ الإنشاء
      updated_at        -- تاريخ التحديث
    )
    VALUES (
      v_guest_customer_id,
      p_total_price,
      p_total_price + p_delivery_fee,
      'pending',
      p_payment_method,
      CASE WHEN p_payment_method = 'cash_on_delivery' THEN 'pending' ELSE 'paid' END,
      p_delivery_fee,
      p_notes,
      p_organization_id,
      'order-' || v_customer_order_number,
      v_customer_order_number,
      0,                -- قيمة 0 للضريبة كقيمة افتراضية
      0,                -- قيمة 0 للخصم كقيمة افتراضية
      v_address_id,     -- استخدام العنوان الذي تم إنشاؤه
      p_delivery_company, -- استخدام شركة التوصيل المحددة
      NOW(),            -- الوقت الحالي لتاريخ الإنشاء
      NOW()             -- الوقت الحالي لتاريخ التحديث
    )
    RETURNING id INTO v_order_id;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'error', SQLERRM,
        'detail', SQLSTATE,
        'context', 'فشل في إنشاء الطلب'
      );
  END;
  
  -- 5. الحصول على معلومات المنتج واللون
  SELECT name INTO v_product_name
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id;
  
  IF p_product_color_id IS NOT NULL THEN
    SELECT name INTO v_color_name
    FROM product_colors
    WHERE id = p_product_color_id;
  END IF;
  
  -- 6. إنشاء عنصر الطلب
  BEGIN
    INSERT INTO online_order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      total_price,
      organization_id,
      slug,
      name,
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
      'item-' || v_customer_order_number || '-1',
      v_product_name,
      p_product_color_id,
      v_color_name,
      p_product_size_id,
      p_size_name,
      p_unit_price
    )
    RETURNING id INTO v_order_item_id;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'error', SQLERRM,
        'detail', SQLSTATE,
        'context', 'فشل في إنشاء عنصر الطلب'
      );
  END;
  
  -- 7. تحديث المخزون
  BEGIN
    -- إذا كان هناك لون محدد
    IF p_product_color_id IS NOT NULL THEN
      -- إذا كان هناك مقاس محدد
      IF p_product_size_id IS NOT NULL THEN
        UPDATE product_sizes
        SET quantity = quantity - p_quantity
        WHERE id = p_product_size_id AND color_id = p_product_color_id;
      ELSE
        -- تحديث كمية اللون
        UPDATE product_colors
        SET quantity = quantity - p_quantity
        WHERE id = p_product_color_id;
      END IF;
    ELSE
      -- تحديث كمية المنتج الأساسية
      UPDATE products
      SET stock_quantity = stock_quantity - p_quantity
      WHERE id = p_product_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'error', SQLERRM,
        'detail', SQLSTATE,
        'context', 'فشل في تحديث المخزون'
      );
  END;
  
  -- 8. إرجاع معلومات الطلب الناجح
  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', v_order_id,
    'order_number', v_customer_order_number,
    'total', p_total_price + p_delivery_fee
  );
END;
$$ LANGUAGE plpgsql; 