import { v4 as uuidv4 } from 'uuid';
import { productsStore, syncQueueStore, LocalProduct, SyncQueueItem } from '@/database/localDb';
import { Product } from './productService';

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
  
  // إضافة إلى قائمة المزامنة
  await addToSyncQueue({
    id: uuidv4(),
    objectType: 'product',
    objectId: newProduct.id,
    operation: 'create',
    data: newProduct,
    attempts: 0,
    createdAt: now,
    priority: 1
  });

  return newProduct;
};

// تحديث منتج محلياً
export const updateLocalProduct = async (productId: string, updates: Partial<Product>): Promise<LocalProduct | null> => {
  try {
    const existingProduct = await productsStore.getItem<LocalProduct>(productId);
    
    if (!existingProduct) {
      console.error(`منتج غير موجود بالمعرف: ${productId}`);
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
      await addToSyncQueue({
        id: uuidv4(),
        objectType: 'product',
        objectId: productId,
        operation: 'update',
        data: updatedProduct,
        attempts: 0,
        createdAt: now,
        priority: 2
      });
    }
    
    return updatedProduct;
  } catch (error) {
    console.error('خطأ في تحديث المنتج محلياً:', error);
    return null;
  }
};

// تقليل كمية المخزون محلياً (مثلاً عند البيع)
export const reduceLocalProductStock = async (productId: string, quantity: number): Promise<LocalProduct | null> => {
  try {
    const product = await productsStore.getItem<LocalProduct>(productId);
    
    if (!product) {
      console.error(`منتج غير موجود بالمعرف: ${productId}`);
      return null;
    }
    
    if (product.stock_quantity < quantity) {
      console.error(`كمية المخزون غير كافية للمنتج: ${productId}`);
      return null;
    }
    
    const newStockQuantity = product.stock_quantity - quantity;
    
    return updateLocalProduct(productId, { 
      stock_quantity: newStockQuantity,
      last_inventory_update: new Date().toISOString()
    });
  } catch (error) {
    console.error('خطأ في تقليل مخزون المنتج محلياً:', error);
    return null;
  }
};

// إضافة عنصر إلى قائمة المزامنة
export const addToSyncQueue = async (item: SyncQueueItem) => {
  await syncQueueStore.setItem(item.id, item);
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
      console.error(`منتج غير موجود بالمعرف: ${productId}`);
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
    console.error('خطأ في تحديث حالة مزامنة المنتج:', error);
    return null;
  }
};

// حذف منتج محلياً
export const deleteLocalProduct = async (productId: string): Promise<boolean> => {
  try {
    const product = await productsStore.getItem<LocalProduct>(productId);
    
    if (!product) {
      console.error(`منتج غير موجود بالمعرف: ${productId}`);
      return false;
    }
    
    if (product.synced) {
      // إذا كان المنتج متزامنًا، قم بإضافته إلى قائمة المزامنة للحذف
      await addToSyncQueue({
        id: uuidv4(),
        objectType: 'product',
        objectId: productId,
        operation: 'delete',
        data: { id: productId },
        attempts: 0,
        createdAt: new Date().toISOString(),
        priority: 3
      });
    } else if (product.pendingOperation === 'create') {
      // إذا كان المنتج جديدًا وغير متزامن، يمكن حذفه مباشرةً من قائمة المزامنة
      // البحث عن عناصر المزامنة المرتبطة بهذا المنتج وحذفها
      await syncQueueStore.iterate<SyncQueueItem, void>((item, key) => {
        if (item.objectId === productId) {
          syncQueueStore.removeItem(key);
        }
      });
    }
    
    // حذف المنتج من المخزن المحلي
    await productsStore.removeItem(productId);
    return true;
  } catch (error) {
    console.error('خطأ في حذف المنتج محلياً:', error);
    return false;
  }
}; 