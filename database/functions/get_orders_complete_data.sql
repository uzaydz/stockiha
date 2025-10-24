-- دالة محسنة لجلب جميع بيانات الطلبات في استدعاء واحد
-- تقلل الضغط على قاعدة البيانات من ~15 استدعاء إلى استدعاء واحد
CREATE OR REPLACE FUNCTION get_orders_complete_data(
    p_organization_id UUID,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20,
    p_status TEXT DEFAULT NULL,
    p_call_confirmation_status_id INTEGER DEFAULT NULL,
    p_shipping_provider TEXT DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL,
    p_date_from TIMESTAMP DEFAULT NULL,
    p_date_to TIMESTAMP DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'created_at',
    p_sort_order TEXT DEFAULT 'desc'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER;
    v_orders JSONB;
    v_metadata JSONB;
    v_counts JSONB;
    v_stats JSONB;
    v_shared_data JSONB;
    v_total_orders INTEGER;
    v_start_time TIMESTAMP := NOW();
    v_performance_log JSONB := '[]'::JSONB;
    v_step_start TIMESTAMP;
BEGIN
    -- حساب الصفحة
    v_offset := (p_page - 1) * p_page_size;
    
    -- خطوة 1: جلب الطلبات مع جميع البيانات المرتبطة
    v_step_start := NOW();
    
    -- Debug: طباعة معاملات الترتيب
    RAISE NOTICE 'DEBUG: Sorting parameters - sort_by: %, sort_order: %', p_sort_by, p_sort_order;
    
    WITH filtered_orders AS (
        SELECT 
            o.id,
            o.customer_id,
            o.subtotal,
            o.tax,
            o.discount,
            o.total,
            o.status,
            o.payment_method,
            o.payment_status,
            o.shipping_address_id,
            o.shipping_method,
            o.shipping_cost,
            o.shipping_option,
            o.notes,
            o.employee_id,
            o.created_at,
            o.updated_at,
            o.slug,
            o.customer_order_number,
            o.global_order_number,
            o.created_from,
            o.call_confirmation_status_id,
            o.call_confirmation_notes,
            o.call_confirmation_updated_at,
            o.call_confirmation_updated_by,
            o.form_data,
            o.metadata,
            o.yalidine_tracking_id,
            o.zrexpress_tracking_id,
            o.ecotrack_tracking_id,
            o.maystro_tracking_id,
            o.shipping_provider,
            o.tracking_data,
            o.last_status_update,
            o.delivered_at,
            o.current_location,
            o.estimated_delivery_date
        FROM online_orders o
        WHERE o.organization_id = p_organization_id
        AND (p_status IS NULL OR o.status = p_status)
        AND (p_call_confirmation_status_id IS NULL OR o.call_confirmation_status_id = p_call_confirmation_status_id)
        AND (p_shipping_provider IS NULL OR o.shipping_provider = p_shipping_provider)
        AND (p_date_from IS NULL OR o.created_at >= p_date_from)
        AND (p_date_to IS NULL OR o.created_at <= p_date_to)
        AND (
            p_search_term IS NULL OR 
            o.customer_order_number::text ILIKE '%' || p_search_term || '%' OR
            o.notes ILIKE '%' || p_search_term || '%' OR
            (o.form_data->>'fullName') ILIKE '%' || p_search_term || '%' OR
            (o.form_data->>'phone') ILIKE '%' || p_search_term || '%'
        )
        ORDER BY 
            CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN o.created_at END DESC,
            CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN o.created_at END ASC,
            CASE WHEN p_sort_by = 'total' AND p_sort_order = 'desc' THEN o.total END DESC,
            CASE WHEN p_sort_by = 'total' AND p_sort_order = 'asc' THEN o.total END ASC,
            CASE WHEN p_sort_by = 'customer_order_number' AND p_sort_order = 'desc' THEN o.customer_order_number END DESC,
            CASE WHEN p_sort_by = 'customer_order_number' AND p_sort_order = 'asc' THEN o.customer_order_number END ASC,
            CASE WHEN p_sort_by = 'global_order_number' AND p_sort_order = 'desc' THEN o.global_order_number END DESC,
            CASE WHEN p_sort_by = 'global_order_number' AND p_sort_order = 'asc' THEN o.global_order_number END ASC,
            o.created_at DESC, o.customer_order_number DESC
    ),
    paginated_orders AS (
        SELECT * FROM filtered_orders
        LIMIT p_page_size OFFSET v_offset
    ),
    order_with_relations AS (
        SELECT 
            o.*,
            -- بيانات العملاء (دمج customers و guest_customers)
            COALESCE(
                jsonb_build_object(
                    'id', c.id,
                    'name', c.name,
                    'phone', c.phone,
                    'email', c.email,
                    'type', 'customer'
                ),
                jsonb_build_object(
                    'id', gc.id,
                    'name', gc.name,
                    'phone', gc.phone,
                    'email', NULL,
                    'type', 'guest'
                ),
                jsonb_build_object(
                    'name', o.form_data->>'fullName',
                    'phone', o.form_data->>'phone',
                    'type', 'form_data'
                )
            ) as customer_data,
            
            -- بيانات العناوين
            CASE 
                WHEN a.id IS NOT NULL THEN 
                    jsonb_build_object(
                        'id', a.id,
                        'name', a.name,
                        'street_address', a.street_address,
                        'city', a.city,
                        'state', a.state,
                        'municipality', COALESCE(amun.name, a.municipality),
                        'phone', a.phone,
                        'type', 'address'
                    )
                ELSE 
                    jsonb_build_object(
                        'province', COALESCE(wprov.name, o.form_data->>'province'),
                        'municipality', COALESCE(wmun.name, o.form_data->>'municipality'),
                        'address', o.form_data->>'address',
                        'delivery_option', o.form_data->>'deliveryOption',
                        'type', 'form_data'
                    )
            END as shipping_address_data,
            
            -- حالة تأكيد المكالمة
            CASE 
                WHEN ccs.id IS NOT NULL THEN
                    jsonb_build_object(
                        'id', ccs.id,
                        'name', ccs.name,
                        'color', ccs.color,
                        'icon', ccs.icon,
                        'is_default', ccs.is_default
                    )
                ELSE NULL
            END as call_confirmation_status_data,
            
            -- عناصر الطلب
            COALESCE(oi.items_data, '[]'::jsonb) as order_items,
            
            -- معلومات الحظر للهاتف
            CASE 
                WHEN bc.id IS NOT NULL THEN
                    jsonb_build_object(
                        'isBlocked', true,
                        'reason', bc.reason,
                        'blockedId', bc.id,
                        'name', bc.name
                    )
                ELSE
                    jsonb_build_object(
                        'isBlocked', false,
                        'reason', null,
                        'blockedId', null,
                        'name', null
                    )
            END as phone_blocked_info
            
        FROM paginated_orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN guest_customers gc ON gc.id = o.customer_id
        LEFT JOIN addresses a ON a.id = o.shipping_address_id
        LEFT JOIN call_confirmation_statuses ccs ON ccs.id = o.call_confirmation_status_id
        LEFT JOIN yalidine_provinces_global wprov ON wprov.id = (o.form_data->>'province')::INTEGER
        LEFT JOIN yalidine_municipalities_global wmun ON wmun.id = (o.form_data->>'municipality')::INTEGER
        LEFT JOIN yalidine_municipalities_global amun ON amun.id = a.municipality::INTEGER
        LEFT JOIN blocked_customers bc ON bc.organization_id = p_organization_id 
            AND bc.phone_normalized = normalize_phone(COALESCE(c.phone, gc.phone, o.form_data->>'phone'))
        LEFT JOIN (
            SELECT 
                oi.order_id,
                jsonb_agg(
                    jsonb_build_object(
                        'id', oi.id,
                        'product_id', oi.product_id,
                        'product_name', oi.product_name,
                        'quantity', oi.quantity,
                        'unit_price', oi.unit_price,
                        'total_price', oi.total_price,
                        'color_id', oi.color_id,
                        'color_name', oi.color_name,
                        'size_id', oi.size_id,
                        'size_name', oi.size_name,
                        'selected_price', oi.selected_price
                    )
                ) as items_data
            FROM online_order_items oi
            WHERE oi.order_id IN (SELECT id FROM paginated_orders)
            GROUP BY oi.order_id
        ) oi ON oi.order_id = o.id
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', o.id,
            'customer_id', o.customer_id,
            'subtotal', o.subtotal,
            'tax', o.tax,
            'discount', o.discount,
            'total', o.total,
            'status', o.status,
            'payment_method', o.payment_method,
            'payment_status', o.payment_status,
            'shipping_method', o.shipping_method,
            'shipping_cost', o.shipping_cost,
            'shipping_option', o.shipping_option,
            'notes', o.notes,
            'employee_id', o.employee_id,
            'created_at', o.created_at,
            'updated_at', o.updated_at,
            'slug', o.slug,
            'customer_order_number', o.customer_order_number,
            'created_from', o.created_from,
            'call_confirmation_status_id', o.call_confirmation_status_id,
            'call_confirmation_notes', o.call_confirmation_notes,
            'call_confirmation_updated_at', o.call_confirmation_updated_at,
            'call_confirmation_updated_by', o.call_confirmation_updated_by,
            'form_data', o.form_data,
            'metadata', o.metadata,
            'yalidine_tracking_id', o.yalidine_tracking_id,
            'zrexpress_tracking_id', o.zrexpress_tracking_id,
            'ecotrack_tracking_id', o.ecotrack_tracking_id,
            'maystro_tracking_id', o.maystro_tracking_id,
            'shipping_provider', o.shipping_provider,
            'tracking_data', o.tracking_data,
            'last_status_update', o.last_status_update,
            'delivered_at', o.delivered_at,
            'current_location', o.current_location,
            'estimated_delivery_date', o.estimated_delivery_date,
            'customer', o.customer_data,
            'shipping_address', o.shipping_address_data,
            'call_confirmation_status', o.call_confirmation_status_data,
            'order_items', o.order_items,
            'phone_blocked_info', o.phone_blocked_info
        )
    ) INTO v_orders
    FROM order_with_relations o;
    
    v_performance_log := v_performance_log || jsonb_build_object(
        'step', 'fetch_orders',
        'duration_ms', EXTRACT(epoch FROM (NOW() - v_step_start)) * 1000
    );
    
    -- خطوة 2: حساب إجمالي عدد الطلبات للصفحات
    v_step_start := NOW();
    
    SELECT COUNT(*) INTO v_total_orders
    FROM online_orders o
    WHERE o.organization_id = p_organization_id
    AND (p_status IS NULL OR o.status = p_status)
    AND (p_call_confirmation_status_id IS NULL OR o.call_confirmation_status_id = p_call_confirmation_status_id)
    AND (p_shipping_provider IS NULL OR o.shipping_provider = p_shipping_provider)
    AND (p_date_from IS NULL OR o.created_at >= p_date_from)
    AND (p_date_to IS NULL OR o.created_at <= p_date_to)
    AND (
        p_search_term IS NULL OR 
        o.customer_order_number::text ILIKE '%' || p_search_term || '%' OR
        o.notes ILIKE '%' || p_search_term || '%' OR
        (o.form_data->>'fullName') ILIKE '%' || p_search_term || '%' OR
        (o.form_data->>'phone') ILIKE '%' || p_search_term || '%'
    );
    
    v_performance_log := v_performance_log || jsonb_build_object(
        'step', 'count_orders',
        'duration_ms', EXTRACT(epoch FROM (NOW() - v_step_start)) * 1000
    );
    
    -- خطوة 3: إحصائيات الطلبات حسب الحالة
    v_step_start := NOW();
    
    WITH status_counts AS (
        SELECT 
            o.status,
            COUNT(*) as count
        FROM online_orders o
        WHERE o.organization_id = p_organization_id
        GROUP BY o.status
    ),
    all_statuses AS (
        SELECT 'all' as status, SUM(count) as count FROM status_counts
        UNION ALL
        SELECT status, count FROM status_counts
    )
    SELECT jsonb_object_agg(status, count) INTO v_counts FROM all_statuses;
    
    v_performance_log := v_performance_log || jsonb_build_object(
        'step', 'status_counts',
        'duration_ms', EXTRACT(epoch FROM (NOW() - v_step_start)) * 1000
    );
    
    -- خطوة 4: إحصائيات مالية
    v_step_start := NOW();
    
    WITH financial_stats AS (
        SELECT 
            COALESCE(SUM(o.total), 0) as total_sales,
            COALESCE(AVG(o.total), 0) as avg_order_value,
            COALESCE(SUM(CASE WHEN o.status = 'pending' THEN o.total ELSE 0 END), 0) as pending_amount,
            COUNT(*) as total_orders_count
        FROM online_orders o
        WHERE o.organization_id = p_organization_id
    )
    SELECT jsonb_build_object(
        'totalSales', fs.total_sales,
        'avgOrderValue', fs.avg_order_value,
        'pendingAmount', fs.pending_amount,
        'salesTrend', 0, -- يمكن تحسينه لاحقاً
        'totalOrdersCount', fs.total_orders_count
    ) INTO v_stats
    FROM financial_stats fs;
    
    v_performance_log := v_performance_log || jsonb_build_object(
        'step', 'financial_stats',
        'duration_ms', EXTRACT(epoch FROM (NOW() - v_step_start)) * 1000
    );
    
    -- خطوة 5: البيانات المشتركة (تحميل مرة واحدة)
    v_step_start := NOW();
    
    SELECT jsonb_build_object(
        'callConfirmationStatuses', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', cs.id,
                    'name', cs.name,
                    'color', cs.color,
                    'icon', cs.icon,
                    'is_default', cs.is_default
                ) ORDER BY cs.is_default DESC, cs.name
            )
            FROM call_confirmation_statuses cs
            WHERE cs.organization_id = p_organization_id
        ),
        'provinces', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', yp.id,
                    'name', yp.name,
                    'name_ar', yp.name_ar
                ) ORDER BY yp.name
            )
            FROM yalidine_provinces_global yp
        ),
        'municipalities', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ym.id,
                    'name', ym.name,
                    'wilaya_id', ym.wilaya_id,
                    'wilaya_name', ym.wilaya_name,
                    'name_ar', ym.name_ar,
                    'wilaya_name_ar', ym.wilaya_name_ar
                ) ORDER BY ym.name
            )
            FROM yalidine_municipalities_global ym
        ),
        'shippingProviders', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', sdv.id,
                    'provider_id', sdv.provider_id,
                    'provider_code', sdv.provider_code,
                    'provider_name', sdv.provider_name,
                    'is_enabled', sdv.is_enabled
                )
            )
            FROM shipping_data_view sdv
            WHERE sdv.organization_id = p_organization_id
            AND sdv.is_enabled = true
            AND sdv.provider_id IS NOT NULL
        ),
        'organizationSettings', (
            SELECT jsonb_build_object(
                'id', os.id,
                'theme_primary_color', os.theme_primary_color,
                'theme_secondary_color', os.theme_secondary_color,
                'site_name', os.site_name,
                'logo_url', os.logo_url,
                'default_language', os.default_language
            )
            FROM organization_settings os
            WHERE os.organization_id = p_organization_id
            LIMIT 1
        )
    ) INTO v_shared_data;
    
    v_performance_log := v_performance_log || jsonb_build_object(
        'step', 'shared_data',
        'duration_ms', EXTRACT(epoch FROM (NOW() - v_step_start)) * 1000
    );
    
    -- إنشاء metadata للاستجابة
    SELECT jsonb_build_object(
        'pagination', jsonb_build_object(
            'page', p_page,
            'pageSize', p_page_size,
            'totalItems', v_total_orders,
            'totalPages', CEIL(v_total_orders::DECIMAL / p_page_size),
            'hasNextPage', (p_page * p_page_size) < v_total_orders,
            'hasPreviousPage', p_page > 1
        ),
        'filters', jsonb_build_object(
            'status', p_status,
            'callConfirmationStatusId', p_call_confirmation_status_id,
            'shippingProvider', p_shipping_provider,
            'searchTerm', p_search_term,
            'dateFrom', p_date_from,
            'dateTo', p_date_to
        ),
        'sorting', jsonb_build_object(
            'sortBy', p_sort_by,
            'sortOrder', p_sort_order
        ),
        'performance', jsonb_build_object(
            'totalDurationMs', EXTRACT(epoch FROM (NOW() - v_start_time)) * 1000,
            'steps', v_performance_log,
            'optimizationVersion', '1.0',
            'singleQuery', true
        ),
        'dataFreshness', jsonb_build_object(
            'fetchedAt', NOW(),
            'cacheStatus', 'fresh'
        )
    ) INTO v_metadata;
    
    -- إرجاع الاستجابة الكاملة
    RETURN jsonb_build_object(
        'success', true,
        'orders', COALESCE(v_orders, '[]'::jsonb),
        'counts', COALESCE(v_counts, '{}'::jsonb),
        'stats', COALESCE(v_stats, '{}'::jsonb),
        'sharedData', COALESCE(v_shared_data, '{}'::jsonb),
        'metadata', v_metadata
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'errorCode', SQLSTATE,
        'metadata', jsonb_build_object(
            'performanceLog', v_performance_log,
            'totalDurationMs', EXTRACT(epoch FROM (NOW() - v_start_time)) * 1000
        )
    );
END;
$$; 