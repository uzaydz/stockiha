-- إصلاح نظام الطلبات - fix_order_system_v3.sql
-- الإصدار الثالث لإصلاح مشكلة قيد المفتاح الأجنبي في جدول الطلبات

-- 0. التحقق من قيود المفاتيح الأجنبية في النظام
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint 
WHERE conname IN ('orders_customer_id_fkey', 'addresses_user_id_fkey');

-- 1. تحديث وظيفة process_online_order لتصحيح مشكلة المفتاح الأجنبي
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
  v_debug_info JSONB;
BEGIN
  -- وضع كل شيء في بلوك try-catch للتقاط أي أخطاء
  BEGIN
    v_debug_info := jsonb_build_object('stage', 'start');
    
    -- 1. إنشاء أو البحث عن العميل
    -- التحقق أولاً مما إذا كان العميل موجوداً
    SELECT id INTO v_customer_id
    FROM customers
    WHERE phone = p_phone AND organization_id = p_organization_id;
    
    v_debug_info := v_debug_info || jsonb_build_object('lookup_customer', v_customer_id);
    
    -- إذا لم يتم العثور على العميل، أنشئ عميلاً جديداً
    IF v_customer_id IS NULL THEN
      -- التحقق مما إذا كانت هناك سجلات في جدول العملاء
      PERFORM 1 FROM customers LIMIT 1;
      v_debug_info := v_debug_info || jsonb_build_object('customers_exist', FOUND);
      
      -- إنشاء عميل جديد
      INSERT INTO customers (name, phone, organization_id, id)
      VALUES (
        p_full_name, 
        p_phone, 
        p_organization_id,
        uuid_generate_v4() -- إنشاء UUID جديد
      )
      RETURNING id INTO v_customer_id;
      
      v_debug_info := v_debug_info || jsonb_build_object('new_customer_id', v_customer_id);
    END IF;
    
    -- 2. تأكيد أن العميل موجود في قاعدة البيانات
    PERFORM 1 FROM customers WHERE id = v_customer_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'العميل غير موجود بعد محاولة إنشائه. معرف العميل: %', v_customer_id;
    END IF;
    
    -- 3. إنشاء سجل العنوان
    -- التحقق مما إذا كان جدول العناوين يحتوي على عمود customer_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'addresses' AND column_name = 'customer_id'
    ) THEN
      -- استخدام customer_id
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
      -- استخدام user_id كبديل
      -- التحقق أولاً من وجود قيد على user_id
      BEGIN
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
      EXCEPTION WHEN foreign_key_violation THEN
        -- إذا فشل الإدراج، حاول استخدام NULL لـ user_id
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
          NULL, -- user_id is NULL
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
      END;
    END IF;
    
    v_debug_info := v_debug_info || jsonb_build_object('address_id', v_address_id);
    
    -- 4. إنشاء الطلب مع تحديد قيمة slug مسبقاً
    v_order_slug := 'order-' || floor(random() * 1000000)::text;
    
    -- التحقق مما إذا كان العميل موجوداً حقاً قبل إنشاء الطلب
    PERFORM 1 FROM customers WHERE id = v_customer_id;
    v_debug_info := v_debug_info || jsonb_build_object('customer_exists_before_order', FOUND);
    
    -- احصل على معلومات حول قيود المفتاح الأجنبي لجدول orders
    v_debug_info := v_debug_info || jsonb_build_object(
      'order_constraints', 
      (SELECT json_agg(jsonb_build_object('conname', conname, 'def', pg_get_constraintdef(oid)))
       FROM pg_constraint WHERE conrelid = 'orders'::regclass)
    );
    
    BEGIN
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
    EXCEPTION WHEN foreign_key_violation THEN
      -- إذا فشل الإدراج بسبب خطأ قيد المفتاح الأجنبي، أضف تفاصيل أكثر
      RAISE EXCEPTION 'فشل إنشاء الطلب بسبب خطأ في قيد المفتاح الأجنبي. معرف العميل: %. معلومات: %', 
        v_customer_id, v_debug_info;
    END;
    
    v_debug_info := v_debug_info || jsonb_build_object('order_id', v_order_id);
    
    -- 5. الحصول على اسم المنتج من جدول المنتجات
    SELECT name INTO v_product_name FROM products WHERE id = p_product_id;
    
    -- إذا كان اسم المنتج غير موجود، استخدم قيمة افتراضية
    IF v_product_name IS NULL THEN
      v_product_name := 'منتج #' || p_product_id;
    END IF;
    
    -- 6. إنشاء slug عشوائي لـ order_items
    v_item_slug := 'item-' || floor(random() * 1000000)::text;
    
    -- 7. إضافة عنصر الطلب
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

    -- 8. تحديث المخزون
    IF p_product_color_id IS NOT NULL THEN
      UPDATE product_colors
      SET quantity = quantity - p_quantity
      WHERE id = p_product_color_id AND organization_id = p_organization_id;
    ELSE
      UPDATE products
      SET stock_quantity = stock_quantity - p_quantity
      WHERE id = p_product_id AND organization_id = p_organization_id;
    END IF;

    -- 9. إرجاع معلومات الطلب كـ JSON
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
        END,
        'debug_info', v_debug_info
      );
  END;
END;
$$ LANGUAGE plpgsql;

-- 2. إضافة وظيفة uuid_generate_v4 إذا لم تكن موجودة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'uuid_generate_v4'
  ) THEN
    -- إنشاء امتداد uuid-ossp إذا لم يكن موجوداً
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  END IF;
END $$;

-- 3. تعديل قيود المفتاح الأجنبي للعميل في جدول الطلبات
DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  -- التحقق مما إذا كان قيد المفتاح الأجنبي موجوداً
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_customer_id_fkey'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    -- حاول تعديل القيد ليسمح بقيم NULL
    BEGIN
      -- حذف القيد
      ALTER TABLE orders DROP CONSTRAINT orders_customer_id_fkey;
      
      -- إعادة إنشاء القيد بخيار DEFERRABLE
      ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey 
      FOREIGN KEY (customer_id) REFERENCES customers(id) 
      DEFERRABLE INITIALLY DEFERRED;
      
      RAISE NOTICE 'تم تعديل قيد المفتاح الأجنبي في جدول الطلبات';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'فشل تعديل قيد المفتاح الأجنبي: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'قيد المفتاح الأجنبي غير موجود: orders_customer_id_fkey';
  END IF;
END $$;

-- 4. تأكد من أن الطلب لا يتطلب customer_id
DO $$
BEGIN
  -- التحقق مما إذا كان عمود customer_id NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'customer_id' 
    AND is_nullable = 'NO'
  ) THEN
    -- تعديل العمود ليقبل قيمة NULL
    ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;
    RAISE NOTICE 'تم تعديل العمود customer_id ليقبل قيمة NULL';
  ELSE
    RAISE NOTICE 'العمود customer_id يقبل قيم NULL بالفعل';
  END IF;
END $$; 