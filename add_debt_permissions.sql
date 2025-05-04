-- add_debt_permissions.sql
-- إضافة صلاحيات العمل مع الديون في النظام

-- بدء المعاملة
BEGIN;

-- إضافة الدالة التي تتحقق من صلاحيات الديون
CREATE OR REPLACE FUNCTION public.check_debt_permission(permission text)
RETURNS boolean AS $$
DECLARE
  permissions jsonb;
  is_org_admin boolean;
  is_super_admin boolean;
  user_role text;
BEGIN
  -- الحصول على بيانات المستخدم الحالي
  SELECT
    u.permissions,
    u.role,
    u.is_org_admin,
    u.is_super_admin
  INTO
    permissions,
    user_role,
    is_org_admin,
    is_super_admin
  FROM
    public.users u
  WHERE
    u.id = auth.uid();

  -- مدير النظام لديه جميع الصلاحيات
  IF is_super_admin = true THEN
    RETURN true;
  END IF;

  -- مدير المؤسسة لديه صلاحيات كاملة في مؤسسته
  IF is_org_admin = true OR user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- التحقق من الصلاحية المطلوبة إذا لم تكن مدير نظام أو مدير مؤسسة
  IF permissions IS NULL THEN
    RETURN false;
  END IF;

  -- التحقق من صلاحية الديون
  RETURN (permissions->>permission)::boolean = true;

EXCEPTION WHEN OTHERS THEN
  -- في حالة حدوث أي خطأ، تكون الصلاحية ممنوعة
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحسين وظيفة get_debts_data التي تستخدم للحصول على بيانات الديون
CREATE OR REPLACE FUNCTION public.get_debts_data(organization_id uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- التحقق من صلاحية الوصول لصفحة الديون
  IF NOT check_debt_permission('viewDebts') THEN
    RAISE EXCEPTION 'ليس لديك صلاحية للوصول إلى بيانات الديون';
  END IF;
  
  -- استعلام وتجميع بيانات الديون
  WITH summary AS (
    SELECT * FROM get_partial_payments_summary(organization_id)
  ),
  debts_by_customer AS (
    SELECT * FROM get_debts_by_customer(organization_id)
  ),
  customer_debts AS (
    SELECT * FROM get_customer_debts(organization_id)
  )
  SELECT json_build_object(
    'totalDebts', (SELECT COALESCE(total_debts, 0) FROM summary),
    'totalPartialPayments', (SELECT COALESCE(total_partial_payments, 0) FROM summary),
    'debtsByCustomer', (SELECT json_agg(debts_by_customer) FROM debts_by_customer),
    'customerDebts', (SELECT json_agg(customer_debts) FROM customer_debts)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحسين وظيفة get_customer_debts للتحقق من الصلاحيات
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
BEGIN
  -- التحقق من صلاحية الوصول لسجل ديون العملاء
  IF NOT (check_debt_permission('viewDebts') OR check_debt_permission('viewCustomerDebtHistory')) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية للوصول إلى سجل ديون العملاء';
  END IF;
  
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تطوير وظيفة تسجيل دفع الديون للتحقق من الصلاحيات
CREATE OR REPLACE FUNCTION public.record_debt_payment(
  p_order_id UUID,
  p_amount DECIMAL(10, 2),
  p_is_full_payment BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_result UUID;
  v_organization_id UUID;
BEGIN
  -- الحصول على معرف المؤسسة من الطلب
  SELECT organization_id INTO v_organization_id FROM orders WHERE id = p_order_id;
  
  -- التحقق من صلاحية تسجيل دفعات الديون
  IF NOT check_debt_permission('recordDebtPayments') THEN
    RAISE EXCEPTION 'ليس لديك صلاحية لتسجيل دفعات الديون';
  END IF;
  
  -- تسجيل الدفع باستخدام وظيفة تسجيل المعاملات الموجودة
  -- مع تمرير 'cash' كوسيلة دفع افتراضية وتحديد ما إذا كان دفعًا كاملاً
  SELECT id INTO v_result FROM record_payment_transaction(
    p_order_id := p_order_id,
    p_amount := p_amount,
    p_payment_method := 'cash',
    p_is_partial := NOT p_is_full_payment,
    p_consider_remaining_as_partial := TRUE
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء سياسات RLS للتحكم في الوصول إلى صفحة الديون
-- هذه السياسات تتحقق من صلاحيات المستخدم عند محاولة الوصول إلى بيانات الديون

-- ضمان وجود أعمدة للدفعات الجزئية في جدول الطلبات
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'amount_paid'
  ) THEN
    ALTER TABLE orders ADD COLUMN amount_paid DECIMAL(10, 2);
    ALTER TABLE orders ADD COLUMN remaining_amount DECIMAL(10, 2);
    ALTER TABLE orders ADD COLUMN consider_remaining_as_partial BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- إتمام المعاملة
COMMIT; 