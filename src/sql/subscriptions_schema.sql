-- نظام الاشتراكات الجديد لمنصة بازار
-- تاريخ الإنشاء: 2023-09-10

-- جدول خطط الاشتراك
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    features JSONB,
    monthly_price NUMERIC(10, 2) NOT NULL,
    yearly_price NUMERIC(10, 2) NOT NULL,
    trial_period_days INTEGER NOT NULL DEFAULT 5,
    limits JSONB NOT NULL DEFAULT '{"max_users": 3, "max_products": 100, "max_pos": 1}'::JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول اشتراكات المؤسسات
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'trial', 'canceled', 'expired')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ NOT NULL,
    trial_ends_at TIMESTAMPTZ,
    amount_paid NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'DZD',
    payment_method TEXT,
    payment_reference TEXT,
    is_auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, status)
);

-- جدول تاريخ الاشتراكات
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    action TEXT NOT NULL CHECK (action IN ('created', 'renewed', 'upgraded', 'downgraded', 'canceled', 'expired')),
    from_status TEXT,
    to_status TEXT NOT NULL,
    from_plan_id UUID,
    amount NUMERIC(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES users(id)
);

-- جدول إعدادات الاشتراكات العامة
CREATE TABLE IF NOT EXISTS subscription_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trial_days INTEGER NOT NULL DEFAULT 5,
    grace_period_days INTEGER NOT NULL DEFAULT 3,
    reminder_days INTEGER[] DEFAULT '{1, 3, 7}',
    payment_methods JSONB DEFAULT '["bank_transfer", "credit_card", "dhahabia"]'::JSONB,
    tax_rate NUMERIC(5, 2) DEFAULT 19.0,
    currency TEXT NOT NULL DEFAULT 'DZD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تعديل جدول المؤسسات لإضافة حقول الاشتراك
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES organization_subscriptions(id);

-- إضافة خطط الاشتراك الافتراضية
INSERT INTO subscription_plans (name, code, description, features, monthly_price, yearly_price, limits, is_active, is_popular, display_order)
VALUES
-- الخطة التجريبية المجانية
('تجريبي', 'trial', 'تجربة مجانية كاملة الميزات لمدة 5 أيام', 
 '["نقطة بيع واحدة", "حتى 3 مستخدمين", "حتى 100 منتج", "ميزات أساسية", "الدعم عبر البريد الإلكتروني"]'::JSONB,
 0, 0, 
 '{"max_users": 3, "max_products": 100, "max_pos": 1}'::JSONB,
 TRUE, FALSE, 0),

-- الخطة الأساسية
('أساسي', 'basic', 'للشركات الصغيرة والمتاجر الفردية',
 '["نقطة بيع واحدة", "حتى 3 مستخدمين", "حتى 100 منتج", "التقارير الأساسية", "الدعم الفني عبر البريد الإلكتروني"]'::JSONB,
 3999, 39990,
 '{"max_users": 3, "max_products": 100, "max_pos": 1}'::JSONB,
 TRUE, FALSE, 1),

-- الخطة المتميزة
('متميز', 'premium', 'للشركات المتوسطة والمتاجر المتعددة',
 '["حتى 3 نقاط بيع", "حتى 10 مستخدمين", "حتى 500 منتج", "التقارير المتقدمة", "إدارة المخزون المتقدمة", "الدعم الفني على مدار الساعة", "تكامل مع منصات البيع الإلكتروني"]'::JSONB,
 9999, 99990,
 '{"max_users": 10, "max_products": 500, "max_pos": 3}'::JSONB,
 TRUE, TRUE, 2),

-- خطة المؤسسات
('مؤسسات', 'enterprise', 'للشركات الكبيرة والسلاسل التجارية',
 '["عدد غير محدود من نقاط البيع", "عدد غير محدود من المستخدمين", "عدد غير محدود من المنتجات", "جميع الميزات المتقدمة", "دعم فني ومدير حساب مخصص", "تخصيص كامل للنظام", "API للتكامل مع الأنظمة الأخرى", "تدريب فريق العمل"]'::JSONB,
 19999, 199990,
 '{"max_users": null, "max_products": null, "max_pos": null}'::JSONB,
 TRUE, FALSE, 3);

-- إضافة إعدادات الاشتراك الافتراضية
INSERT INTO subscription_settings (trial_days, grace_period_days, reminder_days, payment_methods, tax_rate)
VALUES (5, 3, '{1, 3, 7}', '["bank_transfer", "credit_card", "dhahabia"]'::JSONB, 19.0);

-- إضافة Triggers لتحديث timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_plans_timestamp
BEFORE UPDATE ON subscription_plans
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_organization_subscriptions_timestamp
BEFORE UPDATE ON organization_subscriptions
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_subscription_settings_timestamp
BEFORE UPDATE ON subscription_settings
FOR EACH ROW EXECUTE PROCEDURE update_timestamp(); 