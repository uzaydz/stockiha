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
import { inventoryDB, type LocalProduct } from '@/database/localDb';

/**
 * محول لربط خدمة المنتجات التقليدية بخدمة Offline-First
 * ------------------------------------------------------
 * يقوم بتوجيه الطلبات إلى الخدمة المناسبة بناءً على حالة الاتصال
 * ويضيف علامات على المنتجات غير المتزامنة
 */

// التحقق من حالة الاتصال بالإنترنت
const isOnline = (): boolean => {
  return navigator.onLine;
};

// الاعتماد على Dexie عبر inventoryDB.products كمصدر وحيد

// الحصول على جميع المنتجات المحلية
export const getLocalProducts = async (): Promise<LocalProduct[]> => {
  return await inventoryDB.products.toArray();
};

// حفظ المنتج محلياً
export const saveProductLocally = async (product: Product, synced: boolean = true): Promise<LocalProduct> => {
  const normalizeArabic = (s: string) => {
    try {
      let t = (s || '').toString().toLowerCase();
      t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
      t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
      t = t.replace(/\u0624/g, '\u0648');
      t = t.replace(/\u0626/g, '\u064a');
      t = t.replace(/\u0629/g, '\u0647');
      t = t.replace(/\u0649/g, '\u064a');
      t = t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ');
      t = t.replace(/\s+/g, ' ').trim();
      return t;
    } catch {
      return (s || '').toString().toLowerCase();
    }
  };
  const localProduct: LocalProduct = {
    ...product,
    synced,
    localUpdatedAt: new Date().toISOString(),
    name_lower: (product as any).name ? String((product as any).name).toLowerCase() : '',
    sku_lower: (product as any).sku ? String((product as any).sku).toLowerCase() : '',
    barcode_lower: (product as any).barcode ? String((product as any).barcode).toLowerCase() : '',
    name_search: (product as any).name ? normalizeArabic((product as any).name) : '',
    sku_search: (product as any).sku ? normalizeArabic((product as any).sku) : '',
    barcode_digits: (product as any).barcode ? String((product as any).barcode).replace(/\D+/g, '') : '',
    category_id: (product as any).category_id || (product as any).category?.id || null
  };
  await inventoryDB.products.put(localProduct as any);
  return localProduct;
};

// حفظ مجموعة كبيرة محلياً بكفاءة
export const bulkSaveProductsLocally = async (products: Product[], synced: boolean = true): Promise<void> => {
  const now = new Date().toISOString();
  const normalizeArabic = (s: string) => {
    try {
      let t = (s || '').toString().toLowerCase();
      t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
      t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
      t = t.replace(/\u0624/g, '\u0648');
      t = t.replace(/\u0626/g, '\u064a');
      t = t.replace(/\u0629/g, '\u0647');
      t = t.replace(/\u0649/g, '\u064a');
      t = t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ');
      t = t.replace(/\s+/g, ' ').trim();
      return t;
    } catch {
      return (s || '').toString().toLowerCase();
    }
  };
  const locals: LocalProduct[] = products.map((p) => ({
    ...(p as any),
    synced,
    localUpdatedAt: now,
    name_lower: (p as any).name ? String((p as any).name).toLowerCase() : '',
    sku_lower: (p as any).sku ? String((p as any).sku).toLowerCase() : '',
    barcode_lower: (p as any).barcode ? String((p as any).barcode).toLowerCase() : '',
    name_search: (p as any).name ? normalizeArabic((p as any).name) : '',
    sku_search: (p as any).sku ? normalizeArabic((p as any).sku) : '',
    barcode_digits: (p as any).barcode ? String((p as any).barcode).replace(/\D+/g, '') : '',
    category_id: (p as any).category_id || (p as any).category?.id || null
  }));
  await inventoryDB.transaction('rw', inventoryDB.products, async () => {
    await inventoryDB.products.bulkPut(locals as any[]);
  });
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
    
    await inventoryDB.products.put(newLocalProduct as any);
    return newLocalProduct;
  } catch (error) {
    return null;
  }
};

