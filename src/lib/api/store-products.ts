import { supabase } from '@/lib/supabase-unified';

export interface StoreProductsPageOptions {
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
  search?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: 'newest' | 'name_asc' | 'name_desc' | 'price_low' | 'price_high';
}

export async function getStoreProductsPage(orgIdentifier: string, options: StoreProductsPageOptions = {}) {
  const requestStartTime = performance.now();
  const {
    page = 1,
    pageSize = 48,
    includeInactive = false,
    search = null,
    categoryId = null,
    subcategoryId = null,
    minPrice = null,
    maxPrice = null,
    sort = 'newest'
  } = options;

  console.log('📦 [API] بدء جلب منتجات المتجر', {
    orgIdentifier,
    page,
    pageSize,
    search: search ? search.substring(0, 50) : null,
    categoryId,
    sort,
    hasFilters: !!(search || categoryId || subcategoryId || minPrice || maxPrice),
    startTime: requestStartTime
  });

  const { data, error } = await (supabase as any).rpc('get_store_products_page', {
    org_identifier: orgIdentifier,
    p_page: page,
    p_page_size: pageSize,
    p_include_inactive: includeInactive,
    p_search: search,
    p_category_id: categoryId,
    p_subcategory_id: subcategoryId,
    p_min_price: minPrice,
    p_max_price: maxPrice,
    p_sort: sort
  });

  const requestEndTime = performance.now();
  const requestDuration = requestEndTime - requestStartTime;

  if (error) {
    console.error('❌ [API] خطأ في جلب منتجات المتجر', {
      orgIdentifier,
      error: error.message || String(error),
      duration: requestDuration,
      options: { page, pageSize, search, categoryId, sort }
    });
    throw error;
  }

  console.log('✅ [API] نجح جلب منتجات المتجر', {
    orgIdentifier,
    duration: requestDuration,
    productsCount: data?.products?.length || 0,
    categoriesCount: data?.categories?.length || 0,
    totalPages: data?.meta?.total_pages || 0,
    totalCount: data?.meta?.total_count || 0,
    dataSize: JSON.stringify(data || {}).length
  });

  return data as {
    products: any[];
    categories: any[];
    subcategories: any[];
    meta: { total_count: number; total_pages: number; current_page: number; page_size: number };
  };
}
