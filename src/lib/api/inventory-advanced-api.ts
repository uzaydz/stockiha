import type { Product, ProductCategory } from '@/types';
import {
  fetchInventoryProducts,
  fetchInventoryStats,
  fetchProductInventoryDetails,
  searchInventoryProducts,
  bulkUpdateInventory as serviceBulkUpdate,
  fetchInventoryQuickSummary,
} from '@/services/InventoryService';
import {
  InventoryServiceError,
  type InventoryFilters as ServiceInventoryFilters,
  type InventoryProduct as ServiceInventoryProduct,
} from '@/services/InventoryService';

// أنواع البيانات المتقدمة للمخزون
export interface InventoryProduct extends Product {
  stock_status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'reorder-needed';
  stock_value: number;
  reorder_needed: boolean;
  days_since_last_update: number;
  variant_count: number;
  total_variant_stock: number;
}

export interface InventoryAdvancedFilters {
  search_query?: string;
  category_id?: string;
  stock_filter?: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'reorder-needed';
  sort_by?: 'name' | 'stock' | 'price' | 'created' | 'updated' | 'last_inventory_update' | 'reorder_priority';
  sort_order?: 'ASC' | 'DESC';
  include_variants?: boolean;
  include_inactive?: boolean;
}

export interface InventoryPaginatedResponse {
  products: InventoryProduct[];
  total_count: number;
  filtered_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface InventoryAdvancedStats {
  total_products: number;
  active_products: number;
  inactive_products: number;
  in_stock_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  reorder_needed_products: number;
  
  total_stock_quantity: number;
  total_stock_value: number;
  average_stock_per_product: number;
  
  digital_products: number;
  physical_products: number;
  
  products_with_variants: number;
  products_without_variants: number;
  
  categories_count: number;
  brands_count: number;
  
  last_week_additions: number;
  last_month_additions: number;
  
  top_stock_value_category: string;
  lowest_stock_category: string;
}

export interface BulkUpdateItem {
  product_id: string;
  new_quantity: number;
  reason?: string;
  notes?: string;
}

export interface BulkUpdateResult {
  success: boolean;
  updated_count: number;
  failed_updates: Array<{
    product_id: string;
    error: string;
  }>;
  message: string;
}

// Cache للطلبات المتكررة
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 ثانية

function getCacheKey(prefix: string, params: unknown): string {
  return `${prefix}_${JSON.stringify(params)}`;
}

function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function normalizeProductCategory(input: unknown): ProductCategory {
  const value = typeof input === 'string' ? input.toLowerCase().trim() : '';
  switch (value) {
    case 'consoles':
    case 'console':
      return 'consoles';
    case 'accessories':
    case 'accessory':
      return 'accessories';
    case 'games_physical':
    case 'games-physical':
    case 'games physical':
    case 'physical_games':
      return 'games_physical';
    case 'games_digital':
    case 'games-digital':
    case 'games digital':
    case 'digital_games':
      return 'games_digital';
    case 'controllers':
    case 'controller':
      return 'controllers';
    case 'components':
    case 'component':
      return 'components';
    case 'merchandise':
    case 'merch':
      return 'merchandise';
    default:
      return 'accessories';
  }
}

function mapServiceFilters(filters: InventoryAdvancedFilters, page: number, pageSize: number): ServiceInventoryFilters {
  return {
    page,
    pageSize,
    searchQuery: filters.search_query,
    categoryId: filters.category_id,
    stockFilter: filters.stock_filter,
    sortBy: filters.sort_by,
    sortOrder: filters.sort_order,
    includeVariants: filters.include_variants,
    includeInactive: filters.include_inactive,
  };
}

function mapToInventoryProduct(product: ServiceInventoryProduct): InventoryProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    sku: product.sku,
    barcode: product.barcode ?? undefined,
    category: normalizeProductCategory((product as any).category),
    subcategory: product.subcategory ?? undefined,
    brand: product.brand ?? undefined,
    images: product.images ?? [],
    thumbnailImage: product.thumbnailImage ?? '',
    stockQuantity: product.stockQuantity,
    stock_quantity: product.stockQuantity,
    min_stock_level: product.minStockLevel,
    reorder_level: product.reorderLevel,
    reorder_quantity: product.reorderQuantity,
    isDigital: product.isDigital,
    isNew: product.isNew,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt ?? new Date(),
    updatedAt: product.updatedAt ?? new Date(),
    has_variants: product.hasVariants,
    use_sizes: product.useSizes,
    stock_status: (product.stockStatus as InventoryProduct['stock_status']) ?? 'in-stock',
    stock_value: product.stockValue,
    reorder_needed: product.reorderNeeded,
    days_since_last_update: product.daysSinceLastUpdate,
    variant_count: product.variantCount,
    total_variant_stock: product.totalVariantStock,
    features: [],
    specifications: {},
    synced: true,
  };
}

/**
 * جلب منتجات المخزون مع pagination متقدم
 */
export async function getInventoryProductsPaginated(
  page: number = 1,
  pageSize: number = 50,
  filters: InventoryAdvancedFilters = {}
): Promise<InventoryPaginatedResponse> {
  try {
    const serviceFilters = mapServiceFilters(filters, page, pageSize);
    const cacheKey = getCacheKey('inventory_paginated', serviceFilters);
    const cached = getFromCache<InventoryPaginatedResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const { products, totalCount, filteredCount } = await fetchInventoryProducts(serviceFilters);

    const mappedProducts = products.map(mapToInventoryProduct);

    const response: InventoryPaginatedResponse = {
      products: mappedProducts,
      total_count: totalCount,
      filtered_count: filteredCount,
      page,
      page_size: pageSize,
      has_more: page * pageSize < filteredCount,
    };

    setCache(cacheKey, response);
    return response;
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      throw error;
    }
    throw new InventoryServiceError('تعذر تحميل قائمة المخزون', error);
  }
}

