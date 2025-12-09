/**
 * ⚡ Expense Categories Sync Service - نظام Delta Sync الموحد
 *
 * تم تبسيط هذا الملف - المزامنة للسيرفر تحدث تلقائياً عبر BatchSender
 */

import { supabase } from '@/lib/supabase';
import { deltaWriteService } from '@/services/DeltaWriteService';

/**
 * ⚡ مزامنة فئات المصروفات المعلقة
 * ملاحظة: BatchSender يتعامل مع هذا تلقائياً
 */
export const syncPendingExpenseCategories = async (): Promise<{ success: number; failed: number }> => {
  console.log('[syncPendingExpenseCategories] ⚡ Delta Sync - المزامنة تلقائية عبر BatchSender');
  return { success: 0, failed: 0 };
};

/**
 * ⚡ جلب فئات المصروفات من السيرفر وحفظها محلياً
 */
export const fetchExpenseCategoriesFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[fetchExpenseCategoriesFromServer] ⚡ جلب فئات المصروفات من السيرفر...');

    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) throw error;

    let saved = 0;
    for (const row of data || []) {
      try {
        // ⚡ حفظ عبر Delta Sync (بدون synced - PowerSync يديرها تلقائياً)
        await deltaWriteService.saveFromServer('expense_categories' as any, {
          id: row.id,
          organization_id: row.organization_id,
          name: row.name,
          description: row.description,
          color: row.color,
          icon: row.icon,
          is_default: row.is_default,
          created_at: row.created_at,
          updated_at: row.updated_at,
        });
        saved++;
      } catch (e) {
        console.error('[fetchExpenseCategoriesFromServer] ❌ فشل حفظ فئة:', e);
      }
    }

    console.log(`[fetchExpenseCategoriesFromServer] ✅ تم حفظ ${saved} فئة`);
    return saved;
  } catch (error) {
    console.error('[fetchExpenseCategoriesFromServer] ❌ خطأ:', error);
    return 0;
  }
};
