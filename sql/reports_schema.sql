-- ===================================================================
-- ARCHIVO SQL PARA CONFIGURACIÓN DE VISTAS Y FUNCIONES DE INFORMES
-- ===================================================================

-- ---------------------------------------------------------------------
-- VISTA: INFORME VENTAS DIARIAS
-- Proporciona un resumen diario de las ventas incluyendo total, cantidad, promedio, etc.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW reports_daily_sales AS
SELECT
    organization_id,
    DATE_TRUNC('day', created_at) AS sale_date,
    COUNT(*) AS order_count,
    SUM(total) AS total_sales,
    AVG(total) AS average_order_value,
    SUM(discount) AS total_discounts,
    COUNT(DISTINCT customer_id) AS unique_customers,
    SUM(CASE WHEN is_online THEN 1 ELSE 0 END) AS online_orders,
    SUM(CASE WHEN is_online THEN 0 ELSE 1 END) AS in_store_orders,
    SUM(CASE WHEN is_online THEN total ELSE 0 END) AS online_sales,
    SUM(CASE WHEN is_online THEN 0 ELSE total END) AS in_store_sales
FROM
    orders
GROUP BY
    organization_id, DATE_TRUNC('day', created_at)
ORDER BY
    sale_date DESC;

-- ---------------------------------------------------------------------
-- VISTA: INFORME VENTAS POR CATEGORÍA
-- Proporciona un resumen de ventas agrupadas por categoría de producto
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW reports_sales_by_category AS
SELECT
    p.organization_id,
    p.category,
    DATE_TRUNC('month', o.created_at) AS sale_month,
    COUNT(DISTINCT o.id) AS order_count,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.unit_price * oi.quantity) AS total_sales,
    SUM((oi.unit_price - COALESCE(p.purchase_price, 0)) * oi.quantity) AS estimated_profit
FROM
    orders o
JOIN
    order_items oi ON o.id = oi.order_id
JOIN
    products p ON oi.product_id = p.id
GROUP BY
    p.organization_id, p.category, DATE_TRUNC('month', o.created_at)
ORDER BY
    sale_month DESC, total_sales DESC;

-- ---------------------------------------------------------------------
-- VISTA: INFORME RENTABILIDAD PRODUCTOS
-- Muestra los productos más rentables basados en margen y volumen
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW reports_product_profitability AS
SELECT
    p.organization_id,
    p.id AS product_id,
    p.name AS product_name,
    p.category,
    p.price AS selling_price,
    COALESCE(p.purchase_price, 0) AS purchase_price,
    (p.price - COALESCE(p.purchase_price, 0)) AS profit_per_unit,
    CASE 
        WHEN COALESCE(p.purchase_price, 0) > 0 
        THEN ((p.price - COALESCE(p.purchase_price, 0)) / p.purchase_price * 100)
        ELSE 100
    END AS profit_margin_percentage,
    COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
    COALESCE(SUM(oi.quantity * (p.price - COALESCE(p.purchase_price, 0))), 0) AS total_profit
FROM
    products p
LEFT JOIN
    order_items oi ON p.id = oi.product_id
LEFT JOIN
    orders o ON oi.order_id = o.id
WHERE
    o.created_at >= CURRENT_DATE - INTERVAL '90 days' OR o.created_at IS NULL
GROUP BY
    p.id, p.organization_id, p.name, p.category, p.price, p.purchase_price
ORDER BY
    total_profit DESC NULLS LAST;

-- ---------------------------------------------------------------------
-- VISTA: RESUMEN FINANCIERO MENSUAL
-- Proporciona un informe mensual de ingresos, gastos y ganancias netas
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW reports_monthly_financial_summary AS
WITH monthly_sales AS (
    SELECT
        organization_id,
        DATE_TRUNC('month', created_at) AS month,
        SUM(total) AS total_sales
    FROM
        orders
    GROUP BY
        organization_id, DATE_TRUNC('month', created_at)
),
monthly_expenses AS (
    SELECT
        organization_id,
        DATE_TRUNC('month', expense_date) AS month,
        SUM(amount) AS total_expenses
    FROM
        expenses
    GROUP BY
        organization_id, DATE_TRUNC('month', expense_date)
),
monthly_service_sales AS (
    SELECT
        s.organization_id,
        DATE_TRUNC('month', sb.scheduled_date) AS month,
        SUM(s.price) AS total_service_sales
    FROM
        service_bookings sb
    JOIN
        services s ON sb.service_id = s.id
    WHERE
        sb.status = 'completed'
    GROUP BY
        s.organization_id, DATE_TRUNC('month', sb.scheduled_date)
)
SELECT
    COALESCE(ms.organization_id, me.organization_id, mss.organization_id) AS organization_id,
    COALESCE(ms.month, me.month, mss.month) AS month,
    COALESCE(ms.total_sales, 0) AS product_sales,
    COALESCE(mss.total_service_sales, 0) AS service_sales,
    COALESCE(ms.total_sales, 0) + COALESCE(mss.total_service_sales, 0) AS total_revenue,
    COALESCE(me.total_expenses, 0) AS total_expenses,
    (COALESCE(ms.total_sales, 0) + COALESCE(mss.total_service_sales, 0) - COALESCE(me.total_expenses, 0)) AS net_profit,
    CASE 
        WHEN (COALESCE(ms.total_sales, 0) + COALESCE(mss.total_service_sales, 0)) > 0 
        THEN (COALESCE(ms.total_sales, 0) + COALESCE(mss.total_service_sales, 0) - COALESCE(me.total_expenses, 0)) / 
             (COALESCE(ms.total_sales, 0) + COALESCE(mss.total_service_sales, 0)) * 100
        ELSE 0
    END AS profit_margin_percentage
