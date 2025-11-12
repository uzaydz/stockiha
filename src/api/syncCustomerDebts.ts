import { supabase } from '@/lib/supabase';
import {
  getUnsyncedCustomerDebts,
  updateCustomerDebtSyncStatus,
  cleanupSyncedDebts,
  type LocalCustomerDebt
} from './localCustomerDebtService';
import { inventoryDB } from '@/database/localDb';
import { isSQLiteAvailable, sqliteDB } from '@/lib/db/sqliteAPI';

/**
 * خدمة مزامنة ديون العملاء
 * تطبق نمط Server Win لفض النزاعات
 */

const SYNC_POOL_SIZE = Number((import.meta as any)?.env?.VITE_SYNC_POOL_SIZE ?? 2);

// دالة مساعدة لتنفيذ مهام متوازية مع حد أقصى
async function runWithPool<T, R>(
  items: T[],
  handler: (item: T) => Promise<R>,
  poolSize: number = SYNC_POOL_SIZE
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = handler(item).then(result => {
      results.push(result);
    });
    executing.push(promise);

    if (executing.length >= poolSize) {
      await Promise.race(executing);
      const index = executing.findIndex(p => p === promise);
      if (index !== -1) executing.splice(index, 1);
    }
  }

  await Promise.all(executing);
  return results;
}