// تحديث منتج محلياً
export const updateProductLocally = async (productId: string, updates: UpdateProduct): Promise<LocalProduct | null> => {
  try {
    const existingProduct = await inventoryDB.products.get(productId) as LocalProduct | undefined;
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
    const normalizeArabic = (s: string) => {
      try {
        let t = (s || '').toString().toLowerCase();
        t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
        t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
        t = t.replace(/\u0624/g, '\u0648');
        t = t.replace(/\u0626/g, '\u064a');
        t = t.replace(/\u0629/g, '\u0647');
        t = t.replace(/\u0649/g, '\u064a');
        t = t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ');
        t = t.replace(/\s+/g, ' ').trim();
        return t;
      } catch {
        return (s || '').toString().toLowerCase();
      }
    };
    const updatedLocalProduct: LocalProduct = {
      ...existingProduct,
      ...updates,
      updated_at: new Date().toISOString(),
      synced: isOnline() && !productId.startsWith('temp_'),
      localUpdatedAt: new Date().toISOString(),
      name_lower: (updates as any).name ? String((updates as any).name).toLowerCase() : existingProduct.name_lower,
      sku_lower: (updates as any).sku ? String((updates as any).sku).toLowerCase() : existingProduct.sku_lower,
      barcode_lower: (updates as any).barcode ? String((updates as any).barcode).toLowerCase() : existingProduct.barcode_lower,
      name_search: (updates as any).name ? normalizeArabic((updates as any).name) : existingProduct.name_search,
      sku_search: (updates as any).sku ? normalizeArabic((updates as any).sku) : existingProduct.sku_search,
      barcode_digits: (updates as any).barcode ? String((updates as any).barcode).replace(/\D+/g, '') : existingProduct.barcode_digits,
      category_id: (updates as any).category_id || existingProduct.category_id || (existingProduct as any).category?.id || null
    };

    await inventoryDB.products.put(updatedLocalProduct as any);
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
        await inventoryDB.products.delete(productId);
        return true;
      } catch (error) {
      }
    }
    
    // الحذف المحلي فقط
    await inventoryDB.products.delete(productId);
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
          await inventoryDB.products.delete(product.id);
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
        
        // حفظ المنتجات محلياً (bulk) للوصول إليها دون اتصال
        try {
          await bulkSaveProductsLocally(onlineProducts);
        } catch {}
        
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

// بحث محلي فائق السرعة باستخدام الفهارس
export const fastSearchLocalProducts = async (
  organizationId: string,
  query: string,
  limitOrOptions: number | { limit?: number; includeInactive?: boolean; categoryId?: string } = 200
): Promise<LocalProduct[]> => {
  const q = (query || '').toLowerCase();
  if (!q) return [];
  const options = typeof limitOrOptions === 'number' ? { limit: limitOrOptions } : limitOrOptions;
  const limit = options.limit ?? 200;
  const includeInactive = options.includeInactive ?? false;
  const categoryId = options.categoryId;

  const resultsMap = new Map<string, LocalProduct>();
  // بحث بالاسم
  const nameMatches = await inventoryDB.products
    .where('[organization_id+name_lower]')
    .between([organizationId, q], [organizationId, q + '\uffff'])
    .limit(limit)
    .toArray();
  nameMatches.forEach((p: any) => {
    if ((includeInactive || p.is_active !== false) && (!categoryId || p.category_id === categoryId)) {
      resultsMap.set(p.id as any, p as any);
    }
  });

  // بحث بالـ SKU
  if (resultsMap.size < limit) {
    const skuMatches = await inventoryDB.products
      .where('[organization_id+sku_lower]')
      .between([organizationId, q], [organizationId, q + '\uffff'])
      .limit(limit - resultsMap.size)
      .toArray();
    skuMatches.forEach((p: any) => {
      if ((includeInactive || p.is_active !== false) && (!categoryId || p.category_id === categoryId)) {
        resultsMap.set(p.id as any, p as any);
      }
    });
  }

  // بحث بالباركود النصي
  if (resultsMap.size < limit) {
    const barcodeMatches = await inventoryDB.products
      .where('[organization_id+barcode_lower]')
      .between([organizationId, q], [organizationId, q + '\uffff'])
      .limit(limit - resultsMap.size)
      .toArray();
    barcodeMatches.forEach((p: any) => {
      if ((includeInactive || p.is_active !== false) && (!categoryId || p.category_id === categoryId)) {
        resultsMap.set(p.id as any, p as any);
      }
    });
  }

  // بحث رقمي للباركود إن أمكن
  const digits = q.replace(/\D+/g, '');
  if (digits && resultsMap.size < limit) {
    const digitMatches = await inventoryDB.products
      .where('[organization_id+barcode_digits]')
      .between([organizationId, digits], [organizationId, digits + '\uffff'])
      .limit(limit - resultsMap.size)
      .toArray();
    digitMatches.forEach((p: any) => {
      if ((includeInactive || p.is_active !== false) && (!categoryId || p.category_id === categoryId)) {
        resultsMap.set(p.id as any, p as any);
      }
    });
  }

  return Array.from(resultsMap.values()).slice(0, limit);
};