/**
 * بحث سريع في المخزون للـ autocomplete
 */
export async function searchInventoryAutocomplete(
  searchQuery: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  name: string;
  sku: string;
  barcode: string;
  thumbnail_image: string;
  stock_quantity: number;
  stock_status: string;
  category: string;
}>> {
  try {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return [];
    }

    const cacheKey = getCacheKey('inventory_autocomplete', { searchQuery, limit });
    const cached = getFromCache<Array<{
      id: string;
      name: string;
      sku: string;
      barcode: string;
      thumbnail_image: string;
      stock_quantity: number;
      stock_status: string;
      category: string;
    }>>(cacheKey);

    if (cached) {
      return cached;
    }

    const results = await searchInventoryProducts(searchQuery, limit);
    setCache(cacheKey, results);
    return results;
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      return [];
    }
    return [];
  }
}

/**
 * الحصول على إحصائيات المخزون المتقدمة
 */
export async function getInventoryAdvancedStats(): Promise<InventoryAdvancedStats> {
  try {
    const cacheKey = getCacheKey('inventory_stats', {});
    const cached = getFromCache<InventoryAdvancedStats>(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await fetchInventoryStats();

    const result: InventoryAdvancedStats = {
      total_products: stats.total_products,
      active_products: stats.active_products,
      inactive_products: stats.inactive_products,
      in_stock_products: stats.in_stock_products,
      low_stock_products: stats.low_stock_products,
      out_of_stock_products: stats.out_of_stock_products,
      reorder_needed_products: stats.reorder_needed_products,
      total_stock_quantity: Number(stats.total_stock_quantity),
      total_stock_value: Number(stats.total_stock_value),
      average_stock_per_product: Number(stats.average_stock_per_product),
      digital_products: stats.digital_products,
      physical_products: stats.physical_products,
      products_with_variants: stats.products_with_variants,
      products_without_variants: stats.products_without_variants,
      categories_count: stats.categories_count,
      brands_count: stats.brands_count,
      last_week_additions: stats.last_week_additions,
      last_month_additions: stats.last_month_additions,
      top_stock_value_category: stats.top_stock_value_category || '',
      lowest_stock_category: stats.lowest_stock_category || '',
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      throw error;
    }
    throw new InventoryServiceError('تعذر تحميل إحصائيات المخزون', error);
  }
}

/**
 * تحديث مجمع للمخزون
 */
export async function bulkUpdateInventory(
  updates: BulkUpdateItem[]
): Promise<BulkUpdateResult> {
  try {
    const result = await serviceBulkUpdate(updates);

    // مسح الـ cache عند التحديث
    Array.from(cache.keys()).forEach(key => {
      if (key.includes('inventory_')) {
        cache.delete(key);
      }
    });

    return {
      success: result.success,
      updated_count: result.updated_count,
      failed_updates: result.failed_updates,
      message: result.message
    };
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      throw error;
    }
    throw new InventoryServiceError('تعذر تنفيذ التحديث المجمع', error);
  }
}

/**
 * تصدير بيانات المخزون
 */
export async function exportInventoryData(
  format: 'csv' | 'xlsx' = 'csv',
  filters: InventoryAdvancedFilters = {}
): Promise<Blob> {
  const response = await getInventoryProductsPaginated(1, 10000, filters);
  return format === 'csv' ? generateCSV(response.products) : generateExcel(response.products);
}

// دوال مساعدة للتصدير
function generateCSV(products: InventoryProduct[]): Blob {
  const headers = [
    'الاسم', 'SKU', 'الباركود', 'الفئة', 'الكمية الحالية', 
    'الحد الأدنى', 'مستوى إعادة الطلب', 'حالة المخزون', 
    'قيمة المخزون', 'السعر', 'تاريخ الإنشاء'
  ];
  
  const rows = products.map(product => [
    product.name,
    product.sku,
    product.barcode || '',
    product.category,
    product.stock_quantity,
    product.min_stock_level,
    product.reorder_level,
    getStockStatusArabic(product.stock_status),
    product.stock_value.toFixed(2),
    product.price.toFixed(2),
    product.createdAt.toLocaleDateString('ar-DZ')
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
}

function generateExcel(products: InventoryProduct[]): Blob {
  // هذه دالة مبسطة - في التطبيق الحقيقي يمكن استخدام مكتبة مثل xlsx
  return generateCSV(products);
}

function getStockStatusArabic(status: string): string {
  const statusMap: Record<string, string> = {
    'in-stock': 'متوفر',
    'low-stock': 'منخفض',
    'out-of-stock': 'نفذ',
    'reorder-needed': 'يحتاج إعادة طلب'
  };
  return statusMap[status] || status;
}

/**
 * مسح الـ cache يدوياً
 */
export function clearInventoryCache(): void {
  Array.from(cache.keys()).forEach(key => {
    if (key.includes('inventory_')) {
      cache.delete(key);
    }
  });
}

/**
 * الحصول على معلومات الـ cache
 */
export function getCacheInfo(): { size: number; keys: string[] } {
  const inventoryKeys = Array.from(cache.keys()).filter(key => key.includes('inventory_'));
  return {
    size: inventoryKeys.length,
    keys: inventoryKeys
  };
}
