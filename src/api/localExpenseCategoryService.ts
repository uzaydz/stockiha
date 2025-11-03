import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, type LocalExpenseCategory } from '@/database/localDb';

const orgId = () => (
  localStorage.getItem('currentOrganizationId') ||
  localStorage.getItem('bazaar_organization_id') ||
  '11111111-1111-1111-1111-111111111111'
);

export const listLocalExpenseCategories = async (): Promise<LocalExpenseCategory[]> => {
  const id = orgId();
  return await inventoryDB.expenseCategories.where('organization_id').equals(id).toArray();
};

export const createLocalExpenseCategory = async (name: string, description?: string, icon?: string): Promise<LocalExpenseCategory> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const rec: LocalExpenseCategory = {
    id,
    organization_id: orgId(),
    name,
    description: description || null,
    icon: icon || null,
    created_at: now,
    updated_at: now,
    synced: false,
    pendingOperation: 'create'
  };
  await inventoryDB.expenseCategories.put(rec);
  return rec;
};

export const updateLocalExpenseCategory = async (id: string, patch: Partial<Pick<LocalExpenseCategory, 'name' | 'description' | 'icon'>>): Promise<LocalExpenseCategory | null> => {
  const cur = await inventoryDB.expenseCategories.get(id);
  if (!cur) return null;
  const now = new Date().toISOString();
  const next: LocalExpenseCategory = {
    ...cur,
    ...patch,
    updated_at: now,
    synced: false,
    pendingOperation: cur.pendingOperation === 'create' ? 'create' : 'update'
  };
  await inventoryDB.expenseCategories.put(next);
  return next;
};

export const deleteLocalExpenseCategory = async (id: string): Promise<boolean> => {
  const cur = await inventoryDB.expenseCategories.get(id);
  if (!cur) return false;
  await inventoryDB.expenseCategories.put({ ...cur, synced: false, pendingOperation: 'delete', updated_at: new Date().toISOString() });
  return true;
};

export const getUnsyncedExpenseCategories = async (): Promise<LocalExpenseCategory[]> => {
  return await inventoryDB.expenseCategories.filter(c => c.synced === false).toArray();
};

export const updateExpenseCategorySyncStatus = async (id: string, synced: boolean) => {
  const cur = await inventoryDB.expenseCategories.get(id);
  if (!cur) return;
  await inventoryDB.expenseCategories.put({ ...cur, synced, pendingOperation: synced ? undefined : cur.pendingOperation });
};

