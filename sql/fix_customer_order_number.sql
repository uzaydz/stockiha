-- حل مشكلة عدم ظهور رقم الطلبية في الوصل المطبوع
-- تحديث الدالة المخزنة create_pos_order_safe لترجع customer_order_number

-- حذف جميع الدوال الموجودة بنفس الاسم أولاً
DROP FUNCTION IF EXISTS create_pos_order_safe CASCADE;

CREATE OR REPLACE FUNCTION create_pos_order_safe(
    p_organization_id UUID,
    p_customer_id UUID,
    p_items JSON,
    p_total_amount DECIMAL,
    p_employee_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_payment_status TEXT DEFAULT 'paid',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_order_id UUID;
    v_order_slug VARCHAR;
    v_customer_order_number INTEGER;
    v_item JSON;
    v_result JSON;
    v_product_name TEXT;
BEGIN
    -- توليد slug فريد للطلبية (بأحرف صغيرة)
    v_order_slug := 'pos-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
                    FLOOR(RANDOM() * 1000)::INTEGER;

    -- إنشاء الطلبية والحصول على customer_order_number
    INSERT INTO orders (
        organization_id,
        customer_id,
        employee_id,
        slug,
        status,
        payment_status,
        payment_method,
        total,
        subtotal,
        tax,
        discount,
        amount_paid,
        pos_order_type,
        notes,
        is_online,
        created_at,
        updated_at
    ) VALUES (
        p_organization_id,
        p_customer_id,
        p_employee_id,
        v_order_slug,
        'completed',
        p_payment_status,
        p_payment_method,
        p_total_amount,
        p_total_amount,
        0,
        0,
        CASE WHEN p_payment_status = 'paid' THEN p_total_amount ELSE 0 END,
        'pos',
        p_notes,
        false,
        NOW(),
        NOW()
    ) RETURNING id, customer_order_number INTO v_new_order_id, v_customer_order_number;

    -- إضافة عناصر الطلبية
    FOR v_item IN SELECT * FROM json_array_elements(p_items::json)
    LOOP
        -- الحصول على اسم المنتج
        SELECT COALESCE(name, 'منتج') INTO v_product_name 
        FROM products 
        WHERE id = (v_item->>'product_id')::UUID
        LIMIT 1;
        
        -- إذا لم نجد المنتج، استخدم اسم افتراضي
        IF v_product_name IS NULL THEN
            v_product_name := 'منتج';
        END IF;
        
        INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            name,
            quantity,
            unit_price,
            total_price,
            is_digital,
            organization_id,
            slug,
            variant_info,
            created_at
        ) VALUES (
            v_new_order_id,
            (v_item->>'product_id')::UUID,
            v_product_name,
            v_product_name,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'price')::DECIMAL,
            (v_item->>'total')::DECIMAL,
            false,
            p_organization_id,
            'rpc-item-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
            floor(random() * 1000)::TEXT,
            '{}'::jsonb,
            NOW()
        );
    END LOOP;

    -- تحديث completed_at
    UPDATE orders 
    SET completed_at = NOW() 
    WHERE id = v_new_order_id;

    -- إنشاء JSON للنتيجة مع تضمين customer_order_number
    SELECT json_build_object(
        'id', v_new_order_id,
        'slug', v_order_slug,
        'customer_order_number', v_customer_order_number,
        'status', 'completed',
        'created_at', NOW(),
        'updated_at', NOW(),
        'success', true
    ) INTO v_result;

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    -- في حالة الخطأ، أرجع تفاصيل الخطأ
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;

-- التأكد من أن trigger توليد customer_order_number يعمل بشكل صحيح
-- إذا لم يكن موجوداً، يتم إنشاؤه

-- دالة توليد رقم الطلبية
CREATE OR REPLACE FUNCTION generate_customer_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- إنشاء أو تحديث trigger
DROP TRIGGER IF EXISTS set_customer_order_number ON orders;
CREATE TRIGGER set_customer_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_customer_order_number();

-- التأكد من وجود عمود customer_order_number (في حالة عدم وجوده)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_order_number'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_order_number INTEGER;
    END IF;
END $$;

-- إضافة comment للتوضيح
COMMENT ON FUNCTION create_pos_order_safe IS 'دالة محدثة لإنشاء طلبيات نقطة البيع مع إرجاع customer_order_number';
COMMENT ON FUNCTION generate_customer_order_number IS 'دالة توليد رقم الطلبية التلقائي لكل عميل'; 