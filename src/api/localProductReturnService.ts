import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, type LocalProductReturn, type LocalReturnItem } from '@/database/localDb';
import { UnifiedQueue } from '@/sync/UnifiedQueue';
import { updateProductStock } from './offlineProductService';

// Re-export types للاستخدام في المكونات الأخرى
export type { LocalProductReturn, LocalReturnItem } from '@/database/localDb';

// تصدير الأنواع المساعدة
export interface CreateReturnData {
  returnData: Omit<LocalProductReturn, 'id' | 'created_at' | 'updated_at' | 'synced' | 'syncStatus' | 'pendingOperation'>;
  items: Array<Omit<LocalReturnItem, 'id' | 'return_id' | 'created_at' | 'synced'>>;
}

/**
 * خدمة إدارة إرجاع المنتجات المحلية
 * تدعم الأوفلاين والأونلاين مع المزامنة التلقائية وتحديث المخزون
 */

// إنشاع إرجاع جديد محلياً
export const createLocalProductReturn = async (
  data: CreateReturnData
): Promise<{ return: LocalProductReturn; items: LocalReturnItem[] }> => {
  const now = new Date().toISOString();
  const returnId = uuidv4();

  const returnRecord: LocalProductReturn = {
    ...data.returnData,
    id: returnId,
    created_at: now,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'create'
  };

  await inventoryDB.productReturns.put(returnRecord);

  const itemRecords: LocalReturnItem[] = [];
  
  for (const item of data.items) {
    const itemRecord: LocalReturnItem = {
      ...item,
      id: uuidv4(),
      return_id: returnId,
      created_at: now,
      synced: false
    };
    
    itemRecords.push(itemRecord);
    await inventoryDB.returnItems.put(itemRecord);

    // تحديث المخزون محلياً إذا كان قابل لإعادة البيع
    if (item.resellable && item.inventory_returned) {
      try {
        await updateProductStock(
          data.returnData.organization_id,
          item.product_id,
          item.return_quantity,
          false, // isReduction = false (نزيد المخزون)
          {
            colorId: item.color_id || undefined,
            sizeId: item.size_id || undefined
          }
        );
      } catch (error) {
        console.error('فشل تحديث المخزون للمنتج:', item.product_id, error);
      }
    }
  }

  // إضافة إلى صف المزامنة
  await UnifiedQueue.enqueue({
    objectType: 'order',
    objectId: returnId,
    operation: 'create',
    data: { return: returnRecord, items: itemRecords },
    priority: 1
  });

  return { return: returnRecord, items: itemRecords };
};

// Alias للتوافق مع الاستيراد
export const createLocalReturn = createLocalProductReturn;

