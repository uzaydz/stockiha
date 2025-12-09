/**
 * ⚡ Repairs SQL Schema
 * موحد 100% مع Supabase (جدول repair_orders)
 */

// ============================================
// 🔧 Repair Orders Table - طلبات التصليح
// ============================================

export const REPAIR_ORDERS_TABLE = `
CREATE TABLE IF NOT EXISTS repair_orders (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    repair_tracking_code TEXT,

    -- 👤 بيانات العميل
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,

    -- 📱 بيانات الجهاز
    device_type TEXT,
    issue_description TEXT,
    repair_images TEXT,  -- JSON array

    -- 📍 الموقع
    repair_location_id TEXT,
    custom_location TEXT,

    -- 💵 المالية
    total_price REAL,
    paid_amount REAL DEFAULT 0,
    payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'credit', 'mixed', 'bank_transfer')),
    price_to_be_determined_later INTEGER DEFAULT 0,

    -- 📋 الحالة
    status TEXT DEFAULT 'قيد الانتظار',

    -- 👨‍💼 الموظف
    received_by TEXT,

    -- 📝 ملاحظات
    notes TEXT,

    -- 📅 التواريخ
    completed_at TEXT,
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
    _customer_phone_digits TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (received_by) REFERENCES users(id)
);
`;

export const REPAIR_ORDERS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_repair_orders_org ON repair_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_repair_orders_number ON repair_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_repair_orders_status ON repair_orders(status);
CREATE INDEX IF NOT EXISTS idx_repair_orders_tracking ON repair_orders(repair_tracking_code);
CREATE INDEX IF NOT EXISTS idx_repair_orders_customer_name ON repair_orders(_customer_name_lower);
CREATE INDEX IF NOT EXISTS idx_repair_orders_sync ON repair_orders(_sync_status);
`;

// ============================================
// 📜 Repair Status History Table - تاريخ حالات التصليح
// ============================================

export const REPAIR_STATUS_HISTORY_TABLE = `
CREATE TABLE IF NOT EXISTS repair_status_history (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    repair_order_id TEXT NOT NULL,

    -- 📋 البيانات
    status TEXT NOT NULL,
    notes TEXT,
    created_by TEXT,

    -- 📅 التواريخ
    created_at TEXT DEFAULT (datetime('now')),

    -- 🔄 أعمدة المزامنة المحلية
    _synced INTEGER DEFAULT 0,
    _sync_status TEXT DEFAULT 'pending',
    _pending_operation TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
`;

export const REPAIR_STATUS_HISTORY_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_repair_history_order ON repair_status_history(repair_order_id);
CREATE INDEX IF NOT EXISTS idx_repair_history_status ON repair_status_history(status);
`;
