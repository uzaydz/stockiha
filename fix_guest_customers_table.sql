-- إصلاح جدول guest_customers وجدول addresses وإعادة تعريف دالة process_online_order_new
-- المشكلة 1: عمود "phone" غير موجود في جدول guest_customers
-- المشكلة 2: عمود "city" و "postal_code" إلزامية في جدول addresses ولم تضف قيم لها

-- حذف الدوال الموجودة أولاً لتجنب خطأ تغيير نوع الإرجاع
DROP FUNCTION IF EXISTS process_online_order_new(text,text,text,text,text,text,text,uuid,uuid,integer,numeric,numeric,numeric,uuid);
DROP FUNCTION IF EXISTS process_online_order_new(text,text,text,text,text,text,text,uuid,uuid,uuid,text,integer,numeric,numeric,numeric,uuid);

-- 1. إضافة عمود 'phone' و 'organization_id' للجدول guest_customers إذا لم يكونا موجودين
ALTER TABLE guest_customers 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- إضافة مؤشر للبحث السريع
CREATE INDEX IF NOT EXISTS idx_guest_customers_phone_org ON guest_customers(phone, organization_id);

-- 2. إعادة تعريف الدالة process_online_order_new لتتوافق مع هيكل الجداول المحدث
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
  v_customer_id UUID;
  v_address_id UUID;
  v_order_id UUID;
  v_order_item_id UUID;
  v_customer_order_number INTEGER;
  v_product_name TEXT;
  v_color_name TEXT;
  v_selected_price NUMERIC := p_unit_price;
