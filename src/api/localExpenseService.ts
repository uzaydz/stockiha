import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, type LocalExpense, type LocalRecurringExpense, type LocalExpenseCategory } from '@/database/localDb';
import type { ExpenseFormData } from '@/types/expenses';

const getOrgId = (): string => {
  return (
    localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') ||
    '11111111-1111-1111-1111-111111111111'
  );
};

export const createLocalExpense = async (data: ExpenseFormData): Promise<LocalExpense> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const orgId = getOrgId();
  const rec = {
    id,
    organization_id: orgId,
    title: data.title,
    amount: Number(data.amount || 0),
    category: data.category,
    expense_date: (data.expense_date instanceof Date ? data.expense_date.toISOString() : (data.expense_date as any)) || now,
    notes: data.notes || null,
    status: (data.status as any) || 'completed',
    is_recurring: !!data.is_recurring,
    payment_method: (data as any).payment_method || null,
    payment_ref: (data as any).payment_ref || null,
    vendor_name: (data as any).vendor_name || null,
    cost_center_id: (data as any).cost_center_id || null,
    receipt_url: (data as any).receipt_url || null,
    created_at: now,
    updated_at: now,
    synced: false,
    pendingOperation: 'create' as const,
  } satisfies LocalExpense;

  await inventoryDB.expenses.put(rec);

  if (data.is_recurring && data.recurring) {
    const r: LocalRecurringExpense = {
      id: uuidv4(),
      expense_id: rec.id,
      frequency: data.recurring.frequency,
      start_date: (data.recurring.start_date instanceof Date ? data.recurring.start_date.toISOString() : (data.recurring.start_date as any)) || now,
      end_date: data.recurring.end_date ? (data.recurring.end_date instanceof Date ? data.recurring.end_date.toISOString() : (data.recurring.end_date as any)) : null,
      next_due: (data.recurring.start_date instanceof Date ? data.recurring.start_date.toISOString() : (data.recurring.start_date as any)) || now,
      day_of_month: data.recurring.day_of_month || null,
      day_of_week: data.recurring.day_of_week || null,
      status: 'active',
      created_at: now,
      updated_at: now,
      synced: false,
      pendingOperation: 'create',
    };
    await inventoryDB.recurringExpenses.put(r);
  }

  return rec;
};

export const updateLocalExpense = async (id: string, data: ExpenseFormData): Promise<LocalExpense | null> => {
  const ex = await inventoryDB.expenses.get(id);
  if (!ex) return null;
  const now = new Date().toISOString();
  const updated: LocalExpense = {
    ...ex,
    title: data.title ?? ex.title,
    amount: Number(data.amount ?? ex.amount),
    category: data.category ?? ex.category,
    expense_date: data.expense_date ? (data.expense_date instanceof Date ? data.expense_date.toISOString() : (data.expense_date as any)) : ex.expense_date,
    notes: data.notes ?? ex.notes,
    status: (data.status as any) ?? ex.status,
    is_recurring: !!data.is_recurring,
    payment_method: (data as any).payment_method ?? ex.payment_method,
    payment_ref: (data as any).payment_ref ?? ex.payment_ref,
    vendor_name: (data as any).vendor_name ?? ex.vendor_name,
    cost_center_id: (data as any).cost_center_id ?? ex.cost_center_id,
    receipt_url: (data as any).receipt_url ?? ex.receipt_url,
    updated_at: now,
    synced: false,
    pendingOperation: ex.pendingOperation === 'create' ? 'create' : 'update',
  };
  await inventoryDB.expenses.put(updated);

  // recurring handling
  const existingRecurring = await inventoryDB.recurringExpenses.where('expense_id').equals(id).first();
  if (data.is_recurring && data.recurring) {
    const r: LocalRecurringExpense = existingRecurring ? {
      ...existingRecurring,
      frequency: data.recurring.frequency,
      start_date: (data.recurring.start_date instanceof Date ? data.recurring.start_date.toISOString() : (data.recurring.start_date as any)) ?? existingRecurring.start_date,
      end_date: data.recurring.end_date ? (data.recurring.end_date instanceof Date ? data.recurring.end_date.toISOString() : (data.recurring.end_date as any)) : existingRecurring.end_date ?? null,
      day_of_month: data.recurring.day_of_month ?? existingRecurring.day_of_month ?? null,
      day_of_week: data.recurring.day_of_week ?? existingRecurring.day_of_week ?? null,
      next_due: existingRecurring.next_due ?? null,
      status: 'active',
      updated_at: now,
      synced: false,
      pendingOperation: existingRecurring.pendingOperation === 'create' ? 'create' : 'update',
    } : {
      id: uuidv4(),
      expense_id: id,
      frequency: data.recurring.frequency,
      start_date: (data.recurring.start_date instanceof Date ? data.recurring.start_date.toISOString() : (data.recurring.start_date as any)) || now,
      end_date: data.recurring.end_date ? (data.recurring.end_date instanceof Date ? data.recurring.end_date.toISOString() : (data.recurring.end_date as any)) : null,
      next_due: (data.recurring.start_date instanceof Date ? data.recurring.start_date.toISOString() : (data.recurring.start_date as any)) || now,
      day_of_month: data.recurring.day_of_month || null,
      day_of_week: data.recurring.day_of_week || null,
      status: 'active',
      created_at: now,
      updated_at: now,
      synced: false,
      pendingOperation: 'create',
    };
    await inventoryDB.recurringExpenses.put(r);
  } else if (existingRecurring) {
    // remove recurring if exists
    await inventoryDB.recurringExpenses.delete(existingRecurring.id);
  }

  return updated;
};

export const deleteLocalExpense = async (id: string): Promise<boolean> => {
  const ex = await inventoryDB.expenses.get(id);
  if (!ex) return false;
  await inventoryDB.expenses.put({ ...ex, synced: false, pendingOperation: 'delete', updated_at: new Date().toISOString() });
  return true;
};

export const getLocalExpense = async (id: string): Promise<LocalExpense | null> => {
  return (await inventoryDB.expenses.get(id)) || null;
};

export const listLocalExpenses = async (orgId: string): Promise<LocalExpense[]> => {
  return await inventoryDB.expenses.where('organization_id').equals(orgId).toArray();
};

export const getUnsyncedExpenses = async (): Promise<LocalExpense[]> => {
  return await inventoryDB.expenses.filter(e => e.synced === false).toArray();
};

export const updateExpenseSyncStatus = async (id: string, synced: boolean, pendingOperation?: LocalExpense['pendingOperation']) => {
  const ex = await inventoryDB.expenses.get(id);
  if (!ex) return;
  await inventoryDB.expenses.put({ ...ex, synced, pendingOperation: pendingOperation ?? (synced ? undefined : ex.pendingOperation) });
};

