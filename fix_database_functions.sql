-- حذف الدوال الموجودة أولاً
DROP FUNCTION IF EXISTS public.get_sales_summary(uuid, timestamp with time zone, timestamp with time zone, uuid);
DROP FUNCTION IF EXISTS public.get_inventory_status(uuid);
DROP FUNCTION IF EXISTS public.get_inventory_status(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_inventory_status_v2(uuid);
DROP FUNCTION IF EXISTS public.get_expenses_by_category(uuid, timestamp with time zone, timestamp with time zone, uuid);

-- إصلاح دالة get_sales_summary - مشكلة: ooi.online_order_id لا يوجد
CREATE OR REPLACE FUNCTION public.get_sales_summary(
    p_organization_id uuid,
    p_start_date timestamp with time zone,
    p_end_date timestamp with time zone,
    p_admin_id uuid DEFAULT NULL
)
    RETURNS TABLE(total_sales numeric, total_profit numeric) 
    LANGUAGE plpgsql
AS $function$
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
        AND (p_admin_id IS NULL OR o.employee_id = p_admin_id);

    -- 2. حساب إجمالي المبيعات والأرباح من المتجر الإلكتروني (جدول online_orders و online_order_items)
    SELECT 
        COALESCE(SUM(oo.total), 0),
        COALESCE(SUM(
            oo.total - (
                SELECT COALESCE(SUM(p.purchase_price * ooi.quantity), 0)
                FROM online_order_items ooi
                JOIN products p ON ooi.product_id = p.id
                WHERE ooi.order_id = oo.id
            )
        ), 0)
    INTO v_online_sales, v_online_profit
    FROM online_orders oo
    WHERE 
        oo.organization_id = p_organization_id
        AND oo.created_at BETWEEN p_start_date AND p_end_date
        AND oo.status != 'cancelled'
        AND (p_admin_id IS NULL OR oo.employee_id = p_admin_id);

    -- 3. جمع النتائج الإجمالية
    v_total_sales := v_pos_sales + v_online_sales;
    v_total_profit := v_pos_profit + v_online_profit;

    -- 4. إرجاع النتائج
    RETURN QUERY SELECT v_total_sales, v_total_profit;
END;
$function$;

-- إنشاء دالة جديدة بدلاً من إصلاح الدالة الموجودة لتجنب مشاكل تغيير نوع البيانات
CREATE OR REPLACE FUNCTION public.get_inventory_status_v2(
    p_organization_id uuid,
    p_admin_id uuid DEFAULT NULL
)
    RETURNS TABLE(total_value numeric, low_stock_count bigint, out_of_stock_count bigint, total_products bigint) 
    LANGUAGE sql
AS $function$
    WITH admin_products AS (
        -- الحصول على المنتجات المرتبطة بالمسؤول من خلال سجل المخزون
        SELECT DISTINCT product_id 
        FROM inventory_log 
        WHERE organization_id = p_organization_id 
          AND created_by = p_admin_id
          AND p_admin_id IS NOT NULL
        
        UNION
        
        -- إضافة جميع المنتجات إذا كان المسؤول غير محدد
        SELECT id AS product_id
        FROM products
        WHERE organization_id = p_organization_id
          AND p_admin_id IS NULL
    )
    SELECT 
        COALESCE(SUM(p.stock_quantity * p.purchase_price), 0)::numeric AS total_value,
        COUNT(CASE WHEN p.stock_quantity <= p.min_stock_level AND p.stock_quantity > 0 THEN 1 END)::bigint AS low_stock_count,
        COUNT(CASE WHEN p.stock_quantity = 0 THEN 1 END)::bigint AS out_of_stock_count,
        COUNT(p.id)::bigint AS total_products
    FROM products p
    WHERE p.organization_id = p_organization_id
      AND (
          p_admin_id IS NULL -- إذا كان المسؤول غير محدد، عرض جميع المنتجات
          OR p.id IN (SELECT product_id FROM admin_products) -- عرض فقط المنتجات المرتبطة بالمسؤول
      );
$function$;

-- إصلاح دالة get_expenses_by_category - مشكلة: e.category_id لا يوجد، وبدلاً من ذلك هناك e.category
CREATE OR REPLACE FUNCTION public.get_expenses_by_category(
    p_organization_id uuid,
    p_start_date timestamp with time zone,
    p_end_date timestamp with time zone,
    p_admin_id uuid DEFAULT NULL
)
    RETURNS TABLE(category_name text, total_amount numeric) 
    LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ec.name AS category_name,
        COALESCE(SUM(e.amount), 0) AS total_amount
    FROM expenses e
    JOIN expense_categories ec ON e.category::UUID = ec.id
    WHERE 
        e.organization_id = p_organization_id
        AND e.expense_date BETWEEN p_start_date AND p_end_date
        AND (p_admin_id IS NULL OR e.created_by = p_admin_id)
    GROUP BY ec.name
    ORDER BY total_amount DESC;
END;
$function$;

-- أيضًا تحديث الجانب الخاص بالتطبيق لاستخدام الدالة الجديدة
CREATE OR REPLACE FUNCTION public.get_inventory_status(
    p_organization_id uuid,
    p_admin_id uuid DEFAULT NULL
)
    RETURNS TABLE(total_value numeric, low_stock_count integer, out_of_stock_count integer, total_products integer) 
    LANGUAGE sql
AS $function$
    -- استدعاء الدالة الجديدة وتحويل النتائج إلى النوع المطلوب
    SELECT 
        total_value,
        low_stock_count::integer, 
        out_of_stock_count::integer, 
        total_products::integer
    FROM get_inventory_status_v2(p_organization_id, p_admin_id);
$function$; 