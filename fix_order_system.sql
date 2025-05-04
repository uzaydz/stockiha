-- إصلاح نظام الطلبات - fix_order_system.sql
-- ملف شامل لإصلاح مشاكل معالجة الطلبات في نظام Bazaar

-- 1. تحديث وظيفة set_organization_id لتكون أكثر أماناً
CREATE OR REPLACE FUNCTION set_organization_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- تعيين organization_id إذا كان فارغاً
    IF NEW.organization_id IS NULL THEN
        BEGIN
            SELECT organization_id INTO NEW.organization_id FROM users WHERE id = auth.uid();
        EXCEPTION WHEN OTHERS THEN
            -- ترك organization_id كما هو إذا فشل الاستعلام
            NULL;
        END;
    END IF;
    
    -- التعامل مع جدول orders
    IF TG_TABLE_NAME = 'orders' THEN
        IF NEW.slug IS NULL OR NEW.slug = '' THEN
            NEW.slug := 'order-' || floor(random() * 1000000)::text;
        END IF;
    -- التعامل مع جداول أخرى تحتوي على حقل slug
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = TG_TABLE_NAME AND column_name = 'slug'
    ) THEN
        -- التحقق من وجود عمود name
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = TG_TABLE_NAME AND column_name = 'name'
        ) THEN
            -- إنشاء slug من حقل name إذا كان متاحاً
            IF (NEW.slug IS NULL OR NEW.slug = '') AND NEW.name IS NOT NULL THEN
                BEGIN
                    NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '\s+', '-', 'g'));
                EXCEPTION WHEN OTHERS THEN
                    NEW.slug := TG_TABLE_NAME || '-' || floor(random() * 1000000)::text;
                END;
            END IF;
        ELSE
            -- إذا لم يوجد حقل name، استخدم قيمة عشوائية
            IF (NEW.slug IS NULL OR NEW.slug = '') THEN
                NEW.slug := TG_TABLE_NAME || '-' || floor(random() * 1000000)::text;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- في حالة أي خطأ، أعد السجل كما هو
    RETURN NEW;
END;
$$;

-- 2. تحديث وظيفة set_orders_slug_and_organization_id للتعامل مع حالات خاصة
CREATE OR REPLACE FUNCTION set_orders_slug_and_organization_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- تعيين organization_id إذا كان فارغاً
    IF NEW.organization_id IS NULL THEN
        BEGIN
            SELECT organization_id INTO NEW.organization_id FROM users WHERE id = auth.uid();
        EXCEPTION WHEN OTHERS THEN
            -- لا تفعل شيئاً إذا فشل الاستعلام
            NULL;
        END;
    END IF;
    
    -- إضافة قيمة slug افتراضية إذا كان فارغاً
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := 'order-' || floor(random() * 1000000)::text;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- في حالة أي خطأ، أرجع السجل كما هو
    RETURN NEW;
END;
$$;

-- 3. إعادة تعريف وظيفة process_online_order لمعالجة مشكلة slug
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
    
    -- 3. إنشاء الطلب مع تحديد قيمة slug مسبقاً (لا نعتمد على المحفز)
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

-- 4. إعادة إنشاء محفزات الجداول ذات الصلة
-- حذف المحفزات الموجودة
DROP TRIGGER IF EXISTS set_orders_slug_and_organization ON orders;
DROP TRIGGER IF EXISTS set_order_items_organization_id ON order_items;

-- إعادة إنشاء المحفزات
CREATE TRIGGER set_orders_slug_and_organization
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION set_orders_slug_and_organization_id();

CREATE TRIGGER set_order_items_organization_id
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

-- 5. ملاحظة: نفذ استعلام التحقق التالي للتأكد من نجاح التثبيت
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_name IN ('process_online_order', 'set_organization_id', 'set_orders_slug_and_organization_id'); 