/**
 * ⚡ Loss Declarations Sync Service - نظام PowerSync الموحد
 *
 * ⚡ v3.0: تم إصلاح الأخطاء:
 * - إزالة synced/pendingOperation (غير موجودة في PowerSync)
 * - إزالة UPSERT على views (PowerSync يجلب البيانات تلقائياً)
 * - PowerSync يدير المزامنة تلقائياً من السيرفر
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
 * ⚡ مزامنة تصريحات الخسائر المعلقة
 * PowerSync يدير المزامنة تلقائياً - هذه الدالة تفرض المزامنة يدوياً
 */
export const syncPendingLossDeclarations = async (
  organizationId?: string
): Promise<{ success: number; failed: number }> => {
  const orgId = getOrganizationId(organizationId);
  if (!orgId) {
    console.warn('[syncPendingLossDeclarations] لا يوجد organizationId متاح');
    return { success: 0, failed: 0 };
  }

  const ready = await powerSyncService.waitForInitialization(5000);
  if (!ready) {
    console.warn('[syncPendingLossDeclarations] PowerSync غير مهيأ بعد');
    return { success: 0, failed: 0 };
  }

  // ⚡ PowerSync يدير المزامنة تلقائياً
  const isConnected = powerSyncService.syncStatus?.connected;
  if (isConnected) {
    try {
      await powerSyncService.forceSync();
      console.log('[syncPendingLossDeclarations] ⚡ تمت المزامنة بنجاح');
    } catch (err) {
      console.warn('[syncPendingLossDeclarations] فشل في المزامنة:', err);
    }
  }

  // PowerSync لا يعطينا عدد العناصر المُزامنة بشكل مباشر
  return { success: 0, failed: 0 };
};

/**
 * ⚡ v3.0: تم إلغاء هذه الدالة
 *
 * السبب: PowerSync يجلب البيانات تلقائياً من السيرفر عبر sync-rules
 * الخطأ السابق: "cannot UPSERT a view" + "no such column: loss_number_lower"
 *
 * الآن: البيانات تُجلب تلقائياً، لا حاجة لجلبها يدوياً
 */
export const fetchLossDeclarationsFromServer = async (_organizationId: string): Promise<number> => {
  console.log('[fetchLossDeclarationsFromServer] ⚡ v3.0: PowerSync يجلب البيانات تلقائياً - لا حاجة لهذه الدالة');

  // ⚡ فقط نفرض المزامنة لجلب أحدث البيانات
  try {
    const isConnected = powerSyncService.syncStatus?.connected;
    if (isConnected) {
      await powerSyncService.forceSync();
      console.log('[fetchLossDeclarationsFromServer] ⚡ تم تحديث البيانات من السيرفر عبر PowerSync');
    }
  } catch (err) {
    console.warn('[fetchLossDeclarationsFromServer] ⚠️ فشل في المزامنة:', err);
  }

  // إرجاع 0 لأن PowerSync يدير العدد داخلياً
  return 0;
};

// ========================================
// Re-exports للتوافق العكسي
// ========================================
export {
  type LocalLossDeclaration
} from './localLossDeclarationService';
