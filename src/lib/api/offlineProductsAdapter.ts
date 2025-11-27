/**
 * offlineProductsAdapter - محول المنتجات Offline-First
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 */

import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
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
import type { LocalProduct } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';

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

// Helper للحصول على orgId
const getOrgId = (): string => {
  return localStorage.getItem('currentOrganizationId') ||
         localStorage.getItem('bazaar_organization_id') || '';
};

// تطبيع النص العربي للبحث
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

// ⚡ استخدام Delta Sync

// الحصول على جميع المنتجات المحلية
export const getLocalProducts = async (): Promise<LocalProduct[]> => {
  // ⚡ استخدام Delta Sync
  const orgId = getOrgId();
  return await deltaWriteService.getAll<LocalProduct>('products', orgId);
};

// حفظ المنتج محلياً
export const saveProductLocally = async (product: Product, synced: boolean = true): Promise<LocalProduct> => {
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

  // 🖼️ Log image data for debugging
  if ((product as any).thumbnail_image || (product as any).images) {
    console.log('🖼️ [saveProductLocally] Product INPUT has images:', {
      id: product.id,
      name: (product as any).name,
      thumbnail_image: (product as any).thumbnail_image,
      images: Array.isArray((product as any).images) ? (product as any).images.length : (product as any).images
    });
    console.log('🖼️ [saveProductLocally] localProduct BEFORE save:', {
      id: localProduct.id,
      has_thumbnail_image: !!(localProduct as any).thumbnail_image,
      thumbnail_image: (localProduct as any).thumbnail_image,
      has_images: !!(localProduct as any).images
    });
  }

  // ⚡ استخدام Delta Sync
  await deltaWriteService.saveFromServer('products', localProduct);

  if ((product as any).thumbnail_image || (product as any).images) {
    console.log('🖼️ [saveProductLocally] ✅ Product saved to DB with images');
  }

  return localProduct;
};

// حفظ مجموعة كبيرة محلياً بكفاءة
export const bulkSaveProductsLocally = async (products: Product[], synced: boolean = true): Promise<void> => {
  const now = new Date().toISOString();
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

  // 🖼️ Log products with images
  const productsWithImages = locals.filter(p => (p as any).thumbnail_image);
  if (productsWithImages.length > 0) {
    console.log(`🖼️ [bulkSaveProductsLocally] Saving ${productsWithImages.length}/${products.length} products with images`);
    console.log('🖼️ [bulkSaveProductsLocally] First product with image:', {
      id: productsWithImages[0].id,
      name: (productsWithImages[0] as any).name,
      thumbnail_image: (productsWithImages[0] as any).thumbnail_image
    });
  } else {
    console.log(`⚠️ [bulkSaveProductsLocally] No products with images found in ${products.length} products`);
  }

  // ⚡ استخدام Delta Sync - حفظ كل منتج
  for (const local of locals) {
    await deltaWriteService.saveFromServer('products', local);
  }
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
    // ✅ إنشاء UUID حقيقي بدلاً من temp_ID لتجنب أخطاء المزامنة مع Supabase
    const productId = uuidv4();
    const now = new Date().toISOString();
    const orgId = getOrgId();

    // 🔍 DEBUG: فحص بيانات الصورة الواردة
    console.log('[OfflineProductsAdapter] 🔍 DEBUG createProduct - Input productData:');
    console.log('[OfflineProductsAdapter] 🔍 thumbnail_image:', (productData as any).thumbnail_image ? `exists (${Math.round(String((productData as any).thumbnail_image).length/1024)}KB)` : 'NOT EXISTS');
    console.log('[OfflineProductsAdapter] 🔍 thumbnail_base64:', (productData as any).thumbnail_base64 ? `exists (${Math.round(String((productData as any).thumbnail_base64).length/1024)}KB)` : 'NOT EXISTS');
    console.log('[OfflineProductsAdapter] 🔍 images_base64:', (productData as any).images_base64 ? `exists (${Math.round(String((productData as any).images_base64).length/1024)}KB)` : 'NOT EXISTS');

    const newLocalProduct: LocalProduct = {
      ...productData,
      id: productId,
      organization_id: orgId,
      created_at: now,
      updated_at: now,
      synced: false,
      localUpdatedAt: now,
      name_lower: (productData as any).name ? String((productData as any).name).toLowerCase() : '',
      sku_lower: (productData as any).sku ? String((productData as any).sku).toLowerCase() : '',
      barcode_lower: (productData as any).barcode ? String((productData as any).barcode).toLowerCase() : '',
      name_search: (productData as any).name ? normalizeArabic((productData as any).name) : '',
      sku_search: (productData as any).sku ? normalizeArabic((productData as any).sku) : '',
      barcode_digits: (productData as any).barcode ? String((productData as any).barcode).replace(/\D+/g, '') : '',
      category_id: (productData as any).category_id || null,
      // ⚡ حقول الصور المحلية - نمررها مباشرة
      thumbnail_base64: (productData as any).thumbnail_base64 || null,
      images_base64: (productData as any).images_base64 || null
    } as LocalProduct;

    // 🔍 DEBUG: فحص newLocalProduct قبل الإرسال
    console.log('[OfflineProductsAdapter] 🔍 DEBUG - newLocalProduct before deltaWriteService.create:');
    console.log('[OfflineProductsAdapter] 🔍 thumbnail_base64:', (newLocalProduct as any).thumbnail_base64 ? `exists (${Math.round(String((newLocalProduct as any).thumbnail_base64).length/1024)}KB)` : 'NOT EXISTS');
    console.log('[OfflineProductsAdapter] 🔍 images_base64:', (newLocalProduct as any).images_base64 ? `exists (${Math.round(String((newLocalProduct as any).images_base64).length/1024)}KB)` : 'NOT EXISTS');

    // ⚡ استخدام Delta Sync
    await deltaWriteService.create('products', newLocalProduct, orgId);
    return newLocalProduct;
  } catch (error) {
    return null;
  }
};

