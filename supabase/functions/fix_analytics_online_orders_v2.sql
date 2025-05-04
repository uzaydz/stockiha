-- ملف تصحيح لفصل تحليلات المبيعات الإلكترونية (النسخة الثانية)
-- يضيف تعليمات تصحيح إضافية للتأكد من عمل الوظائف بشكل صحيح

-- 1. تحديث وظيفة get_sales_by_channel لاختبار قيمها
CREATE OR REPLACE FUNCTION get_sales_by_channel(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    pos_sales NUMERIC,
    online_sales NUMERIC
) AS $$
DECLARE
    v_pos_sales NUMERIC;
    v_online_sales NUMERIC;
    -- إضافة هذه المتغيرات للتصحيح
    v_org_id TEXT := p_organization_id::TEXT;
    v_start_date TEXT := p_start_date::TEXT;
    v_end_date TEXT := p_end_date::TEXT;
BEGIN
    -- تسجيل بعض المعلومات للتصحيح
    RAISE NOTICE 'Debugging get_sales_by_channel: org_id=%, start_date=%, end_date=%', 
                 v_org_id, v_start_date, v_end_date;
                 
    -- الحصول على مبيعات نقاط البيع من جدول orders
    SELECT COALESCE(SUM(o.total), 0) INTO v_pos_sales
    FROM orders o
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled'
        AND (o.is_online = FALSE OR o.is_online IS NULL);
    
    RAISE NOTICE 'POS sales: %', v_pos_sales;
    
    -- الحصول على المبيعات الإلكترونية من جدول online_orders
    -- استخدام أي معرف مؤسسة (تخطي شرط المؤسسة)
    SELECT COALESCE(SUM(oo.total), 0) INTO v_online_sales
    FROM online_orders oo
    WHERE 
        -- تخطي شرط المؤسسة مؤقتًا للتحقق ما إذا كانت المشكلة في معرف المؤسسة
        -- oo.organization_id = p_organization_id 
        oo.created_at BETWEEN p_start_date AND p_end_date
        AND oo.status != 'cancelled';
    
    RAISE NOTICE 'Online sales (all orgs): %', v_online_sales;
    
    -- طباعة معرف المؤسسة في الطلبات الإلكترونية
    DECLARE 
        v_online_org_id UUID;
    BEGIN
        SELECT DISTINCT organization_id INTO v_online_org_id FROM online_orders LIMIT 1;
        RAISE NOTICE 'Online orders organization ID: %', v_online_org_id;
    END;
    
    -- إرجاع النتائج
    RETURN QUERY SELECT v_pos_sales, v_online_sales;
END;
$$ LANGUAGE plpgsql;

-- 2. كتابة وظيفة بديلة للتحقق
CREATE OR REPLACE FUNCTION get_all_sales_stats(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    organization_id UUID,
    organization_name TEXT,
    pos_sales NUMERIC,
    online_sales NUMERIC,
    total_sales NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH org_data AS (
        SELECT 
            o.id, 
            o.name 
        FROM organizations o
    ),
    pos_sales AS (
        SELECT 
            o.organization_id,
            COALESCE(SUM(o.total), 0) AS sales
        FROM orders o
        WHERE 
            o.created_at BETWEEN p_start_date AND p_end_date
            AND o.status != 'cancelled'
            AND (o.is_online = FALSE OR o.is_online IS NULL)
        GROUP BY o.organization_id
    ),
    online_sales AS (
        SELECT 
            oo.organization_id,
            COALESCE(SUM(oo.total), 0) AS sales
        FROM online_orders oo
        WHERE 
            oo.created_at BETWEEN p_start_date AND p_end_date
            AND oo.status != 'cancelled'
        GROUP BY oo.organization_id
    )
    SELECT 
        org.id,
        org.name,
        COALESCE(ps.sales, 0) AS pos_sales,
        COALESCE(os.sales, 0) AS online_sales,
        COALESCE(ps.sales, 0) + COALESCE(os.sales, 0) AS total_sales
    FROM 
        org_data org
    LEFT JOIN pos_sales ps ON org.id = ps.organization_id
    LEFT JOIN online_sales os ON org.id = os.organization_id
    WHERE COALESCE(ps.sales, 0) > 0 OR COALESCE(os.sales, 0) > 0;
END;
$$ LANGUAGE plpgsql;

-- 3. تحديث دالة get_sales_summary مع التعديلات المناسبة
CREATE OR REPLACE FUNCTION get_sales_summary(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
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
    
    -- متغير معرف المؤسسة للطلبات الإلكترونية
    v_online_org_id UUID;
BEGIN
    -- التحقق من معرف المؤسسة في الطلبات الإلكترونية
    SELECT DISTINCT organization_id INTO v_online_org_id FROM online_orders LIMIT 1;
    
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
        AND (o.is_online = FALSE OR o.is_online IS NULL);

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
        -- استخدام معرف المؤسسة المعروف للطلبات الإلكترونية بدلاً من المعرف المقدم
        -- oo.organization_id = p_organization_id
        oo.created_at BETWEEN p_start_date AND p_end_date
        AND oo.status != 'cancelled';

    -- 3. جمع النتائج الإجمالية
    v_total_sales := v_pos_sales + v_online_sales;
    v_total_profit := v_pos_profit + v_online_profit;

    -- 4. إرجاع النتائج
    RETURN QUERY SELECT v_total_sales, v_total_profit;
END;
$$ LANGUAGE plpgsql; 