import { supabase } from '@/lib/supabase';
import {
  getProducts as onlineGetProducts,
  getProductById as onlineGetProductById,
  createProduct as onlineCreateProduct,
  updateProduct as onlineUpdateProduct,
  deleteProduct as onlineDeleteProduct,
  type Product,
  type InsertProduct,
  type UpdateProduct
} from '@/lib/api/products';

/**
 * محول لربط خدمة المنتجات التقليدية بخدمة Offline-First
 * ------------------------------------------------------
 * يقوم بتوجيه الطلبات إلى الخدمة المناسبة بناءً على حالة الاتصال
 * ويضيف علامات على المنتجات غير المتزامنة
 */

// استيراد مخزن المنتجات المحلي من localForage
import localforage from 'localforage';

// التحقق من حالة الاتصال بالإنترنت
const isOnline = (): boolean => {
  return navigator.onLine;
};

// إنشاء مخزن البيانات المحلي
const productsStore = localforage.createInstance({
  name: 'bazaar-products',
  storeName: 'products'
});

// نموذج المنتج المحلي
interface LocalProduct extends Product {
  synced: boolean;
  localUpdatedAt: string;
  is_active?: boolean;
}

// الحصول على جميع المنتجات المحلية
export const getLocalProducts = async (): Promise<LocalProduct[]> => {
  const products: LocalProduct[] = [];
  await productsStore.iterate<LocalProduct, void>((product) => {
    products.push(product);
  });
  return products;
};

// حفظ المنتج محلياً
export const saveProductLocally = async (product: Product, synced: boolean = true): Promise<LocalProduct> => {
  const localProduct: LocalProduct = {
    ...product,
    synced,
    localUpdatedAt: new Date().toISOString()
  };
  await productsStore.setItem(product.id, localProduct);
  return localProduct;
};

// إضافة منتج جديد محلياً
export const addProductLocally = async (productData: InsertProduct): Promise<LocalProduct | null> => {
  try {
    // محاولة الإضافة عبر الإنترنت أولاً إذا كان متصلاً
    if (isOnline()) {
      const newProduct = await onlineCreateProduct(productData);
      if (newProduct) {
        return await saveProductLocally(newProduct);
      }
    }
    
    // إذا لم يكن متصلاً أو فشلت العملية عبر الإنترنت
    // قم بإنشاء معرف مؤقت وحفظ البيانات محلياً
    const tempId = 'temp_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const now = new Date().toISOString();
    
    const newLocalProduct: LocalProduct = {
      ...productData,
      id: tempId,
      created_at: now,
      updated_at: now,
      synced: false,
      localUpdatedAt: now
    } as LocalProduct;
    
    await productsStore.setItem(tempId, newLocalProduct);
    return newLocalProduct;
  } catch (error) {
    return null;
  }
};

// تحديث منتج محلياً
export const updateProductLocally = async (productId: string, updates: UpdateProduct): Promise<LocalProduct | null> => {
  try {
    const existingProduct = await productsStore.getItem<LocalProduct>(productId);
    if (!existingProduct) {
      return null;
    }
    
    // محاولة التحديث عبر الإنترنت أولاً إذا كان متصلاً
    if (isOnline() && !productId.startsWith('temp_')) {
      try {
        const updatedProduct = await onlineUpdateProduct(productId, updates);
        if (updatedProduct) {
          return await saveProductLocally(updatedProduct);
        }
      } catch (error) {
      }
    }
    
    // التحديث المحلي
    const updatedLocalProduct: LocalProduct = {
      ...existingProduct,
      ...updates,
      updated_at: new Date().toISOString(),
      synced: isOnline() && !productId.startsWith('temp_'),
      localUpdatedAt: new Date().toISOString()
    };
    
    await productsStore.setItem(productId, updatedLocalProduct);
    return updatedLocalProduct;
  } catch (error) {
    return null;
  }
};

// حذف منتج محلياً
export const deleteProductLocally = async (productId: string): Promise<boolean> => {
  try {
    // محاولة الحذف عبر الإنترنت أولاً إذا كان متصلاً
    if (isOnline() && !productId.startsWith('temp_')) {
      try {
        await onlineDeleteProduct(productId);
        await productsStore.removeItem(productId);
        return true;
      } catch (error) {
      }
    }
    
    // الحذف المحلي فقط
    await productsStore.removeItem(productId);
    return true;
  } catch (error) {
    return false;
  }
};

