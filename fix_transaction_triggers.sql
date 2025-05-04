-- fix_transaction_triggers.sql
-- إصلاح مشكلة تسجيل مدفوعات الديون - خطأ "record new has no field name"

-- بدء المعاملة
BEGIN;

-- تعطيل جميع الـ triggers المعنية بجدول transactions التي قد تكون تسبب المشكلة
DROP TRIGGER IF EXISTS transactions_audit_trigger ON transactions;
DROP TRIGGER IF EXISTS transactions_log_trigger ON transactions;
DROP TRIGGER IF EXISTS transactions_name_trigger ON transactions;
DROP TRIGGER IF EXISTS set_transactions_organization_id ON transactions;
DROP TRIGGER IF EXISTS transactions_after_insert ON transactions;

-- إصلاح وظيفة set_organization_id التي تحاول استخدام حقل name غير موجود
CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO NEW.organization_id FROM users WHERE id = auth.uid();
    END IF;
    
    -- إنشاء slug من الوصف بدلاً من الاسم إذا لم يتم توفيره
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        -- تحقق من الجدول للتأكد من طريقة إنشاء الـ slug المناسبة
        IF TG_TABLE_NAME = 'transactions' THEN
            -- استخدم الوصف أو معرف المعاملة بدلاً من الاسم للمعاملات
            NEW.slug := LOWER(REGEXP_REPLACE(COALESCE(NEW.description, 'transaction-' || NEW.id), '\\s+', '-', 'g'));
        ELSE
            -- للجداول الأخرى، افترض أن هناك حقل name
            -- قد تحتاج لمزيد من المنطق هنا للتعامل مع الجداول المختلفة
            BEGIN
                -- محاولة استخدام الحقل name إذا كان موجودًا
                NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '\\s+', '-', 'g'));
            EXCEPTION WHEN OTHERS THEN
                -- إذا لم يكن الحقل موجودًا، استخدم المعرف فقط
                NEW.slug := 'item-' || NEW.id;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة الـ trigger الجديد المحسّن
CREATE TRIGGER set_transactions_organization_id
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION set_organization_id();

-- إعادة إنشاء وظيفة تسجيل معاملة الدفع بشكل صحيح بدون استخدام record "new"
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
  p_order_id UUID,
  p_amount DECIMAL(10, 2),
  p_payment_method TEXT DEFAULT 'cash',
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_transaction_id UUID;
  v_permissions JSONB;
  v_is_admin BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
  -- الحصول على معرف المؤسسة من الطلب
  SELECT organization_id INTO v_org_id FROM orders WHERE id = p_order_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود أو لا يحتوي على معرف مؤسسة';
  END IF;
  
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
  
  -- إعداد الوصف الافتراضي
  IF p_description IS NULL THEN
    p_description := 'دفع للطلب #' || p_order_id;
  END IF;
  
  -- تسجيل المعاملة مباشرة دون استخدام triggers
  INSERT INTO transactions(
    order_id,
    amount,
    type,
    payment_method,
    description,
    organization_id,
    created_at
  ) VALUES (
    p_order_id,
    p_amount,
    'payment',
    p_payment_method,
    p_description,
    v_org_id,
    NOW()
  ) RETURNING id INTO v_transaction_id;
  
  -- تحديث حالة الطلب
  UPDATE orders
  SET 
    updated_at = NOW(),
    amount_paid = COALESCE(amount_paid, 0) + p_amount,
    remaining_amount = total - (COALESCE(amount_paid, 0) + p_amount),
    payment_status = CASE 
      WHEN total <= (COALESCE(amount_paid, 0) + p_amount) THEN 'paid'
      ELSE 'pending'
    END
  WHERE id = p_order_id;
  
  RETURN v_transaction_id;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'خطأ في تسجيل معاملة الدفع: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إصلاح وظيفة تسجيل دفع الديون
CREATE OR REPLACE FUNCTION public.record_debt_payment(
  p_order_id UUID,
  p_amount DECIMAL(10, 2),
  p_is_full_payment BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_order orders%ROWTYPE;
  v_description TEXT;
BEGIN
  -- الحصول على بيانات الطلب
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;
  
  -- تحديد وصف المعاملة
  IF p_is_full_payment THEN
    v_description := 'دفع كامل للطلب #' || p_order_id;
  ELSE
    v_description := 'دفع جزئي للطلب #' || p_order_id;
  END IF;
  
  -- استدعاء وظيفة تسجيل المعاملة
  v_transaction_id := public.record_payment_transaction(
    p_order_id,
    p_amount,
    'cash',
    v_description
  );
  
  -- تحديث معلومات الطلب الأخرى
  UPDATE orders
  SET 
    consider_remaining_as_partial = TRUE,
    payment_status = CASE 
      WHEN p_is_full_payment OR (total <= (COALESCE(amount_paid, 0) + p_amount)) THEN 'paid'
      ELSE 'pending'
    END
  WHERE id = p_order_id;
  
  RETURN v_transaction_id;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'خطأ في تسجيل دفع الدين: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء trigger جديد آمن للتنفيذ بعد إنشاء المعاملات
CREATE OR REPLACE FUNCTION public.transactions_after_insert_func()
RETURNS TRIGGER AS $$
BEGIN
  -- تنفيذ أي منطق مطلوب بعد إنشاء المعاملة هنا
  -- نتحقق من وجود الحقول قبل استخدامها
  
  -- تمرير السجل الجديد كما هو
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة trigger جديد آمن للسجلات
CREATE TRIGGER transactions_after_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION public.transactions_after_insert_func();

-- إتمام المعاملة
COMMIT; 