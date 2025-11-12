import { inventoryDB, type SyncQueueItem } from '@/database/localDb';
import { v4 as uuidv4 } from 'uuid';
import { syncTracker } from '@/lib/sync/SyncTracker';

export type UnifiedQueueType = SyncQueueItem['objectType'];
export type UnifiedOperation = SyncQueueItem['operation'];

export interface EnqueueParams {
  objectType: UnifiedQueueType;
  objectId: string;
  operation: UnifiedOperation;
  data: any;
  priority?: number; // 1 عالي، 2 متوسط، 3 منخفض
}

// ✅ تحويل objectType إلى SyncEntityType لـ SyncTracker
const toSyncEntityType = (objectType: UnifiedQueueType): 'pos_orders' | 'products' | 'customers' | 'addresses' | 'invoices' => {
  // طلبات POS تُعامل كـ 'pos_orders' في SyncTracker
  if (objectType === 'order' || objectType === 'pos_orders') return 'pos_orders';
  if (objectType === 'product') return 'products';
  if (objectType === 'customer') return 'customers';
  if (objectType === 'address') return 'addresses';
  if (objectType === 'invoice') return 'invoices';
  return 'invoices'; // fallback
};

export const UnifiedQueue = {
  async enqueue(params: EnqueueParams): Promise<SyncQueueItem> {
    const now = new Date().toISOString();
    const item: SyncQueueItem = {
      id: uuidv4(),
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
    
    await inventoryDB.syncQueue.put(item);
    
    // ✅ إشعار SyncTracker تلقائياً لتفعيل المزامنة الفورية
    const syncType = toSyncEntityType(params.objectType);
    syncTracker.addPending(params.objectId, syncType);
    
    console.log('[UnifiedQueue] ➕ Enqueued item:', {
      objectType: params.objectType,
      objectId: params.objectId,
      operation: params.operation,
      syncTrackerType: syncType
    });
    
    return item;
  },

  async remove(id: string): Promise<void> {
    await inventoryDB.syncQueue.delete(id);
  },

  async listAll(): Promise<SyncQueueItem[]> {
    return await inventoryDB.syncQueue.toArray();
  },

  async listByType(types: UnifiedQueueType[]): Promise<SyncQueueItem[]> {
    try {
      // استخدام الفهرس على objectType للحصول على أداء أفضل
      if (types.length === 1) {
        return await inventoryDB.syncQueue
          .where('objectType' as any)
          .equals(types[0] as any)
          .toArray();
      }
      return await inventoryDB.syncQueue
        .where('objectType' as any)
        .anyOf(...(types as any))
        .toArray();
    } catch {
      const all = await inventoryDB.syncQueue.toArray();
      return all.filter(i => types.includes(i.objectType));
    }
  },

  async count(): Promise<number> {
    return await inventoryDB.syncQueue.count();
  }
};
