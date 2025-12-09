/**
 * ⚡ Product Returns Sync Service - نظام PowerSync الموحد
 *
 * ⚡ v3.0: تم إصلاح خطأ "cannot UPSERT a view"
 * - PowerSync يدير المزامنة تلقائياً من السيرفر
 * - لا حاجة لجلب البيانات يدوياً (fetchProductReturnsFromServer مُلغاة)
 * - البيانات تُجلب تلقائياً عبر sync-rules
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';

function getOrganizationId(explicitOrgId?: string): string | null {
  if (explicitOrgId) return explicitOrgId;
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem('currentOrganizationId') ||
    window.localStorage.getItem('bazaar_organization_id') ||
    null
  );
}

/**
 * ⚡ مزامنة المرتجعات المعلقة
 * PowerSync يدير المزامنة تلقائياً - هذه الدالة تفرض المزامنة يدوياً
 */
export const syncPendingProductReturns = async (
  organizationId?: string
): Promise<{ success: number; failed: number }> => {
  const orgId = getOrganizationId(organizationId);
  if (!orgId) {
    console.warn('[syncPendingProductReturns] لا يوجد organizationId متاح');
    return { success: 0, failed: 0 };
  }

  const ready = await powerSyncService.waitForInitialization(5000);
  if (!ready) {
    console.warn('[syncPendingProductReturns] PowerSync غير مهيأ بعد');
    return { success: 0, failed: 0 };
  }

  // ⚡ PowerSync يدير المزامنة تلقائياً
  // فقط نفرض المزامنة إذا كان هناك اتصال
  const isConnected = powerSyncService.syncStatus?.connected;
  if (isConnected) {
    try {
      await powerSyncService.forceSync();
      console.log('[syncPendingProductReturns] ⚡ تمت المزامنة بنجاح');
    } catch (err) {
      console.warn('[syncPendingProductReturns] فشل في المزامنة:', err);
    }
  }

  // PowerSync لا يعطينا عدد العناصر المُزامنة بشكل مباشر
  return { success: 0, failed: 0 };
};

/**
 * ⚡ v3.0: تم إلغاء هذه الدالة
 *
 * السبب: PowerSync يجلب البيانات تلقائياً من السيرفر عبر sync-rules
 * الخطأ السابق: "cannot UPSERT a view" - لأن الجداول المُزامنة هي views للقراءة فقط
 *
 * الآن: البيانات تُجلب تلقائياً، لا حاجة لجلبها يدوياً
 */
export const fetchProductReturnsFromServer = async (_organizationId: string): Promise<number> => {
  console.log('[fetchProductReturnsFromServer] ⚡ v3.0: PowerSync يجلب البيانات تلقائياً - لا حاجة لهذه الدالة');

  // ⚡ فقط نفرض المزامنة لجلب أحدث البيانات
  try {
    const isConnected = powerSyncService.syncStatus?.connected;
    if (isConnected) {
      await powerSyncService.forceSync();
      console.log('[fetchProductReturnsFromServer] ⚡ تم تحديث البيانات من السيرفر عبر PowerSync');
    }
  } catch (err) {
    console.warn('[fetchProductReturnsFromServer] ⚠️ فشل في المزامنة:', err);
  }

  // إرجاع 0 لأن PowerSync يدير العدد داخلياً
  return 0;
};

// ========================================
// Re-exports للتوافق العكسي
// ========================================
export {
  saveRemoteProductReturns,
  saveRemoteReturnItems,
  type LocalProductReturn
} from './localProductReturnService';
