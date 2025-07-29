-- 🎯 دالة RPC شاملة للتحليلات المالية المتقدمة
-- تحسب جميع مصادر الإيرادات والأرباح بطريقة مثالية

-- 🗑️ حذف النسخ القديمة من الدالة لتجنب التعارض
DROP FUNCTION IF EXISTS get_complete_financial_analytics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID);
DROP FUNCTION IF EXISTS get_complete_financial_analytics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, BOOLEAN);

-- 🗑️ حذف جميع النسخ الممكنة من الدالة
DROP FUNCTION IF EXISTS get_complete_financial_analytics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_complete_financial_analytics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN);
DROP FUNCTION IF EXISTS get_complete_financial_analytics CASCADE;
DROP FUNCTION IF EXISTS get_complete_financial_analytics_advanced CASCADE;

-- 🗑️ حذف أي نسخ أخرى محتملة
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN 
    FOR func_record IN 
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname LIKE '%get_complete_financial_analytics%'
    LOOP 
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || func_record.proname || '(' || func_record.args || ') CASCADE';
    END LOOP; 
END $$;

CREATE OR REPLACE FUNCTION get_complete_financial_analytics_advanced(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_employee_id UUID DEFAULT NULL,
    -- فلاتر متقدمة جديدة
    p_branch_id UUID DEFAULT NULL,
    p_transaction_type TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_min_amount NUMERIC DEFAULT NULL,
    p_max_amount NUMERIC DEFAULT NULL,
    p_include_partial_payments BOOLEAN DEFAULT TRUE,
    p_include_refunds BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
    -- إجماليات رئيسية
    total_revenue NUMERIC,
    total_cost NUMERIC,
    total_gross_profit NUMERIC,
    total_expenses NUMERIC,
    total_net_profit NUMERIC,
    profit_margin_percentage NUMERIC,
    
    -- تفاصيل المبيعات
    pos_sales_revenue NUMERIC,
    pos_sales_cost NUMERIC,
    pos_sales_profit NUMERIC,
    pos_orders_count INTEGER,
    
    online_sales_revenue NUMERIC,
    online_sales_cost NUMERIC,
    online_sales_profit NUMERIC,
    online_orders_count INTEGER,
    
    -- الخدمات
    repair_services_revenue NUMERIC,
    repair_services_profit NUMERIC,
    repair_orders_count INTEGER,
    
    service_bookings_revenue NUMERIC,
    service_bookings_profit NUMERIC,
    service_bookings_count INTEGER,
    
    game_downloads_revenue NUMERIC,
    game_downloads_profit NUMERIC,
    game_downloads_count INTEGER,
    
    subscription_services_revenue NUMERIC,
    subscription_services_profit NUMERIC,
    subscription_transactions_count INTEGER,
    
    currency_sales_revenue NUMERIC,
    currency_sales_profit NUMERIC,
    currency_sales_count INTEGER,
    
    flexi_sales_revenue NUMERIC,
    flexi_sales_profit NUMERIC,
    flexi_sales_count INTEGER,
    
    -- المديونية
    total_debt_amount NUMERIC,
    debt_impact_on_capital NUMERIC,
    paid_debt_amount NUMERIC,
    
    -- الخسائر والإرجاعات
    total_losses_cost NUMERIC,
    total_losses_selling_value NUMERIC,
    total_returns_amount NUMERIC,
    
    -- المصروفات
    one_time_expenses NUMERIC,
    recurring_expenses_annual NUMERIC,
    
    -- تحليلات إضافية
    avg_order_value NUMERIC,
    total_transactions_count INTEGER,
    
    -- تفاصيل JSON للتحليل المتقدم
    detailed_breakdown JSONB,
    
    -- أفضل المنتجات مبيعاً
    top_pos_products JSONB,
    top_online_products JSONB,
    
    -- إحصائيات الطلبات
    pos_orders_stats JSONB,
    online_orders_stats JSONB
) AS $$
DECLARE
    -- متغيرات للمبيعات POS
    v_pos_sales_revenue NUMERIC := 0;
    v_pos_sales_cost NUMERIC := 0;
    v_pos_sales_profit NUMERIC := 0;
    v_pos_orders_count INTEGER := 0;
    
    -- متغيرات للمبيعات Online
    v_online_sales_revenue NUMERIC := 0;
    v_online_sales_cost NUMERIC := 0;
    v_online_sales_profit NUMERIC := 0;
    v_online_orders_count INTEGER := 0;
    
    -- متغيرات للخدمات
    v_repair_revenue NUMERIC := 0;
    v_repair_profit NUMERIC := 0;
    v_repair_count INTEGER := 0;
    
    v_service_bookings_revenue NUMERIC := 0;
    v_service_bookings_profit NUMERIC := 0;
    v_service_bookings_count INTEGER := 0;
    
    v_game_downloads_revenue NUMERIC := 0;
    v_game_downloads_profit NUMERIC := 0;
    v_game_downloads_count INTEGER := 0;
    
    v_subscription_revenue NUMERIC := 0;
    v_subscription_cost NUMERIC := 0;
    v_subscription_profit NUMERIC := 0;
    v_subscription_count INTEGER := 0;
    
    v_currency_revenue NUMERIC := 0;
    v_currency_profit NUMERIC := 0;
    v_currency_count INTEGER := 0;
    
    v_flexi_revenue NUMERIC := 0;
    v_flexi_profit NUMERIC := 0;
    v_flexi_count INTEGER := 0;
    
    -- متغيرات المديونية والخسائر
    v_total_debt NUMERIC := 0;
    v_debt_impact NUMERIC := 0;
    v_paid_debt NUMERIC := 0;
    
    v_losses_cost NUMERIC := 0;
    v_losses_selling NUMERIC := 0;
    v_returns_amount NUMERIC := 0;
    
    -- متغيرات المصروفات
    v_one_time_expenses NUMERIC := 0;
    v_recurring_expenses NUMERIC := 0;
    
    -- متغيرات إجمالية
    v_total_revenue NUMERIC := 0;
    v_total_cost NUMERIC := 0;
    v_total_gross_profit NUMERIC := 0;
    v_total_expenses NUMERIC := 0;
    v_total_net_profit NUMERIC := 0;
    v_profit_margin NUMERIC := 0;
    v_avg_order_value NUMERIC := 0;
    v_total_transactions INTEGER := 0;
    
    v_detailed_breakdown JSONB;
    
    -- متغيرات للمنتجات والطلبات
    v_top_pos_products JSONB;
    v_top_online_products JSONB;
    v_pos_orders_stats JSONB;
    v_online_orders_stats JSONB;
