/**
 * offlineProductsAdapter - محول المنتجات Offline-First
 *
 * ⚡ تم التحديث لاستخدام PowerSync بالكامل
 */

import type { Product } from '@/lib/api/products';
import type { LocalProduct } from '@/database/localDb';
import { unifiedProductService } from '@/services/UnifiedProductService';

/**
 * محول لربط خدمة المنتجات التقليدية بخدمة PowerSync Offline-First
 * ------------------------------------------------------
 * جميع العمليات تتم محلياً من PowerSync مع مزامنة تلقائية
 */

// Helper للحصول على orgId
const getOrgId = (): string => {
  return localStorage.getItem('currentOrganizationId') ||
         localStorage.getItem('bazaar_organization_id') || '';
};

// ⚡ الحصول على جميع المنتجات المحلية من PowerSync
export const getLocalProducts = async (): Promise<LocalProduct[]> => {
  const orgId = getOrgId();
  if (!orgId) return [];
  
  unifiedProductService.setOrganizationId(orgId);
  const result = await unifiedProductService.getProducts({}, 1, 10000);
  return result.data as any as LocalProduct[];
};

// ⚡ حفظ المنتج محلياً في PowerSync (المزامنة تلقائية)
export const saveProductLocally = async (product: Product, synced: boolean = true): Promise<LocalProduct> => {
  const orgId = getOrgId();
  if (!orgId) throw new Error('Organization ID not found');
  
  unifiedProductService.setOrganizationId(orgId);
  
  // تحديث المنتج إذا كان موجوداً، أو إنشاؤه إذا لم يكن موجوداً
  const existing = await unifiedProductService.getProduct(product.id);
  if (existing) {
    await unifiedProductService.updateProduct(product.id, product as any);
  } else {
    await unifiedProductService.createProduct(product as any);
  }
  
  return product as any as LocalProduct;
};

// ⚡ حفظ مجموعة كبيرة محلياً في PowerSync (المزامنة تلقائية)
export const bulkSaveProductsLocally = async (products: Product[], synced: boolean = true): Promise<void> => {
  const orgId = getOrgId();
  if (!orgId) throw new Error('Organization ID not found');
  
  unifiedProductService.setOrganizationId(orgId);
  
  // حفظ كل منتج (PowerSync يتعامل مع الباتش تلقائياً)
  for (const product of products) {
    try {
      const existing = await unifiedProductService.getProduct(product.id);
      if (existing) {
        await unifiedProductService.updateProduct(product.id, product as any);
      } else {
        await unifiedProductService.createProduct(product as any);
      }
    } catch (error) {
      console.error(`[bulkSaveProductsLocally] Error saving product ${product.id}:`, error);
    }
  }
};

// ⚡ إضافة منتج جديد محلياً في PowerSync (المزامنة تلقائية)
export const addProductLocally = async (productData: any): Promise<LocalProduct | null> => {
  try {
    const orgId = getOrgId();
    if (!orgId) return null;

    unifiedProductService.setOrganizationId(orgId);
    const newProduct = await unifiedProductService.createProduct(productData);
    return newProduct as any as LocalProduct;
  } catch (error) {
    console.error('[addProductLocally] Error:', error);
    return null;
  }
};

// ⚡ تحديث منتج محلياً في PowerSync (المزامنة تلقائية)
export const updateProductLocally = async (productId: string, updates: any): Promise<LocalProduct | null> => {
  try {
    const orgId = getOrgId();
    if (!orgId) return null;

    unifiedProductService.setOrganizationId(orgId);
    const updatedProduct = await unifiedProductService.updateProduct(productId, updates);
    return updatedProduct as any as LocalProduct;
  } catch (error) {
    console.error('[updateProductLocally] Error:', error);
    return null;
  }
};

// ⚡ حذف منتج محلياً من PowerSync (المزامنة تلقائية)
export const deleteProductLocally = async (productId: string): Promise<boolean> => {
  try {
    const orgId = getOrgId();
    if (!orgId) return false;

    unifiedProductService.setOrganizationId(orgId);
    await unifiedProductService.deleteProduct(productId);
    return true;
  } catch (error) {
    console.error('[deleteProductLocally] Error:', error);
    return false;
  }
};

