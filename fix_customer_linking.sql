-- ملف إصلاح ربط العملاء بالديون
-- هذا الملف يحل مشكلة ظهور اسم "زائر" في قائمة الديون بدلاً من اسم العميل الحقيقي

-- 1. فحص العملاء والمستخدمين المرتبطين بالطلبات التي لديها ديون
SELECT o.id AS order_id, o.customer_id, c.name AS customer_name, u.name AS user_name, o.total, o.amount_paid, o.remaining_amount
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN users u ON o.customer_id = u.id
WHERE o.remaining_amount > 0 AND o.payment_status = 'pending';

-- 2. إنشاء سجلات في جدول customers للمستخدمين الذين لديهم طلبات مع ديون ولكن ليس لديهم سجل في customers
INSERT INTO customers (id, name, email, phone, created_at, updated_at, organization_id)
SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    NOW(),
    NOW(),
    u.organization_id
FROM users u
JOIN orders o ON o.customer_id = u.id
LEFT JOIN customers c ON c.id = u.id
WHERE c.id IS NULL 
  AND o.remaining_amount > 0 
  AND o.payment_status = 'pending'
  AND u.id != '00000000-0000-0000-0000-000000000000'
GROUP BY u.id, u.name, u.email, u.phone, u.organization_id;

-- 3. تعديل وظيفة get_customer_debts لتحسين طريقة الحصول على أسماء العملاء

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
    COALESCE(c.id, u.id) AS customer_id,
    COALESCE(c.name, u.name, 'زائر') AS customer_name,
    o.id AS order_id,
    COALESCE(o.slug, CONCAT('ORD-', SUBSTRING(o.id::TEXT, 1, 8))) AS order_number,
    o.created_at,
    o.total,
    COALESCE(o.amount_paid, 0) AS amount_paid,
    COALESCE(o.remaining_amount, 0) AS remaining_amount,
    o.employee_id,
    COALESCE(emp.name, 'غير معروف') AS employee_name
  FROM 
    orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.customer_id = u.id AND c.id IS NULL
    LEFT JOIN users emp ON o.employee_id = emp.id
  WHERE 
    o.organization_id = p_organization_id
    AND o.payment_status = 'pending'
    AND o.remaining_amount > 0
  ORDER BY 
    COALESCE(c.name, u.name, 'زائر') ASC, o.created_at DESC;
END;
$$;

-- 4. تعديل وظيفة get_debts_by_customer للتعامل مع بيانات العملاء من جدول users أيضًا
CREATE OR REPLACE FUNCTION get_debts_by_customer(p_organization_id UUID)
RETURNS TABLE (
    customer_id UUID,
    customer_name TEXT,
    total_debts NUMERIC,
    orders_count BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY 
  WITH customer_debts AS (
    SELECT 
      COALESCE(c.id, u.id) AS cust_id,
      COALESCE(c.name, u.name, 'زائر') AS cust_name,
      o.remaining_amount
    FROM 
      orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.customer_id = u.id AND c.id IS NULL
    WHERE 
      o.organization_id = p_organization_id
      AND o.payment_status = 'pending'
      AND o.remaining_amount > 0
  )
  SELECT 
    cd.cust_id AS customer_id,
    cd.cust_name AS customer_name,
    COALESCE(SUM(cd.remaining_amount), 0) AS total_debts,
    COUNT(*)::BIGINT AS orders_count
  FROM 
    customer_debts cd
  GROUP BY 
    cd.cust_id, cd.cust_name
  ORDER BY 
    total_debts DESC;
END;
$$; 