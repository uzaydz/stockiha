/**
 * localProductReturnService - خدمة إرجاع المنتجات المحلية
 *
 * ⚡ تم التحديث لاستخدام PowerSync
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - PowerSync: المزامنة التلقائية
 */

import { v4 as uuidv4 } from 'uuid';
import type { LocalProductReturn, LocalReturnItem } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// Re-export types للاستخدام في المكونات الأخرى
export type { LocalProductReturn, LocalReturnItem } from '@/database/localDb';

// تصدير الأنواع المساعدة
export interface CreateReturnData {
  returnData: Omit<LocalProductReturn, 'id' | 'created_at' | 'updated_at' | 'synced' | 'syncStatus' | 'pendingOperation'>;
  items: Array<Omit<LocalReturnItem, 'id' | 'return_id' | 'created_at' | 'synced'>>;
}

/**
 * ⚡ تحديث المخزون حسب نوع البيع (piece, weight, meter, box)
 * يتعامل مع جميع أنواع البيع المختلفة
 */
async function updateInventoryForReturn(tx: any, item: LocalReturnItem): Promise<void> {
  const sellingType = item.selling_unit_type || 'piece';

  console.log(`[LocalReturn] ⚡ updateInventoryForReturn called:`, {
    sellingType,
    product_id: item.product_id,
    weight_returned: item.weight_returned,
    meters_returned: item.meters_returned,
    boxes_returned: item.boxes_returned,
    return_quantity: item.return_quantity
  });

  try {
    switch (sellingType) {
      case 'weight':
        // ⚡ البيع بالوزن - زيادة الوزن المتاح
        const weightToReturn = item.weight_returned || 0;
        if (weightToReturn > 0) {
          await tx.execute(
            `UPDATE products SET
              available_weight = COALESCE(available_weight, 0) + ?,
              stock_quantity = COALESCE(stock_quantity, 0) + ?
            WHERE id = ?`,
            [weightToReturn, weightToReturn, item.product_id]
          );
          console.log(`[LocalReturn] ⚡ Weight inventory updated: +${weightToReturn} ${item.weight_unit || 'kg'}`);
        } else {
          console.warn(`[LocalReturn] ⚠️ Weight return skipped - weight_returned is 0 or null`);
        }
        break;

      case 'meter':
        // ⚡ البيع بالمتر - زيادة الأمتار المتاحة
        const metersToReturn = item.meters_returned || 0;
        if (metersToReturn > 0) {
          // ⚡ قراءة القيمة الحالية قبل التحديث
          const beforeUpdate = await tx.getAll(
            `SELECT available_length, stock_quantity FROM products WHERE id = ?`,
            [item.product_id]
          );
          console.log(`[LocalReturn] 📊 Before update:`, beforeUpdate?.[0]);

          await tx.execute(
            `UPDATE products SET
              available_length = COALESCE(available_length, 0) + ?,
              stock_quantity = COALESCE(stock_quantity, 0) + ?,
              updated_at = ?
            WHERE id = ?`,
            [metersToReturn, metersToReturn, new Date().toISOString(), item.product_id]
          );

          // ⚡ قراءة القيمة بعد التحديث للتأكد
          const afterUpdate = await tx.getAll(
            `SELECT available_length, stock_quantity FROM products WHERE id = ?`,
            [item.product_id]
          );
          console.log(`[LocalReturn] 📊 After update:`, afterUpdate?.[0]);
          console.log(`[LocalReturn] ⚡ Meter inventory updated: +${metersToReturn} meters`);
        } else {
          console.warn(`[LocalReturn] ⚠️ Meter return skipped - meters_returned is 0 or null`);
        }
        break;

      case 'box':
        // ⚡ البيع بالعلبة - زيادة عدد العلب + القطع
        const boxesToReturn = item.boxes_returned || 0;
        if (boxesToReturn > 0) {
          const unitsPerBox = item.units_per_box || 1;
          const totalUnits = boxesToReturn * unitsPerBox;
          await tx.execute(
            `UPDATE products SET
              available_boxes = COALESCE(available_boxes, 0) + ?,
              stock_quantity = COALESCE(stock_quantity, 0) + ?
            WHERE id = ?`,
            [boxesToReturn, totalUnits, item.product_id]
          );
          console.log(`[LocalReturn] ⚡ Box inventory updated: +${boxesToReturn} boxes (${totalUnits} units)`);
        } else {
          console.warn(`[LocalReturn] ⚠️ Box return skipped - boxes_returned is 0 or null`);
        }
        break;

      case 'piece':
      default:
        // ⚡ البيع بالقطعة - الوضع الافتراضي
        const returnQty = item.return_quantity || (item as any).quantity || 0;
        if (returnQty > 0) {
          // ⚡ قراءة القيمة الحالية قبل التحديث
          const beforeUpdate = await tx.getAll(
            `SELECT stock_quantity FROM products WHERE id = ?`,
            [item.product_id]
          );
          console.log(`[LocalReturn] 📊 Before update (piece):`, beforeUpdate?.[0]);

          // تحديث مع مراعاة اللون والمقاس
          if (item.color_id || item.size_id) {
            // تحديث مخزون المتغير (اللون/المقاس)
            if (item.size_id) {
              await tx.execute(
                `UPDATE product_sizes SET quantity = COALESCE(quantity, 0) + ? WHERE id = ?`,
                [returnQty, item.size_id]
              );
            } else if (item.color_id) {
              await tx.execute(
                `UPDATE product_colors SET quantity = COALESCE(quantity, 0) + ? WHERE id = ?`,
                [returnQty, item.color_id]
              );
            }
          }
          // تحديث مخزون المنتج الأساسي دائماً
          await tx.execute(
            `UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + ?, updated_at = ? WHERE id = ?`,
            [returnQty, new Date().toISOString(), item.product_id]
          );

          // ⚡ قراءة القيمة بعد التحديث للتأكد
          const afterUpdate = await tx.getAll(
            `SELECT stock_quantity FROM products WHERE id = ?`,
            [item.product_id]
          );
          console.log(`[LocalReturn] 📊 After update (piece):`, afterUpdate?.[0]);
          console.log(`[LocalReturn] ⚡ Piece inventory updated: +${returnQty} units`);
        } else {
          console.warn(`[LocalReturn] ⚠️ Piece return skipped - return_quantity is 0 or null`);
        }
        break;
    }
  } catch (error) {
    console.error(`[LocalReturn] ❌ Failed to update inventory for ${sellingType}:`, error);
    throw error;
  }
}

