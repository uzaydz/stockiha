/**
 * ⚡ Invoices Sync Service - نظام Delta Sync الموحد
 *
 * تم تبسيط هذا الملف - المزامنة للسيرفر تحدث تلقائياً عبر BatchSender
 */

import { supabase } from '@/lib/supabase';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { saveRemoteInvoices, saveRemoteInvoiceItems } from './localInvoiceService';

/**
 * ⚡ مزامنة الفواتير المعلقة
 * ملاحظة: BatchSender يتعامل مع هذا تلقائياً
 */
export const syncPendingInvoices = async (): Promise<{ success: number; failed: number }> => {
  console.log('[syncPendingInvoices] ⚡ Delta Sync - المزامنة تلقائية عبر BatchSender');
  return { success: 0, failed: 0 };
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
