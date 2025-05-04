-- fix_order_triggers.sql
-- هذا الملف يحل مشكلة محفز set_orders_organization_id الذي يحاول الوصول إلى حقول غير موجودة

-- 1. حذف المحفز الحالي المسبب للمشكلة
DROP TRIGGER IF EXISTS set_orders_organization_id ON orders;

-- 2. إعادة بناء وظيفة set_organization_id لتتعامل بشكل صحيح مع جدول orders
CREATE OR REPLACE FUNCTION set_organization_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- تعيين organization_id إذا كان فارغاً
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id FROM users WHERE id = auth.uid();
    END IF;
    
    -- إذا كان الجدول هو orders فقط أضف قيمة slug افتراضية إذا كان فارغاً
    IF TG_TABLE_NAME = 'orders' THEN
        IF NEW.slug IS NULL THEN
            NEW.slug := 'order-' || floor(random() * 1000000)::text;
        END IF;
    -- لباقي الجداول التي تحتوي على name و slug
    ELSIF TG_TABLE_NAME <> 'orders' THEN
        -- تحقق مما إذا كان عمود name موجوداً في هذا الجدول
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = TG_TABLE_NAME AND column_name = 'name'
        ) THEN
            -- إنشاء slug من الاسم إذا كان الاسم موجوداً والـslug فارغاً
            IF (NEW.slug IS NULL OR NEW.slug = '') AND NEW.name IS NOT NULL THEN
                NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '\s+', '-', 'g'));
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. إنشاء محفز مخصص فقط لجدول orders لا يعتمد على حقل name
CREATE OR REPLACE FUNCTION set_orders_slug_and_organization_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- تعيين organization_id إذا كان فارغاً
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id FROM users WHERE id = auth.uid();
    END IF;
    
    -- إضافة قيمة slug افتراضية إذا كان فارغاً
    IF NEW.slug IS NULL THEN
        NEW.slug := 'order-' || floor(random() * 1000000)::text;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 4. حذف المحفز الموجود ثم إعادة إنشاء المحفز الجديد لجدول orders
DROP TRIGGER IF EXISTS set_orders_slug_and_organization ON orders;
CREATE TRIGGER set_orders_slug_and_organization
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION set_orders_slug_and_organization_id();

-- 5. إعادة إنشاء وظيفة process_online_order لتتوافق مع المحفزات الجديدة
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
  
  -- 2. إنشاء سجل العنوان
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
    '', -- المدينة (غير مقدمة في النموذج)
    p_province,
    '', -- الرمز البريدي (غير مقدم في النموذج)
    'Algeria',
    p_phone,
    TRUE,
    p_organization_id
  )
  RETURNING id INTO v_address_id;
  
  -- محاولة استخدام بلوك TRY-CATCH للتقاط أي أخطاء
  BEGIN
    -- 3. إنشاء الطلب (نترك slug ليتم تعيينه من قبل المحفز)
    INSERT INTO orders (
      customer_id, subtotal, tax, discount, total, 
      status, payment_method, payment_status, 
      shipping_address_id, shipping_method, shipping_cost, 
      notes, is_online, organization_id
    )
    VALUES (
      v_customer_id, p_total_price, 0, 0, (p_total_price + p_delivery_fee),
      'pending', p_payment_method, 'pending',
      v_address_id, p_delivery_company, p_delivery_fee,
      p_notes, TRUE, p_organization_id
    )
    RETURNING id, customer_order_number INTO v_order_id, v_order_number;
    
    -- بعد الإدراج، نقوم باسترجاع قيمة slug من الجدول
    SELECT slug INTO v_order_slug FROM orders WHERE id = v_order_id;
    
    -- إذا كان slug غير موجود، نقوم بإنشاء واحد وتحديث السجل
    IF v_order_slug IS NULL THEN
      v_order_slug := 'order-' || floor(random() * 1000000)::text;
      UPDATE orders SET slug = v_order_slug WHERE id = v_order_id;
    END IF;
    
    -- 4. إنشاء slug عشوائي لـ order_items
    v_item_slug := 'item-' || floor(random() * 1000000)::text;
    
    -- 5. إضافة عنصر الطلب
    INSERT INTO order_items (
      order_id, product_id, product_name, quantity,
      unit_price, total_price, is_digital, organization_id,
      slug, name
    )
    SELECT
      v_order_id, p_product_id, p.name, p_quantity,
      p_unit_price, p_total_price, FALSE, p_organization_id,
      v_item_slug, p.name
    FROM products p
    WHERE p.id = p_product_id
    RETURNING id INTO v_order_item_id;

    -- 6. تحديث المخزون
    IF p_product_color_id IS NOT NULL THEN
      UPDATE product_colors
      SET quantity = quantity - p_quantity
      WHERE id = p_product_color_id AND organization_id = p_organization_id;
    ELSE
      UPDATE products
      SET stock_quantity = stock_quantity - p_quantity
      WHERE id = p_product_id AND organization_id = p_organization_id;
    END IF;

    -- 7. إرجاع معلومات الطلب كـ JSON
    RETURN json_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'order_slug', v_order_slug,
      'customer_id', v_customer_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- التقاط أي خطأ وإرجاع رسالة توضيحية مع معلومات أكثر تفصيلاً
      RETURN json_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE,
        'context', 'Error in process_online_order function. ' || 
                  'SQLState: ' || SQLSTATE || ', Error: ' || SQLERRM
      );
  END;
END;
$$ LANGUAGE plpgsql; 