-- ==============================================
-- دوال محسنة لجلب بيانات الطلبيات بكفاءة عالية
-- ==============================================

-- 1. دالة جلب الطلبيات مع جميع البيانات المرتبطة في استدعاء واحد
CREATE OR REPLACE FUNCTION get_orders_with_details(
    p_organization_id UUID,
    p_limit INTEGER DEFAULT 30,
    p_offset INTEGER DEFAULT 0,
    p_status TEXT DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
    -- بيانات الطلب الأساسية
    order_id UUID,
    customer_id UUID,
    subtotal NUMERIC,
    tax NUMERIC,
    discount NUMERIC,
    total NUMERIC,
    status TEXT,
    payment_method TEXT,
    payment_status TEXT,
    shipping_address_id UUID,
    shipping_method TEXT,
    shipping_cost NUMERIC,
    shipping_option TEXT,
    notes TEXT,
    employee_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    organization_id UUID,
    slug TEXT,
    customer_order_number INTEGER,
    created_from VARCHAR,
    call_confirmation_status_id INTEGER,
    call_confirmation_notes TEXT,
    call_confirmation_updated_at TIMESTAMPTZ,
    call_confirmation_updated_by UUID,
    form_data JSONB,
    metadata JSONB,
    
    -- بيانات العميل
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    
    -- بيانات العنوان
    shipping_address JSONB,
    
    -- بيانات حالة تأكيد الإتصال
    call_confirmation_status JSONB,
    
    -- عناصر الطلب
    order_items JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH order_data AS (
        SELECT 
            o.id as order_id,
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
            o.organization_id,
            o.slug,
            o.customer_order_number,
            o.created_from,
            o.call_confirmation_status_id,
            o.call_confirmation_notes,
            o.call_confirmation_updated_at,
            o.call_confirmation_updated_by,
            o.form_data,
            o.metadata
        FROM online_orders o
        WHERE 
            o.organization_id = p_organization_id
            AND (p_status IS NULL OR o.status = p_status)
            AND (p_date_from IS NULL OR o.created_at >= p_date_from)
            AND (p_date_to IS NULL OR o.created_at <= p_date_to)
        ORDER BY o.created_at DESC
        LIMIT p_limit OFFSET p_offset
    ),
    customers_data AS (
        SELECT 
            c.id,
            c.name,
            c.email,
            c.phone
        FROM customers c
        WHERE c.id IN (SELECT DISTINCT od.customer_id FROM order_data od WHERE od.customer_id IS NOT NULL)
    ),
    addresses_data AS (
        SELECT 
            a.id,
            jsonb_build_object(
                'id', a.id,
                'name', a.name,
                'street_address', a.street_address,
                'city', a.city,
                'state', a.state,
                'country', a.country,
                'phone', a.phone,
                'municipality', a.municipality
            ) as address_json
        FROM addresses a
        WHERE a.id IN (SELECT DISTINCT od.shipping_address_id FROM order_data od WHERE od.shipping_address_id IS NOT NULL)
    ),
    call_statuses_data AS (
        SELECT 
            cs.id,
            jsonb_build_object(
                'id', cs.id,
                'name', cs.name,
                'color', cs.color,
                'icon', cs.icon,
                'is_default', cs.is_default
            ) as status_json
        FROM call_confirmation_statuses cs
        WHERE cs.id IN (SELECT DISTINCT od.call_confirmation_status_id FROM order_data od WHERE od.call_confirmation_status_id IS NOT NULL)
    ),
    order_items_data AS (
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
                    'size_name', oi.size_name
                )
            ) as items_json
        FROM online_order_items oi
        WHERE oi.order_id IN (SELECT od.order_id FROM order_data od)
        GROUP BY oi.order_id
    )
    SELECT 
        od.order_id,
        od.customer_id,
        od.subtotal,
        od.tax,
        od.discount,
        od.total,
        od.status,
        od.payment_method,
        od.payment_status,
        od.shipping_address_id,
        od.shipping_method,
        od.shipping_cost,
        od.shipping_option,
        od.notes,
        od.employee_id,
        od.created_at,
        od.updated_at,
        od.organization_id,
        od.slug,
        od.customer_order_number,
        od.created_from,
        od.call_confirmation_status_id,
        od.call_confirmation_notes,
        od.call_confirmation_updated_at,
        od.call_confirmation_updated_by,
        od.form_data,
        od.metadata,
        
        -- بيانات العميل
        cd.name as customer_name,
        cd.email as customer_email,
        cd.phone as customer_phone,
        
        -- بيانات العنوان
        ad.address_json as shipping_address,
        
        -- حالة تأكيد الإتصال
        csd.status_json as call_confirmation_status,
        
        -- عناصر الطلب
        COALESCE(oid.items_json, '[]'::jsonb) as order_items
        
    FROM order_data od
    LEFT JOIN customers_data cd ON od.customer_id = cd.id
    LEFT JOIN addresses_data ad ON od.shipping_address_id = ad.id
    LEFT JOIN call_statuses_data csd ON od.call_confirmation_status_id = csd.id
    LEFT JOIN order_items_data oid ON od.order_id = oid.order_id
    ORDER BY od.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. دالة جلب البيانات المشتركة (حالات تأكيد الإتصال، الولايات، البلديات)
