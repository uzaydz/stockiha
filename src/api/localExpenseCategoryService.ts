/**
 * localExpenseCategoryService - خدمة فئات المصروفات المحلية
 *
 * ⚡ تم التحديث لاستخدام PowerSync
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalExpenseCategory } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

const orgId = () => (
  localStorage.getItem('currentOrganizationId') ||
  localStorage.getItem('bazaar_organization_id') ||
  '11111111-1111-1111-1111-111111111111'
);

export const listLocalExpenseCategories = async (): Promise<LocalExpenseCategory[]> => {
  const id = orgId();
  // ⚡ استخدام PowerSync
  return powerSyncService.query<LocalExpenseCategory>({
    sql: 'SELECT * FROM expense_categories WHERE organization_id = ?',
    params: [id]
  });
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
  } as LocalExpenseCategory;

  // ⚡ استخدام PowerSync
  await powerSyncService.transaction(async (tx) => {
    await tx.execute(
      'INSERT INTO expense_categories (id, organization_id, name, description, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, organizationId, name, description || null, icon || null, now, now]
    );
  });
  return rec;
};

export const updateLocalExpenseCategory = async (id: string, patch: Partial<Pick<LocalExpenseCategory, 'name' | 'description' | 'icon'>>): Promise<LocalExpenseCategory | null> => {
  // ⚡ استخدام PowerSync
  if (!powerSyncService.db) {
    console.warn('[localExpenseCategoryService] PowerSync DB not initialized');
    return null;
  }
  const cur = await powerSyncService.queryOne<LocalExpenseCategory>({
    sql: 'SELECT * FROM expense_categories WHERE id = ?',
    params: [id]
  });
  if (!cur) return null;

  const now = new Date().toISOString();
  const next: LocalExpenseCategory = {
    ...cur,
    ...patch,
    updated_at: now,
  } as LocalExpenseCategory;

  await powerSyncService.transaction(async (tx) => {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (patch.name !== undefined) {
      updates.push('name = ?');
      values.push(patch.name);
    }
    if (patch.description !== undefined) {
      updates.push('description = ?');
      values.push(patch.description);
    }
    if (patch.icon !== undefined) {
      updates.push('icon = ?');
      values.push(patch.icon);
    }
    
    if (updates.length > 0) {
      await tx.execute(
        `UPDATE expense_categories SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`,
        [...values, now, id]
      );
    }
  });
  return next;
};

export const deleteLocalExpenseCategory = async (id: string): Promise<boolean> => {
  // ⚡ استخدام PowerSync
  if (!powerSyncService.db) {
    console.warn('[localExpenseCategoryService] PowerSync DB not initialized');
    return null;
  }
  const cur = await powerSyncService.queryOne<LocalExpenseCategory>({
    sql: 'SELECT * FROM expense_categories WHERE id = ?',
    params: [id]
  });
  if (!cur) return false;

  await powerSyncService.transaction(async (tx) => {
    await tx.execute('DELETE FROM expense_categories WHERE id = ?', [id]);
  });
  return true;
};

export const getUnsyncedExpenseCategories = async (): Promise<LocalExpenseCategory[]> => {
  // ⚡ PowerSync يتعامل مع المزامنة تلقائياً
  const id = orgId();
  return powerSyncService.query<LocalExpenseCategory>({
    sql: 'SELECT * FROM expense_categories WHERE organization_id = ?',
    params: [id]
  });
};

export const updateExpenseCategorySyncStatus = async (id: string, synced: boolean) => {
  // ⚡ PowerSync يتعامل مع المزامنة تلقائياً - هذه الدالة للتوافق فقط
  console.log(`[LocalExpenseCategory] updateExpenseCategorySyncStatus called - PowerSync handles sync automatically`);
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
    } as LocalExpenseCategory;

    await powerSyncService.transaction(async (tx) => {
      await tx.execute(
        'INSERT OR REPLACE INTO expense_categories (id, organization_id, name, description, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [mappedCategory.id, mappedCategory.organization_id, mappedCategory.name, mappedCategory.description || null, mappedCategory.icon || null, mappedCategory.created_at, mappedCategory.updated_at]
      );
    });
  }

  console.log(`[LocalExpenseCategory] ⚡ Saved ${categories.length} remote categories`);
};
