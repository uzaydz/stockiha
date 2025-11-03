import { supabase } from '@/lib/supabase';
import { inventoryDB, type LocalExpense, type LocalRecurringExpense } from '@/database/localDb';
import { getUnsyncedExpenses, updateExpenseSyncStatus } from './localExpenseService';

// مزامنة مصروف واحد إلى السيرفر
async function syncSingleExpense(exp: LocalExpense): Promise<boolean> {
  try {
    const op = exp.pendingOperation || 'update';

    if (op === 'create') {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          id: exp.id,
          organization_id: exp.organization_id,
          title: exp.title,
          amount: exp.amount,
          expense_date: exp.expense_date,
          description: exp.notes,
          category: exp.category,
          payment_method: exp.payment_method,
          status: exp.status,
          is_recurring: exp.is_recurring,
          receipt_url: exp.receipt_url,
          updated_at: exp.updated_at,
          created_at: exp.created_at,
        })
        .select()
        .single();
      if (error) throw error;

      // recurring
      if (exp.is_recurring) {
        const rec: LocalRecurringExpense | undefined = await inventoryDB.recurringExpenses.where('expense_id').equals(exp.id).first();
        if (rec) {
          const { error: recErr } = await supabase
            .from('recurring_expenses')
            .insert({
              expense_id: exp.id,
              frequency: rec.frequency,
              start_date: rec.start_date,
              end_date: rec.end_date,
              next_due: rec.next_due,
              day_of_month: rec.day_of_month,
              day_of_week: rec.day_of_week,
              status: rec.status
            });
          if (recErr) throw recErr;
        }
      }

      await updateExpenseSyncStatus(exp.id, true);
      return true;
    } else if (op === 'update') {
      const { error } = await supabase
        .from('expenses')
        .update({
          title: exp.title,
          amount: exp.amount,
          expense_date: exp.expense_date,
          description: exp.notes,
          category: exp.category,
          payment_method: exp.payment_method,
          status: exp.status,
          is_recurring: exp.is_recurring,
          receipt_url: exp.receipt_url,
          updated_at: exp.updated_at,
        })
        .eq('id', exp.id);
      if (error) throw error;

      // recurring
      const rec = await inventoryDB.recurringExpenses.where('expense_id').equals(exp.id).first();
      if (exp.is_recurring && rec) {
        // upsert recurring
        const { data: existing } = await supabase
          .from('recurring_expenses')
          .select('id')
          .eq('expense_id', exp.id)
          .maybeSingle();
        if (existing) {
          const { error: recErr } = await supabase
            .from('recurring_expenses')
            .update({
              frequency: rec.frequency,
              start_date: rec.start_date,
              end_date: rec.end_date,
              next_due: rec.next_due,
              day_of_month: rec.day_of_month,
              day_of_week: rec.day_of_week,
              status: rec.status,
            })
            .eq('expense_id', exp.id);
          if (recErr) throw recErr;
        } else {
          const { error: recErr } = await supabase
            .from('recurring_expenses')
            .insert({
              expense_id: exp.id,
              frequency: rec.frequency,
              start_date: rec.start_date,
              end_date: rec.end_date,
              next_due: rec.next_due,
              day_of_month: rec.day_of_month,
              day_of_week: rec.day_of_week,
              status: rec.status,
            });
          if (recErr) throw recErr;
        }
      } else {
        // remove remote recurring if exists
        const { error: delErr } = await supabase
          .from('recurring_expenses')
          .delete()
          .eq('expense_id', exp.id);
        if (delErr) {
          // ignore
        }
      }

      await updateExpenseSyncStatus(exp.id, true);
      return true;
    } else if (op === 'delete') {
      await supabase.from('recurring_expenses').delete().eq('expense_id', exp.id);
      const { error } = await supabase.from('expenses').delete().eq('id', exp.id);
      if (error) throw error;
      // حذف من المحلي بعد نجاح الخادم
      await inventoryDB.expenses.delete(exp.id);
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

export const syncPendingExpenses = async (): Promise<{ success: number; failed: number }> => {
  const unsynced = await getUnsyncedExpenses();
  if (unsynced.length === 0) return { success: 0, failed: 0 };
  let success = 0, failed = 0;
  for (const ex of unsynced) {
    const ok = await syncSingleExpense(ex);
    if (ok) success++; else failed++;
  }
  return { success, failed };
};

