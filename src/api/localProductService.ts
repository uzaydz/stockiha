import { v4 as uuidv4 } from 'uuid';
import { productsStore, LocalProduct, SyncQueueItem, inventoryDB } from '@/database/localDb';
import { UnifiedQueue } from '@/sync/UnifiedQueue';
import { Product } from './productService';
import { syncTracker } from '@/lib/sync/SyncTracker';

// إضافة منتج جديد محلياً
export const createLocalProduct = async (organizationId: string, product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<LocalProduct> => {
  const now = new Date().toISOString();
  const newProduct: LocalProduct = {
    ...product,
    id: uuidv4(),
    created_at: now,
    updated_at: now,
    organization_id: organizationId,
    localUpdatedAt: now,
    synced: false,
    pendingOperation: 'create'
  };

  await productsStore.setItem(newProduct.id, newProduct);
  
  // إضافة إلى قائمة المزامنة (موحّد)
  await UnifiedQueue.enqueue({
    objectType: 'product',
    objectId: newProduct.id,
    operation: 'create',
    data: newProduct,
    priority: 1
  });

  // 🚀 إضافة للـ sync tracker
  syncTracker.addPending(newProduct.id, 'products');

  return newProduct;
};

// تحديث منتج محلياً
export const updateLocalProduct = async (productId: string, updates: Partial<LocalProduct>): Promise<LocalProduct | null> => {
  try {
    const existingProduct = await productsStore.getItem<LocalProduct>(productId);
    
    if (!existingProduct) {
      return null;
    }
    
    const now = new Date().toISOString();
    const updatedProduct: LocalProduct = {
      ...existingProduct,
      ...updates,
      updated_at: now,
      localUpdatedAt: now,
      synced: false,
      pendingOperation: existingProduct.pendingOperation === 'create' ? 'create' : 'update'
    };
    
    await productsStore.setItem(productId, updatedProduct);
    
    // إضافة إلى قائمة المزامنة إذا لم يكن منتجاً جديداً غير متزامن بالفعل
    if (existingProduct.pendingOperation !== 'create') {
      await UnifiedQueue.enqueue({
        objectType: 'product',
        objectId: productId,
        operation: 'update',
        data: updatedProduct,
        priority: 2
      });
      
      // 🚀 إضافة للـ sync tracker
      syncTracker.addPending(productId, 'products');
    }
    
    return updatedProduct;
  } catch (error) {
    return null;
  }
};

// تقليل كمية المخزون محلياً (مثلاً عند البيع)
export const reduceLocalProductStock = async (productId: string, quantity: number): Promise<LocalProduct | null> => {
  try {
    const product = await productsStore.getItem<LocalProduct>(productId);
    
    if (!product) {
      return null;
    }
    
    if (product.stock_quantity < quantity) {
      return null;
    }
    
    const newStockQuantity = product.stock_quantity - quantity;
    
    return updateLocalProduct(productId, { 
      stock_quantity: newStockQuantity
    });
  } catch (error) {
    return null;
  }
};

// إضافة عنصر إلى قائمة المزامنة
export const addToSyncQueue = async (item: SyncQueueItem) => {
  // SQLite-only queue persistence
  await inventoryDB.syncQueue.put(item as any);
};

// جلب المنتجات المحلية مع تصفية حسب حالة المزامنة
export const getLocalProducts = async (synced?: boolean): Promise<LocalProduct[]> => {
  const products: LocalProduct[] = [];
  
  await productsStore.iterate<LocalProduct, void>((product) => {
    if (synced === undefined || product.synced === synced) {
      products.push(product);
    }
  });
  
  return products;
};

// جلب المنتجات التي تحتاج إلى مزامنة
export const getUnsyncedProducts = async (): Promise<LocalProduct[]> => {
  return getLocalProducts(false);
};

// تحديث حالة مزامنة المنتج
export const markProductAsSynced = async (productId: string, remoteData?: Partial<Product>): Promise<LocalProduct | null> => {
  try {
    const product = await productsStore.getItem<LocalProduct>(productId);
    
    if (!product) {
      return null;
    }
    
    const updatedProduct: LocalProduct = {
      ...product,
      ...remoteData,
      synced: true,
      syncStatus: undefined,
      lastSyncAttempt: new Date().toISOString(),
      pendingOperation: undefined
    };
    
    await productsStore.setItem(productId, updatedProduct);
    return updatedProduct;
  } catch (error) {
    return null;
  }
};

// حذف منتج محلياً
export const deleteLocalProduct = async (productId: string): Promise<boolean> => {
  try {
    const product = await productsStore.getItem<LocalProduct>(productId);
    
    if (!product) {
      return false;
    }
    
    if (product.synced) {
      // إذا كان المنتج متزامنًا، قم بإضافته إلى قائمة المزامنة للحذف
      await UnifiedQueue.enqueue({
        objectType: 'product',
        objectId: productId,
        operation: 'delete',
        data: { id: productId },
        priority: 3
      });
    } else if (product.pendingOperation === 'create') {
      // إذا كان المنتج جديدًا وغير متزامن، احذف عناصر المزامنة من SQLite
      try {
        const items = await inventoryDB.syncQueue
          .where('objectId' as any)
          .equals(productId as any)
          .toArray();
        for (const it of items) {
          await inventoryDB.syncQueue.delete((it as any).id);
        }
      } catch {}
    }
    
    // حذف المنتج من المخزن المحلي
    await productsStore.removeItem(productId);
    return true;
  } catch (error) {
    return false;
  }
};
