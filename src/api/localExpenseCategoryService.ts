/**
 * localExpenseCategoryService - خدمة فئات المصروفات المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalExpenseCategory } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';

const orgId = () => (
  localStorage.getItem('currentOrganizationId') ||
  localStorage.getItem('bazaar_organization_id') ||
  '11111111-1111-1111-1111-111111111111'
);

export const listLocalExpenseCategories = async (): Promise<LocalExpenseCategory[]> => {
  const id = orgId();
  // ⚡ استخدام Delta Sync
  return deltaWriteService.getAll<LocalExpenseCategory>('expense_categories' as any, id);
};

export const createLocalExpenseCategory = async (name: string, description?: string, icon?: string): Promise<LocalExpenseCategory> => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const organizationId = orgId();

  const rec: LocalExpenseCategory = {
    id,
    organization_id: organizationId,
    name,
    description: description || null,
    icon: icon || null,
    created_at: now,
    updated_at: now,
    synced: false,
    pendingOperation: 'create'
  };

  // ⚡ استخدام Delta Sync
  await deltaWriteService.create('expense_categories' as any, rec, organizationId);
  return rec;
};

export const updateLocalExpenseCategory = async (id: string, patch: Partial<Pick<LocalExpenseCategory, 'name' | 'description' | 'icon'>>): Promise<LocalExpenseCategory | null> => {
  // ⚡ استخدام Delta Sync
  const cur = await deltaWriteService.get<LocalExpenseCategory>('expense_categories' as any, id);
  if (!cur) return null;

  const now = new Date().toISOString();
  const next: LocalExpenseCategory = {
    ...cur,
    ...patch,
    updated_at: now,
    synced: false,
    pendingOperation: cur.pendingOperation === 'create' ? 'create' : 'update'
  };

  await deltaWriteService.update('expense_categories' as any, id, next);
  return next;
};

export const deleteLocalExpenseCategory = async (id: string): Promise<boolean> => {
  // ⚡ استخدام Delta Sync
  const cur = await deltaWriteService.get<LocalExpenseCategory>('expense_categories' as any, id);
  if (!cur) return false;

  await deltaWriteService.update('expense_categories' as any, id, {
    synced: false,
    pendingOperation: 'delete',
    updated_at: new Date().toISOString()
  });
  return true;
};

export const getUnsyncedExpenseCategories = async (): Promise<LocalExpenseCategory[]> => {
  const id = orgId();
  // ⚡ استخدام Delta Sync
  return deltaWriteService.getAll<LocalExpenseCategory>('expense_categories' as any, id, {
    where: 'synced = 0 OR synced IS NULL'
  });
};

export const updateExpenseCategorySyncStatus = async (id: string, synced: boolean) => {
  // ⚡ استخدام Delta Sync
  const cur = await deltaWriteService.get<LocalExpenseCategory>('expense_categories' as any, id);
  if (!cur) return;

  await deltaWriteService.update('expense_categories' as any, id, {
    synced,
    pendingOperation: synced ? undefined : cur.pendingOperation
  });
};

// =====================
// حفظ البيانات من السيرفر
// =====================

export const saveRemoteExpenseCategories = async (categories: any[]): Promise<void> => {
  if (!categories || categories.length === 0) return;

  const now = new Date().toISOString();

  for (const category of categories) {
    const mappedCategory: LocalExpenseCategory = {
      id: category.id,
      organization_id: category.organization_id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      created_at: category.created_at || now,
      updated_at: category.updated_at || now,
      synced: true,
      pendingOperation: undefined,
    };

    await deltaWriteService.saveFromServer('expense_categories' as any, mappedCategory);
  }

  console.log(`[LocalExpenseCategory] ⚡ Saved ${categories.length} remote categories`);
};
