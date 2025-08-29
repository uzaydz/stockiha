import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { useState, useCallback, useMemo } from 'react';

// =====================================================
// 🚀 Hook محسن لاستخدام بيانات POS مع pagination
// =====================================================

interface PaginatedPOSData {
  products: any[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
}

interface EssentialPOSData {
  product_categories: any[];
  customers: any[];
  users: any[];
  pos_settings: any;
  stats: {
    total_products: number;
    total_customers: number;
    total_categories: number;
  };
}

interface PaginatedPOSResponse {
  success: boolean;
  data: {
    essential: EssentialPOSData;
    products: any[];
    pagination: PaginatedPOSData['pagination'];
  };
  meta: {
    execution_time_ms: number;
    organization_id: string;
    data_timestamp: string;
    products_page: number;
    products_limit: number;
  };
  error?: string;
}

interface UsePaginatedPOSDataOptions {
  pageSize?: number;
  enableInfiniteScroll?: boolean;
  searchQuery?: string;
  categoryId?: string;
}

export const usePaginatedPOSData = (options: UsePaginatedPOSDataOptions = {}) => {
  const { 
    pageSize = 50, 
    enableInfiniteScroll = false,
    searchQuery: externalSearchQuery,
    categoryId: externalCategoryId
  } = options;
  
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  
  // حالات البحث والتصفية المحلية
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localCategoryId, setLocalCategoryId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // استخدام البحث الخارجي أو المحلي
  const searchQuery = externalSearchQuery ?? localSearchQuery;
  const categoryId = externalCategoryId ?? localCategoryId;

  // 1️⃣ جلب البيانات الأساسية (مرة واحدة فقط)
  const {
    data: essentialData,
    isLoading: isLoadingEssential,
    error: essentialError,
    refetch: refetchEssential
  } = useQuery({
    queryKey: ['pos-essential-data', currentOrganization?.id],
    queryFn: async (): Promise<EssentialPOSData> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      const { data, error } = await supabase.rpc('get_pos_essential_data' as any, {
        p_organization_id: currentOrganization.id
      });

      if (error) {
        throw new Error(`خطأ في جلب البيانات الأساسية: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'فشل في جلب البيانات الأساسية');
      }

      return data.data;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 10 * 60 * 1000, // 10 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    retry: 2,
  });

  // 2️⃣ جلب المنتجات مع pagination عادي
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    error: productsError,
    refetch: refetchProducts,
    isRefetching: isRefetchingProducts
  } = useQuery({
    queryKey: [
      'pos-products-paginated', 
      currentOrganization?.id, 
      currentPage, 
      pageSize, 
      searchQuery, 
      categoryId
    ],
    queryFn: async (): Promise<PaginatedPOSData> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      const { data, error } = await supabase.rpc('get_pos_products_paginated' as any, {
        p_organization_id: currentOrganization.id,
        p_page: currentPage,
        p_limit: pageSize,
        p_search: searchQuery || null,
        p_category_id: categoryId || null
      });

      if (error) {
        throw new Error(`خطأ في جلب المنتجات: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'فشل في جلب المنتجات');
      }

      return data.data;
    },
    enabled: !!currentOrganization?.id && !enableInfiniteScroll,
    staleTime: 2 * 60 * 1000, // دقيقتان
    gcTime: 5 * 60 * 1000, // 5 دقائق
    retry: 2,
  });

