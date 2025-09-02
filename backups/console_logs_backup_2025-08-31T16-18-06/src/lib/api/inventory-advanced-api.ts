import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

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
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 ثانية

function getCacheKey(prefix: string, params: any): string {
  return `${prefix}_${JSON.stringify(params)}`;
}

function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// الحصول على معرف المؤسسة للمستخدم الحالي
async function getCurrentUserOrganizationId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // محاولة أولى: البحث بـ auth_user_id
    let { data: userProfile, error } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    // إذا فشل، جرب البحث بـ id
    if (error || !userProfile?.organization_id) {
      const { data: idData, error: idError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();
        
      if (!idError && idData?.organization_id) {
        userProfile = idData;
        error = null;
      }
    }

    return userProfile?.organization_id || null;
  } catch (error) {
    return null;
  }
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
    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
      throw new Error('لم يتم العثور على معرف المؤسسة');
    }

    // تحقق من الـ cache أولاً
    const cacheKey = getCacheKey('inventory_paginated', { page, pageSize, filters, organizationId });
    const cached = getFromCache<InventoryPaginatedResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // استدعاء الدالة المتقدمة
    const { data, error } = await supabase.rpc('get_inventory_products_paginated' as any, {
      p_organization_id: organizationId,
      p_page: page,
      p_page_size: pageSize,
      p_search_query: filters.search_query || null,
      p_category_id: filters.category_id || null,
      p_stock_filter: filters.stock_filter || 'all',
      p_sort_by: filters.sort_by || 'name',
      p_sort_order: filters.sort_order || 'ASC',
      p_include_variants: filters.include_variants ?? true,
      p_include_inactive: filters.include_inactive ?? false
    });

    if (error) {
      throw new Error(`خطأ في جلب منتجات المخزون: ${error.message}`);
    }

    const products: InventoryProduct[] = ((data as any[]) || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: parseFloat(item.price || '0'),
      compareAtPrice: item.compare_at_price ? parseFloat(item.compare_at_price) : undefined,
      sku: item.sku,
      barcode: item.barcode,
      category: item.category,
      subcategory: item.subcategory,
      brand: item.brand,
      images: item.images || [],
      thumbnailImage: item.thumbnail_image || '',
      stockQuantity: item.stock_quantity,
      stock_quantity: item.stock_quantity,
      min_stock_level: item.min_stock_level || 5,
      reorder_level: item.reorder_level || 10,
      reorder_quantity: item.reorder_quantity || 20,
      isDigital: item.is_digital,
      isNew: item.is_new,
      isFeatured: item.is_featured,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      has_variants: item.has_variants,
      use_sizes: item.use_sizes,
      
      // بيانات المخزون المتقدمة
      stock_status: item.stock_status,
      stock_value: parseFloat(item.stock_value || '0'),
      reorder_needed: item.reorder_needed,
      days_since_last_update: item.days_since_last_update,
      variant_count: item.variant_count,
      total_variant_stock: item.total_variant_stock,
      
      // بيانات إضافية مطلوبة
      features: [],
      specifications: {},
      synced: true
    }));

    const totalCount = data?.[0]?.total_count || 0;
    const filteredCount = data?.[0]?.filtered_count || 0;

    const response: InventoryPaginatedResponse = {
      products,
      total_count: totalCount,
      filtered_count: filteredCount,
      page,
      page_size: pageSize,
      has_more: page * pageSize < filteredCount
    };

    // حفظ في الـ cache
    setCache(cacheKey, response);

    return response;
  } catch (error) {
    throw error;
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

    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
      return [];
    }

    // تحقق من الـ cache
    const cacheKey = getCacheKey('inventory_autocomplete', { searchQuery, limit, organizationId });
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

    const { data, error } = await supabase.rpc('search_inventory_autocomplete' as any, {
      p_organization_id: organizationId,
      p_search_query: searchQuery.trim(),
      p_limit: limit
    });

    if (error) {
      return [];
    }

    const results = (data as any[]) || [];
    setCache(cacheKey, results);

    return results;
  } catch (error) {
    return [];
  }
}

/**
 * الحصول على إحصائيات المخزون المتقدمة
 */
export async function getInventoryAdvancedStats(): Promise<InventoryAdvancedStats> {
  try {
    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
      throw new Error('لم يتم العثور على معرف المؤسسة');
    }

    // تحقق من الـ cache
    const cacheKey = getCacheKey('inventory_stats', { organizationId });
    const cached = getFromCache<InventoryAdvancedStats>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await supabase.rpc('get_inventory_advanced_stats' as any, {
      p_organization_id: organizationId
    });

    if (error) {
      throw new Error(`خطأ في جلب إحصائيات المخزون: ${error.message}`);
    }

    const stats = data?.[0] || {};
    
    const result: InventoryAdvancedStats = {
      total_products: stats.total_products || 0,
      active_products: stats.active_products || 0,
      inactive_products: stats.inactive_products || 0,
      in_stock_products: stats.in_stock_products || 0,
      low_stock_products: stats.low_stock_products || 0,
      out_of_stock_products: stats.out_of_stock_products || 0,
      reorder_needed_products: stats.reorder_needed_products || 0,
      
      total_stock_quantity: parseInt(stats.total_stock_quantity || '0'),
      total_stock_value: parseFloat(stats.total_stock_value || '0'),
      average_stock_per_product: parseFloat(stats.average_stock_per_product || '0'),
      
      digital_products: stats.digital_products || 0,
      physical_products: stats.physical_products || 0,
      
      products_with_variants: stats.products_with_variants || 0,
      products_without_variants: stats.products_without_variants || 0,
      
      categories_count: stats.categories_count || 0,
      brands_count: stats.brands_count || 0,
      
      last_week_additions: stats.last_week_additions || 0,
      last_month_additions: stats.last_month_additions || 0,
      
      top_stock_value_category: stats.top_stock_value_category || '',
      lowest_stock_category: stats.lowest_stock_category || ''
    };

    // حفظ في الـ cache لمدة أطول للإحصائيات
    setCache(cacheKey, result);

    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * تحديث مجمع للمخزون
 */
export async function bulkUpdateInventory(
  updates: BulkUpdateItem[]
): Promise<BulkUpdateResult> {
  try {
    const organizationId = await getCurrentUserOrganizationId();
    if (!organizationId) {
      throw new Error('لم يتم العثور على معرف المؤسسة');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('المستخدم غير مسجل الدخول');
    }

    const { data, error } = await supabase.rpc('bulk_update_inventory' as any, {
      p_organization_id: organizationId,
      p_updates: updates,
      p_updated_by: user.id
    });

    if (error) {
      throw new Error(`خطأ في التحديث المجمع: ${error.message}`);
    }

    const result = data?.[0] || {};
    
    // مسح الـ cache عند التحديث
    Array.from(cache.keys()).forEach(key => {
      if (key.includes('inventory_')) {
        cache.delete(key);
      }
    });

    return {
      success: result.success || false,
      updated_count: result.updated_count || 0,
      failed_updates: result.failed_updates || [],
      message: result.message || 'تم التحديث'
    };
  } catch (error) {
    throw error;
  }
}

/**
 * تصدير بيانات المخزون
 */
export async function exportInventoryData(
  format: 'csv' | 'xlsx' = 'csv',
  filters: InventoryAdvancedFilters = {}
): Promise<Blob> {
  try {
    // جلب جميع البيانات (بدون pagination)
    const response = await getInventoryProductsPaginated(1, 10000, filters);
    
    if (format === 'csv') {
      return generateCSV(response.products);
    } else {
      return generateExcel(response.products);
    }
  } catch (error) {
    throw error;
  }
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
