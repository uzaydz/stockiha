import { supabase } from '@/lib/supabase';
import { getProducts as fetchOnlineProducts, getProductById as fetchOnlineProductById, createProduct as createOnlineProduct, updateProduct as updateOnlineProduct, deleteProduct as deleteOnlineProduct } from '@/lib/api/products';
import { 
  getProducts as fetchLocalProducts, 
  getProductById as fetchLocalProductById, 
  createProduct as createLocalProduct, 
  updateProduct as updateLocalProduct, 
  deleteProduct as deleteLocalProduct, 
  updateProductStock as localUpdateProductStock,
  forceSynchronization 
} from '@/api/offlineProductService';
import { LocalProduct } from '@/database/localDb';
import type { Product, InsertProduct, UpdateProduct, WholesaleTier } from '@/lib/api/products';

// المعرف الافتراضي للمؤسسة إذا لم يتم تمريره (يمكن تعديله حسب احتياجك)
const DEFAULT_ORG_ID = "default-organization-id";

/**
 * خدمة المنتجات بنمط Offline-First
 * --------------------------------
 * تدمج بين الواجهات البرمجية الحالية والخدمة المحلية
 * للسماح بالعمل بدون إنترنت مع المزامنة التلقائية
 */

// التحقق من حالة الاتصال
const isOnline = (): boolean => {
  return navigator.onLine;
};

// تحويل LocalProduct إلى Product للتوافق مع الواجهة البرمجية القديمة
const convertLocalProductToProduct = (localProduct: LocalProduct): Product => {
  // استخراج الحقول الخاصة بنظام المزامنة
  const { synced, syncStatus, lastSyncAttempt, localUpdatedAt, pendingOperation, conflictResolution, ...product } = localProduct;
  return product as unknown as Product;
};

// تحويل مصفوفة من LocalProduct إلى مصفوفة Product للتوافق
const convertLocalProductsToProducts = (localProducts: LocalProduct[]): Product[] => {
  return localProducts.map(convertLocalProductToProduct);
};

/**
 * جلب قائمة المنتجات
 */
export const getProducts = async (organizationId?: string, includeInactive: boolean = false): Promise<Product[]> => {
  if (!organizationId) {
    console.error("لم يتم تمرير معرف المؤسسة إلى وظيفة getProducts");
    return [];
  }

  try {
    // محاولة المزامنة إذا كان متصلاً بالإنترنت
    if (isOnline()) {
      try {
        await forceSynchronization();
      } catch (error) {
        console.warn('فشلت محاولة المزامنة التلقائية عند جلب المنتجات:', error);
      }

      // استرجاع البيانات من نظام التخزين المحلي
      const localProducts = await fetchLocalProducts(organizationId);
      
      // فلترة المنتجات النشطة فقط إذا كان includeInactive = false
      const filteredProducts = includeInactive ? 
        localProducts : 
        localProducts.filter(p => p.is_active !== false);
        
      // إرجاع نسخة متوافقة مع الواجهة البرمجية القديمة
      return convertLocalProductsToProducts(filteredProducts);
    } else {
      // في وضع عدم الاتصال، استخدم البيانات المحلية فقط
      const localProducts = await fetchLocalProducts(organizationId);
      
      // فلترة المنتجات النشطة فقط إذا كان includeInactive = false
      const filteredProducts = includeInactive ? 
        localProducts : 
        localProducts.filter(p => p.is_active !== false);
      
      // تمييز المنتجات غير المتزامنة في وحدة التحكم للتصحيح
      const unsyncedCount = filteredProducts.filter(p => !p.synced).length;
      if (unsyncedCount > 0) {
        console.info(`هناك ${unsyncedCount} منتج غير متزامن من إجمالي ${filteredProducts.length}`);
      }
      
      return convertLocalProductsToProducts(filteredProducts);
    }
  } catch (error) {
    console.error('خطأ في جلب المنتجات:', error);
    
    // محاولة استرجاع البيانات من Supabase كحل احتياطي إذا كان متصلاً
    if (isOnline()) {
      try {
        return await fetchOnlineProducts(organizationId, includeInactive);
      } catch (onlineError) {
        console.error('فشل الحل الاحتياطي لجلب المنتجات من الخادم:', onlineError);
        return [];
      }
    }
    
    return [];
  }
};

