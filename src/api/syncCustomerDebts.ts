/**
 * ⚡ Customer Debts Sync Service - نظام Delta Sync الموحد
 *
 * تم تبسيط هذا الملف - المزامنة للسيرفر تحدث تلقائياً عبر BatchSender
 *
 * ملاحظة: الديون تُخزن في orders.remaining_amount في Supabase
 * جدول customer_debts محلي فقط للعرض
 */

import { supabase } from '@/lib/supabase';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { isSQLiteAvailable, sqliteDB } from '@/lib/db/sqliteAPI';
import type { LocalCustomerDebt } from './localCustomerDebtService';

/**
 * ⚡ مزامنة الديون المعلقة
 * ملاحظة: BatchSender يتعامل مع هذا تلقائياً
 */
export const syncPendingCustomerDebts = async (): Promise<{ success: number; failed: number }> => {
  console.log('[syncPendingCustomerDebts] ⚡ Delta Sync - المزامنة تلقائية عبر BatchSender');
  return { success: 0, failed: 0 };
};

/**
 * ⚡ جلب الديون من السيرفر وحفظها محلياً
 */
export const fetchCustomerDebtsFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[fetchCustomerDebtsFromServer] ⚡ جلب الديون من السيرفر...');

    // جلب الطلبات التي لها مبالغ متبقية
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, customers(name)')
      .eq('organization_id', organizationId)
      .gt('remaining_amount', 0)
      .order('created_at', { ascending: false });

    if (error) throw error;

    let savedCount = 0;

    for (const order of orders || []) {
      const debtData: LocalCustomerDebt = {
        id: `debt_${order.id}`,
        customer_id: order.customer_id || '',
        customer_name: (order.customers as any)?.name || 'غير معروف',
        order_id: order.id,
        order_number: order.id.slice(0, 8),
        subtotal: (order as any).subtotal || order.total || 0,
        discount: (order as any).discount || 0,
        total_amount: order.total || 0,
        paid_amount: (order.total || 0) - (order.remaining_amount || 0),
        remaining_amount: order.remaining_amount || 0,
        status: order.payment_status === 'paid' ? 'paid' : order.payment_status === 'partial' ? 'partial' : 'pending',
        due_date: null,
        notes: (order as any).notes || null,
        organization_id: organizationId,
        created_at: order.created_at,
        updated_at: order.updated_at || order.created_at,
        synced: true,
        syncStatus: undefined,
        pendingOperation: undefined
      };

      // ⚡ حفظ عبر Delta Sync
      if (isSQLiteAvailable()) {
        // التأكد من وجود العميل أولاً
        if (debtData.customer_id) {
          await sqliteDB.upsert('customers', {
            id: debtData.customer_id,
            name: debtData.customer_name || 'عميل',
            name_lower: (debtData.customer_name || 'عميل').toLowerCase(),
            organization_id: organizationId,
            created_at: order.created_at,
            updated_at: order.updated_at || order.created_at,
            synced: 1
          });
        }

        // حفظ الدين
        const result = await sqliteDB.upsert('customer_debts', {
          ...debtData,
          amount: debtData.remaining_amount,
          synced: 1
        });

        if (result.success) savedCount++;
      } else {
        await deltaWriteService.saveFromServer('customer_debts' as any, debtData);
        savedCount++;
      }
    }

    console.log(`[fetchCustomerDebtsFromServer] ✅ تم حفظ ${savedCount} دين`);
    return savedCount;
  } catch (error) {
    console.error('[fetchCustomerDebtsFromServer] ❌ خطأ:', error);
    return 0;
  }
};
