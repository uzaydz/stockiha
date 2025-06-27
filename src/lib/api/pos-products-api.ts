import { supabase } from '@/lib/supabase';
import { deduplicateRequest } from '@/lib/cache/deduplication';

// واجهات البيانات
export interface PaginatedProductsResponse {
  products: any[];
  totalCount: number;
  pageCount: number;
  currentPage: number;
  hasNextPage: boolean;
}

export interface ProductsFilterOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  categoryId?: string;
  sortBy?: 'name' | 'price' | 'stock' | 'created';
  sortOrder?: 'ASC' | 'DESC';
  includeVariants?: boolean;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  productsWithVariants: number;
  totalCategories: number;
}

// دالة لجلب المنتجات مع Pagination
export async function getPaginatedProducts(
  organizationId: string,
  options: ProductsFilterOptions = {}
): Promise<PaginatedProductsResponse> {
  const {
    page = 1,
    pageSize = 50,
    searchQuery = null,
    categoryId = null,
    sortBy = 'name',
    sortOrder = 'ASC',
    includeVariants = true
  } = options;

  // إنشاء مفتاح فريد للـ cache
  const cacheKey = `pos-products-paginated-${organizationId}-${page}-${pageSize}-${searchQuery}-${categoryId}-${sortBy}-${sortOrder}-${includeVariants}`;

  return deduplicateRequest(cacheKey, async () => {
    const { data, error } = await supabase.rpc('get_pos_products_paginated' as any, {
      p_organization_id: organizationId,
      p_page: page,
      p_page_size: pageSize,
      p_search_query: searchQuery,
      p_category_id: categoryId,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
      p_include_variants: includeVariants
    });

    if (error) {
      throw error;
    }

    const typedData = data as any;
    if (!typedData || (Array.isArray(typedData) && typedData.length === 0)) {
      return {
        products: [],
        totalCount: 0,
        pageCount: 0,
        currentPage: page,
        hasNextPage: false
      };
    }

    const result = Array.isArray(typedData) ? typedData[0] : typedData;
    return {
      products: result.products || [],
      totalCount: parseInt(result.total_count || '0'),
      pageCount: parseInt(result.page_count || '0'),
      currentPage: parseInt(result.current_page || page.toString()),
      hasNextPage: result.has_next_page || false
    };
  });
}

// دالة للبحث السريع (autocomplete)
export async function searchProductsAutocomplete(
  organizationId: string,
  searchQuery: string,
  limit: number = 10
): Promise<any[]> {
  const cacheKey = `pos-products-autocomplete-${organizationId}-${searchQuery}-${limit}`;

  return deduplicateRequest(cacheKey, async () => {
    const { data, error } = await supabase.rpc('search_products_autocomplete' as any, {
      p_organization_id: organizationId,
      p_search_query: searchQuery,
      p_limit: limit
    });

    if (error) {
      throw error;
    }

    return (data as any[]) || [];
  });
}

// دالة لجلب إحصائيات المنتجات
export async function getProductsStats(organizationId: string): Promise<ProductStats> {
  const cacheKey = `pos-products-stats-${organizationId}`;

  return deduplicateRequest(cacheKey, async () => {
    const { data, error } = await supabase.rpc('get_pos_products_stats' as any, {
      p_organization_id: organizationId
    });

    if (error) {
      throw error;
    }

    const typedData = data as any;
    if (!typedData || (Array.isArray(typedData) && typedData.length === 0)) {
      return {
        totalProducts: 0,
        activeProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        productsWithVariants: 0,
        totalCategories: 0
      };
    }

    const stats = Array.isArray(typedData) ? typedData[0] : typedData;
    return {
      totalProducts: parseInt(stats.total_products || '0'),
      activeProducts: parseInt(stats.active_products || '0'),
      lowStockProducts: parseInt(stats.low_stock_products || '0'),
      outOfStockProducts: parseInt(stats.out_of_stock_products || '0'),
      productsWithVariants: parseInt(stats.products_with_variants || '0'),
      totalCategories: parseInt(stats.total_categories || '0')
    };
  });
}

// دالة لتحديث cache عند تغيير المنتجات
export function invalidateProductsCache(organizationId: string) {
  // هنا يمكنك تنفيذ منطق لحذف cache المنتجات
  // في الوقت الحالي، سنعتمد على آلية deduplication الموجودة
}

// دالة مساعدة لتحويل المنتج من قاعدة البيانات إلى تنسيق الواجهة
export function transformDatabaseProduct(dbProduct: any): any {
  // التأكد من وجود stockQuantity و stock_quantity
  const stockQuantity = dbProduct.stockQuantity || dbProduct.stock_quantity || 0;
  
  // تحويل البيانات المتغيرات إذا كانت موجودة
  const colors = dbProduct.variants || dbProduct.colors || [];
  
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    description: dbProduct.description || '',
    price: dbProduct.price,
    compareAtPrice: dbProduct.compareAtPrice || dbProduct.compare_at_price,
    sku: dbProduct.sku,
    barcode: dbProduct.barcode,
    category: dbProduct.category,
    category_id: dbProduct.category_id,
    subcategory: dbProduct.subcategory,
    brand: dbProduct.brand,
    images: dbProduct.images || [],
    thumbnailImage: dbProduct.thumbnailImage || dbProduct.thumbnail_image || '',
    stockQuantity: stockQuantity,
    stock_quantity: stockQuantity,
    features: dbProduct.features,
    specifications: dbProduct.specifications || {},
    isDigital: dbProduct.isDigital || dbProduct.is_digital,
    isNew: dbProduct.isNew || dbProduct.is_new,
    isFeatured: dbProduct.isFeatured || dbProduct.is_featured,
    createdAt: new Date(dbProduct.createdAt || dbProduct.created_at),
    updatedAt: new Date(dbProduct.updatedAt || dbProduct.updated_at),
    has_variants: dbProduct.has_variants,
    use_sizes: dbProduct.use_sizes,
    colors: colors,
    
    // خصائص الجملة
    wholesale_price: dbProduct.wholesale_price,
    partial_wholesale_price: dbProduct.partial_wholesale_price,
    min_wholesale_quantity: dbProduct.min_wholesale_quantity,
    min_partial_wholesale_quantity: dbProduct.min_partial_wholesale_quantity,
    allow_retail: dbProduct.allow_retail !== false, // افتراضي true
    allow_wholesale: dbProduct.allow_wholesale || false,
    allow_partial_wholesale: dbProduct.allow_partial_wholesale || false,
    
    // خصائص إضافية
    is_active: dbProduct.isActive !== false && dbProduct.is_active !== false, // افتراضي true
    actual_stock_quantity: stockQuantity,
    total_variants_stock: stockQuantity,
    low_stock_warning: stockQuantity <= 5
  };
}
