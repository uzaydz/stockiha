/**
 * 🔒 Conflict Resolution System - نظام حل التضاربات
 *
 * نظام متكامل لكشف وحل التضاربات أثناء المزامنة
 *
 * @example
 * ```typescript
 * import { conflictDetector, conflictResolver, conflictLogger } from '@/lib/sync';
 *
 * // كشف تضارب
 * const conflict = conflictDetector.detect(local, server, 'product', {
 *   criticalFields: ['stock_quantity'],
 *   timestampThreshold: 5000
 * });
 *
 * if (conflict.hasConflict) {
 *   // حل التضارب
 *   const resolution = await conflictResolver.resolve(
 *     local, server, 'merge', 'product', context
 *   );
 *
 *   // تسجيل
 *   await conflictLogger.log({
 *     entityType: 'product',
 *     entityId: product.id,
 *     localVersion: local,
 *     serverVersion: server,
 *     conflictFields: conflict.fields,
 *     severity: conflict.severity,
 *     resolution: 'merge',
 *     resolvedVersion: resolution.data,
 *     userId: context.userId,
 *     organizationId: context.organizationId,
 *     localTimestamp: conflict.localTimestamp,
 *     serverTimestamp: conflict.serverTimestamp
 *   });
 * }
 * ```
 */

// Classes
export { ConflictDetector, conflictDetector } from './ConflictDetector';
export { ConflictResolver, conflictResolver } from './ConflictResolver';
export { ConflictLogger, conflictLogger } from './ConflictLogger';

// SyncLockManager (already exists)
export { SyncLockManager, syncLockManager } from './SyncLockManager';

// Types
export type {
  EntityType,
  ResolutionStrategy,
  ConflictDecision,
  BaseEntity,
  ConflictDetectionResult,
  DetectionConfig,
  ResolutionContext,
  ResolvedEntity,
  ConflictLogEntry,
  ConflictStatistics,
  StrategyConfig
} from './conflictTypes';

export {
  CRITICAL_FIELDS,
  IGNORED_FIELDS,
  DEFAULT_STRATEGIES
} from './conflictTypes';

// Sync Validator - أدوات التحقق والإصلاح
export {
  performSyncHealthCheck,
  autoRepairSyncIssues,
  printHealthReport,
  quickSyncCheckAndRepair
} from './SyncValidator';

export type { SyncHealthReport } from './SyncValidator';

// ⚡ Sync Engines - محركات المزامنة الرئيسية
// SyncManager الموحد موجود في core/
export { syncManager } from './core/SyncManager';
export { syncManager as unifiedSyncManager } from './core/SyncManager';
export { PullEngine } from './core/PullEngine';
export { PullEngine as UnifiedPullEngine } from './core/PullEngine';
export { PushEngine } from './core/PushEngine';
export { PushEngine as UnifiedPushEngine } from './core/PushEngine';
export { RealtimeEngine, createRealtimeEngine } from './RealtimeEngine';

// ⚡ Queue Management - إدارة قائمة الانتظار
export { outboxManager } from './queue/OutboxManager';
export type { OutboxEntry } from './queue/OutboxManager';

// ⚡ Database Coordinator - المنسق المركزي (NEW!)
// يحل مشكلة "database is locked" بشكل جذري
export { databaseCoordinator } from './core/DatabaseCoordinator';
export type { OperationType, OperationPriority } from './core/DatabaseCoordinator';

// ⚡ Core Exports - للاستخدام المباشر
export * from './core';

// ⚡ Sync Config - إعدادات المزامنة المركزية
export {
  SYNC_CONFIG,
  getServerTableName,
  getServerColumnName,
  getLocalTableName,
  getLocalColumnName,
  isLocalOnlyTable
} from './config';

// ⚡ Unified Config - الإعدادات الموحدة الجديدة
export {
  SYNCED_TABLES,
  INDEPENDENT_TABLES,
  DEPENDENT_TABLES,
  LOCAL_ONLY_TABLES,
  NO_ORG_ID_TABLES,
  BATCH_CONFIG,
  SYNC_TIMING,
  RETRY_CONFIG,
  CIRCUIT_BREAKER,
  OUTBOX_STATUS,
  SYNC_OPERATIONS,
  COLUMN_MAPPINGS,        // ⚡ تحويل أسماء الأعمدة
  filterLocalColumns,
  addLocalSyncColumns,
  getUnifiedTableName,
  getLegacyTableName,
  tableNeedsOrgId,
  getSyncTimestampField,
} from './config';