BEGIN
    
    -- 🛒 1. حساب أرباح مبيعات نقطة البيع (POS)
    SELECT 
        COALESCE(SUM(o.total), 0),
        COALESCE(SUM(
            CASE 
                -- حساب التكلفة باستخدام نظام FIFO أو سعر الشراء العادي
                WHEN EXISTS (
                    SELECT 1 FROM inventory_batches ib 
                    JOIN order_items oi ON oi.product_id = ib.product_id 
                    WHERE oi.order_id = o.id
                ) THEN (
                    -- استخدام FIFO cost من inventory_batches
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN oi.color_id IS NOT NULL OR oi.size_id IS NOT NULL THEN
                                -- للمتغيرات: استخدام متوسط سعر المتغير أو السعر الأساسي
                                COALESCE(
                                    (SELECT pc.purchase_price FROM product_colors pc WHERE pc.id = oi.color_id),
                                    (SELECT ps.purchase_price FROM product_sizes ps WHERE ps.id = oi.size_id),
                                    p.purchase_price
                                ) * oi.quantity
                            ELSE
                                -- للمنتجات العادية: أقدم تكلفة FIFO (أول داخل أول خارج)
                                COALESCE(
                                    (SELECT purchase_price FROM inventory_batches 
                                     WHERE product_id = p.id AND is_active = true 
                                     ORDER BY created_at ASC LIMIT 1),
                                    p.purchase_price
                                ) * oi.quantity
                        END
                    ), 0)
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = o.id
                )
                ELSE (
                    -- الطريقة التقليدية للمنتجات بدون FIFO
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN oi.color_id IS NOT NULL THEN
                                COALESCE(
                                    (SELECT pc.purchase_price FROM product_colors pc WHERE pc.id = oi.color_id),
                                    p.purchase_price
                                ) * oi.quantity
                            WHEN oi.size_id IS NOT NULL THEN
                                COALESCE(
                                    (SELECT ps.purchase_price FROM product_sizes ps WHERE ps.id = oi.size_id),
                                    p.purchase_price
                                ) * oi.quantity
                            ELSE
                                p.purchase_price * oi.quantity
                        END
                    ), 0)
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = o.id
                )
            END
        ), 0),
        COUNT(*)
    INTO v_pos_sales_revenue, v_pos_sales_cost, v_pos_orders_count
    FROM orders o
    WHERE 
        o.organization_id = p_organization_id
        AND o.created_at >= p_start_date::timestamp
        AND o.created_at < (p_end_date::timestamp + INTERVAL '1 day')
        AND o.status != 'cancelled'
        AND (o.is_online = FALSE OR o.is_online IS NULL)
        AND (p_employee_id IS NULL OR o.employee_id = p_employee_id)
        -- ✅ الشرط المهم: كل طلب مدفوع أو مدفوع جزئياً يحسب فائدته كاملة
        AND (
            CASE 
                WHEN p_include_partial_payments = TRUE THEN (o.amount_paid > 0 OR o.payment_status = 'paid')
                ELSE o.payment_status = 'paid'
            END
        )
        -- 🔍 فلاتر متقدمة جديدة (تم إزالة branch_id من orders لأنه غير موجود)
        -- AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
        AND (p_transaction_type IS NULL OR p_transaction_type = 'all' OR p_transaction_type = 'pos')
        AND (p_payment_method IS NULL OR p_payment_method = 'all' OR o.payment_method = p_payment_method)
        AND (p_min_amount IS NULL OR o.total >= p_min_amount)
        AND (p_max_amount IS NULL OR o.total <= p_max_amount);
    
    v_pos_sales_profit := v_pos_sales_revenue - v_pos_sales_cost;
    
    -- 🌐 2. حساب أرباح المبيعات الإلكترونية
    SELECT 
        COALESCE(SUM(oo.total), 0),
        COALESCE(SUM(
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM inventory_batches ib 
                    JOIN online_order_items ooi ON ooi.product_id = ib.product_id 
                    WHERE ooi.order_id = oo.id
                ) THEN (
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN ooi.color_id IS NOT NULL OR ooi.size_id IS NOT NULL THEN
                                COALESCE(
                                    (SELECT pc.purchase_price FROM product_colors pc WHERE pc.id = ooi.color_id),
                                    (SELECT ps.purchase_price FROM product_sizes ps WHERE ps.id = ooi.size_id),
                                    p.purchase_price
                                ) * ooi.quantity
                            ELSE
                                COALESCE(
                                    (SELECT AVG(purchase_price) FROM inventory_batches 
                                     WHERE product_id = p.id AND is_active = true),
                                    p.purchase_price
                                ) * ooi.quantity
                        END
                    ), 0)
                    FROM online_order_items ooi
                    JOIN products p ON ooi.product_id = p.id
                    WHERE ooi.order_id = oo.id
                )
                ELSE (
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN ooi.color_id IS NOT NULL THEN
                                COALESCE(
                                    (SELECT pc.purchase_price FROM product_colors pc WHERE pc.id = ooi.color_id),
                                    p.purchase_price
                                ) * ooi.quantity
                            WHEN ooi.size_id IS NOT NULL THEN
                                COALESCE(
                                    (SELECT ps.purchase_price FROM product_sizes ps WHERE ps.id = ooi.size_id),
                                    p.purchase_price
                                ) * ooi.quantity
                            ELSE
                                p.purchase_price * ooi.quantity
                        END
                    ), 0)
                    FROM online_order_items ooi
                    JOIN products p ON ooi.product_id = p.id
                    WHERE ooi.order_id = oo.id
                )
            END
        ), 0),
        COUNT(*)
    INTO v_online_sales_revenue, v_online_sales_cost, v_online_orders_count
    FROM online_orders oo
    WHERE 
        oo.organization_id = p_organization_id
        AND oo.created_at >= p_start_date::timestamp
        AND oo.created_at < (p_end_date::timestamp + INTERVAL '1 day')
        AND oo.status != 'cancelled'
        -- ✅ فقط الطلبيات المؤكدة أو المرسلة أو المسلمة (للدفع عند التوصيل)
        AND (
            CASE 
                WHEN p_include_refunds = TRUE THEN 
                    (
                        -- الطلبيات المؤكدة عبر call center
                        EXISTS (
                            SELECT 1 FROM call_confirmation_statuses 
                            WHERE id = oo.call_confirmation_status_id 
                            AND organization_id = p_organization_id
                            AND name = 'مؤكد'
                        )
                        OR 
                        -- الطلبيات المرسلة أو المسلمة
                        oo.status IN ('shipped', 'delivered')
                    )
                ELSE 
                    (
                        -- الطلبيات المؤكدة عبر call center
                        EXISTS (
                            SELECT 1 FROM call_confirmation_statuses 
                            WHERE id = oo.call_confirmation_status_id 
                            AND organization_id = p_organization_id
                            AND name = 'مؤكد'
                        )
                        OR 
                        -- الطلبيات المرسلة أو المسلمة
                        oo.status IN ('shipped', 'delivered')
                    ) AND oo.status != 'returned'
            END
        )
        AND (p_employee_id IS NULL OR oo.employee_id = p_employee_id)
        -- 🔍 فلاتر متقدمة جديدة للمبيعات الإلكترونية (تم إزالة branch_id من online_orders لأنه غير موجود)
        -- AND (p_branch_id IS NULL OR oo.branch_id = p_branch_id)
        AND (p_transaction_type IS NULL OR p_transaction_type = 'all' OR p_transaction_type = 'online')
        AND (p_payment_method IS NULL OR p_payment_method = 'all' OR oo.payment_method = p_payment_method)
        AND (p_min_amount IS NULL OR oo.total >= p_min_amount)
        AND (p_max_amount IS NULL OR oo.total <= p_max_amount);
    
    v_online_sales_profit := v_online_sales_revenue - v_online_sales_cost;
    
    -- 🔧 3. حساب أرباح خدمات التصليح
    SELECT 
        COALESCE(SUM(CASE WHEN paid_amount > 0 THEN paid_amount ELSE 0 END), 0),
        COUNT(CASE WHEN paid_amount > 0 THEN 1 END)
    INTO v_repair_revenue, v_repair_count
    FROM repair_orders
    WHERE 
        organization_id = p_organization_id
        AND created_at >= p_start_date::timestamp AND created_at < (p_end_date::timestamp + INTERVAL '1 day')
        AND status NOT IN ('ملغي', 'cancelled') -- استبعاد الطلبيات الملغية
        AND (p_employee_id IS NULL OR received_by = p_employee_id)
        -- 🔍 فلاتر متقدمة جديدة لخدمات التصليح (تم إزالة branch_id لأنه غير موجود)
        -- AND (p_branch_id IS NULL OR branch_id = p_branch_id)
        AND (p_transaction_type IS NULL OR p_transaction_type = 'all' OR p_transaction_type = 'repair')
        AND (p_payment_method IS NULL OR p_payment_method = 'all' OR payment_method = p_payment_method)
        AND (p_min_amount IS NULL OR total_cost >= p_min_amount)
        AND (p_max_amount IS NULL OR total_cost <= p_max_amount);
    
    -- 🔍 رسالة تتبع لخدمات التصليح
    RAISE NOTICE '🔧 خدمات التصليح: المبلغ=%, العدد=%, التاريخ من % إلى %', 
        v_repair_revenue, v_repair_count, p_start_date, p_end_date;
    
    -- ✅ خدمات التصليح: كل ما يُدفع = ربح كامل (بدون تكلفة شراء)
    v_repair_profit := v_repair_revenue;
    
    -- 📅 4. حساب أرباح الحجوزات والخدمات
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_bookings') THEN
        SELECT 
            COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0),
            COUNT(CASE WHEN status = 'completed' THEN 1 END)
        INTO v_service_bookings_revenue, v_service_bookings_count
        FROM service_bookings
        WHERE 
            organization_id = p_organization_id
            AND scheduled_date >= p_start_date::timestamp AND scheduled_date < (p_end_date::timestamp + INTERVAL '1 day');
    END IF;
    
    -- 🔍 رسالة تتبع لحجز الخدمات
    RAISE NOTICE '📅 حجز الخدمات: المبلغ=%, العدد=%', v_service_bookings_revenue, v_service_bookings_count;
    
    -- ✅ الخدمات المحجوزة: كل ما يُدفع = ربح كامل
    v_service_bookings_profit := v_service_bookings_revenue;
    
    -- 🎮 5. حساب أرباح تحميل الألعاب
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_download_orders') THEN
        SELECT 
            COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'partial') THEN amount_paid ELSE 0 END), 0),
            COUNT(CASE WHEN payment_status IN ('paid', 'partial') THEN 1 END)
        INTO v_game_downloads_revenue, v_game_downloads_count
        FROM game_download_orders
        WHERE 
            organization_id = p_organization_id
            AND created_at >= p_start_date::timestamp AND created_at < (p_end_date::timestamp + INTERVAL '1 day')
            AND (p_employee_id IS NULL OR assigned_to = p_employee_id)
            -- 🔍 فلاتر متقدمة جديدة لتحميل الألعاب (تم إزالة branch_id لأنه غير موجود)
            -- AND (p_branch_id IS NULL OR branch_id = p_branch_id)
            AND (p_transaction_type IS NULL OR p_transaction_type = 'all' OR p_transaction_type = 'games')
            AND (p_payment_method IS NULL OR p_payment_method = 'all' OR payment_method = p_payment_method)
            AND (p_min_amount IS NULL OR price >= p_min_amount)
            AND (p_max_amount IS NULL OR price <= p_max_amount);
    END IF;
    
    -- 🔍 رسالة تتبع لتحميل الألعاب
    RAISE NOTICE '🎮 تحميل الألعاب: المبلغ=%, العدد=%', v_game_downloads_revenue, v_game_downloads_count;
    
    -- ✅ تحميل الألعاب: كل ما يُدفع = ربح كامل (خدمة رقمية)
    v_game_downloads_profit := v_game_downloads_revenue;
    
    -- 🔒 6. حساب أرباح خدمات الاشتراك
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_transactions') THEN
        SELECT 
            COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'completed') THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'completed') THEN COALESCE(cost, 0) ELSE 0 END), 0),
            COUNT(CASE WHEN payment_status IN ('paid', 'completed') THEN 1 END)
        INTO v_subscription_revenue, v_subscription_cost, v_subscription_count
        FROM subscription_transactions
        WHERE 
            organization_id = p_organization_id
            AND created_at >= p_start_date::timestamp AND created_at < (p_end_date::timestamp + INTERVAL '1 day')
            -- 🔍 فلاتر متقدمة جديدة للاشتراكات (تم إزالة branch_id لأنه غير موجود)
            -- AND (p_branch_id IS NULL OR branch_id = p_branch_id)
            AND (p_transaction_type IS NULL OR p_transaction_type = 'all' OR p_transaction_type = 'subscription')
            AND (p_payment_method IS NULL OR p_payment_method = 'all' OR payment_method = p_payment_method)
            AND (p_min_amount IS NULL OR amount >= p_min_amount)
            AND (p_max_amount IS NULL OR amount <= p_max_amount);
            
        -- 🔍 رسالة تتبع للاشتراكات
        RAISE NOTICE '🔒 الاشتراكات: المبلغ=%, التكلفة=%, العدد=%', 
            v_subscription_revenue, v_subscription_cost, v_subscription_count;
    ELSE
        RAISE NOTICE '⚠️ جدول subscription_transactions غير موجود';
    END IF;
    
    v_subscription_profit := v_subscription_revenue - v_subscription_cost;
    
    -- 💱 7. حساب أرباح بيع العملات
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'currency_sales') THEN
        SELECT 
            COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0),
            COUNT(CASE WHEN status = 'completed' THEN 1 END)
        INTO v_currency_revenue, v_currency_count
        FROM currency_sales
        WHERE 
            organization_id = p_organization_id
            AND created_at >= p_start_date::timestamp AND created_at < (p_end_date::timestamp + INTERVAL '1 day');
            
        -- 🔍 رسالة تتبع لبيع العملات
        RAISE NOTICE '💱 بيع العملات: المبلغ=%, العدد=%', v_currency_revenue, v_currency_count;
    ELSE
        RAISE NOTICE '⚠️ جدول currency_sales غير موجود';
    END IF;
    
    -- ✅ بيع العملات: كل ما يُدفع = ربح كامل
    v_currency_profit := v_currency_revenue;
    
    -- 📱 8. حساب أرباح بيع رصيد Flexi
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'flexi_sales') THEN
        SELECT 
            COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0),
            COUNT(CASE WHEN status = 'completed' THEN 1 END)
        INTO v_flexi_revenue, v_flexi_count
        FROM flexi_sales
        WHERE 
            organization_id = p_organization_id
            AND created_at >= p_start_date::timestamp AND created_at < (p_end_date::timestamp + INTERVAL '1 day');
            
        -- 🔍 رسالة تتبع لبيع الفليكسي
        RAISE NOTICE '📱 بيع الفليكسي: المبلغ=%, العدد=%', v_flexi_revenue, v_flexi_count;
    ELSE
        RAISE NOTICE '⚠️ جدول flexi_sales غير موجود';
    END IF;
    
    -- ✅ بيع Flexi: كل ما يُدفع = ربح كامل
    v_flexi_profit := v_flexi_revenue;
    
    -- 💰 9. حساب المديونية وتأثيرها على رأس المال (تصحيح منطق الحساب)
    -- الديون المستحقة الحالية (لا ترتبط بتاريخ إنشاء الطلب، بل بالحالة الحالية)
    -- ولكن للتحليل اليومي، نحتاج الديون من الطلبات التي تمت في النطاق الزمني المحدد
    SELECT 
        COALESCE(SUM(remaining_amount), 0),
        COALESCE(SUM(amount_paid), 0)
    INTO v_total_debt, v_paid_debt
    FROM orders
    WHERE 
        organization_id = p_organization_id
        AND DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Algiers') >= p_start_date::timestamp::date
        AND DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Algiers') <= p_end_date::timestamp::date
        AND remaining_amount > 0
        AND status != 'cancelled'
        AND (is_online = FALSE OR is_online IS NULL);
    
    -- 💸 حساب تأثير المديونية على رأس المال
    -- المديونية = خسارة مؤقتة من رأس المال إلى أن يتم الدفع
    SELECT 
        COALESCE(SUM(
            (o.total - o.amount_paid) - (
                SELECT COALESCE(SUM(p.purchase_price * oi.quantity), 0)
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = o.id
            )
        ), 0)
    INTO v_debt_impact
    FROM orders o
    WHERE 
        o.organization_id = p_organization_id
        AND DATE(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Algiers') >= p_start_date::timestamp::date
        AND DATE(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Algiers') <= p_end_date::timestamp::date
        AND o.remaining_amount > 0
        AND o.status != 'cancelled'
        AND (o.is_online = FALSE OR o.is_online IS NULL);
    
    -- 📉 10. حساب الخسائر
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'losses') THEN
        SELECT 
            COALESCE(SUM(CASE WHEN status IN ('approved', 'processed') THEN total_cost_value ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN status IN ('approved', 'processed') THEN total_selling_value ELSE 0 END), 0)
        INTO v_losses_cost, v_losses_selling
        FROM losses
        WHERE 
            organization_id = p_organization_id
            AND incident_date >= p_start_date::timestamp AND incident_date < (p_end_date::timestamp + INTERVAL '1 day');
    END IF;
    
    -- 🔄 11. حساب الإرجاعات
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'returns') THEN
        SELECT 
            COALESCE(SUM(CASE WHEN status IN ('approved', 'completed') THEN refund_amount ELSE 0 END), 0)
        INTO v_returns_amount
        FROM returns
        WHERE 
            organization_id = p_organization_id
            AND created_at >= p_start_date::timestamp AND created_at < (p_end_date::timestamp + INTERVAL '1 day');
    END IF;
    
    -- 💳 12. حساب المصروفات (تصحيح المشكلة الزمنية النهائي)
    -- المصروفات العادية - استخدام expense_date مع فلتر دقيق للنطاق الزمني المطلوب فقط
    SELECT 
        COALESCE(SUM(amount), 0)
    INTO v_one_time_expenses
    FROM expenses
    WHERE 
        organization_id = p_organization_id
        -- التحويل الصحيح: فقط التواريخ التي تقع ضمن النطاق المطلوب
        AND expense_date >= p_start_date::timestamp
        AND expense_date < (p_end_date::timestamp + INTERVAL '1 day')
        AND (is_recurring = FALSE OR is_recurring IS NULL)
        AND (is_deleted = FALSE OR is_deleted IS NULL)
        -- تحديث شرط الحالة ليشمل الحالات المختلفة
        AND (
            status IN ('approved', 'completed', 'paid') 
            OR status IS NULL 
            OR status = ''
        );
    
    -- المصروفات المتكررة (تقدير سنوي مقسوم على الفترة)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_expenses') THEN
        SELECT 
            COALESCE(SUM(
                CASE re.frequency
                    WHEN 'daily' THEN e.amount * 365
                    WHEN 'weekly' THEN e.amount * 52
                    WHEN 'monthly' THEN e.amount * 12
                    WHEN 'quarterly' THEN e.amount * 4
                    WHEN 'yearly' THEN e.amount
                    ELSE e.amount * 12 -- افتراضي شهري
                END * (
                    EXTRACT(DAYS FROM (p_end_date - p_start_date)) / 365.0
                )
            ), 0)
        INTO v_recurring_expenses
        FROM recurring_expenses re
        JOIN expenses e ON re.expense_id = e.id
        WHERE 
            e.organization_id = p_organization_id
            AND re.status = 'active'
            AND re.start_date <= p_end_date::timestamp::date
            AND (re.end_date IS NULL OR re.end_date >= p_start_date::timestamp::date);
    END IF;
    
    -- 📊 13. حساب الإجماليات
    v_total_revenue := v_pos_sales_revenue + v_online_sales_revenue + v_repair_revenue + 
                       v_service_bookings_revenue + v_game_downloads_revenue + 
                       v_subscription_revenue + v_currency_revenue + v_flexi_revenue;
    
    v_total_cost := v_pos_sales_cost + v_online_sales_cost + v_subscription_cost;
    
    v_total_gross_profit := v_pos_sales_profit + v_online_sales_profit + v_repair_profit + 
                           v_service_bookings_profit + v_game_downloads_profit + 
                           v_subscription_profit + v_currency_profit + v_flexi_profit;
    
    v_total_expenses := v_one_time_expenses + v_recurring_expenses;
    
    -- 💎 الربح الصافي = الربح الإجمالي - المصروفات - الخسائر - الإرجاعات (بدون إضافة الديون المدفوعة)
    v_total_net_profit := v_total_gross_profit - v_total_expenses - v_losses_cost - v_returns_amount;
    
    -- 📈 هامش الربح
    v_profit_margin := CASE 
        WHEN v_total_revenue > 0 THEN (v_total_net_profit / v_total_revenue) * 100
        ELSE 0 
    END;
    
    -- 📊 متوسط قيمة الطلب
    v_total_transactions := v_pos_orders_count + v_online_orders_count + v_repair_count + 
                           v_service_bookings_count + v_game_downloads_count + 
                           v_subscription_count + v_currency_count + v_flexi_count;
    
    v_avg_order_value := CASE 
        WHEN v_total_transactions > 0 THEN v_total_revenue / v_total_transactions
        ELSE 0 
    END;
    
    -- 🏆 14. حساب أفضل المنتجات مبيعاً من POS
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', p.name,
            'sku', p.sku,
            'total_quantity_sold', product_stats.total_quantity,
            'order_count', product_stats.order_count,
            'total_revenue', product_stats.total_revenue,
            'avg_selling_price', ROUND(product_stats.total_revenue / NULLIF(product_stats.total_quantity, 0), 2),
            'purchase_price', p.purchase_price,
            'total_profit', product_stats.total_profit,
            'profit_margin', CASE 
                WHEN product_stats.total_revenue > 0 
                THEN ROUND((product_stats.total_profit / product_stats.total_revenue) * 100, 2)
                ELSE 0 
            END
        )
    )
    INTO v_top_pos_products
    FROM (
        SELECT 
            oi.product_id,
            SUM(oi.quantity) as total_quantity,
            COUNT(DISTINCT o.id) as order_count,
            SUM(oi.quantity * oi.unit_price) as total_revenue,
            SUM(oi.quantity * (oi.unit_price - COALESCE(p.purchase_price, 0))) as total_profit
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE 
            o.organization_id = p_organization_id
            AND o.created_at >= p_start_date::timestamp
            AND o.created_at < (p_end_date::timestamp + INTERVAL '1 day')
            AND o.status = 'completed'
            AND (o.is_online = FALSE OR o.is_online IS NULL)
        GROUP BY oi.product_id
        ORDER BY total_quantity DESC
        LIMIT 10
    ) product_stats
    JOIN products p ON product_stats.product_id = p.id;

    -- إذا لم تكن هناك منتجات POS، ضع قائمة فارغة
    IF v_top_pos_products IS NULL THEN
        v_top_pos_products := '[]'::jsonb;
    END IF;

    -- 🌐 15. حساب أفضل المنتجات مبيعاً من المتجر الإلكتروني
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', p.name,
            'sku', p.sku,
            'total_quantity_sold', product_stats.total_quantity,
            'order_count', product_stats.order_count,
            'total_revenue', product_stats.total_revenue,
            'avg_selling_price', ROUND(product_stats.total_revenue / NULLIF(product_stats.total_quantity, 0), 2),
            'purchase_price', p.purchase_price,
            'total_profit', product_stats.total_profit,
            'profit_margin', CASE 
                WHEN product_stats.total_revenue > 0 
                THEN ROUND((product_stats.total_profit / product_stats.total_revenue) * 100, 2)
                ELSE 0 
            END
        )
    )
    INTO v_top_online_products
    FROM (
        SELECT 
            ooi.product_id,
            SUM(ooi.quantity) as total_quantity,
            COUNT(DISTINCT oo.id) as order_count,
            SUM(ooi.quantity * ooi.unit_price) as total_revenue,
            SUM(ooi.quantity * (ooi.unit_price - COALESCE(p.purchase_price, 0))) as total_profit
        FROM online_order_items ooi
        JOIN online_orders oo ON ooi.order_id = oo.id
        JOIN products p ON ooi.product_id = p.id
        WHERE 
            oo.organization_id = p_organization_id
            AND oo.created_at >= p_start_date::timestamp
            AND oo.created_at < (p_end_date::timestamp + INTERVAL '1 day')
            AND oo.status != 'cancelled'
            -- الشرط المُحدَّث: يشمل "مؤكد" و "تم الإرسال" و "تم التوصيل"
            AND (
                EXISTS (
                    SELECT 1 FROM call_confirmation_statuses 
                    WHERE id = oo.call_confirmation_status_id 
                    AND organization_id = p_organization_id
                    AND name = 'مؤكد'
                )
                OR oo.status IN ('shipped', 'delivered')
            )
        GROUP BY ooi.product_id
        ORDER BY total_quantity DESC
        LIMIT 10
    ) product_stats
    JOIN products p ON product_stats.product_id = p.id;

    -- إذا لم تكن هناك منتجات أونلاين، ضع قائمة فارغة
    IF v_top_online_products IS NULL THEN
        v_top_online_products := '[]'::jsonb;
    END IF;

    -- 📊 16. حساب إحصائيات الطلبات POS
    WITH pos_orders_data AS (
        SELECT 
            status,
            total,
            created_at,
            COUNT(*) OVER() as total_orders,
            COUNT(CASE WHEN status != 'cancelled' THEN 1 END) OVER() as active_orders,
            SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) OVER() as pos_total_revenue,
            MIN(created_at) OVER() as earliest_order,
            MAX(created_at) OVER() as latest_order
        FROM orders
        WHERE 
            organization_id = p_organization_id
            AND created_at >= p_start_date::timestamp
            AND created_at < (p_end_date::timestamp + INTERVAL '1 day')
            AND (is_online = FALSE OR is_online IS NULL)
    ),
    pos_status_breakdown AS (
        SELECT 
            status,
            COUNT(*) as status_count,
            SUM(total) as status_total,
            ROUND(AVG(total), 2) as avg_amount
        FROM orders
        WHERE 
            organization_id = p_organization_id
            AND created_at >= p_start_date::timestamp
            AND created_at < (p_end_date::timestamp + INTERVAL '1 day')
            AND (is_online = FALSE OR is_online IS NULL)
        GROUP BY status
    )
    SELECT jsonb_build_object(
        'total_orders', COALESCE(MAX(total_orders), 0),
        'active_orders', COALESCE(MAX(active_orders), 0),
        'total_revenue', COALESCE(MAX(pos_total_revenue), 0),
        'avg_order_value', CASE 
            WHEN MAX(active_orders) > 0 
            THEN ROUND(MAX(pos_total_revenue) / MAX(active_orders), 2)
            ELSE 0 
        END,
        'earliest_order', MIN(earliest_order),
        'latest_order', MAX(latest_order),
        'status_breakdown', COALESCE(
            (SELECT jsonb_object_agg(
                status, 
                jsonb_build_object(
                    'count', status_count,
                    'total_amount', status_total,
                    'avg_amount', avg_amount
                )
            ) FROM pos_status_breakdown),
            '{}'::jsonb
        )
    )
    INTO v_pos_orders_stats
    FROM pos_orders_data
    LIMIT 1;

    -- إذا لم تكن هناك بيانات، ضع قيم افتراضية
    IF v_pos_orders_stats IS NULL THEN
        v_pos_orders_stats := jsonb_build_object(
            'total_orders', 0,
            'active_orders', 0,
            'total_revenue', 0,
            'avg_order_value', 0,
            'earliest_order', NULL,
            'latest_order', NULL,
            'status_breakdown', '{}'::jsonb
        );
    END IF;

    -- 🌐 17. حساب إحصائيات الطلبات الإلكترونية
    WITH online_orders_data AS (
        SELECT 
            status,
            total,
            created_at,
            COUNT(*) OVER() as total_orders,
            COUNT(CASE WHEN status != 'cancelled' THEN 1 END) OVER() as active_orders,
            SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) OVER() as online_total_revenue,
            MIN(created_at) OVER() as earliest_order,
            MAX(created_at) OVER() as latest_order
        FROM online_orders
        WHERE 
            organization_id = p_organization_id
            AND created_at >= p_start_date::timestamp
            AND created_at < (p_end_date::timestamp + INTERVAL '1 day')
    ),
    online_status_breakdown AS (
        SELECT 
            status,
            COUNT(*) as status_count,
            SUM(total) as status_total,
            ROUND(AVG(total), 2) as avg_amount
        FROM online_orders
        WHERE 
            organization_id = p_organization_id
            AND created_at >= p_start_date::timestamp
            AND created_at < (p_end_date::timestamp + INTERVAL '1 day')
        GROUP BY status
    )
    SELECT jsonb_build_object(
        'total_orders', COALESCE(MAX(total_orders), 0),
        'active_orders', COALESCE(MAX(active_orders), 0),
        'total_revenue', COALESCE(MAX(online_total_revenue), 0),
        'avg_order_value', CASE 
            WHEN MAX(active_orders) > 0 
            THEN ROUND(MAX(online_total_revenue) / MAX(active_orders), 2)
            ELSE 0 
        END,
        'earliest_order', MIN(earliest_order),
        'latest_order', MAX(latest_order),
        'status_breakdown', COALESCE(
            (SELECT jsonb_object_agg(
                status, 
                jsonb_build_object(
                    'count', status_count,
                    'total_amount', status_total,
                    'avg_amount', avg_amount
                )
            ) FROM online_status_breakdown),
            '{}'::jsonb
        )
    )
    INTO v_online_orders_stats
    FROM online_orders_data
    LIMIT 1;

    -- إذا لم تكن هناك بيانات، ضع قيم افتراضية
    IF v_online_orders_stats IS NULL THEN
        v_online_orders_stats := jsonb_build_object(
            'total_orders', 0,
            'active_orders', 0,
            'total_revenue', 0,
            'avg_order_value', 0,
            'earliest_order', NULL,
            'latest_order', NULL,
            'status_breakdown', '{}'::jsonb
        );
    END IF;

    -- 🗂️ 18. إنشاء تفاصيل JSON
    v_detailed_breakdown := jsonb_build_object(
        'sales_breakdown', jsonb_build_object(
            'pos_sales', jsonb_build_object(
                'revenue', v_pos_sales_revenue,
                'cost', v_pos_sales_cost, 
                'profit', v_pos_sales_profit,
                'orders_count', v_pos_orders_count
            ),
            'online_sales', jsonb_build_object(
                'revenue', v_online_sales_revenue,
                'cost', v_online_sales_cost,
                'profit', v_online_sales_profit, 
                'orders_count', v_online_orders_count
            )
        ),
        'services_breakdown', jsonb_build_object(
            'repair_services', jsonb_build_object(
                'revenue', v_repair_revenue,
                'profit', v_repair_profit,
                'orders_count', v_repair_count
            ),
            'service_bookings', jsonb_build_object(
                'revenue', v_service_bookings_revenue,
                'profit', v_service_bookings_profit,
                'bookings_count', v_service_bookings_count
            ),
            'game_downloads', jsonb_build_object(
                'revenue', v_game_downloads_revenue,
                'profit', v_game_downloads_profit,
                'downloads_count', v_game_downloads_count
            ),
            'subscriptions', jsonb_build_object(
                'revenue', v_subscription_revenue,
                'cost', v_subscription_cost,
                'profit', v_subscription_profit,
                'transactions_count', v_subscription_count
            ),
            'currency_sales', jsonb_build_object(
                'revenue', v_currency_revenue,
                'profit', v_currency_profit,
                'sales_count', v_currency_count
            ),
            'flexi_sales', jsonb_build_object(
                'revenue', v_flexi_revenue,
                'profit', v_flexi_profit,
                'sales_count', v_flexi_count
            )
        ),
        'financial_health', jsonb_build_object(
            'debt_analysis', jsonb_build_object(
                'total_debt', v_total_debt,
                'paid_debt', v_paid_debt,
                'debt_impact_on_capital', v_debt_impact
            ),
            'losses_and_returns', jsonb_build_object(
                'losses_cost_value', v_losses_cost,
                'losses_selling_value', v_losses_selling,
                'returns_amount', v_returns_amount
            ),
            'expenses', jsonb_build_object(
                'one_time_expenses', v_one_time_expenses,
                'recurring_expenses_prorated', v_recurring_expenses
            )
        )
    );
    
    -- 📋 15. إرجاع النتائج
    RETURN QUERY
    SELECT 
        v_total_revenue,
        v_total_cost,
        v_total_gross_profit,
        v_total_expenses,
        v_total_net_profit,
        v_profit_margin,
        
        v_pos_sales_revenue,
        v_pos_sales_cost,
        v_pos_sales_profit,
        v_pos_orders_count,
        
        v_online_sales_revenue,
        v_online_sales_cost,
        v_online_sales_profit,
        v_online_orders_count,
        
        v_repair_revenue,
        v_repair_profit,
        v_repair_count,
        
        v_service_bookings_revenue,
        v_service_bookings_profit,
        v_service_bookings_count,
        
        v_game_downloads_revenue,
        v_game_downloads_profit,
        v_game_downloads_count,
        
        v_subscription_revenue,
        v_subscription_profit,
        v_subscription_count,
        
        v_currency_revenue,
        v_currency_profit,
        v_currency_count,
        
        v_flexi_revenue,
        v_flexi_profit,
        v_flexi_count,
        
        v_total_debt,
        v_debt_impact,
        v_paid_debt,
        
        v_losses_cost,
        v_losses_selling,
        v_returns_amount,
        
        v_one_time_expenses,
        v_recurring_expenses,
        
        v_avg_order_value,
        v_total_transactions,
        
        v_detailed_breakdown,
        
        v_top_pos_products,
        v_top_online_products,
        v_pos_orders_stats,
        v_online_orders_stats;
        
