-- إصلاح مشكلة created_by في inventory_log
-- تحديث دالة log_sales_to_inventory_smart لتضمين created_by

CREATE OR REPLACE FUNCTION log_sales_to_inventory_smart()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- التحقق من نوع الطلبية
    DECLARE
        order_type TEXT;
        existing_log_count INTEGER;
        order_employee_id UUID;
    BEGIN
        -- جلب نوع الطلبية ومعرف الموظف
        SELECT COALESCE(pos_order_type, 'regular'), employee_id
        INTO order_type, order_employee_id
        FROM orders 
        WHERE id = NEW.order_id;
        
        -- التحقق من وجود سجل FIFO مسبق لنفس المنتج والطلبية
        SELECT COUNT(*)
        INTO existing_log_count
        FROM inventory_log
        WHERE product_id = NEW.product_id 
        AND reference_id = NEW.order_id 
        AND reference_type = 'pos_order'
        AND created_at >= NOW() - INTERVAL '1 minute';
        
        -- إذا كانت طلبية POS ولديها سجل FIFO مسبق، لا نضيف سجل إضافي
        IF order_type = 'pos' AND existing_log_count > 0 THEN
            RETURN NEW;
        END IF;
        
        -- للطلبيات العادية أو POS بدون FIFO، أضف السجل التقليدي
        INSERT INTO inventory_log(
            product_id,
            quantity,
            previous_stock,
            new_stock,
            type,
            reference_id,
            reference_type,
            notes,
            organization_id,
            created_by
        )
        SELECT 
            NEW.product_id,
            NEW.quantity,
            p.stock_quantity + NEW.quantity, -- المخزون قبل البيع
            p.stock_quantity,                -- المخزون بعد البيع
            'sale',
            NEW.order_id,
            CASE 
                WHEN order_type = 'pos' THEN 'pos_order'
                ELSE 'order'
            END,
            'بيع من خلال طلب رقم ' || NEW.order_id,
            NEW.organization_id,
            order_employee_id
        FROM products p
        WHERE p.id = NEW.product_id;
        
        -- للطلبيات العادية، نحدث المخزون يدوياً
        IF order_type != 'pos' THEN
            UPDATE products 
            SET stock_quantity = stock_quantity - NEW.quantity,
                updated_at = NOW(),
                last_inventory_update = NOW()
            WHERE id = NEW.product_id;
        END IF;
        
        RETURN NEW;
    END;
END;
$$;

-- التعليق على التحديث
COMMENT ON FUNCTION log_sales_to_inventory_smart IS 
'دالة محسنة لتسجيل حركات المخزون مع تضمين معرف الموظف (created_by) من جدول orders'; 