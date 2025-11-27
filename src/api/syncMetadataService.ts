/**
 * 🔄 Sync Metadata Service
 * خدمة إدارة بيانات المزامنة التدريجية (Incremental Sync)
 * تتبع آخر وقت مزامنة لكل نوع من الكيانات لتقليل حجم البيانات المنقولة
 */

import { inventoryDB } from '@/database/localDb';
import { v4 as uuidv4 } from 'uuid';

// أنواع الكيانات المدعومة للمزامنة
export type SyncEntityType =
  | 'products'
  | 'customers'
  | 'orders'
  | 'pos_orders'
  | 'invoices'
  | 'customer_debts'
  | 'product_returns'
  | 'loss_declarations'
  | 'product_categories'
  | 'product_colors'
  | 'product_sizes';

export interface SyncMetadata {
  id: string;
  entity_type: SyncEntityType;
  last_sync_timestamp: string | null;
  last_full_sync_timestamp: string | null;
  sync_count: number;
  last_sync_status: 'success' | 'error' | 'partial';
  last_sync_error: string | null;
  records_synced: number;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * الحصول على بيانات المزامنة لنوع كيان معين
 */
export async function getSyncMetadata(entityType: SyncEntityType): Promise<SyncMetadata | null> {
  try {
    const result = await (inventoryDB as any).syncMetadata
      ?.where('entity_type')
      ?.equals(entityType)
      ?.first();

    if (!result) {
      // محاولة بديلة باستخدام toArray
      const all = await (inventoryDB as any).syncMetadata?.toArray();
      return all?.find((m: any) => m.entity_type === entityType) || null;
    }

    return result as SyncMetadata;
  } catch (error) {
    console.warn(`[SyncMetadata] Failed to get metadata for ${entityType}:`, error);
    return null;
  }
}

/**
 * الحصول على آخر timestamp للمزامنة لنوع كيان معين
 * يُستخدم في استعلامات WHERE updated_at > lastSyncTimestamp
 */
export async function getLastSyncTimestamp(entityType: SyncEntityType): Promise<string | null> {
  const metadata = await getSyncMetadata(entityType);
  return metadata?.last_sync_timestamp || null;
}

/**
 * تحديث بيانات المزامنة بعد عملية مزامنة ناجحة
 */
export async function updateSyncMetadata(
  entityType: SyncEntityType,
  options: {
    timestamp?: string;
    status?: 'success' | 'error' | 'partial';
    error?: string | null;
    recordsSynced?: number;
    isFullSync?: boolean;
    organizationId?: string;
  } = {}
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const {
      timestamp = now,
      status = 'success',
      error = null,
      recordsSynced = 0,
      isFullSync = false,
      organizationId = null
    } = options;

    const existing = await getSyncMetadata(entityType);

    if (existing) {
      // تحديث السجل الموجود
      const updated: Partial<SyncMetadata> = {
        last_sync_timestamp: timestamp,
        last_sync_status: status,
        last_sync_error: error,
        records_synced: recordsSynced,
        sync_count: (existing.sync_count || 0) + 1,
        updated_at: now
      };

      if (isFullSync) {
        updated.last_full_sync_timestamp = timestamp;
      }

      await (inventoryDB as any).syncMetadata?.update(existing.id, updated);
    } else {
      // إنشاء سجل جديد
      const newMetadata: SyncMetadata = {
        id: uuidv4(),
        entity_type: entityType,
        last_sync_timestamp: timestamp,
        last_full_sync_timestamp: isFullSync ? timestamp : null,
        sync_count: 1,
        last_sync_status: status,
        last_sync_error: error,
        records_synced: recordsSynced,
        organization_id: organizationId,
        created_at: now,
        updated_at: now
      };

      await (inventoryDB as any).syncMetadata?.add(newMetadata);
    }

    console.log(`[SyncMetadata] ✅ Updated ${entityType}: ${recordsSynced} records, status: ${status}`);
  } catch (error) {
    console.error(`[SyncMetadata] ❌ Failed to update metadata for ${entityType}:`, error);
  }
}

/**
 * إعادة تعيين بيانات المزامنة لنوع كيان معين
 * يجبر المزامنة الكاملة في المرة القادمة
 */
export async function resetSyncMetadata(entityType: SyncEntityType): Promise<void> {
  try {
    const existing = await getSyncMetadata(entityType);
    if (existing) {
      await (inventoryDB as any).syncMetadata?.update(existing.id, {
        last_sync_timestamp: null,
        last_sync_status: 'success',
        last_sync_error: null,
        updated_at: new Date().toISOString()
      });
    }
    console.log(`[SyncMetadata] 🔄 Reset metadata for ${entityType}`);
  } catch (error) {
    console.error(`[SyncMetadata] ❌ Failed to reset metadata for ${entityType}:`, error);
  }
}

/**
 * إعادة تعيين جميع بيانات المزامنة
 */
export async function resetAllSyncMetadata(): Promise<void> {
  try {
    await (inventoryDB as any).syncMetadata?.clear();
    console.log('[SyncMetadata] 🔄 Reset all sync metadata');
  } catch (error) {
    console.error('[SyncMetadata] ❌ Failed to reset all metadata:', error);
  }
}

/**
 * التحقق مما إذا كانت المزامنة الكاملة مطلوبة
 * تُعيد true إذا:
 * - لا توجد بيانات مزامنة سابقة
 * - آخر مزامنة كاملة كانت قبل أكثر من 24 ساعة
 */
export async function needsFullSync(entityType: SyncEntityType): Promise<boolean> {
  const metadata = await getSyncMetadata(entityType);

  if (!metadata || !metadata.last_sync_timestamp) {
    return true;
  }

  // التحقق من آخر مزامنة كاملة (كل 24 ساعة)
  if (metadata.last_full_sync_timestamp) {
    const lastFullSync = new Date(metadata.last_full_sync_timestamp).getTime();
    const now = Date.now();
    const hoursSinceFullSync = (now - lastFullSync) / (1000 * 60 * 60);

    if (hoursSinceFullSync > 24) {
      console.log(`[SyncMetadata] ⏰ Full sync needed for ${entityType}: ${hoursSinceFullSync.toFixed(1)} hours since last full sync`);
      return true;
    }
  } else {
    // لا توجد مزامنة كاملة سابقة
    return true;
  }

  return false;
}

/**
 * الحصول على إحصائيات المزامنة لجميع الكيانات
 */
export async function getAllSyncStats(): Promise<Record<SyncEntityType, SyncMetadata | null>> {
  const entityTypes: SyncEntityType[] = [
    'products',
    'customers',
    'orders',
    'pos_orders',
    'invoices',
    'customer_debts',
    'product_returns',
    'loss_declarations',
    'product_categories',
    'product_colors',
    'product_sizes'
  ];

  const stats: Record<string, SyncMetadata | null> = {};

  for (const entityType of entityTypes) {
    stats[entityType] = await getSyncMetadata(entityType);
  }

  return stats as Record<SyncEntityType, SyncMetadata | null>;
}

export default {
  getSyncMetadata,
  getLastSyncTimestamp,
  updateSyncMetadata,
  resetSyncMetadata,
  resetAllSyncMetadata,
  needsFullSync,
  getAllSyncStats
};