// ⚡ مزامنة المنتجات المحلية مع الخادم (PowerSync يتعامل معها تلقائياً)
export const syncLocalProducts = async (): Promise<{ success: number; failed: number }> => {
  // PowerSync يتعامل مع المزامنة تلقائياً - لا حاجة لاستدعاء صريح
  console.log('[syncLocalProducts] ⚡ PowerSync handles sync automatically');
  return { success: 0, failed: 0 };
};

// الواجهة البرمجية الخارجية - متوافقة مع الواجهة القديمة
// ----------------------------------------------------

/**
 * ⚡ جلب قائمة المنتجات من PowerSync (Offline-First)
 */
export const getProducts = async (organizationId?: string, includeInactive: boolean = false): Promise<Product[]> => {
  try {
    const orgId = organizationId || getOrgId();
    if (!orgId) return [];
    
    unifiedProductService.setOrganizationId(orgId);
    const filters: any = {};
    if (!includeInactive) {
      filters.is_active = true;
    }
    
    const result = await unifiedProductService.getProducts(filters, 1, 10000);
    return result.data as any as Product[];
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
  // ⚡ استخدام PowerSync للبحث (Offline-First)
  unifiedProductService.setOrganizationId(organizationId);
  const products = await unifiedProductService.searchProducts(query, limit);
  return products as any as LocalProduct[];
};

// ⚡ تصفح محلي سريع بالصفحات من PowerSync
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
    categoryId = null
  } = options;

  try {
    unifiedProductService.setOrganizationId(organizationId);
    const filters: any = {};
    
    if (!includeInactive) {
      filters.is_active = true;
    }
    
    if (categoryId && categoryId !== 'all') {
      filters.category_id = categoryId;
    }
    
    const page = Math.floor(offset / limit) + 1;
    const result = await unifiedProductService.getProducts(filters, page, limit);
    
    return { 
      products: result.data as any as LocalProduct[], 
      total: result.total 
    };
  } catch (error) {
    console.error('❌ [getLocalProductsPage] Error:', error);
    return { products: [], total: 0 };
  }
}

// ⚡ إحصاءات محلية سريعة من PowerSync
export async function getLocalProductStats(organizationId: string): Promise<{
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  productsWithVariants: number;
  totalCategories: number;
}> {
  unifiedProductService.setOrganizationId(organizationId);
  const stats = await unifiedProductService.getProductStats();
  
  // جلب عدد الفئات
  const categories = await unifiedProductService.getCategories();
  
  return {
    totalProducts: stats.total,
    activeProducts: stats.active,
    lowStockProducts: stats.lowStock,
    outOfStockProducts: stats.outOfStock,
    productsWithVariants: 0, // TODO: حساب من المنتجات
    totalCategories: categories.length
  };
}

/**
 * ⚡ جلب منتج بواسطة المعرف من PowerSync
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const orgId = getOrgId();
    if (!orgId) return null;
    
    unifiedProductService.setOrganizationId(orgId);
    const product = await unifiedProductService.getProduct(id);
    return product as any as Product;
  } catch (error) {
    return null;
  }
};

/**
 * ⚡ إنشاء منتج جديد في PowerSync (Offline-First)
 */
export const createProduct = async (productData: any): Promise<Product | null> => {
  try {
    return await addProductLocally(productData);
  } catch (error) {
    return null;
  }
};

/**
 * ⚡ تحديث منتج موجود في PowerSync (Offline-First)
 */
export const updateProduct = async (id: string, updates: any): Promise<Product | null> => {
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
 * ⚡ تحديث حالة المزامنة (PowerSync يتعامل معها تلقائياً)
 */
export const syncProducts = async (): Promise<{ success: number; failed: number }> => {
  // PowerSync يتعامل مع المزامنة تلقائياً - لا حاجة لاستدعاء صريح
  return { success: 0, failed: 0 };
};
