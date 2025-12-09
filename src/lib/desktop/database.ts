/**
 * Desktop Database API
 * Wrapper around Electron IPC for SQLite operations
 * Provides the same interface as the old Tauri SQL client
 */

import type { DatabaseResult, QueryParams } from './types';
import { isElectron } from './platform';

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 200;
const MAX_RETRY_DELAY_MS = 3000;

// ============================================================================
// Error Classes
// ============================================================================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseNotAvailableError extends DatabaseError {
  constructor() {
    super('Database is not available. Are you running in Electron?', 'DB_NOT_AVAILABLE');
  }
}

// ============================================================================
// Retry Logic
// ============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateRetryDelay(attempt: number): number {
  // Exponential backoff with jitter
  const exponentialDelay = RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 100;
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
}

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable (database locked, busy)
      const isRetryable =
        lastError.message.includes('SQLITE_BUSY') ||
        lastError.message.includes('database is locked') ||
        lastError.message.includes('SQLITE_LOCKED');

      if (!isRetryable || attempt === MAX_RETRIES - 1) {
        throw lastError;
      }

      const delay = calculateRetryDelay(attempt);
      console.warn(
        `[Database] ${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms...`,
        lastError.message
      );
      await sleep(delay);
    }
  }

  throw lastError || new Error(`${operationName} failed after ${MAX_RETRIES} retries`);
}

// ============================================================================
// Database API
// ============================================================================

/**
 * Get the Electron database API
 */
function getDbApi() {
  if (!isElectron() || !window.electronAPI?.db) {
    throw new DatabaseNotAvailableError();
  }
  return window.electronAPI.db;
}

/**
 * Initialize database for an organization
 */
export async function initializeDatabase(organizationId: string): Promise<void> {
  const db = getDbApi();

  const result = await withRetry(
    () => db.initialize(organizationId),
    'initializeDatabase'
  );

  if (!result.success) {
    throw new DatabaseError(result.error || 'Failed to initialize database');
  }

  console.log(`[Database] Initialized for organization: ${organizationId}`);
}

/**
 * Execute a SELECT query and return multiple rows
 */
export async function query<T = unknown>(
  sql: string,
  params?: QueryParams | unknown[]
): Promise<T[]> {
  const db = getDbApi();

  // Convert array params to object if needed
  const normalizedParams = Array.isArray(params)
    ? params.reduce((acc, val, idx) => ({ ...acc, [`$${idx + 1}`]: val }), {})
    : params;

  const result = await withRetry(
    () => db.query(sql, normalizedParams),
    'query'
  );

  if (!result.success) {
    throw new DatabaseError(result.error || 'Query failed', 'QUERY_ERROR');
  }

  return (result.data as T[]) || [];
}

/**
 * Execute a SELECT query and return a single row
 */
export async function queryOne<T = unknown>(
  sql: string,
  params?: QueryParams | unknown[]
): Promise<T | null> {
  const db = getDbApi();

  // Convert array params to object if needed
  const normalizedParams = Array.isArray(params)
    ? params.reduce((acc, val, idx) => ({ ...acc, [`$${idx + 1}`]: val }), {})
    : params;

  const result = await withRetry(
    () => db.queryOne(sql, normalizedParams),
    'queryOne'
  );

  if (!result.success) {
    throw new DatabaseError(result.error || 'Query failed', 'QUERY_ERROR');
  }

  return (result.data as T) || null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE query
 */
export async function execute(
  sql: string,
  params?: QueryParams | unknown[]
): Promise<number> {
  const db = getDbApi();

  // Convert array params to object if needed
  const normalizedParams = Array.isArray(params)
    ? params.reduce((acc, val, idx) => ({ ...acc, [`$${idx + 1}`]: val }), {})
    : params;

  const result = await withRetry(
    () => db.execute(sql, normalizedParams),
    'execute'
  );

  if (!result.success) {
    throw new DatabaseError(result.error || 'Execute failed', 'EXECUTE_ERROR');
  }

  return (result.data as { changes: number })?.changes || 0;
}

/**
 * Upsert a record (INSERT OR REPLACE)
 */
export async function upsert(
  tableName: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = getDbApi();

  const result = await withRetry(
    () => db.upsert(tableName, data),
    'upsert'
  );

  if (!result.success) {
    throw new DatabaseError(result.error || 'Upsert failed', 'UPSERT_ERROR');
  }
}

/**
 * Batch upsert multiple records
 */
export async function batchUpsert(
  tableName: string,
  records: Record<string, unknown>[]
): Promise<void> {
  // Execute upserts sequentially to avoid database locks
  for (const record of records) {
    await upsert(tableName, record);
  }
}

/**
 * Delete a record by ID
 */
export async function deleteRecord(
  tableName: string,
  id: string
): Promise<void> {
  const db = getDbApi();

  const result = await withRetry(
    () => db.delete(tableName, id),
    'delete'
  );

  if (!result.success) {
    throw new DatabaseError(result.error || 'Delete failed', 'DELETE_ERROR');
  }
}

/**
 * Log a sync conflict
 */
export async function logConflict(
  entry: Record<string, unknown>
): Promise<void> {
  const db = getDbApi();

  const result = await db.logConflict(entry);

  if (!result.success) {
    console.warn('[Database] Failed to log conflict:', result.error);
  }
}

/**
 * Get conflict history for an entity
 */
export async function getConflictHistory(
  entityType: string,
  entityId: string
): Promise<unknown[]> {
  const db = getDbApi();

  const result = await db.getConflictHistory(entityType, entityId);

  if (!result.success) {
    throw new DatabaseError(result.error || 'Failed to get conflict history');
  }

  return (result.data as unknown[]) || [];
}

// ============================================================================
// Compatibility Aliases (for migration from Tauri)
// ============================================================================

export const electronQuery = query;
export const electronQueryOne = queryOne;
export const electronExecute = execute;
export const electronUpsert = upsert;
export const electronBatchUpsert = batchUpsert;
export const electronDelete = deleteRecord;
export const electronInitDatabase = initializeDatabase;

// ============================================================================
// Database Class (alternative OOP interface)
// ============================================================================

export class ElectronDatabase {
  private organizationId: string | null = null;
  private initialized = false;

  async initialize(orgId: string): Promise<void> {
    await initializeDatabase(orgId);
    this.organizationId = orgId;
    this.initialized = true;
  }

  async query<T = unknown>(sql: string, params?: QueryParams | unknown[]): Promise<T[]> {
    if (!this.initialized) {
      throw new DatabaseError('Database not initialized');
    }
    return query<T>(sql, params);
  }

  async queryOne<T = unknown>(sql: string, params?: QueryParams | unknown[]): Promise<T | null> {
    if (!this.initialized) {
      throw new DatabaseError('Database not initialized');
    }
    return queryOne<T>(sql, params);
  }

  async execute(sql: string, params?: QueryParams | unknown[]): Promise<number> {
    if (!this.initialized) {
      throw new DatabaseError('Database not initialized');
    }
    return execute(sql, params);
  }

  async upsert(tableName: string, data: Record<string, unknown>): Promise<void> {
    if (!this.initialized) {
      throw new DatabaseError('Database not initialized');
    }
    return upsert(tableName, data);
  }

  async delete(tableName: string, id: string): Promise<void> {
    if (!this.initialized) {
      throw new DatabaseError('Database not initialized');
    }
    return deleteRecord(tableName, id);
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get currentOrganizationId(): string | null {
    return this.organizationId;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  initialize: initializeDatabase,
  query,
  queryOne,
  execute,
  upsert,
  batchUpsert,
  delete: deleteRecord,
  logConflict,
  getConflictHistory,
};
