/**
 * localProductService - خدمة المنتجات المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 *
 * - Local-First: الكتابة محلياً فوراً
 * - Offline-First: يعمل بدون إنترنت
 * - DELTA operations: للمخزون
 */

import { v4 as uuidv4 } from 'uuid';
import { LocalProduct, inventoryDB } from '@/database/localDb';
import { Product } from './productService';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { deltaSyncEngine } from '@/lib/sync/delta';
import { imageSyncService } from '@/api/imageSyncService';

// إضافة منتج جديد محلياً
export const createLocalProduct = async (
  organizationId: string,
  product: Omit<Product, 'id' | 'created_at' | 'updated_at'>
): Promise<LocalProduct> => {
  const now = new Date().toISOString();
  const productId = uuidv4();

  const newProduct: LocalProduct = {
    ...product,
    id: productId,
    created_at: now,
    updated_at: now,
    organization_id: organizationId,
    localUpdatedAt: now,
    synced: false,
    pendingOperation: 'create'
  };

  // ⚡ استخدام Delta Sync
  const result = await deltaWriteService.create('products', newProduct, organizationId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to create product');
  }

  console.log(`[LocalProduct] ⚡ Created product ${productId} via Delta Sync`);
  return newProduct;
};

// إنشاء منتج مع الألوان والمقاسات
export const createLocalProductWithVariants = async (
  organizationId: string,
  product: Omit<Product, 'id' | 'created_at' | 'updated_at'>,
  colors?: Array<{ name: string; code?: string; quantity?: number }>,
  sizes?: Array<{ name: string; colorId?: string; quantity?: number }>
): Promise<LocalProduct> => {
  const now = new Date().toISOString();
  const productId = uuidv4();

  const newProduct: LocalProduct = {
    ...product,
    id: productId,
    created_at: now,
    updated_at: now,
    organization_id: organizationId,
    localUpdatedAt: now,
    synced: false,
    pendingOperation: 'create'
  };

  // ⚡ استخدام Delta Sync مع المتغيرات
  const result = await deltaWriteService.createProductWithVariants(
    organizationId,
    newProduct,
    colors,
    sizes
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to create product with variants');
  }

  console.log(`[LocalProduct] ⚡ Created product ${productId} with variants via Delta Sync`);
  return newProduct;
};

// ⚡ إنشاء منتج كامل مع جميع البيانات المرتبطة
export const createLocalProductComplete = async (
  organizationId: string,
  product: Omit<Product, 'id' | 'created_at' | 'updated_at'>,
  options?: {
    colors?: Array<{ name: string; code?: string; quantity?: number; sizes?: Array<{ name: string; quantity?: number }> }>;
    advancedSettings?: Record<string, any>;
    marketingSettings?: Record<string, any>;
    wholesaleTiers?: Array<{ min_quantity: number; price_per_unit: number }>;
  }
): Promise<LocalProduct> => {
  const now = new Date().toISOString();
  const productId = uuidv4();

  const newProduct: LocalProduct = {
    ...product,
    id: productId,
    created_at: now,
    updated_at: now,
    organization_id: organizationId,
    localUpdatedAt: now,
    synced: false,
    pendingOperation: 'create'
  };

  // ⚡ استخدام Delta Sync مع جميع البيانات
  const result = await deltaWriteService.createProductComplete(
    organizationId,
    newProduct,
    options
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to create complete product');
  }

  console.log(`[LocalProduct] ⚡ Created complete product ${productId} via Delta Sync`);
  return newProduct;
};

// تحديث منتج محلياً
export const updateLocalProduct = async (
  productId: string,
  updates: Partial<LocalProduct>
): Promise<LocalProduct | null> => {
  try {
    // جلب المنتج الحالي
    const existingProduct = await deltaWriteService.get<LocalProduct>('products', productId);

    if (!existingProduct) {
      console.warn(`[LocalProduct] Product ${productId} not found`);
      return null;
    }

    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updated_at: now,
      localUpdatedAt: now,
      synced: false,
      pendingOperation: existingProduct.pendingOperation === 'create' ? 'create' : 'update'
    };

    // ⚡ استخدام Delta Sync
    const result = await deltaWriteService.update('products', productId, updatedData);

    if (!result.success) {
      console.error(`[LocalProduct] Failed to update product ${productId}:`, result.error);
      return null;
    }

    console.log(`[LocalProduct] ⚡ Updated product ${productId} via Delta Sync`);

    return {
      ...existingProduct,
      ...updatedData
    } as LocalProduct;
  } catch (error) {
    console.error(`[LocalProduct] Update error:`, error);
    return null;
  }
};

