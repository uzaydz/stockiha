/**
 * @deprecated ⚠️ هذا الملف تم استبداله بـ Delta Sync
 *
 * استخدم بدلاً منه:
 * - deltaWriteService من '@/services/DeltaWriteService'
 * - deltaSyncEngine من '@/lib/sync/delta'
 *
 * UnifiedQueue - صف المزامنة الموحد باستخدام SQLite فقط
 * ⚠️ DEPRECATED: سيتم حذف هذا الملف في الإصدار القادم
 */
import { v4 as uuidv4 } from 'uuid';
import { syncTracker } from '@/lib/sync/SyncTracker';
import { tauriQuery, tauriUpsert, tauriExecute } from '@/lib/db/tauriSqlClient';

export type UnifiedQueueType = 'order' | 'pos_orders' | 'product' | 'customer' | 'address' | 'invoice' | 'debt' | 'loss' | 'return';
export type UnifiedOperation = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  id: string;
  objectType: UnifiedQueueType;
  objectId: string;
  operation: UnifiedOperation;
  data: any;
  attempts: number;
  lastAttempt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  priority: number;
}

export interface EnqueueParams {
  objectType: UnifiedQueueType;
  objectId: string;
  operation: UnifiedOperation;
  data: any;
  priority?: number; // 1 عالي، 2 متوسط، 3 منخفض
}

// ✅ الحصول على organization_id
const getOrgId = (): string => {
  return localStorage.getItem('bazaar_organization_id') ||
         localStorage.getItem('currentOrganizationId') || '';
};

// ✅ تحويل objectType إلى SyncEntityType لـ SyncTracker
const toSyncEntityType = (objectType: UnifiedQueueType): 'pos_orders' | 'products' | 'customers' | 'addresses' | 'invoices' => {
  if (objectType === 'order' || objectType === 'pos_orders') return 'pos_orders';
  if (objectType === 'product') return 'products';
  if (objectType === 'customer') return 'customers';
  if (objectType === 'address') return 'addresses';
  if (objectType === 'invoice') return 'invoices';
  return 'invoices'; // fallback
};

// ✅ تحويل صف SQLite إلى SyncQueueItem
const rowToItem = (row: any): SyncQueueItem => {
  let parsedData = row.data;
  if (typeof row.data === 'string') {
    try {
      parsedData = JSON.parse(row.data);
    } catch {
      parsedData = row.data;
    }
  }

  return {
    id: row.id,
    objectType: row.object_type || row.objectType,
    objectId: row.object_id || row.objectId,
    operation: row.operation,
    data: parsedData,
    attempts: row.attempts || 0,
    lastAttempt: row.last_attempt || row.lastAttempt,
    error: row.error,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    priority: row.priority || 2
  };
};

export const UnifiedQueue = {
  async enqueue(params: EnqueueParams): Promise<SyncQueueItem> {
    const orgId = getOrgId();
    const now = new Date().toISOString();
    const id = uuidv4();

    const item: SyncQueueItem = {
      id,
      objectType: params.objectType,
      objectId: params.objectId,
      operation: params.operation,
      data: params.data,
      attempts: 0,
      lastAttempt: undefined,
      error: undefined,
      createdAt: now,
      updatedAt: now,
      priority: params.priority ?? 1
    };

    // ✅ حفظ في SQLite
    await tauriUpsert(orgId, 'sync_queue', {
      id,
      object_type: params.objectType,
      object_id: params.objectId,
      operation: params.operation,
      data: JSON.stringify(params.data),
      attempts: 0,
      last_attempt: null,
      error: null,
      created_at: now,
      updated_at: now,
      priority: params.priority ?? 1
    });

    // ✅ إشعار SyncTracker تلقائياً لتفعيل المزامنة الفورية
    const syncType = toSyncEntityType(params.objectType);
    syncTracker.addPending(params.objectId, syncType);

    console.log('[UnifiedQueue] ➕ Enqueued item (SQLite):', {
      objectType: params.objectType,
      objectId: params.objectId,
      operation: params.operation,
      syncTrackerType: syncType
    });

    return item;
  },

  async remove(id: string): Promise<void> {
    const orgId = getOrgId();
    await tauriExecute(orgId, 'DELETE FROM sync_queue WHERE id = ?', [id]);
    console.log('[UnifiedQueue] 🗑️ Removed item:', id);
  },

  async listAll(): Promise<SyncQueueItem[]> {
    const orgId = getOrgId();
    const result = await tauriQuery(orgId, 'SELECT * FROM sync_queue ORDER BY priority ASC, created_at ASC');
    return (result.data || []).map(rowToItem);
  },

  async listByType(types: UnifiedQueueType[]): Promise<SyncQueueItem[]> {
    const orgId = getOrgId();
    if (!types.length) return [];

    const placeholders = types.map(() => '?').join(', ');
    const result = await tauriQuery(
      orgId,
      `SELECT * FROM sync_queue WHERE object_type IN (${placeholders}) ORDER BY priority ASC, created_at ASC`,
      types
    );
    return (result.data || []).map(rowToItem);
  },

  async count(): Promise<number> {
    const orgId = getOrgId();
    const result = await tauriQuery(orgId, 'SELECT COUNT(*) as count FROM sync_queue');
    return result.data?.[0]?.count || 0;
  },

  async updateAttempt(id: string, error?: string): Promise<void> {
    const orgId = getOrgId();
    const now = new Date().toISOString();
    await tauriExecute(
      orgId,
      'UPDATE sync_queue SET attempts = attempts + 1, last_attempt = ?, error = ?, updated_at = ? WHERE id = ?',
      [now, error || null, now, id]
    );
  },

  async clear(): Promise<void> {
    const orgId = getOrgId();
    await tauriExecute(orgId, 'DELETE FROM sync_queue');
    console.log('[UnifiedQueue] 🧹 Cleared all items');
  }
};
