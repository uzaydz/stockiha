-- fix_analytics_functions.sql
-- ملف لإصلاح مشاكل دوال تحليلات المبيعات لدعم ميزة الدفع الجزئي

-- حذف جميع النسخ المكررة من الدوال قبل إعادة تعريفها
DROP FUNCTION IF EXISTS get_sales_summary(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_sales_summary(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID);
DROP FUNCTION IF EXISTS get_orders_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_orders_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID);
DROP FUNCTION IF EXISTS get_sales_by_channel(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_sales_by_channel(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID);

-- إعادة إنشاء دالة get_sales_summary
CREATE OR REPLACE FUNCTION get_sales_summary(
  p_organization_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS TABLE (
  total_orders INTEGER,
  completed_orders INTEGER,
  total_revenue DECIMAL(10, 2),
  actual_revenue DECIMAL(10, 2),
  pending_revenue DECIMAL(10, 2),
  discount_total DECIMAL(10, 2),
  partial_payment_count INTEGER
) AS $$
BEGIN
  RETURN QUERY 
  WITH order_financials AS (
    SELECT 
      o.id,
      o.total,
      o.discount,
      o.payment_status,
      o.amount_paid,
      o.remaining_amount,
      o.consider_remaining_as_partial,
      CASE 
        WHEN o.payment_status = 'paid' THEN o.total
        WHEN o.payment_status = 'pending' AND o.amount_paid IS NOT NULL THEN
          CASE 
            WHEN o.consider_remaining_as_partial = TRUE THEN o.amount_paid
            ELSE o.amount_paid -- كامل المبلغ المدفوع
          END
        ELSE 0
      END AS actual_rev,
      CASE 
        WHEN o.payment_status = 'pending' AND o.amount_paid IS NOT NULL AND o.consider_remaining_as_partial = TRUE THEN
          o.remaining_amount
        ELSE 0
      END AS pending_rev
    FROM 
      orders o
    WHERE 
      o.organization_id = p_organization_id
      AND o.created_at BETWEEN p_start_date AND p_end_date
  )
  SELECT
    COUNT(id)::INTEGER,
    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END)::INTEGER,
    SUM(total),
    SUM(actual_rev),
    SUM(pending_rev),
    SUM(COALESCE(discount, 0)),
    COUNT(CASE WHEN amount_paid IS NOT NULL AND remaining_amount > 0 AND consider_remaining_as_partial = TRUE THEN 1 END)::INTEGER
  FROM
    order_financials;
END;
$$ LANGUAGE plpgsql;

-- إنشاء دالة get_orders_stats المحدثة
CREATE OR REPLACE FUNCTION get_orders_stats(
  p_organization_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS TABLE (
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

-- إنشاء دالة get_sales_by_channel المحدثة
CREATE OR REPLACE FUNCTION get_sales_by_channel(
  p_organization_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS TABLE (
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
    AND (o.is_online = FALSE OR o.is_online IS NULL);
  
  -- الحصول على المبيعات الإلكترونية من جدول online_orders
  SELECT COALESCE(SUM(oo.total), 0) INTO v_online_sales
  FROM online_orders oo
  WHERE 
    oo.organization_id = p_organization_id
    AND oo.created_at BETWEEN p_start_date AND p_end_date
    AND oo.status != 'cancelled';
  
  -- إرجاع النتائج
  RETURN QUERY SELECT v_pos_sales, v_online_sales;
END;
$$ LANGUAGE plpgsql; 