-- جدول خطط الاشتراك
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::JSONB,
  monthly_price NUMERIC(10, 2) NOT NULL,
  yearly_price NUMERIC(10, 2) NOT NULL,
  trial_period_days INTEGER NOT NULL DEFAULT 0,
  limits JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- جدول اشتراكات المؤسسات
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_method_id UUID REFERENCES payment_methods(id),
  payment_details JSONB DEFAULT '{}'::JSONB,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- جدول سجل الاشتراكات
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES organization_subscriptions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('subscribe', 'renewal', 'cancel', 'upgrade', 'downgrade', 'expire')),
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- جدول طرق الدفع
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  instructions TEXT,
  icon TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- جدول إعدادات الاشتراك
CREATE TABLE IF NOT EXISTS subscription_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- جدول رموز تفعيل الاشتراك
CREATE TABLE IF NOT EXISTS activation_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by UUID REFERENCES organizations(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إضافة أعمدة الاشتراك إلى جدول المؤسسات (إذا لم تكن موجودة بالفعل)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES organization_subscriptions(id),
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';

-- إنشاء الفهارس للتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_org_id ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_activation_codes_is_used ON activation_codes(is_used);

-- إنشاء الوظيفة المخزنة (stored procedure) لتفعيل الاشتراك عن طريق كود التفعيل
CREATE OR REPLACE FUNCTION activate_subscription_with_code(
  org_id UUID,
  code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activation_code RECORD;
  v_subscription_id UUID;
  v_plan RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_result JSONB;
BEGIN
  -- التحقق من وجود الكود وصلاحيته
  SELECT * INTO v_activation_code
  FROM activation_codes
  WHERE code = activate_subscription_with_code.code
    AND is_used = FALSE
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_activation_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'كود التفعيل غير صالح أو تم استخدامه بالفعل'
    );
  END IF;
  
  -- جلب بيانات خطة الاشتراك
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = v_activation_code.plan_id;
  
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'خطة الاشتراك غير موجودة'
    );
  END IF;
  
  -- حساب فترة الاشتراك
  v_start_date := CURRENT_DATE;
  
  IF v_activation_code.billing_cycle = 'monthly' THEN
    v_end_date := v_start_date + INTERVAL '1 month';
  ELSE
    v_end_date := v_start_date + INTERVAL '1 year';
  END IF;
  
  -- إنشاء اشتراك جديد
  INSERT INTO organization_subscriptions (
    organization_id,
    plan_id,
    status,
    billing_cycle,
    start_date,
    end_date,
    amount
  ) VALUES (
    org_id,
    v_activation_code.plan_id,
    'active',
    v_activation_code.billing_cycle,
    v_start_date,
    v_end_date,
    CASE WHEN v_activation_code.billing_cycle = 'monthly' THEN v_plan.monthly_price ELSE v_plan.yearly_price END
  ) RETURNING id INTO v_subscription_id;
  
  -- تحديث المؤسسة بالاشتراك الجديد
  UPDATE organizations
  SET 
    subscription_id = v_subscription_id,
    subscription_tier = v_plan.code,
    subscription_status = 'active'
  WHERE id = org_id;
  
  -- إضافة سجل في سجل الاشتراكات
  INSERT INTO subscription_history (
    organization_id,
    subscription_id,
    action,
    details
  ) VALUES (
    org_id,
    v_subscription_id,
    'subscribe',
    jsonb_build_object(
      'plan_name', v_plan.name,
      'plan_code', v_plan.code,
      'billing_cycle', v_activation_code.billing_cycle,
      'activation_code', activate_subscription_with_code.code
    )
  );
  
  -- تحديث حالة كود التفعيل
  UPDATE activation_codes
  SET 
    is_used = TRUE,
    used_by = org_id,
    used_at = NOW()
  WHERE id = v_activation_code.id;
  
  -- إعداد النتيجة
  v_result := jsonb_build_object(
    'success', TRUE,
    'message', 'تم تفعيل الاشتراك بنجاح',
    'subscription', jsonb_build_object(
      'plan_name', v_plan.name,
      'billing_cycle', v_activation_code.billing_cycle,
      'end_date', v_end_date
    )
  );
  
  RETURN v_result;
END;
$$; 