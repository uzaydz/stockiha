-- إنشاء view لعرض الطلبيات مع أخذ المرتجعات في الاعتبار
-- هذا سيحل مشكلة عرض البيانات الخاطئة في POSOrdersTableOptimized.tsx

-- إنشاء view للطلبيات مع حسابات المرتجعات
CREATE OR REPLACE VIEW pos_orders_with_returns_calculated AS
SELECT 
    o.*,
    -- حساب إجمالي المرتجعات المعتمدة
    COALESCE(return_summary.total_returned_amount, 0) as total_returned_amount,
    COALESCE(return_summary.total_returned_items, 0) as total_returned_items,
    
    -- حساب القيم الفعلية بعد المرتجعات
    (o.total - COALESCE(return_summary.total_returned_amount, 0)) as effective_total,
    
    -- حساب عدد المنتجات الفعلي
    (
        SELECT COALESCE(SUM(oi.quantity), 0) 
        FROM order_items oi 
        WHERE oi.order_id = o.id
    ) - COALESCE(return_summary.total_returned_items, 0) as effective_items_count,
    
    -- حالة الطلبية مع مراعاة المرتجعات
    CASE 
        WHEN return_summary.has_returns = true AND return_summary.is_fully_returned = true THEN 'fully_returned'
        WHEN return_summary.has_returns = true AND return_summary.is_fully_returned = false THEN 'partially_returned'
        ELSE o.status
    END as effective_status,
    
    -- معلومات إضافية عن المرتجعات
    return_summary.has_returns,
    return_summary.is_fully_returned,
    return_summary.pending_returns_count,
    return_summary.approved_returns_count
    
FROM orders o
LEFT JOIN (
    SELECT 
        r.original_order_id,
        SUM(CASE WHEN r.status = 'approved' THEN r.refund_amount ELSE 0 END) as total_returned_amount,
        SUM(CASE WHEN r.status = 'approved' THEN 
            (SELECT SUM(ri.return_quantity) FROM return_items ri WHERE ri.return_id = r.id)
        ELSE 0 END) as total_returned_items,
        
        COUNT(*) > 0 as has_returns,
        
        -- تحديد إذا كانت الطلبية مرجعة بالكامل
        (
            SUM(CASE WHEN r.status = 'approved' THEN r.refund_amount ELSE 0 END) >= 
            (SELECT o2.total FROM orders o2 WHERE o2.id = r.original_order_id)
        ) as is_fully_returned,
        
        COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending_returns_count,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_returns_count
        
    FROM returns r
    GROUP BY r.original_order_id
) return_summary ON o.id = return_summary.original_order_id
WHERE o.is_online = false; -- طلبيات نقطة البيع فقط

-- إنشاء view مبسط للاستخدام السريع
CREATE OR REPLACE VIEW pos_orders_summary AS
SELECT 
    id,
    customer_order_number,
    slug,
    customer_id,
    employee_id,
    status,
    effective_status,
    payment_method,
    payment_status,
    total as original_total,
    effective_total,
    effective_items_count as items_count,
    has_returns,
    is_fully_returned,
    total_returned_amount,
    created_at,
    updated_at,
    organization_id
FROM pos_orders_with_returns_calculated
ORDER BY created_at DESC;

-- دالة لحساب إحصائيات الطلبيات مع المرتجعات
CREATE OR REPLACE FUNCTION get_pos_orders_stats_with_returns(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_orders', COUNT(*),
        'total_revenue', SUM(effective_total),
        'total_returned_amount', SUM(total_returned_amount),
        'completed_orders', COUNT(*) FILTER (WHERE effective_status = 'completed'),
        'partially_returned_orders', COUNT(*) FILTER (WHERE effective_status = 'partially_returned'),
        'fully_returned_orders', COUNT(*) FILTER (WHERE effective_status = 'fully_returned'),
        'pending_orders', COUNT(*) FILTER (WHERE effective_status = 'pending'),
        'orders_with_returns', COUNT(*) FILTER (WHERE has_returns = true),
        'avg_order_value', ROUND(AVG(effective_total), 2),
        'today_orders', COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE),
        'today_revenue', SUM(effective_total) FILTER (WHERE DATE(created_at) = CURRENT_DATE)
    ) INTO v_result
    FROM pos_orders_with_returns_calculated
    WHERE organization_id = p_organization_id;
    
    RETURN v_result;
END;
$$;

-- دالة لجلب الطلبيات مع المرتجعات (للاستخدام في الواجهة الأمامية)
CREATE OR REPLACE FUNCTION get_pos_orders_with_returns(
    p_organization_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20,
    p_status TEXT DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_offset INTEGER;
    v_total_count INTEGER;
    v_orders JSON;
BEGIN
    v_offset := (p_page - 1) * p_limit;
    
    -- حساب العدد الإجمالي
    SELECT COUNT(*) INTO v_total_count
    FROM pos_orders_with_returns_calculated
    WHERE organization_id = p_organization_id
        AND (p_status IS NULL OR effective_status = p_status)
        AND (p_customer_id IS NULL OR customer_id = p_customer_id)
        AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        AND (p_date_from IS NULL OR DATE(created_at) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(created_at) <= p_date_to);
    
    -- جلب البيانات
    SELECT json_agg(
        json_build_object(
            'id', id,
            'customer_order_number', customer_order_number,
            'slug', slug,
            'customer_id', customer_id,
            'employee_id', employee_id,
            'status', status,
            'effective_status', effective_status,
            'payment_method', payment_method,
            'payment_status', payment_status,
            'original_total', total,
            'effective_total', effective_total,
            'items_count', effective_items_count,
            'has_returns', has_returns,
            'is_fully_returned', is_fully_returned,
            'total_returned_amount', total_returned_amount,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO v_orders
    FROM pos_orders_with_returns_calculated
    WHERE organization_id = p_organization_id
        AND (p_status IS NULL OR effective_status = p_status)
        AND (p_customer_id IS NULL OR customer_id = p_customer_id)
        AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        AND (p_date_from IS NULL OR DATE(created_at) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(created_at) <= p_date_to)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET v_offset;
    
    RETURN json_build_object(
        'orders', COALESCE(v_orders, '[]'::json),
        'total_count', v_total_count,
        'page', p_page,
        'limit', p_limit,
        'total_pages', CEIL(v_total_count::DECIMAL / p_limit)
    );
END;
$$;

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_returns_original_order_id_status 
ON returns(original_order_id, status);

CREATE INDEX IF NOT EXISTS idx_return_items_return_id 
ON return_items(return_id);

CREATE INDEX IF NOT EXISTS idx_orders_organization_is_online_created 
ON orders(organization_id, is_online, created_at DESC);

-- إضافة تعليقات للتوضيح
COMMENT ON VIEW pos_orders_with_returns_calculated IS 'عرض الطلبيات مع حسابات المرتجعات المفصلة';
COMMENT ON VIEW pos_orders_summary IS 'عرض مبسط لطلبيات نقطة البيع مع المرتجعات';
COMMENT ON FUNCTION get_pos_orders_stats_with_returns IS 'دالة لحساب إحصائيات الطلبيات مع المرتجعات';
COMMENT ON FUNCTION get_pos_orders_with_returns IS 'دالة لجلب الطلبيات مع معلومات المرتجعات مع الترقيم'; 