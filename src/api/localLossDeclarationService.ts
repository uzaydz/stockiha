/**
 * localLossDeclarationService - خدمة التصريح بالخسائر المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - DELTA operations: لتحديث المخزون عند الخسائر
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalLossDeclaration, LocalLossItem } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';

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
    loss_number_lower: data.lossData.loss_number?.toLowerCase(),
    created_at: now,
    updated_at: now,
    synced: false,
    syncStatus: 'pending',
    pendingOperation: 'create'
  };

  const itemRecords: LocalLossItem[] = data.items.map(item => ({
    ...item,
    id: uuidv4(),
    loss_id: lossId,
    created_at: now,
    synced: false,
    inventory_adjusted: false
  }));

  // ⚡ استخدام Delta Sync (بدون تحديث المخزون - يتم عند الموافقة)
  const result = await deltaWriteService.createLossWithItems(
    data.lossData.organization_id,
    lossRecord,
    itemRecords
  );

  if (!result.success) {
    throw new Error(`Failed to create loss declaration: ${result.error}`);
  }

  console.log(`[LocalLoss] ⚡ Created loss ${lossId} with ${itemRecords.length} items via Delta Sync`);
  return { loss: lossRecord, items: itemRecords };
};

// تحديث تصريح خسارة محلياً
export const updateLocalLossDeclaration = async (
  lossId: string,
  updates: Partial<Omit<LocalLossDeclaration, 'id' | 'created_at' | 'organization_id' | 'loss_number'>>
): Promise<LocalLossDeclaration | null> => {
  try {
    const existing = await deltaWriteService.get<LocalLossDeclaration>('loss_declarations', lossId);
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
    const result = await deltaWriteService.update('loss_declarations', lossId, updatedData);

    if (!result.success) {
      console.error(`[LocalLoss] Failed to update loss ${lossId}:`, result.error);
      return null;
    }

    console.log(`[LocalLoss] ⚡ Updated loss ${lossId} via Delta Sync`);
    return {
      ...existing,
      ...updatedData
    } as LocalLossDeclaration;
  } catch (error) {
    console.error(`[LocalLoss] Update error:`, error);
    return null;
  }
};

// الموافقة على تصريح خسارة وتحديث المخزون
export const approveLocalLossDeclaration = async (
  lossId: string,
  approvedBy: string
): Promise<LocalLossDeclaration | null> => {
  try {
    const loss = await deltaWriteService.get<LocalLossDeclaration>('loss_declarations', lossId);
    if (!loss) return null;

    const items = await deltaWriteService.getAll<LocalLossItem>('loss_items', loss.organization_id, {
      where: 'loss_id = ?',
      params: [lossId]
    });

    // تحديث المخزون لجميع العناصر التي لم يتم تعديل مخزونها بعد
    for (const item of items) {
      if (!item.inventory_adjusted) {
        // ⚡ استخدام DELTA operation لتقليل المخزون
        await deltaWriteService.updateProductStock(
          item.product_id,
          -Math.abs(item.lost_quantity), // سالب للتقليل
          { colorId: item.color_id || undefined, sizeId: item.size_id || undefined }
        );

        // تحديث حالة العنصر
        await deltaWriteService.update('loss_items', item.id, {
          inventory_adjusted: true
        });
      }
    }

    return await updateLocalLossDeclaration(lossId, {
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[LocalLoss] Approve error:`, error);
    return null;
  }
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
  const loss = await deltaWriteService.get<LocalLossDeclaration>('loss_declarations', lossId);
  if (!loss || loss.status !== 'approved') return null;

  return await updateLocalLossDeclaration(lossId, {
    status: 'processed'
  });
};

// جلب تصريح خسارة واحد مع عناصره
export const getLocalLossDeclaration = async (
  lossId: string
): Promise<{ loss: LocalLossDeclaration; items: LocalLossItem[] } | null> => {
  const loss = await deltaWriteService.get<LocalLossDeclaration>('loss_declarations', lossId);
  if (!loss) return null;

  const items = await deltaWriteService.getAll<LocalLossItem>('loss_items', loss.organization_id, {
    where: 'loss_id = ?',
    params: [lossId]
  });

  return { loss, items };
};

// جلب جميع تصاريح الخسائر حسب المؤسسة
export const getAllLocalLossDeclarations = async (organizationId: string): Promise<LocalLossDeclaration[]> => {
  return deltaWriteService.getAll<LocalLossDeclaration>('loss_declarations', organizationId, {
    where: "(pending_operation IS NULL OR pending_operation != 'delete')",
    orderBy: 'created_at DESC'
  });
};

// جلب التصاريح غير المتزامنة
export const getUnsyncedLossDeclarations = async (): Promise<LocalLossDeclaration[]> => {
  const orgId = localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') || '';

  return deltaWriteService.getAll<LocalLossDeclaration>('loss_declarations', orgId, {
    where: 'synced = 0'
  });
};

// تحديث حالة المزامنة
export const updateLossDeclarationSyncStatus = async (
  lossId: string,
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

  await deltaWriteService.update('loss_declarations', lossId, updatedData);
};

// مسح التصاريح المتزامنة والمحذوفة
export const cleanupSyncedLossDeclarations = async (): Promise<number> => {
  console.log('[LocalLoss] Cleanup handled by Delta Sync automatically');
  return 0;
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

// ==================== بحث وتصفح محلي لتصاريح الخسائر ====================

export async function getLocalLossDeclarationsPage(
  organizationId: string,
  options: { offset?: number; limit?: number; status?: string | string[]; createdSort?: 'asc' | 'desc' } = {}
): Promise<{ losses: LocalLossDeclaration[]; total: number }> {
  const { offset = 0, limit = 50, status, createdSort = 'desc' } = options;

  let whereClause = "organization_id = ?";
  const params: any[] = [organizationId];

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    const placeholders = statuses.map(() => '?').join(',');
    whereClause += ` AND status IN (${placeholders})`;
    params.push(...statuses);
  }

  const losses = await deltaWriteService.getAll<LocalLossDeclaration>('loss_declarations', organizationId, {
    where: whereClause,
    params,
    orderBy: `created_at ${createdSort === 'desc' ? 'DESC' : 'ASC'}`,
    limit,
    offset
  });

  const total = await deltaWriteService.count('loss_declarations', organizationId);

  return { losses, total };
}

export async function fastSearchLocalLossDeclarations(
  organizationId: string,
  query: string,
  options: { limit?: number; status?: string | string[] } = {}
): Promise<LocalLossDeclaration[]> {
  const q = (query || '').toLowerCase();
  if (!q) return [];
  const limit = options.limit ?? 200;

  return deltaWriteService.search<LocalLossDeclaration>(
    'loss_declarations',
    organizationId,
    ['loss_number_lower'],
    q,
    limit
  );
}

// =====================
// حفظ البيانات من السيرفر
// =====================

export const saveRemoteLossDeclarations = async (losses: any[]): Promise<void> => {
  if (!losses || losses.length === 0) return;

  const now = new Date().toISOString();

  for (const loss of losses) {
    const mappedLoss: LocalLossDeclaration = {
      id: loss.id,
      loss_number: loss.loss_number,
      loss_number_lower: loss.loss_number?.toLowerCase(),
      remote_loss_id: loss.id,
      loss_type: loss.loss_type,
      loss_category: loss.loss_category,
      loss_description: loss.loss_description,
      incident_date: loss.incident_date,
      reported_by: loss.reported_by,
      status: loss.status || 'pending',
      approved_by: loss.approved_by,
      approved_at: loss.approved_at,
      total_cost_value: loss.total_cost_value || 0,
      total_selling_value: loss.total_selling_value || 0,
      total_items_count: loss.total_items_count || 0,
      notes: loss.notes,
      organization_id: loss.organization_id,
      created_at: loss.created_at || now,
      updated_at: loss.updated_at || now,
      synced: true,
      syncStatus: undefined,
      pendingOperation: undefined
    };

    await deltaWriteService.saveFromServer('loss_declarations', mappedLoss);
  }

  console.log(`[LocalLoss] ⚡ Saved ${losses.length} remote loss declarations`);
};

export const saveRemoteLossItems = async (lossId: string, items: any[]): Promise<void> => {
  if (!items || items.length === 0) return;

  const now = new Date().toISOString();

  for (const item of items) {
    const mappedItem: LocalLossItem = {
      id: item.id,
      loss_id: lossId,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      lost_quantity: item.lost_quantity || 1,
      unit_cost_price: item.unit_cost_price || 0,
      unit_selling_price: item.unit_selling_price || 0,
      total_cost_value: item.total_cost_value || 0,
      total_selling_value: item.total_selling_value || 0,
      loss_condition: item.loss_condition,
      inventory_adjusted: item.inventory_adjusted || false,
      color_id: item.color_id,
      color_name: item.color_name,
      size_id: item.size_id,
      size_name: item.size_name,
      created_at: item.created_at || now,
      synced: true
    };

    await deltaWriteService.saveFromServer('loss_items', mappedItem);
  }

  console.log(`[LocalLoss] ⚡ Saved ${items.length} remote loss items`);
};
