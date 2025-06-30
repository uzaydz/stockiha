import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '@/types';
import { 
  getPaginatedProducts, 
  ProductsFilterOptions, 
  PaginatedProductsResponse,
  transformDatabaseProduct 
} from '@/lib/api/pos-products-api';
import { useDebounce } from './useDebounce';

interface UsePOSInfiniteProductsOptions {
  organizationId: string | undefined;
  pageSize?: number;
  searchQuery?: string;
  categoryId?: string;
  sortBy?: 'name' | 'price' | 'stock' | 'created';
  sortOrder?: 'ASC' | 'DESC';
  includeVariants?: boolean;
  enabled?: boolean;
}

interface UsePOSInfiniteProductsReturn {
  products: Product[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasNextPage: boolean;
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setCategoryId: (categoryId: string | null) => void;
  setSortBy: (sortBy: 'name' | 'price' | 'stock' | 'created') => void;
  setSortOrder: (order: 'ASC' | 'DESC') => void;
}

export function usePOSInfiniteProducts({
  organizationId,
  pageSize = 50,
  searchQuery: initialSearchQuery = '',
  categoryId: initialCategoryId,
  sortBy: initialSortBy = 'name',
  sortOrder: initialSortOrder = 'ASC',
  includeVariants = true,
  enabled = true
}: UsePOSInfiniteProductsOptions): UsePOSInfiniteProductsReturn {
  // حالة البيانات
  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  
  // حالة التحميل
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // حالة الفلترة
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId || null);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'created'>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(initialSortOrder);
  
  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // مرجع لتتبع طلبات التحميل
  const loadingRef = useRef<AbortController | null>(null);
  
  // دالة جلب المنتجات
  const fetchProducts = useCallback(async (
    page: number, 
    reset: boolean = false,
    options: Partial<ProductsFilterOptions> = {}
  ) => {
    if (!organizationId || !enabled) return;
    
    // إلغاء أي طلب سابق
    if (loadingRef.current) {
      loadingRef.current.abort();
    }
    
    // إنشاء AbortController جديد
    const abortController = new AbortController();
    loadingRef.current = abortController;
    
    try {
      setError(null);
      
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const filterOptions: ProductsFilterOptions = {
        page,
        pageSize,
        searchQuery: debouncedSearchQuery || undefined,
        categoryId: categoryId || undefined,
        sortBy,
        sortOrder,
        includeVariants,
        ...options
      };
      
      const response = await getPaginatedProducts(organizationId, filterOptions);
      
      // التحقق من إلغاء الطلب
      if (abortController.signal.aborted) {
        return;
      }
      
      const transformedProducts = response.products.map(transformDatabaseProduct);
      
      if (reset) {
        setProducts(transformedProducts);
      } else {
        setProducts(prev => [...prev, ...transformedProducts]);
      }
      
      setCurrentPage(response.currentPage);
      setTotalPages(response.pageCount);
      setTotalProducts(response.totalCount);
      setHasNextPage(response.hasNextPage);
      
    } catch (err: any) {
      // تجاهل الأخطاء الناتجة عن إلغاء الطلب
      if (err.name === 'AbortError') {
        return;
      }
      
      setError(err.message || 'حدث خطأ في تحميل المنتجات');
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadingRef.current = null;
      }
    }
  }, [organizationId, enabled, pageSize, debouncedSearchQuery, categoryId, sortBy, sortOrder, includeVariants]);
  
  // تحميل المزيد
  const loadMore = useCallback(async () => {
    if (!hasNextPage || isLoadingMore || isLoading) return;
    await fetchProducts(currentPage + 1, false);
  }, [hasNextPage, isLoadingMore, isLoading, currentPage, fetchProducts]);
  
  // إعادة تحميل البيانات
  const refresh = useCallback(async () => {
    setCurrentPage(1);
    await fetchProducts(1, true);
  }, [fetchProducts]);
  
  // تحميل البيانات عند تغيير الفلاتر
  useEffect(() => {
    if (!enabled || !organizationId) return;
    
    setCurrentPage(1);
    fetchProducts(1, true);
    
    // تنظيف عند إلغاء التركيب
    return () => {
      if (loadingRef.current) {
        loadingRef.current.abort();
      }
    };
  }, [enabled, organizationId, debouncedSearchQuery, categoryId, sortBy, sortOrder]);
  
  return {
    products,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    currentPage,
    totalPages,
    totalProducts,
    loadMore,
    refresh,
    setSearchQuery,
    setCategoryId: (id: string | null) => {
      if (categoryId !== id) {
        setCategoryId(id);
      }
    },
    setSortBy: (newSortBy: 'name' | 'price' | 'stock' | 'created') => {
      if (sortBy !== newSortBy) {
        setSortBy(newSortBy);
      }
    },
    setSortOrder: (newOrder: 'ASC' | 'DESC') => {
      if (sortOrder !== newOrder) {
        setSortOrder(newOrder);
      }
    }
  };
}

// Hook مساعد لتحميل المنتجات تلقائياً عند الوصول لنهاية القائمة
export function useAutoLoadMore(
  inView: boolean,
  { hasNextPage, isLoadingMore, isLoading, loadMore }: Pick<UsePOSInfiniteProductsReturn, 'hasNextPage' | 'isLoadingMore' | 'isLoading' | 'loadMore'>
) {
  useEffect(() => {
    if (inView && hasNextPage && !isLoadingMore && !isLoading) {
      loadMore();
    }
  }, [inView, hasNextPage, isLoadingMore, isLoading, loadMore]);
}