// تحديث منتج محلياً
export const updateProductLocally = async (productId: string, updates: UpdateProduct): Promise<LocalProduct | null> => {
  try {
    // ⚡ استخدام Delta Sync
    const existingProduct = await deltaWriteService.get<LocalProduct>('products', productId);
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
      localUpdatedAt: new Date().toISOString(),
      name_lower: (updates as any).name ? String((updates as any).name).toLowerCase() : existingProduct.name_lower,
      sku_lower: (updates as any).sku ? String((updates as any).sku).toLowerCase() : existingProduct.sku_lower,
      barcode_lower: (updates as any).barcode ? String((updates as any).barcode).toLowerCase() : existingProduct.barcode_lower,
      name_search: (updates as any).name ? normalizeArabic((updates as any).name) : existingProduct.name_search,
      sku_search: (updates as any).sku ? normalizeArabic((updates as any).sku) : existingProduct.sku_search,
      barcode_digits: (updates as any).barcode ? String((updates as any).barcode).replace(/\D+/g, '') : existingProduct.barcode_digits,
      category_id: (updates as any).category_id || existingProduct.category_id || (existingProduct as any).category?.id || null
    };

    // ⚡ استخدام Delta Sync
    await deltaWriteService.update('products', productId, updatedLocalProduct);
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
        // ⚡ استخدام Delta Sync
        await deltaWriteService.delete('products', productId);
        return true;
      } catch (error) {
      }
    }

    // الحذف المحلي فقط
    // ⚡ استخدام Delta Sync
    await deltaWriteService.delete('products', productId);
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
          // ⚡ استخدام Delta Sync
          await deltaWriteService.delete('products', product.id);
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
    // ⚡ استخدام Delta Sync
    const orgId = organizationId || getOrgId();
    let localProducts = await deltaWriteService.getAll<LocalProduct>('products', orgId);

    // فلترة المنتجات النشطة فقط إذا لم يتم تمرير includeInactive = true
    if (!includeInactive) {
      localProducts = localProducts.filter(p => p.is_active !== false);
    }

    return localProducts;
  } catch (error) {
    return [];
  }
};

