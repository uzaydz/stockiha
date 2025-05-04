import { syncQueueStore, SyncQueueItem } from '@/database/localDb';

/**
 * وظيفة مساعدة لحذف العناصر من قائمة المزامنة بشكل آمن
 * تتجنب أخطاء معاملة القراءة فقط بفصل عمليات القراءة عن عمليات الكتابة
 */
export const removeSyncQueueItemsSafely = async (objectId: string, objectType: 'product' | 'customer' | 'address'): Promise<void> => {
  try {
    // أولاً، جمع المفاتيح التي نحتاج لحذفها
    const keysToRemove: string[] = [];
    
    // قراءة القائمة واستخراج المفاتيح
    await syncQueueStore.iterate<SyncQueueItem, void>((item, key) => {
      if (item.objectId === objectId && item.objectType === objectType) {
        keysToRemove.push(key);
      }
    });
    
    // ثم نقوم بحذف العناصر واحداً تلو الآخر في معاملات منفصلة
    for (const key of keysToRemove) {
      try {
        await syncQueueStore.removeItem(key);
      } catch (error) {
        console.warn(`فشل في حذف عنصر قائمة المزامنة ${key}:`, error);
      }
    }
  } catch (error) {
    console.error('خطأ في إزالة عناصر قائمة المزامنة:', error);
  }
};

/**
 * وظيفة مساعدة للتحقق من وجود عناصر في قائمة المزامنة لكائن معين
 */
export const hasSyncQueueItems = async (objectId: string, objectType: 'product' | 'customer' | 'address'): Promise<boolean> => {
  let hasItems = false;
  
  try {
    await syncQueueStore.iterate<SyncQueueItem, void>((item) => {
      if (item.objectId === objectId && item.objectType === objectType) {
        hasItems = true;
        return false; // إيقاف التكرار بمجرد العثور على عنصر
      }
    });
  } catch (error) {
    console.error('خطأ في التحقق من وجود عناصر في قائمة المزامنة:', error);
  }
  
  return hasItems;
}; 