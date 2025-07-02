-- =====================================
-- دالة RPC متقدمة لتتبع المخزون والعمليات
-- Advanced Inventory Tracking RPC Function
-- =====================================

CREATE OR REPLACE FUNCTION get_advanced_inventory_tracking(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_product_ids UUID[] DEFAULT NULL,
    p_user_ids UUID[] DEFAULT NULL,
    p_operation_types TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0,
    p_include_batches BOOLEAN DEFAULT FALSE,
    p_include_stats BOOLEAN DEFAULT TRUE,
    p_search_term TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
    v_stats JSON;
    v_batches JSON;
    v_recent_activities JSON;
    v_user_activities JSON;
    v_product_insights JSON;
    v_execution_time INTERVAL;
    v_start_time TIMESTAMP;
    v_total_count INTEGER;
BEGIN
    -- بداية قياس الوقت
    v_start_time := clock_timestamp();
    
    -- التحقق من صحة المعاملات
    IF p_organization_id IS NULL THEN
        RAISE EXCEPTION 'معرف المؤسسة مطلوب';
    END IF;
    
    IF p_limit > 1000 THEN
        p_limit := 1000; -- حد أقصى للحماية من الضغط
    END IF;
    
    -- =====================================
    -- الحركات الأخيرة مع التقسيم
    -- =====================================
    
    -- حساب العدد الإجمالي للحركات أولاً (قبل التقسيم)
    SELECT COUNT(*) INTO v_total_count
    FROM inventory_log il
    LEFT JOIN products p ON il.product_id = p.id
    LEFT JOIN users u ON il.created_by = u.id
    WHERE il.organization_id = p_organization_id
        AND il.created_at BETWEEN p_start_date AND p_end_date
        AND (p_product_ids IS NULL OR il.product_id = ANY(p_product_ids))
        AND (p_user_ids IS NULL OR il.created_by = ANY(p_user_ids))
        AND (p_operation_types IS NULL OR il.type = ANY(p_operation_types))
        AND (p_search_term IS NULL OR 
             p.name ILIKE '%' || p_search_term || '%' OR 
             p.sku ILIKE '%' || p_search_term || '%' OR
             u.name ILIKE '%' || p_search_term || '%');
    
    -- الحركات مع التقسيم
    WITH recent_activities AS (
        SELECT 
            il.*,
            json_build_object(
                'name', p.name,
                'sku', p.sku,
                'purchase_price', p.purchase_price,
                'selling_price', p.price,
                'current_stock', p.stock_quantity
            ) as product_info,
            json_build_object(
                'name', u.name,
                'email', u.email,
                'role', u.role
            ) as user_info,
            -- حساب القيمة المالية للمعاملة
            CASE 
                WHEN il.type = 'sale' THEN il.quantity * COALESCE(p.price, 0)
                WHEN il.type = 'purchase' THEN il.quantity * COALESCE(p.purchase_price, 0)
                WHEN il.type = 'return' THEN il.quantity * COALESCE(p.price, 0)
                WHEN il.type IN ('adjustment', 'loss', 'damage') THEN il.quantity * COALESCE(p.purchase_price, 0)
                ELSE 0
            END as transaction_value,
            
            -- مؤشرات الأداء
            CASE 
                WHEN il.new_stock <= 5 THEN 'low_stock'
                WHEN il.new_stock = 0 THEN 'out_of_stock'
                WHEN il.quantity > 50 THEN 'bulk_operation'
                ELSE 'normal'
            END as status_indicator,
            
            -- معلومات السياق (استخدام جدول orders فقط)
            CASE il.reference_type
                WHEN 'order' THEN (
                    SELECT json_build_object(
                        'order_total', o.total,
                        'payment_method', o.payment_method,
                        'customer_name', COALESCE(c.name, 'غير محدد'),
                        'is_pos_order', NOT o.is_online
                    )
                    FROM orders o 
                    LEFT JOIN customers c ON o.customer_id = c.id
                    WHERE o.id = il.reference_id
                )
                ELSE NULL
            END as context_info
        FROM inventory_log il
        LEFT JOIN products p ON il.product_id = p.id
        LEFT JOIN users u ON il.created_by = u.id
        WHERE il.organization_id = p_organization_id
            AND il.created_at BETWEEN p_start_date AND p_end_date
            AND (p_product_ids IS NULL OR il.product_id = ANY(p_product_ids))
            AND (p_user_ids IS NULL OR il.created_by = ANY(p_user_ids))
            AND (p_operation_types IS NULL OR il.type = ANY(p_operation_types))
            AND (p_search_term IS NULL OR 
                 p.name ILIKE '%' || p_search_term || '%' OR 
                 p.sku ILIKE '%' || p_search_term || '%' OR
                 u.name ILIKE '%' || p_search_term || '%')
        ORDER BY il.created_at DESC
        LIMIT p_limit OFFSET p_offset
    )
    SELECT json_agg(
        json_build_object(
            'id', id,
            'operation_type', type,
            'quantity', quantity,
            'previous_stock', previous_stock,
            'new_stock', new_stock,
            'reference_type', reference_type,
            'reference_id', reference_id,
            'notes', notes,
            'created_at', created_at,
            'product', product_info,
            'user', user_info,
            'transaction_value', transaction_value,
            'status_indicator', status_indicator,
            'context_info', context_info
        )
    ) INTO v_recent_activities
    FROM recent_activities;
    
    -- =====================================
    -- الإحصائيات الذكية
    -- =====================================
    
    IF p_include_stats THEN
        WITH stats_data AS (
            SELECT 
                COUNT(*) as total_operations,
                COUNT(DISTINCT il.product_id) as affected_products,
                COUNT(DISTINCT il.created_by) as active_users,
                
                -- إحصائيات بالنوع
                COUNT(*) FILTER (WHERE il.type = 'sale') as sales_count,
                COUNT(*) FILTER (WHERE il.type = 'purchase') as purchases_count,
                COUNT(*) FILTER (WHERE il.type = 'return') as returns_count,
                COUNT(*) FILTER (WHERE il.type = 'adjustment') as adjustments_count,
                
                -- قيم مالية
                COALESCE(SUM(
                    CASE WHEN il.type = 'sale' 
                    THEN il.quantity * COALESCE(p.price, 0) 
                    ELSE 0 END
                ), 0) as total_sales_value,
                
                COALESCE(SUM(
                    CASE WHEN il.type = 'purchase' 
                    THEN il.quantity * COALESCE(p.purchase_price, 0) 
                    ELSE 0 END
                ), 0) as total_purchase_value,
                
                -- اتجاهات
                COUNT(*) FILTER (
                    WHERE il.created_at >= NOW() - INTERVAL '7 days'
                ) as operations_last_7_days,
                
                COUNT(*) FILTER (
                    WHERE il.created_at >= NOW() - INTERVAL '1 day'
                ) as operations_today
                
            FROM inventory_log il
            LEFT JOIN products p ON il.product_id = p.id
            WHERE il.organization_id = p_organization_id
                AND il.created_at BETWEEN p_start_date AND p_end_date
                AND (p_product_ids IS NULL OR il.product_id = ANY(p_product_ids))
                AND (p_user_ids IS NULL OR il.created_by = ANY(p_user_ids))
                AND (p_operation_types IS NULL OR il.type = ANY(p_operation_types))
        )
        SELECT json_build_object(
            'total_operations', total_operations,
            'affected_products', affected_products,
            'active_users', active_users,
            'operations_breakdown', json_build_object(
                'sales', sales_count,
                'purchases', purchases_count,
                'returns', returns_count,
                'adjustments', adjustments_count
            ),
            'financial_summary', json_build_object(
                'total_sales_value', total_sales_value,
                'total_purchase_value', total_purchase_value,
                'net_value', total_sales_value - total_purchase_value
            ),
            'trends', json_build_object(
                'operations_last_7_days', operations_last_7_days,
                'operations_today', operations_today
            )
        ) INTO v_stats
        FROM stats_data;
    END IF;
    
    -- =====================================
    -- معلومات الدفعات (اختيارية)
    -- =====================================
    
    IF p_include_batches THEN
        WITH batch_data AS (
            SELECT 
                ib.id,
                ib.batch_number,
                ib.product_id,
                p.name as product_name,
                ib.quantity_remaining as current_stock,
                ib.purchase_date,
                ib.expiry_date,
                ib.purchase_price as batch_cost,
                
                -- حالة الدفعة
                CASE 
                    WHEN ib.expiry_date IS NOT NULL AND ib.expiry_date < NOW() THEN 'expired'
                    WHEN ib.expiry_date IS NOT NULL AND ib.expiry_date < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
                    WHEN ib.quantity_remaining = 0 THEN 'exhausted'
                    WHEN ib.quantity_remaining <= 5 THEN 'low_stock'
                    ELSE 'normal'
                END as batch_status,
                
                -- حركات الدفعة الأخيرة
                (
                    SELECT json_agg(
                        json_build_object(
                            'movement_type', ibm.movement_type,
                            'quantity', ibm.quantity,
                            'created_at', ibm.created_at
                        ) ORDER BY ibm.created_at DESC
                    )
                    FROM inventory_batch_movements ibm
                    WHERE ibm.batch_id = ib.id
                        AND ibm.created_at BETWEEN p_start_date AND p_end_date
                    LIMIT 5
                ) as recent_movements
                
            FROM inventory_batches ib
            LEFT JOIN products p ON ib.product_id = p.id
            WHERE ib.organization_id = p_organization_id
                AND ib.is_active = true
                AND (p_product_ids IS NULL OR ib.product_id = ANY(p_product_ids))
            ORDER BY ib.purchase_date DESC
            LIMIT 50
        )
        SELECT json_agg(
            json_build_object(
                'id', id,
                'batch_number', batch_number,
                'product_id', product_id,
                'product_name', product_name,
                'current_stock', current_stock,
                'purchase_date', purchase_date,
                'expiry_date', expiry_date,
                'batch_cost', batch_cost,
                'batch_status', batch_status,
                'recent_movements', recent_movements
            )
        ) INTO v_batches
        FROM batch_data;
    END IF;
    
    -- =====================================
    -- نشاط المستخدمين
    -- =====================================
    
    WITH user_activity AS (
        SELECT 
            u.id as user_id,
            u.name as user_name,
            u.role as user_role,
            COUNT(*) as operations_count,
            COUNT(DISTINCT il.product_id) as products_affected,
            SUM(ABS(il.quantity)) as total_quantity_handled,
            MAX(il.created_at) as last_activity,
            
            -- توزيع العمليات
            COUNT(*) FILTER (WHERE il.type = 'sale') as sales_operations,
            COUNT(*) FILTER (WHERE il.type = 'purchase') as purchase_operations,
            COUNT(*) FILTER (WHERE il.type = 'adjustment') as adjustment_operations,
            
            -- النشاط اليومي
            COUNT(*) FILTER (
                WHERE il.created_at >= CURRENT_DATE
            ) as operations_today,
            
            -- القيمة المالية للعمليات
            COALESCE(SUM(
                CASE WHEN il.type = 'sale' 
                THEN il.quantity * COALESCE(p.price, 0) 
                ELSE 0 END
            ), 0) as total_sales_value,
            
            COALESCE(SUM(
                CASE WHEN il.type = 'purchase' 
                THEN il.quantity * COALESCE(p.purchase_price, 0) 
                ELSE 0 END
            ), 0) as total_purchase_value
            
        FROM inventory_log il
        LEFT JOIN users u ON il.created_by = u.id
        LEFT JOIN products p ON il.product_id = p.id
        WHERE il.organization_id = p_organization_id
            AND il.created_at BETWEEN p_start_date AND p_end_date
            AND u.id IS NOT NULL
        GROUP BY u.id, u.name, u.role
        ORDER BY operations_count DESC
        LIMIT 20
    )
    SELECT json_agg(
        json_build_object(
            'user_id', user_id,
            'user_name', user_name,
            'user_role', user_role,
            'operations_count', operations_count,
            'products_affected', products_affected,
            'total_quantity_handled', total_quantity_handled,
            'last_activity', last_activity,
            'operations_breakdown', json_build_object(
                'sales', sales_operations,
                'purchases', purchase_operations,
                'adjustments', adjustment_operations
            ),
            'operations_today', operations_today,
            'total_sales_value', total_sales_value,
            'total_purchase_value', total_purchase_value,
            'total_value', total_sales_value + total_purchase_value
        )
    ) INTO v_user_activities
    FROM user_activity;
    
    -- =====================================
    -- رؤى المنتجات
    -- =====================================
    
    WITH product_insights AS (
        SELECT 
            p.id as product_id,
            p.name as product_name,
            p.sku,
            p.stock_quantity as current_stock,
            p.purchase_price,
            p.price as selling_price,
            
            -- إحصائيات الحركة
            COUNT(il.id) as total_movements,
            SUM(ABS(il.quantity)) as total_quantity_moved,
            
            -- آخر الحركات
            MAX(il.created_at) as last_movement,
            
            -- توزيع العمليات
            COUNT(*) FILTER (WHERE il.type = 'sale') as sales_count,
            COUNT(*) FILTER (WHERE il.type = 'purchase') as purchases_count,
            COUNT(*) FILTER (WHERE il.type = 'adjustment') as adjustments_count,
            
            -- القيم المالية
            COALESCE(SUM(
                CASE WHEN il.type = 'sale' 
                THEN il.quantity * COALESCE(p.price, 0) 
                ELSE 0 END
            ), 0) as sales_value,
            
            -- مؤشرات الأداء
            CASE 
                WHEN p.stock_quantity <= 5 THEN 'low_stock'
                WHEN p.stock_quantity = 0 THEN 'out_of_stock'
                WHEN COUNT(il.id) FILTER (WHERE il.created_at >= NOW() - INTERVAL '7 days') > 10 THEN 'high_activity'
                ELSE 'normal'
            END as status
            
        FROM products p
        LEFT JOIN inventory_log il ON p.id = il.product_id 
            AND il.created_at BETWEEN p_start_date AND p_end_date
        WHERE p.organization_id = p_organization_id
            AND p.is_active = true
            AND (p_product_ids IS NULL OR p.id = ANY(p_product_ids))
        GROUP BY p.id, p.name, p.sku, p.stock_quantity, p.purchase_price, p.price
        HAVING COUNT(il.id) > 0
        ORDER BY total_movements DESC
        LIMIT 50
    )
    SELECT json_agg(
        json_build_object(
            'product_id', product_id,
            'product_name', product_name,
            'sku', sku,
            'current_stock', current_stock,
            'purchase_price', purchase_price,
            'selling_price', selling_price,
            'movement_stats', json_build_object(
                'total_movements', total_movements,
                'total_quantity_moved', total_quantity_moved,
                'last_movement', last_movement
            ),
            'operations_breakdown', json_build_object(
                'sales', sales_count,
                'purchases', purchases_count,
                'adjustments', adjustments_count
            ),
            'sales_value', sales_value,
            'status', status
        )
    ) INTO v_product_insights
    FROM product_insights;
    
    -- حساب وقت التنفيذ
    v_execution_time := clock_timestamp() - v_start_time;
    
    -- =====================================
    -- النتيجة النهائية
    -- =====================================
    
    v_result := json_build_object(
        'success', true,
        'data', json_build_object(
            'recent_activities', COALESCE(v_recent_activities, '[]'::json),
            'statistics', CASE WHEN p_include_stats THEN v_stats ELSE null END,
            'batches', CASE WHEN p_include_batches THEN v_batches ELSE null END,
            'user_activities', COALESCE(v_user_activities, '[]'::json),
            'product_insights', COALESCE(v_product_insights, '[]'::json),
            'total_count', v_total_count
        ),
        'metadata', json_build_object(
            'execution_time_ms', EXTRACT(EPOCH FROM v_execution_time) * 1000,
            'query_params', json_build_object(
                'start_date', p_start_date,
                'end_date', p_end_date,
                'limit', p_limit,
                'offset', p_offset,
                'include_batches', p_include_batches,
                'include_stats', p_include_stats
            ),
            'generated_at', NOW()
        )
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', json_build_object(
                'message', SQLERRM,
                'code', SQLSTATE,
                'timestamp', NOW()
            )
        );
END;
$$;

-- =====================================
-- تعليقات ووصف الدالة
-- =====================================

COMMENT ON FUNCTION get_advanced_inventory_tracking IS 'دالة RPC متقدمة لتتبع المخزون مع إحصائيات ذكية ومعلومات شاملة';

-- =====================================
-- إعطاء الصلاحيات
-- =====================================

-- صلاحيات للمستخدمين العاديين
GRANT EXECUTE ON FUNCTION get_advanced_inventory_tracking TO authenticated;

-- صلاحيات للمدراء فقط (يمكن تخصيصها حسب الحاجة)
-- GRANT EXECUTE ON FUNCTION get_advanced_inventory_tracking TO admin_role; 