END;
$$ LANGUAGE plpgsql;

-- إنشاء نسخة مختصرة بـ 4 معاملات للتوافق مع الكود الموجود
CREATE OR REPLACE FUNCTION get_complete_financial_analytics(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_employee_id UUID DEFAULT NULL
)
RETURNS TABLE(
    total_revenue NUMERIC,
    total_cost NUMERIC,
    total_gross_profit NUMERIC,
    total_expenses NUMERIC,
    total_net_profit NUMERIC,
    profit_margin_percentage NUMERIC,
    pos_sales_revenue NUMERIC,
    pos_sales_cost NUMERIC,
    pos_sales_profit NUMERIC,
    pos_orders_count INTEGER,
    online_sales_revenue NUMERIC,
    online_sales_cost NUMERIC,
    online_sales_profit NUMERIC,
    online_orders_count INTEGER,
    repair_services_revenue NUMERIC,
    repair_services_profit NUMERIC,
    repair_orders_count INTEGER,
    service_bookings_revenue NUMERIC,
    service_bookings_profit NUMERIC,
    service_bookings_count INTEGER,
    game_downloads_revenue NUMERIC,
    game_downloads_profit NUMERIC,
    game_downloads_count INTEGER,
    subscription_services_revenue NUMERIC,
    subscription_services_profit NUMERIC,
    subscription_transactions_count INTEGER,
    currency_sales_revenue NUMERIC,
    currency_sales_profit NUMERIC,
    currency_sales_count INTEGER,
    flexi_sales_revenue NUMERIC,
    flexi_sales_profit NUMERIC,
    flexi_sales_count INTEGER,
    total_debt_amount NUMERIC,
    debt_impact_on_capital NUMERIC,
    paid_debt_amount NUMERIC,
    total_losses_cost NUMERIC,
    total_losses_selling_value NUMERIC,
    total_returns_amount NUMERIC,
    one_time_expenses NUMERIC,
    recurring_expenses_annual NUMERIC,
    avg_order_value NUMERIC,
    total_transactions_count INTEGER,
    detailed_breakdown JSONB,
    top_pos_products JSONB,
    top_online_products JSONB,
    pos_orders_stats JSONB,
    online_orders_stats JSONB
) AS $$
BEGIN
    -- استدعاء الدالة الكاملة مع القيم الافتراضية
    RETURN QUERY
    SELECT * FROM get_complete_financial_analytics(
        p_organization_id,
        p_start_date,
        p_end_date,
        p_employee_id,
        NULL::UUID,        -- p_branch_id
        NULL::TEXT,        -- p_transaction_type
        NULL::TEXT,        -- p_payment_method
        NULL::NUMERIC,     -- p_min_amount
        NULL::NUMERIC,     -- p_max_amount
        TRUE,              -- p_include_partial_payments
        TRUE               -- p_include_refunds
    );
