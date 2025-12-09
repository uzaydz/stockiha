/**
 * Desktop SQLite Client
 *
 * ⚡ MIGRATED: From Tauri to Electron
 *
 * This file provides backward compatibility for code that used the Tauri SQL client.
 * All database operations now go through Electron IPC.
 *
 * Usage:
 * - tauriQuery() → electronQuery()
 * - tauriExecute() → electronExecute()
 * - tauriUpsert() → electronUpsert()
 * - etc.
 */

import {
  isElectron,
  query as electronDbQuery,
  queryOne as electronDbQueryOne,
  execute as electronDbExecute,
  upsert as electronDbUpsert,
  batchUpsert as electronDbBatchUpsert,
  deleteRecord as electronDbDelete,
  initializeDatabase as electronDbInitialize,
} from '@/lib/desktop';

// ============================================================================
// Legacy Compatibility Types
// ============================================================================

export interface QueryResult {
  success: boolean;
  data: unknown[];
  error?: string;
}

export interface ExecuteResult {
  success: boolean;
  changes?: number;
  lastInsertRowid?: number;
  error?: string;
}

// ============================================================================
// Connection Pool Info (for backward compatibility)
// ============================================================================

let currentOrgId: string | null = null;

export function getConnectionPoolInfo(): {
  poolSize: number;
  currentOrgId: string | null;
  organizationIds: string[];
} {
  return {
    poolSize: currentOrgId ? 1 : 0,
    currentOrgId,
    organizationIds: currentOrgId ? [currentOrgId] : [],
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if running in desktop environment (Electron)
 * @deprecated Use isElectron() from @/lib/desktop instead
 */
export function isTauri(): boolean {
  // For backward compatibility, isTauri() now returns isElectron()
  // since we've migrated from Tauri to Electron
  return isElectron();
}

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert object keys from camelCase to snake_case
 */
function convertKeysToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;

  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    converted[snakeKey] = value;
  }
  return converted;
}

/**
 * Apply table defaults for required columns
 */
function applyTableDefaults(table: string, data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };

  if (table === 'order_items') {
    if (result.subtotal === undefined || result.subtotal === null) {
      const quantity = (result.quantity as number) || 1;
      const unitPrice = (result.unit_price as number) || (result.unitPrice as number) || (result.price as number) || 0;
      result.subtotal = quantity * unitPrice;
    }
    if (result.quantity === undefined || result.quantity === null) {
      result.quantity = 1;
    }
    if (result.unit_price === undefined || result.unit_price === null) {
      result.unit_price = result.unitPrice || result.price || 0;
    }
    if (result.discount === undefined || result.discount === null) {
      result.discount = 0;
    }
    if (!result.product_name && !result.productName) {
      result.product_name = result.name || 'منتج';
    }
  }

  if (table === 'orders') {
    if (result.subtotal === undefined || result.subtotal === null) {
      result.subtotal = result.total || result.total_amount || 0;
    }
    if (result.tax === undefined || result.tax === null) {
      result.tax = 0;
    }
    if (result.is_online === undefined || result.is_online === null) {
      result.is_online = 0;
    }
  }

  return result;
}

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * Initialize database for an organization
 */
export async function tauriInitDatabase(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isElectron()) {
    const errorMsg = 'التطبيق يعمل في متصفح عادي - قاعدة البيانات المحلية غير متاحة';
    console.warn('[SQLiteClient] ⚠️', errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    await electronDbInitialize(organizationId);
    currentOrgId = organizationId;
    console.log(`[SQLiteClient] ✅ Database initialized for org: ${organizationId}`);
    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SQLiteClient] ❌ Failed to initialize DB:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Close database for an organization
 */
export async function tauriCloseDatabase(
  _organizationId: string
): Promise<{ success: boolean; error?: string }> {
  // In Electron, database connections are managed by the main process
  // This is a no-op for backward compatibility
  currentOrgId = null;
  return { success: true };
}

/**
 * Close all database connections
 */
export async function tauriCloseAllDatabases(): Promise<{
  success: boolean;
  errors: string[];
}> {
  currentOrgId = null;
  return { success: true, errors: [] };
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Execute a SELECT query and return multiple rows
 */
export async function tauriQuery(
  organizationId: string,
  sql: string,
  params: unknown[] = []
): Promise<{ success: boolean; data: unknown[]; error?: string }> {
  if (!isElectron()) {
    return {
      success: false,
      data: [],
      error: 'التطبيق يعمل في متصفح عادي',
    };
  }

  // Ensure DB is initialized
  if (currentOrgId !== organizationId) {
    const initResult = await tauriInitDatabase(organizationId);
    if (!initResult.success) {
      return { success: false, data: [], error: initResult.error };
    }
  }

  try {
    const data = await electronDbQuery(sql, params);
    return { success: true, data };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SQLiteClient] Query error:', errorMsg);
    return { success: false, data: [], error: errorMsg };
  }
}

/**
 * Execute a SELECT query and return a single row
 */
export async function tauriQueryOne(
  organizationId: string,
  sql: string,
  params: unknown[] = []
): Promise<{ success: boolean; data: unknown | null; error?: string }> {
  if (!isElectron()) {
    return {
      success: false,
      data: null,
      error: 'التطبيق يعمل في متصفح عادي',
    };
  }

  if (currentOrgId !== organizationId) {
    const initResult = await tauriInitDatabase(organizationId);
    if (!initResult.success) {
      return { success: false, data: null, error: initResult.error };
    }
  }

  try {
    const data = await electronDbQueryOne(sql, params);
    return { success: true, data };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, data: null, error: errorMsg };
  }
}

