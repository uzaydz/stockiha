/**
 * ⚡ Supplier Purchases SQL Schema
 * موحد 100% مع Supabase (جداول supplier_purchases, supplier_purchase_items, supplier_payments)
 */

// ============================================
// 🛒 Supplier Purchases Table - مشتريات الموردين
// ============================================

export const SUPPLIER_PURCHASES_TABLE = `
CREATE TABLE IF NOT EXISTS supplier_purchases (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    purchase_number TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,

    -- 📅 التواريخ
    purchase_date TEXT DEFAULT (datetime('now')),
    due_date TEXT,

    -- 💵 المبالغ
    total_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    balance_due REAL,

    -- 📋 الحالة
    status TEXT CHECK(status IN ('draft', 'pending', 'received', 'partial', 'cancelled')),
    payment_status TEXT CHECK(payment_status IN ('unpaid', 'partial', 'paid', 'overdue')),
    payment_terms TEXT CHECK(payment_terms IN ('cash', 'net_7', 'net_15', 'net_30', 'net_60', 'net_90', 'custom')),

    -- 📝 ملاحظات
    notes TEXT,

    -- 👨‍💼 المنشئ/المحدث
    created_by TEXT,
    updated_by TEXT,

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
    _purchase_number_lower TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);
`;

export const SUPPLIER_PURCHASES_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_org ON supplier_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_supplier ON supplier_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_number ON supplier_purchases(purchase_number);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_status ON supplier_purchases(status);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_payment ON supplier_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_sync ON supplier_purchases(_sync_status);
`;

// ============================================
// 📦 Supplier Purchase Items Table - عناصر المشتريات
// ============================================

export const SUPPLIER_PURCHASE_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS supplier_purchase_items (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL,
    supplier_purchase_id TEXT,
    product_id TEXT,
    batch_id TEXT,

    -- 📝 البيانات
    description TEXT NOT NULL,

    -- 🎨 المتغيرات
    color_id TEXT,
    size_id TEXT,
    variant_type TEXT DEFAULT 'simple' CHECK(variant_type IN ('simple', 'color', 'size', 'color_size')),
    variant_display_name TEXT,

    -- 📊 الكميات والأسعار
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    total_price REAL,
    selling_price REAL DEFAULT 0,

    -- 🧮 الضريبة
    tax_rate REAL DEFAULT 0,
    tax_amount REAL,

    -- 📅 الصلاحية
    expiry_date TEXT,

    -- 📍 الموقع
    location TEXT DEFAULT 'المستودع الرئيسي',

    -- 📅 التواريخ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- 🔄 أعمدة المزامنة المحلية
    _synced INTEGER DEFAULT 0,
    _sync_status TEXT DEFAULT 'pending',
    _pending_operation TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (purchase_id) REFERENCES supplier_purchases(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (color_id) REFERENCES product_colors(id),
    FOREIGN KEY (size_id) REFERENCES product_sizes(id)
);
`;

export const SUPPLIER_PURCHASE_ITEMS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON supplier_purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON supplier_purchase_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_expiry ON supplier_purchase_items(expiry_date);
`;

// ============================================
// 💳 Supplier Payments Table - دفعات الموردين
// ============================================

export const SUPPLIER_PAYMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS supplier_payments (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    purchase_id TEXT,
    organization_id TEXT NOT NULL,

    -- 💵 الدفعة
    payment_date TEXT DEFAULT (datetime('now')),
    amount REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'bank_transfer', 'check')),
    reference_number TEXT,

    -- 📝 ملاحظات
    notes TEXT,

    -- 👨‍💼 المنشئ
    created_by TEXT,

    -- 📅 التواريخ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- 🔄 أعمدة المزامنة المحلية
    _synced INTEGER DEFAULT 0,
    _sync_status TEXT DEFAULT 'pending',
    _pending_operation TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (purchase_id) REFERENCES supplier_purchases(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
`;

export const SUPPLIER_PAYMENTS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase ON supplier_payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_org ON supplier_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(payment_date);
`;

// ============================================
// 🏭 Suppliers Table - الموردين
// ============================================

export const SUPPLIERS_TABLE = `
CREATE TABLE IF NOT EXISTS suppliers (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,

    -- 📝 البيانات الأساسية
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,

    -- 📋 معلومات العمل
    tax_number TEXT,
    business_type TEXT,
    supplier_type TEXT,
    supplier_category TEXT,

    -- ⭐ التقييم
    rating INTEGER DEFAULT 0,

    -- 📋 الحالة
    is_active INTEGER DEFAULT 1,

    -- 📝 ملاحظات
    notes TEXT,

    -- 👨‍💼 المنشئ/المحدث
    created_by TEXT,
    updated_by TEXT,

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
    _name_lower TEXT,
    _phone_digits TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
`;

export const SUPPLIERS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(_name_lower);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_sync ON suppliers(_sync_status);
`;
