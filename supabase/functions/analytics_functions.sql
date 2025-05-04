-- دوال SQL لصفحة تحليلات المبيعات

-- دالة للحصول على ملخص المبيعات
CREATE OR REPLACE FUNCTION get_sales_summary(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    total_sales NUMERIC,
    total_profit NUMERIC
) AS $$
DECLARE
    v_total_sales NUMERIC := 0;
    v_total_profit NUMERIC := 0;
    
    -- متغيرات للمبيعات من نقاط البيع
    v_pos_sales NUMERIC := 0;
    v_pos_profit NUMERIC := 0;
    
    -- متغيرات للمبيعات الإلكترونية
    v_online_sales NUMERIC := 0;
    v_online_profit NUMERIC := 0;
BEGIN
    -- 1. حساب إجمالي المبيعات والأرباح من نقاط البيع (جدول orders وorder_items)
    SELECT 
        COALESCE(SUM(o.total), 0),
        COALESCE(SUM(
            o.total - (
                SELECT COALESCE(SUM(p.purchase_price * oi.quantity), 0)
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = o.id
            )
        ), 0)
    INTO v_pos_sales, v_pos_profit
    FROM orders o
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled'
        AND (o.is_online = FALSE OR o.is_online IS NULL)
        AND (p_admin_id IS NULL OR o.created_by = p_admin_id);

    -- 2. حساب إجمالي المبيعات والأرباح من المتجر الإلكتروني (جدول online_orders و online_order_items)
    SELECT 
        COALESCE(SUM(oo.total), 0),
        COALESCE(SUM(
            oo.total - (
                SELECT COALESCE(SUM(p.purchase_price * ooi.quantity), 0)
                FROM online_order_items ooi
                JOIN products p ON ooi.product_id = p.id
                WHERE ooi.online_order_id = oo.id
            )
        ), 0)
    INTO v_online_sales, v_online_profit
    FROM online_orders oo
    WHERE 
        oo.organization_id = p_organization_id
        AND oo.created_at BETWEEN p_start_date AND p_end_date
        AND oo.status != 'cancelled'
        AND (p_admin_id IS NULL OR oo.created_by = p_admin_id);

    -- 3. جمع النتائج الإجمالية
    v_total_sales := v_pos_sales + v_online_sales;
    v_total_profit := v_pos_profit + v_online_profit;

    -- 4. إرجاع النتائج
    RETURN QUERY SELECT v_total_sales, v_total_profit;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على إحصائيات الطلبات
