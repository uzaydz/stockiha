/**
 * ⚡ Expenses SQL Schema
 * موحد 100% مع Supabase (جدول expenses + expense_categories)
 */

// ============================================
// 💸 Expenses Table - المصروفات
// ============================================

export const EXPENSES_TABLE = `
CREATE TABLE IF NOT EXISTS expenses (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    reference_number TEXT,

    -- 📝 البيانات الأساسية
    title TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    expense_date TEXT NOT NULL,

    -- 📂 التصنيف
    category TEXT NOT NULL,
    category_id TEXT,
    tags TEXT,  -- JSON array

    -- 💳 الدفع
    payment_method TEXT NOT NULL,

    -- 📋 الحالة
    status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'cancelled', 'refunded')),
    source TEXT DEFAULT 'web' CHECK(source IN ('web', 'pos', 'mobile', 'import')),

    -- 🔄 التكرار
    is_recurring INTEGER DEFAULT 0,

    -- 📎 المرفقات
    receipt_url TEXT,

    -- 📊 بيانات إضافية
    metadata TEXT DEFAULT '{}',  -- JSON

    -- 🗑️ الحذف الناعم
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,

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
    _title_lower TEXT,
    _category_lower TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (category_id) REFERENCES expense_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
`;

export const EXPENSES_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_expenses_org ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(is_deleted);
CREATE INDEX IF NOT EXISTS idx_expenses_title ON expenses(_title_lower);
CREATE INDEX IF NOT EXISTS idx_expenses_sync ON expenses(_sync_status);
`;

// ============================================
// 📂 Expense Categories Table - فئات المصروفات
// ============================================

export const EXPENSE_CATEGORIES_TABLE = `
CREATE TABLE IF NOT EXISTS expense_categories (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,

    -- 📝 البيانات
    name TEXT NOT NULL,
    description TEXT,

    -- 🎨 المظهر
    color TEXT,
    icon TEXT,

    -- ⚙️ إعدادات
    is_default INTEGER DEFAULT 0,

    -- 📅 التواريخ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- 🔄 أعمدة المزامنة المحلية
    _synced INTEGER DEFAULT 0,
    _sync_status TEXT DEFAULT 'pending',
    _pending_operation TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
`;

export const EXPENSE_CATEGORIES_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_expense_categories_org ON expense_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(name);
`;
