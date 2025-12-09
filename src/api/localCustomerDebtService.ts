/**
 * localCustomerDebtService - خدمة ديون العملاء المحلية
 *
 * ⚡ v2.0: تم إعادة الكتابة لاستخدام جدول orders بدلاً من customer_debts
 *
 * ⚠️ ملاحظة مهمة:
 * - في Supabase، الديون يتم حسابها من جدول orders عبر RPC: get_customer_debts
 * - الدين = طلب فيه remaining_amount > 0
 * - لا يوجد جدول customer_debts منفصل في Supabase
 *
 * - Local-First: القراءة من SQLite المحلي
 * - Offline-First: يعمل بدون إنترنت
 * - PowerSync: المزامنة التلقائية مع Supabase
 */

import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// ========================================
// نوع الدين - محسوب من جدول orders
// ========================================
export interface LocalCustomerDebt {
  id: string;                    // order_id
  organization_id: string;
  customer_id: string | null;
  customer_name?: string;
  order_number?: number;
  total: number;                 // إجمالي الطلب
  total_amount: number;          // alias for total
  amount_paid: number;           // المبلغ المدفوع
  paid_amount: number;           // alias for amount_paid
  remaining_amount: number;      // المبلغ المتبقي
  amount: number;                // alias for remaining_amount
  status: string;                // حالة الطلب
  payment_status: string;        // حالة الدفع
  employee_id?: string;
  employee_name?: string;
  created_at: string;
  updated_at?: string;
}

// ========================================
// جلب جميع الديون حسب المؤسسة
// الديون = طلبات فيها remaining_amount > 0
// ========================================
export const getAllLocalCustomerDebts = async (organizationId: string): Promise<LocalCustomerDebt[]> => {
  console.log('[getAllLocalCustomerDebts] 🔍 Fetching from orders table', { organizationId });

  if (!powerSyncService.db) {
    console.warn('[localCustomerDebtService] PowerSync DB not initialized');
    return [];
  }

  try {
    // الديون = طلبات فيها remaining_amount > 0
    const orders = await powerSyncService.query<any>({
      sql: `SELECT
        o.id,
        o.organization_id,
        o.customer_id,
        c.name as customer_name,
        o.customer_order_number as order_number,
        o.total,
        o.total as total_amount,
        COALESCE(o.amount_paid, 0) as amount_paid,
        COALESCE(o.amount_paid, 0) as paid_amount,
        COALESCE(o.remaining_amount, o.total) as remaining_amount,
        COALESCE(o.remaining_amount, o.total) as amount,
        o.status,
        o.payment_status,
        o.employee_id,
        o.created_by_staff_name as employee_name,
        o.created_at,
        o.updated_at
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.organization_id = ?
       AND COALESCE(o.remaining_amount, o.total) > 0
       AND o.status != 'cancelled'
       ORDER BY o.created_at DESC`,
      params: [organizationId]
    });

    console.log('[getAllLocalCustomerDebts] ✅ Found debts from orders:', {
      count: orders.length,
      sample: orders[0] ? {
        id: orders[0].id,
        customer_name: orders[0].customer_name,
        remaining_amount: orders[0].remaining_amount
      } : null
    });

    return orders;
  } catch (error) {
    console.error('[getAllLocalCustomerDebts] Error:', error);
    return [];
  }
};

// ========================================
// جلب جميع ديون عميل معين
// ========================================
export const getLocalCustomerDebts = async (customerId: string): Promise<LocalCustomerDebt[]> => {
  const orgId = localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') || '';

  if (!powerSyncService.db) {
    console.warn('[localCustomerDebtService] PowerSync DB not initialized');
    return [];
  }

  try {
    const orders = await powerSyncService.query<any>({
      sql: `SELECT
        o.id,
        o.organization_id,
        o.customer_id,
        c.name as customer_name,
        o.customer_order_number as order_number,
        o.total,
        o.total as total_amount,
        COALESCE(o.amount_paid, 0) as amount_paid,
        COALESCE(o.amount_paid, 0) as paid_amount,
        COALESCE(o.remaining_amount, o.total) as remaining_amount,
        COALESCE(o.remaining_amount, o.total) as amount,
        o.status,
        o.payment_status,
        o.employee_id,
        o.created_by_staff_name as employee_name,
        o.created_at,
        o.updated_at
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.organization_id = ?
       AND o.customer_id = ?
       AND COALESCE(o.remaining_amount, o.total) > 0
       AND o.status != 'cancelled'
       ORDER BY o.created_at DESC`,
      params: [orgId, customerId]
    });

    return orders;
  } catch (error) {
    console.error('[getLocalCustomerDebts] Error:', error);
    return [];
  }
};

