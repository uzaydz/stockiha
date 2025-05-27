import Dexie from 'dexie';

// تعريف واجهة عملية المخزون
export interface InventoryTransaction {
  id: string;
  product_id: string;
  variant_id?: string;  // معرف اللون/المتغير إذا كان المنتج له ألوان
  quantity: number;     // عدد إيجابي للإضافات، سالب للمصروفات
  reason: string;       // سبب العملية (مثل: بيع، شراء، تعديل، إرجاع)
  notes?: string;       // ملاحظات إضافية
  source_id?: string;   // معرف المصدر (مثل: معرف الطلب، معرف المورد)
  timestamp: Date;      // وقت العملية
  synced: boolean;      // حالة المزامنة مع الخادم
  created_by: string;   // معرف المستخدم الذي قام بالعملية
}

// تعريف واجهة عناصر المخزون
export interface InventoryItem {
  id?: string; // إضافة معرف فريد
  product_id: string;
  variant_id: string | null;  // معرف اللون/المتغير إذا وجد (استخدام null بدلاً من undefined)
  stock_quantity: number;
  last_updated: Date;
  synced: boolean;
}

// تعريف فئة قاعدة بيانات المخزون المحلية
class InventoryDatabase extends Dexie {
  // تعريف جداول قاعدة البيانات
  inventory: Dexie.Table<InventoryItem, string>;
  transactions: Dexie.Table<InventoryTransaction, string>;

  constructor() {
    // استخدام اسم جديد لقاعدة البيانات لتجنب مشاكل الترقية
    super('inventoryDB_v2');
    
    // تعريف مخطط قاعدة البيانات (مع المفتاح الأساسي الجديد)
    this.version(1).stores({
      inventory: 'id, product_id, variant_id, stock_quantity, last_updated, synced',
      transactions: 'id, product_id, variant_id, reason, timestamp, synced, created_by'
    });
    
    // تعريف الجداول بأنواعها
    this.inventory = this.table('inventory');
    this.transactions = this.table('transactions');
  }
}

// دالة لإنشاء معرف للمخزون
function createInventoryItemId(productId: string, variantId: string | null): string {
  return `${productId}:${variantId || 'null'}`;
}

// محاولة لحذف قاعدة البيانات القديمة لمنع التداخل
try {
  
  Dexie.delete('inventoryDB');
} catch (deleteError) {
}

// إنشاء نسخة فردية من قاعدة البيانات
export const inventoryDB = new InventoryDatabase();

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
  
  try {

    // بدء معاملة قاعدة البيانات
    await inventoryDB.transaction('rw', [inventoryDB.inventory, inventoryDB.transactions], async () => {
      try {
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
        
      } catch (innerError) {
        throw innerError;
      }
    });

    return transaction;
  } catch (error) {
    throw error;
  }
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
    
    // استيراد Supabase في نطاق الدالة لتجنب الاعتماد الدائري
    const { supabase } = await import('@/lib/supabase');
    
    // الحصول على العمليات غير المتزامنة
    const unsyncedTransactions = await inventoryDB.transactions
      .filter(item => item.synced === false)
      .toArray();
    
    if (unsyncedTransactions.length === 0) {
      
      return 0;
    }
    
    // تنفيذ المزامنة مع الخادم
    let syncedCount = 0;
    
    // التحقق من الاتصال بـ Supabase قبل المزامنة
    try {
      const { error: pingError } = await supabase
        .from('products')
        .select('count', { count: 'exact', head: true })
        .limit(1);
        
      if (pingError) {
        throw new Error('فشل الاتصال بـ Supabase');
      }
    } catch (pingError) {
      throw new Error('فشل التحقق من اتصال Supabase');
    }
    
    // اﻵن نقوم بعملية المزامنة
    for (const transaction of unsyncedTransactions) {
      try {
        // الحصول على المخزون الحالي قبل التعديل
        let previousStock = 0;
        
        try {
          const { data: productData, error: fetchError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', transaction.product_id)
            .single();
            
          if (fetchError) {
            continue; // ننتقل للعملية التالية
          }
            
          if (productData) {
            previousStock = productData.stock_quantity;
          }
        } catch (stockError) {
          continue; // ننتقل للعملية التالية
        }
        
        // حساب المخزون الجديد
        const newStock = Math.max(0, previousStock + transaction.quantity);
        
        // 1. تحديث كمية المخزون في جدول المنتجات
        const { error: updateError } = await supabase
          .from('products')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
            last_inventory_update: new Date().toISOString()
          })
          .eq('id', transaction.product_id);
        
        if (updateError) {
          continue; // الانتقال إلى العملية التالية
        }
        
        // 2. إضافة سجل للعملية في inventory_logs
        const { error } = await supabase
          .from('inventory_logs')
          .insert({
            product_id: transaction.product_id,
            quantity: transaction.quantity,
            previous_stock: previousStock,
            new_stock: newStock,
            type: transaction.reason,
            notes: transaction.notes ?? '',
            reference_id: transaction.source_id ?? null,
            created_by: transaction.created_by,
            created_at: transaction.timestamp,
            organization_id: (await supabase.auth.getUser()).data.user?.user_metadata?.organization_id
          });
        
        if (error) {
        } else {
          // تحديث حالة المزامنة للعملية
          await inventoryDB.transactions.update(transaction.id, {
            synced: true
          });
          
          // زيادة عداد المزامنة
          syncedCount++;
        }
      } catch (error) {
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
      .filter(item => item.synced === false)
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
