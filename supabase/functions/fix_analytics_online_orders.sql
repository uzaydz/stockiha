-- ملف تصحيح لفصل تحليلات المبيعات الإلكترونية
-- يضيف الدوال المعدلة التي تأخذ في الاعتبار الطلبات من جدول online_orders

-- 1. تعديل دالة إحصائيات الطلبات لتشمل الطلبات الإلكترونية
CREATE OR REPLACE FUNCTION get_orders_stats(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    total_orders BIGINT,
    avg_order_value NUMERIC
) AS $$
DECLARE
    v_pos_orders BIGINT;
    v_pos_total NUMERIC;
    v_online_orders BIGINT;
    v_online_total NUMERIC;
    v_total_orders BIGINT;
    v_total_amount NUMERIC;
BEGIN
    -- الحصول على إحصائيات طلبات نقاط البيع
    SELECT 
        COUNT(o.id),
        COALESCE(SUM(o.total), 0)
    INTO v_pos_orders, v_pos_total
    FROM orders o
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled'
        AND (o.is_online = FALSE OR o.is_online IS NULL);
    
    -- الحصول على إحصائيات الطلبات الإلكترونية
    SELECT 
        COUNT(oo.id),
        COALESCE(SUM(oo.total), 0)
    INTO v_online_orders, v_online_total
    FROM online_orders oo
    WHERE 
        oo.organization_id = p_organization_id
        AND oo.created_at BETWEEN p_start_date AND p_end_date
        AND oo.status != 'cancelled';
    
    -- حساب الإجماليات
    v_total_orders := v_pos_orders + v_online_orders;
    v_total_amount := v_pos_total + v_online_total;
    
    -- حساب متوسط قيمة الطلب
    RETURN QUERY 
    SELECT 
        v_total_orders,
        CASE WHEN v_total_orders > 0 THEN ROUND(v_total_amount / v_total_orders, 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- 2. تعديل دالة المبيعات حسب الفترة لتشمل المتجر الإلكتروني
CREATE OR REPLACE FUNCTION get_sales_by_period(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_interval TEXT -- 'day', 'week', or 'month'
)
RETURNS TABLE(
    period TEXT,
    total_sales NUMERIC
) AS $$
BEGIN
    IF p_interval = 'day' THEN
        RETURN QUERY
        WITH pos_sales AS (
            SELECT 
                DATE_TRUNC('day', o.created_at) AS sale_date,
                COALESCE(SUM(o.total), 0) AS sales
            FROM orders o
            WHERE 
                o.organization_id = p_organization_id
                AND o.created_at BETWEEN p_start_date AND p_end_date
                AND o.status != 'cancelled'
                AND (o.is_online = FALSE OR o.is_online IS NULL)
            GROUP BY DATE_TRUNC('day', o.created_at)
        ),
        online_sales AS (
            SELECT 
                DATE_TRUNC('day', oo.created_at) AS sale_date,
                COALESCE(SUM(oo.total), 0) AS sales
            FROM online_orders oo
            WHERE 
                oo.organization_id = p_organization_id
                AND oo.created_at BETWEEN p_start_date AND p_end_date
                AND oo.status != 'cancelled'
            GROUP BY DATE_TRUNC('day', oo.created_at)
        ),
        combined_sales AS (
            SELECT sale_date, sales FROM pos_sales
            UNION ALL
            SELECT sale_date, sales FROM online_sales
        )
        SELECT 
            TO_CHAR(sale_date, 'YYYY-MM-DD') AS period,
            SUM(sales) AS total_sales
        FROM combined_sales
        GROUP BY sale_date
        ORDER BY sale_date;
    ELSIF p_interval = 'week' THEN
        RETURN QUERY
        WITH pos_sales AS (
            SELECT 
                DATE_TRUNC('week', o.created_at) AS sale_week,
                EXTRACT(WEEK FROM o.created_at) AS week_num,
                COALESCE(SUM(o.total), 0) AS sales
            FROM orders o
            WHERE 
                o.organization_id = p_organization_id
                AND o.created_at BETWEEN p_start_date AND p_end_date
                AND o.status != 'cancelled'
                AND (o.is_online = FALSE OR o.is_online IS NULL)
            GROUP BY DATE_TRUNC('week', o.created_at), EXTRACT(WEEK FROM o.created_at)
        ),
        online_sales AS (
            SELECT 
                DATE_TRUNC('week', oo.created_at) AS sale_week,
                EXTRACT(WEEK FROM oo.created_at) AS week_num,
                COALESCE(SUM(oo.total), 0) AS sales
            FROM online_orders oo
            WHERE 
                oo.organization_id = p_organization_id
                AND oo.created_at BETWEEN p_start_date AND p_end_date
                AND oo.status != 'cancelled'
            GROUP BY DATE_TRUNC('week', oo.created_at), EXTRACT(WEEK FROM oo.created_at)
        ),
        combined_sales AS (
            SELECT sale_week, week_num, sales FROM pos_sales
            UNION ALL
            SELECT sale_week, week_num, sales FROM online_sales
        )
        SELECT 
            week_num::TEXT AS period,
            SUM(sales) AS total_sales
        FROM combined_sales
        GROUP BY sale_week, week_num
        ORDER BY sale_week;
    ELSE
        -- Default to monthly
        RETURN QUERY
        WITH pos_sales AS (
            SELECT 
                DATE_TRUNC('month', o.created_at) AS sale_month,
                COALESCE(SUM(o.total), 0) AS sales
            FROM orders o
            WHERE 
                o.organization_id = p_organization_id
                AND o.created_at BETWEEN p_start_date AND p_end_date
                AND o.status != 'cancelled'
                AND (o.is_online = FALSE OR o.is_online IS NULL)
            GROUP BY DATE_TRUNC('month', o.created_at)
        ),
        online_sales AS (
            SELECT 
                DATE_TRUNC('month', oo.created_at) AS sale_month,
                COALESCE(SUM(oo.total), 0) AS sales
            FROM online_orders oo
            WHERE 
                oo.organization_id = p_organization_id
                AND oo.created_at BETWEEN p_start_date AND p_end_date
                AND oo.status != 'cancelled'
            GROUP BY DATE_TRUNC('month', oo.created_at)
        ),
        combined_sales AS (
            SELECT sale_month, sales FROM pos_sales
            UNION ALL
            SELECT sale_month, sales FROM online_sales
        )
        SELECT 
            TO_CHAR(sale_month, 'YYYY-MM-DD') AS period,
            SUM(sales) AS total_sales
        FROM combined_sales
        GROUP BY sale_month
        ORDER BY sale_month;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. تعديل دالة أعلى المنتجات مبيعًا لتشمل المنتجات من المتجر الإلكتروني
CREATE OR REPLACE FUNCTION get_top_products(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_limit INTEGER DEFAULT 5
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
    WITH pos_products AS (
        SELECT 
            oi.product_id,
            MAX(oi.product_name) AS product_name,
            COALESCE(SUM(oi.total_price), 0) AS sales,
            COALESCE(SUM(oi.total_price - (p.purchase_price * oi.quantity)), 0) AS profit,
            COALESCE(SUM(oi.quantity), 0) AS quantity
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE 
            o.organization_id = p_organization_id
            AND o.created_at BETWEEN p_start_date AND p_end_date
            AND o.status != 'cancelled'
            AND (o.is_online = FALSE OR o.is_online IS NULL)
        GROUP BY oi.product_id
    ),
    online_products AS (
        SELECT 
            ooi.product_id,
            MAX(ooi.product_name) AS product_name,
            COALESCE(SUM(ooi.total_price), 0) AS sales,
            COALESCE(SUM(ooi.total_price - (p.purchase_price * ooi.quantity)), 0) AS profit,
            COALESCE(SUM(ooi.quantity), 0) AS quantity
        FROM online_order_items ooi
        JOIN online_orders oo ON ooi.online_order_id = oo.id
        LEFT JOIN products p ON ooi.product_id = p.id
        WHERE 
            oo.organization_id = p_organization_id
            AND oo.created_at BETWEEN p_start_date AND p_end_date
            AND oo.status != 'cancelled'
        GROUP BY ooi.product_id
    ),
    combined_products AS (
        SELECT 
            product_id, 
            product_name, 
            sales, 
            profit, 
            quantity 
        FROM pos_products
        UNION ALL
        SELECT 
            product_id, 
            product_name, 
            sales, 
            profit, 
            quantity 
        FROM online_products
    ),
    aggregated_products AS (
        SELECT
            product_id,
            MAX(product_name) AS product_name,
            SUM(sales) AS total_sales,
            SUM(profit) AS total_profit,
            SUM(quantity) AS total_quantity
        FROM combined_products
        GROUP BY product_id
    )
    SELECT
        product_id,
        product_name,
        total_sales,
        total_profit,
        total_quantity
    FROM aggregated_products
    ORDER BY total_sales DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. تعديل دالة أعلى الفئات مبيعًا لتشمل الفئات من المتجر الإلكتروني
CREATE OR REPLACE FUNCTION get_top_categories(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
    category_id UUID,
    category_name TEXT,
    total_sales NUMERIC,
    total_profit NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH pos_categories AS (
        SELECT 
            pc.id AS category_id,
            pc.name AS category_name,
            COALESCE(SUM(oi.total_price), 0) AS sales,
            COALESCE(SUM(oi.total_price - (p.purchase_price * oi.quantity)), 0) AS profit
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        JOIN product_categories pc ON p.category_id = pc.id
        WHERE 
            o.organization_id = p_organization_id
            AND o.created_at BETWEEN p_start_date AND p_end_date
            AND o.status != 'cancelled'
            AND (o.is_online = FALSE OR o.is_online IS NULL)
        GROUP BY pc.id, pc.name
    ),
    online_categories AS (
        SELECT 
            pc.id AS category_id,
            pc.name AS category_name,
            COALESCE(SUM(ooi.total_price), 0) AS sales,
            COALESCE(SUM(ooi.total_price - (p.purchase_price * ooi.quantity)), 0) AS profit
        FROM online_order_items ooi
        JOIN online_orders oo ON ooi.online_order_id = oo.id
        JOIN products p ON ooi.product_id = p.id
        JOIN product_categories pc ON p.category_id = pc.id
        WHERE 
            oo.organization_id = p_organization_id
            AND oo.created_at BETWEEN p_start_date AND p_end_date
            AND oo.status != 'cancelled'
        GROUP BY pc.id, pc.name
    ),
    combined_categories AS (
        SELECT 
            category_id,
            category_name, 
            sales, 
            profit
        FROM pos_categories
        UNION ALL
        SELECT 
            category_id,
            category_name, 
            sales, 
            profit
        FROM online_categories
    ),
    aggregated_categories AS (
        SELECT
            category_id,
            MAX(category_name) AS category_name,
            SUM(sales) AS total_sales,
            SUM(profit) AS total_profit
        FROM combined_categories
        GROUP BY category_id
    )
    SELECT
        category_id,
        category_name,
        total_sales,
        total_profit
    FROM aggregated_categories
    ORDER BY total_sales DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql; 