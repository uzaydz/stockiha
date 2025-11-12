import { fetchProductInventoryDetails, updateVariantInventory } from '@/services/InventoryService';
import type { InventoryVariantSize, ProductInventoryDetails } from '@/services/InventoryService';
import type { InventoryItem as LocalInventoryItem, InventoryTransaction as LocalInventoryTransaction } from '@/database/localDb';

// إعادة تصدير الأنواع من المصدر الموحد
export type InventoryItem = LocalInventoryItem;
export type InventoryTransaction = LocalInventoryTransaction;

// دالة لإنشاء معرف للمخزون (متوافقة مع المخطط الحالي)
function createInventoryItemId(productId: string, variantId: string | null): string {
  return `${productId}:${variantId || 'null'}`;
}

// تمت إزالة أي اعتماد على Dexie/IndexedDB. هذا الملف يستخدم SQLite فقط عبر window.electronAPI.db

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

    // البحث في SQLite فقط
    if (!window.electronAPI?.db) return 0;
    const result = await window.electronAPI.db.queryOne(
      'SELECT stock_quantity FROM inventory WHERE id = ?',
      [itemId]
    );
    if (result.data) return result.data.stock_quantity || 0;

    const result2 = await window.electronAPI.db.queryOne(
      'SELECT stock_quantity FROM inventory WHERE product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))',
      [productId, normalizedVariantId, normalizedVariantId]
    );
    return result2.data?.stock_quantity || 0;
    
    return 0;
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
  if (!window.electronAPI?.db) throw new Error('SQLite DB API not available');
  const result = await window.electronAPI.db.queryOne(
    'SELECT * FROM inventory WHERE id = ?',
    [itemId]
  );
  let item = result.data;
  if (!item) {
    const result2 = await window.electronAPI.db.queryOne(
      'SELECT * FROM inventory WHERE product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))',
      [data.product_id, variantId, variantId]
    );
    item = result2.data;
  }
  const now = new Date().toISOString();
  if (item) {
    const newQuantity = Math.max(0, item.stock_quantity + data.quantity);
    await window.electronAPI.db.upsert('inventory', {
      id: itemId,
      product_id: data.product_id,
      variant_id: variantId,
      stock_quantity: newQuantity,
      last_updated: now,
      synced: 0
    });
  } else {
    await window.electronAPI.db.upsert('inventory', {
      id: itemId,
      product_id: data.product_id,
      variant_id: variantId,
      stock_quantity: Math.max(0, data.quantity),
      last_updated: now,
      synced: 0
    });
  }
  
  // حفظ المعاملة في SQLite (بعد حفظ المخزون)
  const saveTx = await window.electronAPI.db.upsert('transactions', {
    ...transaction,
    timestamp: transaction.timestamp.toISOString(),
    synced: transaction.synced ? 1 : 0,
    created_at: transaction.timestamp.toISOString()
  });
  console.log('[inventoryDB] Saved transaction to SQLite', { success: saveTx.success, id: transaction.id });

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
    if (!window.electronAPI?.db) return 0;
    const result = await window.electronAPI.db.query(
      'SELECT * FROM transactions WHERE synced = 0 ORDER BY timestamp ASC',
      []
    );
    const unsyncedTransactions: InventoryTransaction[] = (result.data || []).map((t: any) => ({
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

        await window.electronAPI.db.upsert('transactions', {
          ...transaction,
          synced: 1,
          timestamp: now.toISOString(),
        });

        await window.electronAPI.db.upsert('inventory', {
          id: createInventoryItemId(transaction.product_id, transaction.variant_id ?? null),
          product_id: transaction.product_id,
          variant_id: transaction.variant_id ?? null,
          stock_quantity: newStock,
          last_updated: now.toISOString(),
          synced: 1,
        });

        syncedCount++;
      } catch (error) {
        // ترك المعاملة في حالة غير متزامنة للمحاولة لاحقًا
      }
    }
    
    // تحديث حالة المزامنة لعناصر المخزون
    await window.electronAPI.db.query(
      'UPDATE inventory SET synced = 1 WHERE synced = 0',
      []
    );

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
    if (!window.electronAPI?.db) return 0;
    const result = await window.electronAPI.db.query(
      'SELECT COUNT(*) as count FROM transactions WHERE synced = 0',
      []
    );
    return result.data?.[0]?.count || 0;
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
    if (!window.electronAPI?.db) return [];
    let sql = 'SELECT * FROM transactions WHERE product_id = ?';
    const params: any[] = [productId];
    if (variantId) {
      sql += ' AND variant_id = ?';
      params.push(variantId);
    }
    sql += ' ORDER BY timestamp ASC';
    const result = await window.electronAPI.db.query(sql, params);
    return (result.data || []).map((t: any) => ({
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
    
    if (!window.electronAPI?.db) return 0;
    // حفظ في SQLite فقط
    await window.electronAPI.db.query(
      'DELETE FROM inventory WHERE synced = 1',
      []
    );
    for (const item of inventoryData) {
      const variantId = item.variant_id ?? null;
      const itemId = createInventoryItemId(item.product_id, variantId);
      const existingResult = await window.electronAPI.db.queryOne(
        'SELECT synced FROM inventory WHERE id = ?',
        [itemId]
      );
      if (existingResult.data && existingResult.data.synced === 0) continue;
      await window.electronAPI.db.upsert('inventory', {
        id: itemId,
        product_id: item.product_id,
        variant_id: variantId,
        stock_quantity: item.stock_quantity || 0,
        last_updated: item.last_updated || new Date().toISOString(),
        synced: 1
      });
    }

    return inventoryData.length;
  } catch (error) {
    return 0;
  }
}
