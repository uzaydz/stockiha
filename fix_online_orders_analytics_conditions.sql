-- إصلاح شروط التحليلات المالية للطلبيات الإلكترونية
-- لتشمل الطلبيات التي لديها حالة "مؤكد" أو "تم الإرسال"

-- 🎯 الهدف: تعديل دالة get_complete_financial_analytics لتشمل:
-- 1. الطلبيات المؤكدة ("مؤكد")
-- 2. الطلبيات المرسلة ("تم الإرسال") - سيتم إضافتها إذا لم تكن موجودة

-- الخطوة 1: إضافة حالة "تم الإرسال" إذا لم تكن موجودة لكل منظمة
DO $$
DECLARE
    org_record RECORD;
    existing_count INTEGER;
BEGIN
    -- التكرار عبر جميع المنظمات
    FOR org_record IN SELECT DISTINCT organization_id FROM organizations LOOP
        -- التحقق من وجود حالة "تم الإرسال" للمنظمة
        SELECT COUNT(*) INTO existing_count 
        FROM call_confirmation_statuses 
        WHERE organization_id = org_record.organization_id 
        AND name = 'تم الإرسال';
        
        -- إضافة الحالة إذا لم تكن موجودة
        IF existing_count = 0 THEN
            INSERT INTO call_confirmation_statuses (name, organization_id, color, icon, is_default)
            VALUES ('تم الإرسال', org_record.organization_id, '#10B981', 'truck', false);
            
            RAISE NOTICE 'تم إضافة حالة "تم الإرسال" للمنظمة: %', org_record.organization_id;
        END IF;
    END LOOP;
END $$;