// تقليل كمية المخزون محلياً (مثلاً عند البيع)
export const reduceLocalProductStock = async (
  productId: string,
  quantity: number,
  options?: { colorId?: string; sizeId?: string }
): Promise<boolean> => {
  try {
    // ⚡ استخدام DELTA operation
    const result = await deltaWriteService.updateProductStock(
      productId,
      -Math.abs(quantity), // سالب للتقليل
      options
    );

    if (result.success) {
      console.log(`[LocalProduct] ⚡ Reduced stock for ${productId} by ${quantity} via Delta`);
    }

    return result.success;
  } catch (error) {
    console.error(`[LocalProduct] Reduce stock error:`, error);
    return false;
  }
};

// زيادة كمية المخزون محلياً (مثلاً عند الإرجاع)
export const increaseLocalProductStock = async (
  productId: string,
  quantity: number,
  options?: { colorId?: string; sizeId?: string }
): Promise<boolean> => {
  try {
    // ⚡ استخدام DELTA operation
    const result = await deltaWriteService.updateProductStock(
      productId,
      Math.abs(quantity), // موجب للزيادة
      options
    );

    if (result.success) {
      console.log(`[LocalProduct] ⚡ Increased stock for ${productId} by ${quantity} via Delta`);
    }

    return result.success;
  } catch (error) {
    console.error(`[LocalProduct] Increase stock error:`, error);
    return false;
  }
};

// جلب المنتجات المحلية
export const getLocalProducts = async (
  organizationId?: string,
  synced?: boolean
): Promise<LocalProduct[]> => {
  try {
    if (!organizationId) {
      organizationId = localStorage.getItem('currentOrganizationId') ||
        localStorage.getItem('bazaar_organization_id') || '';
    }

    let products: LocalProduct[];

    if (synced !== undefined) {
      products = await deltaWriteService.getAll<LocalProduct>('products', organizationId, {
        where: 'synced = ?',
        params: [synced ? 1 : 0]
      });
    } else {
      products = await deltaWriteService.getAll<LocalProduct>('products', organizationId);
    }

    // تحويل روابط الصور إلى مسارات محلية
    for (const product of products) {
      if (product.image_url) {
        product.image_url = await imageSyncService.getLocalUrl(product.image_url);
      }
    }

    return products;
  } catch (error) {
    console.error(`[LocalProduct] Get products error:`, error);
    return [];
  }
};

// جلب المنتجات التي تحتاج إلى مزامنة
export const getUnsyncedProducts = async (): Promise<LocalProduct[]> => {
  const orgId = localStorage.getItem('currentOrganizationId') ||
    localStorage.getItem('bazaar_organization_id') || '';
  return getLocalProducts(orgId, false);
};

// تحديث حالة مزامنة المنتج
export const markProductAsSynced = async (
  productId: string,
  remoteData?: Partial<Product>
): Promise<LocalProduct | null> => {
  try {
    const product = await deltaWriteService.get<LocalProduct>('products', productId);

    if (!product) {
      return null;
    }

    const updatedData = {
      ...remoteData,
      synced: true,
      syncStatus: undefined,
      lastSyncAttempt: new Date().toISOString(),
      pendingOperation: undefined
    };

    await deltaWriteService.update('products', productId, updatedData);

    return {
      ...product,
      ...updatedData
    } as LocalProduct;
  } catch (error) {
    console.error(`[LocalProduct] Mark synced error:`, error);
    return null;
  }
};

// حذف منتج محلياً
export const deleteLocalProduct = async (productId: string): Promise<boolean> => {
  try {
    const product = await deltaWriteService.get<LocalProduct>('products', productId);

    if (!product) {
      return false;
    }

    // ⚡ استخدام Delta Sync للحذف
    const result = await deltaWriteService.delete('products', productId);

    if (result.success) {
      console.log(`[LocalProduct] ⚡ Deleted product ${productId} via Delta Sync`);
    }

    return result.success;
  } catch (error) {
    console.error(`[LocalProduct] Delete error:`, error);
    return false;
  }
};

// البحث في المنتجات
export const searchLocalProducts = async (
  organizationId: string,
  searchTerm: string,
  limit: number = 50
): Promise<LocalProduct[]> => {
  return deltaWriteService.search<LocalProduct>(
    'products',
    organizationId,
    ['name', 'sku', 'barcode', 'description'],
    searchTerm,
    limit
  );
};

// جلب منتج واحد
export const getLocalProduct = async (productId: string): Promise<LocalProduct | null> => {
  return deltaWriteService.get<LocalProduct>('products', productId);
};

// عد المنتجات
export const countLocalProducts = async (organizationId: string): Promise<number> => {
  return deltaWriteService.count('products', organizationId);
};

// =====================
// Legacy compatibility - للتوافقية مع الكود القديم
// =====================

// إضافة عنصر إلى قائمة المزامنة (deprecated - يتم عبر Delta Sync تلقائياً)
export const addToSyncQueue = async (item: any) => {
  console.warn('[LocalProduct] addToSyncQueue is deprecated. Operations are queued via Delta Sync automatically.');
  // لا نفعل شيئاً - العمليات تُضاف تلقائياً عبر Delta Sync
};
