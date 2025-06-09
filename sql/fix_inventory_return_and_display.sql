-- حل مشكلة إرجاع المخزون وتحديث عرض الطلبيات
-- المشكلة 1: المخزون لا يتم إرجاعه عند اعتماد الإرجاع
-- المشكلة 2: الطلبيات لا تزال تظهر بالبيانات الأصلية

-- أولاً: إنشاء دالة لإرجاع المخزون عند اعتماد الإرجاع
CREATE OR REPLACE FUNCTION restore_inventory_on_return_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- فقط عند تغيير الحالة إلى approved
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- إرجاع المخزون لجميع المنتجات في هذا الإرجاع
        UPDATE products 
        SET stock_quantity = stock_quantity + ri.return_quantity,
            updated_at = NOW()
        FROM return_items ri
        WHERE ri.return_id = NEW.id 
            AND ri.product_id = products.id
            AND ri.inventory_returned = false;
            
        -- تحديث حالة إرجاع المخزون
        UPDATE return_items 
        SET inventory_returned = true,
            inventory_returned_at = NOW(),
            updated_at = NOW()
        WHERE return_id = NEW.id 
            AND inventory_returned = false;
    END IF;
    
    RETURN NEW;
END;
$$;

-- إنشاء trigger لإرجاع المخزون تلقائياً
DROP TRIGGER IF EXISTS trigger_restore_inventory_on_approval ON returns;
CREATE TRIGGER trigger_restore_inventory_on_approval
    AFTER UPDATE ON returns
    FOR EACH ROW
    EXECUTE FUNCTION restore_inventory_on_return_approval();

-- إرجاع المخزون للإرجاعات المعتمدة سابقاً والتي لم يتم إرجاع مخزونها
DO $$
BEGIN
    -- تحديث المخزون للإرجاعات المعتمدة
    UPDATE products 
    SET stock_quantity = stock_quantity + restore_data.total_quantity,
        updated_at = NOW()
    FROM (
        SELECT 
            ri.product_id,
            SUM(ri.return_quantity) as total_quantity
        FROM return_items ri
        JOIN returns r ON ri.return_id = r.id
        WHERE r.status = 'approved' 
            AND ri.inventory_returned = false
        GROUP BY ri.product_id
    ) restore_data
    WHERE products.id = restore_data.product_id;
    
    -- تحديث حالة إرجاع المخزون
    UPDATE return_items 
    SET inventory_returned = true,
        inventory_returned_at = NOW(),
        updated_at = NOW()
    WHERE return_id IN (
        SELECT id FROM returns WHERE status = 'approved'
    ) AND inventory_returned = false;
    
    RAISE NOTICE 'تم إرجاع المخزون للإرجاعات المعتمدة سابقاً';
END $$;

-- ثانياً: إنشاء دالة محدثة لجلب طلبيات نقطة البيع مع المرتجعات
CREATE OR REPLACE FUNCTION get_pos_orders_with_returns_optimized(
    p_organization_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20,
    p_status TEXT DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    customer_order_number INTEGER,
    slug VARCHAR,
    customer_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    employee_id UUID,
    status VARCHAR,
    effective_status VARCHAR,
    payment_method VARCHAR,
    payment_status VARCHAR,
    original_total NUMERIC,
    effective_total NUMERIC,
    items_count INTEGER,
    has_returns BOOLEAN,
    is_fully_returned BOOLEAN,
    total_returned_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.customer_order_number,
        o.slug,
        o.customer_id,
        COALESCE(c.name, 'زائر') as customer_name,
        c.phone as customer_phone,
        o.employee_id,
        o.status,
        CASE 
            WHEN return_summary.has_returns = true AND return_summary.is_fully_returned = true THEN 'fully_returned'
            WHEN return_summary.has_returns = true AND return_summary.is_fully_returned = false THEN 'partially_returned'
            ELSE o.status
        END as effective_status,
        o.payment_method,
        o.payment_status,
        o.total as original_total,
        (o.total - COALESCE(return_summary.total_returned_amount, 0)) as effective_total,
        (
            COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id), 0) - 
            COALESCE(return_summary.total_returned_items, 0)
        )::INTEGER as items_count,
        COALESCE(return_summary.has_returns, false) as has_returns,
        COALESCE(return_summary.is_fully_returned, false) as is_fully_returned,
        COALESCE(return_summary.total_returned_amount, 0) as total_returned_amount,
        o.created_at,
        o.updated_at
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN (
        SELECT 
            r.original_order_id,
            SUM(CASE WHEN r.status = 'approved' THEN r.refund_amount ELSE 0 END) as total_returned_amount,
            SUM(CASE WHEN r.status = 'approved' THEN 
                (SELECT SUM(ri.return_quantity) FROM return_items ri WHERE ri.return_id = r.id)
            ELSE 0 END) as total_returned_items,
            COUNT(*) > 0 as has_returns,
            (
                SUM(CASE WHEN r.status = 'approved' THEN r.refund_amount ELSE 0 END) >= 
                (SELECT o2.total FROM orders o2 WHERE o2.id = r.original_order_id)
            ) as is_fully_returned
        FROM returns r
        GROUP BY r.original_order_id
    ) return_summary ON o.id = return_summary.original_order_id
    WHERE o.organization_id = p_organization_id
        AND o.is_online = false
        AND (p_status IS NULL OR (
            CASE 
                WHEN return_summary.has_returns = true AND return_summary.is_fully_returned = true THEN 'fully_returned'
                WHEN return_summary.has_returns = true AND return_summary.is_fully_returned = false THEN 'partially_returned'
                ELSE o.status
            END
        ) = p_status)
        AND (p_customer_id IS NULL OR o.customer_id = p_customer_id)
        AND (p_employee_id IS NULL OR o.employee_id = p_employee_id)
        AND (p_date_from IS NULL OR DATE(o.created_at) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(o.created_at) <= p_date_to)
    ORDER BY o.created_at DESC
    LIMIT p_limit OFFSET (p_page - 1) * p_limit;
