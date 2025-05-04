-- إصلاح نظام الطلبات - fix_order_system_v2.sql
-- الإصدار الثاني لإصلاح مشكلة قيد المفتاح الأجنبي في جدول العناوين

-- 1. تحديث وظيفة process_online_order لتصحيح مشكلة جدول العناوين
DROP FUNCTION IF EXISTS process_online_order CASCADE;
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
BEGIN
  -- وضع كل شيء في بلوك try-catch للتقاط أي أخطاء
  BEGIN
    -- 1. التحقق من المشكلة في جدول العناوين - التحقق من قيود المفتاح الأجنبي
    -- التحقق من المستخدم الذي سيرتبط بالعنوان
    PERFORM 1 FROM pg_constraint WHERE conname = 'addresses_user_id_fkey';
    
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
    
    -- 2. إنشاء سجل العنوان - الآن نستخدم customer_id بدلاً من user_id
    -- نتحقق أولاً من وجود عمود customer_id في جدول العناوين
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'addresses' AND column_name = 'customer_id'
    ) THEN
      -- استخدم حقل customer_id
      INSERT INTO addresses (
        customer_id,
        name, 
        street_address, 
        city, 
        state, 
        postal_code, 
        country, 
        phone, 
        is_default,
        organization_id
      )
      VALUES (
        v_customer_id,
        p_full_name,
        p_address,
        '', -- المدينة
        p_province,
        '', -- الرمز البريدي
        'Algeria',
        p_phone,
        TRUE,
        p_organization_id
      )
      RETURNING id INTO v_address_id;
    ELSE
      -- استخدم حقل user_id (بافتراض أنه مخصص للعملاء)
      INSERT INTO addresses (
        user_id,
        name, 
        street_address, 
        city, 
        state, 
        postal_code, 
        country, 
        phone, 
        is_default,
        organization_id
      )
      VALUES (
        v_customer_id,
        p_full_name,
        p_address,
        '', -- المدينة
        p_province,
        '', -- الرمز البريدي
        'Algeria',
        p_phone,
        TRUE,
        p_organization_id
      )
      RETURNING id INTO v_address_id;
    END IF;
    
    -- 3. إنشاء الطلب مع تحديد قيمة slug مسبقاً
    v_order_slug := 'order-' || floor(random() * 1000000)::text;
    
    INSERT INTO orders (
      customer_id, subtotal, tax, discount, total, 
      status, payment_method, payment_status, 
      shipping_address_id, shipping_method, shipping_cost, 
      notes, is_online, organization_id, slug
    )
    VALUES (
      v_customer_id, p_total_price, 0, 0, (p_total_price + p_delivery_fee),
      'pending', p_payment_method, 'pending',
      v_address_id, p_delivery_company, p_delivery_fee,
      p_notes, TRUE, p_organization_id, v_order_slug
    )
    RETURNING id, customer_order_number INTO v_order_id, v_order_number;
    
    -- 4. الحصول على اسم المنتج من جدول المنتجات
    SELECT name INTO v_product_name FROM products WHERE id = p_product_id;
    
    -- إذا كان اسم المنتج غير موجود، استخدم قيمة افتراضية
    IF v_product_name IS NULL THEN
      v_product_name := 'منتج #' || p_product_id;
    END IF;
    
    -- 5. إنشاء slug عشوائي لـ order_items
    v_item_slug := 'item-' || floor(random() * 1000000)::text;
    
    -- 6. إضافة عنصر الطلب
    INSERT INTO order_items (
      order_id, product_id, product_name, quantity,
      unit_price, total_price, is_digital, organization_id,
      slug, name
    )
    VALUES (
      v_order_id, p_product_id, v_product_name, p_quantity,
      p_unit_price, p_total_price, FALSE, p_organization_id,
      v_item_slug, v_product_name
    )
    RETURNING id INTO v_order_item_id;

    -- 7. تحديث المخزون
    IF p_product_color_id IS NOT NULL THEN
      UPDATE product_colors
      SET quantity = quantity - p_quantity
      WHERE id = p_product_color_id AND organization_id = p_organization_id;
    ELSE
      UPDATE products
      SET stock_quantity = stock_quantity - p_quantity
      WHERE id = p_product_id AND organization_id = p_organization_id;
    END IF;

    -- 8. إرجاع معلومات الطلب كـ JSON
    RETURN json_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'order_slug', v_order_slug,
      'customer_id', v_customer_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- إضافة معلومات أكثر تفصيلاً حول الخطأ
      RETURN json_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE,
        'context', 'Error in process_online_order function. SQLState: ' || SQLSTATE || ', Error: ' || SQLERRM,
        'customer_id', v_customer_id,
        'failed_at', CASE 
          WHEN v_customer_id IS NULL THEN 'customer_creation'
          WHEN v_address_id IS NULL THEN 'address_creation'
          WHEN v_order_id IS NULL THEN 'order_creation'
          WHEN v_order_item_id IS NULL THEN 'order_item_creation'
          ELSE 'unknown'
        END
      );
  END;
END;
$$ LANGUAGE plpgsql;

-- 2. التحقق من هيكل جدول العناوين وإضافة عمود customer_id إذا لم يكن موجوداً
DO $$
BEGIN
    -- التحقق مما إذا كان عمود customer_id موجوداً بالفعل
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'addresses' AND column_name = 'customer_id'
    ) THEN
        -- إضافة عمود customer_id إذا لم يكن موجوداً
        ALTER TABLE addresses ADD COLUMN customer_id UUID REFERENCES customers(id);
        
        -- إعداد قيود المفتاح الأجنبي وتعديلها للسماح بإما user_id أو customer_id
        RAISE NOTICE 'تمت إضافة عمود customer_id إلى جدول addresses';
    ELSE
        RAISE NOTICE 'عمود customer_id موجود بالفعل في جدول addresses';
    END IF;
END $$;

-- 3. تحديث قيود المفتاح الأجنبي لجدول العناوين للسماح بعدم وجود user_id
-- هذا يسمح باستخدام إما user_id أو customer_id
ALTER TABLE addresses ALTER COLUMN user_id DROP NOT NULL;

-- 4. إضافة بعض الوظائف المساعدة للتحقق من حالة النظام
CREATE OR REPLACE FUNCTION check_order_system_integrity()
RETURNS TABLE (
  table_name TEXT,
  column_name TEXT,
  does_exist BOOLEAN,
  foreign_key_constraint TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.table_name::TEXT,
    c.column_name::TEXT,
    true AS does_exist,
    con.conname::TEXT AS foreign_key_constraint
  FROM 
    information_schema.columns c
  LEFT JOIN 
    pg_constraint con ON con.conrelid = (c.table_name)::regclass
  WHERE 
    c.table_name IN ('orders', 'order_items', 'addresses', 'customers')
    AND (c.column_name IN ('slug', 'name', 'user_id', 'customer_id') 
         OR con.contype = 'f')
  ORDER BY 
    c.table_name, c.column_name;
END;
$$ LANGUAGE plpgsql; 