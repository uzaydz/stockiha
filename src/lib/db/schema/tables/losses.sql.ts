/**
 * ⚡ Losses SQL Schema
 * موحد 100% مع Supabase (جدول losses + loss_items)
 */

// ============================================
// 📉 Losses Table - الخسائر
// ============================================

export const LOSSES_TABLE = `
CREATE TABLE IF NOT EXISTS losses (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    loss_number TEXT NOT NULL,
    organization_id TEXT NOT NULL,

    -- 📋 تفاصيل الخسارة
    loss_type TEXT NOT NULL CHECK(loss_type IN ('damage', 'theft', 'expiry', 'shortage', 'breakage', 'water_damage', 'fire_damage', 'other')),
    loss_category TEXT DEFAULT 'operational' CHECK(loss_category IN ('operational', 'natural', 'theft', 'accident', 'other')),
    loss_description TEXT NOT NULL,

    -- 📅 تاريخ الحادث
    incident_date TEXT NOT NULL,

    -- 👨‍💼 الإبلاغ
    reported_by TEXT NOT NULL,
    witness_employee_id TEXT,
    witness_name TEXT,

    -- 📋 الحالة
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'processed', 'cancelled')),

    -- ✅ الموافقة
    requires_manager_approval INTEGER DEFAULT 1,
    approved_by TEXT,
    approved_at TEXT,
    approval_notes TEXT,

    -- 💵 القيم
    total_cost_value REAL NOT NULL DEFAULT 0,
    total_selling_value REAL NOT NULL DEFAULT 0,
    total_items_count INTEGER NOT NULL DEFAULT 0,

    -- 📍 الموقع
    location_description TEXT,

    -- 📎 المراجع الخارجية
    external_reference TEXT,

    -- 🛡️ التأمين
    insurance_claim INTEGER DEFAULT 0,
    insurance_reference TEXT,

    -- 📝 ملاحظات
    notes TEXT,
    internal_notes TEXT,

    -- ⚙️ المعالجة
    processed_at TEXT,

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
    _loss_number_lower TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (reported_by) REFERENCES users(id),
    FOREIGN KEY (witness_employee_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
`;

export const LOSSES_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_losses_org ON losses(organization_id);
CREATE INDEX IF NOT EXISTS idx_losses_number ON losses(loss_number);
CREATE INDEX IF NOT EXISTS idx_losses_type ON losses(loss_type);
CREATE INDEX IF NOT EXISTS idx_losses_status ON losses(status);
CREATE INDEX IF NOT EXISTS idx_losses_date ON losses(incident_date);
CREATE INDEX IF NOT EXISTS idx_losses_sync ON losses(_sync_status);
`;

// ============================================
// 📦 Loss Items Table - عناصر الخسائر
// ============================================

export const LOSS_ITEMS_TABLE = `
CREATE TABLE IF NOT EXISTS loss_items (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    loss_id TEXT NOT NULL,

    -- 📦 المنتج
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    product_barcode TEXT,

    -- 🎨 المتغيرات
    color_id TEXT,
    size_id TEXT,
    color_name TEXT,
    size_name TEXT,
    variant_info TEXT,  -- JSON

    -- 📊 الكميات
    lost_quantity INTEGER NOT NULL DEFAULT 0,

    -- 💵 الأسعار
    unit_cost_price REAL NOT NULL DEFAULT 0,
    unit_selling_price REAL NOT NULL DEFAULT 0,
    total_cost_value REAL NOT NULL DEFAULT 0,
    total_selling_value REAL NOT NULL DEFAULT 0,

    -- 📋 حالة الخسارة
    loss_condition TEXT NOT NULL CHECK(loss_condition IN ('total_loss', 'partial_loss', 'repairable', 'salvageable')),
    loss_percentage REAL DEFAULT 100.00,

    -- 📦 المخزون
    stock_before_loss INTEGER,
    stock_after_loss INTEGER,
    variant_stock_before INTEGER DEFAULT 0,
    variant_stock_after INTEGER,

    -- ⚙️ تعديل المخزون
    inventory_adjusted INTEGER DEFAULT 0,
    inventory_adjusted_at TEXT,
    inventory_adjusted_by TEXT,

    -- 📝 ملاحظات
    item_notes TEXT,

    -- 📅 التواريخ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- 🔄 أعمدة المزامنة المحلية
    _synced INTEGER DEFAULT 0,
    _sync_status TEXT DEFAULT 'pending',
    _pending_operation TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (loss_id) REFERENCES losses(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (color_id) REFERENCES product_colors(id),
    FOREIGN KEY (size_id) REFERENCES product_sizes(id),
    FOREIGN KEY (inventory_adjusted_by) REFERENCES users(id)
);
`;

export const LOSS_ITEMS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_loss_items_loss ON loss_items(loss_id);
CREATE INDEX IF NOT EXISTS idx_loss_items_product ON loss_items(product_id);
CREATE INDEX IF NOT EXISTS idx_loss_items_condition ON loss_items(loss_condition);
`;