// تصفح محلي سريع بالصفحات (Offset/Limit)
export async function getLocalProductsPage(
  organizationId: string,
  options: {
    offset?: number;
    limit?: number;
    includeInactive?: boolean;
    categoryId?: string | 'all' | null;
    sortBy?: 'name' | 'price' | 'stock' | 'created';
    sortOrder?: 'ASC' | 'DESC';
  } = {}
): Promise<{ products: LocalProduct[]; total: number }> {
  const {
    offset = 0,
    limit = 50,
    includeInactive = true,
    categoryId = null,
    sortBy = 'name',
    sortOrder = 'ASC'
  } = options;

  // الحالة الافتراضية: ترتيب بالاسم باستخدام فهرس [organization_id+name_lower]
  if (!categoryId || categoryId === 'all') {
    let coll = inventoryDB.products
      .where('[organization_id+name_lower]')
      .between([organizationId, ''], [organizationId, '\uffff']);
    if (!includeInactive) {
      coll = coll.and((p: any) => p.is_active !== false);
    }
    const total = await coll.count();
    const slice = await coll.offset(offset).limit(limit).toArray();
    // لا نغير الترتيب كي نحافظ على ترتيب الفهرس
    return { products: slice as any, total };
  }

  // عند تحديد فئة: استخدام فهرس مرتب بالاسم داخل الفئة عند فرز الاسم
  if (sortBy === 'name') {
    let coll2 = inventoryDB.products
      .where('[organization_id+category_id+name_lower]')
      .between([organizationId, categoryId as string, ''], [organizationId, categoryId as string, '\uffff']);
    if (!includeInactive) {
      coll2 = coll2.and((p: any) => p.is_active !== false);
    }
    const total2 = await coll2.count();
    const slice2 = await coll2.offset(offset).limit(limit).toArray();
    return { products: slice2 as any, total: total2 };
  } else {
    // فallback: باستخدام فهرس الفئة فقط ثم تقطيع
    let coll = inventoryDB.products
      .where('[organization_id+category_id]')
      .equals([organizationId, categoryId as string]);
    if (!includeInactive) {
      coll = coll.and((p: any) => p.is_active !== false);
    }
    const total = await coll.count();
    const slice = await coll.offset(offset).limit(limit).toArray();
    return { products: slice as any, total };
  }
}

// إحصاءات محلية سريعة
export async function getLocalProductStats(organizationId: string): Promise<{
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  productsWithVariants: number;
  totalCategories: number;
}> {
  const base = inventoryDB.products.where('organization_id').equals(organizationId);
  const totalProducts = await base.count();
  const activeProducts = await base.and((p: any) => p.is_active !== false).count();
  const outOfStockProducts = await base.and((p: any) => ((p.stock_quantity ?? 0) === 0)).count();
  const lowStockProducts = await base.and((p: any) => {
    const sq = (p.stock_quantity ?? 0);
    return sq > 0 && sq <= 5;
  }).count();
  const productsWithVariants = await base.and((p: any) => p.has_variants === true).count();
  // حساب عدد الفئات المميزة (قد يكون مكلفاً قليلاً لكنه محلي)
  const cats = await base.and((p: any) => !!p.category_id).toArray();
  const totalCategories = new Set((cats as any[]).map((p) => p.category_id)).size;

  return {
    totalProducts,
    activeProducts,
    lowStockProducts,
    outOfStockProducts,
    productsWithVariants,
    totalCategories
  };
}

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
    return (await inventoryDB.products.get(id)) as any;
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
