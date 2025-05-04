-- online_orders_migration.sql
-- إنشاء جدول منفصل لطلبات المتجر الإلكتروني وترقية النظام

-- 1. إنشاء جدول online_orders للطلبات عبر الإنترنت
CREATE TABLE IF NOT EXISTS online_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  subtotal NUMERIC NOT NULL,
  tax NUMERIC NOT NULL,
  discount NUMERIC,
  total NUMERIC NOT NULL,
  status TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  shipping_address_id UUID REFERENCES addresses(id),
  shipping_method TEXT,
  shipping_cost NUMERIC,
  notes TEXT,
  employee_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  slug TEXT,
  customer_order_number INTEGER
);

-- 2. إنشاء جدول online_order_items لعناصر الطلبات عبر الإنترنت
CREATE TABLE IF NOT EXISTS online_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  online_order_id UUID NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  is_digital BOOLEAN NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL
);

-- 3. ترحيل البيانات من الجدول القديم إلى الجدول الجديد
-- نقل الطلبات عبر الإنترنت من الجدول القديم إلى الجدول الجديد
INSERT INTO online_orders (
  id, customer_id, subtotal, tax, discount, total, 
  status, payment_method, payment_status, shipping_address_id, 
  shipping_method, shipping_cost, notes, employee_id, 
  created_at, updated_at, organization_id, slug, customer_order_number
)
SELECT 
  id, customer_id, subtotal, tax, discount, total, 
  status, payment_method, payment_status, shipping_address_id, 
  shipping_method, shipping_cost, notes, employee_id, 
  created_at, updated_at, organization_id, slug, customer_order_number
FROM orders
WHERE is_online = true;

-- نقل عناصر الطلبات الخاصة بالطلبات عبر الإنترنت
INSERT INTO online_order_items (
  id, online_order_id, product_id, product_name, 
  quantity, unit_price, total_price, is_digital, 
  organization_id, slug, name
)
SELECT 
  oi.id, oi.order_id, oi.product_id, oi.product_name, 
  oi.quantity, oi.unit_price, oi.total_price, oi.is_digital, 
  oi.organization_id, oi.slug, oi.name
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.is_online = true;