BEGIN
  -- تسجيل بيانات الطلب للمساعدة في تشخيص المشكلات
  RAISE NOTICE 'بدء معالجة طلب جديد. الاسم: %, الهاتف: %, المنطقة: %', 
               p_full_name, p_phone, p_province;

  -- 1. إنشاء أو تحديث بيانات العميل
  SELECT id INTO v_customer_id FROM guest_customers 
  WHERE phone = p_phone AND organization_id = p_organization_id
  LIMIT 1;
  
  IF v_customer_id IS NULL THEN
    INSERT INTO guest_customers (name, phone, organization_id, created_at)
    VALUES (p_full_name, p_phone, p_organization_id, NOW())
    RETURNING id INTO v_customer_id;
    
    RAISE NOTICE 'تم إنشاء عميل جديد بمعرف: %', v_customer_id;
  ELSE
    UPDATE guest_customers 
    SET name = p_full_name 
    WHERE id = v_customer_id;
    
    RAISE NOTICE 'تم تحديث بيانات العميل الحالي: %', v_customer_id;
  END IF;
  
  -- 2. إنشاء أو تحديث عنوان العميل
  SELECT id INTO v_address_id FROM addresses
  WHERE customer_id = v_customer_id AND organization_id = p_organization_id
  LIMIT 1;
  
  IF v_address_id IS NULL THEN
    -- إنشاء عنوان جديد
    INSERT INTO addresses (
      customer_id, 
      name, 
      street_address,
      city,          -- حقل إلزامي
      state, 
      postal_code,   -- حقل إلزامي
      country,
      phone,
      organization_id,
      is_default
    )
    VALUES (
      v_customer_id,
      p_full_name,
      p_address,
      p_province,    -- استخدام المحافظة كمدينة
      p_province,
      '00000',       -- رمز بريدي افتراضي
      'الجزائر',
      p_phone,
      p_organization_id,
      true
    )
    RETURNING id INTO v_address_id;
    
    RAISE NOTICE 'تم إنشاء عنوان جديد: %', v_address_id;
  ELSE
    -- تحديث عنوان موجود
    UPDATE addresses
    SET street_address = p_address,
        city = p_province,
        state = p_province,
        phone = p_phone
    WHERE id = v_address_id;
    
    RAISE NOTICE 'تم تحديث العنوان الحالي: %', v_address_id;
  END IF;
  
  -- 3. الحصول على رقم الطلب التالي
  SELECT COALESCE(MAX(customer_order_number), 0) + 1 
  INTO v_customer_order_number 
  FROM online_orders 
  WHERE organization_id = p_organization_id;
  
  RAISE NOTICE 'رقم الطلب الجديد: %', v_customer_order_number;
  
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
    p_total_price + p_delivery_fee,
    'pending',
    p_payment_method,
    'pending',
    v_address_id,
    p_delivery_company,
    p_delivery_fee,
    p_notes,
    p_organization_id,
    v_customer_order_number
  )
  RETURNING id INTO v_order_id;
  
  RAISE NOTICE 'تم إنشاء الطلب: %', v_order_id;
  
  -- 5. الحصول على اسم المنتج
  SELECT name INTO v_product_name FROM products WHERE id = p_product_id;
  
  -- الحصول على اسم اللون إذا كان متوفراً
  IF p_product_color_id IS NOT NULL THEN
    SELECT name INTO v_color_name FROM product_colors WHERE id = p_product_color_id;
  END IF;
  
  -- 6. التحقق من هيكل جدول online_order_items وإضافة الأعمدة المفقودة إذا لزم الأمر
  BEGIN
    ALTER TABLE online_order_items 
    ADD COLUMN IF NOT EXISTS color_id UUID,
    ADD COLUMN IF NOT EXISTS color_name TEXT,
    ADD COLUMN IF NOT EXISTS size_id UUID,
    ADD COLUMN IF NOT EXISTS size_name TEXT,
    ADD COLUMN IF NOT EXISTS selected_price NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'حدث خطأ أثناء تحديث جدول online_order_items: %', SQLERRM;
  END;
  
  -- 7. إنشاء عنصر الطلب مع معلومات اللون والمقاس
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
  
  RAISE NOTICE 'تم إنشاء عنصر الطلب: %', v_order_item_id;
  
  -- 8. تحديث المخزون - مع مراعاة اللون والمقاس
  IF p_product_size_id IS NOT NULL THEN
    -- خفض المخزون من المقاس
    UPDATE product_sizes
    SET quantity = quantity - p_quantity
    WHERE id = p_product_size_id;
    
    RAISE NOTICE 'تم تحديث مخزون المقاس: %', p_product_size_id;
  ELSIF p_product_color_id IS NOT NULL THEN
    -- خفض المخزون من اللون
    UPDATE product_colors
    SET quantity = quantity - p_quantity
    WHERE id = p_product_color_id;
    
    RAISE NOTICE 'تم تحديث مخزون اللون: %', p_product_color_id;
  ELSE
    -- خفض المخزون من المنتج الرئيسي
    UPDATE products
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_product_id;
    
    RAISE NOTICE 'تم تحديث مخزون المنتج: %', p_product_id;
  END IF;
  
  -- 9. إرجاع معلومات الطلب
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_customer_order_number,
    'status', 'success'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- تسجيل تفاصيل الخطأ للمساعدة في التشخيص
  RAISE NOTICE 'حدث خطأ أثناء معالجة الطلب: %, SQLSTATE: %', SQLERRM, SQLSTATE;
  
  RETURN jsonb_build_object(
    'status', 'error',
    'error', SQLERRM,
    'detail', SQLSTATE,
    'context', CASE 
      WHEN v_customer_id IS NULL THEN 'فشل في إنشاء أو العثور على العميل'
      WHEN v_address_id IS NULL THEN 'فشل في إنشاء أو تحديث العنوان'
      WHEN v_order_id IS NULL THEN 'فشل في إنشاء الطلب'
      WHEN v_order_item_id IS NULL THEN 'فشل في إنشاء عنصر الطلب'
      ELSE 'خطأ غير معروف في معالجة الطلب'
    END
  );
END;
$$ LANGUAGE plpgsql;

-- 3. إنشاء إصدار بديل من الدالة مع عدد أقل من المعلمات للتوافق مع الاستدعاءات القديمة
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
) RETURNS JSONB AS $$
BEGIN
  -- استدعاء النسخة الأحدث من الدالة مع وضع قيم فارغة للمعلمات الإضافية
  RETURN process_online_order_new(
    p_full_name, p_phone, p_province, p_address, p_delivery_company, 
    p_payment_method, p_notes, p_product_id, p_product_color_id, 
    NULL, NULL, p_quantity, p_unit_price, p_total_price, p_delivery_fee, p_organization_id
  );
END;
$$ LANGUAGE plpgsql; 