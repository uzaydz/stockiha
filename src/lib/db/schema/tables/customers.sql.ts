/**
 * ⚡ Customers Table Schema
 * متطابق 100% مع Supabase
 */

export const CUSTOMERS_TABLE = `
CREATE TABLE IF NOT EXISTS customers (
  -- ═══════════════════════════════════════════════════════════════
  -- المفاتيح
  -- ═══════════════════════════════════════════════════════════════
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,

  -- ═══════════════════════════════════════════════════════════════
  -- المعلومات الأساسية
  -- ═══════════════════════════════════════════════════════════════
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  secondary_phone TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- العنوان
  -- ═══════════════════════════════════════════════════════════════
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  wilaya TEXT,
  commune TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- الإحصائيات
  -- ═══════════════════════════════════════════════════════════════
  total_orders INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  last_order_date TEXT,
  points INTEGER DEFAULT 0,

  -- ═══════════════════════════════════════════════════════════════
  -- التصنيف
  -- ═══════════════════════════════════════════════════════════════
  customer_type TEXT DEFAULT 'individual',
  tier TEXT DEFAULT 'regular',
  tags TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- الشركة
  -- ═══════════════════════════════════════════════════════════════
  company_name TEXT,
  tax_id TEXT,
  registration_number TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- الحالة
  -- ═══════════════════════════════════════════════════════════════
  is_active INTEGER DEFAULT 1,
  is_verified INTEGER DEFAULT 0,
  accepts_marketing INTEGER DEFAULT 1,

  -- ═══════════════════════════════════════════════════════════════
  -- ملاحظات
  -- ═══════════════════════════════════════════════════════════════
  notes TEXT,
  internal_notes TEXT,
  metadata TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- المصدر
  -- ═══════════════════════════════════════════════════════════════
  source TEXT,
  referred_by TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- التواريخ
  -- ═══════════════════════════════════════════════════════════════
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- ═══════════════════════════════════════════════════════════════
  -- أعمدة المزامنة المحلية
  -- ═══════════════════════════════════════════════════════════════
  _synced INTEGER DEFAULT 0,
  _sync_status TEXT DEFAULT 'pending',
  _pending_operation TEXT,
  _local_updated_at TEXT,
  _name_lower TEXT,
  _phone_digits TEXT,
  _email_lower TEXT,
  _total_debt REAL DEFAULT 0
);
`;

export const CUSTOMERS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name_lower ON customers(_name_lower);
CREATE INDEX IF NOT EXISTS idx_customers_phone_digits ON customers(_phone_digits);
CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON customers(_email_lower);
CREATE INDEX IF NOT EXISTS idx_customers_sync ON customers(_synced, _sync_status);
`;

/**
 * ⚡ Customer Addresses Table
 */
export const CUSTOMER_ADDRESSES_TABLE = `
CREATE TABLE IF NOT EXISTS customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  label TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL,
  postal_code TEXT,
  wilaya TEXT,
  commune TEXT,
  is_default INTEGER DEFAULT 0,
  is_billing INTEGER DEFAULT 0,
  is_shipping INTEGER DEFAULT 1,
  phone TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  _synced INTEGER DEFAULT 0,
  _sync_status TEXT DEFAULT 'pending',
  _pending_operation TEXT,

  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
`;