END;
$$;

-- دالة للحصول على إحصائيات سريعة
CREATE OR REPLACE FUNCTION get_pos_orders_count_with_returns(p_organization_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM orders o
    WHERE o.organization_id = p_organization_id
        AND o.is_online = false;
    
    RETURN v_count;
END;
$$;

-- إنشاء view محسن للاستعلامات السريعة
CREATE OR REPLACE VIEW pos_orders_display AS
SELECT 
    o.id,
    o.customer_order_number,
    o.slug,
    o.customer_id,
    COALESCE(c.name, 'زائر') as customer_name,
    c.phone as customer_phone,
    o.employee_id,
    o.status,
    CASE 
        WHEN return_summary.has_returns = true AND return_summary.is_fully_returned = true THEN 'fully_returned'
        WHEN return_summary.has_returns = true AND return_summary.is_fully_returned = false THEN 'partially_returned'
        ELSE o.status
    END as effective_status,
    o.payment_method,
    o.payment_status,
    o.total as original_total,
    (o.total - COALESCE(return_summary.total_returned_amount, 0)) as effective_total,
    (
        COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id), 0) - 
        COALESCE(return_summary.total_returned_items, 0)
    ) as items_count,
    COALESCE(return_summary.has_returns, false) as has_returns,
    COALESCE(return_summary.is_fully_returned, false) as is_fully_returned,
    COALESCE(return_summary.total_returned_amount, 0) as total_returned_amount,
    o.created_at,
    o.updated_at,
    o.organization_id
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN (
    SELECT 
        r.original_order_id,
        SUM(CASE WHEN r.status = 'approved' THEN r.refund_amount ELSE 0 END) as total_returned_amount,
        SUM(CASE WHEN r.status = 'approved' THEN 
            (SELECT SUM(ri.return_quantity) FROM return_items ri WHERE ri.return_id = r.id)
        ELSE 0 END) as total_returned_items,
        COUNT(*) > 0 as has_returns,
        (
            SUM(CASE WHEN r.status = 'approved' THEN r.refund_amount ELSE 0 END) >= 
            (SELECT o2.total FROM orders o2 WHERE o2.id = r.original_order_id)
        ) as is_fully_returned
    FROM returns r
    GROUP BY r.original_order_id
) return_summary ON o.id = return_summary.original_order_id
WHERE o.is_online = false;

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_return_items_inventory_returned 
ON return_items(inventory_returned, return_id);

CREATE INDEX IF NOT EXISTS idx_products_stock_quantity 
ON products(stock_quantity) WHERE stock_quantity IS NOT NULL;

-- تعليقات للتوضيح
COMMENT ON FUNCTION restore_inventory_on_return_approval IS 'دالة إرجاع المخزون تلقائياً عند اعتماد الإرجاع';
COMMENT ON FUNCTION get_pos_orders_with_returns_optimized IS 'دالة محسنة لجلب طلبيات نقطة البيع مع المرتجعات';
COMMENT ON VIEW pos_orders_display IS 'عرض محسن لطلبيات نقطة البيع مع حسابات المرتجعات'; 