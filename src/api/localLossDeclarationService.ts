/**
 * localLossDeclarationService - خدمة التصريح بالخسائر المحلية
 *
 * ⚡ تم التحديث لاستخدام PowerSync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - PowerSync: المزامنة التلقائية مع Supabase
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalLossDeclaration, LocalLossItem } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

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
    // ⚡ v3.0: تم إزالة loss_number_lower - غير موجود في PowerSync schema
    created_at: now,
    updated_at: now,
    // ⚠️ PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
  } as any;

  const itemRecords: LocalLossItem[] = data.items.map(item => ({
    ...item,
    id: uuidv4(),
    loss_id: lossId,
    created_at: now,
    inventory_adjusted: false
  } as any));

  // ⚡ استخدام PowerSync مباشرة
  await powerSyncService.transaction(async (tx) => {
    // حفظ التصريح
    const lossKeys = Object.keys(lossRecord).filter(k => k !== 'id');
    const lossValues = lossKeys.map(k => (lossRecord as any)[k]);
    const lossPlaceholders = lossKeys.map(() => '?').join(', ');
    
    await tx.execute(
      `INSERT INTO losses (id, ${lossKeys.join(', ')}, created_at, updated_at) VALUES (?, ${lossPlaceholders}, ?, ?)`,
      [lossId, ...lossValues, now, now]
    );

    // حفظ العناصر
    for (const item of itemRecords) {
      const itemKeys = Object.keys(item).filter(k => k !== 'id');
      const itemValues = itemKeys.map(k => (item as any)[k]);
      const itemPlaceholders = itemKeys.map(() => '?').join(', ');
      
      await tx.execute(
        `INSERT INTO loss_items (id, ${itemKeys.join(', ')}, created_at, updated_at) VALUES (?, ${itemPlaceholders}, ?, ?)`,
        [item.id, ...itemValues, now, now]
      );
    }
  });

  console.log(`[LocalLoss] ⚡ Created loss ${lossId} with ${itemRecords.length} items via PowerSync`);
  return { loss: lossRecord, items: itemRecords };
};

// تحديث تصريح خسارة محلياً
export const updateLocalLossDeclaration = async (
  lossId: string,
  updates: Partial<Omit<LocalLossDeclaration, 'id' | 'created_at' | 'organization_id' | 'loss_number'>>
): Promise<LocalLossDeclaration | null> => {
  try {
    const existing = await powerSyncService.get<LocalLossDeclaration>(
      'SELECT * FROM losses WHERE id = ?',
      [lossId]
    );
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updated_at: now,
    };

    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.transaction(async (tx) => {
const keys = Object.keys(updatedData).filter(k => k !== 'id' && k !== 'created_at');
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => (updatedData as any)[k]);
      
      await tx.execute(
        `UPDATE losses SET ${setClause}, updated_at = ? WHERE id = ?`,
        [...values, now, lossId]
      );
    });

    console.log(`[LocalLoss] ⚡ Updated loss ${lossId} via PowerSync`);
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
    const loss = await powerSyncService.get<LocalLossDeclaration>(
      'SELECT * FROM losses WHERE id = ?',
      [lossId]
    );
    if (!loss) return null;

    if (!powerSyncService.db) {
    console.warn('[localLossDeclarationService] PowerSync DB not initialized');
    return [];
  }
  const items = await powerSyncService.query<LocalLossItem>({
      sql: 'SELECT * FROM loss_items WHERE loss_id = ?',
      params: [lossId]
    });

    // تحديث المخزون لجميع العناصر التي لم يتم تعديل مخزونها بعد
    for (const item of items) {
      if (!item.inventory_adjusted) {
        // ⚡ استخدام PowerSync لتقليل المخزون
        const { reduceLocalProductStock } = await import('./localProductService');
        await reduceLocalProductStock(
          item.product_id,
          Math.abs(item.lost_quantity),
          { colorId: item.color_id || undefined, sizeId: item.size_id || undefined }
        );

        // تحديث حالة العنصر
        await powerSyncService.transaction(async (tx) => {
await tx.execute(
            'UPDATE loss_items SET inventory_adjusted = 1, updated_at = ? WHERE id = ?',
            [new Date().toISOString(), item.id]
          );
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
  const loss = await powerSyncService.get<LocalLossDeclaration>(
    'SELECT * FROM losses WHERE id = ?',
    [lossId]
  );
  if (!loss || loss.status !== 'approved') return null;

  return await updateLocalLossDeclaration(lossId, {
    status: 'processed'
  });
};

// جلب تصريح خسارة واحد مع عناصره
export const getLocalLossDeclaration = async (
  lossId: string
): Promise<{ loss: LocalLossDeclaration; items: LocalLossItem[] } | null> => {
  const loss = await powerSyncService.get<LocalLossDeclaration>(
    'SELECT * FROM losses WHERE id = ?',
    [lossId]
  );
  if (!loss) return null;

  if (!powerSyncService.db) {
    console.warn('[localLossDeclarationService] PowerSync DB not initialized');
    return [];
  }
  const items = await powerSyncService.query<LocalLossItem>({
    sql: 'SELECT * FROM loss_items WHERE loss_id = ?',
    params: [lossId]
  });

  return { loss, items };
};

// جلب جميع تصاريح الخسائر حسب المؤسسة
export const getAllLocalLossDeclarations = async (organizationId: string): Promise<LocalLossDeclaration[]> => {
  return await powerSyncService.query<LocalLossDeclaration>({
    sql: `SELECT * FROM losses 
     WHERE organization_id = ? 
     ORDER BY created_at DESC`,
    params: [organizationId]
  });
};

// جلب التصاريح غير المتزامنة (⚠️ PowerSync يدير المزامنة تلقائياً)
export const getUnsyncedLossDeclarations = async (): Promise<LocalLossDeclaration[]> => {
  // PowerSync يدير المزامنة تلقائياً - نرجع قائمة فارغة
  return [];
};

// تحديث حالة المزامنة (⚠️ PowerSync يدير المزامنة تلقائياً)
export const updateLossDeclarationSyncStatus = async (
  lossId: string,
  synced: boolean,
  syncStatus?: 'pending' | 'syncing' | 'error'
): Promise<void> => {
  // PowerSync يدير المزامنة تلقائياً - لا حاجة لتحديث يدوي
  console.log(`[LocalLoss] ⚠️ PowerSync manages sync automatically for loss ${lossId}`);
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

  if (!powerSyncService.db) {
    console.warn('[localLossDeclarationService] PowerSync DB not initialized');
    return [];
  }
  const losses = await powerSyncService.query<LocalLossDeclaration>({
    sql: `SELECT * FROM losses 
     WHERE ${whereClause}
     ORDER BY created_at ${createdSort === 'desc' ? 'DESC' : 'ASC'}
     LIMIT ? OFFSET ?`,
    params: [...params, limit, offset]
  });

  const totalResult = await powerSyncService.queryOne<any>({
    sql: `SELECT COUNT(*) as count FROM losses WHERE ${whereClause}`,
    params: params
  });
  const total = totalResult?.[0]?.count || 0;

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

  const searchPattern = `%${q}%`;
  // ⚡ v3.0: استخدام LOWER(loss_number) بدلاً من loss_number_lower غير الموجود
  return await powerSyncService.query<LocalLossDeclaration>({
    sql: `SELECT * FROM losses
     WHERE organization_id = ?
     AND LOWER(loss_number) LIKE ?
     LIMIT ?`,
    params: [organizationId, searchPattern, limit]
  });
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
      // ⚡ v3.0: تم إزالة loss_number_lower - غير موجود في PowerSync schema
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
      updated_at: loss.updated_at || now
      // ⚠️ PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
    } as any;

    // ⚡ استخدام PowerSync مباشرة للحفظ من Supabase
    await powerSyncService.transaction(async (tx) => {
const keys = Object.keys(mappedLoss).filter(k => k !== 'id');
      const values = keys.map(k => (mappedLoss as any)[k]);
      const placeholders = keys.map(() => '?').join(', ');
      
      // Try UPDATE first, then INSERT if no rows affected
      const updateKeys = keys.filter(k => k !== 'created_at' && k !== 'updated_at');
      const updateSet = updateKeys.map(k => `${k} = ?`).join(', ');
      const updateValues = updateKeys.map(k => (mappedLoss as any)[k]);
      
      const updateResult = await tx.execute(
        `UPDATE losses SET ${updateSet}, updated_at = ? WHERE id = ?`,
        [...updateValues, mappedLoss.updated_at || now, mappedLoss.id]
      );
      
      // If no rows updated, INSERT
      if (!updateResult || (Array.isArray(updateResult) && updateResult.length === 0)) {
        await tx.execute(
          `INSERT INTO losses (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
          [mappedLoss.id, ...values, mappedLoss.created_at || now, mappedLoss.updated_at || now]
        );
      }
    });
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
      created_at: item.created_at || now
      // ⚠️ PowerSync يدير المزامنة تلقائياً - لا حاجة لحقول synced
    } as any;

    // ⚡ استخدام PowerSync مباشرة للحفظ من Supabase
    await powerSyncService.transaction(async (tx) => {
const keys = Object.keys(mappedItem).filter(k => k !== 'id');
      const values = keys.map(k => (mappedItem as any)[k]);
      const placeholders = keys.map(() => '?').join(', ');
      const now = new Date().toISOString();
      
      // Try UPDATE first, then INSERT if no rows affected
      const updateKeys = keys.filter(k => k !== 'created_at' && k !== 'updated_at');
      const updateSet = updateKeys.map(k => `${k} = ?`).join(', ');
      const updateValues = updateKeys.map(k => (mappedItem as any)[k]);
      
      const updateResult = await tx.execute(
        `UPDATE loss_items SET ${updateSet}, updated_at = ? WHERE id = ?`,
        [...updateValues, mappedItem.updated_at || now, mappedItem.id]
      );
      
      // If no rows updated, INSERT
      if (!updateResult || (Array.isArray(updateResult) && updateResult.length === 0)) {
        await tx.execute(
          `INSERT INTO loss_items (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
          [mappedItem.id, ...values, mappedItem.created_at || now, mappedItem.updated_at || now]
        );
      }
    });
  }

  console.log(`[LocalLoss] ⚡ Saved ${items.length} remote loss items`);
};