  // 3️⃣ جلب المنتجات مع infinite scroll
  const {
    data: infiniteProductsData,
    isLoading: isLoadingInfiniteProducts,
    error: infiniteProductsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchInfiniteProducts
  } = useInfiniteQuery({
    queryKey: [
      'pos-products-infinite', 
      currentOrganization?.id, 
      pageSize, 
      searchQuery, 
      categoryId
    ],
    queryFn: async ({ pageParam = 1 }): Promise<PaginatedPOSData> => {
      if (!currentOrganization?.id) {
        throw new Error('معرف المؤسسة مطلوب');
      }

      const { data, error } = await supabase.rpc('get_pos_products_paginated' as any, {
        p_organization_id: currentOrganization.id,
        p_page: pageParam,
        p_limit: pageSize,
        p_search: searchQuery || null,
        p_category_id: categoryId || null
      });

      if (error) {
        throw new Error(`خطأ في جلب المنتجات: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'فشل في جلب المنتجات');
      }

      return data.data as PaginatedPOSData;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedPOSData) => {
      return lastPage.pagination.has_next_page 
        ? lastPage.pagination.current_page + 1 
        : undefined;
    },
    enabled: !!currentOrganization?.id && enableInfiniteScroll,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });

  // دوال التحكم في الصفحات
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const nextPage = useCallback(() => {
    if (productsData?.pagination?.has_next_page) {
      setCurrentPage(prev => prev + 1);
    }
  }, [productsData?.pagination?.has_next_page]);

  const prevPage = useCallback(() => {
    if (productsData?.pagination?.has_prev_page) {
      setCurrentPage(prev => prev - 1);
    }
  }, [productsData?.pagination?.has_prev_page]);

  // دوال البحث والتصفية
  const updateSearch = useCallback((query: string) => {
    setLocalSearchQuery(query);
    setCurrentPage(1); // إعادة تعيين الصفحة عند البحث
  }, []);

  const updateCategory = useCallback((catId: string) => {
    setLocalCategoryId(catId);
    setCurrentPage(1); // إعادة تعيين الصفحة عند تغيير الفئة
  }, []);

  // دالة التحديث الشاملة
  const refreshData = useCallback(async () => {
    await Promise.all([
      refetchEssential(),
      enableInfiniteScroll ? refetchInfiniteProducts() : refetchProducts()
    ]);
  }, [refetchEssential, refetchProducts, refetchInfiniteProducts, enableInfiniteScroll]);

  // تجميع البيانات حسب نوع التمرير
  const finalProductsData = useMemo(() => {
    if (enableInfiniteScroll) {
      if (!infiniteProductsData?.pages) return { products: [], pagination: null };
      
      const allProducts = infiniteProductsData.pages.flatMap((page: PaginatedPOSData) => page.products);
      const lastPage = infiniteProductsData.pages[infiniteProductsData.pages.length - 1] as PaginatedPOSData;
      
      return {
        products: allProducts,
        pagination: lastPage?.pagination
      };
    } else {
      return {
        products: productsData?.products || [],
        pagination: productsData?.pagination
      };
    }
  }, [enableInfiniteScroll, infiniteProductsData, productsData]);

  // حالات التحميل والأخطاء
  const isLoading = isLoadingEssential || 
    (enableInfiniteScroll ? isLoadingInfiniteProducts : isLoadingProducts);
  
  const isRefetching = isRefetchingProducts || isFetchingNextPage;
  
  const error = essentialError || 
    (enableInfiniteScroll ? infiniteProductsError : productsError);

  return {
    // البيانات الأساسية
    essentialData,
    products: finalProductsData.products,
    pagination: finalProductsData.pagination,
    
    // البيانات المنفصلة للسهولة
    productCategories: essentialData?.product_categories || [],
    customers: essentialData?.customers || [],
    users: essentialData?.users || [],
    posSettings: essentialData?.pos_settings,
    stats: essentialData?.stats,
    
    // حالات التحميل والأخطاء
    isLoading,
    isRefetching,
    error: !!error,
    errorMessage: error?.message,
    
    // معلومات pagination
    currentPage,
    totalPages: finalProductsData.pagination?.total_pages || 0,
    totalCount: finalProductsData.pagination?.total_count || 0,
    hasNextPage: enableInfiniteScroll ? hasNextPage : finalProductsData.pagination?.has_next_page,
    hasPrevPage: finalProductsData.pagination?.has_prev_page,
    
    // دوال التحكم في pagination
    goToPage,
    nextPage,
    prevPage,
    loadMore: enableInfiniteScroll ? fetchNextPage : undefined,
    
    // دوال البحث والتصفية
    searchQuery,
    categoryId,
    updateSearch,
    updateCategory,
    
    // دوال التحديث
    refreshData,
    
    // معلومات إضافية
    pageSize,
    enableInfiniteScroll
  };
};
