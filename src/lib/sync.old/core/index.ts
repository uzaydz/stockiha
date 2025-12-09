/**
 * ⚡ Sync Core Index
 * تصدير جميع محركات المزامنة الأساسية
 *
 * هذا هو النقطة المركزية لاستيراد جميع مكونات المزامنة الأساسية
 */

// ============================================
// 🔄 Core Engines
// ============================================

export { syncManager } from './SyncManager';
export { PullEngine } from './PullEngine';
export { PushEngine } from './PushEngine';

// ============================================
// ⚡ Database Coordinator (NEW!)
// المنسق المركزي لحل مشكلة "database is locked"
// ============================================

export { databaseCoordinator } from './DatabaseCoordinator';
export type { OperationType, OperationPriority } from './DatabaseCoordinator';

// ============================================
// 📤 Queue Management
// ============================================

export { outboxManager } from '../queue/OutboxManager';

// ============================================
// ⚙️ Configuration
// ============================================

export {
    // Tables
    SYNCED_TABLES,
    INDEPENDENT_TABLES,
    DEPENDENT_TABLES,
    LOCAL_ONLY_TABLES,
    NO_ORG_ID_TABLES,

    // Constants
    BATCH_CONFIG,
    SYNC_TIMING,
    RETRY_CONFIG,
    CIRCUIT_BREAKER,
    OUTBOX_STATUS,
    SYNC_OPERATIONS,

    // Helpers
    filterLocalColumns,
    addLocalSyncColumns,
    getUnifiedTableName,
    getLegacyTableName,
    isLocalOnlyTable,
    tableNeedsOrgId,
    getSyncTimestampField,
} from '../config';

// ============================================
// 📝 Types
// ============================================

export type {
    SyncedTable,
    LocalOnlyTable,
    OutboxStatus,
    SyncOperation,
} from '../config';

export type {
    PullResult,
    PushResult,
    SyncStats,
    SyncState,
    OutboxEntry,
} from '@/lib/types';