FROM
    monthly_sales ms
FULL OUTER JOIN
    monthly_expenses me ON ms.organization_id = me.organization_id AND ms.month = me.month
FULL OUTER JOIN
    monthly_service_sales mss ON COALESCE(ms.organization_id, me.organization_id) = mss.organization_id 
    AND COALESCE(ms.month, me.month) = mss.month
ORDER BY
    month DESC;

-- ---------------------------------------------------------------------
-- VISTA: ANÁLISIS GASTOS POR CATEGORÍA
-- Muestra los gastos por categoría y mes
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW reports_expenses_by_category AS
SELECT
    organization_id,
    category,
    DATE_TRUNC('month', expense_date) AS expense_month,
    COUNT(*) AS expense_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS average_amount
FROM
    expenses
GROUP BY
    organization_id, category, DATE_TRUNC('month', expense_date)
ORDER BY
    expense_month DESC, total_amount DESC;

-- ---------------------------------------------------------------------
-- VISTA: INVENTARIO Y VALORACIÓN
-- Proporciona información sobre el valor del inventario y su rotación
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW reports_inventory_valuation AS
SELECT
    p.organization_id,
    p.category,
    COUNT(*) AS product_count,
    SUM(p.stock_quantity) AS total_stock,
    SUM(p.stock_quantity * p.purchase_price) AS inventory_cost_value,
    SUM(p.stock_quantity * p.price) AS inventory_retail_value,
    SUM(p.stock_quantity * (p.price - COALESCE(p.purchase_price, 0))) AS potential_profit,
    COALESCE(SUM(sales.units_sold), 0) AS units_sold_last_30_days
FROM
    products p
LEFT JOIN (
    SELECT
        oi.product_id,
        SUM(oi.quantity) AS units_sold
    FROM
        order_items oi
    JOIN
        orders o ON oi.order_id = o.id
    WHERE
        o.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY
        oi.product_id
) sales ON p.id = sales.product_id
GROUP BY
    p.organization_id, p.category
ORDER BY
    inventory_retail_value DESC;

-- ---------------------------------------------------------------------
-- VISTA: TENDENCIAS DE VENTAS
-- Proporciona datos para análisis de tendencias de ventas en el tiempo
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW reports_sales_trends AS
SELECT
    organization_id,
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) AS order_count,
    SUM(total) AS daily_total,
    AVG(total) AS average_order_value,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM
    orders
WHERE
    created_at >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY
    organization_id, DATE_TRUNC('day', created_at)
ORDER BY
    day;

