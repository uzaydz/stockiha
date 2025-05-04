-- fix_debt_permissions.sql
-- ملف إصلاح وظائف الديون - معالجة مشكلة عدم وجود جدول employees

-- بدء المعاملة
BEGIN;

-- تعديل وظيفة get_customer_debts للعمل بدون جدول employees
CREATE OR REPLACE FUNCTION public.get_customer_debts(p_organization_id uuid)
RETURNS TABLE (
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
DECLARE
  has_permission BOOLEAN;
BEGIN
  -- اختبار الصلاحية باستخدام طريقة بديلة للتجنب المشاكل المحتملة
  SELECT
    (permissions->>'viewDebts')::boolean = true OR
    (permissions->>'viewCustomerDebtHistory')::boolean = true OR
    is_super_admin = true OR
    is_org_admin = true OR
    role = 'admin'
  INTO has_permission
  FROM public.users
  WHERE id = auth.uid();
  
  IF NOT COALESCE(has_permission, false) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية للوصول إلى سجل ديون العملاء';
  END IF;
  
  RETURN QUERY 
  SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    o.id AS order_id,
    'ORD-' || COALESCE(o.customer_order_number::TEXT, SUBSTRING(o.id::text, 1, 8)) AS order_number,
    o.created_at,
    o.total,
    o.amount_paid,
    o.remaining_amount,
    o.employee_id,
    COALESCE(u.name, 'موظف غير معروف') AS employee_name
  FROM 
    orders o
  JOIN customers c ON o.customer_id = c.id
  LEFT JOIN users u ON o.employee_id = u.id  -- استخدام جدول users بدلاً من employees
  WHERE 
    o.organization_id = p_organization_id
    AND o.payment_status = 'pending'
    AND o.amount_paid IS NOT NULL
    AND o.remaining_amount > 0
    AND o.consider_remaining_as_partial = TRUE
  ORDER BY 
    c.name, o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تعديل وظيفة get_debts_data لدعم حالة عدم وجود بيانات
CREATE OR REPLACE FUNCTION public.get_debts_data(organization_id uuid)
RETURNS json AS $$
DECLARE
  v_summary RECORD;
  v_debts_by_customer json;
  v_customer_debts json;
  v_permissions JSONB;
  v_is_admin BOOLEAN;
  result json;
BEGIN
  -- الحصول على صلاحيات المستخدم
  SELECT 
    permissions, 
    (is_super_admin OR is_org_admin OR role = 'admin') AS is_admin
  INTO 
    v_permissions, 
    v_is_admin 
  FROM 
    users 
  WHERE 
    id = auth.uid();

  -- التحقق من صلاحية الوصول لصفحة الديون
  IF NOT (v_is_admin OR (v_permissions->>'viewDebts')::boolean = true) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية للوصول إلى بيانات الديون';
  END IF;
  
  -- الحصول على بيانات الملخص
  SELECT 
    COALESCE(SUM(o.remaining_amount), 0) AS total_debts,
    COUNT(o.id) AS total_partial_payments
  INTO v_summary
  FROM 
    orders o
  WHERE 
    o.organization_id = organization_id
    AND o.payment_status = 'pending'
    AND o.amount_paid IS NOT NULL
    AND o.remaining_amount > 0
    AND o.consider_remaining_as_partial = TRUE;

  -- الحصول على بيانات الديون حسب العميل
  SELECT 
    COALESCE(
      json_agg(
        json_build_object(
          'customer_id', c.id,
          'customer_name', c.name,
          'total_debts', COALESCE(SUM(o.remaining_amount), 0),
          'orders_count', COUNT(o.id)
        )
      ),
      '[]'
    )
  INTO 
    v_debts_by_customer
  FROM 
    customers c
  LEFT JOIN 
    orders o ON c.id = o.customer_id
    AND o.organization_id = organization_id
    AND o.payment_status = 'pending'
    AND o.amount_paid IS NOT NULL
    AND o.remaining_amount > 0
    AND o.consider_remaining_as_partial = TRUE
  WHERE 
    c.organization_id = organization_id
  GROUP BY 
    c.id, c.name
  HAVING 
    COUNT(o.id) > 0;

  -- محاولة الحصول على ديون العملاء (باستخدام الاستعلام المباشر لتجنب أخطاء RPC)
  BEGIN
    WITH customer_debts_data AS (
      SELECT 
        c.id AS customer_id,
        c.name AS customer_name,
        o.id AS order_id,
        'ORD-' || COALESCE(o.customer_order_number::TEXT, SUBSTRING(o.id::text, 1, 8)) AS order_number,
        o.created_at,
        o.total,
        o.amount_paid,
        o.remaining_amount,
        o.employee_id,
        COALESCE(u.name, 'موظف غير معروف') AS employee_name
      FROM 
        orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.employee_id = u.id
      WHERE 
        o.organization_id = organization_id
        AND o.payment_status = 'pending'
        AND o.amount_paid IS NOT NULL
        AND o.remaining_amount > 0
        AND o.consider_remaining_as_partial = TRUE
      ORDER BY 
        c.name, o.created_at DESC
    ),
    customers_with_debts AS (
      SELECT 
        customer_id,
        customer_name,
        SUM(remaining_amount) AS total_debt,
        COUNT(order_id) AS orders_count
      FROM 
        customer_debts_data
      GROUP BY 
        customer_id, customer_name
    ),
    customer_orders AS (
      SELECT 
        customer_id,
        json_agg(
          json_build_object(
            'orderId', order_id,
            'orderNumber', order_number,
            'date', to_char(created_at, 'YYYY-MM-DD'),
            'total', total,
            'amountPaid', amount_paid,
            'remainingAmount', remaining_amount,
            'employee', employee_name
          )
        ) AS orders
      FROM 
        customer_debts_data
      GROUP BY 
        customer_id
    )
    SELECT 
      COALESCE(
        json_agg(
          json_build_object(
            'customerId', c.customer_id,
            'customerName', c.customer_name,
            'totalDebt', c.total_debt,
            'ordersCount', c.orders_count,
            'orders', o.orders
          )
        ),
        '[]'
      )
    INTO 
      v_customer_debts
    FROM 
      customers_with_debts c
    JOIN 
      customer_orders o ON c.customer_id = o.customer_id;
  EXCEPTION WHEN OTHERS THEN
    -- في حالة الفشل، استخدام مصفوفة فارغة
    v_customer_debts := '[]';
  END;

  -- إعداد النتيجة النهائية
  SELECT 
    json_build_object(
      'totalDebts', COALESCE(v_summary.total_debts, 0),
      'totalPartialPayments', COALESCE(v_summary.total_partial_payments, 0),
      'debtsByCustomer', COALESCE(v_debts_by_customer, '[]'),
      'customerDebts', COALESCE(v_customer_debts, '[]')
    )
  INTO 
    result;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- في حالة حدوث أي خطأ، إرجاع هيكل بيانات فارغ
  RETURN json_build_object(
    'totalDebts', 0,
    'totalPartialPayments', 0,
    'debtsByCustomer', '[]',
    'customerDebts', '[]',
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تعديل وظيفة تسجيل دفع الديون للتحقق من الصلاحيات بطريقة مباشرة
CREATE OR REPLACE FUNCTION public.record_debt_payment(
  p_order_id UUID,
  p_amount DECIMAL(10, 2),
  p_is_full_payment BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_result UUID;
  v_organization_id UUID;
  v_permissions JSONB;
  v_is_admin BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
  -- الحصول على معرف المؤسسة من الطلب
  SELECT organization_id INTO v_organization_id FROM orders WHERE id = p_order_id;
  
  -- التحقق مباشرة من صلاحية تسجيل دفعات الديون
  SELECT 
    permissions, 
    (is_super_admin OR is_org_admin OR role = 'admin') AS is_admin
  INTO 
    v_permissions, 
    v_is_admin 
  FROM 
    users 
  WHERE 
    id = auth.uid();
    
  v_has_permission := v_is_admin OR (v_permissions->>'recordDebtPayments')::boolean = true;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'ليس لديك صلاحية لتسجيل دفعات الديون';
  END IF;
  
  -- تسجيل الدفع باستخدام وظيفة تسجيل المعاملات
  BEGIN
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
      'cash',
      CASE 
        WHEN p_is_full_payment THEN 'دفع كامل للطلب #' || p_order_id
        ELSE 'دفع جزئي للطلب #' || p_order_id
      END,
      v_organization_id
    ) RETURNING id INTO v_result;
    
    -- تحديث بيانات الطلب
    UPDATE orders
    SET 
      payment_status = CASE 
        WHEN p_is_full_payment THEN 'paid'
        ELSE 'pending'
      END,
      amount_paid = CASE
        WHEN amount_paid IS NULL THEN p_amount
        ELSE amount_paid + p_amount
      END,
      remaining_amount = total - (CASE
        WHEN amount_paid IS NULL THEN p_amount
        ELSE amount_paid + p_amount
      END),
      consider_remaining_as_partial = TRUE,
      updated_at = NOW()
    WHERE id = p_order_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'فشل في تسجيل الدفع: %', SQLERRM;
  END;
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'خطأ: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إتمام المعاملة
COMMIT; 