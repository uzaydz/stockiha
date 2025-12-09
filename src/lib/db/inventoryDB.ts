import { fetchProductInventoryDetails, updateVariantInventory } from '@/services/InventoryService';
import type { InventoryVariantSize, ProductInventoryDetails } from '@/services/InventoryService';
import type { InventoryItem as LocalInventoryItem, InventoryTransaction as LocalInventoryTransaction } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// إعادة تصدير الأنواع من المصدر الموحد
export type InventoryItem = LocalInventoryItem;
export type InventoryTransaction = LocalInventoryTransaction;

// دالة لإنشاء معرف للمخزون (متوافقة مع المخطط الحالي)
function createInventoryItemId(productId: string, variantId: string | null): string {
  return `${productId}:${variantId || 'null'}`;
}

// هذا الملف يستخدم SQLite فقط عبر sqliteDB (يدعم Tauri و Electron)

/**
 * استرجاع مخزون منتج معين (أو متغير منتج)
 * @param productId معرف المنتج
 * @param variantId معرف المتغير (اختياري)
 * @returns كمية المخزون الحالية
 */
export async function getProductStock(productId: string, variantId?: string): Promise<number> {
  try {
    // التأكد من أن productId صالح
    if (!productId) {
      throw new Error('معرف المنتج غير صالح');
    }

    const normalizedVariantId = variantId ?? null;
    const itemId = createInventoryItemId(productId, normalizedVariantId);

    // البحث في PowerSync
    if (!powerSyncService.db) {
      console.warn('[inventoryDB] PowerSync DB not initialized');
      return 0;
    }
    const result = await powerSyncService.queryOne<any>({
      sql: 'SELECT stock_quantity FROM inventory WHERE id = ?',
      params: [itemId]
    });
    if (result) return result.stock_quantity || 0;

    const result2 = await powerSyncService.queryOne<any>({
      sql: 'SELECT stock_quantity FROM inventory WHERE product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))',
      params: [productId, normalizedVariantId, normalizedVariantId]
    });
    return result2?.stock_quantity || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * تعديل كمية مخزون منتج
 * @param data بيانات عملية تعديل المخزون
 * @returns العملية المضافة
 */
export async function updateProductStock(data: {
  product_id: string;
  variant_id?: string;
  quantity: number;
  reason: string;
  notes?: string;
  source_id?: string;
  created_by: string;
}): Promise<InventoryTransaction> {
  // التأكد من وجود معرف المنتج
  if (!data.product_id) {
    throw new Error('معرف المنتج غير صالح');
  }

  // ضمان أن معرف المتغير دائمًا null إذا كان غير محدد
  const variantId = data.variant_id ?? null;
  const itemId = createInventoryItemId(data.product_id, variantId);

  // إنشاء عملية جديدة
  const transaction: InventoryTransaction = {
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    ...data,
    variant_id: variantId,
    timestamp: new Date(),
    synced: false
  };

  // بدء معاملة قاعدة البيانات
  const result = await powerSyncService.queryOne<any>({
    sql: 'SELECT * FROM inventory WHERE id = ?',
    params: [itemId]
  });
  let item = result;
  if (!item) {
    const result2 = await powerSyncService.queryOne<any>({
      sql: 'SELECT * FROM inventory WHERE product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))',
      params: [data.product_id, variantId, variantId]
    });
    item = result2.data;
  }
  const now = new Date().toISOString();
  
  // ⚡ استخدام PowerSync مباشرة
  await powerSyncService.transaction(async (tx) => {
    // db accessed via tx.execute
  
  if (item) {
    const newQuantity = Math.max(0, item.stock_quantity + data.quantity);
      await tx.execute(
      `INSERT OR REPLACE INTO inventory (id, product_id, variant_id, stock_quantity, last_updated, synced) VALUES (?, ?, ?, ?, ?, ?)`,
      [itemId, data.product_id, variantId, newQuantity, now, 0]
    );
  } else {
      await tx.execute(
      `INSERT OR REPLACE INTO inventory (id, product_id, variant_id, stock_quantity, last_updated, synced) VALUES (?, ?, ?, ?, ?, ?)`,
      [itemId, data.product_id, variantId, Math.max(0, data.quantity), now, 0]
    );
  }

  // حفظ المعاملة في SQLite (بعد حفظ المخزون)
    await tx.execute(
    `INSERT OR REPLACE INTO transactions (id, product_id, variant_id, quantity, reason, notes, source_id, created_by, timestamp, synced, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.id,
      transaction.product_id,
      transaction.variant_id,
      transaction.quantity,
      transaction.reason,
      transaction.notes || null,
      transaction.source_id || null,
      transaction.created_by,
      transaction.timestamp.toISOString(),
      transaction.synced ? 1 : 0,
      transaction.timestamp.toISOString()
    ]
  );
  });
  console.log('[inventoryDB] ⚡ Saved transaction via PowerSync', { id: transaction.id });

  return transaction;
}

/**
 * مزامنة بيانات المخزون مع الخادم
 * @returns عدد العمليات التي تمت مزامنتها
 */
export async function syncInventoryData(): Promise<number> {
  try {
    // التحقق من حالة الاتصال
    if (!navigator.onLine) {
      return 0;
    }

    // الحصول على العمليات غير المتزامنة
    const result = await powerSyncService.query<any>({
      sql: 'SELECT * FROM transactions WHERE synced = 0 ORDER BY timestamp ASC',
      params: []
    });
    const unsyncedTransactions: InventoryTransaction[] = (result || []).map((t: any) => ({
      ...t,
      timestamp: new Date(t.timestamp),
      synced: t.synced === 1
    }));

    if (unsyncedTransactions.length === 0) {

      return 0;
    }

    // تنفيذ المزامنة مع الخادم
    let syncedCount = 0;
    const now = new Date();

    for (const transaction of unsyncedTransactions) {
      try {
        const details: ProductInventoryDetails = await fetchProductInventoryDetails(transaction.product_id);

        const resolveCurrentQuantity = () => {
          if (!transaction.variant_id) {
            return details.totalStockQuantity;
          }

          const sizeMatch = details.variants
            .flatMap<InventoryVariantSize>((variant) => variant.sizes)
            .find((size) => size.sizeId === transaction.variant_id || size.id === transaction.variant_id);

          if (sizeMatch) {
            return sizeMatch.quantity;
          }

          const variantMatch = details.variants.find(
            (variant) =>
              variant.variantId === transaction.variant_id ||
              variant.id === transaction.variant_id ||
              variant.colorId === transaction.variant_id
          );

          if (variantMatch) {
            return variantMatch.quantity;
          }

          return details.totalStockQuantity;
        };

        const previousStock = resolveCurrentQuantity();
        const newStock = Math.max(0, previousStock + transaction.quantity);

        await updateVariantInventory({
          productId: transaction.product_id,
          variantId: transaction.variant_id,
          newQuantity: newStock,
          operationType: transaction.reason,
          notes: transaction.notes,
        });

        // ⚡ استخدام PowerSync مباشرة
        await powerSyncService.transaction(async (tx) => {
          // db accessed via tx.execute
          
          await tx.execute(
          `UPDATE transactions SET synced = ?, timestamp = ? WHERE id = ?`,
          [1, now.toISOString(), transaction.id]
        );

        const inventoryItemId = createInventoryItemId(transaction.product_id, transaction.variant_id ?? null);
          await tx.execute(
          `INSERT OR REPLACE INTO inventory (id, product_id, variant_id, stock_quantity, last_updated, synced) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            inventoryItemId,
            transaction.product_id,
            transaction.variant_id ?? null,
            newStock,
            now.toISOString(),
            1
          ]
        );
        });

        syncedCount++;
      } catch (error) {
        // ترك المعاملة في حالة غير متزامنة للمحاولة لاحقًا
      }
    }

    // تحديث حالة المزامنة لعناصر المخزون
    // ⚡ استخدام PowerSync مباشرة
    await powerSyncService.transaction(async (tx) => {
      // db accessed via tx.execute
      await tx.execute('UPDATE inventory SET synced = 1 WHERE synced = 0', []);
    });

    return syncedCount;
  } catch (error) {
    return 0;
  }
}