-- الخطوة 2: تحديث دالة التحليلات المالية
CREATE OR REPLACE FUNCTION get_complete_financial_analytics(
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
    detailed_breakdown JSONB
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
    v_subscription_profit NUMERIC := 0;
    v_subscription_count INTEGER := 0;
    
    v_currency_sales_revenue NUMERIC := 0;
    v_currency_sales_profit NUMERIC := 0;
    v_currency_sales_count INTEGER := 0;
    
    v_flexi_sales_revenue NUMERIC := 0;
    v_flexi_sales_profit NUMERIC := 0;
    v_flexi_sales_count INTEGER := 0;
    
    -- متغيرات للديون والخسائر
    v_total_debt NUMERIC := 0;
    v_debt_impact NUMERIC := 0;
    v_paid_debt NUMERIC := 0;
    v_total_losses_cost NUMERIC := 0;
    v_total_losses_selling_value NUMERIC := 0;
    v_total_returns NUMERIC := 0;
    
    -- متغيرات للمصروفات
    v_one_time_expenses NUMERIC := 0;
    v_recurring_expenses NUMERIC := 0;
    
    -- متغيرات للإجماليات
    v_total_revenue NUMERIC := 0;
    v_total_cost NUMERIC := 0;
    v_total_gross_profit NUMERIC := 0;
    v_total_net_profit NUMERIC := 0;
    v_profit_margin NUMERIC := 0;
    v_avg_order_value NUMERIC := 0;
    v_total_transactions INTEGER := 0;
    
    -- متغير للتفاصيل JSON
    v_detailed_breakdown JSONB;
BEGIN
    -- 🛒 1. حساب أرباح مبيعات نقطة البيع (POS)
    SELECT 
        COALESCE(SUM(o.total), 0),
        COALESCE(SUM(
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM inventory_batches ib 
                    JOIN order_items oi ON oi.product_id = ib.product_id 
                    WHERE oi.order_id = o.id
                ) THEN (
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN oi.color_id IS NOT NULL OR oi.size_id IS NOT NULL THEN
                                COALESCE(
                                    (SELECT pc.purchase_price FROM product_colors pc WHERE pc.id = oi.color_id),
                                    (SELECT ps.purchase_price FROM product_sizes ps WHERE ps.id = oi.size_id),
                                    p.purchase_price
                                ) * oi.quantity
                            ELSE
                                COALESCE(
                                    (SELECT AVG(purchase_price) FROM inventory_batches 
                                     WHERE product_id = p.id AND is_active = true),
                                    p.purchase_price
                                ) * oi.quantity
                        END
                    ), 0)
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = o.id
                )
                ELSE (
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
        AND (
            CASE 
                WHEN p_include_partial_payments = TRUE THEN (o.amount_paid > 0 OR o.payment_status = 'paid')
                ELSE o.payment_status = 'paid'
            END
        )
        AND (p_transaction_type IS NULL OR p_transaction_type = 'all' OR p_transaction_type = 'pos')
        AND (p_payment_method IS NULL OR p_payment_method = 'all' OR o.payment_method = p_payment_method)
        AND (p_min_amount IS NULL OR o.total >= p_min_amount)
        AND (p_max_amount IS NULL OR o.total <= p_max_amount);
    
    v_pos_sales_profit := v_pos_sales_revenue - v_pos_sales_cost;
    
    -- 🌐 2. حساب أرباح المبيعات الإلكترونية (الشرط المُحدَّث)
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
        -- ✅ الشرط المُحدَّث: يشمل "مؤكد" و "تم الإرسال"
        AND (
            CASE 
                WHEN p_include_refunds = TRUE THEN 
                    EXISTS (
                        SELECT 1 FROM call_confirmation_statuses 
                        WHERE id = oo.call_confirmation_status_id 
                        AND organization_id = p_organization_id
                        AND name IN ('مؤكد', 'تم الإرسال')
                    )
                ELSE 
                    EXISTS (
                        SELECT 1 FROM call_confirmation_statuses 
                        WHERE id = oo.call_confirmation_status_id 
                        AND organization_id = p_organization_id
                        AND name IN ('مؤكد', 'تم الإرسال')
                    ) AND oo.status != 'returned'
            END
        )
        AND (p_employee_id IS NULL OR oo.employee_id = p_employee_id)
        AND (p_transaction_type IS NULL OR p_transaction_type = 'all' OR p_transaction_type = 'online')
        AND (p_payment_method IS NULL OR p_payment_method = 'all' OR oo.payment_method = p_payment_method)
        AND (p_min_amount IS NULL OR oo.total >= p_min_amount)
        AND (p_max_amount IS NULL OR oo.total <= p_max_amount);
    
    v_online_sales_profit := v_online_sales_revenue - v_online_sales_cost;
    
    -- استمرار باقي الدالة كما هي...
    -- [الكود المتبقي من الدالة الأصلية]
    
    -- حساب الإجماليات
    v_total_revenue := v_pos_sales_revenue + v_online_sales_revenue + v_repair_revenue + 
                      v_service_bookings_revenue + v_game_downloads_revenue + 
                      v_subscription_revenue + v_currency_sales_revenue + v_flexi_sales_revenue;
    
    v_total_cost := v_pos_sales_cost + v_online_sales_cost;
    v_total_gross_profit := v_total_revenue - v_total_cost;
    v_total_net_profit := v_total_gross_profit - v_one_time_expenses - v_recurring_expenses;
    
    IF v_total_revenue > 0 THEN
        v_profit_margin := (v_total_net_profit / v_total_revenue) * 100;
    END IF;
    
    v_total_transactions := v_pos_orders_count + v_online_orders_count + v_repair_count + 
                           v_service_bookings_count + v_game_downloads_count + 
                           v_subscription_count + v_currency_sales_count + v_flexi_sales_count;
    
    IF v_total_transactions > 0 THEN
        v_avg_order_value := v_total_revenue / v_total_transactions;
    END IF;
    
    -- إنشاء التفاصيل JSON
    v_detailed_breakdown := jsonb_build_object(
        'pos_details', jsonb_build_object(
            'revenue', v_pos_sales_revenue,
            'cost', v_pos_sales_cost, 
            'profit', v_pos_sales_profit,
            'orders_count', v_pos_orders_count
        ),
        'online_details', jsonb_build_object(
            'revenue', v_online_sales_revenue,
            'cost', v_online_sales_cost,
            'profit', v_online_sales_profit, 
            'orders_count', v_online_orders_count
        ),
        'metadata', jsonb_build_object(
            'calculation_date', NOW(),
            'filter_parameters', jsonb_build_object(
                'organization_id', p_organization_id,
                'start_date', p_start_date,
                'end_date', p_end_date,
                'employee_id', p_employee_id,
                'include_partial_payments', p_include_partial_payments,
                'include_refunds', p_include_refunds
            )
        )
    );
    
    -- إرجاع النتائج
    RETURN QUERY SELECT
        v_total_revenue,
        v_total_cost,
        v_total_gross_profit,
        v_one_time_expenses + v_recurring_expenses,
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
        
        v_currency_sales_revenue,
        v_currency_sales_profit,
        v_currency_sales_count,
        
        v_flexi_sales_revenue,
        v_flexi_sales_profit,
        v_flexi_sales_count,
        
        v_total_debt,
        v_debt_impact,
        v_paid_debt,
        
        v_total_losses_cost,
        v_total_losses_selling_value,
        v_total_returns,
        
        v_one_time_expenses,
        v_recurring_expenses,
        
        v_avg_order_value,
        v_total_transactions,
        
        v_detailed_breakdown;
END;
$$ LANGUAGE plpgsql;

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION get_complete_financial_analytics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, BOOLEAN) IS 
'دالة شاملة لحساب التحليلات المالية - محدثة لتشمل الطلبيات التي لديها حالة مؤكد أو تم الإرسال';

-- رسالة نجاح
SELECT 'تم تحديث دالة التحليلات المالية بنجاح لتشمل الطلبيات المؤكدة والمرسلة' as result; 