// مزامنة دين واحد
const syncSingleDebt = async (debt: LocalCustomerDebt): Promise<boolean> => {
  try {
    await updateCustomerDebtSyncStatus(debt.id, false, 'syncing');

    if (debt.pendingOperation === 'create') {
      // إنشاء دين جديد في السيرفر
      const { data, error } = await supabase
        .from('orders')
        .update({
          remaining_amount: debt.remaining_amount,
          payment_status: debt.status === 'paid' ? 'paid' : debt.status === 'partial' ? 'partial' : 'pending'
        })
        .eq('id', debt.order_id)
        .select()
        .single();

      if (error) throw error;

      // تحديث الحالة المحلية
      await updateCustomerDebtSyncStatus(debt.id, true);
      return true;

    } else if (debt.pendingOperation === 'update') {
      // تحديث دين في السيرفر
      const { error } = await supabase
        .from('orders')
        .update({
          remaining_amount: debt.remaining_amount,
          payment_status: debt.status === 'paid' ? 'paid' : debt.status === 'partial' ? 'partial' : 'pending'
        })
        .eq('id', debt.order_id);

      if (error) throw error;

      await updateCustomerDebtSyncStatus(debt.id, true);
      return true;

    } else if (debt.pendingOperation === 'delete') {
      // حذف دين من السيرفر (تحديث حالة الطلب)
      const { error } = await supabase
        .from('orders')
        .update({
          remaining_amount: 0,
          payment_status: 'paid'
        })
        .eq('id', debt.order_id);

      if (error) throw error;

      await updateCustomerDebtSyncStatus(debt.id, true);
      return true;
    }

    return false;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ [syncSingleDebt] فشل مزامنة الدين:`, {
      debtId: debt.id,
      orderId: debt.order_id,
      operation: debt.pendingOperation,
      error: errorMsg,
      fullError: error
    });
    await updateCustomerDebtSyncStatus(debt.id, false, 'error');
    
    // Server Win: في حالة الفشل، نجلب البيانات من السيرفر
    try {
      const { data: serverDebt } = await supabase
        .from('orders')
        .select('*')
        .eq('id', debt.order_id)
        .single();

      if (serverDebt) {
        // تحديث البيانات المحلية بنسخة السيرفر
        await inventoryDB.customerDebts.update(debt.id, {
          remaining_amount: serverDebt.remaining_amount || 0,
          paid_amount: (serverDebt.total || 0) - (serverDebt.remaining_amount || 0),
          status: serverDebt.payment_status === 'paid' ? 'paid' : serverDebt.payment_status === 'partial' ? 'partial' : 'pending',
          synced: true,
          syncStatus: undefined,
          pendingOperation: undefined
        });
      }
    } catch (serverError) {
      console.error('فشل جلب البيانات من السيرفر:', serverError);
    }

    return false;
  }
};

// مزامنة جميع الديون المعلقة
export const syncPendingCustomerDebts = async (): Promise<{ success: number; failed: number }> => {
  try {
    const unsyncedDebts = await getUnsyncedCustomerDebts();

    if (unsyncedDebts.length === 0) {
      return { success: 0, failed: 0 };
    }

    console.log(`🔄 مزامنة ${unsyncedDebts.length} دين...`);

    // استخدام Pool للتحكم بالتوازي
    const results = await runWithPool(
      unsyncedDebts,
      async (debt) => await syncSingleDebt(debt),
      SYNC_POOL_SIZE
    );

    const success = results.filter(r => r === true).length;
    const failed = results.filter(r => r === false).length;

    if (failed > 0) {
      console.warn(`⚠️ [syncPendingCustomerDebts] تمت مزامنة ${success} دين، فشل ${failed}`);
    } else {
      console.log(`✅ [syncPendingCustomerDebts] تمت مزامنة ${success} دين بنجاح`);
    }

    // تنظيف الديون المتزامنة والمحذوفة
    await cleanupSyncedDebts();

    return { success, failed };
  } catch (error) {
    console.error('خطأ في مزامنة الديون:', error);
    return { success: 0, failed: 0 };
  }
};

// جلب الديون من السيرفر وحفظها محلياً
export const fetchCustomerDebtsFromServer = async (organizationId: string): Promise<number> => {
  try {
    console.log('[fetchCustomerDebtsFromServer] 📥 Fetching debts from server...', { organizationId });
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, customers(name)')
      .eq('organization_id', organizationId)
      .gt('remaining_amount', 0)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log('[fetchCustomerDebtsFromServer] 📊 Server returned:', { count: orders?.length || 0 });

    let savedCount = 0;

    for (const order of orders || []) {
      const debtData: LocalCustomerDebt = {
        id: `debt_${order.id}`,
        customer_id: order.customer_id || '',
        customer_name: (order.customers as any)?.name || 'غير معروف',
        order_id: order.id,
        order_number: order.id.slice(0, 8),
        subtotal: (order as any).subtotal || order.total || 0, // المبلغ قبل الخصم
        discount: (order as any).discount || 0, // التخفيض
        total_amount: order.total || 0, // المبلغ النهائي (بعد الخصم)
        paid_amount: (order.total || 0) - (order.remaining_amount || 0),
        remaining_amount: order.remaining_amount || 0,
        status: order.payment_status === 'paid' ? 'paid' : order.payment_status === 'partial' ? 'partial' : 'pending',
        due_date: null,
        notes: (order as any).notes || null,
        organization_id: organizationId,
        created_at: order.created_at,
        updated_at: order.updated_at || order.created_at,
        synced: true,
        syncStatus: undefined,
        pendingOperation: undefined
      };

      console.log('[fetchCustomerDebtsFromServer] 📝 Processing debt:', {
        id: debtData.id,
        customer_name: debtData.customer_name,
        remaining_amount: debtData.remaining_amount,
        order_id: debtData.order_id
      });

      if (isSQLiteAvailable()) {
        // 1. التأكد من وجود العميل أولاً (FOREIGN KEY requirement)
        if (debtData.customer_id) {
          const now = new Date().toISOString();
          const customerResult = await sqliteDB.upsert('customers', {
            id: debtData.customer_id,
            name: debtData.customer_name || 'عميل',
            name_lower: (debtData.customer_name || 'عميل').toLowerCase(),
            organization_id: organizationId,
            created_at: order.created_at,
            updated_at: order.updated_at || order.created_at,
            local_updated_at: now, // Required field!
            synced: 1
          });
          
          console.log('[fetchCustomerDebtsFromServer] 👤 Customer upsert:', 
            `ID: ${debtData.customer_id.slice(0, 15)}...`,
            `Name: ${debtData.customer_name}`,
            `Success: ${customerResult.success}`,
            customerResult.error ? `Error: ${customerResult.error}` : '✓'
          );
        }
        
        // 2. الآن نضيف الدين بأمان
        const result = await sqliteDB.upsert('customer_debts', {
          ...debtData,
          amount: debtData.remaining_amount, // Required by schema (legacy field)
          synced: 1 // SQLite uses 0/1 for boolean
        });
        
        console.log('[fetchCustomerDebtsFromServer] 💾 Debt upsert:', 
          `ID: ${debtData.id.slice(0, 20)}...`,
          `Success: ${result.success}`,
          result.error ? `Error: ${result.error}` : '✓'
        );
        
        if (result.success) savedCount++;
      } else {
        await inventoryDB.customerDebts.put(debtData);
        savedCount++;
      }
    }

    console.log(`✅ [fetchCustomerDebtsFromServer] تم جلب وحفظ ${savedCount} دين من السيرفر`);
    return savedCount;
  } catch (error) {
    console.error('❌ [fetchCustomerDebtsFromServer] خطأ في جلب الديون من السيرفر:', error);
    return 0;
  }
};
