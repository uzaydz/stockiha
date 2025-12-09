/**
 * ⚡ Returns SQL Schema
 * موحد 100% مع Supabase (جدول returns + return_items)
 */

// ============================================
// 🔄 Returns Table - المرتجعات
// ============================================

export const RETURNS_TABLE = `
CREATE TABLE IF NOT EXISTS returns (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    return_number TEXT NOT NULL,
    organization_id TEXT NOT NULL,

    -- 📦 الطلب الأصلي
    original_order_id TEXT,
    original_order_number TEXT,

    -- 👤 العميل
    customer_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,

    -- 📋 تفاصيل المرتجع
    return_type TEXT NOT NULL CHECK(return_type IN ('full', 'partial', 'exchange')),
    return_reason TEXT NOT NULL,
    return_reason_description TEXT,

    -- 💵 المبالغ
    original_total REAL NOT NULL DEFAULT 0,
    return_amount REAL NOT NULL DEFAULT 0,
    refund_amount REAL NOT NULL DEFAULT 0,
    restocking_fee REAL DEFAULT 0,

    -- 💳 الاسترداد
    refund_method TEXT DEFAULT 'cash' CHECK(refund_method IN ('cash', 'card', 'store_credit', 'exchange', 'bank_transfer')),

    -- 📋 الحالة
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),

    -- ✅ الموافقة
    requires_manager_approval INTEGER DEFAULT 0,
    approved_by TEXT,
    approved_at TEXT,
    approval_notes TEXT,

    -- ❌ الرفض
    rejected_by TEXT,
    rejected_at TEXT,
    rejection_reason TEXT,

    -- ⚙️ المعالجة
    processed_by TEXT,
    processed_at TEXT,

    -- 📝 ملاحظات
    notes TEXT,
    internal_notes TEXT,

    -- 👨‍💼 المنشئ
    created_by TEXT,

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
    _return_number_lower TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (original_order_id) REFERENCES orders(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (rejected_by) REFERENCES users(id),
    FOREIGN KEY (processed_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
`;

export const RETURNS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_returns_org ON returns(organization_id);
CREATE INDEX IF NOT EXISTS idx_returns_number ON returns(return_number);
CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(original_order_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_sync ON returns(_sync_status);
`;

// ============================================
// 📦 Return Items Table - عناصر المرتجعات
// ============================================

export const RETURN_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS return_items (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL,
    original_order_item_id TEXT,

    -- 📦 المنتج
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT,

    -- 📊 الكميات
    original_quantity INTEGER NOT NULL DEFAULT 0,
    return_quantity INTEGER NOT NULL DEFAULT 0,

    -- 💵 الأسعار
    original_unit_price REAL NOT NULL DEFAULT 0,
    return_unit_price REAL NOT NULL DEFAULT 0,
    total_return_amount REAL NOT NULL DEFAULT 0,

    -- 🎨 المتغيرات
    variant_info TEXT,  -- JSON

    -- 📋 حالة المنتج
    condition_status TEXT DEFAULT 'good' CHECK(condition_status IN ('good', 'damaged', 'opened', 'used', 'defective')),
    resellable INTEGER DEFAULT 1,

    -- 📦 المخزون
    inventory_returned INTEGER DEFAULT 0,
    inventory_returned_at TEXT,
    inventory_notes TEXT,

    -- 📅 التواريخ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- 🔄 أعمدة المزامنة المحلية
    _synced INTEGER DEFAULT 0,
    _sync_status TEXT DEFAULT 'pending',
    _pending_operation TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (return_id) REFERENCES returns(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (original_order_item_id) REFERENCES order_items(id)
);
`;

export const RETURN_ITEMS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product ON return_items(product_id);
CREATE INDEX IF NOT EXISTS idx_return_items_condition ON return_items(condition_status);
`;
