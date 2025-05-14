-- إجراء مخزن لاستخراج عدد الطلبات حسب الحالة
CREATE OR REPLACE FUNCTION public.get_orders_count_by_status(org_id UUID)
RETURNS TABLE (
    status TEXT,
    count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        o.status, 
        COUNT(o.id) AS count
    FROM 
        online_orders o
    WHERE 
        o.organization_id = org_id
    GROUP BY 
        o.status;
END;
$$;

-- إجراء مخزن لاستخراج إحصاءات الطلبات
CREATE OR REPLACE FUNCTION public.get_order_stats(org_id UUID)
RETURNS TABLE (
    total_sales NUMERIC,
    avg_order_value NUMERIC,
    sales_trend INTEGER,
    pending_amount NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
    current_month_start DATE := date_trunc('month', current_date);
    current_month_end DATE := date_trunc('month', current_date) + interval '1 month' - interval '1 day';
    previous_month_start DATE := date_trunc('month', current_date) - interval '1 month';
    previous_month_end DATE := date_trunc('month', current_date) - interval '1 day';
    current_month_sales NUMERIC;
    previous_month_sales NUMERIC;
BEGIN
    -- حساب المبيعات الإجمالية
    SELECT COALESCE(SUM(total), 0) INTO total_sales
    FROM online_orders
    WHERE organization_id = org_id
    AND status != 'cancelled';
    
    -- حساب متوسط قيمة الطلب
    SELECT CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total) / COUNT(*), 0) ELSE 0 END INTO avg_order_value
    FROM online_orders
    WHERE organization_id = org_id
    AND status != 'cancelled';
    
    -- حساب مبيعات الشهر الحالي
    SELECT COALESCE(SUM(total), 0) INTO current_month_sales
    FROM online_orders
    WHERE organization_id = org_id
    AND status != 'cancelled'
    AND created_at BETWEEN current_month_start AND current_month_end;
    
    -- حساب مبيعات الشهر السابق
    SELECT COALESCE(SUM(total), 0) INTO previous_month_sales
    FROM online_orders
    WHERE organization_id = org_id
    AND status != 'cancelled'
    AND created_at BETWEEN previous_month_start AND previous_month_end;
    
    -- حساب اتجاه المبيعات (نسبة التغيير)
    IF previous_month_sales > 0 THEN
        sales_trend := ROUND(((current_month_sales - previous_month_sales) / previous_month_sales) * 100);
    ELSE
        sales_trend := 0;
    END IF;
    
    -- حساب قيمة الطلبات المعلقة
    SELECT COALESCE(SUM(total), 0) INTO pending_amount
    FROM online_orders
    WHERE organization_id = org_id
    AND status = 'pending';
    
    RETURN QUERY 
    SELECT 
        total_sales,
        avg_order_value,
        sales_trend,
        pending_amount;
END;
$$;

-- إجراء مخزن لتحديث حالة الطلب
CREATE OR REPLACE FUNCTION public.update_order_status(
    p_order_id UUID,
    p_status TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_organization_id UUID;
    v_previous_status TEXT;
BEGIN
    -- الحصول على المؤسسة ووالحالة السابقة
    SELECT organization_id, status 
    INTO v_organization_id, v_previous_status
    FROM online_orders 
    WHERE id = p_order_id;
    
    -- تحديث حالة الطلب
    UPDATE online_orders
    SET 
        status = p_status,
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- تسجيل نشاط الموظف
    INSERT INTO employee_activities (
        employee_id, 
        activity_type, 
        details, 
        created_at, 
        updated_at,
        organization_id
    )
    VALUES (
        p_user_id,
        'order_status_update',
        json_build_object(
            'order_id', p_order_id,
            'previous_status', v_previous_status,
            'new_status', p_status
        ),
        NOW(),
        NOW(),
        v_organization_id
    );
    
    RETURN FOUND;
END;
$$;

-- إجراء مخزن لتحديث حالة مجموعة من الطلبات دفعة واحدة
CREATE OR REPLACE FUNCTION public.bulk_update_order_status(
    p_order_ids UUID[],
    p_status TEXT,
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
    v_order_id UUID;
BEGIN
    -- تحديث كل طلب على حدة
    FOREACH v_order_id IN ARRAY p_order_ids LOOP
        IF public.update_order_status(v_order_id, p_status, p_user_id) THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- إجراء مخزن للبحث المتقدم في الطلبات
CREATE OR REPLACE FUNCTION public.search_orders(
    org_id UUID,
    p_status TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 30,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
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
    notes TEXT,
    employee_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    organization_id UUID,
    slug TEXT,
    customer_order_number INTEGER,
    created_from TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY 
    WITH customer_data AS (
        SELECT c.id, c.name, c.phone, c.email
        FROM customers c
        WHERE c.organization_id = org_id
        UNION ALL
        SELECT gc.id, gc.name, gc.phone, NULL AS email
        FROM guest_customers gc
        WHERE gc.organization_id = org_id
    )
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
        o.notes,
        o.employee_id,
        o.created_at,
        o.updated_at,
        o.organization_id,
        o.slug,
        o.customer_order_number,
        o.created_from,
        cd.name AS customer_name,
        cd.phone AS customer_phone,
        cd.email AS customer_email
    FROM 
        online_orders o
    LEFT JOIN 
        customer_data cd ON o.customer_id = cd.id
    WHERE 
        o.organization_id = org_id
        AND (p_status IS NULL OR o.status = p_status)
        AND (p_payment_method IS NULL OR o.payment_method = p_payment_method)
        AND (p_date_from IS NULL OR o.created_at >= p_date_from)
        AND (p_date_to IS NULL OR o.created_at <= p_date_to)
        AND (
            p_search IS NULL 
            OR CAST(o.customer_order_number AS TEXT) ILIKE '%' || p_search || '%'
            OR o.id::TEXT ILIKE '%' || p_search || '%'
            OR cd.name ILIKE '%' || p_search || '%'
            OR cd.phone ILIKE '%' || p_search || '%'
            OR cd.email ILIKE '%' || p_search || '%'
        )
    ORDER BY 
        o.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$; 