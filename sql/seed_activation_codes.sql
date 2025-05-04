-- إضافة أكواد تفعيل تجريبية للاشتراكات

-- كود تفعيل للخطة الأساسية (شهري)
INSERT INTO activation_codes (
  code,
  plan_id,
  billing_cycle,
  expires_at
)
SELECT
  'BASIC-MONTHLY-2024',
  id,
  'monthly',
  NOW() + INTERVAL '30 days'
FROM subscription_plans
WHERE code = 'basic'
AND NOT EXISTS (
  SELECT 1 FROM activation_codes WHERE code = 'BASIC-MONTHLY-2024'
);

-- كود تفعيل للخطة الأساسية (سنوي)
INSERT INTO activation_codes (
  code,
  plan_id,
  billing_cycle,
  expires_at
)
SELECT
  'BASIC-YEARLY-2024',
  id,
  'yearly',
  NOW() + INTERVAL '30 days'
FROM subscription_plans
WHERE code = 'basic'
AND NOT EXISTS (
  SELECT 1 FROM activation_codes WHERE code = 'BASIC-YEARLY-2024'
);

-- كود تفعيل للخطة المتميزة (شهري)
INSERT INTO activation_codes (
  code,
  plan_id,
  billing_cycle,
  expires_at
)
SELECT
  'PREMIUM-MONTHLY-2024',
  id,
  'monthly',
  NOW() + INTERVAL '30 days'
FROM subscription_plans
WHERE code = 'premium'
AND NOT EXISTS (
  SELECT 1 FROM activation_codes WHERE code = 'PREMIUM-MONTHLY-2024'
);

-- كود تفعيل للخطة المتميزة (سنوي)
INSERT INTO activation_codes (
  code,
  plan_id,
  billing_cycle,
  expires_at
)
SELECT
  'PREMIUM-YEARLY-2024',
  id,
  'yearly',
  NOW() + INTERVAL '30 days'
FROM subscription_plans
WHERE code = 'premium'
AND NOT EXISTS (
  SELECT 1 FROM activation_codes WHERE code = 'PREMIUM-YEARLY-2024'
);

-- كود تفعيل للخطة المؤسسات (شهري)
INSERT INTO activation_codes (
  code,
  plan_id,
  billing_cycle,
  expires_at
)
SELECT
  'ENTERPRISE-MONTHLY-2024',
  id,
  'monthly',
  NOW() + INTERVAL '30 days'
FROM subscription_plans
WHERE code = 'enterprise'
AND NOT EXISTS (
  SELECT 1 FROM activation_codes WHERE code = 'ENTERPRISE-MONTHLY-2024'
);

-- كود تفعيل للخطة المؤسسات (سنوي)
INSERT INTO activation_codes (
  code,
  plan_id,
  billing_cycle,
  expires_at
)
SELECT
  'ENTERPRISE-YEARLY-2024',
  id,
  'yearly',
  NOW() + INTERVAL '30 days'
FROM subscription_plans
WHERE code = 'enterprise'
AND NOT EXISTS (
  SELECT 1 FROM activation_codes WHERE code = 'ENTERPRISE-YEARLY-2024'
); 