// ========================================
// جلب دين واحد (طلب)
// ========================================
export const getLocalCustomerDebt = async (orderId: string): Promise<LocalCustomerDebt | null> => {
  if (!powerSyncService.db) {
    console.warn('[localCustomerDebtService] PowerSync DB not initialized');
    return null;
  }

  try {
    const order = await powerSyncService.get<any>(
      `SELECT
        o.id,
        o.organization_id,
        o.customer_id,
        c.name as customer_name,
        o.customer_order_number as order_number,
        o.total,
        o.total as total_amount,
        COALESCE(o.amount_paid, 0) as amount_paid,
        COALESCE(o.amount_paid, 0) as paid_amount,
        COALESCE(o.remaining_amount, o.total) as remaining_amount,
        COALESCE(o.remaining_amount, o.total) as amount,
        o.status,
        o.payment_status,
        o.employee_id,
        o.created_by_staff_name as employee_name,
        o.created_at,
        o.updated_at
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [orderId]
    );

    return order;
  } catch (error) {
    console.error('[getLocalCustomerDebt] Error:', error);
    return null;
  }
};

// ========================================
// تسجيل دفعة على دين (تحديث الطلب)
// ========================================
export const recordDebtPayment = async (
  orderId: string,
  paymentAmount: number
): Promise<LocalCustomerDebt | null> => {
  try {
    // جلب الطلب الحالي
    const order = await powerSyncService.get<any>(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );
    if (!order) {
      console.error('[recordDebtPayment] Order not found:', orderId);
      return null;
    }

    // حساب القيم الجديدة
    const currentPaid = order.amount_paid || 0;
    const newPaidAmount = currentPaid + paymentAmount;
    const newRemainingAmount = order.total - newPaidAmount;

    // تحديد حالة الدفع
    let newPaymentStatus = 'pending';
    if (newRemainingAmount <= 0) {
      newPaymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'partial';
    }

    // تحديث الطلب
    const now = new Date().toISOString();
    await powerSyncService.transaction(async (tx) => {
      await tx.execute(
        `UPDATE orders
         SET amount_paid = ?,
             remaining_amount = ?,
             payment_status = ?,
             updated_at = ?
         WHERE id = ?`,
        [newPaidAmount, Math.max(0, newRemainingAmount), newPaymentStatus, now, orderId]
      );
    });

    console.log(`[recordDebtPayment] ⚡ Recorded payment of ${paymentAmount} for order ${orderId}`);

    // إرجاع الدين المحدث
    return await getLocalCustomerDebt(orderId);
  } catch (error) {
    console.error('[recordDebtPayment] Error:', error);
    return null;
  }
};

// ========================================
// دوال للتوافق العكسي (Legacy compatibility)
// ========================================

// إنشاء دين جديد - غير مدعوم (الديون تُنشأ من الطلبات)
export const createLocalCustomerDebt = async (
  _debtData: any
): Promise<LocalCustomerDebt | null> => {
  console.warn('[createLocalCustomerDebt] ⚠️ Creating debts directly is not supported.');
  console.warn('[createLocalCustomerDebt] ⚠️ Debts are calculated from orders with remaining_amount > 0');
  return null;
};

// تحديث دين - يعني تحديث الطلب
export const updateLocalCustomerDebt = async (
  orderId: string,
  updates: Partial<{ amount_paid: number; remaining_amount: number; payment_status: string }>
): Promise<LocalCustomerDebt | null> => {
  try {
    const now = new Date().toISOString();
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.amount_paid !== undefined) {
      updateFields.push('amount_paid = ?');
      values.push(updates.amount_paid);
    }
    if (updates.remaining_amount !== undefined) {
      updateFields.push('remaining_amount = ?');
      values.push(updates.remaining_amount);
    }
    if (updates.payment_status !== undefined) {
      updateFields.push('payment_status = ?');
      values.push(updates.payment_status);
    }

    if (updateFields.length === 0) {
      return await getLocalCustomerDebt(orderId);
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(orderId);

    await powerSyncService.transaction(async (tx) => {
      await tx.execute(
        `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    });

    console.log(`[updateLocalCustomerDebt] ⚡ Updated order ${orderId}`);
    return await getLocalCustomerDebt(orderId);
  } catch (error) {
    console.error('[updateLocalCustomerDebt] Error:', error);
    return null;
  }
};

// حذف دين - غير مدعوم (الديون محسوبة من الطلبات)
export const deleteLocalCustomerDebt = async (_orderId: string): Promise<boolean> => {
  console.warn('[deleteLocalCustomerDebt] ⚠️ Deleting debts directly is not supported.');
  console.warn('[deleteLocalCustomerDebt] ⚠️ To clear a debt, update the order payment status.');
  return false;
};

// جلب الديون غير المتزامنة - PowerSync يدير المزامنة تلقائياً
export const getUnsyncedCustomerDebts = async (): Promise<LocalCustomerDebt[]> => {
  // PowerSync يدير المزامنة تلقائياً
  console.log('[getUnsyncedCustomerDebts] ⚠️ PowerSync manages sync automatically');
  return [];
};

// تحديث حالة المزامنة - PowerSync يدير المزامنة تلقائياً
export const updateCustomerDebtSyncStatus = async (
  _orderId: string,
  _synced: boolean,
  _syncStatus?: string
): Promise<void> => {
  console.log('[updateCustomerDebtSyncStatus] ⚠️ PowerSync manages sync automatically');
};

// تنظيف الديون - PowerSync يدير هذا تلقائياً
export const cleanupSyncedDebts = async (): Promise<number> => {
  console.log('[cleanupSyncedDebts] ⚠️ Cleanup handled by PowerSync automatically');
  return 0;
};

// تحديث حالة المزامنة (للتوافقية)
export const markDebtAsSynced = async (
  orderId: string,
  _remoteData?: Partial<LocalCustomerDebt>
): Promise<LocalCustomerDebt | null> => {
  console.log('[markDebtAsSynced] ⚠️ PowerSync manages sync automatically');
  return await getLocalCustomerDebt(orderId);
};