// ============================================================================
// Execute Operations
// ============================================================================

/**
 * Execute an INSERT, UPDATE, or DELETE query
 */
export async function tauriExecute(
  organizationId: string,
  sql: string,
  params: unknown[] = []
): Promise<{
  success: boolean;
  changes?: number;
  lastInsertRowid?: number;
  error?: string;
}> {
  if (!isElectron()) {
    return {
      success: false,
      error: 'التطبيق يعمل في متصفح عادي',
    };
  }

  if (currentOrgId !== organizationId) {
    const initResult = await tauriInitDatabase(organizationId);
    if (!initResult.success) {
      return { success: false, error: initResult.error };
    }
  }

  try {
    const changes = await electronDbExecute(sql, params);
    return { success: true, changes };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SQLiteClient] Execute error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// Upsert Operations
// ============================================================================

/**
 * Upsert a single record (INSERT OR REPLACE)
 */
export async function tauriUpsert(
  organizationId: string,
  table: string,
  data: Record<string, unknown>,
  _conflictTarget: string = 'id'
): Promise<{ success: boolean; changes?: number; error?: string }> {
  if (!isElectron()) {
    return {
      success: false,
      error: 'التطبيق يعمل في متصفح عادي',
    };
  }

  if (currentOrgId !== organizationId) {
    const initResult = await tauriInitDatabase(organizationId);
    if (!initResult.success) {
      return { success: false, error: initResult.error };
    }
  }

  try {
    // Apply defaults and convert keys
    const dataWithDefaults = applyTableDefaults(table, data);
    const snakeCaseData = convertKeysToSnakeCase(dataWithDefaults);

    await electronDbUpsert(table, snakeCaseData);
    return { success: true, changes: 1 };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SQLiteClient] Upsert error:', { table, error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

/**
 * Delete a record by ID
 */
export async function tauriDelete(
  organizationId: string,
  table: string,
  id: string
): Promise<{ success: boolean; changes?: number; error?: string }> {
  if (!isElectron()) {
    return {
      success: false,
      error: 'التطبيق يعمل في متصفح عادي',
    };
  }

  if (currentOrgId !== organizationId) {
    const initResult = await tauriInitDatabase(organizationId);
    if (!initResult.success) {
      return { success: false, error: initResult.error };
    }
  }

  try {
    await electronDbDelete(table, id);
    return { success: true, changes: 1 };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Batch upsert multiple records
 */
export async function tauriBatchUpsert(
  organizationId: string,
  table: string,
  records: Record<string, unknown>[],
  _conflictTarget: string = 'id',
  _batchSize: number = 100
): Promise<{
  success: boolean;
  totalChanges: number;
  errors: number;
  error?: string;
}> {
  if (!records || records.length === 0) {
    return { success: true, totalChanges: 0, errors: 0 };
  }

  if (!isElectron()) {
    return {
      success: false,
      totalChanges: 0,
      errors: records.length,
      error: 'التطبيق يعمل في متصفح عادي',
    };
  }

  if (currentOrgId !== organizationId) {
    const initResult = await tauriInitDatabase(organizationId);
    if (!initResult.success) {
      return {
        success: false,
        totalChanges: 0,
        errors: records.length,
        error: initResult.error,
      };
    }
  }

  try {
    // Apply defaults and convert keys for each record
    const processedRecords = records.map((record) => {
      const dataWithDefaults = applyTableDefaults(table, record);
      return convertKeysToSnakeCase(dataWithDefaults);
    });

    await electronDbBatchUpsert(table, processedRecords);

    console.log(`[SQLiteClient] ✅ Batch upsert complete: ${records.length} records`);
    return {
      success: true,
      totalChanges: records.length,
      errors: 0,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SQLiteClient] Batch upsert error:', errorMsg);
    return {
      success: false,
      totalChanges: 0,
      errors: records.length,
      error: errorMsg,
    };
  }
}

// ============================================================================
// Legacy Exports (for backward compatibility)
// ============================================================================

// These exports maintain backward compatibility with existing code
export {
  tauriInitDatabase as initializeDatabase,
  tauriCloseDatabase as closeDatabase,
  tauriCloseAllDatabases as closeAllDatabases,
  tauriQuery as query,
  tauriQueryOne as queryOne,
  tauriExecute as execute,
  tauriUpsert as upsert,
  tauriDelete as deleteRecord,
  tauriBatchUpsert as batchUpsert,
};
