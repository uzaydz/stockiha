import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, type LocalCustomerDebt } from '@/database/localDb';
import { UnifiedQueue } from '@/sync/UnifiedQueue';

/**
 * خدمة إدارة ديون العملاء المحلية
 * تدعم الأوفلاين والأونلاين مع المزامنة التلقائية
 */

// إعادة تصدير النوع ليكون متاحاً للاستخدام الخارجي
export type { LocalCustomerDebt } from '@/database/localDb';

// إنشاء دين جديد محلياً
export const createLocalCustomerDebt = async (
  debtData: Omit<LocalCustomerDebt, 'id' | 'created_at' | 'updated_at' | 'synced' | 'syncStatus' | 'pendingOperation'>
): Promise<LocalCustomerDebt> => {
  const now = new Date().toISOString();
  const debtId = uuidv4();

  const debtRecord: LocalCustomerDebt = {
    ...debtData,
    id: debtId,
    created_at: now,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'create'
  };

  await inventoryDB.customerDebts.put(debtRecord);

  // إضافة إلى صف المزامنة
  await UnifiedQueue.enqueue({
    objectType: 'customer',
    objectId: debtId,
    operation: 'create',
    data: debtRecord,
    priority: 2
  });

  return debtRecord;
};

// تحديث دين محلياً
export const updateLocalCustomerDebt = async (
  debtId: string,
  updates: Partial<Omit<LocalCustomerDebt, 'id' | 'created_at' | 'organization_id'>>
): Promise<LocalCustomerDebt | null> => {
  const existing = await inventoryDB.customerDebts.get(debtId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: LocalCustomerDebt = {
    ...existing,
    ...updates,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'update'
  };

  await inventoryDB.customerDebts.put(updated);

  // إضافة إلى صف المزامنة
  await UnifiedQueue.enqueue({
    objectType: 'customer',
    objectId: debtId,
    operation: 'update',
    data: updated,
    priority: 2
  });

  return updated;
};

// حذف دين محلياً
export const deleteLocalCustomerDebt = async (debtId: string): Promise<boolean> => {
  const existing = await inventoryDB.customerDebts.get(debtId);
  if (!existing) return false;

  // وضع علامة للحذف بدلاً من الحذف الفوري
  const marked: LocalCustomerDebt = {
    ...existing,
    updated_at: new Date().toISOString(),
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'delete'
  };

  await inventoryDB.customerDebts.put(marked);

  // إضافة إلى صف المزامنة
  await UnifiedQueue.enqueue({
    objectType: 'customer',
    objectId: debtId,
    operation: 'delete',
    data: marked,
    priority: 2
  });

  return true;
};

// جلب دين واحد
export const getLocalCustomerDebt = async (debtId: string): Promise<LocalCustomerDebt | null> => {
  return await inventoryDB.customerDebts.get(debtId) || null;
};

// جلب جميع ديون عميل معين
export const getLocalCustomerDebts = async (customerId: string): Promise<LocalCustomerDebt[]> => {
  return await inventoryDB.customerDebts
    .where('customer_id')
    .equals(customerId)
    .and(debt => debt.pendingOperation !== 'delete')
    .toArray();
};

// جلب جميع الديون حسب المؤسسة
export const getAllLocalCustomerDebts = async (organizationId: string): Promise<LocalCustomerDebt[]> => {
  return await inventoryDB.customerDebts
    .where('organization_id')
    .equals(organizationId)
    .and(debt => debt.pendingOperation !== 'delete')
    .toArray();
};

// جلب الديون غير المتزامنة
export const getUnsyncedCustomerDebts = async (): Promise<LocalCustomerDebt[]> => {
  return await inventoryDB.customerDebts
    .filter(debt => debt.synced === false)
    .toArray();
};

// تحديث حالة المزامنة
export const updateCustomerDebtSyncStatus = async (
  debtId: string,
  synced: boolean,
  syncStatus?: 'pending' | 'syncing' | 'error'
): Promise<void> => {
  const debt = await inventoryDB.customerDebts.get(debtId);
  if (!debt) return;

  await inventoryDB.customerDebts.update(debtId, {
    synced,
    syncStatus,
    pendingOperation: synced ? undefined : debt.pendingOperation
  });
};

// تسجيل دفعة على دين
export const recordDebtPayment = async (
  debtId: string,
  paymentAmount: number
): Promise<LocalCustomerDebt | null> => {
  const debt = await inventoryDB.customerDebts.get(debtId);
  if (!debt) return null;

  const newPaidAmount = debt.paid_amount + paymentAmount;
  const newRemainingAmount = debt.total_amount - newPaidAmount;
  
  let newStatus: 'pending' | 'partial' | 'paid' = 'pending';
  if (newRemainingAmount <= 0) {
    newStatus = 'paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'partial';
  }

  return await updateLocalCustomerDebt(debtId, {
    paid_amount: newPaidAmount,
    remaining_amount: Math.max(0, newRemainingAmount),
    status: newStatus
  });
};

// مسح الديون المتزامنة والمحذوفة
export const cleanupSyncedDebts = async (): Promise<number> => {
  const toDelete = await inventoryDB.customerDebts
    .filter(debt => debt.synced === true && debt.pendingOperation === 'delete')
    .toArray();

  for (const debt of toDelete) {
    await inventoryDB.customerDebts.delete(debt.id);
  }

  return toDelete.length;
};
