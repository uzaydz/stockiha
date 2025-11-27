/**
 * Delta-Based Sync System - Type Definitions
 * نظام المزامنة القائم على العمليات التفاضلية
 */

// =====================
// Operation Types
// =====================

export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE' | 'DELTA';

export type SyncStatus = 'pending' | 'sending' | 'sent' | 'failed';

export type ConflictResolution = 'server_wins' | 'local_wins' | 'merge' | 'newest_wins' | 'manual';

/**
 * ⚡ أنواع الأخطاء للـ Smart Retry Queue
 * - PERMANENT: لن تنجح أبداً (validation, duplicate key)
 * - TRANSIENT: قد تنجح لاحقاً (network, timeout)
 * - SERVER_ERROR: خطأ في الخادم (500, 502, 503)
 * - RATE_LIMIT: تم تجاوز حد الطلبات (429)
 * - UNKNOWN: غير محدد
 */
export type ErrorType = 'PERMANENT' | 'TRANSIENT' | 'SERVER_ERROR' | 'RATE_LIMIT' | 'UNKNOWN';

/**
 * ⚡ جودة الشبكة للـ Network Quality Adaptation
 */
export type NetworkQuality = 'EXCELLENT' | 'GOOD' | 'POOR' | 'VERY_POOR' | 'OFFLINE';

/**
 * ⚡ إعدادات الإرسال حسب جودة الشبكة
 */
export interface NetworkQualitySettings {
  batchSize: number;      // عدد العمليات في الدفعة
  timeoutMs: number;      // مهلة الطلب
  retryDelayMs: number;   // تأخير بين المحاولات
}

/**
 * ⚡ نتيجة تصنيف الخطأ
 */
export interface ErrorClassification {
  type: ErrorType;
  shouldRetry: boolean;
  retryDelay?: number;  // ms
  reason: string;
}

// =====================
// Outbox Entry (Local)
// =====================

export interface OutboxEntry {
  id: string;
  table_name: string;
  operation: OperationType;
  record_id: string;
  payload: string; // JSON stringified
  local_seq: number;
  created_at: string;
  retry_count: number;
  last_error: string | null;
  status: SyncStatus;
  next_retry_at?: string; // ⚡ وقت المحاولة التالية (Exponential Backoff)
}

// =====================
// Server Operation
// =====================

export interface ServerOperation {
  id: string;
  organization_id: string;
  device_id: string;
  table_name: string;
  operation: OperationType;
  record_id: string;
  payload: Record<string, any>;
  server_seq: number;
  local_seq: number;
  created_at: string;
  is_valid: boolean;
  invalidated_reason: string | null;
}

// =====================
// Sync Cursor (Local)
// =====================

export interface SyncCursor {
  id: string;
  last_server_seq: number;
  last_sync_at: string | null;
  state_hash: string | null;
}

// =====================
// Applied Operation (Local)
// =====================

export interface AppliedOperation {
  server_seq: number;
  operation_id: string;
  applied_at: string;
  table_name: string;
}

// =====================
// Tombstone (Local)
// =====================

export interface SyncTombstone {
  id: string;
  table_name: string;
  record_id: string;
  deleted_at: string;
  server_seq: number | null;
}

// =====================
// Queue Types
// =====================

export interface QueuedOperation {
  serverSeq: number;
  operation: ServerOperation;
  receivedAt: number;
}

export interface GapCheckResult {
  hasGap: boolean;
  gapStart: number;
  gapEnd: number;
}

// =====================
// Conflict Types
// =====================

export type ConflictType =
  | 'local_pending_server_update'    // لدينا تعديل محلي + تعديل من الخادم
  | 'local_pending_server_delete'    // لدينا تعديل محلي + حذف من الخادم
  | 'local_delete_server_update'     // حذفنا محلياً + تعديل من الخادم
  | 'concurrent_delta';              // عمليتا DELTA على نفس السجل

export interface ConflictInfo {
  type: ConflictType;
  tableName: string;
  recordId: string;
  localOperation?: OutboxEntry;
  serverOperation: ServerOperation;
}

export interface ConflictResult {
  resolution: ConflictResolution;
  mergedData?: Record<string, any>;
  discardLocal: boolean;
  applyServer: boolean;
}

// =====================
// Merge Strategy Types
// =====================

export type MergeMode = 'server_wins' | 'local_wins' | 'field_merge' | 'newest_wins';

export interface TableMergeConfig {
  mode: MergeMode;
  /** حقول يجب دائماً أخذها من الخادم */
  serverOnlyFields?: string[];
  /** حقول يجب الحفاظ عليها محلياً */
  localOnlyFields?: string[];
  /** حقول تُدمج (مثل المخزون) */
  mergeableFields?: string[];
}

export type MergeConfig = Record<string, TableMergeConfig>;

// =====================
// State Hash Types
// =====================

