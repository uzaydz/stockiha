/**
 * ⚡ Invoices SQL Schema
 * موحد 100% مع Supabase (جدول invoices + invoice_items)
 */

// ============================================
// 🧾 Invoices Table - الفواتير
// ============================================

export const INVOICES_TABLE = `
CREATE TABLE IF NOT EXISTS invoices (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    organization_id TEXT NOT NULL,

    -- 👤 العميل
    customer_id TEXT,
    customer_name TEXT,
    customer_info TEXT,  -- JSON

    -- 🏢 المصدر
    source_type TEXT NOT NULL CHECK(source_type IN ('order', 'repair', 'service', 'manual', 'subscription')),
    source_id TEXT,

    -- 💵 المبالغ الأساسية
    subtotal_amount REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0,
    discount_type TEXT DEFAULT 'none' CHECK(discount_type IN ('none', 'percentage', 'fixed')),
    discount_percentage REAL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    shipping_amount REAL,
    total_amount REAL NOT NULL,

    -- 🧮 حسابات TVA
    tva_rate REAL DEFAULT 19,
    amount_ht REAL DEFAULT 0,
    amount_tva REAL DEFAULT 0,
    amount_ttc REAL DEFAULT 0,

    -- 📅 التواريخ
    invoice_date TEXT NOT NULL DEFAULT (datetime('now')),
    due_date TEXT,

    -- 📋 الحالة
    status TEXT NOT NULL CHECK(status IN ('draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled')),
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL,

    -- 📝 ملاحظات
    notes TEXT,
    custom_fields TEXT,  -- JSON

    -- 🏢 معلومات المؤسسة
    organization_info TEXT,  -- JSON

    -- 📅 التواريخ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- 🔄 أعمدة المزامنة المحلية
    _synced INTEGER DEFAULT 0,
    _sync_status TEXT DEFAULT 'pending',
    _pending_operation TEXT,
    _local_updated_at TEXT,
    _error TEXT,

    -- 🔍 أعمدة البحث
    _customer_name_lower TEXT,
    _invoice_number_lower TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
`;

export const INVOICES_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_sync ON invoices(_sync_status);
`;

// ============================================
// 📦 Invoice Items Table - عناصر الفواتير
// ============================================

export const INVOICE_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS invoice_items (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,

    -- 📦 المنتج/الخدمة
    product_id TEXT,
    service_id TEXT,
    type TEXT NOT NULL CHECK(type IN ('product', 'service', 'custom')),

    -- 📝 البيانات
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    barcode TEXT,

    -- 📊 الكميات والأسعار
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,

    -- 🧮 حسابات TVA
    tva_rate REAL DEFAULT 19,
    unit_price_ht REAL DEFAULT 0,
    unit_price_ttc REAL DEFAULT 0,
    total_ht REAL DEFAULT 0,
    total_tva REAL DEFAULT 0,
    total_ttc REAL DEFAULT 0,

    -- 💰 الخصم
    discount_amount REAL DEFAULT 0,

    -- ⚙️ إعدادات
    is_editable_price INTEGER DEFAULT 1,

    -- 📅 التواريخ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- 🔄 أعمدة المزامنة المحلية
    _synced INTEGER DEFAULT 0,
    _sync_status TEXT DEFAULT 'pending',
    _pending_operation TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
`;

export const INVOICE_ITEMS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_type ON invoice_items(type);
`;