CREATE OR REPLACE FUNCTION get_orders_stats(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    total_orders BIGINT,
    avg_order_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(o.id) AS total_orders,
        CASE WHEN COUNT(o.id) > 0 THEN ROUND(COALESCE(SUM(o.total), 0) / COUNT(o.id), 2) ELSE 0 END AS avg_order_value
    FROM orders o
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled'
        AND (p_admin_id IS NULL OR o.created_by = p_admin_id);
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على المبيعات حسب القناة (نقاط البيع والأونلاين)
CREATE OR REPLACE FUNCTION get_sales_by_channel(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    pos_sales NUMERIC,
    online_sales NUMERIC
) AS $$
DECLARE
    v_pos_sales NUMERIC;
    v_online_sales NUMERIC;
BEGIN
    -- الحصول على مبيعات نقاط البيع من جدول orders
    SELECT COALESCE(SUM(o.total), 0) INTO v_pos_sales
    FROM orders o
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled'
        AND (o.is_online = FALSE OR o.is_online IS NULL)
        AND (p_admin_id IS NULL OR o.created_by = p_admin_id);
    
    -- الحصول على المبيعات الإلكترونية من جدول online_orders
    SELECT COALESCE(SUM(oo.total), 0) INTO v_online_sales
    FROM online_orders oo
    WHERE 
        oo.organization_id = p_organization_id
        AND oo.created_at BETWEEN p_start_date AND p_end_date
        AND oo.status != 'cancelled'
        AND (p_admin_id IS NULL OR oo.created_by = p_admin_id);
    
    -- إرجاع النتائج
    RETURN QUERY SELECT v_pos_sales, v_online_sales;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على المبيعات حسب الفترة (يومي، أسبوعي، شهري)
CREATE OR REPLACE FUNCTION get_sales_by_period(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_interval TEXT, -- 'day', 'week', or 'month'
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    period TEXT,
    total_sales NUMERIC
) AS $$
BEGIN
    IF p_interval = 'day' THEN
        RETURN QUERY
        SELECT 
            TO_CHAR(DATE_TRUNC('day', o.created_at), 'YYYY-MM-DD') AS period,
            COALESCE(SUM(o.total), 0) AS total_sales
        FROM orders o
        WHERE 
            o.organization_id = p_organization_id
            AND o.created_at BETWEEN p_start_date AND p_end_date
            AND o.status != 'cancelled'
            AND (p_admin_id IS NULL OR o.created_by = p_admin_id)
        GROUP BY DATE_TRUNC('day', o.created_at)
        ORDER BY DATE_TRUNC('day', o.created_at);
    ELSIF p_interval = 'week' THEN
        RETURN QUERY
        SELECT 
            EXTRACT(WEEK FROM o.created_at)::TEXT AS period,
            COALESCE(SUM(o.total), 0) AS total_sales
        FROM orders o
        WHERE 
            o.organization_id = p_organization_id
            AND o.created_at BETWEEN p_start_date AND p_end_date
            AND o.status != 'cancelled'
            AND (p_admin_id IS NULL OR o.created_by = p_admin_id)
        GROUP BY EXTRACT(WEEK FROM o.created_at)
        ORDER BY EXTRACT(WEEK FROM o.created_at);
    ELSE
        -- Default to monthly
        RETURN QUERY
        SELECT 
            TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM-DD') AS period,
            COALESCE(SUM(o.total), 0) AS total_sales
        FROM orders o
        WHERE 
            o.organization_id = p_organization_id
            AND o.created_at BETWEEN p_start_date AND p_end_date
            AND o.status != 'cancelled'
            AND (p_admin_id IS NULL OR o.created_by = p_admin_id)
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY DATE_TRUNC('month', o.created_at);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على أعلى المنتجات مبيعًا
CREATE OR REPLACE FUNCTION get_top_products(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_limit INTEGER DEFAULT 5,
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    product_id UUID,
    product_name TEXT,
    total_sales NUMERIC,
    total_profit NUMERIC,
    total_quantity BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oi.product_id,
        MAX(oi.product_name) AS product_name,
        COALESCE(SUM(oi.total_price), 0) AS total_sales,
        COALESCE(SUM(oi.total_price - (p.purchase_price * oi.quantity)), 0) AS total_profit,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled'
        AND (p_admin_id IS NULL OR o.created_by = p_admin_id)
    GROUP BY oi.product_id
    ORDER BY total_sales DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على أعلى الفئات مبيعًا
CREATE OR REPLACE FUNCTION get_top_categories(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_limit INTEGER DEFAULT 5,
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    category_id UUID,
    category_name TEXT,
    total_sales NUMERIC,
    total_profit NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id AS category_id,
        pc.name AS category_name,
        COALESCE(SUM(oi.total_price), 0) AS total_sales,
        COALESCE(SUM(oi.total_price - (p.purchase_price * oi.quantity)), 0) AS total_profit
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    JOIN product_categories pc ON p.category_id = pc.id
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled'
        AND (p_admin_id IS NULL OR o.created_by = p_admin_id)
    GROUP BY pc.id, pc.name
    ORDER BY total_sales DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على إجمالي المصروفات
CREATE OR REPLACE FUNCTION get_total_expenses(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    total_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT COALESCE(SUM(e.amount), 0) AS total_amount
    FROM expenses e
    WHERE 
        e.organization_id = p_organization_id
        AND e.created_at BETWEEN p_start_date AND p_end_date
        AND (p_admin_id IS NULL OR e.created_by = p_admin_id);
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على المصروفات حسب الفئة
CREATE OR REPLACE FUNCTION get_expenses_by_category(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    category_id UUID,
    category_name TEXT,
    total_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.id AS category_id,
        ec.name AS category_name,
        COALESCE(SUM(e.amount), 0) AS total_amount
    FROM expenses e
    JOIN expense_categories ec ON e.category_id = ec.id
    WHERE 
        e.organization_id = p_organization_id
        AND e.created_at BETWEEN p_start_date AND p_end_date
        AND (p_admin_id IS NULL OR e.created_by = p_admin_id)
    GROUP BY ec.id, ec.name
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على حالة المخزون
CREATE OR REPLACE FUNCTION get_inventory_status(
    p_organization_id UUID,
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    total_products BIGINT,
    low_stock_count BIGINT,
    out_of_stock_count BIGINT,
    total_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(p.id) AS total_products,
        COUNT(p.id) FILTER (WHERE p.stock_quantity <= p.low_stock_threshold AND p.stock_quantity > 0) AS low_stock_count,
        COUNT(p.id) FILTER (WHERE p.stock_quantity = 0) AS out_of_stock_count,
        COALESCE(SUM(p.stock_quantity * p.purchase_price), 0) AS total_value
    FROM products p
    WHERE 
        p.organization_id = p_organization_id
        AND (p_admin_id IS NULL OR p.created_by = p_admin_id);
END;
$$ LANGUAGE plpgsql; 