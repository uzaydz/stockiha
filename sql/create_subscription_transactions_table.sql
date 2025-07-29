-- إنشاء جدول معاملات الاشتراكات لخدمات الاشتراك
-- تاريخ الإنشاء: 2025-01-12
-- تم التحديث: 2025-01-12

-- التأكد من وجود الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- حذف الجدول إذا كان موجوداً (للتطوير فقط)
DROP TABLE IF EXISTS subscription_transactions CASCADE;

-- إنشاء جدول معاملات الاشتراكات
CREATE TABLE subscription_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    
    -- معلومات الخدمة
    service_id UUID,
    service_name TEXT NOT NULL,
    provider TEXT,
    logo_url TEXT,
    
    -- معلومات المعاملة
    transaction_type TEXT NOT NULL DEFAULT 'sale' CHECK (transaction_type IN ('sale', 'refund', 'exchange')),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cost NUMERIC(10, 2),
    profit NUMERIC(10, 2),
    
    -- معلومات العميل
    customer_id UUID,
    customer_name TEXT,
    customer_contact TEXT,
    
    -- معلومات الدفع
    payment_method TEXT,
    payment_reference TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- تفاصيل إضافية
    quantity INTEGER DEFAULT 1,
    description TEXT,
    notes TEXT,
    
    -- معلومات التتبع
    tracking_code TEXT,
    public_tracking_code TEXT,
    
    -- معلومات حساب العميل للاشتراك
    account_username TEXT,
    account_email TEXT,
    account_password TEXT,
    account_notes TEXT,
    
    -- معلومات الموظف
    processed_by UUID,
    approved_by UUID,
    
    -- طوابع زمنية
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- التعليق على الجدول
COMMENT ON TABLE subscription_transactions IS 'جدول معاملات الاشتراكات - يحتوي على جميع معاملات الاشتراكات للمؤسسات';

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_organization_id ON subscription_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_service_id ON subscription_transactions(service_id);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_customer_id ON subscription_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_payment_status ON subscription_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_transaction_type ON subscription_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_created_at ON subscription_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_transactions_tracking_code ON subscription_transactions(tracking_code);

-- إنشاء دالة لتحديث حقل updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_subscription_transactions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث timestamp
DROP TRIGGER IF EXISTS update_subscription_transactions_timestamp_trigger ON subscription_transactions;
CREATE TRIGGER update_subscription_transactions_timestamp_trigger
    BEFORE UPDATE ON subscription_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_transactions_timestamp();

-- إنشاء دالة لحفظ معلومات حساب العميل
CREATE OR REPLACE FUNCTION update_subscription_account_info(
    p_transaction_id UUID,
    p_username TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_password TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_transaction RECORD;
BEGIN
    -- التحقق من وجود المعاملة
    SELECT * INTO v_transaction
    FROM subscription_transactions
    WHERE id = p_transaction_id;
    
    IF v_transaction IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'المعاملة غير موجودة'
        );
    END IF;
    
    -- تحديث معلومات الحساب
    UPDATE subscription_transactions
    SET 
        account_username = COALESCE(p_username, account_username),
        account_email = COALESCE(p_email, account_email),
        account_password = COALESCE(p_password, account_password),
        account_notes = COALESCE(p_notes, account_notes),
        updated_at = NOW()
    WHERE id = p_transaction_id;
    
    -- إعداد النتيجة
    v_result := jsonb_build_object(
        'success', TRUE,
        'message', 'تم تحديث معلومات الحساب بنجاح',
        'transaction_id', p_transaction_id
    );
    
    RETURN v_result;
END;
$$;