// ⚡ الأعمدة المسموحة في جدول returns (من PowerSync Schema)
const VALID_RETURN_COLUMNS = new Set([
  'organization_id', 'return_number', 'original_order_id', 'original_order_number',
  'customer_id', 'customer_name', 'customer_phone', 'customer_email',
  'return_type', 'return_reason', 'return_reason_description',
  'original_total', 'return_amount', 'refund_amount', 'restocking_fee',
  'status', 'approved_by', 'approved_at', 'processed_by', 'processed_at',
  'refund_method', 'notes', 'internal_notes', 'requires_manager_approval',
  'created_by', 'approval_notes', 'rejection_reason', 'rejected_by', 'rejected_at'
]);

// ⚡ الأعمدة المسموحة في جدول return_items (من PowerSync Schema)
const VALID_RETURN_ITEM_COLUMNS = new Set([
  'organization_id', 'return_id', 'original_order_item_id', 'product_id',
  'product_name', 'product_sku', 'original_quantity', 'return_quantity',
  'original_unit_price', 'return_unit_price', 'total_return_amount', 'variant_info',
  'color_id', 'color_name', 'size_id', 'size_name',
  'selling_unit_type', 'weight_returned', 'weight_unit', 'price_per_weight_unit',
  'meters_returned', 'price_per_meter', 'boxes_returned', 'units_per_box', 'box_price',
  'original_sale_type', 'original_is_wholesale',
  'condition_status', 'resellable', 'inventory_returned', 'inventory_returned_at', 'inventory_notes'
]);

