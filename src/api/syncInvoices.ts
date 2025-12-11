/**
 * ⚡ Invoices Sync Service - نظام Delta Sync الموحد
 *
 * تم تبسيط هذا الملف - المزامنة للسيرفر تحدث تلقائياً عبر BatchSender
 */

import { supabase } from '@/lib/supabase';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { saveRemoteInvoices, saveRemoteInvoiceItems } from './localInvoiceService';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getOrganizationId(explicitOrgId?: string): string | null {
  if (explicitOrgId) return explicitOrgId;
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem('currentOrganizationId') ||
    window.localStorage.getItem('bazaar_organization_id') ||
    null
  );
}

async function countPendingInvoices(orgId: string): Promise<number> {
  try {
    // PowerSync stores pending changes in ps_crud table
    // Count only invoice-related pending operations
    const row = await powerSyncService.get<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM ps_crud
       WHERE data LIKE '%"invoices"%'`,
      []
    );
    return row?.count || 0;
  } catch (err) {
    // If ps_crud query fails, return 0 (no pending)
    console.warn('[syncPendingInvoices] Count failed, assuming 0 pending', err);
    return 0;
  }
}

/**
 * ⚡ مزامنة الفواتير المعلقة
 * تحاول دفع outbox عبر PowerSync وتعيد أرقاماً فعلية لواجهة المستخدم
 */
export const syncPendingInvoices = async (
  organizationId?: string
): Promise<{ success: number; failed: number }> => {
  const orgId = getOrganizationId(organizationId);
  if (!orgId) {
    console.warn('[syncPendingInvoices] لا يوجد organizationId متاح');
    return { success: 0, failed: 0 };
  }

  const ready = await powerSyncService.waitForInitialization(5000);
  if (!ready) {
    const pending = await countPendingInvoices(orgId);
    console.warn('[syncPendingInvoices] PowerSync غير مهيأ بعد');
    return { success: 0, failed: pending };
  }

  const wasConnected = powerSyncService.syncStatus?.connected;
  if (!wasConnected) {
    try {
      await powerSyncService.reconnect();
    } catch (err) {
      console.warn('[syncPendingInvoices] إعادة الاتصال فشلت', err);
    }
  }

  const before = await countPendingInvoices(orgId);
  if (before === 0) {
    return { success: 0, failed: 0 };
  }

  await powerSyncService.forceSync();
  await wait(500);

  const after = await countPendingInvoices(orgId);
  const synced = Math.max(0, before - after);

  return { success: synced, failed: after };
};

/**
 * ⚡ جلب الفواتير من السيرفر وحفظها محلياً
 */
export const syncInvoicesFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[syncInvoicesFromServer] ⚡ جلب الفواتير من السيرفر...');

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    // حفظ الفواتير
    await saveRemoteInvoices(invoices || []);

    // حفظ عناصر الفواتير
    for (const invoice of invoices || []) {
      if (invoice.invoice_items?.length) {
        await saveRemoteInvoiceItems(invoice.id, invoice.invoice_items);
      }
    }

    console.log(`[syncInvoicesFromServer] ✅ تم حفظ ${invoices?.length || 0} فاتورة`);
    return invoices?.length || 0;
  } catch (error) {
    console.error('[syncInvoicesFromServer] ❌ خطأ:', error);
    return 0;
  }
};

// Alias للتوافق
export const fetchInvoicesFromServer = syncInvoicesFromServer;
