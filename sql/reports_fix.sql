-- ===================================================================
-- SQL محدث لتصحيح المشاكل في الوظائف والاستعلامات لتقارير المالية
-- ===================================================================

-- ---------------------------------------------------------------------
-- حذف الوظائف المتداخلة أولاً للتأكد من عدم وجود تعارض
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_top_products(uuid, date, date, integer);
DROP FUNCTION IF EXISTS get_top_products(uuid, timestamp with time zone, timestamp with time zone, integer);
DROP FUNCTION IF EXISTS get_financial_summary(uuid, date, date);
DROP FUNCTION IF EXISTS get_sales_trends(uuid, text, date, date);
DROP FUNCTION IF EXISTS get_expenses_by_category(uuid, date, date);
DROP FUNCTION IF EXISTS get_inventory_summary(uuid);

-- ---------------------------------------------------------------------
-- FUNCIÓN: OBTENER TOP PRODUCTOS POR PERÍODO - نسخة محسنة
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_top_products_v2(
    p_organization_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    category TEXT,
    units_sold BIGINT,
    total_revenue NUMERIC,
    profit_margin NUMERIC,
    total_profit NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        SUM(oi.quantity) AS units_sold,
        SUM(oi.unit_price * oi.quantity) AS total_revenue,
        CASE
            WHEN SUM(oi.unit_price * oi.quantity) > 0 AND SUM(COALESCE(p.purchase_price, 0) * oi.quantity) > 0
            THEN (SUM(oi.unit_price * oi.quantity) - SUM(COALESCE(p.purchase_price, 0) * oi.quantity)) / SUM(oi.unit_price * oi.quantity) * 100
            ELSE 0
        END AS profit_margin,
        (SUM(oi.unit_price * oi.quantity) - SUM(COALESCE(p.purchase_price, 0) * oi.quantity)) AS total_profit
    FROM
        order_items oi
    JOIN
        orders o ON oi.order_id = o.id
    JOIN
        products p ON oi.product_id = p.id
    WHERE
        p.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
    GROUP BY
        p.id, p.name, p.category
    ORDER BY
        units_sold DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- FUNCIÓN: OBTENER RESUMEN FINANCIERO POR PERÍODO - نسخة محسنة
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_financial_summary_v2(
    p_organization_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    period TEXT,
    sales_total NUMERIC,
    expenses_total NUMERIC,
    profit NUMERIC,
    profit_margin NUMERIC,
    online_sales NUMERIC,
    in_store_sales NUMERIC,
    service_sales NUMERIC,
    order_count BIGINT,
    unique_customers BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH regular_sales AS (
        SELECT
            SUM(total) AS sales_total,
            SUM(CASE WHEN is_online THEN total ELSE 0 END) AS online_sales_regular,
            SUM(CASE WHEN NOT is_online THEN total ELSE 0 END) AS in_store_sales,
            COUNT(*) AS order_count_regular,
            COUNT(DISTINCT customer_id) AS unique_customers_regular
        FROM
            orders
        WHERE
            organization_id = p_organization_id
            AND created_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
    ),
    online_sales AS (
        SELECT
            SUM(total) AS online_sales_total,
            COUNT(*) AS order_count_online,
            COUNT(DISTINCT customer_id) AS unique_customers_online
        FROM
            online_orders
        WHERE
            organization_id = p_organization_id
            AND created_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
    ),
    expense_data AS (
        SELECT
            SUM(amount) AS expenses_total
        FROM
            expenses
        WHERE
            organization_id = p_organization_id
            AND expense_date BETWEEN p_start_date AND p_end_date
    ),
    service_data AS (
        SELECT
            SUM(sb.price) AS service_sales,
            COUNT(*) AS service_count
        FROM
            service_bookings sb
        WHERE
            sb.organization_id = p_organization_id
            AND sb.status = 'completed'
            AND sb.scheduled_date BETWEEN p_start_date AND p_end_date
    ),
    period_format AS (
        SELECT
            CASE 
                WHEN p_start_date = p_end_date THEN TO_CHAR(p_start_date, 'YYYY-MM-DD')
                WHEN DATE_TRUNC('month', p_start_date) = DATE_TRUNC('month', p_end_date) THEN TO_CHAR(p_start_date, 'YYYY-MM')
                ELSE TO_CHAR(p_start_date, 'YYYY-MM-DD') || ' to ' || TO_CHAR(p_end_date, 'YYYY-MM-DD')
            END AS period
    )
    SELECT
        pf.period,
        COALESCE(rs.sales_total, 0) + COALESCE(os.online_sales_total, 0) AS sales_total,
        COALESCE(ed.expenses_total, 0) AS expenses_total,
        (COALESCE(rs.sales_total, 0) + COALESCE(os.online_sales_total, 0) + COALESCE(sd.service_sales, 0) - COALESCE(ed.expenses_total, 0)) AS profit,
        CASE 
            WHEN (COALESCE(rs.sales_total, 0) + COALESCE(os.online_sales_total, 0) + COALESCE(sd.service_sales, 0)) > 0 
            THEN ((COALESCE(rs.sales_total, 0) + COALESCE(os.online_sales_total, 0) + COALESCE(sd.service_sales, 0) - COALESCE(ed.expenses_total, 0)) / 
                 (COALESCE(rs.sales_total, 0) + COALESCE(os.online_sales_total, 0) + COALESCE(sd.service_sales, 0))) * 100
            ELSE 0
        END AS profit_margin,
        COALESCE(rs.online_sales_regular, 0) + COALESCE(os.online_sales_total, 0) AS online_sales,
        COALESCE(rs.in_store_sales, 0) AS in_store_sales,
        COALESCE(sd.service_sales, 0) AS service_sales,
        COALESCE(rs.order_count_regular, 0) + COALESCE(os.order_count_online, 0) AS order_count,
        COALESCE(rs.unique_customers_regular, 0) + COALESCE(os.unique_customers_online, 0) AS unique_customers
    FROM
        period_format pf
    LEFT JOIN
        regular_sales rs ON true
    LEFT JOIN
        online_sales os ON true
    LEFT JOIN
        expense_data ed ON true
    LEFT JOIN
        service_data sd ON true;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- FUNCIÓN: OBTENER ANÁLISIS DE TENDENCIAS - نسخة محسنة
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_sales_trends_v2(
    p_organization_id UUID,
    p_period TEXT, -- 'daily', 'weekly', 'monthly'
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    time_period TEXT,
    order_count BIGINT,
    total_sales NUMERIC,
    average_order_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH regular_orders AS (
        SELECT
            CASE
                WHEN p_period = 'daily' THEN TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD')
                WHEN p_period = 'weekly' THEN TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-"W"IW')
                WHEN p_period = 'monthly' THEN TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')
                WHEN p_period = 'quarterly' THEN TO_CHAR(DATE_TRUNC('quarter', created_at), 'YYYY-"Q"Q')
                WHEN p_period = 'yearly' THEN TO_CHAR(DATE_TRUNC('year', created_at), 'YYYY')
                ELSE TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD')
            END AS ro_time_period,
            COUNT(*) AS ro_order_count,
            SUM(total) AS ro_total_sales
        FROM
            orders
        WHERE
            organization_id = p_organization_id
            AND created_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
        GROUP BY
            ro_time_period
    ),
    online_orders AS (
        SELECT
            CASE
                WHEN p_period = 'daily' THEN TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD')
                WHEN p_period = 'weekly' THEN TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-"W"IW')
                WHEN p_period = 'monthly' THEN TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')
                WHEN p_period = 'quarterly' THEN TO_CHAR(DATE_TRUNC('quarter', created_at), 'YYYY-"Q"Q')
                WHEN p_period = 'yearly' THEN TO_CHAR(DATE_TRUNC('year', created_at), 'YYYY')
                ELSE TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD')
            END AS oo_time_period,
            COUNT(*) AS oo_order_count,
            SUM(total) AS oo_total_sales
        FROM
            online_orders
        WHERE
            organization_id = p_organization_id
            AND created_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
        GROUP BY
            oo_time_period
    ),
    service_bookings AS (
        SELECT
            CASE
                WHEN p_period = 'daily' THEN TO_CHAR(DATE_TRUNC('day', scheduled_date), 'YYYY-MM-DD')
                WHEN p_period = 'weekly' THEN TO_CHAR(DATE_TRUNC('week', scheduled_date), 'YYYY-"W"IW')
                WHEN p_period = 'monthly' THEN TO_CHAR(DATE_TRUNC('month', scheduled_date), 'YYYY-MM')
                WHEN p_period = 'quarterly' THEN TO_CHAR(DATE_TRUNC('quarter', scheduled_date), 'YYYY-"Q"Q')
                WHEN p_period = 'yearly' THEN TO_CHAR(DATE_TRUNC('year', scheduled_date), 'YYYY')
                ELSE TO_CHAR(DATE_TRUNC('day', scheduled_date), 'YYYY-MM-DD')
            END AS sb_time_period,
            COUNT(*) AS sb_service_count,
            SUM(price) AS sb_service_sales
        FROM
            service_bookings
        WHERE
            organization_id = p_organization_id
            AND status = 'completed'
            AND scheduled_date BETWEEN p_start_date AND p_end_date
        GROUP BY
            sb_time_period
    ),
    all_periods AS (
        SELECT ro_time_period AS period FROM regular_orders
        UNION
        SELECT oo_time_period AS period FROM online_orders
        UNION
        SELECT sb_time_period AS period FROM service_bookings
    ),
    combined_data AS (
        SELECT
            ap.period,
            COALESCE(ro.ro_order_count, 0) + COALESCE(oo.oo_order_count, 0) AS combined_order_count,
            COALESCE(ro.ro_total_sales, 0) + COALESCE(oo.oo_total_sales, 0) + COALESCE(sb.sb_service_sales, 0) AS combined_total_sales
        FROM
            all_periods ap
        LEFT JOIN
            regular_orders ro ON ap.period = ro.ro_time_period
        LEFT JOIN
            online_orders oo ON ap.period = oo.oo_time_period
        LEFT JOIN
            service_bookings sb ON ap.period = sb.sb_time_period
    )
    SELECT
        period AS time_period,
        combined_order_count AS order_count,
        combined_total_sales AS total_sales,
        CASE WHEN combined_order_count > 0 THEN combined_total_sales / combined_order_count ELSE 0 END AS average_order_value
    FROM
        combined_data
    ORDER BY
        period;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- FUNCIÓN: OBTENER GASTOS POR CATEGORÍA Y PERÍODO - نسخة محسنة
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_expenses_by_category_v2(
    p_organization_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    category TEXT,
    expense_count BIGINT,
    total_amount NUMERIC,
    percentage_of_total NUMERIC
) AS $$
DECLARE
    v_total_expenses NUMERIC;
BEGIN
    -- Calcular el total de gastos para el período
    SELECT SUM(amount) INTO v_total_expenses
    FROM expenses
    WHERE organization_id = p_organization_id
    AND expense_date BETWEEN p_start_date AND p_end_date;

    -- Si no hay gastos, devolver un conjunto vacío
    IF v_total_expenses IS NULL OR v_total_expenses = 0 THEN
        v_total_expenses := 1; -- Evitar división por cero
    END IF;

    -- Devolver los gastos por categoría
    RETURN QUERY
    SELECT
        e.category,
        COUNT(*) AS expense_count,
        SUM(e.amount) AS total_amount,
        (SUM(e.amount) / v_total_expenses * 100) AS percentage_of_total
    FROM
        expenses e
    WHERE
        e.organization_id = p_organization_id
        AND e.expense_date BETWEEN p_start_date AND p_end_date
    GROUP BY
        e.category
    ORDER BY
        total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- FUNCIÓN: OBTENER RESUMEN DE INVENTARIO - نسخة محسنة
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_inventory_summary_v2(
    p_organization_id UUID
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    category TEXT,
    stock_quantity INTEGER,
    cost_price NUMERIC,
    sale_price NUMERIC,
    total_value NUMERIC,
    status TEXT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.stock_quantity,
        p.purchase_price AS cost_price,
        p.price AS sale_price,
        (p.stock_quantity * p.price) AS total_value,
        CASE
            WHEN p.stock_quantity <= 0 THEN 'out_of_stock'
            WHEN p.stock_quantity <= COALESCE(p.min_stock_level, 5) THEN 'low_stock'
            ELSE 'in_stock'
        END AS status,
        p.updated_at AS last_updated
    FROM
        products p
    WHERE
        p.organization_id = p_organization_id
    ORDER BY
        total_value DESC;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- إضافة فهارس لتحسين الأداء
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_created_at ON online_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_online_orders_org_id ON online_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_date ON service_bookings(scheduled_date);

-- ---------------------------------------------------------------------
-- FUNCIÓN: OBTENER RESUMEN FINANCIERO POR PERÍODO - وظيفة إضافية مخصصة
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_services_sales_summary_v2(
    p_organization_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    service_name TEXT,
    service_count BIGINT,
    total_amount NUMERIC,
    percentage_of_total NUMERIC
) AS $$
DECLARE
    v_total_services NUMERIC;
BEGIN
    -- حساب إجمالي مبيعات الخدمات
    SELECT COALESCE(SUM(price), 0) INTO v_total_services
    FROM service_bookings
    WHERE organization_id = p_organization_id
    AND status = 'completed'
    AND scheduled_date BETWEEN p_start_date AND p_end_date;

    -- إذا لم تكن هناك خدمات، أرجع مجموعة فارغة
    IF v_total_services IS NULL OR v_total_services = 0 THEN
        v_total_services := 1; -- لتجنب القسمة على صفر
    END IF;

    -- استعلام لإحصائيات الخدمات
    RETURN QUERY
    SELECT
        s.name AS service_name,
        COUNT(sb.id) AS service_count,
        SUM(sb.price) AS total_amount,
        (SUM(sb.price) / v_total_services * 100) AS percentage_of_total
    FROM
        service_bookings sb
    JOIN
        services s ON sb.service_id = s.id
    WHERE
        sb.organization_id = p_organization_id
        AND sb.status = 'completed'
        AND sb.scheduled_date BETWEEN p_start_date AND p_end_date
    GROUP BY
        s.name
    ORDER BY
        total_amount DESC;
END;
$$ LANGUAGE plpgsql; 