/**
 * جلب منتج واحد بواسطة المعرف
 */
export const getProductById = async (productId: string, organizationId?: string): Promise<Product | null> => {
  try {
    // محاولة المزامنة إذا كان متصلاً بالإنترنت
    if (isOnline()) {
      try {
        await forceSynchronization();
      } catch (error) {
        console.warn('فشلت محاولة المزامنة التلقائية عند جلب المنتج:', error);
      }
    }

    // استرجاع البيانات من نظام التخزين المحلي
    let localProduct = null;
    
    if (organizationId) {
      localProduct = await fetchLocalProductById(organizationId, productId);
    } else {
      // إذا لم يتم تمرير معرف المؤسسة، ابحث عن المنتج في جميع المؤسسات
      const allProducts = await fetchLocalProducts(DEFAULT_ORG_ID);
      localProduct = allProducts.find(p => p.id === productId);
    }
    
    if (localProduct) {
      return convertLocalProductToProduct(localProduct);
    }
    
    // إذا لم يوجد محلياً ولكن متصل بالإنترنت، جرب الاسترجاع من Supabase
    if (isOnline()) {
      return await fetchOnlineProductById(productId);
    }
    
    return null;
  } catch (error) {
    console.error(`خطأ في جلب المنتج ${productId}:`, error);
    
    // محاولة استرجاع البيانات من Supabase كحل احتياطي إذا كان متصلاً
    if (isOnline()) {
      try {
        return await fetchOnlineProductById(productId);
      } catch (onlineError) {
        console.error('فشل الحل الاحتياطي لجلب المنتج من الخادم:', onlineError);
        return null;
      }
    }
    
    return null;
  }
};

/**
 * إنشاء منتج جديد
 */
export const createProduct = async (productData: InsertProduct): Promise<Product | null> => {
  try {
    if (!productData.organization_id) {
      throw new Error('معرف المؤسسة مطلوب لإنشاء منتج جديد');
    }
    
    // إنشاء المنتج محلياً أولاً
    const newLocalProduct = await createLocalProduct(productData.organization_id, productData);
    
    // محاولة المزامنة إذا كان متصلاً بالإنترنت
    if (isOnline()) {
      try {
        await forceSynchronization();
      } catch (error) {
        console.warn('فشلت محاولة المزامنة بعد إنشاء المنتج:', error);
      }
    }
    
    // إرجاع نسخة متوافقة مع الواجهة البرمجية القديمة
    return convertLocalProductToProduct(newLocalProduct);
  } catch (error) {
    console.error('خطأ في إنشاء المنتج:', error);
    
    // إذا كان متصلاً، حاول إنشاء المنتج مباشرة في Supabase كإجراء احتياطي
    if (isOnline()) {
      try {
        return await createOnlineProduct(productData);
      } catch (onlineError) {
        console.error('فشل الحل الاحتياطي لإنشاء المنتج على الخادم:', onlineError);
        return null;
      }
    }
    
    return null;
  }
};

/**
 * تحديث منتج موجود
 */
export const updateProduct = async (productId: string, updates: UpdateProduct): Promise<Product | null> => {
  try {
    // العثور على المنتج محلياً أولاً
    const allProducts = await fetchLocalProducts(DEFAULT_ORG_ID);
    const existingProduct = allProducts.find(p => p.id === productId);
    
    if (!existingProduct) {
      throw new Error(`لم يتم العثور على المنتج بالمعرف: ${productId}`);
    }
    
    // تحديث المنتج محلياً
    const updatedLocalProduct = await updateLocalProduct(existingProduct.organization_id, productId, updates);
    
    // محاولة المزامنة إذا كان متصلاً بالإنترنت
    if (isOnline()) {
      try {
        await forceSynchronization();
      } catch (error) {
        console.warn('فشلت محاولة المزامنة بعد تحديث المنتج:', error);
      }
    }
    
    if (updatedLocalProduct) {
      return convertLocalProductToProduct(updatedLocalProduct);
    }
    
    // إذا فشل التحديث المحلي، جرب التحديث المباشر في Supabase إذا كان متصلاً
    if (isOnline()) {
      return await updateOnlineProduct(productId, updates);
    }
    
    return null;
  } catch (error) {
    console.error(`خطأ في تحديث المنتج ${productId}:`, error);
    
    // إذا كان متصلاً، حاول تحديث المنتج مباشرة في Supabase كإجراء احتياطي
    if (isOnline()) {
      try {
        return await updateOnlineProduct(productId, updates);
      } catch (onlineError) {
        console.error('فشل الحل الاحتياطي لتحديث المنتج على الخادم:', onlineError);
        return null;
      }
    }
    
    return null;
  }
};

