/**
 * localProductReturnService - خدمة إرجاع المنتجات المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - DELTA operations: لتحديث المخزون عند الإرجاع
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalProductReturn, LocalReturnItem } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';

// Re-export types للاستخدام في المكونات الأخرى
export type { LocalProductReturn, LocalReturnItem } from '@/database/localDb';

// تصدير الأنواع المساعدة
export interface CreateReturnData {
  returnData: Omit<LocalProductReturn, 'id' | 'created_at' | 'updated_at' | 'synced' | 'syncStatus' | 'pendingOperation'>;
  items: Array<Omit<LocalReturnItem, 'id' | 'return_id' | 'created_at' | 'synced'>>;
}

// إنشاء إرجاع جديد محلياً
export const createLocalProductReturn = async (
  data: CreateReturnData
): Promise<{ return: LocalProductReturn; items: LocalReturnItem[] }> => {
  const now = new Date().toISOString();
  const returnId = uuidv4();

  const returnRecord: LocalProductReturn = {
    ...data.returnData,
    id: returnId,
    return_number_lower: data.returnData.return_number?.toLowerCase(),
    customer_name_lower: data.returnData.customer_name?.toLowerCase(),
    created_at: now,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'create'
  };

  const itemRecords: LocalReturnItem[] = data.items.map(item => ({
    ...item,
    id: uuidv4(),
    return_id: returnId,
    created_at: now,
    synced: false,
    inventory_returned: item.resellable ? item.inventory_returned : false
  }));

  // ⚡ استخدام Delta Sync مع تحديث المخزون
  const result = await deltaWriteService.createReturnWithInventoryUpdate(
    data.returnData.organization_id,
    returnRecord,
    itemRecords
  );

  if (!result.success) {
    throw new Error(`Failed to create product return: ${result.error}`);
  }

  console.log(`[LocalReturn] ⚡ Created return ${returnId} with ${itemRecords.length} items via Delta Sync`);
  return { return: returnRecord, items: itemRecords };
};

// Alias للتوافق مع الاستيراد
export const createLocalReturn = createLocalProductReturn;

// تحديث إرجاع محلياً
export const updateLocalProductReturn = async (
  returnId: string,
  updates: Partial<Omit<LocalProductReturn, 'id' | 'created_at' | 'organization_id' | 'return_number'>>
): Promise<LocalProductReturn | null> => {
  try {
    const existing = await deltaWriteService.get<LocalProductReturn>('product_returns', returnId);
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
    const result = await deltaWriteService.update('product_returns', returnId, updatedData);

    if (!result.success) {
      console.error(`[LocalReturn] Failed to update return ${returnId}:`, result.error);
      return null;
    }

    console.log(`[LocalReturn] ⚡ Updated return ${returnId} via Delta Sync`);
    return {
      ...existing,
      ...updatedData
    } as LocalProductReturn;
  } catch (error) {
    console.error(`[LocalReturn] Update error:`, error);
    return null;
  }
};

// الموافقة على إرجاع
export const approveLocalProductReturn = async (
  returnId: string,
  approvedBy: string
): Promise<LocalProductReturn | null> => {
  try {
    const productReturn = await deltaWriteService.get<LocalProductReturn>('product_returns', returnId);
    if (!productReturn) return null;

    const items = await deltaWriteService.getAll<LocalReturnItem>('return_items', productReturn.organization_id, {
      where: 'return_id = ?',
      params: [returnId]
    });

    // تحديث المخزون للعناصر القابلة لإعادة البيع التي لم يتم إرجاعها للمخزون بعد
    for (const item of items) {
      if (item.resellable && !item.inventory_returned) {
        // ⚡ استخدام DELTA operation لزيادة المخزون
        await deltaWriteService.updateProductStock(
          item.product_id,
          Math.abs(item.return_quantity), // موجب للزيادة
          { colorId: item.color_id || undefined, sizeId: item.size_id || undefined }
        );

        // تحديث حالة العنصر
        await deltaWriteService.update('return_items', item.id, {
          inventory_returned: true
        });
      }
    }

    return await updateLocalProductReturn(returnId, {
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[LocalReturn] Approve error:`, error);
    return null;
  }
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
  const productReturn = await deltaWriteService.get<LocalProductReturn>('product_returns', returnId);
  if (!productReturn) return null;

  const items = await deltaWriteService.getAll<LocalReturnItem>('return_items', productReturn.organization_id, {
    where: 'return_id = ?',
    params: [returnId]
  });

  return { return: productReturn, items };
};

// جلب جميع الإرجاعات حسب المؤسسة
export const getAllLocalProductReturns = async (organizationId: string): Promise<LocalProductReturn[]> => {
  return deltaWriteService.getAll<LocalProductReturn>('product_returns', organizationId, {
    where: "(pending_operation IS NULL OR pending_operation != 'delete')",
    orderBy: 'created_at DESC'
  });
};

// Alias للتوافق مع الاستيراد
export const getAllLocalReturns = getAllLocalProductReturns;

// جلب الإرجاعات غير المتزامنة
export const getUnsyncedProductReturns = async (): Promise<LocalProductReturn[]> => {
  const orgId = localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') || '';

  return deltaWriteService.getAll<LocalProductReturn>('product_returns', orgId, {
    where: 'synced = 0'
  });
};

// تحديث حالة المزامنة
export const updateProductReturnSyncStatus = async (
  returnId: string,
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

  await deltaWriteService.update('product_returns', returnId, updatedData);
};

// مسح الإرجاعات المتزامنة والمحذوفة
export const cleanupSyncedReturns = async (): Promise<number> => {
  console.log('[LocalReturn] Cleanup handled by Delta Sync automatically');
  return 0;
};

// ==================== بحث وتصفح محلي للإرجاعات ====================

export async function getLocalProductReturnsPage(
  organizationId: string,
  options: { offset?: number; limit?: number; status?: string | string[]; createdSort?: 'asc' | 'desc' } = {}
): Promise<{ returns: LocalProductReturn[]; total: number }> {
  const { offset = 0, limit = 50, status, createdSort = 'desc' } = options;

  let whereClause = "organization_id = ?";
  const params: any[] = [organizationId];

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    const placeholders = statuses.map(() => '?').join(',');
    whereClause += ` AND status IN (${placeholders})`;
    params.push(...statuses);
  }

  const returns = await deltaWriteService.getAll<LocalProductReturn>('product_returns', organizationId, {
    where: whereClause,
    params,
    orderBy: `created_at ${createdSort === 'desc' ? 'DESC' : 'ASC'}`,
    limit,
    offset
  });

  const total = await deltaWriteService.count('product_returns', organizationId);

  return { returns, total };
}

export async function fastSearchLocalProductReturns(
  organizationId: string,
  query: string,
  options: { limit?: number; status?: string | string[] } = {}
): Promise<LocalProductReturn[]> {
  const q = (query || '').toLowerCase();
  if (!q) return [];
  const limit = options.limit ?? 200;

  return deltaWriteService.search<LocalProductReturn>(
    'product_returns',
    organizationId,
    ['return_number_lower', 'customer_name_lower'],
    q,
    limit
  );
}

// =====================
// حفظ البيانات من السيرفر
// =====================

export const saveRemoteProductReturns = async (returns: any[]): Promise<void> => {
  if (!returns || returns.length === 0) return;

  const now = new Date().toISOString();

  for (const ret of returns) {
    const mappedReturn: LocalProductReturn = {
      id: ret.id,
      return_number: ret.return_number,
      return_number_lower: ret.return_number?.toLowerCase(),
      remote_return_id: ret.id,
      customer_name: ret.customer_name,
      customer_name_lower: ret.customer_name?.toLowerCase(),
      customer_id: ret.customer_id,
      order_id: ret.order_id,
      return_type: ret.return_type,
      reason: ret.reason,
      status: ret.status || 'pending',
      total_refund_amount: ret.total_refund_amount || 0,
      refund_method: ret.refund_method,
      approved_by: ret.approved_by,
      approved_at: ret.approved_at,
      notes: ret.notes,
      organization_id: ret.organization_id,
      created_at: ret.created_at || now,
      updated_at: ret.updated_at || now,
      synced: true,
      syncStatus: undefined,
      pendingOperation: undefined
    };

    await deltaWriteService.saveFromServer('product_returns', mappedReturn);
  }

  console.log(`[LocalReturn] ⚡ Saved ${returns.length} remote returns`);
};

export const saveRemoteReturnItems = async (returnId: string, items: any[]): Promise<void> => {
  if (!items || items.length === 0) return;

  const now = new Date().toISOString();

  for (const item of items) {
    const mappedItem: LocalReturnItem = {
      id: item.id,
      return_id: returnId,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      return_quantity: item.return_quantity || 1,
      unit_price: item.unit_price || 0,
      refund_amount: item.refund_amount || 0,
      return_condition: item.return_condition,
      resellable: item.resellable || false,
      inventory_returned: item.inventory_returned || false,
      color_id: item.color_id,
      color_name: item.color_name,
      size_id: item.size_id,
      size_name: item.size_name,
      created_at: item.created_at || now,
      synced: true
    };

    await deltaWriteService.saveFromServer('return_items', mappedItem);
  }

  console.log(`[LocalReturn] ⚡ Saved ${items.length} remote return items`);
};