/**
 * الحصول على عدد العمليات غير المتزامنة
 * @returns عدد العمليات غير المتزامنة
 */
export async function getUnsyncedTransactionsCount(): Promise<number> {
  try {
    const result = await powerSyncService.query<any>({
      sql: 'SELECT COUNT(*) as count FROM transactions WHERE synced = 0',
      params: []
    });
    return result?.[0]?.count || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * الحصول على قائمة عمليات المخزون لمنتج معين
 * @param productId معرف المنتج
 * @param variantId معرف المتغير (اختياري)
 * @returns قائمة العمليات مرتبة حسب التاريخ
 */
export async function getProductTransactions(productId: string, variantId?: string): Promise<InventoryTransaction[]> {
  try {
    if (!productId) {
      return [];
    }
    let sql = 'SELECT * FROM transactions WHERE product_id = ?';
    const params: any[] = [productId];
    if (variantId) {
      sql += ' AND variant_id = ?';
      params.push(variantId);
    }
    sql += ' ORDER BY timestamp ASC';
    const result = await powerSyncService.query<any>({ sql, params });
    return (result || []).map((t: any) => ({
      ...t,
      timestamp: new Date(t.timestamp),
      synced: t.synced === 1
    }));
  } catch (error) {
    return [];
  }
}

/**
 * تحميل بيانات المخزون من الخادم وتخزينها محليًا
 * @returns عدد العناصر التي تم تحميلها
 */
export async function loadInventoryDataFromServer(): Promise<number> {
  try {
    // التحقق من حالة الاتصال
    if (!navigator.onLine) {
      return 0;
    }

    // طلب بيانات المخزون من الخادم
    const response = await fetch('/api/inventory/products');

    if (!response.ok) {
      throw new Error('فشل في تحميل بيانات المخزون من الخادم');
    }

    const inventoryData = await response.json();

    // حفظ في PowerSync
    await powerSyncService.transaction(async (tx) => {
      // db accessed via tx.execute
      
      await tx.execute('DELETE FROM inventory WHERE synced = 1', []);
      
    for (const item of inventoryData) {
      const variantId = item.variant_id ?? null;
      const itemId = createInventoryItemId(item.product_id, variantId);
      const existingResult = await powerSyncService.queryOne<any>({
        sql: 'SELECT synced FROM inventory WHERE id = ?',
        params: [itemId]
      });
        if (existingResult && existingResult.synced === 0) continue;
        
        await tx.execute(
        `INSERT OR REPLACE INTO inventory (id, product_id, variant_id, stock_quantity, last_updated, synced) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          item.product_id,
          variantId,
          item.stock_quantity || 0,
          item.last_updated || new Date().toISOString(),
          1
        ]
      );
    }
    });

    return inventoryData.length;
  } catch (error) {
    return 0;
  }
}