/**
 * حذف منتج
 */
export const deleteProduct = async (productId: string): Promise<boolean> => {
  try {
    // العثور على المنتج محلياً أولاً
    const allProducts = await fetchLocalProducts(DEFAULT_ORG_ID);
    const existingProduct = allProducts.find(p => p.id === productId);
    
    if (!existingProduct) {
      throw new Error(`لم يتم العثور على المنتج بالمعرف: ${productId}`);
    }
    
    // حذف المنتج محلياً
    const result = await deleteLocalProduct(existingProduct.organization_id, productId);
    
    // محاولة المزامنة إذا كان متصلاً بالإنترنت
    if (isOnline()) {
      try {
        await forceSynchronization();
      } catch (error) {
        console.warn('فشلت محاولة المزامنة بعد حذف المنتج:', error);
      }
    }
    
    return result;
  } catch (error) {
    console.error(`خطأ في حذف المنتج ${productId}:`, error);
    
    // إذا كان متصلاً، حاول حذف المنتج مباشرة من Supabase كإجراء احتياطي
    if (isOnline()) {
      try {
        await deleteOnlineProduct(productId);
        return true;
      } catch (onlineError) {
        console.error('فشل الحل الاحتياطي لحذف المنتج من الخادم:', onlineError);
        return false;
      }
    }
    
    return false;
  }
};

/**
 * تحديث كمية المخزون للمنتج
 */
export const updateProductStock = async (
  productId: string, 
  quantity: number, 
  isReduction: boolean = true
): Promise<Product | null> => {
  try {
    // العثور على المنتج محلياً أولاً
    const allProducts = await fetchLocalProducts(DEFAULT_ORG_ID);
    const existingProduct = allProducts.find(p => p.id === productId);
    
    if (!existingProduct) {
      throw new Error(`لم يتم العثور على المنتج بالمعرف: ${productId}`);
    }
    
    // تحديث كمية المخزون محلياً
    let updatedLocalProduct = null;
    
    if (isReduction) {
      updatedLocalProduct = await localUpdateProductStock(existingProduct.organization_id, productId, quantity, isReduction);
    } else {
      const newQuantity = existingProduct.stock_quantity + quantity;
      // استخدام الحقول المدعومة فقط في نوع التحديث
      updatedLocalProduct = await updateLocalProduct(existingProduct.organization_id, productId, { 
        stock_quantity: newQuantity
      });
    }
    
    // محاولة المزامنة إذا كان متصلاً بالإنترنت
    if (isOnline()) {
      try {
        await forceSynchronization();
      } catch (error) {
        console.warn('فشلت محاولة المزامنة بعد تحديث المخزون:', error);
      }
    }
    
    if (updatedLocalProduct) {
      return convertLocalProductToProduct(updatedLocalProduct);
    }
    
    return null;
  } catch (error) {
    console.error(`خطأ في تحديث مخزون المنتج ${productId}:`, error);
    
    // في حالة الاتصال، حاول تحديث الكمية مباشرة في Supabase
    if (isOnline()) {
      try {
        const product = await fetchOnlineProductById(productId);
        if (product) {
          const newQuantity = isReduction 
            ? product.stock_quantity - quantity 
            : product.stock_quantity + quantity;
            
          // استخدام الحقول المدعومة فقط في واجهة updateOnlineProduct
          return await updateOnlineProduct(productId, { 
            stock_quantity: newQuantity
          });
        }
      } catch (onlineError) {
        console.error('فشل الحل الاحتياطي لتحديث المخزون على الخادم:', onlineError);
      }
    }
    
    return null;
  }
}; 