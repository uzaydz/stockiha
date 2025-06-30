-- ===================================================
-- دالة محدثة لجلب إحصائيات طلبيات POS مع إصلاح الأخطاء
-- ===================================================

CREATE OR REPLACE FUNCTION public.get_pos_orders_dashboard()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id
    FROM users 
    WHERE auth_user_id = auth.uid() 
    LIMIT 1;
    
    IF org_id IS NULL THEN
        RETURN '{\"error\": \"No organization found\"}'::json;
    END IF;
    
    SELECT json_build_object(
        'recent_orders', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', o.id,
                    'customer_id', o.customer_id,
                    'employee_id', o.employee_id,
                    'slug', o.slug,
                    'customer_order_number', o.customer_order_number,
                    'total', o.total,  -- استخدام العمود الصحيح
                    'subtotal', o.subtotal,
                    'tax', o.tax,
                    'discount', o.discount,
                    'status', o.status,
                    'payment_status', o.payment_status,
                    'payment_method', o.payment_method,
                    'is_online', o.is_online,
                    'notes', o.notes,
                    'created_at', o.created_at,
                    'updated_at', o.updated_at,
                    'customer_name', c.name,
                    'customer_phone', c.phone,
                    'customer_email', c.email,
                    'employee_name', u.name,
                    'employee_email', u.email
                )
                ORDER BY o.created_at DESC
            ), '[]'::json)
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users u ON o.employee_id = u.id
            WHERE o.organization_id = org_id
            AND o.is_online = false  -- طلبيات POS فقط
            ORDER BY o.created_at DESC
            LIMIT 20
        ),
        'stats', (
            SELECT json_build_object(
                'total_orders_today', COALESCE(today_stats.total_orders, 0),
                'total_revenue_today', COALESCE(today_stats.total_revenue, 0),
                'pending_orders', COALESCE(pending_stats.pending_orders, 0),
                'completed_orders', COALESCE(completed_stats.completed_orders, 0),
                'total_orders', COALESCE(total_stats.total_orders, 0),
                'total_revenue', COALESCE(total_stats.total_revenue, 0),
                'cash_orders', COALESCE(payment_stats.cash_orders, 0),
                'card_orders', COALESCE(payment_stats.card_orders, 0),
                'avg_order_value', COALESCE(total_stats.avg_order_value, 0)
            )
            FROM (
                -- إحصائيات اليوم
                SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(SUM(total), 0) as total_revenue
                FROM orders 
                WHERE organization_id = org_id 
                AND is_online = false
                AND DATE(created_at) = CURRENT_DATE
            ) today_stats
            CROSS JOIN (
                -- الطلبيات المعلقة
                SELECT COUNT(*) as pending_orders
                FROM orders 
                WHERE organization_id = org_id 
                AND is_online = false
                AND status = 'pending'
            ) pending_stats
            CROSS JOIN (
                -- الطلبيات المكتملة
                SELECT COUNT(*) as completed_orders
                FROM orders 
                WHERE organization_id = org_id 
                AND is_online = false
                AND status = 'completed'
            ) completed_stats
            CROSS JOIN (
                -- الإجماليات العامة
                SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(SUM(total), 0) as total_revenue,
                    CASE 
                        WHEN COUNT(*) > 0 THEN COALESCE(SUM(total), 0) / COUNT(*)
                        ELSE 0 
                    END as avg_order_value
                FROM orders 
                WHERE organization_id = org_id 
                AND is_online = false
            ) total_stats
            CROSS JOIN (
                -- إحصائيات طرق الدفع
                SELECT 
                    COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_orders,
                    COUNT(CASE WHEN payment_method = 'card' THEN 1 END) as card_orders
                FROM orders 
                WHERE organization_id = org_id 
                AND is_online = false
            ) payment_stats
        )
    ) INTO result;
    
    RETURN result;
END;
$function$; 