import { v4 as uuidv4 } from 'uuid';
import { inventoryDB, type LocalCustomerDebt } from '@/database/localDb';
import { UnifiedQueue } from '@/sync/UnifiedQueue';
import { isSQLiteAvailable } from '@/lib/db/sqliteAPI';
import { sqliteDB } from '@/lib/db/sqliteAPI';

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

  if (isSQLiteAvailable()) {
    // استخدام SQLite في Electron
    const result = await sqliteDB.upsert('customer_debts', {
      ...debtRecord,
      synced: 0, // SQLite uses 0/1 for boolean
      amount: debtRecord.amount || debtRecord.remaining_amount // Ensure amount is set
    });
    
    if (!result.success) {
      console.error('[createLocalCustomerDebt] Failed to save to SQLite:', result.error);
      throw new Error(`Failed to create customer debt: ${result.error}`);
    }
  } else {
    // Fallback لـ IndexedDB في المتصفح
    await inventoryDB.customerDebts.put(debtRecord);
  }

  // ملاحظة: الديون تُزامن عبر syncCustomerDebts.ts مباشرة
  // لا حاجة لإضافتها للـ queue لأنها تُزامن مع الطلبيات

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
  if (isSQLiteAvailable()) {
    const result = await sqliteDB.query(
      `SELECT * FROM customer_debts 
       WHERE customer_id = ? 
       AND (pending_operation IS NULL OR pending_operation != 'delete')
       ORDER BY created_at DESC`,
      [customerId]
    );
    return result.success ? (result.data || []) : [];
  }
  
  return await inventoryDB.customerDebts
    .where('customer_id')
    .equals(customerId)
    .and(debt => debt.pendingOperation !== 'delete')
    .toArray();
};

// جلب جميع الديون حسب المؤسسة
export const getAllLocalCustomerDebts = async (organizationId: string): Promise<LocalCustomerDebt[]> => {
  if (isSQLiteAvailable()) {
    console.log('[getAllLocalCustomerDebts] 🔍 Fetching from SQLite', { organizationId });
    const result = await sqliteDB.query(
      `SELECT * FROM customer_debts 
       WHERE organization_id = ? 
       AND (pending_operation IS NULL OR pending_operation != 'delete')
       AND remaining_amount > 0
       ORDER BY created_at DESC`,
      [organizationId]
    );
    console.log('[getAllLocalCustomerDebts] ✅ SQLite result:', { 
      success: result.success, 
      count: result.data?.length || 0,
      sample: result.data?.[0]
    });
    return result.success ? (result.data || []) : [];
  }
  
  return await inventoryDB.customerDebts
    .where('organization_id')
    .equals(organizationId)
    .and(debt => debt.pendingOperation !== 'delete')
    .toArray();
};

// جلب الديون غير المتزامنة
export const getUnsyncedCustomerDebts = async (): Promise<LocalCustomerDebt[]> => {
  if (isSQLiteAvailable()) {
    const result = await sqliteDB.query(
      `SELECT * FROM customer_debts 
       WHERE synced = 0 OR synced IS NULL
       ORDER BY created_at ASC`,
      []
    );
    return result.success ? (result.data || []) : [];
  }
  
  return await inventoryDB.customerDebts
    .filter(d => !d.synced)
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
  if (isSQLiteAvailable()) {
    const result = await sqliteDB.execute(
      `DELETE FROM customer_debts 
       WHERE synced = 1 AND pending_operation = 'delete'`,
      []
    );
    return result.success ? (result.changes || 0) : 0;
  }
  
  const toDelete = await inventoryDB.customerDebts
    .filter(debt => debt.synced === true && debt.pendingOperation === 'delete')
    .toArray();

  for (const debt of toDelete) {
    await inventoryDB.customerDebts.delete(debt.id);
  }

  return toDelete.length;
};
