-- ===================================================================
-- إصلاح مشكلة الخدمات لتظهر حسب المسؤول الصحيح
-- ===================================================================

-- ---------------------------------------------------------------------
-- 1. التأكد من أن كل الخدمات مرتبطة بالمؤسسة الصحيحة
-- ---------------------------------------------------------------------

-- تحديث سجلات service_bookings التي لا تحتوي على معرف مؤسسة
-- وربطها بالمؤسسة المرتبطة بالخدمة نفسها
UPDATE service_bookings sb
SET organization_id = s.organization_id
FROM services s
WHERE sb.service_id = s.id 
AND (sb.organization_id IS NULL OR sb.organization_id = '00000000-0000-0000-0000-000000000000');

-- ---------------------------------------------------------------------
-- 2. إضافة قيود وإجراءات محفزة لضمان ملء حقل المؤسسة دائمًا
-- ---------------------------------------------------------------------

-- التأكد من أن حقل organization_id غير فارغ
ALTER TABLE service_bookings 
ALTER COLUMN organization_id SET NOT NULL;

-- إضافة إجراء محفز يتم تنفيذه قبل إدخال سجل جديد أو تحديث سجل موجود
CREATE OR REPLACE FUNCTION ensure_service_booking_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كان معرف المؤسسة فارغًا، املأه من جدول الخدمات
    IF NEW.organization_id IS NULL OR NEW.organization_id = '00000000-0000-0000-0000-000000000000' THEN
        SELECT organization_id INTO NEW.organization_id
        FROM services
        WHERE id = NEW.service_id;
    END IF;
    
    -- التأكد من أن معرف المؤسسة ليس فارغًا بعد المحاولة
    IF NEW.organization_id IS NULL OR NEW.organization_id = '00000000-0000-0000-0000-000000000000' THEN
        RAISE EXCEPTION 'organization_id cannot be null for service bookings';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إزالة المحفز القديم إذا كان موجودًا
DROP TRIGGER IF EXISTS service_booking_organization_id_trigger ON service_bookings;

-- إنشاء محفز جديد
CREATE TRIGGER service_booking_organization_id_trigger
BEFORE INSERT OR UPDATE ON service_bookings
FOR EACH ROW
EXECUTE FUNCTION ensure_service_booking_organization_id();

-- ---------------------------------------------------------------------
-- 3. تحديث سياسات RLS لطلبات الخدمات
-- ---------------------------------------------------------------------

-- إزالة السياسات الحالية لجدول service_bookings
DROP POLICY IF EXISTS "Allow admin and employee select all service bookings" ON service_bookings;
DROP POLICY IF EXISTS "Allow select own service bookings" ON service_bookings;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON service_bookings;

-- إضافة سياسات جديدة بناءً على تفويض المؤسسة
CREATE POLICY "org_tenant_service_bookings_select" ON service_bookings
    FOR SELECT USING (
        organization_id = (
            SELECT users.organization_id
            FROM users
            WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "org_tenant_service_bookings_insert" ON service_bookings
    FOR INSERT WITH CHECK (
        organization_id = (
            SELECT users.organization_id
            FROM users
            WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "org_tenant_service_bookings_update" ON service_bookings
    FOR UPDATE USING (
        organization_id = (
            SELECT users.organization_id
            FROM users
            WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "org_tenant_service_bookings_delete" ON service_bookings
    FOR DELETE USING (
        organization_id = (
            SELECT users.organization_id
            FROM users
            WHERE users.id = auth.uid()
        )
    );

-- إضافة سياسة للسماح للمسؤولين وموظفي المؤسسة نفسها بالوصول
CREATE POLICY "Allow admin and employee select org service bookings" ON service_bookings
    FOR SELECT USING (
        (auth.jwt() ->> 'role') IN ('admin', 'employee') AND
        organization_id = (
            SELECT users.organization_id
            FROM users
            WHERE users.id = auth.uid()
        )
    );

-- السماح للعملاء بالوصول لطلبات الخدمات الخاصة بهم فقط
CREATE POLICY "Allow customers select own service bookings" ON service_bookings
    FOR SELECT USING (
        (customer_id = auth.uid() OR 
         EXISTS (
            SELECT 1
            FROM orders
            WHERE orders.id = service_bookings.order_id AND orders.customer_id = auth.uid()
        ))
    );

-- قواعد التتبع العام للخدمات
CREATE POLICY "Allow tracking by public_tracking_code" ON service_bookings
    FOR SELECT USING (
        public_tracking_code IS NOT NULL
    );

-- ---------------------------------------------------------------------
-- 4. تعديل دالة get_services_sales_summary_v2 للتعامل مع حالات المؤسسة بشكل أفضل
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS get_services_sales_summary_v2(uuid, date, date);

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
    -- حساب إجمالي مبيعات الخدمات بشكل أكثر دقة
    SELECT COALESCE(SUM(sb.price), 0) INTO v_total_services
    FROM service_bookings sb
    JOIN services s ON sb.service_id = s.id
    WHERE 
        (sb.organization_id = p_organization_id OR s.organization_id = p_organization_id)
        AND sb.status = 'completed'
        AND sb.scheduled_date BETWEEN p_start_date AND p_end_date;

    -- إذا لم تكن هناك خدمات، أرجع مجموعة فارغة مع قيمة افتراضية لتجنب القسمة على صفر
    IF v_total_services IS NULL OR v_total_services = 0 THEN
        v_total_services := 1; -- لتجنب القسمة على صفر
    END IF;

    -- استعلام محسن لإحصائيات الخدمات
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
        (sb.organization_id = p_organization_id OR s.organization_id = p_organization_id)
        AND sb.status = 'completed'
        AND sb.scheduled_date BETWEEN p_start_date AND p_end_date
    GROUP BY
        s.name
    ORDER BY
        total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 5. تحديث دالة get_financial_summary_v2 لتعامل أفضل مع بيانات الخدمات
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS get_financial_summary_v2(uuid, date, date);

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
        JOIN 
            services s ON sb.service_id = s.id
        WHERE
            (sb.organization_id = p_organization_id OR s.organization_id = p_organization_id)
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
-- 6. تعديل دالة get_sales_trends_v2 للتعامل مع بيانات الخدمات بشكل أفضل
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS get_sales_trends_v2(uuid, text, date, date);

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
                WHEN p_period = 'daily' THEN TO_CHAR(DATE_TRUNC('day', sb.scheduled_date), 'YYYY-MM-DD')
                WHEN p_period = 'weekly' THEN TO_CHAR(DATE_TRUNC('week', sb.scheduled_date), 'YYYY-"W"IW')
                WHEN p_period = 'monthly' THEN TO_CHAR(DATE_TRUNC('month', sb.scheduled_date), 'YYYY-MM')
                WHEN p_period = 'quarterly' THEN TO_CHAR(DATE_TRUNC('quarter', sb.scheduled_date), 'YYYY-"Q"Q')
                WHEN p_period = 'yearly' THEN TO_CHAR(DATE_TRUNC('year', sb.scheduled_date), 'YYYY')
                ELSE TO_CHAR(DATE_TRUNC('day', sb.scheduled_date), 'YYYY-MM-DD')
            END AS sb_time_period,
            COUNT(*) AS sb_service_count,
            SUM(sb.price) AS sb_service_sales
        FROM
            service_bookings sb
        JOIN 
            services s ON sb.service_id = s.id
        WHERE
            (sb.organization_id = p_organization_id OR s.organization_id = p_organization_id)
            AND sb.status = 'completed'
            AND sb.scheduled_date BETWEEN p_start_date AND p_end_date
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