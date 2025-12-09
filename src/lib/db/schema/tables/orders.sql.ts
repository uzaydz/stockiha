/**
 * ⚡ Orders Table Schema
 * متطابق 100% مع Supabase
 *
 * ملاحظة: اسم الجدول الموحد هو 'orders' (وليس pos_orders)
 */

export const ORDERS_TABLE = `
CREATE TABLE IF NOT EXISTS orders (
  -- ═══════════════════════════════════════════════════════════════
  -- المفاتيح
  -- ═══════════════════════════════════════════════════════════════
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  customer_id TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- المبالغ
  -- ═══════════════════════════════════════════════════════════════
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  discount REAL,
  total REAL NOT NULL DEFAULT 0,
  amount_paid REAL,
  remaining_amount REAL,
  consider_remaining_as_partial INTEGER DEFAULT 1,

  -- ═══════════════════════════════════════════════════════════════
  -- الحالة
  -- ═══════════════════════════════════════════════════════════════
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'pending',

  -- ═══════════════════════════════════════════════════════════════
  -- الموظف
  -- ═══════════════════════════════════════════════════════════════
  employee_id TEXT,
  created_by_staff_id TEXT,
  created_by_staff_name TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- الرقم المتسلسل
  -- ═══════════════════════════════════════════════════════════════
  global_order_number INTEGER,
  slug TEXT,
  customer_order_number INTEGER,

  -- ═══════════════════════════════════════════════════════════════
  -- الشحن
  -- ═══════════════════════════════════════════════════════════════
  is_online INTEGER NOT NULL DEFAULT 0,
  shipping_address_id TEXT,
  shipping_method TEXT,
  shipping_cost REAL,

  -- ═══════════════════════════════════════════════════════════════
  -- الملاحظات
  -- ═══════════════════════════════════════════════════════════════
  notes TEXT,
  customer_notes TEXT,
  admin_notes TEXT,
  metadata TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- نوع الطلب
  -- ═══════════════════════════════════════════════════════════════
  pos_order_type TEXT DEFAULT 'pos',
  call_confirmation_status_id INTEGER,

  -- ═══════════════════════════════════════════════════════════════
  -- التواريخ
  -- ═══════════════════════════════════════════════════════════════
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- أعمدة المزامنة المحلية (تبدأ بـ _)
  -- ═══════════════════════════════════════════════════════════════
  _synced INTEGER DEFAULT 0,
  _sync_status TEXT DEFAULT 'pending',
  _pending_operation TEXT,
  _local_updated_at TEXT,
  _error TEXT,
  _local_order_number INTEGER,
  _customer_name_lower TEXT
);
`;

export const ORDERS_INDEXES = `
-- فهارس الأداء
CREATE INDEX IF NOT EXISTS idx_orders_org_status ON orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_org_created ON orders(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_employee ON orders(employee_id);
CREATE INDEX IF NOT EXISTS idx_orders_global_number ON orders(global_order_number);
CREATE INDEX IF NOT EXISTS idx_orders_slug ON orders(slug);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(organization_id, payment_status);

-- فهارس المزامنة
CREATE INDEX IF NOT EXISTS idx_orders_sync_status ON orders(_synced, _sync_status);
CREATE INDEX IF NOT EXISTS idx_orders_pending ON orders(_pending_operation) WHERE _pending_operation IS NOT NULL;
`;

/**
 * ⚡ Order Items Table Schema
 */
export const ORDER_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS order_items (
  -- ═══════════════════════════════════════════════════════════════
  -- المفاتيح
  -- ═══════════════════════════════════════════════════════════════
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,

  -- ═══════════════════════════════════════════════════════════════
  -- المنتج
  -- ═══════════════════════════════════════════════════════════════
  name TEXT NOT NULL,
  slug TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,

  -- ═══════════════════════════════════════════════════════════════
  -- المتغيرات
  -- ═══════════════════════════════════════════════════════════════
  color_id TEXT,
  size_id TEXT,
  color_name TEXT,
  size_name TEXT,
  variant_display_name TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- نوع البيع
  -- ═══════════════════════════════════════════════════════════════
  sale_type TEXT DEFAULT 'retail',
  selling_unit_type TEXT DEFAULT 'piece',

  -- ═══════════════════════════════════════════════════════════════
  -- البيع بالوزن
  -- ═══════════════════════════════════════════════════════════════
  weight_sold REAL,
  weight_unit TEXT,
  price_per_weight_unit REAL,

  -- ═══════════════════════════════════════════════════════════════
  -- البيع بالمتر
  -- ═══════════════════════════════════════════════════════════════
  meters_sold REAL,
  price_per_meter REAL,

  -- ═══════════════════════════════════════════════════════════════
  -- البيع بالصندوق
  -- ═══════════════════════════════════════════════════════════════
  boxes_sold REAL,
  units_per_box INTEGER,
  box_price REAL,

  -- ═══════════════════════════════════════════════════════════════
  -- التتبع
  -- ═══════════════════════════════════════════════════════════════
  batch_id TEXT,
  batch_number TEXT,
  serial_numbers TEXT,
  expiry_date TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- التواريخ
  -- ═══════════════════════════════════════════════════════════════
  created_at TEXT DEFAULT (datetime('now')),

  -- ═══════════════════════════════════════════════════════════════
  -- أعمدة المزامنة المحلية
  -- ═══════════════════════════════════════════════════════════════
  _synced INTEGER DEFAULT 0,
  _sync_status TEXT DEFAULT 'pending',
  _pending_operation TEXT,
  _local_updated_at TEXT,

  -- ═══════════════════════════════════════════════════════════════
  -- العلاقات
  -- ═══════════════════════════════════════════════════════════════
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
`;

export const ORDER_ITEMS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org ON order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_items_sync ON order_items(_synced, _sync_status);
`;
