-- ملف إصلاح شامل لمشكلة عدم ظهور ديون العملاء
-- تاريخ الإنشاء: 2025-01-27
-- الهدف: حل مشكلة عدم ظهور الديون في قائمة ديون العملاء

-- بدء المعاملة
BEGIN;

-- 1. تحديث جميع الطلبات ذات المبالغ المتبقية لتكون معتبرة كديون جزئية
UPDATE orders 
SET consider_remaining_as_partial = true 
WHERE remaining_amount > 0 
  AND payment_status = 'pending'
  AND consider_remaining_as_partial = false;

-- 2. التأكد من أن قيمة remaining_amount محسوبة بشكل صحيح
UPDATE orders 
SET remaining_amount = total - COALESCE(amount_paid, 0) 
WHERE total > COALESCE(amount_paid, 0)
  AND (remaining_amount IS NULL OR remaining_amount != (total - COALESCE(amount_paid, 0)));

-- 3. إصلاح حالة الدفع للطلبات التي لديها مبالغ متبقية
UPDATE orders 
SET payment_status = 'pending' 
WHERE remaining_amount > 0 
  AND payment_status NOT IN ('pending', 'partial');

-- 4. تحديث حالة الدفع للطلبات المدفوعة جزئياً
UPDATE orders 
SET payment_status = 'partial' 
WHERE amount_paid > 0 
  AND remaining_amount > 0
  AND payment_status = 'pending';

-- 5. إنشاء أو تحديث دالة get_customer_debts المحسنة
CREATE OR REPLACE FUNCTION get_customer_debts(p_organization_id UUID)
RETURNS TABLE (
    customer_id UUID,
    customer_name TEXT,
    order_id UUID,
    order_number TEXT,
    created_at TIMESTAMPTZ,
    total NUMERIC,
    amount_paid NUMERIC,
    remaining_amount NUMERIC,
    employee_id UUID,
    employee_name TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    o.id AS order_id,
    COALESCE(o.slug, 'ORD-' || o.customer_order_number::TEXT) AS order_number,
    o.created_at,
    o.total,
    COALESCE(o.amount_paid, 0) AS amount_paid,
    o.remaining_amount,
    o.employee_id,
    COALESCE(u.name, 'موظف غير معروف') AS employee_name
  FROM 
    orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.employee_id = u.id
  WHERE 
    o.organization_id = p_organization_id
    AND o.remaining_amount > 0
    AND o.payment_status IN ('pending', 'partial')
  ORDER BY 
    c.name ASC, o.created_at DESC;
END;
$$;

-- 6. إنشاء أو تحديث دالة get_debts_by_customer المحسنة
CREATE OR REPLACE FUNCTION get_debts_by_customer(p_organization_id UUID)
RETURNS TABLE (
    customer_id UUID,
    customer_name TEXT,
    total_debts NUMERIC,
    orders_count BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    COALESCE(SUM(o.remaining_amount), 0) AS total_debts,
    COUNT(o.id)::BIGINT AS orders_count
  FROM 
    orders o
    JOIN customers c ON o.customer_id = c.id
  WHERE 
    o.organization_id = p_organization_id
    AND o.remaining_amount > 0
    AND o.payment_status IN ('pending', 'partial')
  GROUP BY 
    c.id, c.name
  ORDER BY 
    total_debts DESC;
END;
$$;

-- 7. إنشاء أو تحديث دالة get_partial_payments_summary المحسنة
CREATE OR REPLACE FUNCTION get_partial_payments_summary(p_organization_id UUID)
RETURNS TABLE (
    total_debts NUMERIC,
    total_partial_payments BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    COALESCE(SUM(o.remaining_amount), 0) AS total_debts,
    COUNT(o.id)::BIGINT AS total_partial_payments
  FROM 
    orders o
  WHERE 
    o.organization_id = p_organization_id
    AND o.remaining_amount > 0
    AND o.payment_status IN ('pending', 'partial');
END;
$$;

-- 8. إنشاء دالة لإصلاح بيانات الديون (يمكن تشغيلها عند الحاجة)
CREATE OR REPLACE FUNCTION fix_debts_data(p_organization_id UUID)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    updated_count INTEGER;
    fixed_count INTEGER;
BEGIN
    -- تحديث الطلبات ذات المبالغ المتبقية
    UPDATE orders 
    SET consider_remaining_as_partial = true 
    WHERE organization_id = p_organization_id
      AND remaining_amount > 0 
      AND payment_status = 'pending'
      AND consider_remaining_as_partial = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- إصلاح قيم remaining_amount
    UPDATE orders 
    SET remaining_amount = total - COALESCE(amount_paid, 0) 
    WHERE organization_id = p_organization_id
      AND total > COALESCE(amount_paid, 0)
      AND (remaining_amount IS NULL OR remaining_amount != (total - COALESCE(amount_paid, 0)));
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    RETURN format('تم تحديث %s طلب وإصلاح %s قيمة متبقية', updated_count, fixed_count);
END;
$$;

-- 9. فحص البيانات بعد الإصلاح
DO $$
DECLARE
    debt_count INTEGER;
    customer_count INTEGER;
BEGIN
    -- عد الطلبات ذات الديون
    SELECT COUNT(*) INTO debt_count
    FROM orders 
    WHERE remaining_amount > 0 AND payment_status IN ('pending', 'partial');
    
    -- عد العملاء الذين لديهم ديون
    SELECT COUNT(DISTINCT customer_id) INTO customer_count
    FROM orders 
    WHERE remaining_amount > 0 AND payment_status IN ('pending', 'partial');
    
    RAISE NOTICE 'إجمالي الطلبات ذات الديون: %', debt_count;
    RAISE NOTICE 'إجمالي العملاء الذين لديهم ديون: %', customer_count;
END $$;

-- إنهاء المعاملة
COMMIT;

-- رسالة نجاح
SELECT 'تم إصلاح مشكلة ديون العملاء بنجاح! يمكنك الآن رؤية جميع الديون في قائمة ديون العملاء.' as result; 