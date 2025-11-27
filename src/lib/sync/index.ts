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
