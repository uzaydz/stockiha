-- تحديثات وظائف SQL لصفحة تحليلات المبيعات

-- دالة للتحقق مما إذا كان المستخدم هو مدير المؤسسة
CREATE OR REPLACE FUNCTION is_organization_admin(
    p_user_id UUID,
    p_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- التحقق مما إذا كان المستخدم هو مدير المؤسسة
    SELECT EXISTS (
        SELECT 1
        FROM users u
        WHERE 
            u.id = p_user_id
            AND u.organization_id = p_organization_id
            AND u.is_org_admin = TRUE
    ) INTO v_is_admin;
    
    RETURN v_is_admin;
END;
$$ LANGUAGE plpgsql;

-- تحديث دالة للحصول على ملخص المبيعات
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
    
    -- متغير للتحقق إذا كان المستخدم مديرا
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- التحقق مما إذا كان المستخدم مديرًا للمؤسسة
    IF p_admin_id IS NOT NULL THEN
        SELECT is_organization_admin(p_admin_id, p_organization_id) INTO v_is_admin;
    END IF;
    
    -- 1. حساب إجمالي المبيعات والأرباح من نقاط البيع (جدول orders وorder_items)
    -- إذا كان المستخدم مديرًا، سيرى كل البيانات، وإلا سيرى فقط البيانات التي أنشأها
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
        AND (
            p_admin_id IS NULL 
            OR v_is_admin = TRUE 
            OR o.created_by = p_admin_id
        );

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
        AND (
            p_admin_id IS NULL 
            OR v_is_admin = TRUE 
            OR oo.created_by = p_admin_id
        );

    -- 3. جمع النتائج الإجمالية
    v_total_sales := v_pos_sales + v_online_sales;
    v_total_profit := v_pos_profit + v_online_profit;

    -- 4. إرجاع النتائج
    RETURN QUERY SELECT v_total_sales, v_total_profit;
END;
$$ LANGUAGE plpgsql;

-- تحديث دالة للحصول على إحصائيات الطلبات
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
DECLARE
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- التحقق مما إذا كان المستخدم مديرًا للمؤسسة
    IF p_admin_id IS NOT NULL THEN
        SELECT is_organization_admin(p_admin_id, p_organization_id) INTO v_is_admin;
    END IF;
    
    RETURN QUERY
    SELECT 
        COUNT(o.id) AS total_orders,
        CASE WHEN COUNT(o.id) > 0 THEN ROUND(COALESCE(SUM(o.total), 0) / COUNT(o.id), 2) ELSE 0 END AS avg_order_value
    FROM orders o
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled'
        AND (
            p_admin_id IS NULL 
            OR v_is_admin = TRUE 
            OR o.created_by = p_admin_id
        );
END;
$$ LANGUAGE plpgsql;

-- تحديث دالة للحصول على المبيعات حسب القناة (نقاط البيع والأونلاين)
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
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- التحقق مما إذا كان المستخدم مديرًا للمؤسسة
    IF p_admin_id IS NOT NULL THEN
        SELECT is_organization_admin(p_admin_id, p_organization_id) INTO v_is_admin;
    END IF;
    
    -- الحصول على مبيعات نقاط البيع من جدول orders
    SELECT COALESCE(SUM(o.total), 0) INTO v_pos_sales
    FROM orders o
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled'
        AND (o.is_online = FALSE OR o.is_online IS NULL)
        AND (
            p_admin_id IS NULL 
            OR v_is_admin = TRUE 
            OR o.created_by = p_admin_id
        );
    
    -- الحصول على المبيعات الإلكترونية من جدول online_orders
    SELECT COALESCE(SUM(oo.total), 0) INTO v_online_sales
    FROM online_orders oo
    WHERE 
        oo.organization_id = p_organization_id
        AND oo.created_at BETWEEN p_start_date AND p_end_date
        AND oo.status != 'cancelled'
        AND (
            p_admin_id IS NULL 
            OR v_is_admin = TRUE 
            OR oo.created_by = p_admin_id
        );
    
    -- إرجاع النتائج
    RETURN QUERY SELECT v_pos_sales, v_online_sales;
END;
$$ LANGUAGE plpgsql;

-- تحديث دالة للحصول على المبيعات حسب الفترة (يومي، أسبوعي، شهري)
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
DECLARE
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- التحقق مما إذا كان المستخدم مديرًا للمؤسسة
    IF p_admin_id IS NOT NULL THEN
        SELECT is_organization_admin(p_admin_id, p_organization_id) INTO v_is_admin;
    END IF;

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
            AND (
                p_admin_id IS NULL 
                OR v_is_admin = TRUE 
                OR o.created_by = p_admin_id
            )
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
            AND (
                p_admin_id IS NULL 
                OR v_is_admin = TRUE 
                OR o.created_by = p_admin_id
            )
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
            AND (
                p_admin_id IS NULL 
                OR v_is_admin = TRUE 
                OR o.created_by = p_admin_id
            )
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY DATE_TRUNC('month', o.created_at);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- تحديث دالة للحصول على أعلى المنتجات مبيعًا
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
DECLARE
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- التحقق مما إذا كان المستخدم مديرًا للمؤسسة
    IF p_admin_id IS NOT NULL THEN
        SELECT is_organization_admin(p_admin_id, p_organization_id) INTO v_is_admin;
    END IF;

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
        AND (
            p_admin_id IS NULL 
            OR v_is_admin = TRUE 
            OR o.created_by = p_admin_id
        )
    GROUP BY oi.product_id
    ORDER BY total_sales DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- تحديث دالة للحصول على أعلى الفئات مبيعًا
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
DECLARE
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- التحقق مما إذا كان المستخدم مديرًا للمؤسسة
    IF p_admin_id IS NOT NULL THEN
        SELECT is_organization_admin(p_admin_id, p_organization_id) INTO v_is_admin;
    END IF;

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
        AND (
            p_admin_id IS NULL 
            OR v_is_admin = TRUE 
            OR o.created_by = p_admin_id
        )
    GROUP BY pc.id, pc.name
    ORDER BY total_sales DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- تحديث دالة للحصول على إجمالي المصروفات
CREATE OR REPLACE FUNCTION get_total_expenses(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    total_expenses NUMERIC
) AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- التحقق مما إذا كان المستخدم مديرًا للمؤسسة
    IF p_admin_id IS NOT NULL THEN
        SELECT is_organization_admin(p_admin_id, p_organization_id) INTO v_is_admin;
    END IF;

    RETURN QUERY
    SELECT 
        COALESCE(SUM(e.amount), 0) AS total_expenses
    FROM expenses e
    WHERE 
        e.organization_id = p_organization_id
        AND e.expense_date BETWEEN p_start_date AND p_end_date
        AND (
            p_admin_id IS NULL 
            OR v_is_admin = TRUE 
            OR e.created_by = p_admin_id
        );
END;
$$ LANGUAGE plpgsql;

-- تحديث دالة للحصول على المصروفات حسب الفئة
CREATE OR REPLACE FUNCTION get_expenses_by_category(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    category_name TEXT,
    total_amount NUMERIC
) AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- التحقق مما إذا كان المستخدم مديرًا للمؤسسة
    IF p_admin_id IS NOT NULL THEN
        SELECT is_organization_admin(p_admin_id, p_organization_id) INTO v_is_admin;
    END IF;

    RETURN QUERY
    SELECT 
        ec.name AS category_name,
        COALESCE(SUM(e.amount), 0) AS total_amount
    FROM expenses e
    JOIN expense_categories ec ON e.category_id = ec.id
    WHERE 
        e.organization_id = p_organization_id
        AND e.expense_date BETWEEN p_start_date AND p_end_date
        AND (
            p_admin_id IS NULL 
            OR v_is_admin = TRUE 
            OR e.created_by = p_admin_id
        )
    GROUP BY ec.name
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- تحديث دالة للحصول على حالة المخزون
CREATE OR REPLACE FUNCTION get_inventory_status(
    p_organization_id UUID,
    p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE(
    total_value NUMERIC,
    low_stock_count INTEGER,
    out_of_stock_count INTEGER,
    total_products INTEGER
) AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- التحقق مما إذا كان المستخدم مديرًا للمؤسسة
    IF p_admin_id IS NOT NULL THEN
        SELECT is_organization_admin(p_admin_id, p_organization_id) INTO v_is_admin;
    END IF;

    RETURN QUERY
    WITH product_counts AS (
        SELECT 
            COUNT(*) AS total,
            COUNT(CASE WHEN p.stock_quantity <= p.low_stock_threshold AND p.stock_quantity > 0 THEN 1 END) AS low_stock,
            COUNT(CASE WHEN p.stock_quantity = 0 THEN 1 END) AS out_of_stock,
            COALESCE(SUM(p.purchase_price * p.stock_quantity), 0) AS inventory_value
        FROM products p
        WHERE 
            p.organization_id = p_organization_id
            AND (
                p_admin_id IS NULL 
                OR v_is_admin = TRUE 
                OR p.created_by = p_admin_id
            )
    )
    SELECT 
        inventory_value AS total_value,
        low_stock AS low_stock_count,
        out_of_stock AS out_of_stock_count,
        total AS total_products
    FROM product_counts;
END;
$$ LANGUAGE plpgsql;

-- تحديث باقي الوظائف بنفس المنطق...
-- يمكن إضافة المزيد من الوظائف المحدثة هنا 