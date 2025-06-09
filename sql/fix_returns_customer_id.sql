-- حل مشكلة foreign key constraint في جدول returns
-- المشكلة: customer_id في الطلبيات قد يكون من جدول customers وليس users

-- الحل 1: تحديث foreign key constraint ليشير لجدول customers بدلاً من users
-- أولاً نحذف constraint الموجود
ALTER TABLE returns DROP CONSTRAINT IF EXISTS returns_customer_id_fkey;

-- إنشاء constraint جديد يشير لجدول customers
ALTER TABLE returns ADD CONSTRAINT returns_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- الحل 2: تحديث دالة create_return_request للتعامل مع العملاء من جدولي users و customers
-- حذف جميع الدوال الموجودة بنفس الاسم أولاً
DROP FUNCTION IF EXISTS create_return_request CASCADE;

CREATE OR REPLACE FUNCTION create_return_request(
    p_original_order_id UUID,
    p_return_type VARCHAR,
    p_return_reason VARCHAR,
    p_created_by UUID,
    p_organization_id UUID,
    p_return_reason_description TEXT DEFAULT NULL,
    p_items_to_return JSONB DEFAULT '[]'::jsonb,
    p_refund_method VARCHAR DEFAULT 'cash',
    p_notes TEXT DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_return_id UUID;
    v_original_order RECORD;
    v_item JSONB;
    v_order_item RECORD;
    v_return_item_id UUID;
    v_total_return_amount NUMERIC(10,2) := 0;
    v_total_original_amount NUMERIC(10,2) := 0;
    v_customer RECORD;
    v_result JSON;
    v_final_customer_id UUID;
    v_customer_name TEXT;
    v_customer_phone TEXT;
    v_customer_email TEXT;
BEGIN
    -- التحقق من وجود الطلبية الأصلية
    SELECT *
    INTO v_original_order
    FROM orders 
    WHERE id = p_original_order_id
      AND organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الطلبية الأصلية غير موجودة'
        );
    END IF;
    
    -- محاولة الحصول على معلومات العميل من جدول customers أولاً
    SELECT id, name, phone, email
    INTO v_customer
    FROM customers
    WHERE id = COALESCE(p_customer_id, v_original_order.customer_id);
    
    IF FOUND THEN
        v_final_customer_id := v_customer.id;
        v_customer_name := v_customer.name;
        v_customer_phone := v_customer.phone;
        v_customer_email := v_customer.email;
    ELSE
        -- إذا لم نجده في customers، ابحث في users
        SELECT id, name, phone, email
        INTO v_customer
        FROM users
        WHERE id = COALESCE(p_customer_id, v_original_order.customer_id);
        
        IF FOUND THEN
            v_final_customer_id := v_customer.id;
            v_customer_name := v_customer.name;
            v_customer_phone := v_customer.phone;
            v_customer_email := v_customer.email;
        ELSE
            -- إذا لم نجد العميل في أي جدول، استخدم قيم افتراضية
            v_final_customer_id := NULL;
            v_customer_name := 'زائر';
            v_customer_phone := NULL;
            v_customer_email := NULL;
        END IF;
    END IF;
    
    -- التحقق من عدم وجود إرجاع سابق لنفس الطلبية (في حالة الإرجاع الكامل)
    IF p_return_type = 'full' THEN
        IF EXISTS (
            SELECT 1 FROM returns 
            WHERE original_order_id = p_original_order_id 
              AND return_type = 'full' 
              AND status NOT IN ('rejected', 'cancelled')
        ) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'يوجد طلب إرجاع كامل سابق لهذه الطلبية'
            );
        END IF;
    END IF;
    
    -- إنشاء طلب الإرجاع
    INSERT INTO returns (
        original_order_id,
        original_order_number,
        customer_id,
        customer_name,
        customer_phone,
        customer_email,
        return_type,
        return_reason,
        return_reason_description,
        original_total,
        refund_method,
        notes,
        organization_id,
        created_by,
        requires_manager_approval
    ) VALUES (
        p_original_order_id,
        v_original_order.customer_order_number::text,
        v_final_customer_id, -- قد يكون NULL إذا لم نجد العميل
        v_customer_name,
        v_customer_phone,
        v_customer_email,
        p_return_type,
        p_return_reason,
        p_return_reason_description,
        v_original_order.total,
        p_refund_method,
        p_notes,
        p_organization_id,
        p_created_by,
        CASE WHEN v_original_order.total > 1000 THEN true ELSE false END
    ) RETURNING id INTO v_return_id;
    
    -- معالجة عناصر الإرجاع
    IF p_return_type = 'full' THEN
        -- إرجاع كامل - إضافة جميع عناصر الطلبية
        FOR v_order_item IN 
            SELECT oi.*, p.name as current_product_name, p.sku as current_sku
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = p_original_order_id
        LOOP
            INSERT INTO return_items (
                return_id,
                original_order_item_id,
                product_id,
                product_name,
                product_sku,
                original_quantity,
                return_quantity,
                original_unit_price,
                return_unit_price,
                total_return_amount,
                variant_info
            ) VALUES (
                v_return_id,
                v_order_item.id,
                v_order_item.product_id,
                COALESCE(v_order_item.current_product_name, v_order_item.product_name),
                COALESCE(v_order_item.current_sku, ''),
                v_order_item.quantity,
                v_order_item.quantity,
                v_order_item.unit_price,
                v_order_item.unit_price,
                v_order_item.total_price,
                v_order_item.variant_info
            );
            
            v_total_return_amount := v_total_return_amount + v_order_item.total_price;
        END LOOP;
        
    ELSE
        -- إرجاع جزئي - إضافة العناصر المحددة فقط
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_to_return)
        LOOP
            -- الحصول على معلومات العنصر الأصلي
            SELECT oi.*, p.name as current_product_name, p.sku as current_sku
            INTO v_order_item
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.id = (v_item->>'order_item_id')::UUID
              AND oi.order_id = p_original_order_id;
            
            IF FOUND THEN
                -- التحقق من أن الكمية المطلوبة للإرجاع لا تتجاوز الكمية الأصلية
                DECLARE
                    v_return_quantity INTEGER := (v_item->>'return_quantity')::INTEGER;
                    v_already_returned INTEGER;
                BEGIN
                    -- حساب الكمية المرجعة سابقاً لهذا العنصر
                    SELECT COALESCE(SUM(ri.return_quantity), 0)
                    INTO v_already_returned
                    FROM return_items ri
                    JOIN returns r ON ri.return_id = r.id
                    WHERE ri.original_order_item_id = v_order_item.id
                      AND r.status NOT IN ('rejected', 'cancelled');
                    
                    IF (v_already_returned + v_return_quantity) > v_order_item.quantity THEN
                        RETURN json_build_object(
                            'success', false,
                            'error', 'الكمية المطلوبة للإرجاع تتجاوز الكمية المتاحة للمنتج: ' || v_order_item.product_name
                        );
                    END IF;
                    
                    -- إضافة العنصر لطلب الإرجاع
                    INSERT INTO return_items (
                        return_id,
                        original_order_item_id,
                        product_id,
                        product_name,
                        product_sku,
                        original_quantity,
                        return_quantity,
                        original_unit_price,
                        return_unit_price,
                        total_return_amount,
                        variant_info,
                        condition_status
                    ) VALUES (
                        v_return_id,
                        v_order_item.id,
                        v_order_item.product_id,
                        COALESCE(v_order_item.current_product_name, v_order_item.product_name),
                        COALESCE(v_order_item.current_sku, ''),
                        v_order_item.quantity,
                        v_return_quantity,
                        v_order_item.unit_price,
                        v_order_item.unit_price,
                        v_order_item.unit_price * v_return_quantity,
                        v_order_item.variant_info,
                        COALESCE(v_item->>'condition_status', 'good')
                    );
                    
                    v_total_return_amount := v_total_return_amount + (v_order_item.unit_price * v_return_quantity);
                END;
            END IF;
        END LOOP;
    END IF;
    
    -- تحديث مبلغ الإرجاع في الطلب
    UPDATE returns 
    SET 
        return_amount = v_total_return_amount,
        refund_amount = v_total_return_amount
    WHERE id = v_return_id;
    
    -- إرجاع نتيجة العملية
    v_result := json_build_object(
        'success', true,
        'return_id', v_return_id,
        'return_number', (SELECT return_number FROM returns WHERE id = v_return_id),
        'total_return_amount', v_total_return_amount,
        'requires_approval', (SELECT requires_manager_approval FROM returns WHERE id = v_return_id),
        'message', 'تم إنشاء طلب الإرجاع بنجاح'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'حدث خطأ أثناء إنشاء طلب الإرجاع: ' || SQLERRM
        );
END;
$$;

-- إضافة تعليق للتوضيح
COMMENT ON FUNCTION create_return_request IS 'دالة محدثة لإنشاء طلبات الإرجاع مع دعم العملاء من جدولي customers و users'; 