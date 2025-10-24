-- =====================================================
-- دالة موحدة لجلب بيانات صفحة طلبيات نقطة البيع
-- مع دعم حقول created_by_staff_id و created_by_staff_name
-- =====================================================

CREATE OR REPLACE FUNCTION get_pos_orders_page_data_fixed(
    p_org_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20,
    p_filters JSONB DEFAULT '{}'::JSONB,
    p_sort JSONB DEFAULT '{"field": "created_at", "direction": "desc"}'::JSONB,
    p_include JSONB DEFAULT '{"stats": true, "settings": true, "subscription": true}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMP := NOW();
    v_effective_user_id UUID := NULL;
    v_result JSONB;
    v_orders_data JSONB;
    v_stats_data JSONB;
    v_settings_data JSONB;
    v_subscription_data JSONB;
    v_employees_data JSONB;
    v_total_count INTEGER;
    v_filtered_count INTEGER;
    v_offset INTEGER;
    v_where_conditions TEXT[] := ARRAY[]::TEXT[];
    v_where_clause TEXT := '';
    v_sort_clause TEXT := 'o.created_at DESC';
    v_debug_timings JSONB := '{}'::JSONB;
    v_checkpoint_time TIMESTAMP;
    
    -- متغيرات الفلاتر
    v_date_from DATE;
    v_date_to DATE;
    v_statuses TEXT[];
    v_payment_statuses TEXT[];
    v_employee_id UUID;
    v_search TEXT;
BEGIN
    -- ✅ 1. التحقق من الصلاحيات/الانتماء إلى المؤسسة
    v_effective_user_id := COALESCE(p_user_id, auth.uid());

    IF NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.organization_id = p_org_id
          AND u.is_active = true
          AND (u.id = v_effective_user_id OR u.auth_user_id = v_effective_user_id)
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'غير مصرح لك بالوصول لهذه البيانات',
            'error_code', 'UNAUTHORIZED'
        );
    END IF;
    
    -- ✅ 2. تحضير معاملات الصفحات
    p_page := GREATEST(1, COALESCE(p_page, 1));
    p_page_size := GREATEST(1, LEAST(100, COALESCE(p_page_size, 20)));
    v_offset := (p_page - 1) * p_page_size;
    
    -- ✅ 3. استخراج وتحضير الفلاتر
    IF p_filters ? 'date_from' AND p_filters->>'date_from' IS NOT NULL THEN
        v_date_from := (p_filters->>'date_from')::DATE;
        v_where_conditions := v_where_conditions || ARRAY['DATE(o.created_at) >= $date_from'];
    END IF;
    
    IF p_filters ? 'date_to' AND p_filters->>'date_to' IS NOT NULL THEN
        v_date_to := (p_filters->>'date_to')::DATE;
        v_where_conditions := v_where_conditions || ARRAY['DATE(o.created_at) <= $date_to'];
    END IF;
    
    IF p_filters ? 'statuses' AND jsonb_array_length(p_filters->'statuses') > 0 THEN
        SELECT array_agg(value #>> '{}') INTO v_statuses
        FROM jsonb_array_elements(p_filters->'statuses');
        v_where_conditions := v_where_conditions || ARRAY['o.status = ANY($statuses)'];
    END IF;
    
    IF p_filters ? 'payment_statuses' AND jsonb_array_length(p_filters->'payment_statuses') > 0 THEN
        SELECT array_agg(value #>> '{}') INTO v_payment_statuses
        FROM jsonb_array_elements(p_filters->'payment_statuses');
        v_where_conditions := v_where_conditions || ARRAY['o.payment_status = ANY($payment_statuses)'];
    END IF;
    
    IF p_filters ? 'employee_id' AND p_filters->>'employee_id' IS NOT NULL THEN
        v_employee_id := (p_filters->>'employee_id')::UUID;
        v_where_conditions := v_where_conditions || ARRAY['o.employee_id = $employee_id'];
    END IF;
    
    IF p_filters ? 'search' AND LENGTH(TRIM(p_filters->>'search')) > 0 THEN
        v_search := TRIM(p_filters->>'search');
        v_where_conditions := v_where_conditions || ARRAY[
            '(o.slug ILIKE $search_pattern OR ' ||
            'o.notes ILIKE $search_pattern OR ' ||
            'o.customer_order_number::TEXT ILIKE $search_pattern OR ' ||
            'c.name ILIKE $search_pattern OR ' ||
            'c.phone ILIKE $search_pattern)'
        ];
    END IF;
    
    -- بناء WHERE clause
    IF array_length(v_where_conditions, 1) > 0 THEN
        v_where_clause := 'AND ' || array_to_string(v_where_conditions, ' AND ');
        
        v_where_clause := replace(v_where_clause, '$date_from', quote_literal(v_date_from));
        v_where_clause := replace(v_where_clause, '$date_to', quote_literal(v_date_to));
        v_where_clause := replace(v_where_clause, '$statuses', quote_literal(v_statuses));
        v_where_clause := replace(v_where_clause, '$payment_statuses', quote_literal(v_payment_statuses));
        v_where_clause := replace(v_where_clause, '$employee_id', quote_literal(v_employee_id));
        v_where_clause := replace(v_where_clause, '$search_pattern', quote_literal('%' || v_search || '%'));
    END IF;
    
    -- ✅ 4. تحضير ORDER BY
    IF p_sort ? 'field' AND p_sort ? 'direction' THEN
        CASE p_sort->>'field'
            WHEN 'created_at' THEN v_sort_clause := 'o.created_at ' || UPPER(p_sort->>'direction');
            WHEN 'total' THEN v_sort_clause := 'o.total ' || UPPER(p_sort->>'direction');
            WHEN 'status' THEN v_sort_clause := 'o.status ' || UPPER(p_sort->>'direction') || ', o.created_at DESC';
            WHEN 'customer_name' THEN v_sort_clause := 'c.name ' || UPPER(p_sort->>'direction') || ', o.created_at DESC';
            ELSE v_sort_clause := 'o.created_at DESC';
        END CASE;
    END IF;
    
    v_checkpoint_time := NOW();
    v_debug_timings := jsonb_set(v_debug_timings, '{setup_ms}', 
        to_jsonb(EXTRACT(epoch FROM (v_checkpoint_time - v_start_time)) * 1000));
    
    -- ✅ 5. حساب العدد الإجمالي والمفلتر
    EXECUTE '
        WITH filtered_orders AS (
            SELECT COUNT(*) as filtered_count
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.organization_id = $1
            AND o.is_online = false
            ' || v_where_clause || '
        )
        SELECT 
            filtered_count,
            (SELECT COUNT(*) FROM orders WHERE organization_id = $1 AND is_online = false) as total_count
        FROM filtered_orders'
    USING p_org_id INTO v_filtered_count, v_total_count;
    
    v_checkpoint_time := NOW();
    v_debug_timings := jsonb_set(v_debug_timings, '{counts_ms}', 
        to_jsonb(EXTRACT(epoch FROM (v_checkpoint_time - v_start_time - 
            (v_debug_timings->>'setup_ms')::TEXT::INTERVAL)) * 1000));
    
    -- ✅ 6. جلب الطلبيات مع جميع البيانات المطلوبة (مع حقول created_by_staff)
    EXECUTE '
        WITH items_summary AS (
            SELECT 
                oi.order_id,
                COUNT(oi.id) as items_count,
                SUM(oi.quantity) as total_qty
            FROM order_items oi
            GROUP BY oi.order_id
        ),
        returns_summary AS (
            SELECT 
                r.original_order_id,
                SUM(CASE WHEN r.status = ''approved'' THEN r.refund_amount ELSE 0 END) as total_returned_amount,
                COUNT(*) > 0 as has_returns,
                SUM(CASE WHEN r.status = ''approved'' THEN r.refund_amount ELSE 0 END) >= 
                    (SELECT total FROM orders WHERE id = r.original_order_id) as is_fully_returned
            FROM returns r
            GROUP BY r.original_order_id
        ),
        enriched_orders AS (
            SELECT 
                o.id,
                o.organization_id,
                o.customer_id,
                o.employee_id,
                o.created_by_staff_id,
                o.created_by_staff_name,
                o.slug,
                o.customer_order_number,
                o.status,
                o.payment_status,
                o.payment_method,
                o.total,
                o.subtotal,
                o.tax,
                o.discount,
                o.amount_paid,
                o.remaining_amount,
                o.consider_remaining_as_partial,
                o.notes,
                o.created_at,
                o.updated_at,
                o.completed_at,
                
                jsonb_build_object(
                    ''id'', c.id,
                    ''name'', c.name,
                    ''email'', c.email,
                    ''phone'', c.phone
                ) as customer,
                
                jsonb_build_object(
                    ''id'', u.id,
                    ''name'', u.name,
                    ''email'', u.email
                ) as employee,
                
                COALESCE(items_summary.items_count, 0) as items_count,
                COALESCE(items_summary.total_qty, 0) as total_qty,
                
                COALESCE(returns_summary.total_returned_amount, 0) as total_returned_amount,
                COALESCE(returns_summary.has_returns, false) as has_returns,
                COALESCE(returns_summary.is_fully_returned, false) as is_fully_returned,
                
                CASE 
                    WHEN COALESCE(returns_summary.is_fully_returned, false) THEN ''fully_returned''
                    WHEN COALESCE(returns_summary.has_returns, false) THEN ''partially_returned''
                    ELSE o.status
                END as effective_status,
                
                (o.total - COALESCE(returns_summary.total_returned_amount, 0)) as effective_total
                
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users u ON o.employee_id = u.id
            LEFT JOIN items_summary ON o.id = items_summary.order_id
            LEFT JOIN returns_summary ON o.id = returns_summary.original_order_id
            
            WHERE o.organization_id = $1
            AND o.is_online = false
            ' || v_where_clause || '
            ORDER BY ' || v_sort_clause || '
            LIMIT $2 OFFSET $3
        )
        SELECT jsonb_agg(
            jsonb_build_object(
                ''id'', id,
                ''organization_id'', organization_id,
                ''customer_id'', customer_id,
                ''employee_id'', employee_id,
                ''created_by_staff_id'', created_by_staff_id,
                ''created_by_staff_name'', created_by_staff_name,
                ''slug'', slug,
                ''customer_order_number'', customer_order_number,
                ''status'', status,
                ''payment_status'', payment_status,
                ''payment_method'', payment_method,
                ''total'', total,
                ''subtotal'', subtotal,
                ''tax'', tax,
                ''discount'', discount,
                ''amount_paid'', amount_paid,
                ''remaining_amount'', remaining_amount,
                ''consider_remaining_as_partial'', consider_remaining_as_partial,
                ''notes'', notes,
                ''created_at'', created_at,
                ''updated_at'', updated_at,
                ''completed_at'', completed_at,
                ''customer'', customer,
                ''employee'', employee,
                ''items_count'', items_count,
                ''total_qty'', total_qty,
                ''total_returned_amount'', total_returned_amount,
                ''has_returns'', has_returns,
                ''is_fully_returned'', is_fully_returned,
                ''effective_status'', effective_status,
                ''effective_total'', effective_total
            )
        )
        FROM enriched_orders'
    USING p_org_id, p_page_size, v_offset INTO v_orders_data;
    
    v_checkpoint_time := NOW();
    v_debug_timings := jsonb_set(v_debug_timings, '{orders_ms}', 
        to_jsonb(EXTRACT(epoch FROM (v_checkpoint_time - v_start_time - 
            (v_debug_timings->>'setup_ms')::TEXT::INTERVAL - 
            (v_debug_timings->>'counts_ms')::TEXT::INTERVAL)) * 1000));
    
    -- ✅ 7. جلب الإحصائيات
    IF (p_include->>'stats')::BOOLEAN THEN
        WITH stats_calculation AS (
            SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM(o.total), 0) as total_revenue,
                COUNT(*) FILTER (WHERE o.status = 'completed') as completed_orders,
                COUNT(*) FILTER (WHERE o.status = 'pending') as pending_orders,
                COUNT(*) FILTER (WHERE o.payment_status = 'pending') as pending_payment_orders,
                COUNT(*) FILTER (WHERE o.status = 'cancelled') as cancelled_orders,
                COUNT(*) FILTER (WHERE o.payment_method = 'cash') as cash_orders,
                COUNT(*) FILTER (WHERE o.payment_method IN ('card', 'credit_card', 'debit_card')) as card_orders,
                COALESCE(AVG(o.total), 0) as avg_order_value,
                COUNT(*) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE) as today_orders,
                COALESCE(SUM(o.total) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE), 0) as today_revenue,
                
                COALESCE(SUM(returns_stats.total_returned_amount), 0) as total_returned_amount,
                COUNT(*) FILTER (WHERE returns_stats.has_returns) as orders_with_returns,
                COUNT(*) FILTER (WHERE returns_stats.is_fully_returned) as fully_returned_orders
                
            FROM orders o
            LEFT JOIN (
                SELECT 
                    r.original_order_id,
                    SUM(CASE WHEN r.status = 'approved' THEN r.refund_amount ELSE 0 END) as total_returned_amount,
                    COUNT(*) > 0 as has_returns,
                    SUM(CASE WHEN r.status = 'approved' THEN r.refund_amount ELSE 0 END) >= 
                        (SELECT total FROM orders WHERE id = r.original_order_id) as is_fully_returned
                FROM returns r
                GROUP BY r.original_order_id
            ) returns_stats ON o.id = returns_stats.original_order_id
            
            WHERE o.organization_id = p_org_id
            AND o.is_online = false
        )
        SELECT jsonb_build_object(
            'total_orders', total_orders,
            'total_revenue', total_revenue,
            'completed_orders', completed_orders,
            'pending_orders', pending_orders,
            'pending_payment_orders', pending_payment_orders,
            'cancelled_orders', cancelled_orders,
            'cash_orders', cash_orders,
            'card_orders', card_orders,
            'avg_order_value', avg_order_value,
            'today_orders', today_orders,
            'today_revenue', today_revenue,
            'total_returned_amount', total_returned_amount,
            'orders_with_returns', orders_with_returns,
            'fully_returned_orders', fully_returned_orders,
            'effective_revenue', total_revenue - total_returned_amount,
            'return_rate', CASE WHEN total_revenue > 0 THEN (total_returned_amount / total_revenue) * 100 ELSE 0 END
        ) INTO v_stats_data
        FROM stats_calculation;
    END IF;
    
    -- ✅ 8. جلب قائمة الموظفين
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email,
            'role', u.role
        ) ORDER BY u.name
    ) INTO v_employees_data
    FROM users u
    WHERE u.organization_id = p_org_id 
    AND u.is_active = true;
    
    -- ✅ 9. جلب الإعدادات
    IF (p_include->>'settings')::BOOLEAN THEN
        SELECT jsonb_build_object(
            'pos_settings', (
                SELECT row_to_json(ps.*)
                FROM pos_settings ps
                WHERE ps.organization_id = p_org_id
                LIMIT 1
            ),
            'organization_settings', (
                SELECT row_to_json(os.*)
                FROM organization_settings os
                WHERE os.organization_id = p_org_id
                LIMIT 1
            )
        ) INTO v_settings_data;
    END IF;
    
    -- ✅ 10. جلب معلومات الاشتراك
    IF (p_include->>'subscription')::BOOLEAN THEN
        SELECT jsonb_build_object(
            'subscription_status', (
                SELECT jsonb_build_object(
                    'id', os.id,
                    'plan_id', os.plan_id,
                    'status', os.status,
                    'start_date', os.start_date,
                    'end_date', os.end_date,
                    'trial_ends_at', os.trial_ends_at
                )
                FROM organization_subscriptions os
                WHERE os.organization_id = p_org_id
                AND os.status = 'active'
                ORDER BY os.created_at DESC
                LIMIT 1
            )
        ) INTO v_subscription_data;
    END IF;
    
    v_debug_timings := jsonb_set(v_debug_timings, '{total_ms}', 
        to_jsonb(EXTRACT(epoch FROM (NOW() - v_start_time)) * 1000));
    
    -- ✅ 11. بناء النتيجة النهائية
    v_result := jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'orders', COALESCE(v_orders_data, '[]'::JSONB),
            'pagination', jsonb_build_object(
                'current_page', p_page,
                'page_size', p_page_size,
                'total_count', v_total_count,
                'filtered_count', v_filtered_count,
                'total_pages', CEIL(v_filtered_count::DECIMAL / p_page_size),
                'has_next_page', (p_page * p_page_size) < v_filtered_count,
                'has_prev_page', p_page > 1
            ),
            'employees', COALESCE(v_employees_data, '[]'::JSONB),
            'stats', COALESCE(v_stats_data, '{}'::JSONB),
            'settings', COALESCE(v_settings_data, '{}'::JSONB),
            'subscription', COALESCE(v_subscription_data, '{}'::JSONB)
        ),
        'meta', jsonb_build_object(
            'organization_id', p_org_id,
            'user_id', p_user_id,
            'filters_applied', p_filters,
            'sort_applied', p_sort,
            'timestamp', NOW(),
            'version', '1.1'
        ),
        'debug', jsonb_build_object(
            'timings_ms', v_debug_timings,
            'query_performance', CASE 
                WHEN (v_debug_timings->>'total_ms')::NUMERIC < 150 THEN 'excellent'
                WHEN (v_debug_timings->>'total_ms')::NUMERIC < 500 THEN 'good'
                WHEN (v_debug_timings->>'total_ms')::NUMERIC < 1000 THEN 'acceptable'
                ELSE 'needs_optimization'
            END
        )
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطأ في جلب بيانات صفحة طلبيات نقطة البيع: ' || SQLERRM,
        'error_code', SQLSTATE,
        'debug', jsonb_build_object(
            'organization_id', p_org_id,
            'user_id', p_user_id,
            'execution_time_ms', EXTRACT(epoch FROM (NOW() - v_start_time)) * 1000
        )
    );
END;
$$;

-- ✅ منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_pos_orders_page_data_fixed TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_orders_page_data_fixed TO service_role;

COMMENT ON FUNCTION get_pos_orders_page_data_fixed IS 'دالة موحدة محسنة لجلب بيانات صفحة طلبيات نقطة البيع مع دعم حقول created_by_staff_id و created_by_staff_name';