// بحث محلي فائق السرعة
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

  // ⚡ استخدام Delta Sync - جلب كل المنتجات ثم التصفية
  const allProducts = await deltaWriteService.getAll<LocalProduct>('products', organizationId);

  const resultsMap = new Map<string, LocalProduct>();

  for (const p of allProducts) {
    // تصفية حسب النشاط
    if (!includeInactive && (p as any).is_active === false) continue;
    // تصفية حسب الفئة
    if (categoryId && (p as any).category_id !== categoryId) continue;

    // بحث بالاسم أو SKU أو الباركود
    const nameLower = (p.name_lower || '');
    const skuLower = (p.sku_lower || '');
    const barcodeLower = (p.barcode_lower || '');
    const barcodeDigits = (p.barcode_digits || '');
    const nameSearch = (p.name_search || '');
    const skuSearch = (p.sku_search || '');

    if (nameLower.includes(q) || skuLower.includes(q) || barcodeLower.includes(q) ||
        nameSearch.includes(q) || skuSearch.includes(q) || barcodeDigits.includes(q.replace(/\D+/g, ''))) {
      resultsMap.set(p.id, p);
    }

    if (resultsMap.size >= limit) break;
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

  console.log('📦 [getLocalProductsPage] Querying products...', { organizationId, offset, limit, includeInactive });

  try {
    // ⚡ استخدام Delta Sync
    let allProducts = await deltaWriteService.getAll<LocalProduct>('products', organizationId);
    console.log('📦 [getLocalProductsPage] All products fetched:', { count: allProducts.length, first: allProducts[0] });

    // Filter inactive if needed
    if (!includeInactive) {
      allProducts = allProducts.filter((p: any) => p.is_active !== false);
    }

    // Filter by category if needed
    if (categoryId && categoryId !== 'all') {
      allProducts = allProducts.filter((p: any) => p.category_id === categoryId);
    }

    const total = allProducts.length;
    console.log('📦 [getLocalProductsPage] After filtering:', { count: total });

    // Sort
    const sorted = allProducts.sort((a: any, b: any) => {
      let valA: any, valB: any;
      switch (sortBy) {
        case 'name':
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
          break;
        case 'price':
          valA = a.price || 0;
          valB = b.price || 0;
          break;
        case 'stock':
          valA = a.stock_quantity || 0;
          valB = b.stock_quantity || 0;
          break;
        case 'created':
          valA = a.created_at || '';
          valB = b.created_at || '';
          break;
        default:
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
      }

      if (sortOrder === 'ASC') {
        return valA < valB ? -1 : valA > valB ? 1 : 0;
      } else {
        return valA > valB ? -1 : valA < valB ? 1 : 0;
      }
    });

    // Apply offset and limit
    const slice = sorted.slice(offset, offset + limit);
    console.log('📦 [getLocalProductsPage] After slice:', { count: slice.length, offset, limit });

    return { products: slice as any, total };
  } catch (error) {
    console.error('❌ [getLocalProductsPage] Error:', error);
    return { products: [], total: 0 };
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
  // ⚡ استخدام Delta Sync
  const allProducts = await deltaWriteService.getAll<LocalProduct>('products', organizationId);

  const totalProducts = allProducts.length;
  const activeProducts = allProducts.filter((p: any) => p.is_active !== false).length;
  const outOfStockProducts = allProducts.filter((p: any) => ((p.stock_quantity ?? 0) === 0)).length;
  const lowStockProducts = allProducts.filter((p: any) => {
    const sq = (p.stock_quantity ?? 0);
    return sq > 0 && sq <= 5;
  }).length;
  const productsWithVariants = allProducts.filter((p: any) => p.has_variants === true).length;

  // حساب عدد الفئات المميزة
  const categoriesSet = new Set(allProducts.filter((p: any) => !!p.category_id).map((p: any) => p.category_id));
  const totalCategories = categoriesSet.size;

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
    // ⚡ استخدام Delta Sync
    return await deltaWriteService.get<LocalProduct>('products', id);
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
