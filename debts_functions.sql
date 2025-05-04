-- debts_functions.sql
-- ملف لإضافة وظائف قاعدة البيانات الخاصة بإدارة الديون والدفعات الجزئية

-- 1. وظيفة للحصول على ملخص الدفعات الجزئية والديون
CREATE OR REPLACE FUNCTION get_partial_payments_summary(
  p_organization_id UUID
) RETURNS TABLE (
  total_debts DECIMAL(10, 2),
  total_partial_payments INTEGER
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    COALESCE(SUM(o.remaining_amount), 0) AS total_debts,
    COUNT(o.id) AS total_partial_payments
  FROM 
    orders o
  WHERE 
    o.organization_id = p_organization_id
    AND o.payment_status = 'pending'
    AND o.amount_paid IS NOT NULL
    AND o.remaining_amount > 0
    AND o.consider_remaining_as_partial = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 2. وظيفة للحصول على الديون حسب الموظف
CREATE OR REPLACE FUNCTION get_debts_by_employee(
  p_organization_id UUID
) RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  total_debts DECIMAL(10, 2),
  orders_count INTEGER
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    e.id AS employee_id,
    e.name AS employee_name,
    COALESCE(SUM(o.remaining_amount), 0) AS total_debts,
    COUNT(o.id) AS orders_count
  FROM 
    employees e
  LEFT JOIN orders o ON o.employee_id = e.id 
    AND o.organization_id = p_organization_id
    AND o.payment_status = 'pending'
    AND o.amount_paid IS NOT NULL
    AND o.remaining_amount > 0
    AND o.consider_remaining_as_partial = TRUE
  WHERE 
    e.organization_id = p_organization_id
  GROUP BY 
    e.id, e.name
  HAVING 
    COUNT(o.id) > 0
  ORDER BY 
    total_debts DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. وظيفة للحصول على ديون العملاء
CREATE OR REPLACE FUNCTION get_customer_debts(
  p_organization_id UUID
) RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  order_id UUID,
  order_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  total DECIMAL(10, 2),
  amount_paid DECIMAL(10, 2),
  remaining_amount DECIMAL(10, 2),
  employee_id UUID,
  employee_name TEXT
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    o.id AS order_id,
    'ORD-' || o.customer_order_number::TEXT AS order_number,
    o.created_at,
    o.total,
    o.amount_paid,
    o.remaining_amount,
    e.id AS employee_id,
    e.name AS employee_name
  FROM 
    orders o
  JOIN customers c ON o.customer_id = c.id
  LEFT JOIN employees e ON o.employee_id = e.id
  WHERE 
    o.organization_id = p_organization_id
    AND o.payment_status = 'pending'
    AND o.amount_paid IS NOT NULL
    AND o.remaining_amount > 0
    AND o.consider_remaining_as_partial = TRUE
  ORDER BY 
    c.name, o.created_at DESC;
END;
$$ LANGUAGE plpgsql; 