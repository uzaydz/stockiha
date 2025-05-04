# إصلاح مشكلة نموذج شراء المنتج

## المشكلات المحددة
1. عند الوصول للمرحلة 3 في نموذج الشراء، يتم إكمال الشراء تلقائياً دون الضغط على الزر.
2. خطأ في قاعدة البيانات يظهر الرسالة: `record "new" has no field "slug"`.

## خطوات الإصلاح

### 1. إصلاح خطأ قاعدة البيانات
يجب تنفيذ ملف SQL لإضافة عمود `slug` إلى جدول `orders` وإعادة إنشاء الوظائف والمحفزات:

1. افتح لوحة التحكم في Supabase
2. انتقل إلى "SQL Editor"
3. قم بنسخ محتوى ملف `update_orders_schema.sql` وتشغيله
4. تأكد من عدم وجود أي أخطاء في التنفيذ

```sql
-- إضافة عمود slug إلى جدول orders إذا لم يكن موجوداً
ALTER TABLE orders ADD COLUMN IF NOT EXISTS slug TEXT;

-- التحقق من وجود عمود customer_order_number 
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_order_number INTEGER;

-- إعادة بناء الـ trigger من البداية بعد التأكد من وجود جميع الأعمدة المطلوبة
DROP FUNCTION IF EXISTS generate_customer_order_number CASCADE;
CREATE OR REPLACE FUNCTION generate_customer_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_order_number INTEGER;
BEGIN
  -- العثور على أعلى رقم طلب لهذا العميل
  SELECT COALESCE(MAX(customer_order_number), 0) + 1 INTO next_order_number
  FROM orders
  WHERE customer_id = NEW.customer_id;
  
  -- تعيين رقم الطلب الخاص بالعميل
  NEW.customer_order_number := next_order_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء الـ trigger من جديد
DROP TRIGGER IF EXISTS set_customer_order_number ON orders;
CREATE TRIGGER set_customer_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_customer_order_number();

-- إنشاء دالة معالجة الطلب من جديد
DROP FUNCTION IF EXISTS process_online_order;
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
  
  -- 3. إنشاء slugs
  v_order_slug := 'ord-' || FLOOR(RANDOM() * 100000000)::TEXT;
  v_item_slug := 'item-' || FLOOR(RANDOM() * 100000000)::TEXT;

  -- محاولة استخدام طريقة أبسط للـ INSERT لتجنب المشاكل
  BEGIN
    -- 4. إنشاء الطلب
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
    
    -- 5. إضافة عنصر الطلب
    INSERT INTO order_items (
      order_id, product_id, product_name, quantity,
      unit_price, total_price, is_digital, organization_id,
      name, slug
    )
    SELECT
      v_order_id, p_product_id, p.name, p_quantity,
      p_unit_price, p_total_price, FALSE, p_organization_id,
      p.name, v_item_slug
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
      -- التقاط أي خطأ وإرجاع رسالة توضيحية
      RETURN json_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE
      );
  END;
END;
$$ LANGUAGE plpgsql;
```

### 2. تحقق من حقل `slug` في جدول `orders`
بعد تنفيذ الملف السابق، قم بتنفيذ هذا الاستعلام للتأكد من وجود عمود `slug` في جدول `orders`:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'slug';
```

يجب أن ترى نتيجة تؤكد وجود العمود.

### 3. التحقق من حقل `slug` في جدول `order_items`
نفذ هذا الاستعلام للتأكد من وجود عمود `slug` في جدول `order_items`:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_items' AND column_name = 'slug';
```

### 4. تحقق من وجود دالة `process_online_order`
نفذ هذا الاستعلام للتأكد من إنشاء الدالة بنجاح:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'process_online_order';
```

## الحل البديل إذا استمرت المشكلة
إذا استمرت المشكلة بعد تنفيذ الخطوات السابقة، يمكنك تجربة هذا الحل البديل:

1. تعديل وظيفة معالجة الطلب لتجنب استخدام حقل `slug` تماماً:

```sql
DROP FUNCTION IF EXISTS process_online_order;
CREATE OR REPLACE FUNCTION process_online_order(
  -- نفس المعلمات
  -- ...
) RETURNS JSON AS $$
DECLARE
  -- نفس المتغيرات
  -- ...
BEGIN
  -- نفس الخطوات 1 و 2
  -- ...
  
  -- تعديل الخطوة 4 لتجنب استخدام slug
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
  
  -- تعديل الخطوة 5 لتجنب استخدام slug
  INSERT INTO order_items (
    order_id, product_id, product_name, quantity,
    unit_price, total_price, is_digital, organization_id,
    name
  )
  SELECT
    v_order_id, p_product_id, p.name, p_quantity,
    p_unit_price, p_total_price, FALSE, p_organization_id,
    p.name
  FROM products p
  WHERE p.id = p_product_id;
  
  -- باقي الخطوات
  -- ...
END;
$$ LANGUAGE plpgsql;
```

## خطوات أخرى لاستكشاف المشكلات
إذا استمرت المشكلة، قم بتنفيذ الاستعلام التالي لعرض جميع المحفزات (triggers) المرتبطة بجدول `orders`:

```sql
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'orders';
```

ابحث عن أي محفزات إضافية قد تتعارض مع محفز `set_customer_order_number`.

## ملاحظات مهمة
- تأكد من إعادة تشغيل الخادم بعد تنفيذ التغييرات
- قم بمسح ذاكرة التخزين المؤقت للمتصفح
- تأكد من تنفيذ آخر إصدار من التعديلات على الواجهة الأمامية

-----------------------
## النتيجة المتوقعة بعد الإصلاح

بعد تنفيذ هذه الإصلاحات، يجب أن يعمل نموذج شراء المنتج بشكل صحيح:
1. ينتقل المستخدم عبر المراحل الثلاثة بسلاسة
2. لن يتم إكمال الشراء تلقائياً في المرحلة 3
3. يجب الضغط على زر "تأكيد الطلب" لإتمام عملية الشراء
4. سيتم تخزين الطلب في قاعدة البيانات مع رقم طلب تسلسلي فريد لكل عميل (يبدأ من 1) 