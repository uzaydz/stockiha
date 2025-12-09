/**
 * ⚡ Work Sessions SQL Schema
 * موحد 100% مع Supabase (جدول staff_work_sessions)
 * 
 * ⚠️ ملاحظة: الجدول الفعلي يُنشأ في tauriSchema.ts
 * هذا الملف للمرجع فقط ويجب أن يتطابق مع tauriSchema.ts
 */

// ============================================
// ⏱️ Staff Work Sessions Table - جلسات عمل الموظفين
// ============================================

export const STAFF_WORK_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS staff_work_sessions (
    -- 🔑 المعرفات
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    staff_name TEXT,

    -- 💵 النقدية
    opening_cash REAL DEFAULT 0,
    closing_cash REAL,
    expected_cash REAL,
    cash_difference REAL,

    -- 📊 المبيعات
    total_sales REAL DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    cash_sales REAL DEFAULT 0,
    card_sales REAL DEFAULT 0,

    -- ⏱️ التوقيت
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    paused_at TEXT,
    resumed_at TEXT,

    -- ⏸️ الإيقاف المؤقت
    pause_count INTEGER DEFAULT 0,
    total_pause_duration INTEGER DEFAULT 0,

    -- 📋 الحالة
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'ended', 'cancelled')),

    -- 📝 الملاحظات
    opening_notes TEXT,
    closing_notes TEXT,

    -- 📅 التواريخ
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- 🔄 أعمدة المزامنة المحلية (بدون underscore - موحد مع tauriSchema.ts)
    synced INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'pending',
    pending_operation TEXT,

    -- 🔗 المفاتيح الخارجية
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (staff_id) REFERENCES users(id)
);
`;

export const STAFF_WORK_SESSIONS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_work_sessions_org ON staff_work_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_staff ON staff_work_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON staff_work_sessions(status);
CREATE INDEX IF NOT EXISTS idx_work_sessions_started ON staff_work_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_work_sessions_sync ON staff_work_sessions(sync_status);
`;