END;
$$ LANGUAGE plpgsql;

-- 📝 تعليق على الدالة
COMMENT ON FUNCTION get_complete_financial_analytics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID) IS 
'دالة شاملة لحساب جميع الإيرادات والأرباح والخسائر مع دعم:
- نقطة البيع مع نظام FIFO والمتغيرات
- المبيعات الإلكترونية (فقط المؤكدة)
- خدمات التصليح والحجوزات
- تحميل الألعاب
- خدمات الاشتراك مع أسعار الشراء والبيع
- بيع العملات والرصيد
- المديونية وتأثيرها على رأس المال
- الخسائر والإرجاعات
- المصروفات العادية والمتكررة
- التحليل التفصيلي بصيغة JSON';

-- ✅ إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_financial_analytics_orders_date_org 
ON orders(organization_id, created_at, status, is_online) 
WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_financial_analytics_online_orders_date_org 
ON online_orders(organization_id, created_at, status, call_confirmation_status_id) 
WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_financial_analytics_expenses_date_org 
ON expenses(organization_id, expense_date, status, is_recurring);

-- ✅ دالة للتوافق مع التطبيق (11 معامل بنفس الترتيب المطلوب)
CREATE OR REPLACE FUNCTION get_complete_financial_analytics(
    p_organization_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_employee_id UUID DEFAULT NULL,
    p_branch_id UUID DEFAULT NULL,
    p_transaction_type TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_min_amount NUMERIC DEFAULT NULL,
    p_max_amount NUMERIC DEFAULT NULL,
    p_include_partial_payments BOOLEAN DEFAULT TRUE,
    p_include_refunds BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
    -- إجماليات رئيسية
    total_revenue NUMERIC,
    total_cost NUMERIC,
    total_gross_profit NUMERIC,
    total_expenses NUMERIC,
    total_net_profit NUMERIC,
    profit_margin_percentage NUMERIC,
    
    -- تفاصيل المبيعات
    pos_sales_revenue NUMERIC,
    pos_sales_cost NUMERIC,
    pos_sales_profit NUMERIC,
    pos_orders_count INTEGER,
    
    online_sales_revenue NUMERIC,
    online_sales_cost NUMERIC,
    online_sales_profit NUMERIC,
    online_orders_count INTEGER,
    
    -- الخدمات
    repair_services_revenue NUMERIC,
    repair_services_profit NUMERIC,
    repair_orders_count INTEGER,
    
    service_bookings_revenue NUMERIC,
    service_bookings_profit NUMERIC,
    service_bookings_count INTEGER,
    
    game_downloads_revenue NUMERIC,
    game_downloads_profit NUMERIC,
    game_downloads_count INTEGER,
    
    subscription_services_revenue NUMERIC,
    subscription_services_profit NUMERIC,
    subscription_transactions_count INTEGER,
    
    currency_sales_revenue NUMERIC,
    currency_sales_profit NUMERIC,
    currency_sales_count INTEGER,
    
    flexi_sales_revenue NUMERIC,
    flexi_sales_profit NUMERIC,
    flexi_sales_count INTEGER,
    
    -- المديونية
    total_debt_amount NUMERIC,
    debt_impact_on_capital NUMERIC,
    paid_debt_amount NUMERIC,
    
    -- الخسائر والإرجاعات
    total_losses_cost NUMERIC,
    total_losses_selling_value NUMERIC,
    total_returns_amount NUMERIC,
    
    -- المصروفات
    one_time_expenses NUMERIC,
    recurring_expenses_annual NUMERIC,
    
    -- تحليلات إضافية
    avg_order_value NUMERIC,
    total_transactions_count INTEGER,
    
    -- تفاصيل JSON للتحليل المتقدم
    detailed_breakdown JSONB,
    
    -- أفضل المنتجات مبيعاً
    top_pos_products JSONB,
    top_online_products JSONB,
    
    -- إحصائيات الطلبات
    pos_orders_stats JSONB,
    online_orders_stats JSONB
) AS $$
BEGIN
    -- ✅ استدعاء الدالة الأساسية مباشرة
    RETURN QUERY
    SELECT * FROM get_complete_financial_analytics_advanced(
        p_organization_id,
        p_start_date,
        p_end_date,
        p_employee_id,
        p_branch_id,
        p_transaction_type,
        p_payment_method,
        p_min_amount,
        p_max_amount,
        p_include_partial_payments,
        p_include_refunds
    );
END;
$$ LANGUAGE plpgsql;

-- 🎉 اختبار الدالة
-- SELECT * FROM get_complete_financial_analytics(
--     'your-organization-id'::UUID,
--     '2025-01-01 00:00:00+00'::TIMESTAMP WITH TIME ZONE,
--     '2025-12-31 23:59:59+00'::TIMESTAMP WITH TIME ZONE
-- ); 

 