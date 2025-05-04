-- migrations/update_inventory_constraint.sql
-- حل شامل لمشكلة قيد التحقق في حقل type في جدول inventory_log

-- 1. تحديث قيد التحقق لإضافة جميع القيم المستخدمة في النظام
DO $$
BEGIN
    -- حذف القيد الموجود أولاً
    ALTER TABLE inventory_log DROP CONSTRAINT IF EXISTS inventory_log_type_check;
    
    -- إضافة القيد مع جميع القيم المستخدمة
    ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_type_check 
        CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order', 'addition', 'reduction'));
    
    RAISE NOTICE 'تم تحديث قيد التحقق لجدول inventory_log بنجاح';
END;
$$;

-- 2. تعديل دالة log_inventory_change لتستخدم القيم المسموحة
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert record in inventory_log table
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
        created_at,
        organization_id
    ) VALUES (
        NEW.id,
        NEW.stock_quantity - OLD.stock_quantity,
        OLD.stock_quantity,
        NEW.stock_quantity,
        CASE 
            WHEN NEW.stock_quantity > OLD.stock_quantity THEN 'purchase'
            ELSE 'sale'
        END,
        NULL,  -- To be set by application
        'system',
        'Automatic stock update',
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1),  -- Default to an admin user
        NOW(),
        NEW.organization_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. إعادة تعريف وظيفة معالجة الطلبات الأونلاين للتأكد من استخدام القيمة الصحيحة
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
  v_current_stock INTEGER;
  v_type_value TEXT := 'sale'; -- تم تغيير القيمة لتتوافق مع القيم المسموح بها
BEGIN
  -- كود الدالة كما هو ولكن مع استخدام القيمة المحدثة
  
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
    SELECT name, stock_quantity INTO v_product_name, v_current_stock
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
  
  -- 4. إضافة الطلب في جدول الطلبات
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
        'detail', SQLSTATE
      );
  END;
  
  -- 5. إضافة عناصر الطلب
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
  
  -- 6. إضافة سجل المخزون مباشرة
  BEGIN
    INSERT INTO inventory_log (
      product_id, 
      type, 
      quantity, 
      previous_stock,
      new_stock,
      notes, 
      created_by, 
      organization_id,
      reference_id,
      reference_type
    )
    VALUES (
      p_product_id,
      v_type_value, -- استخدام القيمة المحدثة
      p_quantity,
      v_current_stock,
      (v_current_stock - p_quantity),
      'بيع عبر المتجر الإلكتروني - طلب #' || v_order_number,
      NULL,
      p_organization_id,
      v_order_id,
      'online_order'
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'status', 'error',
        'error', 'فشل في تحديث سجل المخزون: ' || SQLERRM,
        'detail', SQLSTATE
      );
  END;
  
  -- 7. تحديث كمية المخزون في جدول المنتجات
  BEGIN
    UPDATE products
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_product_id AND organization_id = p_organization_id;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'status', 'error',
        'error', 'فشل في تحديث مخزون المنتج: ' || SQLERRM,
        'detail', SQLSTATE
      );
  END;
  
  -- 8. تحديث مخزون اللون إذا كان موجوداً
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