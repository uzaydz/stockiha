/**
 * ⚡ Expenses Sync Service - نظام Delta Sync الموحد
 *
 * تم تبسيط هذا الملف - المزامنة للسيرفر تحدث تلقائياً عبر BatchSender
 */

import { supabase } from '@/lib/supabase';
import { deltaWriteService } from '@/services/DeltaWriteService';
import type { LocalExpense } from '@/database/localDb';

/**
 * ⚡ مزامنة المصروفات المعلقة
 * ملاحظة: BatchSender يتعامل مع هذا تلقائياً
 */
export const syncPendingExpenses = async (): Promise<{ success: number; failed: number }> => {
  console.log('[syncPendingExpenses] ⚡ Delta Sync - المزامنة تلقائية عبر BatchSender');
  return { success: 0, failed: 0 };
};

/**
 * ⚡ جلب المصروفات من السيرفر وحفظها محلياً
 */
export const fetchExpensesFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[fetchExpensesFromServer] ⚡ جلب المصروفات من السيرفر...');

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*, recurring_expenses(*)')
      .eq('organization_id', organizationId)
      .order('expense_date', { ascending: false })
      .limit(500);

    if (error) throw error;

    let savedCount = 0;

    for (const expense of expenses || []) {
      try {
        // ⚡ حفظ عبر Delta Sync
        await deltaWriteService.saveFromServer('expenses' as any, {
          ...expense,
          synced: true,
          syncStatus: undefined,
          pendingOperation: undefined
        });
        savedCount++;

        // حفظ المصروف المتكرر إذا وجد
        if (expense.recurring_expenses?.length) {
          for (const recurring of expense.recurring_expenses) {
            await deltaWriteService.saveFromServer('recurring_expenses' as any, {
              ...recurring,
              synced: true
            });
          }
        }
      } catch (e) {
        console.error('[fetchExpensesFromServer] ❌ فشل حفظ مصروف:', e);
      }
    }

    console.log(`[fetchExpensesFromServer] ✅ تم حفظ ${savedCount} مصروف`);
    return savedCount;
  } catch (error) {
    console.error('[fetchExpensesFromServer] ❌ خطأ:', error);
    return 0;
  }
};
