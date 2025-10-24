import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, type LocalLossDeclaration, type LocalLossItem } from '@/database/localDb';
import { UnifiedQueue } from '@/sync/UnifiedQueue';
import { updateProductStock } from './offlineProductService';

/**
 * خدمة إدارة التصريح بالخسائر المحلية
 * تدعم الأوفلاين والأونلاين مع المزامنة التلقائية وتحديث المخزون
 */

// إعادة تصدير الأنواع لتكون متاحة للاستخدام الخارجي
export type { LocalLossDeclaration, LocalLossItem } from '@/database/localDb';

interface CreateLossData {
  lossData: Omit<LocalLossDeclaration, 'id' | 'created_at' | 'updated_at' | 'synced' | 'syncStatus' | 'pendingOperation'>;
  items: Array<Omit<LocalLossItem, 'id' | 'loss_id' | 'created_at' | 'synced'>>;
}

// إنشاء تصريح خسارة جديد محلياً
export const createLocalLossDeclaration = async (
  data: CreateLossData
): Promise<{ loss: LocalLossDeclaration; items: LocalLossItem[] }> => {
  const now = new Date().toISOString();
  const lossId = uuidv4();

  const lossRecord: LocalLossDeclaration = {
    ...data.lossData,
    id: lossId,
    created_at: now,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'create'
  };

  await inventoryDB.lossDeclarations.put(lossRecord);

  const itemRecords: LocalLossItem[] = [];
  
  for (const item of data.items) {
    const itemRecord: LocalLossItem = {
      ...item,
      id: uuidv4(),
      loss_id: lossId,
      created_at: now,
      synced: false
    };
    
    itemRecords.push(itemRecord);
    await inventoryDB.lossItems.put(itemRecord);
  }

  // إضافة إلى صف المزامنة
  await UnifiedQueue.enqueue({
    objectType: 'inventory',
    objectId: lossId,
    operation: 'create',
    data: { loss: lossRecord, items: itemRecords },
    priority: 2
  });

  return { loss: lossRecord, items: itemRecords };
};

// تحديث تصريح خسارة محلياً
export const updateLocalLossDeclaration = async (
  lossId: string,
  updates: Partial<Omit<LocalLossDeclaration, 'id' | 'created_at' | 'organization_id' | 'loss_number'>>
): Promise<LocalLossDeclaration | null> => {
  const existing = await inventoryDB.lossDeclarations.get(lossId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: LocalLossDeclaration = {
    ...existing,
    ...updates,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'update'
  };

  await inventoryDB.lossDeclarations.put(updated);

  // إضافة إلى صف المزامنة
  await UnifiedQueue.enqueue({
    objectType: 'inventory',
    objectId: lossId,
    operation: 'update',
    data: updated,
    priority: 2
  });

  return updated;
};

// الموافقة على تصريح خسارة وتحديث المخزون
export const approveLocalLossDeclaration = async (
  lossId: string,
  approvedBy: string
): Promise<LocalLossDeclaration | null> => {
  const loss = await inventoryDB.lossDeclarations.get(lossId);
  if (!loss) return null;

  const items = await inventoryDB.lossItems
    .where('loss_id')
    .equals(lossId)
    .toArray();

  // تحديث المخزون لجميع العناصر
  for (const item of items) {
    if (!item.inventory_adjusted) {
      try {
        // تحديث المخزون حسب التوقيع الصحيح للدالة
        await updateProductStock(
          loss.organization_id,  // organizationId
          item.product_id,       // productId
          item.lost_quantity,    // quantity
          true,                  // isReduction = true (نقص في المخزون)
          {
            colorId: item.color_id || undefined,
            sizeId: item.size_id || undefined
          }
        );

        // تحديث حالة العنصر
        await inventoryDB.lossItems.update(item.id, {
          inventory_adjusted: true
        });
      } catch (error) {
        console.error('فشل تحديث المخزون للمنتج:', item.product_id, error);
      }
    }
  }

  return await updateLocalLossDeclaration(lossId, {
    status: 'approved',
    approved_by: approvedBy,
    approved_at: new Date().toISOString()
  });
};

// رفض تصريح خسارة
export const rejectLocalLossDeclaration = async (
  lossId: string
): Promise<LocalLossDeclaration | null> => {
  return await updateLocalLossDeclaration(lossId, {
    status: 'rejected'
  });
};

// معالجة تصريح خسارة (بعد الموافقة)
export const processLocalLossDeclaration = async (
  lossId: string
): Promise<LocalLossDeclaration | null> => {
  const loss = await inventoryDB.lossDeclarations.get(lossId);
  if (!loss || loss.status !== 'approved') return null;

  return await updateLocalLossDeclaration(lossId, {
    status: 'processed'
  });
};

// جلب تصريح خسارة واحد مع عناصره
export const getLocalLossDeclaration = async (
  lossId: string
): Promise<{ loss: LocalLossDeclaration; items: LocalLossItem[] } | null> => {
  const loss = await inventoryDB.lossDeclarations.get(lossId);
  if (!loss) return null;

  const items = await inventoryDB.lossItems
    .where('loss_id')
    .equals(lossId)
    .toArray();

  return { loss, items };
};

// جلب جميع تصاريح الخسائر حسب المؤسسة
export const getAllLocalLossDeclarations = async (organizationId: string): Promise<LocalLossDeclaration[]> => {
  return await inventoryDB.lossDeclarations
    .where('organization_id')
    .equals(organizationId)
    .and(loss => loss.pendingOperation !== 'delete')
    .toArray();
};

// جلب التصاريح غير المتزامنة
export const getUnsyncedLossDeclarations = async (): Promise<LocalLossDeclaration[]> => {
  return await inventoryDB.lossDeclarations
    .filter(loss => loss.synced === false)
    .toArray();
};

// تحديث حالة المزامنة
export const updateLossDeclarationSyncStatus = async (
  lossId: string,
  synced: boolean,
  syncStatus?: 'pending' | 'syncing' | 'error'
): Promise<void> => {
  const loss = await inventoryDB.lossDeclarations.get(lossId);
  if (!loss) return;

  await inventoryDB.lossDeclarations.update(lossId, {
    synced,
    syncStatus,
    pendingOperation: synced ? undefined : loss.pendingOperation
  });
};

// مسح التصاريح المتزامنة والمحذوفة
export const cleanupSyncedLossDeclarations = async (): Promise<number> => {
  const toDelete = await inventoryDB.lossDeclarations
    .filter(loss => loss.synced === true && loss.pendingOperation === 'delete')
    .toArray();

  for (const loss of toDelete) {
    // حذف العناصر المرتبطة
    const items = await inventoryDB.lossItems
      .where('loss_id')
      .equals(loss.id)
      .toArray();
    
    for (const item of items) {
      await inventoryDB.lossItems.delete(item.id);
    }

    await inventoryDB.lossDeclarations.delete(loss.id);
  }

  return toDelete.length;
};

// حساب إجماليات الخسائر
export const calculateLossTotals = (items: LocalLossItem[]): {
  totalCostValue: number;
  totalSellingValue: number;
  totalItemsCount: number;
} => {
  return items.reduce(
    (acc, item) => ({
      totalCostValue: acc.totalCostValue + item.total_cost_value,
      totalSellingValue: acc.totalSellingValue + item.total_selling_value,
      totalItemsCount: acc.totalItemsCount + item.lost_quantity
    }),
    { totalCostValue: 0, totalSellingValue: 0, totalItemsCount: 0 }
  );
};