export interface StateValidationResult {
  valid: boolean;
  localHash: string;
  serverHash: string;
  mismatchedTables?: string[];
}

// =====================
// Batch Types
// =====================

export interface BatchSendResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ id: string; error: string }>;
}

// =====================
// Delta Types
// =====================

export interface DeltaPayload {
  [field: string]: number; // field -> change amount (can be negative)
}

export interface StockDelta {
  quantity?: number;
  stock_quantity?: number;
  actual_stock_quantity?: number;
}

// =====================
// Realtime Types
// =====================

export type RealtimeCallback = (operation: ServerOperation) => void;

export interface RealtimeSubscription {
  organizationId: string;
  channel: any; // Supabase RealtimeChannel
  callback: RealtimeCallback;
}

// =====================
// Engine Status
// =====================

export interface DeltaSyncStatus {
  isInitialized: boolean;
  isOnline: boolean;
  organizationId: string | null;
  deviceId: string;
  lastServerSeq: number;
  pendingOutboxCount: number;
  bufferSize: number;
  lastSyncAt: string | null;
  lastError: string | null;
  /** ⚡ هل التطبيق يعمل في بيئة Tauri */
  isTauri?: boolean;
}

// =====================
// SQL Table Schemas
// =====================

export const DELTA_SYNC_TABLES = {
  sync_outbox: `
    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE','DELTA')),
      record_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      local_seq INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','sending','failed','sent')),
      next_retry_at TEXT
    )
  `,

  sync_cursor: `
    CREATE TABLE IF NOT EXISTS sync_cursor (
      id TEXT PRIMARY KEY DEFAULT 'main',
      last_server_seq INTEGER DEFAULT 0,
      last_sync_at TEXT,
      state_hash TEXT
    )
  `,

  applied_operations: `
    CREATE TABLE IF NOT EXISTS applied_operations (
      server_seq INTEGER PRIMARY KEY,
      operation_id TEXT UNIQUE,
      applied_at TEXT NOT NULL,
      table_name TEXT NOT NULL
    )
  `,

  sync_tombstones: `
    CREATE TABLE IF NOT EXISTS sync_tombstones (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      deleted_at TEXT NOT NULL,
      server_seq INTEGER
    )
  `
} as const;

// =====================
// Constants
// =====================

export const DELTA_SYNC_CONSTANTS = {
  // Retry settings
  MAX_RETRY_COUNT: 5,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 60000,

  // Batch settings
  BATCH_SIZE: 50,
  BATCH_INTERVAL_MS: 2000,

  // Queue settings
  MAX_BUFFER_SIZE: 1000,
  MAX_WAIT_MS: 5000,

  // ⚡ Gap Recovery settings
  MAX_GAP_SIZE: 100,           // أقصى حجم للفجوة قبل إعادة المزامنة الكاملة
  GAP_FETCH_TIMEOUT_MS: 10000, // timeout لجلب العمليات المفقودة

  // ⚡ Smart Retry settings
  SERVER_ERROR_RETRY_DELAY_MS: 60000,  // تأخير 1 دقيقة لأخطاء الخادم (500)
  RATE_LIMIT_RETRY_DELAY_MS: 30000,    // تأخير 30 ثانية لـ rate limit (429)

  // ⚡ Network Quality settings
  RTT_MEASURE_INTERVAL_MS: 30000,      // قياس RTT كل 30 ثانية
  RTT_EXCELLENT_THRESHOLD: 100,        // < 100ms = ممتاز
  RTT_GOOD_THRESHOLD: 300,             // < 300ms = جيد
  RTT_POOR_THRESHOLD: 1000,            // < 1000ms = ضعيف
  DEFAULT_REQUEST_TIMEOUT_MS: 15000,   // timeout افتراضي 15 ثانية

  // State hash check interval
  STATE_CHECK_INTERVAL_MS: 60 * 60 * 1000, // 1 hour

  // Tables to sync (based on actual database schema)
  // ⚡ الجداول الرئيسية في Supabase (أسماء الجداول الفعلية في الخادم)
  // ملاحظة: يتم تحويل الأسماء للمحلي عبر TABLE_NAME_MAP في DeltaSyncEngine
  SYNCED_TABLES: ['products', 'customers', 'orders', 'product_categories', 'staff_members', 'repair_orders', 'repair_locations', 'suppliers', 'supplier_purchases', 'supplier_payments'] as const,

  // ⚡ الجداول الفرعية التي ترتبط بـ product_id وليس organization_id
  // يتم مزامنتها عبر المنتج الأب
  PRODUCT_CHILD_TABLES: [
    'product_colors', 
    'product_sizes', 
    'product_images',
    'product_advanced_settings',
    'product_marketing_settings',
    'product_wholesale_tiers'
  ] as const
} as const;

export type SyncedTable = typeof DELTA_SYNC_CONSTANTS.SYNCED_TABLES[number];
