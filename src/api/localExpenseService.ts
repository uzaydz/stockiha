/**
 * localExpenseService - خدمة المصروفات المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalExpense, LocalRecurringExpense } from '@/database/localDb';
import type { ExpenseFormData } from '@/types/expenses';
import { deltaWriteService } from '@/services/DeltaWriteService';

// Re-export types
export type { LocalExpense, LocalRecurringExpense, LocalExpenseCategory } from '@/database/localDb';

const getOrgId = (): string => {
  return (
    localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') ||
    '11111111-1111-1111-1111-111111111111'
  );
};

/**
 * إنشاء مصروف جديد
 */
export const createLocalExpense = async (data: ExpenseFormData): Promise<LocalExpense> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const orgId = getOrgId();

  const rec: LocalExpense = {
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
  };

  // ⚡ استخدام Delta Sync
  const result = await deltaWriteService.create('expenses', rec, orgId);
  if (!result.success) {
    throw new Error(`Failed to create expense: ${result.error}`);
  }

  console.log(`[LocalExpense] ⚡ Created expense ${id} via Delta Sync`);

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

    await deltaWriteService.create('recurring_expenses', r, orgId);
    console.log(`[LocalExpense] ⚡ Created recurring expense ${r.id} via Delta Sync`);
  }

  return rec;
};

/**
 * تحديث مصروف
 */
export const updateLocalExpense = async (id: string, data: ExpenseFormData): Promise<LocalExpense | null> => {
  const ex = await deltaWriteService.get<LocalExpense>('expenses', id);
  if (!ex) return null;

  const now = new Date().toISOString();
  const orgId = ex.organization_id || getOrgId();

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

  await deltaWriteService.update('expenses', id, updated);
  console.log(`[LocalExpense] ⚡ Updated expense ${id} via Delta Sync`);

  // معالجة المصروفات المتكررة
  const existingRecurring = await deltaWriteService.getAll<LocalRecurringExpense>('recurring_expenses', orgId, {
    where: 'expense_id = ?',
    params: [id],
    limit: 1
  });

  const existingRec = existingRecurring[0];

  if (data.is_recurring && data.recurring) {
    const r: LocalRecurringExpense = existingRec ? {
      ...existingRec,
      frequency: data.recurring.frequency,
      start_date: (data.recurring.start_date instanceof Date ? data.recurring.start_date.toISOString() : (data.recurring.start_date as any)) ?? existingRec.start_date,
      end_date: data.recurring.end_date ? (data.recurring.end_date instanceof Date ? data.recurring.end_date.toISOString() : (data.recurring.end_date as any)) : existingRec.end_date ?? null,
      day_of_month: data.recurring.day_of_month ?? existingRec.day_of_month ?? null,
      day_of_week: data.recurring.day_of_week ?? existingRec.day_of_week ?? null,
      next_due: existingRec.next_due ?? null,
      status: 'active',
      updated_at: now,
      synced: false,
      pendingOperation: existingRec.pendingOperation === 'create' ? 'create' : 'update',
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

    if (existingRec) {
      await deltaWriteService.update('recurring_expenses', existingRec.id, r);
    } else {
      await deltaWriteService.create('recurring_expenses', r, orgId);
    }
  } else if (existingRec) {
    // حذف المصروف المتكرر إذا لم يعد متكرراً
    await deltaWriteService.delete('recurring_expenses', existingRec.id);
  }

  return updated;
};

/**
 * حذف مصروف
 */
export const deleteLocalExpense = async (id: string): Promise<boolean> => {
  const ex = await deltaWriteService.get<LocalExpense>('expenses', id);
  if (!ex) return false;

  await deltaWriteService.update('expenses', id, {
    synced: false,
    pendingOperation: 'delete',
    updated_at: new Date().toISOString()
  });

  console.log(`[LocalExpense] ⚡ Marked expense ${id} for deletion via Delta Sync`);
  return true;
};

/**
 * الحصول على مصروف بالمعرّف
 */
export const getLocalExpense = async (id: string): Promise<LocalExpense | null> => {
  return deltaWriteService.get<LocalExpense>('expenses', id);
};

/**
 * قائمة المصروفات
 */
export const listLocalExpenses = async (orgId: string): Promise<LocalExpense[]> => {
  return deltaWriteService.getAll<LocalExpense>('expenses', orgId, {
    where: "(pending_operation IS NULL OR pending_operation != 'delete')",
    orderBy: 'expense_date DESC'
  });
};

/**
 * الحصول على المصروفات غير المتزامنة
 */
export const getUnsyncedExpenses = async (): Promise<LocalExpense[]> => {
  const orgId = getOrgId();
  return deltaWriteService.getAll<LocalExpense>('expenses', orgId, {
    where: 'synced = 0'
  });
};

/**
 * تحديث حالة المزامنة
 */
export const updateExpenseSyncStatus = async (id: string, synced: boolean, pendingOperation?: LocalExpense['pendingOperation']) => {
  await deltaWriteService.update('expenses', id, {
    synced,
    pendingOperation: pendingOperation ?? (synced ? undefined : undefined)
  });
};

// =====================
// حفظ البيانات من السيرفر
// =====================

export const saveRemoteExpenses = async (expenses: any[]): Promise<void> => {
  if (!expenses || expenses.length === 0) return;

  const now = new Date().toISOString();

  for (const expense of expenses) {
    const mappedExpense: LocalExpense = {
      id: expense.id,
      organization_id: expense.organization_id,
      title: expense.title,
      amount: expense.amount || 0,
      category: expense.category,
      expense_date: expense.expense_date || now,
      notes: expense.notes,
      status: expense.status || 'completed',
      is_recurring: expense.is_recurring || false,
      payment_method: expense.payment_method,
      payment_ref: expense.payment_ref,
      vendor_name: expense.vendor_name,
      cost_center_id: expense.cost_center_id,
      receipt_url: expense.receipt_url,
      created_at: expense.created_at || now,
      updated_at: expense.updated_at || now,
      synced: true,
      pendingOperation: undefined,
    };

    await deltaWriteService.saveFromServer('expenses', mappedExpense);
  }

  console.log(`[LocalExpense] ⚡ Saved ${expenses.length} remote expenses`);
};