-- ---------------------------------------------------------------------
-- FUNCIÓN: OBTENER RESUMEN FINANCIERO POR PERÍODO
-- Permite obtener un resumen financiero para un período específico
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_financial_summary(
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
    WITH sales_data AS (
        SELECT
            CASE 
                WHEN p_start_date = p_end_date THEN TO_CHAR(p_start_date, 'YYYY-MM-DD')
                WHEN DATE_TRUNC('month', p_start_date) = DATE_TRUNC('month', p_end_date) THEN TO_CHAR(p_start_date, 'YYYY-MM')
                ELSE TO_CHAR(p_start_date, 'YYYY-MM-DD') || ' to ' || TO_CHAR(p_end_date, 'YYYY-MM-DD')
            END AS period,
            SUM(total) AS sales_total,
            SUM(CASE WHEN is_online THEN total ELSE 0 END) AS online_sales,
            SUM(CASE WHEN NOT is_online THEN total ELSE 0 END) AS in_store_sales,
            COUNT(*) AS order_count,
            COUNT(DISTINCT customer_id) AS unique_customers
        FROM
            orders
        WHERE
            organization_id = p_organization_id
            AND created_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
        GROUP BY
            period
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
            SUM(s.price) AS service_sales
        FROM
            service_bookings sb
        JOIN
            services s ON sb.service_id = s.id
        WHERE
            s.organization_id = p_organization_id
            AND sb.status = 'completed'
            AND sb.scheduled_date BETWEEN p_start_date AND p_end_date
    )
    SELECT
        sd.period,
        sd.sales_total,
        COALESCE(ed.expenses_total, 0) AS expenses_total,
        (sd.sales_total + COALESCE(serd.service_sales, 0) - COALESCE(ed.expenses_total, 0)) AS profit,
        CASE 
            WHEN (sd.sales_total + COALESCE(serd.service_sales, 0)) > 0 
            THEN ((sd.sales_total + COALESCE(serd.service_sales, 0) - COALESCE(ed.expenses_total, 0)) / (sd.sales_total + COALESCE(serd.service_sales, 0))) * 100
            ELSE 0
        END AS profit_margin,
        sd.online_sales,
        sd.in_store_sales,
        COALESCE(serd.service_sales, 0) AS service_sales,
        sd.order_count,
        sd.unique_customers
    FROM
        sales_data sd
    CROSS JOIN
        expense_data ed
    CROSS JOIN
        service_data serd;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- FUNCIÓN: OBTENER TOP PRODUCTOS POR PERÍODO
-- Permite obtener los productos más vendidos en un período específico
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_top_products(
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
-- FUNCIÓN: OBTENER GASTOS POR CATEGORÍA Y PERÍODO
-- Permite obtener un desglose de gastos por categoría en un período
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_expenses_by_category(
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
-- FUNCIÓN: OBTENER RESUMEN DE INVENTARIO
-- Proporciona un resumen del inventario actual con análisis de rotación
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_inventory_summary(
    p_organization_id UUID
)
RETURNS TABLE (
    category TEXT,
    product_count BIGINT,
    total_stock BIGINT,
    low_stock_items BIGINT,
    out_of_stock_items BIGINT,
    inventory_value NUMERIC,
    slow_moving_items BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH inventory_data AS (
        SELECT
            p.category,
            COUNT(*) AS product_count,
            SUM(p.stock_quantity) AS total_stock,
            COUNT(CASE WHEN p.stock_quantity <= COALESCE(p.min_stock_level, 5) AND p.stock_quantity > 0 THEN 1 END) AS low_stock_items,
            COUNT(CASE WHEN p.stock_quantity = 0 THEN 1 END) AS out_of_stock_items,
            SUM(p.stock_quantity * p.price) AS inventory_value,
            COUNT(CASE 
                WHEN COALESCE(sales.units_sold, 0) = 0 AND p.created_at < CURRENT_DATE - INTERVAL '30 days' THEN 1
                ELSE NULL
            END) AS slow_moving_items
        FROM
            products p
        LEFT JOIN (
            SELECT
                oi.product_id,
                SUM(oi.quantity) AS units_sold
            FROM
                order_items oi
            JOIN
                orders o ON oi.order_id = o.id
            WHERE
                o.created_at >= CURRENT_DATE - INTERVAL '30 days'
                AND o.organization_id = p_organization_id
            GROUP BY
                oi.product_id
        ) sales ON p.id = sales.product_id
        WHERE
            p.organization_id = p_organization_id
        GROUP BY
            p.category
    )
    SELECT
        id.category,
        id.product_count,
        id.total_stock,
        id.low_stock_items,
        id.out_of_stock_items,
        id.inventory_value,
        id.slow_moving_items
    FROM
        inventory_data id
    ORDER BY
        id.inventory_value DESC;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- FUNCIÓN: OBTENER ANÁLISIS DE TENDENCIAS
-- Proporciona datos para análisis de tendencias por período seleccionado
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_sales_trends(
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
    SELECT
        CASE
            WHEN p_period = 'daily' THEN TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD')
            WHEN p_period = 'weekly' THEN TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-"W"IW')
            WHEN p_period = 'monthly' THEN TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')
            WHEN p_period = 'quarterly' THEN TO_CHAR(DATE_TRUNC('quarter', created_at), 'YYYY-"Q"Q')
            WHEN p_period = 'yearly' THEN TO_CHAR(DATE_TRUNC('year', created_at), 'YYYY')
            ELSE TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD')
        END AS time_period,
        COUNT(*) AS order_count,
        SUM(total) AS total_sales,
        AVG(total) AS average_order_value
    FROM
        orders
    WHERE
        organization_id = p_organization_id
        AND created_at BETWEEN p_start_date AND p_end_date + INTERVAL '1 day'
    GROUP BY
        time_period
    ORDER BY
        MIN(created_at);
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- INDEX PARA OPTIMIZAR CONSULTAS
-- Creación de índices para mejorar el rendimiento de las consultas
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_date ON service_bookings(scheduled_date); 