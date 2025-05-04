-- ملف لنسخ الطلبات الإلكترونية إلى جدول orders الرئيسي
-- هذا الحل يقوم بنقل بيانات الطلبات الإلكترونية مباشرة إلى جدول orders
-- ويضمن أن دوال التحليلات ستعمل دون تعديل

-- 1. معرفة المعرفات الموجودة بالفعل في جدول orders لتجنب التكرار
CREATE OR REPLACE FUNCTION copy_online_orders_to_orders() RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_order_id UUID;
    v_order_slug TEXT;
    v_order_number INTEGER;
    v_org_id UUID;
BEGIN
    -- الحصول على معرف المؤسسة من الطلبات الإلكترونية
    SELECT DISTINCT organization_id INTO v_org_id FROM online_orders LIMIT 1;
    
    -- التكرار على جميع الطلبات الإلكترونية وإضافتها إلى جدول orders
    FOR v_order_id, v_order_slug, v_order_number IN 
        SELECT id, slug, customer_order_number FROM online_orders 
        WHERE id NOT IN (SELECT id FROM orders) -- تجنب التكرار
    LOOP
        -- نسخ بيانات الطلب من online_orders إلى orders
        INSERT INTO orders (
            id,
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
            employee_id,
            created_at,
            updated_at,
            organization_id,
            slug,
            customer_order_number,
            is_online -- هذا الحقل مهم لتمييز الطلبات الإلكترونية
        )
        SELECT 
            id,
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
            employee_id,
            created_at,
            updated_at,
            organization_id,
            slug,
            customer_order_number,
            TRUE -- وضع قيمة TRUE في حقل is_online
        FROM online_orders
        WHERE id = v_order_id;
        
        -- نسخ عناصر الطلب من online_order_items إلى order_items
        INSERT INTO order_items (
            id,
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price,
            is_digital,
            organization_id,
            slug,
            name,
            created_at,
            updated_at
        )
        SELECT 
            id,
            online_order_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price,
            is_digital,
            organization_id,
            slug,
            name,
            created_at,
            updated_at
        FROM online_order_items
        WHERE online_order_id = v_order_id;
        
        -- زيادة العداد
        v_count := v_count + 1;
    END LOOP;
    
    -- إرجاع عدد الطلبات التي تم نسخها
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 2. تنفيذ الدالة لنسخ الطلبات
SELECT copy_online_orders_to_orders();

-- 3. إضافة وظيفة للتزامن المستمر في المستقبل (يمكن تنفيذها كتشغيل مجدول)
CREATE OR REPLACE FUNCTION sync_online_orders() RETURNS TRIGGER AS $$
BEGIN
    -- إدراج الطلب الجديد في جدول orders
    INSERT INTO orders (
        id,
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
        employee_id,
        created_at,
        updated_at,
        organization_id,
        slug,
        customer_order_number,
        is_online
    )
    VALUES (
        NEW.id,
        NEW.customer_id,
        NEW.subtotal,
        NEW.tax,
        NEW.discount,
        NEW.total,
        NEW.status,
        NEW.payment_method,
        NEW.payment_status,
        NEW.shipping_address_id,
        NEW.shipping_method,
        NEW.shipping_cost,
        NEW.notes,
        NEW.employee_id,
        NEW.created_at,
        NEW.updated_at,
        NEW.organization_id,
        NEW.slug,
        NEW.customer_order_number,
        TRUE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء الـ trigger للتزامن التلقائي (اختياري - يمكن تعليق هذا إذا كنت تفضل المزامنة اليدوية)
-- DROP TRIGGER IF EXISTS online_orders_sync_trigger ON online_orders;
-- CREATE TRIGGER online_orders_sync_trigger
--     AFTER INSERT ON online_orders
--     FOR EACH ROW
--     EXECUTE FUNCTION sync_online_orders(); 