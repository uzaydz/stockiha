-- ملف SQL موحد لإصلاح جميع مشاكل نظام الطلبات

-- 1. إنشاء جدول guest_customers إذا لم يكن موجودًا بالفعل
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_customers') THEN
        CREATE TABLE guest_customers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL DEFAULT 'زائر',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            phone TEXT,
            organization_id UUID
        );
        
        CREATE INDEX idx_guest_customers_phone ON guest_customers(phone);
        CREATE INDEX idx_guest_customers_organization ON guest_customers(organization_id);
        
        RAISE NOTICE 'تم إنشاء جدول guest_customers';
    ELSE
        RAISE NOTICE 'جدول guest_customers موجود بالفعل';
    END IF;
END $$;

-- 2. تحديث الطلبات الحالية وإنشاء سجلات عملاء زوار لها
DO $$
DECLARE
    v_count INT := 0;
    v_orders_processed INT := 0;
    v_order RECORD;
    v_guest_id UUID;
BEGIN
    -- إنشاء سجلات عملاء زوار لأي طلبات أونلاين ليس لها سجل في جدول guest_customers
    FOR v_order IN (
        SELECT DISTINCT o.customer_id, c.name, c.phone, o.organization_id
        FROM online_orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE NOT EXISTS (SELECT 1 FROM guest_customers gc WHERE gc.id = o.customer_id)
    ) LOOP
        -- إنشاء سجل عميل زائر جديد لهذا العميل
        INSERT INTO guest_customers (id, name, phone, organization_id)
        VALUES (
            COALESCE(v_order.customer_id, gen_random_uuid()), 
            COALESCE(v_order.name, 'زائر'),
            COALESCE(v_order.phone, 'غير معروف'),
            v_order.organization_id
        )
        RETURNING id INTO v_guest_id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'تم إنشاء % سجل عميل زائر للطلبات الأونلاين الموجودة', v_count;
END $$;

-- 3. حذف القيود الأجنبية الموجودة
DO $$
BEGIN
    -- حذف القيد الأجنبي في جدول العناوين
    ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_customer_id_fkey;
    RAISE NOTICE 'تم حذف القيد الأجنبي من جدول العناوين';
    
    -- حذف القيد الأجنبي من جدول الطلبات عبر الإنترنت
    ALTER TABLE online_orders DROP CONSTRAINT IF EXISTS online_orders_customer_id_fkey;
    RAISE NOTICE 'تم حذف القيد الأجنبي من جدول الطلبات عبر الإنترنت';
    
    -- تحديث العناوين غير المرتبطة بعميل
    UPDATE addresses SET customer_id = user_id WHERE customer_id IS NULL AND user_id IS NOT NULL;
    RAISE NOTICE 'تم تحديث العناوين التي ليس لها عميل معين';
END $$;

-- 4. إنشاء وظيفة للتحقق من صحة customer_id في جدول addresses
CREATE OR REPLACE FUNCTION check_customer_id_validity()
RETURNS TRIGGER AS $$
BEGIN
    -- نتحقق مما إذا كان customer_id موجودًا في جدول customers أو guest_customers
    IF NEW.customer_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM customers WHERE id = NEW.customer_id) OR
           EXISTS (SELECT 1 FROM guest_customers WHERE id = NEW.customer_id) THEN
            RETURN NEW;
        ELSE
            RAISE EXCEPTION 'معرف العميل % غير صالح. يجب أن يكون موجودًا في جدول customers أو guest_customers', NEW.customer_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتنفيذ الدالة
DROP TRIGGER IF EXISTS check_customer_id_trigger ON addresses;
CREATE TRIGGER check_customer_id_trigger
BEFORE INSERT OR UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION check_customer_id_validity();

-- 5. إعادة إنشاء وظيفة process_online_order_new
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
  -- إنشاء أو تحديث بيانات العميل الزائر
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

  -- إنشاء العنوان
  BEGIN
    INSERT INTO addresses (
      customer_id,
      name,
      street_address,
      city,
      state,
      postal_code,
      country,
      phone,
      organization_id
    )
    VALUES (
      v_guest_customer_id,
      p_full_name,
      p_address,
      p_province,
      p_province,
      '00000',
      'الجزائر',
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

  -- الحصول على رقم الطلب التالي
  SELECT COALESCE(MAX(customer_order_number), 0) + 1 
  INTO v_customer_order_number 
  FROM online_orders 
  WHERE organization_id = p_organization_id;
  
  -- إنشاء الطلب
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
      tax,
      discount,
      shipping_address_id,
      shipping_method,
      created_at,
      updated_at
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
      0,
      0,
      v_address_id,
      p_delivery_company,
      NOW(),
      NOW()
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
  
  -- الحصول على معلومات المنتج واللون
  SELECT name INTO v_product_name
  FROM products
  WHERE id = p_product_id AND organization_id = p_organization_id;
  
  IF p_product_color_id IS NOT NULL THEN
    SELECT name INTO v_color_name
    FROM product_colors
    WHERE id = p_product_color_id;
  END IF;
  
  -- إنشاء عنصر الطلب
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
  
  -- تحديث المخزون
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
  
  -- إرجاع معلومات الطلب الناجح
  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', v_order_id,
    'order_number', v_customer_order_number,
    'total', p_total_price + p_delivery_fee
  );
END;
$$ LANGUAGE plpgsql; 