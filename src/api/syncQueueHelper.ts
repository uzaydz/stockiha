import { inventoryDB } from '@/database/localDb';

/**
 * وظيفة مساعدة لحذف العناصر من قائمة المزامنة بشكل آمن
 * تتجنب أخطاء معاملة القراءة فقط بفصل عمليات القراءة عن عمليات الكتابة
 */
export const removeSyncQueueItemsSafely = async (
  objectId: string,
  objectType: 'product' | 'customer' | 'address' | 'order'
): Promise<void> => {
  try {
    const items = await inventoryDB.syncQueue
      .where('objectId' as any)
      .equals(objectId as any)
      .toArray();

    const isOrderType = (t: any) => t === 'order' || t === 'pos_orders';

    for (const it of items as any[]) {
      const t = it.objectType ?? it.object_type;
      if (
        (objectType === 'order' ? isOrderType(t) : t === objectType)
      ) {
        try { await inventoryDB.syncQueue.delete(it.id); } catch {}
      }
    }
  } catch {}
};

/**
 * وظيفة مساعدة للتحقق من وجود عناصر في قائمة المزامنة لكائن معين
 */
export const hasSyncQueueItems = async (
  objectId: string,
  objectType: 'product' | 'customer' | 'address' | 'order'
): Promise<boolean> => {
  try {
    const items = await inventoryDB.syncQueue
      .where('objectId' as any)
      .equals(objectId as any)
      .toArray();
    const isOrderType = (t: any) => t === 'order' || t === 'pos_orders';
    return (items as any[]).some((it) => {
      const t = it.objectType ?? it.object_type;
      return objectType === 'order' ? isOrderType(t) : t === objectType;
    });
  } catch {
    return false;
  }
};
