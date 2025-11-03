import { supabase } from '@/lib/supabase';
import {
  getUnsyncedProductReturns,
  updateProductReturnSyncStatus,
  cleanupSyncedReturns,
  type LocalProductReturn
} from './localProductReturnService';
import { inventoryDB } from '@/database/localDb';

/**
 * خدمة مزامنة إرجاع المنتجات
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

// مزامنة إرجاع واحد
const syncSingleReturn = async (productReturn: LocalProductReturn): Promise<boolean> => {
  try {
    await updateProductReturnSyncStatus(productReturn.id, false, 'syncing');

    if (productReturn.pendingOperation === 'create') {
      // جلب عناصر الإرجاع
      const items = await inventoryDB.returnItems
        .where('return_id')
        .equals(productReturn.id)
        .toArray();

      // إنشاء إرجاع جديد في السيرفر
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .insert({
          return_number: productReturn.return_number,
          original_order_id: productReturn.original_order_id,
          original_order_number: productReturn.original_order_number,
          customer_id: productReturn.customer_id,
          customer_name: productReturn.customer_name,
          customer_phone: productReturn.customer_phone,
          return_type: productReturn.return_type,
          return_reason: productReturn.return_reason,
          return_reason_description: productReturn.return_reason_description,
          original_total: productReturn.original_total,
          return_amount: productReturn.return_amount,
          refund_amount: productReturn.refund_amount,
          restocking_fee: productReturn.restocking_fee,
          status: productReturn.status,
          approved_by: productReturn.approved_by,
          approved_at: productReturn.approved_at,
          refund_method: productReturn.refund_method,
          notes: productReturn.notes,
          organization_id: productReturn.organization_id
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // حفظ معرف السيرفر محلياً لتسهيل التتبع لاحقاً
      try {
        await inventoryDB.productReturns.update(productReturn.id, {
          remote_return_id: returnData.id
        });
      } catch {}

      // إضافة عناصر الإرجاع
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          return_id: returnData.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          return_quantity: item.return_quantity,
          return_unit_price: item.return_unit_price,
          total_return_amount: item.total_return_amount,
          condition_status: item.condition_status,
          resellable: item.resellable,
          inventory_returned: item.inventory_returned,
          color_id: item.color_id,
          color_name: item.color_name,
          size_id: item.size_id,
          size_name: item.size_name
        }));

        const { error: itemsError } = await supabase
          .from('return_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await updateProductReturnSyncStatus(productReturn.id, true);
      return true;

    } else if (productReturn.pendingOperation === 'update') {
      // تحديث إرجاع في السيرفر
      const { error } = await supabase
        .from('returns')
        .update({
          status: productReturn.status,
          approved_by: productReturn.approved_by,
          approved_at: productReturn.approved_at,
          refund_amount: productReturn.refund_amount,
          notes: productReturn.notes
        })
        .eq('return_number', productReturn.return_number);

      if (error) throw error;

      await updateProductReturnSyncStatus(productReturn.id, true);
      return true;

    } else if (productReturn.pendingOperation === 'delete') {
      // حذف إرجاع من السيرفر
      const { error } = await supabase
        .from('returns')
        .delete()
        .eq('return_number', productReturn.return_number);

      if (error) throw error;

      await updateProductReturnSyncStatus(productReturn.id, true);
      return true;
    }

    return false;
  } catch (error) {
    console.error('فشل مزامنة الإرجاع:', productReturn.return_number, error);
    await updateProductReturnSyncStatus(productReturn.id, false, 'error');
    
    // Server Win: في حالة الفشل، نجلب البيانات من السيرفر
    try {
      const { data: serverReturn } = await supabase
        .from('returns')
        .select('*')
        .eq('return_number', productReturn.return_number)
        .single();

      if (serverReturn) {
        // تحديث البيانات المحلية بنسخة السيرفر
        await inventoryDB.productReturns.update(productReturn.id, {
          status: serverReturn.status,
          approved_by: serverReturn.approved_by,
          approved_at: serverReturn.approved_at,
          refund_amount: serverReturn.refund_amount,
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

// مزامنة جميع الإرجاعات المعلقة
export const syncPendingProductReturns = async (): Promise<{ success: number; failed: number }> => {
  try {
    const unsyncedReturns = await getUnsyncedProductReturns();

    if (unsyncedReturns.length === 0) {
      return { success: 0, failed: 0 };
    }

    console.log(`🔄 مزامنة ${unsyncedReturns.length} إرجاع...`);

    // استخدام Pool للتحكم بالتوازي
    const results = await runWithPool(
      unsyncedReturns,
      async (productReturn) => await syncSingleReturn(productReturn),
      SYNC_POOL_SIZE
    );

    const success = results.filter(r => r === true).length;
    const failed = results.filter(r => r === false).length;

    console.log(`✅ تمت مزامنة ${success} إرجاع، فشل ${failed}`);

    // تنظيف الإرجاعات المتزامنة والمحذوفة
    await cleanupSyncedReturns();

    return { success, failed };
  } catch (error) {
    console.error('خطأ في مزامنة الإرجاعات:', error);
    return { success: 0, failed: 0 };
  }
};

// جلب الإرجاعات من السيرفر وحفظها محلياً
export const fetchProductReturnsFromServer = async (organizationId: string): Promise<number> => {
  try {
    const { data: returns, error } = await supabase
      .from('returns')
      .select('*, return_items(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    let savedCount = 0;

    for (const returnData of returns || []) {
      const localReturn: LocalProductReturn = {
        id: returnData.id,
        return_number: returnData.return_number,
        remote_return_id: returnData.id,
        original_order_id: returnData.original_order_id,
        original_order_number: returnData.original_order_number,
        customer_id: returnData.customer_id,
        customer_name: returnData.customer_name,
        customer_phone: returnData.customer_phone,
        return_type: returnData.return_type,
        return_reason: returnData.return_reason,
        return_reason_description: returnData.return_reason_description,
        original_total: returnData.original_total,
        return_amount: returnData.return_amount,
        refund_amount: returnData.refund_amount,
        restocking_fee: returnData.restocking_fee,
        status: returnData.status,
        approved_by: returnData.approved_by,
        approved_at: returnData.approved_at,
        refund_method: returnData.refund_method,
        notes: returnData.notes,
        organization_id: organizationId,
        created_at: returnData.created_at,
        updated_at: returnData.updated_at || returnData.created_at,
        synced: true,
        syncStatus: undefined,
        pendingOperation: undefined
      };

      await inventoryDB.productReturns.put(localReturn);

      // حفظ عناصر الإرجاع
      if (returnData.return_items && Array.isArray(returnData.return_items)) {
        for (const item of returnData.return_items) {
          await inventoryDB.returnItems.put({
            id: item.id,
            return_id: returnData.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            return_quantity: item.return_quantity,
            return_unit_price: item.return_unit_price,
            total_return_amount: item.total_return_amount,
            condition_status: item.condition_status,
            resellable: item.resellable,
            inventory_returned: item.inventory_returned,
            color_id: item.color_id,
            color_name: item.color_name,
            size_id: item.size_id,
            size_name: item.size_name,
            created_at: item.created_at,
            synced: true
          });
        }
      }

      savedCount++;
    }

    console.log(`✅ تم جلب ${savedCount} إرجاع من السيرفر`);
    return savedCount;
  } catch (error) {
    console.error('خطأ في جلب الإرجاعات من السيرفر:', error);
    return 0;
  }
};