// تحديث إرجاع محلياً
export const updateLocalProductReturn = async (
  returnId: string,
  updates: Partial<Omit<LocalProductReturn, 'id' | 'created_at' | 'organization_id' | 'return_number'>>
): Promise<LocalProductReturn | null> => {
  const existing = await inventoryDB.productReturns.get(returnId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: LocalProductReturn = {
    ...existing,
    ...updates,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'update'
  };

  await inventoryDB.productReturns.put(updated);

  // إضافة إلى صف المزامنة
  await UnifiedQueue.enqueue({
    objectType: 'order',
    objectId: returnId,
    operation: 'update',
    data: updated,
    priority: 1
  });

  return updated;
};

// الموافقة على إرجاع
export const approveLocalProductReturn = async (
  returnId: string,
  approvedBy: string
): Promise<LocalProductReturn | null> => {
  const productReturn = await inventoryDB.productReturns.get(returnId);
  if (!productReturn) return null;

  const items = await inventoryDB.returnItems
    .where('return_id')
    .equals(returnId)
    .toArray();

  // تحديث المخزون للعناصر القابلة لإعادة البيع
  for (const item of items) {
    if (item.resellable && !item.inventory_returned) {
      try {
        await updateProductStock(
          productReturn.organization_id,
          item.product_id,
          item.return_quantity,
          false, // isReduction = false (نزيد المخزون)
          {
            colorId: item.color_id || undefined,
            sizeId: item.size_id || undefined
          }
        );

        // تحديث حالة العنصر
        await inventoryDB.returnItems.update(item.id, {
          inventory_returned: true
        });
      } catch (error) {
        console.error('فشل تحديث المخزون للمنتج:', item.product_id, error);
      }
    }
  }

  return await updateLocalProductReturn(returnId, {
    status: 'approved',
    approved_by: approvedBy,
    approved_at: new Date().toISOString()
  });
};

// Alias للتوافق مع الاستيراد
export const approveLocalReturn = approveLocalProductReturn;

// رفض إرجاع
export const rejectLocalProductReturn = async (
  returnId: string
): Promise<LocalProductReturn | null> => {
  return await updateLocalProductReturn(returnId, {
    status: 'rejected'
  });
};

// Alias للتوافق مع الاستيراد
export const rejectLocalReturn = rejectLocalProductReturn;

// جلب إرجاع واحد مع عناصره
export const getLocalProductReturn = async (
  returnId: string
): Promise<{ return: LocalProductReturn; items: LocalReturnItem[] } | null> => {
  const productReturn = await inventoryDB.productReturns.get(returnId);
  if (!productReturn) return null;

  const items = await inventoryDB.returnItems
    .where('return_id')
    .equals(returnId)
    .toArray();

  return { return: productReturn, items };
};

// جلب جميع الإرجاعات حسب المؤسسة
export const getAllLocalProductReturns = async (organizationId: string): Promise<LocalProductReturn[]> => {
  return await inventoryDB.productReturns
    .where('organization_id')
    .equals(organizationId)
    .and(ret => ret.pendingOperation !== 'delete')
    .toArray();
};

// Alias للتوافق مع الاستيراد
export const getAllLocalReturns = getAllLocalProductReturns;

// جلب الإرجاعات غير المتزامنة
export const getUnsyncedProductReturns = async (): Promise<LocalProductReturn[]> => {
  return await inventoryDB.productReturns
    .filter(r => !r.synced)
    .toArray();
};

// تحديث حالة المزامنة
export const updateProductReturnSyncStatus = async (
  returnId: string,
  synced: boolean,
  syncStatus?: 'pending' | 'syncing' | 'error'
): Promise<void> => {
  const productReturn = await inventoryDB.productReturns.get(returnId);
  if (!productReturn) return;

  await inventoryDB.productReturns.update(returnId, {
    synced,
    syncStatus,
    pendingOperation: synced ? undefined : productReturn.pendingOperation
  });
};

// مسح الإرجاعات المتزامنة والمحذوفة
export const cleanupSyncedReturns = async (): Promise<number> => {
  const toDelete = await inventoryDB.productReturns
    .filter(ret => ret.synced === true && ret.pendingOperation === 'delete')
    .toArray();

  for (const productReturn of toDelete) {
    // حذف العناصر المرتبطة
    const items = await inventoryDB.returnItems
      .where('return_id')
      .equals(productReturn.id)
      .toArray();
    
    for (const item of items) {
      await inventoryDB.returnItems.delete(item.id);
    }

    await inventoryDB.productReturns.delete(productReturn.id);
  }

  return toDelete.length;
};

// ==================== بحث وتصفح محلي للإرجاعات ====================

export async function getLocalProductReturnsPage(
  organizationId: string,
  options: { offset?: number; limit?: number; status?: string | string[]; createdSort?: 'asc' | 'desc' } = {}
): Promise<{ returns: LocalProductReturn[]; total: number }> {
  const { offset = 0, limit = 50, status, createdSort = 'desc' } = options;
  let coll = inventoryDB.productReturns
    .where('[organization_id+created_at]') as any;
  coll = coll.between([organizationId, ''], [organizationId, '\\uffff']);
  if (createdSort === 'desc') coll = coll.reverse();
  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    coll = coll.and((r: any) => statuses.includes(r.status));
  }
  const total = await coll.count();
  const page = await coll.offset(offset).limit(limit).toArray();
  return { returns: page as any, total };
}

export async function fastSearchLocalProductReturns(
  organizationId: string,
  query: string,
  options: { limit?: number; status?: string | string[] } = {}
): Promise<LocalProductReturn[]> {
  const q = (query || '').toLowerCase();
  if (!q) return [];
  const limit = options.limit ?? 200;
  const statuses = options.status ? (Array.isArray(options.status) ? options.status : [options.status]) : null;

  const results = new Map<string, LocalProductReturn>();

  const numMatches = await inventoryDB.productReturns
    .where('[organization_id+return_number_lower]') as any;
  const byNum = await numMatches
    .between([organizationId, q], [organizationId, q + '\\uffff'])
    .limit(limit)
    .toArray();
  byNum.forEach((r: any) => { if (!statuses || statuses.includes(r.status)) results.set(r.id, r); });

  if (results.size < limit) {
    const nameMatches = await inventoryDB.productReturns
      .where('[organization_id+customer_name_lower]') as any;
    const byName = await nameMatches
      .between([organizationId, q], [organizationId, q + '\\uffff'])
      .limit(limit - results.size)
      .toArray();
    byName.forEach((r: any) => { if (!statuses || statuses.includes(r.status)) results.set(r.id, r); });
  }

  return Array.from(results.values()).slice(0, limit);
}
