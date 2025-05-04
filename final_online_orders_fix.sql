-- final_online_orders_fix.sql
-- الملف النهائي لإصلاح مشكلة الطلبات عبر الإنترنت

-- 1. عرض معلومات تشخيصية عن حالة الجداول والعلاقات بينها
SELECT 'معلومات تشخيصية' AS info;

-- ① معلومات عن جداول المتجر الإلكتروني
SELECT 'جداول موجودة متعلقة بالطلبات' AS info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('orders', 'online_orders', 'order_items', 'online_order_items', 'customers', 'users')
ORDER BY table_name;

-- ② فحص العلاقة بين جدولي orders و customers
SELECT 'قيود المفتاح الأجنبي لجدول الطلبات:' AS info;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('orders', 'online_orders')
    AND kcu.column_name = 'customer_id';

-- ③ فحص العلاقة بين جدولي order_items و orders
SELECT 'قيود المفتاح الأجنبي لجدول عناصر الطلبات:' AS info;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'order_items'
    AND kcu.column_name = 'order_id';

-- 2. إصلاح قيد التحقق في جدول inventory_log
DO $$
BEGIN
    -- إضافة نوع 'online_order' إلى قيد التحقق
    ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_type_check;
    ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_type_check 
    CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order'));
    
    RAISE NOTICE 'تم تحديث قيد التحقق في جدول المخزون بنجاح';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في تحديث قيد التحقق للمخزون: %', SQLERRM;
END;
$$;

-- 3. إنشاء جدول online_order_items لتخزين عناصر الطلبات عبر الإنترنت
DO $$
BEGIN
    -- فحص ما إذا كان الجدول موجودًا
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'online_order_items'
    ) THEN
        CREATE TABLE online_order_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES online_orders(id),
            product_id UUID NOT NULL REFERENCES products(id),
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price NUMERIC NOT NULL,
            total_price NUMERIC NOT NULL,
            is_digital BOOLEAN NOT NULL DEFAULT false,
            organization_id UUID NOT NULL REFERENCES organizations(id),
            slug TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX idx_online_order_items_order_id ON online_order_items(order_id);
        CREATE INDEX idx_online_order_items_product_id ON online_order_items(product_id);
        CREATE INDEX idx_online_order_items_organization_id ON online_order_items(organization_id);
        
        RAISE NOTICE 'تم إنشاء جدول online_order_items بنجاح';
    ELSE
        RAISE NOTICE 'جدول online_order_items موجود بالفعل';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في إنشاء جدول online_order_items: %', SQLERRM;
END;
$$;

-- 4. إنشاء أو تحديث القيد الأجنبي لربط جدول online_orders بجدول customers
DO $$
BEGIN
    -- حذف القيد الأجنبي الحالي إذا وجد
    IF EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_name = 'online_orders_customer_id_fkey' 
        AND table_name = 'online_orders'
    ) THEN
        ALTER TABLE online_orders DROP CONSTRAINT online_orders_customer_id_fkey;
        RAISE NOTICE 'تم حذف القيد الأجنبي الحالي';
    END IF;
    
    -- إضافة القيد الأجنبي الجديد
    ALTER TABLE online_orders ADD CONSTRAINT online_orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES customers(id);
    
    RAISE NOTICE 'تم إضافة القيد الأجنبي بنجاح لربط online_orders بجدول customers';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في تحديث القيد الأجنبي: %', SQLERRM;
END;
$$;

-- 5. إعادة إنشاء وظيفة معالجة الطلبات الأونلاين
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
  v_order_id UUID;
  v_order_item_id UUID;
  v_order_number INTEGER;
  v_order_slug TEXT;
  v_item_slug TEXT;
  v_product_name TEXT;
  v_type_value TEXT := 'online_order';
BEGIN
  -- 1. إنشاء أو البحث عن العميل
  BEGIN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE phone = p_phone AND organization_id = p_organization_id;
    
    IF v_customer_id IS NULL THEN
      -- إنشاء عميل جديد
      INSERT INTO customers (name, phone, organization_id, created_at, updated_at)
      VALUES (p_full_name, p_phone, p_organization_id, NOW(), NOW())
      RETURNING id INTO v_customer_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'status', 'error',
        'error', 'فشل في إنشاء أو العثور على العميل: ' || SQLERRM,
        'detail', SQLSTATE
      );
  END;
  
  -- 2. الحصول على اسم المنتج
  BEGIN
    SELECT name INTO v_product_name
    FROM products
    WHERE id = p_product_id AND organization_id = p_organization_id;
    
    IF v_product_name IS NULL THEN
      RETURN json_build_object(
        'status', 'error',
        'error', 'المنتج غير موجود',
        'detail', 'P0002'
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'status', 'error',
        'error', 'فشل في الحصول على معلومات المنتج: ' || SQLERRM,
        'detail', SQLSTATE
      );
  END;
  
  -- 3. إنشاء slugs
  v_order_slug := 'ord-' || FLOOR(RANDOM() * 100000000)::TEXT;
  v_item_slug := 'itm-' || FLOOR(RANDOM() * 100000000)::TEXT;
  
  -- 4. إضافة الطلب في جدول online_orders
  BEGIN
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
      slug,
      created_at,
      updated_at
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
      NULL,
      p_delivery_company,
      p_delivery_fee,
      p_notes || ' | العنوان: ' || p_province || ' - ' || p_address || ' | الاسم: ' || p_full_name || ' | الهاتف: ' || p_phone,
      p_organization_id,
      v_order_slug,
      NOW(),
      NOW()
    )
    RETURNING id, customer_order_number INTO v_order_id, v_order_number;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'status', 'error',
        'error', 'فشل في إنشاء الطلب: ' || SQLERRM,
        'detail', SQLSTATE,
        'customer_id', v_customer_id
      );
  END;
  
  -- 5. إضافة عناصر الطلب إلى جدول online_order_items
  BEGIN
    INSERT INTO online_order_items (
      order_id,
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
      FALSE, 
      p_organization_id,
      v_item_slug,
      v_product_name
    )
    RETURNING id INTO v_order_item_id;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'status', 'error',
        'error', 'فشل في إضافة عناصر الطلب: ' || SQLERRM,
        'detail', SQLSTATE
      );
  END;
  
  -- 6. تحديث المخزون للمنتج
  BEGIN
    INSERT INTO inventory_log (
      product_id, 
      type, 
      quantity, 
      notes, 
      created_by, 
      organization_id,
      order_id
    )
    VALUES (
      p_product_id,
      v_type_value,
      -p_quantity,
      'بيع عبر المتجر الإلكتروني - طلب #' || v_order_number,
      NULL,
      p_organization_id,
      v_order_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'status', 'error',
        'error', 'فشل في تحديث المخزون: ' || SQLERRM,
        'detail', SQLSTATE
      );
  END;
  
  -- 7. إذا كان هناك لون محدد، يجب تحديث المخزون الخاص به
  IF p_product_color_id IS NOT NULL THEN
    BEGIN
      UPDATE product_colors
      SET stock = stock - p_quantity
      WHERE id = p_product_color_id
      AND organization_id = p_organization_id;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN json_build_object(
          'status', 'error',
          'error', 'فشل في تحديث مخزون اللون: ' || SQLERRM,
          'detail', SQLSTATE
        );
    END;
  END IF;
  
  -- إرجاع النتيجة بنجاح
  RETURN json_build_object(
    'status', 'success',
    'order_id', v_order_id,
    'order_number', v_order_number,
    'customer_id', v_customer_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- 6. التحقق من التغييرات
SELECT 'تم الانتهاء من التغييرات بنجاح' AS result; 