/**
 * localCustomerDebtService - خدمة ديون العملاء المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - DELTA operations: للمبالغ المدفوعة
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalCustomerDebt } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';

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
    pendingOperation: 'create',
    // التأكد من وجود amount
    amount: debtData.amount || debtData.remaining_amount || debtData.total_amount
  };

  // ⚡ استخدام Delta Sync
  const result = await deltaWriteService.create('customer_debts', debtRecord, debtData.organization_id);

  if (!result.success) {
    throw new Error(`Failed to create customer debt: ${result.error}`);
  }

  console.log(`[LocalDebt] ⚡ Created debt ${debtId} via Delta Sync`);
  return debtRecord;
};

// تحديث دين محلياً
export const updateLocalCustomerDebt = async (
  debtId: string,
  updates: Partial<Omit<LocalCustomerDebt, 'id' | 'created_at' | 'organization_id'>>
): Promise<LocalCustomerDebt | null> => {
  try {
    const existing = await deltaWriteService.get<LocalCustomerDebt>('customer_debts', debtId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updated_at: now,
      synced: false,
      syncStatus: 'pending',
      pendingOperation: existing.pendingOperation === 'create' ? 'create' : 'update'
    };

    // ⚡ استخدام Delta Sync
    const result = await deltaWriteService.update('customer_debts', debtId, updatedData);

    if (!result.success) {
      console.error(`[LocalDebt] Failed to update debt ${debtId}:`, result.error);
      return null;
    }

    console.log(`[LocalDebt] ⚡ Updated debt ${debtId} via Delta Sync`);
    return {
      ...existing,
      ...updatedData
    } as LocalCustomerDebt;
  } catch (error) {
    console.error(`[LocalDebt] Update error:`, error);
    return null;
  }
};

// حذف دين محلياً
export const deleteLocalCustomerDebt = async (debtId: string): Promise<boolean> => {
  try {
    const existing = await deltaWriteService.get<LocalCustomerDebt>('customer_debts', debtId);
    if (!existing) return false;

    // ⚡ استخدام Delta Sync للحذف
    const result = await deltaWriteService.delete('customer_debts', debtId);

    if (result.success) {
      console.log(`[LocalDebt] ⚡ Deleted debt ${debtId} via Delta Sync`);
    }

    return result.success;
  } catch (error) {
    console.error(`[LocalDebt] Delete error:`, error);
    return false;
  }
};

// جلب دين واحد
export const getLocalCustomerDebt = async (debtId: string): Promise<LocalCustomerDebt | null> => {
  return deltaWriteService.get<LocalCustomerDebt>('customer_debts', debtId);
};

// جلب جميع ديون عميل معين
export const getLocalCustomerDebts = async (customerId: string): Promise<LocalCustomerDebt[]> => {
  const orgId = localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') || '';

  return deltaWriteService.getAll<LocalCustomerDebt>('customer_debts', orgId, {
    where: "customer_id = ? AND (pending_operation IS NULL OR pending_operation != 'delete')",
    params: [customerId],
    orderBy: 'created_at DESC'
  });
};

// جلب جميع الديون حسب المؤسسة
export const getAllLocalCustomerDebts = async (organizationId: string): Promise<LocalCustomerDebt[]> => {
  console.log('[getAllLocalCustomerDebts] 🔍 Fetching via Delta Sync', { organizationId });

  const debts = await deltaWriteService.getAll<LocalCustomerDebt>('customer_debts', organizationId, {
    where: "(pending_operation IS NULL OR pending_operation != 'delete') AND remaining_amount > 0",
    orderBy: 'created_at DESC'
  });

  console.log('[getAllLocalCustomerDebts] ✅ Delta Sync result:', {
    count: debts.length,
    sample: debts[0]
  });

  return debts;
};

// جلب الديون غير المتزامنة
export const getUnsyncedCustomerDebts = async (): Promise<LocalCustomerDebt[]> => {
  const orgId = localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') || '';

  const debts = await deltaWriteService.getAll<LocalCustomerDebt>('customer_debts', orgId, {
    where: "(synced = 0 OR synced IS NULL) AND (pending_operation IS NOT NULL OR synced = 0)"
  });

  console.log('[getUnsyncedCustomerDebts] 📋 Found unsynced debts:', {
    count: debts.length,
    sample: debts[0] ? {
      id: debts[0].id,
      pendingOperation: debts[0].pendingOperation,
      synced: debts[0].synced
    } : null
  });

  return debts;
};

// تحديث حالة المزامنة
export const updateCustomerDebtSyncStatus = async (
  debtId: string,
  synced: boolean,
  syncStatus?: 'pending' | 'syncing' | 'error'
): Promise<void> => {
  const updatedData: any = {
    synced,
    sync_status: syncStatus || null
  };

  if (synced) {
    updatedData.pending_operation = null;
  }

  await deltaWriteService.update('customer_debts', debtId, updatedData);
};

// تسجيل دفعة على دين باستخدام DELTA operation
export const recordDebtPayment = async (
  debtId: string,
  paymentAmount: number
): Promise<LocalCustomerDebt | null> => {
  try {
    const debt = await deltaWriteService.get<LocalCustomerDebt>('customer_debts', debtId);
    if (!debt) return null;

    // ⚡ استخدام DELTA operation للمبلغ المدفوع
    const result = await deltaWriteService.recordDebtPayment(debtId, paymentAmount);

    if (!result.success) {
      console.error(`[LocalDebt] Failed to record payment:`, result.error);
      return null;
    }

    // حساب الحالة الجديدة
    const newPaidAmount = debt.paid_amount + paymentAmount;
    const newRemainingAmount = debt.total_amount - newPaidAmount;

    let newStatus: 'pending' | 'partial' | 'paid' = 'pending';
    if (newRemainingAmount <= 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    // تحديث الحالة
    await deltaWriteService.update('customer_debts', debtId, {
      remaining_amount: Math.max(0, newRemainingAmount),
      status: newStatus,
      updated_at: new Date().toISOString()
    });

    console.log(`[LocalDebt] ⚡ Recorded payment of ${paymentAmount} for debt ${debtId} via Delta`);

    return {
      ...debt,
      paid_amount: newPaidAmount,
      remaining_amount: Math.max(0, newRemainingAmount),
      status: newStatus
    };
  } catch (error) {
    console.error(`[LocalDebt] Record payment error:`, error);
    return null;
  }
};

// مسح الديون المتزامنة والمحذوفة
export const cleanupSyncedDebts = async (): Promise<number> => {
  // يتم التعامل مع هذا تلقائياً عبر Delta Sync
  console.log('[LocalDebt] Cleanup handled by Delta Sync automatically');
  return 0;
};

// =====================
// Legacy compatibility
// =====================

// تحديث حالة المزامنة (للتوافقية)
export const markDebtAsSynced = async (
  debtId: string,
  remoteData?: Partial<LocalCustomerDebt>
): Promise<LocalCustomerDebt | null> => {
  try {
    const debt = await deltaWriteService.get<LocalCustomerDebt>('customer_debts', debtId);
    if (!debt) return null;

    const updatedData = {
      ...remoteData,
      synced: true,
      syncStatus: undefined,
      pendingOperation: undefined
    };

    await deltaWriteService.update('customer_debts', debtId, updatedData);

    return {
      ...debt,
      ...updatedData
    } as LocalCustomerDebt;
  } catch (error) {
    console.error(`[LocalDebt] Mark synced error:`, error);
    return null;
  }
};
