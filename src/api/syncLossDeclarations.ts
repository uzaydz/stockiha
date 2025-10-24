import { supabase } from '@/lib/supabase';
import {
  getUnsyncedLossDeclarations,
  updateLossDeclarationSyncStatus,
  cleanupSyncedLossDeclarations,
  type LocalLossDeclaration
} from './localLossDeclarationService';
import { inventoryDB } from '@/database/localDb';

/**
 * خدمة مزامنة التصريح بالخسائر
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

// مزامنة تصريح خسارة واحد
const syncSingleLoss = async (loss: LocalLossDeclaration): Promise<boolean> => {
  try {
    await updateLossDeclarationSyncStatus(loss.id, false, 'syncing');

    if (loss.pendingOperation === 'create') {
      // جلب عناصر الخسارة
      const items = await inventoryDB.lossItems
        .where('loss_id')
        .equals(loss.id)
        .toArray();

      // إنشاء تصريح جديد في السيرفر
      const { data: lossData, error: lossError } = await supabase
        .from('losses')
        .insert({
          loss_number: loss.loss_number,
          loss_type: loss.loss_type,
          loss_category: loss.loss_category,
          loss_description: loss.loss_description,
          incident_date: loss.incident_date,
          reported_by: loss.reported_by,
          status: loss.status,
          approved_by: loss.approved_by,
          approved_at: loss.approved_at,
          total_cost_value: loss.total_cost_value,
          total_selling_value: loss.total_selling_value,
          total_items_count: loss.total_items_count,
          notes: loss.notes,
          organization_id: loss.organization_id
        })
        .select()
        .single();

      if (lossError) throw lossError;

      // إضافة عناصر الخسارة
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          loss_id: lossData.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          lost_quantity: item.lost_quantity,
          unit_cost_price: item.unit_cost_price,
          unit_selling_price: item.unit_selling_price,
          total_cost_value: item.total_cost_value,
          total_selling_value: item.total_selling_value,
          loss_condition: item.loss_condition,
          inventory_adjusted: item.inventory_adjusted,
          color_id: item.color_id,
          color_name: item.color_name,
          size_id: item.size_id,
          size_name: item.size_name
        }));

        const { error: itemsError } = await supabase
          .from('loss_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await updateLossDeclarationSyncStatus(loss.id, true);
      return true;

    } else if (loss.pendingOperation === 'update') {
      // تحديث تصريح في السيرفر
      const { error } = await supabase
        .from('losses')
        .update({
          status: loss.status,
          approved_by: loss.approved_by,
          approved_at: loss.approved_at,
          notes: loss.notes
        })
        .eq('loss_number', loss.loss_number);

      if (error) throw error;

      // تحديث حالة تعديل المخزون للعناصر
      const items = await inventoryDB.lossItems
        .where('loss_id')
        .equals(loss.id)
        .toArray();

      for (const item of items) {
        if (item.inventory_adjusted) {
          await supabase
            .from('loss_items')
            .update({ inventory_adjusted: true })
            .eq('loss_id', loss.id)
            .eq('product_id', item.product_id);
        }
      }

      await updateLossDeclarationSyncStatus(loss.id, true);
      return true;

    } else if (loss.pendingOperation === 'delete') {
      // حذف تصريح من السيرفر
      const { error } = await supabase
        .from('losses')
        .delete()
        .eq('loss_number', loss.loss_number);

      if (error) throw error;

      await updateLossDeclarationSyncStatus(loss.id, true);
      return true;
    }

    return false;
  } catch (error) {
    console.error('فشل مزامنة التصريح:', loss.loss_number, error);
    await updateLossDeclarationSyncStatus(loss.id, false, 'error');
    
    // Server Win: في حالة الفشل، نجلب البيانات من السيرفر
    try {
      const { data: serverLoss } = await supabase
        .from('losses')
        .select('*')
        .eq('loss_number', loss.loss_number)
        .single();

      if (serverLoss) {
        // تحديث البيانات المحلية بنسخة السيرفر
        await inventoryDB.lossDeclarations.update(loss.id, {
          status: serverLoss.status,
          approved_by: serverLoss.approved_by,
          approved_at: serverLoss.approved_at,
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

// مزامنة جميع التصاريح المعلقة
export const syncPendingLossDeclarations = async (): Promise<{ success: number; failed: number }> => {
  try {
    const unsyncedLosses = await getUnsyncedLossDeclarations();

    if (unsyncedLosses.length === 0) {
      return { success: 0, failed: 0 };
    }

    console.log(`🔄 مزامنة ${unsyncedLosses.length} تصريح خسارة...`);

    // استخدام Pool للتحكم بالتوازي
    const results = await runWithPool(
      unsyncedLosses,
      async (loss) => await syncSingleLoss(loss),
      SYNC_POOL_SIZE
    );

    const success = results.filter(r => r === true).length;
    const failed = results.filter(r => r === false).length;

    console.log(`✅ تمت مزامنة ${success} تصريح، فشل ${failed}`);

    // تنظيف التصاريح المتزامنة والمحذوفة
    await cleanupSyncedLossDeclarations();

    return { success, failed };
  } catch (error) {
    console.error('خطأ في مزامنة التصاريح:', error);
    return { success: 0, failed: 0 };
  }
};

// جلب التصاريح من السيرفر وحفظها محلياً
export const fetchLossDeclarationsFromServer = async (organizationId: string): Promise<number> => {
  try {
    const { data: losses, error } = await supabase
      .from('losses')
      .select('*, loss_items(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    let savedCount = 0;

    for (const lossData of losses || []) {
      const localLoss: LocalLossDeclaration = {
        id: lossData.id,
        loss_number: lossData.loss_number,
        loss_type: lossData.loss_type,
        loss_category: lossData.loss_category,
        loss_description: lossData.loss_description,
        incident_date: lossData.incident_date,
        reported_by: lossData.reported_by,
        status: lossData.status,
        approved_by: lossData.approved_by,
        approved_at: lossData.approved_at,
        total_cost_value: lossData.total_cost_value,
        total_selling_value: lossData.total_selling_value,
        total_items_count: lossData.total_items_count,
        notes: lossData.notes,
        organization_id: organizationId,
        created_at: lossData.created_at,
        updated_at: lossData.updated_at || lossData.created_at,
        synced: true,
        syncStatus: undefined,
        pendingOperation: undefined
      };

      await inventoryDB.lossDeclarations.put(localLoss);

      // حفظ عناصر الخسارة
      if (lossData.loss_items && Array.isArray(lossData.loss_items)) {
        for (const item of lossData.loss_items) {
          await inventoryDB.lossItems.put({
            id: item.id,
            loss_id: lossData.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            lost_quantity: item.lost_quantity,
            unit_cost_price: item.unit_cost_price,
            unit_selling_price: item.unit_selling_price,
            total_cost_value: item.total_cost_value,
            total_selling_value: item.total_selling_value,
            loss_condition: item.loss_condition,
            inventory_adjusted: item.inventory_adjusted,
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

    console.log(`✅ تم جلب ${savedCount} تصريح من السيرفر`);
    return savedCount;
  } catch (error) {
    console.error('خطأ في جلب التصاريح من السيرفر:', error);
    return 0;
  }
};
