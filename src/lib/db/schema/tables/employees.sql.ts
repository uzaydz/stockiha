/**
 * ⚡ Employees SQL Schema
 * موحد 100% مع Supabase (جدول users)
 */

// ============================================
// 👥 Users Table - جدول المستخدمين/الموظفين
// ============================================

export const USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    auth_user_id TEXT UNIQUE,

    -- 👤 البيانات الأساسية
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    whatsapp_phone TEXT,

    -- 🎭 الدور والصلاحيات
    role TEXT NOT NULL,
    permissions TEXT,  -- JSON
    is_active INTEGER DEFAULT 1,
    is_org_admin INTEGER DEFAULT 0,
    is_super_admin INTEGER DEFAULT 0,

    -- 📋 معلومات إضافية
    avatar_url TEXT,
    job_title TEXT,
    bio TEXT,
    birth_date TEXT,
    gender TEXT CHECK(gender IN ('male', 'female', 'other')),
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'الجزائر',

    -- 📊 الحالة والنشاط
    status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'offline', 'away', 'busy')),
    last_activity_at TEXT,

    -- 🔐 الأمان
    two_factor_enabled INTEGER DEFAULT 0,
    two_factor_secret TEXT,
    backup_codes TEXT,  -- JSON
    last_password_change TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TEXT,

    -- 🔗 الحسابات المرتبطة
    google_account_linked INTEGER DEFAULT 0,
    google_user_id TEXT,
    whatsapp_connected INTEGER DEFAULT 0,
    whatsapp_enabled INTEGER DEFAULT 0,

    -- ⚙️ الإعدادات
    privacy_settings TEXT DEFAULT '{}',  -- JSON
    security_notifications_enabled INTEGER DEFAULT 1,

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
    _email_lower TEXT,
    _phone_digits TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
`;

export const USERS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_name_lower ON users(_name_lower);
CREATE INDEX IF NOT EXISTS idx_users_sync_status ON users(_sync_status);
`;

// ============================================
// 💰 Employee Salaries Table - رواتب الموظفين
// ============================================

export const EMPLOYEE_SALARIES_TABLE = `
CREATE TABLE IF NOT EXISTS employee_salaries (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,

    -- 💵 بيانات الراتب
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('monthly', 'hourly', 'daily', 'commission', 'fixed')),
    status TEXT NOT NULL CHECK(status IN ('active', 'pending', 'paid', 'cancelled')),

    -- 📅 الفترة
    start_date TEXT NOT NULL,
    end_date TEXT,

    -- 📝 ملاحظات
    notes TEXT,

    -- 📅 التواريخ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- 🔄 أعمدة المزامنة المحلية
    _synced INTEGER DEFAULT 0,
    _sync_status TEXT DEFAULT 'pending',
    _pending_operation TEXT,
    _local_updated_at TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
`;

export const EMPLOYEE_SALARIES_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_employee_salaries_employee ON employee_salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_org ON employee_salaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_status ON employee_salaries(status);
`;