// إنشاء إرجاع جديد محلياً
export const createLocalProductReturn = async (
  data: CreateReturnData
): Promise<{ return: LocalProductReturn; items: LocalReturnItem[] }> => {
  const now = new Date().toISOString();
  const returnId = uuidv4();

  const returnRecord: LocalProductReturn = {
    ...data.returnData,
    id: returnId,
    created_at: now,
    updated_at: now,
  } as LocalProductReturn;

  const itemRecords: LocalReturnItem[] = data.items.map(item => ({
    ...item,
    id: uuidv4(),
    return_id: returnId,
    created_at: now,
    inventory_returned: item.resellable ? item.inventory_returned : false
  } as LocalReturnItem));

  // ⚡ استخدام PowerSync مع تحديث المخزون
  await powerSyncService.transaction(async (tx) => {
    // حفظ الإرجاع - فلترة الأعمدة الصالحة فقط
    const returnKeys = Object.keys(returnRecord).filter(k =>
      k !== 'id' && k !== 'created_at' && k !== 'updated_at' && VALID_RETURN_COLUMNS.has(k)
    );
    const returnPlaceholders = returnKeys.map(() => '?').join(', ');
    const returnValues = returnKeys.map(k => {
      const val = (returnRecord as any)[k];
      // تحويل boolean إلى integer لـ SQLite
      if (typeof val === 'boolean') return val ? 1 : 0;
      return val ?? null;
    });

    await tx.execute(
      `INSERT INTO returns (id, ${returnKeys.join(', ')}, created_at, updated_at) VALUES (?, ${returnPlaceholders}, ?, ?)`,
      [returnId, ...returnValues, now, now]
    );

    // حفظ العناصر - فلترة الأعمدة الصالحة فقط
    for (const item of itemRecords) {
      // ⚡ DEBUG: تسجيل البيانات قبل الحفظ
      console.log('[LocalReturn] 📝 Item data before save:', {
        product_name: item.product_name,
        selling_unit_type: item.selling_unit_type,
        weight_returned: item.weight_returned,
        meters_returned: item.meters_returned,
        boxes_returned: item.boxes_returned,
        return_quantity: item.return_quantity
      });

      const itemKeys = Object.keys(item).filter(k =>
        k !== 'id' && k !== 'return_id' && k !== 'created_at' && VALID_RETURN_ITEM_COLUMNS.has(k)
      );
      const itemPlaceholders = itemKeys.map(() => '?').join(', ');
      const itemValues = itemKeys.map(k => {
        const val = (item as any)[k];
        if (typeof val === 'boolean') return val ? 1 : 0;
        return val ?? null;
      });

      // ⚡ DEBUG: تسجيل الأعمدة والقيم المحفوظة
      console.log('[LocalReturn] 📝 Saving columns:', itemKeys);
      console.log('[LocalReturn] 📝 selling_unit_type in keys?', itemKeys.includes('selling_unit_type'));

      await tx.execute(
        `INSERT INTO return_items (id, return_id, ${itemKeys.join(', ')}, created_at) VALUES (?, ?, ${itemPlaceholders}, ?)`,
        [item.id, returnId, ...itemValues, now]
      );

      // ⚡ تحديث المخزون حسب نوع البيع
      // ملاحظة: SQLite يخزن boolean كـ 0/1، لذا نتحقق من القيم بشكل صحيح
      const isResellable = item.resellable === true || item.resellable === 1 || item.resellable === '1';
      const shouldReturnInventory = item.inventory_returned === true || item.inventory_returned === 1 || item.inventory_returned === '1';

      console.log(`[LocalReturn] ⚡ Item ${item.product_name}: resellable=${isResellable}, inventory_returned=${shouldReturnInventory}, selling_unit_type=${item.selling_unit_type}`);

      if (isResellable && shouldReturnInventory) {
        await updateInventoryForReturn(tx, item);
      }
    }
  });

  console.log(`[LocalReturn] ⚡ Created return ${returnId} with ${itemRecords.length} items via PowerSync`);
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
    if (!powerSyncService.db) {
      console.warn('[localProductReturnService] PowerSync DB not initialized');
      return null;
    }
    const existing = await powerSyncService.queryOne<LocalProductReturn>({
      sql: 'SELECT * FROM returns WHERE id = ?',
      params: [returnId]
    });
    if (!existing) return null;

    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updated_at: now,
    };

    // ⚡ استخدام PowerSync
    await powerSyncService.transaction(async (tx) => {
      const keys = Object.keys(updatedData).filter(k => k !== 'id' && k !== 'created_at');
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => (updatedData as any)[k]);
      
      await tx.execute(
        `UPDATE returns SET ${setClause}, updated_at = ? WHERE id = ?`,
        [...values, now, returnId]
      );
    });

    console.log(`[LocalReturn] ⚡ Updated return ${returnId} via PowerSync`);
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
    if (!powerSyncService.db) {
    console.warn('[localProductReturnService] PowerSync DB not initialized');
    return null;
  }
  const productReturn = await powerSyncService.queryOne<LocalProductReturn>({
      sql: 'SELECT * FROM returns WHERE id = ?',
      params: [returnId]
    });
    if (!productReturn) return null;

    if (!powerSyncService.db) {
    console.warn('[localProductReturnService] PowerSync DB not initialized');
    return [];
  }
  const items = await powerSyncService.query<LocalReturnItem>({
      sql: 'SELECT * FROM return_items WHERE return_id = ?',
      params: [returnId]
    });

    // ⚡ تحديث المخزون حسب نوع البيع للعناصر القابلة لإعادة البيع
    await powerSyncService.transaction(async (tx) => {
      for (const item of items) {
        if (item.resellable && !item.inventory_returned) {
          // ⚡ استخدام الدالة الموحدة لتحديث المخزون
          await updateInventoryForReturn(tx, item);

          // تحديث حالة العنصر
          await tx.execute(
            'UPDATE return_items SET inventory_returned = 1, inventory_returned_at = ? WHERE id = ?',
            [new Date().toISOString(), item.id]
          );
        }
      }
    });

    return await updateLocalProductReturn(returnId, {
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString()
    } as any);
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
  if (!powerSyncService.db) {
    console.warn('[localProductReturnService] PowerSync DB not initialized');
    return null;
  }
  const productReturn = await powerSyncService.queryOne<LocalProductReturn>({
    sql: 'SELECT * FROM returns WHERE id = ?',
    params: [returnId]
  });
  if (!productReturn) return null;

  if (!powerSyncService.db) {
    console.warn('[localProductReturnService] PowerSync DB not initialized');
    return [];
  }
  const items = await powerSyncService.query<LocalReturnItem>({
    sql: 'SELECT * FROM return_items WHERE return_id = ?',
    params: [returnId]
  });

  return { return: productReturn, items };
};

