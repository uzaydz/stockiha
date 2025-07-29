import { supabase } from '@/lib/supabase';
import { 
  createLocalProduct,
  updateLocalProduct,
  reduceLocalProductStock,
  deleteLocalProduct,
  getLocalProducts as fetchLocalProducts
} from './localProductService';
import { synchronizeWithServer } from './syncService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Product } from './productService';
import { LocalProduct } from '@/database/localDb';

/**
 * خدمة المنتجات المُوحدة (Offline-First)
 * تقوم بالتعامل مع البيانات المحلية والبعيدة بشكل موحد
 */

// التحقق من حالة الاتصال
const isOnline = (): boolean => {
  return navigator.onLine;
};

// جلب المنتجات - تجمع بين المحلي والبعيد
export const getProducts = async (organizationId: string): Promise<LocalProduct[]> => {
  try {
    // محاولة مزامنة أولاً إذا كان متصلاً
    if (isOnline()) {
      try {
        await synchronizeWithServer();
      } catch (error) {
      }
    }

    // استخدام البيانات المحلية بغض النظر عن حالة الاتصال
    const products = await fetchLocalProducts();
    
    // تصفية حسب المؤسسة
    return products.filter(product => product.organization_id === organizationId);
    
  } catch (error) {
    throw error;
  }
};

// جلب منتج واحد بواسطة المعرف
export const getProductById = async (organizationId: string, productId: string): Promise<LocalProduct | null> => {
  try {
    const products = await fetchLocalProducts();
    return products.find(p => p.id === productId && p.organization_id === organizationId) || null;
  } catch (error) {
    throw error;
  }
};

// إنشاء منتج جديد
export const createProduct = async (
  organizationId: string, 
  product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'organization_id'>
): Promise<LocalProduct> => {
  try {
    // إنشاء المنتج محلياً أولاً
    const newProduct = await createLocalProduct(organizationId, {
      ...product,
      organization_id: organizationId
    });
    
    // محاولة المزامنة إذا كان متصلاً
    if (isOnline()) {
      try {
        await synchronizeWithServer();
      } catch (error) {
      }
    }
    
    return newProduct;
  } catch (error) {
    throw error;
  }
};

// تحديث منتج موجود
export const updateProduct = async (
  organizationId: string, 
  productId: string, 
  updates: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'organization_id'>>
): Promise<LocalProduct | null> => {
  try {
    // تحديث المنتج محلياً أولاً
    const updatedProduct = await updateLocalProduct(productId, updates);
    
    if (!updatedProduct) {
      throw new Error(`لم يتم العثور على المنتج بالمعرف: ${productId}`);
    }
    
    // محاولة المزامنة إذا كان متصلاً
    if (isOnline()) {
      try {
        await synchronizeWithServer();
      } catch (error) {
      }
    }
    
    return updatedProduct;
  } catch (error) {
    throw error;
  }
};

// حذف منتج
export const deleteProduct = async (organizationId: string, productId: string): Promise<boolean> => {
  try {
    // التحقق من أن المنتج ينتمي للمؤسسة الصحيحة
    const product = await getProductById(organizationId, productId);
    
    if (!product) {
      throw new Error(`لم يتم العثور على المنتج بالمعرف: ${productId}`);
    }
    
    // حذف المنتج محلياً
    const result = await deleteLocalProduct(productId);
    
    // محاولة المزامنة إذا كان متصلاً
    if (isOnline()) {
      try {
        await synchronizeWithServer();
      } catch (error) {
      }
    }
    
    return result;
  } catch (error) {
    throw error;
  }
};

// تحديث كمية المخزون (مثلاً عند البيع)
export const updateProductStock = async (
  organizationId: string, 
  productId: string, 
  quantity: number, 
  isReduction: boolean = true
): Promise<LocalProduct | null> => {
  try {
    const product = await getProductById(organizationId, productId);
    
    if (!product) {
      throw new Error(`لم يتم العثور على المنتج بالمعرف: ${productId}`);
    }
    
    let updatedProduct: LocalProduct | null = null;
    
    if (isReduction) {
      // تقليل المخزون
      updatedProduct = await reduceLocalProductStock(productId, Math.abs(quantity));
    } else {
      // زيادة المخزون
      const newQuantity = product.stock_quantity + Math.abs(quantity);
      updatedProduct = await updateLocalProduct(productId, { 
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString()
      });
    }
    
    // محاولة المزامنة إذا كان متصلاً
    if (isOnline()) {
      try {
        await synchronizeWithServer();
      } catch (error) {
      }
    }
    
    return updatedProduct;
  } catch (error) {
    throw error;
  }
};

// تحديث حالة المزامنة اليدوية
export const forceSynchronization = async (): Promise<boolean> => {
  try {
    if (!isOnline()) {
      throw new Error('لا يمكن المزامنة لأن الجهاز غير متصل بالإنترنت');
    }
    
    return await synchronizeWithServer();
  } catch (error) {
    throw error;
  }
};
