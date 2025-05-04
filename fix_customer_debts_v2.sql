-- ملف إصلاح ديون العملاء (النسخة الثانية)
-- هذا الملف يحتوي على الاستعلامات اللازمة لإصلاح مشكلة عدم ظهور ديون العملاء

-- 1. تحديث جميع الطلبات ذات المبالغ المتبقية لتكون معتبرة كديون جزئية
UPDATE orders 
SET consider_remaining_as_partial = TRUE 
WHERE remaining_amount > 0 AND payment_status = 'pending';

-- 2. إصلاح حالة الدفع للطلبات التي لديها مبالغ متبقية
UPDATE orders 
SET payment_status = 'pending' 
WHERE remaining_amount > 0 AND payment_status != 'pending';

-- 3. التأكد من أن قيمة remaining_amount محسوبة بشكل صحيح
UPDATE orders 
SET remaining_amount = total - COALESCE(amount_paid, 0) 
WHERE total > COALESCE(amount_paid, 0);

-- 4. تحديث قيمة amount_paid لتكون 0 بدلاً من NULL للطلبات ذات المبالغ المتبقية
UPDATE orders 
SET amount_paid = 0 
WHERE remaining_amount > 0 AND amount_paid IS NULL;

-- 5. تحديث العملاء الضيوف وربطهم بعميل حقيقي إذا كان لديك عميل محدد
-- تحتاج إلى استبدال 'YOUR_CUSTOMER_ID' بمعرف عميل حقيقي في النظام
-- UPDATE orders 
-- SET customer_id = 'YOUR_CUSTOMER_ID' 
-- WHERE customer_id = '00000000-0000-0000-0000-000000000000' AND remaining_amount > 0;

-- 6. تعديل وظيفة get_partial_payments_summary لتشمل جميع الطلبات ذات المبالغ المتبقية
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
    AND o.payment_status = 'pending'
    AND o.remaining_amount > 0;
END;
$$;

-- 7. تعديل وظيفة get_debts_by_customer لتشمل جميع الطلبات ذات المبالغ المتبقية
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
    AND o.payment_status = 'pending'
    AND o.remaining_amount > 0
  GROUP BY 
    c.id, c.name
  ORDER BY 
    total_debts DESC;
END;
$$;

-- 8. تعديل وظيفة get_customer_debts لتشمل جميع الطلبات ذات المبالغ المتبقية
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
    COALESCE(o.slug, CONCAT('ORD-', SUBSTRING(o.id::TEXT, 1, 8))) AS order_number,
    o.created_at,
    o.total,
    COALESCE(o.amount_paid, 0) AS amount_paid,
    COALESCE(o.remaining_amount, 0) AS remaining_amount,
    o.employee_id,
    COALESCE(u.name, 'غير معروف') AS employee_name
  FROM 
    orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.employee_id = u.id
  WHERE 
    o.organization_id = p_organization_id
    AND o.payment_status = 'pending'
    AND o.remaining_amount > 0
  ORDER BY 
    c.name ASC, o.created_at DESC;
END;
$$;

-- 9. حذف وظيفة record_payment_transaction القديمة
DROP FUNCTION IF EXISTS record_payment_transaction(UUID, DECIMAL, TEXT, BOOLEAN, BOOLEAN);

-- 10. إصلاح وظيفة record_payment_transaction للتعامل بشكل صحيح مع الدفعات المتتالية
CREATE OR REPLACE FUNCTION record_payment_transaction(
  p_order_id UUID,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_is_partial BOOLEAN,
  p_consider_remaining_as_partial BOOLEAN
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_order orders;
  v_transaction_id UUID;
  v_remaining_amount DECIMAL(10, 2);
  v_new_amount_paid DECIMAL(10, 2);
BEGIN
  -- الحصول على بيانات الطلب
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود: %', p_order_id;
  END IF;
  
  -- حساب المبلغ المدفوع الجديد (إضافة المبلغ الجديد إلى المبلغ القديم)
  v_new_amount_paid := COALESCE(v_order.amount_paid, 0) + p_amount;
  
  -- حساب المبلغ المتبقي
  v_remaining_amount := v_order.total - v_new_amount_paid;
  
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
      WHEN v_remaining_amount <= 0 THEN 'paid'
      WHEN p_is_partial THEN 'pending'
      ELSE 'paid'
    END,
    amount_paid = v_new_amount_paid,
    remaining_amount = GREATEST(v_remaining_amount, 0),
    consider_remaining_as_partial = CASE
      WHEN v_remaining_amount <= 0 THEN FALSE
      ELSE p_consider_remaining_as_partial
    END,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN v_transaction_id;
END;
$$; 