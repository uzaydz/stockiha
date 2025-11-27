/**
 * ⚡ Delta Sync - وظائف مساعدة للمزامنة
 * النظام الجديد لا يحتاج لـ syncQueue - يعتمد على pendingOperation في كل سجل
 */
import { deltaWriteService } from '@/services/DeltaWriteService';

/**
 * وظيفة مساعدة لتنظيف السجلات المتزامنة
 * في Delta Sync: السجلات synced=true و pendingOperation=null تكون جاهزة
 */
export const removeSyncQueueItemsSafely = async (
  _objectId: string,
  _objectType: 'product' | 'customer' | 'address' | 'order'
): Promise<void> => {
  // ⚡ في Delta Sync: لا حاجة لقائمة مزامنة منفصلة
  // السجلات تُدار مباشرة عبر pendingOperation
  console.log('[syncQueueHelper] ⚡ Delta Sync mode - no queue cleanup needed');
};

/**
 * وظيفة للتحقق من وجود عمليات معلقة
 */
export const hasSyncQueueItems = async (
  objectId: string,
  objectType: 'product' | 'customer' | 'address' | 'order'
): Promise<boolean> => {
  try {
    // ⚡ في Delta Sync: نتحقق من pendingOperation مباشرة
    const tableMap: Record<string, string> = {
      product: 'products',
      customer: 'customers',
      address: 'addresses',
      order: 'pos_orders'
    };

    const tableName = tableMap[objectType] || objectType;
    const record = await deltaWriteService.get<any>(tableName as any, objectId);

    return record?.pendingOperation != null;
  } catch {
    return false;
  }
};
