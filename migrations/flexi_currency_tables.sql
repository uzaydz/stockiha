-- جدول شبكات الفليكسي (Djezzy, Ooredoo, Mobilis)
CREATE TABLE IF NOT EXISTS flexi_networks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- اسم الشبكة (Djezzy, Ooredoo, Mobilis)
  description TEXT, -- وصف الشبكة
  icon TEXT, -- أيقونة الشبكة
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- جدول رصيد الفليكسي للمسؤول
CREATE TABLE IF NOT EXISTS flexi_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  network_id UUID NOT NULL REFERENCES flexi_networks(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0, -- الرصيد بالدينار الجزائري
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (network_id, organization_id)
);

-- جدول العملات الرقمية والمنصات المالية
CREATE TABLE IF NOT EXISTS digital_currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- اسم العملة أو المنصة (Euro, USDT, Paysera, Wise, Binance)
  code TEXT NOT NULL, -- رمز العملة (EUR, USDT, etc.)
  type TEXT NOT NULL, -- نوع (currency, platform)
  icon TEXT, -- أيقونة العملة
  exchange_rate DECIMAL(12, 4) DEFAULT 1, -- سعر الصرف مقابل الدينار الجزائري
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- جدول رصيد العملات الرقمية للمسؤول
CREATE TABLE IF NOT EXISTS currency_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency_id UUID NOT NULL REFERENCES digital_currencies(id) ON DELETE CASCADE,
  balance DECIMAL(12, 4) NOT NULL DEFAULT 0, -- الرصيد بالعملة المحددة
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (currency_id, organization_id)
);

-- جدول عمليات بيع الفليكسي
CREATE TABLE IF NOT EXISTS flexi_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  network_id UUID NOT NULL REFERENCES flexi_networks(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL, -- المبلغ المباع بالدينار الجزائري
  phone_number TEXT NOT NULL, -- رقم الهاتف للشحن
  status TEXT NOT NULL DEFAULT 'pending', -- حالة العملية (pending, completed, failed)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- جدول عمليات بيع العملات الرقمية
CREATE TABLE IF NOT EXISTS currency_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency_id UUID NOT NULL REFERENCES digital_currencies(id) ON DELETE CASCADE,
  amount DECIMAL(12, 4) NOT NULL, -- المبلغ المباع بالعملة الأصلية
  dinar_amount DECIMAL(12, 2) NOT NULL, -- المبلغ المدفوع بالدينار الجزائري
  customer_details JSONB, -- بيانات العميل (رقم الهاتف، حساب المحفظة، إلخ)
  status TEXT NOT NULL DEFAULT 'pending', -- حالة العملية (pending, completed, failed)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

-- إضافة سياسات RLS
ALTER TABLE flexi_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flexi_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE flexi_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_sales ENABLE ROW LEVEL SECURITY;

-- سياسات للشبكات
CREATE POLICY flexi_networks_organization_isolation ON flexi_networks
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- سياسات للأرصدة
CREATE POLICY flexi_balances_organization_isolation ON flexi_balances
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- سياسات للعملات
CREATE POLICY digital_currencies_organization_isolation ON digital_currencies
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- سياسات لأرصدة العملات
CREATE POLICY currency_balances_organization_isolation ON currency_balances
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- سياسات لمبيعات الفليكسي
CREATE POLICY flexi_sales_organization_isolation ON flexi_sales
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- سياسات لمبيعات العملات
CREATE POLICY currency_sales_organization_isolation ON currency_sales
  USING (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

-- دوال للإحصائيات
CREATE OR REPLACE FUNCTION get_flexi_stats(org_id UUID)
RETURNS TABLE (
  network TEXT,
  total_sales DECIMAL(12, 2),
  total_transactions INT,
  latest_transaction TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    fn.name as network,
    COALESCE(SUM(fs.amount), 0) as total_sales,
    COUNT(fs.id)::INT as total_transactions,
    MAX(fs.created_at) as latest_transaction
  FROM flexi_networks fn
  LEFT JOIN flexi_sales fs ON fn.id = fs.network_id AND fs.organization_id = org_id
  WHERE fn.organization_id = org_id
  GROUP BY fn.id, fn.name
  ORDER BY total_sales DESC;
$$;

CREATE OR REPLACE FUNCTION get_currency_stats(org_id UUID)
RETURNS TABLE (
  currency TEXT,
  currency_code TEXT,
  total_sales_original DECIMAL(12, 4),
  total_sales_dinar DECIMAL(12, 2),
  total_transactions INT,
  latest_transaction TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    dc.name as currency,
    dc.code as currency_code,
    COALESCE(SUM(cs.amount), 0) as total_sales_original,
    COALESCE(SUM(cs.dinar_amount), 0) as total_sales_dinar,
    COUNT(cs.id)::INT as total_transactions,
    MAX(cs.created_at) as latest_transaction
  FROM digital_currencies dc
  LEFT JOIN currency_sales cs ON dc.id = cs.currency_id AND cs.organization_id = org_id
  WHERE dc.organization_id = org_id
  GROUP BY dc.id, dc.name, dc.code
  ORDER BY total_sales_dinar DESC;
$$;

-- إضافة بيانات افتراضية

-- تحتاج إلى تحديد معرف المنظمة الموجود بالفعل في جدول organizations
-- على سبيل المثال:
-- DO $$
-- DECLARE
--   org_id UUID := 'UUID-الفعلي-للمنظمة'; -- يجب استبدال هذا بمعرف منظمة موجود
-- BEGIN

INSERT INTO flexi_networks (name, description, icon, organization_id)
VALUES 
  ('جيزي', 'شبكة جيزي للاتصالات', 'Phone', (SELECT id FROM organizations LIMIT 1)),
  ('أوريدو', 'شبكة أوريدو للاتصالات', 'Phone', (SELECT id FROM organizations LIMIT 1)),
  ('موبيليس', 'شبكة موبيليس للاتصالات', 'Phone', (SELECT id FROM organizations LIMIT 1));

INSERT INTO digital_currencies (name, code, type, icon, exchange_rate, organization_id)
VALUES 
  ('يورو', 'EUR', 'currency', 'EuroIcon', 150, (SELECT id FROM organizations LIMIT 1)),
  ('تيذر', 'USDT', 'currency', 'DollarIcon', 140, (SELECT id FROM organizations LIMIT 1)),
  ('بايسيرا', 'PAYSERA', 'platform', 'CreditCardIcon', 1, (SELECT id FROM organizations LIMIT 1)),
  ('وايز', 'WISE', 'platform', 'CreditCardIcon', 1, (SELECT id FROM organizations LIMIT 1)),
  ('بينانس', 'BINANCE', 'platform', 'CoinsIcon', 1, (SELECT id FROM organizations LIMIT 1)); 