-- إصلاح عرض أسماء البلديات في صفحة الطلبيات
-- تحديث دالة get_advanced_online_orders لتعرض أسماء البلديات بدلاً من الأرقام

-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS get_advanced_online_orders(UUID, INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT);

-- إنشاء الدالة المحدثة
CREATE OR REPLACE FUNCTION get_advanced_online_orders(
    p_organization_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_status TEXT DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_call_confirmation_status_id INTEGER DEFAULT NULL,
    p_shipping_provider TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'created_at',
    p_sort_order TEXT DEFAULT 'desc'
) RETURNS TABLE (
    -- معلومات الطلب الأساسية
    order_id UUID,
    customer_order_number INTEGER,
    status TEXT,
    payment_method TEXT,
    payment_status TEXT,
    subtotal NUMERIC,
    tax NUMERIC,
    discount NUMERIC,
    total NUMERIC,
    shipping_cost NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    
    -- معلومات العميل (من form_data أو customers table)
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    customer_id UUID,
    
    -- معلومات العنوان والتوصيل
    shipping_address JSONB,
    shipping_method TEXT,
    shipping_option TEXT,
    shipping_provider TEXT,
    
    -- معلومات تأكيد المكالمة
    call_confirmation_status_id INTEGER,
    call_confirmation_status_name TEXT,
    call_confirmation_status_color TEXT,
    call_confirmation_status_icon TEXT,
    call_confirmation_notes TEXT,
    call_confirmation_updated_at TIMESTAMPTZ,
    
    -- معلومات التتبع
    tracking_info JSONB,
    
    -- عناصر الطلب
    order_items JSONB,
    items_count INTEGER,
    
    -- بيانات إضافية
    form_data JSONB,
    metadata JSONB,
    created_from VARCHAR(50),
    
    -- معلومات مركز الاتصال
    assigned_agent_id UUID,
    agent_priority INTEGER,
    call_attempts INTEGER,
    last_call_attempt TIMESTAMPTZ,
    next_call_scheduled TIMESTAMPTZ,
    call_center_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH order_items_agg AS (
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
            ) as items_json,
            SUM(oi.quantity) as total_items_count
        FROM online_order_items oi
        GROUP BY oi.order_id
    ),
    filtered_orders AS (
        SELECT o.*
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
            (o.form_data->>'phone') ILIKE '%' || p_search_term || '%' OR
            EXISTS (
                SELECT 1 FROM customers c 
                WHERE c.id = o.customer_id 
                AND (c.name ILIKE '%' || p_search_term || '%' OR c.phone ILIKE '%' || p_search_term || '%')
            ) OR
            EXISTS (
                SELECT 1 FROM guest_customers gc 
                WHERE gc.id = o.customer_id 
                AND (gc.name ILIKE '%' || p_search_term || '%' OR gc.phone ILIKE '%' || p_search_term || '%')
            )
        )
    )
    SELECT 
        -- معلومات الطلب الأساسية
        o.id,
        o.customer_order_number,
        o.status,
        o.payment_method,
        o.payment_status,
        o.subtotal,
        o.tax,
        o.discount,
        o.total,
        o.shipping_cost,
        o.notes,
        o.created_at,
        o.updated_at,
        
        -- معلومات العميل
        COALESCE(
            NULLIF(o.form_data->>'fullName', ''),
            c.name,
            gc.name,
            'عميل غير معروف'
        )::TEXT as customer_name,
        COALESCE(
            NULLIF(o.form_data->>'phone', ''),
            c.phone,
            gc.phone
        )::TEXT as customer_phone,
        c.email as customer_email,
        o.customer_id,
        
        -- معلومات العنوان والتوصيل
        CASE 
            WHEN a.id IS NOT NULL THEN 
                jsonb_build_object(
                    'id', a.id,
                    'name', a.name,
                    'street_address', a.street_address,
                    'city', a.city,
                    'state', a.state,
                    'municipality', a.municipality,
                    'phone', a.phone
                )
            ELSE 
                jsonb_build_object(
                    'province', COALESCE(wprov.name, o.form_data->>'province'),
                    'municipality', COALESCE(wmun.name, o.form_data->>'municipality'),
                    'address', o.form_data->>'address',
                    'delivery_option', o.form_data->>'deliveryOption'
                )
        END as shipping_address,
        o.shipping_method,
        o.shipping_option,
        o.shipping_provider,
        
        -- معلومات تأكيد المكالمة
        o.call_confirmation_status_id,
        ccs.name as call_confirmation_status_name,
        ccs.color as call_confirmation_status_color,
        ccs.icon as call_confirmation_status_icon,
        o.call_confirmation_notes,
        o.call_confirmation_updated_at,
        
        -- معلومات التتبع
        jsonb_build_object(
            'yalidine_tracking_id', o.yalidine_tracking_id,
            'zrexpress_tracking_id', o.zrexpress_tracking_id,
            'ecotrack_tracking_id', o.ecotrack_tracking_id,
            'maystro_tracking_id', o.maystro_tracking_id,
            'tracking_data', o.tracking_data,
            'last_status_update', o.last_status_update,
            'delivered_at', o.delivered_at,
            'current_location', o.current_location,
            'estimated_delivery_date', o.estimated_delivery_date
        ) as tracking_info,
        
        -- عناصر الطلب
        COALESCE(oia.items_json, '[]'::jsonb) as order_items,
        COALESCE(oia.total_items_count, 0)::INTEGER as items_count,
        
        -- بيانات إضافية
        o.form_data,
        o.metadata,
        o.created_from,
        
        -- معلومات مركز الاتصال
        o.assigned_agent_id,
        o.agent_priority,
        o.call_attempts,
        o.last_call_attempt,
        o.next_call_scheduled,
        o.call_center_notes
        
    FROM filtered_orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN guest_customers gc ON gc.id = o.customer_id
    LEFT JOIN addresses a ON a.id = o.shipping_address_id
    LEFT JOIN call_confirmation_statuses ccs ON ccs.id = o.call_confirmation_status_id
    LEFT JOIN order_items_agg oia ON oia.order_id = o.id
    LEFT JOIN yalidine_provinces_global wprov ON wprov.id = (o.form_data->>'province')::INTEGER
    LEFT JOIN yalidine_municipalities_global wmun ON wmun.id = (o.form_data->>'municipality')::INTEGER
    ORDER BY 
        CASE 
            WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN o.created_at
        END DESC,
        CASE 
            WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN o.created_at
        END ASC,
        CASE 
            WHEN p_sort_by = 'total' AND p_sort_order = 'desc' THEN o.total
        END DESC,
        CASE 
            WHEN p_sort_by = 'total' AND p_sort_order = 'asc' THEN o.total
        END ASC,
        CASE 
            WHEN p_sort_by = 'customer_order_number' AND p_sort_order = 'desc' THEN o.customer_order_number
        END DESC,
        CASE 
            WHEN p_sort_by = 'customer_order_number' AND p_sort_order = 'asc' THEN o.customer_order_number
        END ASC,
        o.created_at DESC -- fallback
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- منح الصلاحيات المناسبة
GRANT EXECUTE ON FUNCTION get_advanced_online_orders(UUID, INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_advanced_online_orders(UUID, INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT) TO anon;

-- إشعار بالنجاح
SELECT 'تم تحديث دالة get_advanced_online_orders بنجاح - ستعرض البلديات بأسمائها الفرنسية الآن' as status; 