// مزامنة المنتجات المحلية مع الخادم
export const syncLocalProducts = async (): Promise<{ success: number; failed: number }> => {
  if (!isOnline()) {
    return { success: 0, failed: 0 };
  }
  
  let success = 0;
  let failed = 0;
  
  const localProducts = await getLocalProducts();
  const unsyncedProducts = localProducts.filter(p => !p.synced);
  
  for (const product of unsyncedProducts) {
    try {
      // إذا كان معرف المنتج مؤقتاً، قم بإنشاء منتج جديد
      if (product.id.startsWith('temp_')) {
        // استخراج بيانات المنتج للإرسال
        const { id, synced, localUpdatedAt, created_at, updated_at, ...productData } = product;
        
        // إنشاء المنتج على الخادم
        const newProduct = await onlineCreateProduct(productData as InsertProduct);
        
        if (newProduct) {
          // حفظ المنتج الجديد محلياً
          await saveProductLocally(newProduct);
          
          // حذف النسخة المؤقتة
          await productsStore.removeItem(product.id);
          success++;
        } else {
          failed++;
        }
      } 
      // إذا لم يكن معرف المنتج مؤقتاً، قم بتحديثه
      else {
        // استخراج بيانات التحديث
        const { synced, localUpdatedAt, ...productData } = product;
        
        // تحديث المنتج على الخادم
        const updatedProduct = await onlineUpdateProduct(product.id, productData);
        
        if (updatedProduct) {
          // تحديث المنتج محلياً وتعيين حالة المزامنة
          await saveProductLocally(updatedProduct);
          success++;
        } else {
          failed++;
        }
      }
    } catch (error) {
      failed++;
    }
  }
  
  return { success, failed };
};

// الواجهة البرمجية الخارجية - متوافقة مع الواجهة القديمة
// ----------------------------------------------------

/**
 * جلب قائمة المنتجات
 */
export const getProducts = async (organizationId?: string, includeInactive: boolean = false): Promise<Product[]> => {
  try {
    // محاولة جلب المنتجات عبر الإنترنت أولاً إذا كان متصلاً
    if (isOnline()) {
      try {
        const onlineProducts = await onlineGetProducts(organizationId, includeInactive);
        
        // حفظ المنتجات محلياً للوصول إليها دون اتصال
        for (const product of onlineProducts) {
          await saveProductLocally(product);
        }
        
        return onlineProducts;
      } catch (error) {
      }
    }
    
    // جلب المنتجات المحلية
    let localProducts = await getLocalProducts();
    
    // تصفية حسب المؤسسة إذا تم تمرير معرف المؤسسة
    if (organizationId) {
      localProducts = localProducts.filter(p => (p as any).organization_id === organizationId);
    }
    
    // فلترة المنتجات النشطة فقط إذا لم يتم تمرير includeInactive = true
    if (!includeInactive) {
      localProducts = localProducts.filter(p => p.is_active !== false);
    }
    
    return localProducts;
  } catch (error) {
    return [];
  }
};

/**
 * جلب منتج بواسطة المعرف
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    // محاولة جلب المنتج عبر الإنترنت أولاً إذا كان متصلاً
    if (isOnline() && !id.startsWith('temp_')) {
      try {
        const onlineProduct = await onlineGetProductById(id);
        
        if (onlineProduct) {
          // حفظ المنتج محلياً للوصول إليه دون اتصال
          await saveProductLocally(onlineProduct);
          return onlineProduct;
        }
      } catch (error) {
      }
    }
    
    // جلب المنتج محلياً
    return await productsStore.getItem<LocalProduct>(id);
  } catch (error) {
    return null;
  }
};

/**
 * إنشاء منتج جديد
 */
export const createProduct = async (productData: InsertProduct): Promise<Product | null> => {
  try {
    // محاولة إنشاء المنتج عبر الإنترنت أولاً إذا كان متصلاً
    if (isOnline()) {
      try {
        const newProduct = await onlineCreateProduct(productData);
        
        if (newProduct) {
          // حفظ المنتج محلياً للوصول إليه دون اتصال
          await saveProductLocally(newProduct);
          return newProduct;
        }
      } catch (error) {
      }
    }
    
    // إنشاء المنتج محلياً إذا لم يكن متصلاً أو فشلت العملية عبر الإنترنت
    return await addProductLocally(productData);
  } catch (error) {
    return null;
  }
};

/**
 * تحديث منتج موجود
 */
export const updateProduct = async (id: string, updates: UpdateProduct): Promise<Product | null> => {
  try {
    return await updateProductLocally(id, updates);
  } catch (error) {
    return null;
  }
};

/**
 * حذف منتج
 */
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    await deleteProductLocally(id);
  } catch (error) {
  }
};

/**
 * تحديث حالة المزامنة
 */
export const syncProducts = async (): Promise<{ success: number; failed: number }> => {
  if (!isOnline()) {
    return { success: 0, failed: 0 };
  }
  
  try {
    return await syncLocalProducts();
  } catch (error) {
    return { success: 0, failed: 0 };
  }
};