-- 4. إنشاء دالة جديدة لمعالجة الطلبات عبر الإنترنت
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
  v_user_id UUID;
  v_type_value TEXT := 'online_order'; -- تغيير القيمة من 'sale' إلى 'online_order'
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
  
  -- 1.1 البحث عن معرف المستخدم المرتبط بهذا العميل
  SELECT id INTO v_user_id
  FROM users
  WHERE email = (SELECT email FROM customers WHERE id = v_customer_id LIMIT 1)
  LIMIT 1;
  
  -- 1.2 إذا لم يكن للعميل مستخدم مرتبط، نقوم بإنشاء مستخدم مؤقت
  IF v_user_id IS NULL THEN
    -- نتحقق ما إذا كان هناك مستخدم ضيف مرتبط بالمنظمة
    SELECT id INTO v_user_id
    FROM users
    WHERE email = 'guest@' || p_organization_id || '.com' AND organization_id = p_organization_id
    LIMIT 1;
    
    -- إذا لم يكن هناك مستخدم ضيف، نقوم بإنشاء واحد
    IF v_user_id IS NULL THEN
      INSERT INTO users (
        email, 
        name, 
        phone,
        role,
        is_active,
        organization_id
      )
      VALUES (
        'guest@' || p_organization_id || '.com',
        'Guest User',
        p_phone,
        'customer',
        true,
        p_organization_id
      )
      RETURNING id INTO v_user_id;
    END IF;
  END IF;
  
  -- 2. إنشاء سجل العنوان - الآن نستخدم v_user_id بدلاً من v_customer_id
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
    v_user_id, -- نستخدم معرف المستخدم هنا وليس معرف العميل
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
  
  -- 3. إنشاء slugs
  v_order_slug := 'ord-' || FLOOR(RANDOM() * 100000000)::TEXT;
  v_item_slug := 'item-' || FLOOR(RANDOM() * 100000000)::TEXT;
  
  -- 4. إنشاء طلب جديد في جدول الطلبات عبر الإنترنت
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
    slug
  )
  VALUES (
    v_customer_id,
    p_total_price,
    0, -- tax
    0, -- discount
    p_total_price + p_delivery_fee, -- total
    'pending', -- status
    p_payment_method, -- payment_method
    'pending', -- payment_status
    v_address_id, -- shipping_address_id
    p_delivery_company, -- shipping_method
    p_delivery_fee, -- shipping_cost
    p_notes, -- notes
    p_organization_id,
    v_order_slug -- slug
  )
  RETURNING id, customer_order_number INTO v_order_id, v_order_number;
  
  -- 5. الحصول على اسم المنتج
  SELECT name INTO v_product_name FROM products WHERE id = p_product_id;
  
  -- إذا كان اسم المنتج غير موجود، استخدم قيمة افتراضية
  IF v_product_name IS NULL THEN
    v_product_name := 'منتج #' || p_product_id;
  END IF;
  
  -- 6. إضافة عنصر الطلب في جدول عناصر الطلبات عبر الإنترنت
  INSERT INTO online_order_items (
    online_order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    total_price,
    is_digital,
    organization_id,
    slug,
    name
  )
  VALUES (
    v_order_id,
    p_product_id,
    v_product_name,
    p_quantity,
    p_unit_price,
    p_total_price,
    FALSE, -- is_digital
    p_organization_id,
    v_item_slug,
    v_product_name
  )
  RETURNING id INTO v_order_item_id;
  
  -- 7. تحديث المخزون مع تسجيل مناسب في سجل المخزون
  IF p_product_color_id IS NOT NULL THEN
    -- تحديث مخزون لون المنتج
    DECLARE 
      current_stock INT;
    BEGIN
      -- الحصول على المخزون الحالي
      SELECT quantity INTO current_stock
      FROM product_colors
      WHERE id = p_product_color_id AND organization_id = p_organization_id;
      
      -- تحديث المخزون
      UPDATE product_colors
      SET quantity = quantity - p_quantity
      WHERE id = p_product_color_id AND organization_id = p_organization_id;
      
      -- تسجيل الحركة في سجل المخزون مع التحكم في قيمة type
      BEGIN
        INSERT INTO inventory_log (
          product_id,
          quantity,
          previous_stock,
          new_stock,
          type,
          reference_id,
          reference_type,
          notes,
          created_by,
          organization_id
        )
        VALUES (
          p_product_id,
          p_quantity,
          current_stock,
          current_stock - p_quantity,
          v_type_value, -- استخدم المتغير المعرف بدلاً من القيمة المباشرة
          v_order_id,
          'online_order',
          'Online store order #' || v_order_number,
          v_user_id,
          p_organization_id
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Error in inventory_log insert (color): %', SQLERRM;
          -- الاستمرار حتى مع وجود خطأ في تسجيل المخزون
      END;
    END;
  ELSE
    -- تحديث مخزون المنتج
    DECLARE 
      current_stock INT;
    BEGIN
      -- الحصول على المخزون الحالي
      SELECT stock_quantity INTO current_stock
      FROM products
      WHERE id = p_product_id AND organization_id = p_organization_id;
      
      -- تحديث المخزون
      UPDATE products
      SET stock_quantity = stock_quantity - p_quantity
      WHERE id = p_product_id AND organization_id = p_organization_id;
      
      -- تسجيل الحركة في سجل المخزون مع التحكم في قيمة type
      BEGIN
        INSERT INTO inventory_log (
          product_id,
          quantity,
          previous_stock,
          new_stock,
          type,
          reference_id,
          reference_type,
          notes,
          created_by,
          organization_id
        )
        VALUES (
          p_product_id,
          p_quantity,
          current_stock,
          current_stock - p_quantity,
          v_type_value, -- استخدم المتغير المعرف بدلاً من القيمة المباشرة
          v_order_id,
          'online_order',
          'Online store order #' || v_order_number,
          v_user_id,
          p_organization_id
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Error in inventory_log insert (product): %', SQLERRM;
          -- الاستمرار حتى مع وجود خطأ في تسجيل المخزون
      END;
    END;
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
    -- تحسين معلومات الخطأ لتسهيل التشخيص
    RETURN json_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE,
      'context', 'Error in process_online_order_new function. SQLState: ' || SQLSTATE || ', Error: ' || SQLERRM,
      'customer_id', v_customer_id,
      'failed_at', CASE 
        WHEN v_customer_id IS NULL THEN 'customer_creation'
        WHEN v_address_id IS NULL THEN 'address_creation'
        WHEN v_order_id IS NULL THEN 'order_creation'
        WHEN v_order_item_id IS NULL THEN 'order_item_creation'
        ELSE 'inventory_update'
      END
    );
END;
$$ LANGUAGE plpgsql;

-- 5. إنشاء trigger لتوليد رقم الطلب تلقائيًا للطلبات عبر الإنترنت
CREATE OR REPLACE FUNCTION generate_online_customer_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_order_number INTEGER;
BEGIN
  -- العثور على أعلى رقم طلب لهذا العميل
  SELECT COALESCE(MAX(customer_order_number), 0) + 1 INTO next_order_number
  FROM online_orders
  WHERE customer_id = NEW.customer_id;
  
  -- تعيين رقم الطلب الخاص بالعميل
  NEW.customer_order_number := next_order_number;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- في حالة أي خطأ، أرجع السجل كما هو
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء الـ trigger من جديد
DROP TRIGGER IF EXISTS set_online_customer_order_number ON online_orders;
CREATE TRIGGER set_online_customer_order_number
BEFORE INSERT ON online_orders
FOR EACH ROW
WHEN (NEW.customer_order_number IS NULL)
EXECUTE FUNCTION generate_online_customer_order_number();

-- 6. إنشاء view لعرض البيانات المجمعة للطلبات عبر الإنترنت مع العملاء والعناوين
CREATE OR REPLACE VIEW online_orders_view AS
SELECT 
  o.*,
  c.name AS customer_name,
  c.phone AS customer_phone,
  c.email AS customer_email,
  a.street_address,
  a.state AS province,
  a.phone AS shipping_phone
FROM 
  online_orders o
LEFT JOIN 
  customers c ON o.customer_id = c.id
LEFT JOIN 
  addresses a ON o.shipping_address_id = a.id;

-- 7. إنشاء view لعرض تفاصيل عناصر الطلبات عبر الإنترنت
CREATE OR REPLACE VIEW online_order_items_view AS
SELECT 
  oi.*,
  o.customer_id,
  o.status AS order_status,
  o.payment_status,
  o.created_at AS order_date,
  p.name AS product_full_name,
  p.thumbnail_image
FROM 
  online_order_items oi
JOIN 
  online_orders o ON oi.online_order_id = o.id
LEFT JOIN 
  products p ON oi.product_id = p.id;

-- 9. إصلاح مشكلة قيد التحقق في inventory_log - للتنفيذ المباشر
DO $$
BEGIN
    -- تنفيذ الأمر مباشرة
    EXECUTE 'ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_type_check';
    EXECUTE 'ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_type_check CHECK (type IN (''purchase'', ''sale'', ''adjustment'', ''return'', ''loss'', ''online_order''))';
    
    -- تحديث السجلات الموجودة التي تحتوي على قيمة غير صالحة (اختياري)
    UPDATE inventory_log SET type = 'online_order' WHERE type NOT IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order');
    
    RAISE NOTICE 'تم تحديث قيد التحقق لجدول inventory_log بنجاح';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'حدث خطأ أثناء تحديث قيد التحقق: %', SQLERRM;
END;
$$; 