import { supabase } from '@/lib/supabase';
import { getUnsyncedExpenseCategories, updateExpenseCategorySyncStatus } from './localExpenseCategoryService';
import { inventoryDB } from '@/database/localDb';

export const syncPendingExpenseCategories = async (): Promise<{ success: number; failed: number }> => {
  const unsynced = await getUnsyncedExpenseCategories();
  if (unsynced.length === 0) return { success: 0, failed: 0 };
  let success = 0, failed = 0;
  for (const cat of unsynced) {
    try {
      if (cat.pendingOperation === 'create') {
        const { error } = await supabase.from('expense_categories').insert({
          id: cat.id,
          organization_id: cat.organization_id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          created_at: cat.created_at,
          updated_at: cat.updated_at,
        });
        if (error) throw error;
        await updateExpenseCategorySyncStatus(cat.id, true);
        success++;
      } else if (cat.pendingOperation === 'update') {
        const { error } = await supabase.from('expense_categories').update({
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          updated_at: cat.updated_at,
        }).eq('id', cat.id);
        if (error) throw error;
        await updateExpenseCategorySyncStatus(cat.id, true);
        success++;
      } else if (cat.pendingOperation === 'delete') {
        const { error } = await supabase.from('expense_categories').delete().eq('id', cat.id);
        if (error) throw error;
        await inventoryDB.expenseCategories.delete(cat.id);
        success++;
      } else {
        // لا شيء
      }
    } catch (e) {
      failed++;
    }
  }
  return { success, failed };
};

export const fetchExpenseCategoriesFromServer = async (organizationId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');
  if (error) return 0;
  let saved = 0;
  for (const row of data || []) {
    await inventoryDB.expenseCategories.put({
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      created_at: row.created_at,
      updated_at: row.updated_at,
      synced: true,
      pendingOperation: undefined,
    } as any);
    saved++;
  }
  return saved;
};

