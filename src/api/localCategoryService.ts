/**
 * localCategoryService - خدمة الفئات المحلية
 *
 * ⚡ تستخدم Delta Sync للعمل Offline-First
 */

import { v4 as uuidv4 } from 'uuid';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { supabase } from '@/lib/supabase';

// Interface للفئة المحلية
export interface LocalCategory {
  id: string;
  name: string;
  name_lower?: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  image_url?: string | null;
  parent_id?: string | null;
  is_active: boolean;
  type: 'physical' | 'digital' | 'service' | 'mixed' | 'product';
  display_order?: number;
  organization_id: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  syncStatus?: 'pending' | 'syncing' | 'error';
  pendingOperation?: 'create' | 'update' | 'delete';
}

// جلب جميع الفئات المحلية
export const getAllLocalCategories = async (organizationId: string): Promise<LocalCategory[]> => {
  try {
    const categories = await deltaWriteService.getAll<LocalCategory>(
      'product_categories' as any,
      organizationId
    );
    return categories || [];
  } catch (error) {
    console.error('[LocalCategory] ❌ Error fetching categories:', error);
    return [];
  }
};

// جلب فئة واحدة
export const getLocalCategoryById = async (categoryId: string): Promise<LocalCategory | null> => {
  try {
    return await deltaWriteService.get<LocalCategory>('product_categories' as any, categoryId);
  } catch (error) {
    console.error('[LocalCategory] ❌ Error fetching category:', error);
    return null;
  }
};

// إنشاء فئة جديدة
export const createLocalCategory = async (
  organizationId: string,
  data: Omit<LocalCategory, 'id' | 'created_at' | 'updated_at' | 'synced' | 'syncStatus' | 'pendingOperation'>
): Promise<LocalCategory> => {
  const now = new Date().toISOString();
  const categoryId = uuidv4();

  const newCategory: LocalCategory = {
    ...data,
    id: categoryId,
    name_lower: data.name.toLowerCase(),
    organization_id: organizationId,
    created_at: now,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'create'
  };

  const result = await deltaWriteService.create('product_categories' as any, newCategory, organizationId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to create category');
  }

  console.log(`[LocalCategory] ⚡ Created category ${categoryId} via Delta Sync`);
  return newCategory;
};

// تحديث فئة
export const updateLocalCategory = async (
  categoryId: string,
  updates: Partial<LocalCategory>
): Promise<LocalCategory | null> => {
  try {
    const existing = await deltaWriteService.get<LocalCategory>('product_categories' as any, categoryId);

    if (!existing) {
      console.warn(`[LocalCategory] Category ${categoryId} not found`);
      return null;
    }

    const now = new Date().toISOString();
    const updatedCategory: LocalCategory = {
      ...existing,
      ...updates,
      updated_at: now,
      synced: false,
      syncStatus: 'pending',
      pendingOperation: existing.synced ? 'update' : existing.pendingOperation
    };

    if (updates.name) {
      updatedCategory.name_lower = updates.name.toLowerCase();
    }

    await deltaWriteService.update('product_categories' as any, categoryId, updatedCategory);

    console.log(`[LocalCategory] ⚡ Updated category ${categoryId} via Delta Sync`);
    return updatedCategory;
  } catch (error) {
    console.error('[LocalCategory] ❌ Error updating category:', error);
    return null;
  }
};

// حذف فئة
export const deleteLocalCategory = async (categoryId: string): Promise<boolean> => {
  try {
    await deltaWriteService.delete('product_categories' as any, categoryId);
    console.log(`[LocalCategory] ⚡ Deleted category ${categoryId} via Delta Sync`);
    return true;
  } catch (error) {
    console.error('[LocalCategory] ❌ Error deleting category:', error);
    return false;
  }
};

// حفظ فئات من السيرفر
export const saveRemoteCategories = async (categories: any[]): Promise<void> => {
  for (const category of categories) {
    const localCategory: LocalCategory = {
      id: category.id,
      name: category.name,
      name_lower: category.name?.toLowerCase(),
      slug: category.slug || category.name?.toLowerCase().replace(/\s+/g, '-'),
      description: category.description,
      image_url: category.image_url,
      parent_id: category.parent_id,
      is_active: category.is_active ?? true,
      type: category.type || 'physical',
      display_order: category.display_order || 0,
      organization_id: category.organization_id,
      created_at: category.created_at,
      updated_at: category.updated_at || category.created_at,
      synced: true,
      syncStatus: undefined,
      pendingOperation: undefined
    };

    await deltaWriteService.saveFromServer('product_categories' as any, localCategory);
  }

  console.log(`[LocalCategory] ✅ Saved ${categories.length} categories from server`);
};

// جلب الفئات من السيرفر وحفظها محلياً
export const fetchCategoriesFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[LocalCategory] ⚡ Fetching categories from server...');

    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    if (!categories || categories.length === 0) {
      console.log('[LocalCategory] No categories found on server');
      return 0;
    }

    await saveRemoteCategories(categories);

    console.log(`[LocalCategory] ✅ Fetched ${categories.length} categories from server`);
    return categories.length;
  } catch (error) {
    console.error('[LocalCategory] ❌ Error fetching from server:', error);
    return 0;
  }
};

// مزامنة الفئات المعلقة (تتم تلقائياً عبر BatchSender)
export const syncPendingCategories = async (): Promise<{ success: number; failed: number }> => {
  console.log('[LocalCategory] ⚡ Delta Sync - Categories sync is automatic via BatchSender');
  return { success: 0, failed: 0 };
};
