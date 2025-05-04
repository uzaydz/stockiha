-- add_partial_payment_support.sql
-- ملف التعديلات لدعم ميزة تحديد المبلغ المتبقي إما كدفع جزئي أو كباقي عادي

-- 1. إضافة أعمدة جديدة في جدول الطلبات (orders) لحفظ معلومات المدفوعات الجزئية
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS consider_remaining_as_partial BOOLEAN DEFAULT TRUE;

-- إضافة تعليقات توضيحية للأعمدة الجديدة
COMMENT ON COLUMN orders.amount_paid IS 'المبلغ المدفوع فعلياً في الطلب';
COMMENT ON COLUMN orders.remaining_amount IS 'المبلغ المتبقي (الباقي) في الطلب';
COMMENT ON COLUMN orders.consider_remaining_as_partial IS 'هل يعتبر المبلغ المتبقي دفعة جزئية (TRUE) أم باقي عادي (FALSE)';

-- حذف جميع النسخ المكررة من الدوال قبل إعادة تعريفها
DROP FUNCTION IF EXISTS get_sales_summary(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_sales_summary(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID);
DROP FUNCTION IF EXISTS get_orders_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_orders_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID);
DROP FUNCTION IF EXISTS get_sales_by_channel(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_sales_by_channel(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID);

-- 2. إنشاء دالة لمعالجة حساب المبلغ المتبقي في التحليلات المالية
CREATE OR REPLACE FUNCTION calculate_order_financial_impact(
  p_order_id UUID
) RETURNS TABLE (
  actual_revenue DECIMAL(10, 2),
  pending_revenue DECIMAL(10, 2)
) AS $$
DECLARE
  v_order orders;
BEGIN
  -- الحصول على بيانات الطلب
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN QUERY SELECT 0::DECIMAL(10,2), 0::DECIMAL(10,2);
    RETURN;
  END IF;
  
  -- إذا كان الطلب مدفوع بالكامل
  IF v_order.payment_status = 'paid' THEN
    RETURN QUERY SELECT v_order.total, 0::DECIMAL(10,2);
    RETURN;
  END IF;
  
  -- إذا كان هناك دفع جزئي
  IF v_order.payment_status = 'pending' AND v_order.amount_paid IS NOT NULL THEN
    -- إذا كان المبلغ المتبقي يعتبر دفع جزئي
    IF v_order.consider_remaining_as_partial = TRUE THEN
      RETURN QUERY SELECT 
        COALESCE(v_order.amount_paid, 0), 
        COALESCE(v_order.remaining_amount, 0);
    -- إذا كان المبلغ المتبقي يعتبر باقي عادي (خصم على السعر)
    ELSE
      RETURN QUERY SELECT 
        COALESCE(v_order.amount_paid, 0), 
        0::DECIMAL(10,2);
    END IF;
    RETURN;
  END IF;
  
  -- الحالات الأخرى (لم يتم الدفع أو حالات أخرى)
  RETURN QUERY SELECT 0::DECIMAL(10,2), COALESCE(v_order.total, 0);
END;
$$ LANGUAGE plpgsql;

-- 3. تعديل نظام المعاملات لدعم الدفعات الجزئية
CREATE OR REPLACE FUNCTION record_payment_transaction(
  p_order_id UUID,
  p_amount DECIMAL(10, 2),
  p_payment_method TEXT,
  p_is_partial BOOLEAN,
  p_consider_remaining_as_partial BOOLEAN DEFAULT TRUE
) RETURNS UUID AS $$
DECLARE
  v_order orders;
  v_transaction_id UUID;
  v_remaining_amount DECIMAL(10, 2);
BEGIN
  -- الحصول على بيانات الطلب
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود: %', p_order_id;
  END IF;
  
  -- حساب المبلغ المتبقي
  v_remaining_amount := v_order.total - p_amount;
  
  -- إنشاء سجل المعاملة
  INSERT INTO transactions (
    order_id,
    amount,
    type,
    payment_method,
    description,
    organization_id
  ) VALUES (
    p_order_id,
    p_amount,
    'payment',
    p_payment_method,
    CASE 
      WHEN p_is_partial THEN 'دفع جزئي للطلب #' || p_order_id
      ELSE 'دفع كامل للطلب #' || p_order_id
    END,
    v_order.organization_id
  ) RETURNING id INTO v_transaction_id;
  
  -- تحديث بيانات الطلب
  UPDATE orders
  SET 
    payment_status = CASE 
      WHEN p_is_partial THEN 'pending'
      ELSE 'paid'
    END,
    amount_paid = p_amount,
    remaining_amount = v_remaining_amount,
    consider_remaining_as_partial = p_consider_remaining_as_partial,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- 4. تعديل التقارير لتضمين معلومات المدفوعات الجزئية
-- إعادة إنشاء الدالة بالهيكل الجديد
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
    -- تعديل شرط التاريخ ليتضمن الفترة المحددة
    AND oo.created_at BETWEEN p_start_date AND p_end_date
    AND oo.status != 'cancelled';
  
  -- إرجاع النتائج
  RETURN QUERY SELECT v_pos_sales, v_online_sales;
END;
$$ LANGUAGE plpgsql;

-- 5. إنشاء وظيفة لتحديث السجلات القديمة للمدفوعات الجزئية
-- (استخراج المعلومات من حقل notes)
CREATE OR REPLACE FUNCTION update_existing_partial_payments() RETURNS VOID AS $$
DECLARE
  r RECORD;
  v_amount_paid TEXT;
  v_remaining TEXT;
  v_amount_paid_num DECIMAL(10, 2);
  v_remaining_num DECIMAL(10, 2);
BEGIN
  -- البحث عن الطلبات التي تحتوي على نص الدفع الجزئي في الملاحظات
  FOR r IN
    SELECT id, notes
    FROM orders
    WHERE notes LIKE '%دفع جزئي:%' 
      AND (amount_paid IS NULL OR remaining_amount IS NULL)
  LOOP
    BEGIN
      -- استخراج قيمة المبلغ المدفوع من النص (افتراضياً بالصيغة: "دفع جزئي: X - متبقي: Y")
      v_amount_paid := substring(r.notes FROM 'دفع جزئي: ([^-]+)');
      v_amount_paid := regexp_replace(v_amount_paid, '[^0-9\.]', '', 'g');
      v_remaining := substring(r.notes FROM 'متبقي: ([^\s]+)');
      v_remaining := regexp_replace(v_remaining, '[^0-9\.]', '', 'g');
      
      -- تحويل النصوص إلى أرقام
      BEGIN
        v_amount_paid_num := v_amount_paid::DECIMAL(10, 2);
        v_remaining_num := v_remaining::DECIMAL(10, 2);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في تحويل القيم النصية إلى أرقام للطلب %: %', r.id, SQLERRM;
        CONTINUE;
      END;
      
      -- تحديث سجل الطلب
      UPDATE orders
      SET 
        amount_paid = v_amount_paid_num,
        remaining_amount = v_remaining_num,
        consider_remaining_as_partial = TRUE -- نفترض أن كل المدفوعات الجزئية القديمة كانت تعتبر دفعات جزئية
      WHERE id = r.id;
      
      RAISE NOTICE 'تم تحديث بيانات الدفع الجزئي للطلب %: المدفوع = %, المتبقي = %', r.id, v_amount_paid_num, v_remaining_num;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'خطأ في معالجة الطلب %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. تنفيذ تحديث السجلات القديمة
SELECT update_existing_partial_payments(); 