CREATE OR REPLACE FUNCTION get_orders_shared_data(
    p_organization_id UUID
) RETURNS TABLE (
    call_confirmation_statuses JSONB,
    provinces JSONB,
    municipalities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (
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
        ) as call_confirmation_statuses,
        
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', yp.id,
                    'name', yp.name
                ) ORDER BY yp.name
            )
            FROM yalidine_provinces_global yp
        ) as provinces,
        
        (
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
        ) as municipalities;
END;
$$ LANGUAGE plpgsql;

-- 3. دالة تحديث حالة تأكيد الإتصال محسنة
CREATE OR REPLACE FUNCTION update_order_call_confirmation_optimized(
    p_order_id UUID,
    p_status_id INTEGER,
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_organization_id UUID
) RETURNS TABLE (
    success BOOLEAN,
    updated_order JSONB,
    status_info JSONB
) AS $$
DECLARE
    v_status_info JSONB;
    v_updated_order JSONB;
BEGIN
    -- التحقق من وجود الحالة والصلاحية
    SELECT jsonb_build_object(
        'id', cs.id,
        'name', cs.name,
        'color', cs.color,
        'icon', cs.icon,
        'is_default', cs.is_default
    ) INTO v_status_info
    FROM call_confirmation_statuses cs
    WHERE cs.id = p_status_id AND cs.organization_id = p_organization_id;
    
    IF v_status_info IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::jsonb, NULL::jsonb;
        RETURN;
    END IF;
    
    -- تحديث الطلب
    UPDATE online_orders SET
        call_confirmation_status_id = p_status_id,
        call_confirmation_notes = COALESCE(p_notes, call_confirmation_notes),
        call_confirmation_updated_at = NOW(),
        call_confirmation_updated_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_order_id AND organization_id = p_organization_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::jsonb, NULL::jsonb;
        RETURN;
    END IF;
    
    -- جلب بيانات الطلب المحدث
    SELECT jsonb_build_object(
        'id', o.id,
        'call_confirmation_status_id', o.call_confirmation_status_id,
        'call_confirmation_notes', o.call_confirmation_notes,
        'call_confirmation_updated_at', o.call_confirmation_updated_at,
        'call_confirmation_updated_by', o.call_confirmation_updated_by
    ) INTO v_updated_order
    FROM online_orders o
    WHERE o.id = p_order_id;
    
    RETURN QUERY SELECT TRUE, v_updated_order, v_status_info;
END;
$$ LANGUAGE plpgsql;

-- 4. دالة جلب إحصائيات الطلبات محسنة
CREATE OR REPLACE FUNCTION get_orders_stats_optimized(
    p_organization_id UUID
) RETURNS TABLE (
    order_counts JSONB,
    order_stats JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (
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
            SELECT jsonb_object_agg(status, count) FROM all_statuses
        ) as order_counts,
        
        (
            SELECT jsonb_build_object(
                'totalSales', COALESCE(SUM(o.total), 0),
                'avgOrderValue', COALESCE(AVG(o.total), 0),
                'pendingAmount', COALESCE(SUM(CASE WHEN o.status = 'pending' THEN o.total ELSE 0 END), 0),
                'salesTrend', 0
            )
            FROM online_orders o
            WHERE o.organization_id = p_organization_id
        ) as order_stats;
END;
$$ LANGUAGE plpgsql;

-- 5. إنشاء فهارس محسنة للأداء
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_online_orders_org_status_created 
ON online_orders (organization_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_online_orders_org_customer_created 
ON online_orders (organization_id, customer_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_confirmation_statuses_org_default 
ON call_confirmation_statuses (organization_id, is_default DESC, name);

-- 6. إنشاء view محسن للطلبيات
CREATE OR REPLACE VIEW orders_with_details_view AS
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
    o.organization_id,
    o.slug,
    o.customer_order_number,
    o.created_from,
    o.call_confirmation_status_id,
    o.call_confirmation_notes,
    o.call_confirmation_updated_at,
    o.call_confirmation_updated_by,
    o.form_data,
    o.metadata,
    
    -- بيانات العميل
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    
    -- بيانات حالة تأكيد الإتصال
    ccs.name as call_status_name,
    ccs.color as call_status_color,
    ccs.icon as call_status_icon
    
FROM online_orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN call_confirmation_statuses ccs ON o.call_confirmation_status_id = ccs.id;

-- تحديث إحصائيات الجداول للحصول على أداء أفضل
ANALYZE online_orders;
ANALYZE call_confirmation_statuses;
ANALYZE customers;
ANALYZE addresses; 