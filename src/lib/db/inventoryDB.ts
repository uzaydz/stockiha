import { fetchProductInventoryDetails, updateVariantInventory } from '@/services/InventoryService';
import type { InventoryVariantSize, ProductInventoryDetails } from '@/services/InventoryService';
import { inventoryDB as baseInventoryDB } from '@/database/localDb';
import type { InventoryItem as LocalInventoryItem, InventoryTransaction as LocalInventoryTransaction } from '@/database/localDb';

// إعادة تصدير الأنواع من المصدر الموحد
export type InventoryItem = LocalInventoryItem;
export type InventoryTransaction = LocalInventoryTransaction;

// دالة لإنشاء معرف للمخزون (متوافقة مع المخطط الحالي)
function createInventoryItemId(productId: string, variantId: string | null): string {
  return `${productId}:${variantId || 'null'}`;
}

// تصدير نسخة قاعدة البيانات الموحدة (Dexie من localDb)
export const inventoryDB = baseInventoryDB;

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

    // البحث عن عنصر المخزون باستخدام المعرف
    const item = await inventoryDB.inventory
      .where('id')
      .equals(itemId)
      .first();
    
    if (item) {
      
      return item.stock_quantity;
    }
    
    // البحث بطريقة بديلة إذا لم يتم العثور بواسطة المعرف
    const items = await inventoryDB.inventory
      .where('product_id')
      .equals(productId)
      .filter(item => item.variant_id === normalizedVariantId)
      .toArray();

    if (items.length > 0) {
      return items[0].stock_quantity;
    }
    
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
  await inventoryDB.transaction('rw', [inventoryDB.inventory, inventoryDB.transactions], async () => {
    // البحث عن عنصر المخزون باستخدام المعرف
    let item = await inventoryDB.inventory
      .where('id')
      .equals(itemId)
      .first();

    if (!item) {
      // البحث بطريقة بديلة إذا لم يتم العثور بواسطة المعرف
      const items = await inventoryDB.inventory
        .where('product_id')
        .equals(data.product_id)
        .filter(i => i.variant_id === variantId)
        .toArray();

      if (items.length > 0) {
        item = items[0];
      }
    }

    if (item) {
      // حساب الكمية الجديدة (لا تسمح بقيم سالبة)
      const newQuantity = Math.max(0, item.stock_quantity + data.quantity);

      // تحديث العنصر الموجود
      await inventoryDB.inventory.put({
        id: itemId,
        product_id: data.product_id,
        variant_id: variantId,
        stock_quantity: newQuantity,
        last_updated: new Date(),
        synced: false
      });
    } else {
      // إنشاء عنصر جديد
      await inventoryDB.inventory.add({
        id: itemId,
        product_id: data.product_id,
        variant_id: variantId,
        stock_quantity: Math.max(0, data.quantity),
        last_updated: new Date(),
        synced: false
      });
    }

    // إضافة العملية إلى جدول العمليات
    await inventoryDB.transactions.add(transaction);
  });

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
    const unsyncedTransactions = await inventoryDB.transactions
      .filter(t => !t.synced)
      .sortBy('timestamp');
    
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

        await inventoryDB.transactions.update(transaction.id, {
          synced: true,
          timestamp: now,
        });

        await inventoryDB.inventory.put({
          id: createInventoryItemId(transaction.product_id, transaction.variant_id ?? null),
          product_id: transaction.product_id,
          variant_id: transaction.variant_id ?? null,
          stock_quantity: newStock,
          last_updated: now,
          synced: true,
        });

        syncedCount++;
      } catch (error) {
        // ترك المعاملة في حالة غير متزامنة للمحاولة لاحقًا
      }
    }
    
    // تحديث حالة المزامنة لعناصر المخزون
    await inventoryDB.inventory
      .filter(item => item.synced === false)
      .modify({ synced: true });

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
    return await inventoryDB.transactions
      .filter(t => !t.synced)
      .count();
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
    
    let query = inventoryDB.transactions
      .where('product_id')
      .equals(productId);
    
    if (variantId) {
      query = query.and(item => item.variant_id === variantId);
    }
    
    return await query
      .sortBy('timestamp');
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
    
    // حفظ البيانات محليًا
    await inventoryDB.transaction('rw', inventoryDB.inventory, async () => {
      // حذف جميع البيانات الموجودة التي تمت مزامنتها
      await inventoryDB.inventory
        .filter(item => item.synced === true)
        .delete();
      
      // إضافة البيانات الجديدة
      for (const item of inventoryData) {
        // التأكد من أن variant_id هو null إذا كان غير محدد
        const variantId = item.variant_id ?? null;
        
        // التحقق مما إذا كان العنصر موجودًا بالفعل
        const existingItem = await inventoryDB.inventory
          .where('id')
          .equals(createInventoryItemId(item.product_id, variantId))
          .first();
        
        if (existingItem && !existingItem.synced) {
          // إذا كان العنصر موجودًا ولم تتم مزامنته، فقط نستمر
          continue;
        }
        
        // إضافة العنصر أو تحديثه
        await inventoryDB.inventory.put({
          ...item,
          id: existingItem ? existingItem.id : createInventoryItemId(item.product_id, variantId),
          variant_id: variantId,
          last_updated: new Date(item.last_updated),
          synced: true
        });
      }
    });

    return inventoryData.length;
  } catch (error) {
    return 0;
  }
}
