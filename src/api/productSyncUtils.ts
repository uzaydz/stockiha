/**
 * أدوات مساعدة لمزامنة المنتجات
 * توفر واجهة سهلة لتحميل المنتجات من السيرفر إلى SQLite
 */

import { syncProductsFromServer } from './syncService';
import { inventoryDB } from '@/database/localDb';

/**
 * فحص عدد المنتجات المحلية في SQLite
 */
export const getLocalProductsCount = async (organizationId: string): Promise<number> => {
  try {
    const count = await inventoryDB.products
      .where('organization_id')
      .equals(organizationId)
      .count();
    console.log('[ProductSyncUtils] Local products count:', count);
    return count;
  } catch (error) {
    console.error('[ProductSyncUtils] Error counting products:', error);
    return 0;
  }
};

/**
 * فحص إذا كانت SQLite فارغة من المنتجات
 */
export const isSQLiteEmpty = async (organizationId: string): Promise<boolean> => {
  const count = await getLocalProductsCount(organizationId);
  return count === 0;
};

/**
 * تحميل المنتجات من السيرفر إلى SQLite إذا كانت فارغة
 * @returns {Promise<boolean>} true إذا تم التحميل أو كانت البيانات موجودة، false في حالة الخطأ
 */
export const ensureProductsInSQLite = async (organizationId: string): Promise<{
  needed: boolean;
  success: boolean;
  count: number;
  error?: string;
}> => {
  try {
    console.log('[ProductSyncUtils] 🔍 Checking if products need to be downloaded...');
    
    const isEmpty = await isSQLiteEmpty(organizationId);
    
    if (!isEmpty) {
      const count = await getLocalProductsCount(organizationId);
      console.log('[ProductSyncUtils] ✅ Products already exist in SQLite:', count);
      return { needed: false, success: true, count };
    }

    console.log('[ProductSyncUtils] 📥 SQLite is empty - downloading products...');
    const result = await syncProductsFromServer(organizationId);
    
    return {
      needed: true,
      success: result.success,
      count: result.count,
      error: result.error
    };
  } catch (error: any) {
    console.error('[ProductSyncUtils] ❌ Error ensuring products:', error);
    return {
      needed: true,
      success: false,
      count: 0,
      error: error?.message || 'Unknown error'
    };
  }
};

/**
 * إعادة تحميل المنتجات من السيرفر (حتى لو كانت موجودة)
 * مفيد لتحديث البيانات المحلية
 */
export const forceReloadProducts = async (organizationId: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> => {
  console.log('[ProductSyncUtils] 🔄 Force reloading products from server...');
  return await syncProductsFromServer(organizationId);
};
