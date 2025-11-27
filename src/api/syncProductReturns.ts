/**
 * ⚡ Product Returns Sync Service - نظام Delta Sync الموحد
 *
 * تم تبسيط هذا الملف - المزامنة للسيرفر تحدث تلقائياً عبر BatchSender
 */

import { supabase } from '@/lib/supabase';
import {
  saveRemoteProductReturns,
  saveRemoteReturnItems,
  type LocalProductReturn
} from './localProductReturnService';
import { deltaWriteService } from '@/services/DeltaWriteService';

/**
 * ⚡ مزامنة المرتجعات المعلقة
 * ملاحظة: BatchSender يتعامل مع هذا تلقائياً
 */
export const syncPendingProductReturns = async (): Promise<{ success: number; failed: number }> => {
  console.log('[syncPendingProductReturns] ⚡ Delta Sync - المزامنة تلقائية عبر BatchSender');
  return { success: 0, failed: 0 };
};

/**
 * ⚡ جلب المرتجعات من السيرفر وحفظها محلياً
 */
export const fetchProductReturnsFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[fetchProductReturnsFromServer] ⚡ جلب المرتجعات من السيرفر...');

    const { data: returns, error } = await supabase
      .from('returns')
      .select('*, return_items(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    let savedCount = 0;

    for (const returnData of returns || []) {
      try {
        const localReturn: LocalProductReturn = {
          id: returnData.id,
          return_number: returnData.return_number,
          remote_return_id: returnData.id,
          original_order_id: returnData.original_order_id,
          original_order_number: returnData.original_order_number,
          customer_id: returnData.customer_id,
          customer_name: returnData.customer_name,
          customer_phone: returnData.customer_phone,
          return_type: returnData.return_type,
          return_reason: returnData.return_reason,
          return_reason_description: returnData.return_reason_description,
          original_total: returnData.original_total,
          return_amount: returnData.return_amount,
          refund_amount: returnData.refund_amount,
          restocking_fee: returnData.restocking_fee,
          status: returnData.status,
          approved_by: returnData.approved_by,
          approved_at: returnData.approved_at,
          refund_method: returnData.refund_method,
          notes: returnData.notes,
          organization_id: organizationId,
          created_at: returnData.created_at,
          updated_at: returnData.updated_at || returnData.created_at,
          synced: true,
          syncStatus: undefined,
          pendingOperation: undefined
        };

        // ⚡ حفظ المرتجع عبر Delta Sync
        await deltaWriteService.saveFromServer('product_returns' as any, localReturn);

        // ⚡ حفظ عناصر المرتجع عبر Delta Sync
        if (returnData.return_items && Array.isArray(returnData.return_items)) {
          for (const item of returnData.return_items) {
            await deltaWriteService.saveFromServer('return_items' as any, {
              id: item.id,
              return_id: returnData.id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_sku: item.product_sku,
              return_quantity: item.return_quantity,
              return_unit_price: item.return_unit_price,
              total_return_amount: item.total_return_amount,
              condition_status: item.condition_status,
              resellable: item.resellable,
              inventory_returned: item.inventory_returned,
              color_id: item.color_id,
              color_name: item.color_name,
              size_id: item.size_id,
              size_name: item.size_name,
              created_at: item.created_at,
              synced: true
            });
          }
        }

        savedCount++;
      } catch (e) {
        console.error('[fetchProductReturnsFromServer] ❌ فشل حفظ مرتجع:', e);
      }
    }

    console.log(`[fetchProductReturnsFromServer] ✅ تم جلب ${savedCount} مرتجع`);
    return savedCount;
  } catch (error) {
    console.error('[fetchProductReturnsFromServer] ❌ خطأ:', error);
    return 0;
  }
};