-- إنشاء دالة لإنشاء معاملة اشتراك جديدة
CREATE OR REPLACE FUNCTION create_subscription_transaction(
    p_organization_id UUID,
    p_service_name TEXT,
    p_amount NUMERIC(10, 2),
    p_customer_name TEXT DEFAULT NULL,
    p_customer_contact TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash',
    p_provider TEXT DEFAULT NULL,
    p_logo_url TEXT DEFAULT NULL,
    p_tracking_code TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
    v_result JSONB;
    v_generated_tracking_code TEXT;
BEGIN
    -- توليد كود تتبع إذا لم يتم تمريره
    IF p_tracking_code IS NULL THEN
        v_generated_tracking_code := 'SUB-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 8);
    ELSE
        v_generated_tracking_code := p_tracking_code;
    END IF;
    
    -- إنشاء المعاملة
    INSERT INTO subscription_transactions (
        organization_id,
        service_name,
        provider,
        logo_url,
        amount,
        customer_name,
        customer_contact,
        payment_method,
        tracking_code,
        public_tracking_code,
        notes,
        payment_status
    ) VALUES (
        p_organization_id,
        p_service_name,
        p_provider,
        p_logo_url,
        p_amount,
        p_customer_name,
        p_customer_contact,
        p_payment_method,
        v_generated_tracking_code,
        v_generated_tracking_code,
        p_notes,
        'completed'
    ) RETURNING id INTO v_transaction_id;
    
    -- إعداد النتيجة
    v_result := jsonb_build_object(
        'success', TRUE,
        'message', 'تم إنشاء معاملة الاشتراك بنجاح',
        'transaction_id', v_transaction_id,
        'tracking_code', v_generated_tracking_code
    );
    
    RETURN v_result;
END;
$$;

-- إنشاء view للإحصائيات
CREATE OR REPLACE VIEW subscription_transactions_stats AS
SELECT 
    organization_id,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed_transactions,
    COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_transactions,
    COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_transactions,
    COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN profit ELSE 0 END), 0) as total_profit,
    COUNT(CASE WHEN payment_status = 'completed' AND DATE(created_at) = CURRENT_DATE THEN 1 END) as today_transactions,
    COALESCE(SUM(CASE WHEN payment_status = 'completed' AND DATE(created_at) = CURRENT_DATE THEN amount ELSE 0 END), 0) as today_revenue
FROM subscription_transactions
GROUP BY organization_id;

-- إضافة بيانات تجريبية (اختياري)
-- INSERT INTO subscription_transactions (
--     organization_id,
--     service_name,
--     provider,
--     amount,
--     customer_name,
--     customer_contact,
--     payment_method,
--     tracking_code,
--     public_tracking_code,
--     payment_status
-- ) VALUES (
--     '00000000-0000-0000-0000-000000000001',
--     'Netflix Premium',
--     'Netflix',
--     1500.00,
--     'أحمد محمد',
--     '0555123456',
--     'cash',
--     'SUB-1705123456-ABC123',
--     'SUB-1705123456-ABC123',
--     'completed'
-- );

-- إعطاء الصلاحيات المناسبة
-- GRANT SELECT, INSERT, UPDATE ON subscription_transactions TO authenticated;
-- GRANT EXECUTE ON FUNCTION create_subscription_transaction TO authenticated;
-- GRANT EXECUTE ON FUNCTION update_subscription_account_info TO authenticated;
-- GRANT SELECT ON subscription_transactions_stats TO authenticated;

-- إضافة تعليقات للوثائق
COMMENT ON COLUMN subscription_transactions.id IS 'المعرف الفريد للمعاملة';
COMMENT ON COLUMN subscription_transactions.organization_id IS 'معرف المؤسسة';
COMMENT ON COLUMN subscription_transactions.service_name IS 'اسم الخدمة';
COMMENT ON COLUMN subscription_transactions.provider IS 'مزود الخدمة';
COMMENT ON COLUMN subscription_transactions.amount IS 'مبلغ المعاملة';
COMMENT ON COLUMN subscription_transactions.tracking_code IS 'كود التتبع الداخلي';
COMMENT ON COLUMN subscription_transactions.public_tracking_code IS 'كود التتبع العام للعميل';
COMMENT ON COLUMN subscription_transactions.account_username IS 'اسم المستخدم لحساب العميل';
COMMENT ON COLUMN subscription_transactions.account_email IS 'البريد الإلكتروني لحساب العميل';
COMMENT ON COLUMN subscription_transactions.account_password IS 'كلمة المرور لحساب العميل';
COMMENT ON COLUMN subscription_transactions.account_notes IS 'ملاحظات حول حساب العميل';

-- إشعار بنجاح الإنشاء
DO $$
BEGIN
    RAISE NOTICE 'تم إنشاء جدول subscription_transactions وجميع الدوال المرتبطة به بنجاح';
END $$; 

-- دالة حذف معاملة اشتراك
CREATE OR REPLACE FUNCTION delete_subscription_transaction(
  p_transaction_id UUID
) RETURNS JSON AS $$
DECLARE
  v_organization_id TEXT;
  v_transaction_exists BOOLEAN;
BEGIN
  -- التحقق من وجود المعاملة
  SELECT organization_id INTO v_organization_id
  FROM subscription_transactions 
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'معاملة الاشتراك غير موجودة'
    );
  END IF;
  
  -- حذف المعاملة
  DELETE FROM subscription_transactions 
  WHERE id = p_transaction_id;
  
  -- التحقق من نجاح الحذف
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'فشل في حذف معاملة الاشتراك'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم حذف معاملة الاشتراك بنجاح'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'خطأ في حذف معاملة الاشتراك: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 