// جلب جميع الإرجاعات حسب المؤسسة
export const getAllLocalProductReturns = async (organizationId: string): Promise<LocalProductReturn[]> => {
  if (!powerSyncService.db) {
    console.warn('[localProductReturnService] PowerSync DB not initialized');
    return [];
  }
  return powerSyncService.query<LocalProductReturn>({
    sql: 'SELECT * FROM returns WHERE organization_id = ? ORDER BY created_at DESC',
    params: [organizationId]
  });
};

// Alias للتوافق مع الاستيراد
export const getAllLocalReturns = getAllLocalProductReturns;

// جلب الإرجاعات غير المتزامنة
export const getUnsyncedProductReturns = async (): Promise<LocalProductReturn[]> => {
  // ⚡ PowerSync يتعامل مع المزامنة تلقائياً
  const orgId = localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') || '';

  if (!powerSyncService.db) {
    console.warn('[localProductReturnService] PowerSync DB not initialized');
    return [];
  }
  return powerSyncService.query<LocalProductReturn>({
    sql: 'SELECT * FROM returns WHERE organization_id = ?',
    params: [orgId]
  });
};

// تحديث حالة المزامنة (⚠️ PowerSync يدير المزامنة تلقائياً)
export const updateProductReturnSyncStatus = async (
  returnId: string,
  synced: boolean,
  syncStatus?: 'pending' | 'syncing' | 'error'
): Promise<void> => {
  // PowerSync يدير المزامنة تلقائياً - لا حاجة لتحديث يدوي
  console.log(`[LocalReturn] ⚠️ PowerSync manages sync automatically for return ${returnId}`);
  console.log(`[LocalReturn] updateProductReturnSyncStatus called - PowerSync handles sync automatically`);
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

  const returns = await powerSyncService.query<LocalProductReturn>({
    sql: `SELECT * FROM returns WHERE ${whereClause} ORDER BY created_at ${createdSort === 'desc' ? 'DESC' : 'ASC'} LIMIT ? OFFSET ?`,
    params: [...params, limit, offset]
  });

  if (!powerSyncService.db) {
    console.warn('[localProductReturnService] PowerSync DB not initialized');
    return [];
  }
  const totalResult = await powerSyncService.queryOne<{ count: number }>({
    sql: `SELECT COUNT(*) as count FROM returns WHERE ${whereClause}`,
    params: params
  });
  const total = totalResult?.count || 0;

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

  if (!powerSyncService.db) {
    console.warn('[localProductReturnService] PowerSync DB not initialized');
    return [];
  }
  // ⚡ v3.0: استخدام LOWER() بدلاً من الأعمدة غير الموجودة
  return powerSyncService.query<LocalProductReturn>({
    sql: `SELECT * FROM returns WHERE organization_id = ? AND (LOWER(return_number) LIKE ? OR LOWER(customer_name) LIKE ?) LIMIT ?`,
    params: [organizationId, `%${q}%`, `%${q}%`, limit]
  });
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
      // ⚡ v3.0: تم إزالة return_number_lower - غير موجود في PowerSync schema
      remote_return_id: ret.id,
      customer_name: ret.customer_name,
      // ⚡ v3.0: تم إزالة customer_name_lower - غير موجود في PowerSync schema
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
    } as LocalProductReturn;

    await powerSyncService.transaction(async (tx) => {
      const keys = Object.keys(mappedReturn).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => (mappedReturn as any)[k]);

      await tx.execute(
        `INSERT OR REPLACE INTO returns (id, ${keys.join(', ')}, created_at, updated_at) VALUES (?, ${placeholders}, ?, ?)`,
        [mappedReturn.id, ...values, mappedReturn.created_at, mappedReturn.updated_at]
      );
    });
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
    } as LocalReturnItem;

    await powerSyncService.transaction(async (tx) => {
      const keys = Object.keys(mappedItem).filter(k => k !== 'id' && k !== 'return_id' && k !== 'created_at');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => (mappedItem as any)[k]);

      await tx.execute(
        `INSERT OR REPLACE INTO return_items (id, return_id, ${keys.join(', ')}, created_at) VALUES (?, ?, ${placeholders}, ?)`,
        [mappedItem.id, returnId, ...values, mappedItem.created_at]
      );
    });
  }

  console.log(`[LocalReturn] ⚡ Saved ${items.length} remote return items`);
};
