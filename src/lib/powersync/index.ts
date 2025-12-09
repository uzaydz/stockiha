/**
 * ⚡ PowerSync Module - v3.0 (Best Practices 2025 - Complete)
 * ============================================================
 *
 * تصدير جميع مكونات PowerSync
 *
 * الاستخدام الصحيح:
 *
 * في React Components:
 * ```tsx
 * // ✅ استخدم hooks
 * import { useQuery } from '@powersync/react';
 * const { data } = useQuery('SELECT...', [params]);
 *
 * // أو استخدم reactive hooks
 * import { useReactiveProducts } from '@/hooks/powersync';
 * const { products } = useReactiveProducts();
 * ```
 *
 * في Services (non-React):
 * ```typescript
 * // ✅ استخدم query/mutate API الجديد
 * import { powerSyncService } from '@/lib/powersync';
 *
 * const products = await powerSyncService.query({
 *   sql: 'SELECT * FROM products WHERE org_id = ?',
 *   params: [orgId]
 * });
 *
 * await powerSyncService.mutate({
 *   table: 'products',
 *   operation: 'INSERT',
 *   data: { id, name, price }
 * });
 * ```
 * ============================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Core Services
// ═══════════════════════════════════════════════════════════════════════════

export {
  powerSyncService,
  PowerSyncService,
  type QueryOptions,
  type MutateOptions,
  type WatchOptions,
  type SyncStatus,
} from './PowerSyncService';
export { PowerSyncSchema } from './PowerSyncSchema';
export { SupabaseConnector, getSupabaseConnector } from './SupabaseConnector';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Queries (Shared Query Definitions)
// ═══════════════════════════════════════════════════════════════════════════

export {
  ProductQueries,
  CategoryQueries,
  SubcategoryQueries,
  CustomerQueries,
  SupplierQueries,
  OrderQueries,
  OrderItemQueries,
  ExpenseQueries,
  ExpenseCategoryQueries,
  StaffQueries,
  WorkSessionQueries,
  InvoiceQueries,
  LossQueries,
  RepairQueries,
  ReturnQueries,
  OrganizationQueries,
  POSSettingsQueries,
  getTableCountsQuery,
} from './queries';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Diagnostics
// ═══════════════════════════════════════════════════════════════════════════

export {
  runFullDiagnostics,
  printDiagnosticsReport,
  checkEnvironment,
  checkSupabaseConnection,
  checkJwtToken,
  checkPowerSyncConnection,
  checkSyncRules,
  checkLocalDatabase,
  reinitializePowerSync
} from './PowerSyncDiagnostics';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Conflict Resolution
// ═══════════════════════════════════════════════════════════════════════════

export {
  conflictResolutionService,
  lastWriteWins,
  mergeQuantities
} from './ConflictResolution';

export type {
  ConflictRecord,
  ConflictStrategy,
  MergeResult
} from './ConflictResolution';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Re-export from @powersync/react (للراحة)
// ═══════════════════════════════════════════════════════════════════════════

export { useQuery, useStatus, usePowerSync } from '@powersync/react';
