import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// تم إزالة console-manager - نستخدم console عادي
import { toast } from 'sonner';
import { 
  getInventoryProductsPaginated,
  searchInventoryAutocomplete,
  getInventoryAdvancedStats,
  bulkUpdateInventory,
  clearInventoryCache,
  type InventoryProduct,
  type InventoryAdvancedFilters,
  type InventoryPaginatedResponse,
  type InventoryAdvancedStats,
  type BulkUpdateItem,
  type BulkUpdateResult
} from '@/lib/api/inventory-advanced-api';
import { useDebounce } from '@/hooks/useDebounce';
import { useOptimizedInterval } from '@/hooks/useOptimizedInterval';

interface UseInventoryAdvancedOptions {
  initialPageSize?: number;
  enableInfiniteScroll?: boolean;
  enableRealTimeStats?: boolean;
  cacheDuration?: number;
  autoRefreshInterval?: number;
}

interface UseInventoryAdvancedState {
  // البيانات الأساسية
  products: InventoryProduct[];
  stats: InventoryAdvancedStats | null;
  
  // حالة التحميل
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  isBulkUpdating: boolean;
  
  // معلومات الصفحات
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  totalCount: number;
  filteredCount: number;
  
  // الفلاتر والبحث
  filters: InventoryAdvancedFilters;
  searchQuery: string;
  autocompleteResults: Array<{
    id: string;
    name: string;
    sku: string;
    barcode: string;
    thumbnail_image: string;
    stock_quantity: number;
    stock_status: string;
    category: string;
  }>;
  
  // أخطاء
  error: string | null;
  bulkUpdateErrors: Array<{ product_id: string; error: string }>;
  
  // إحصائيات الأداء
  lastFetchTime: number;
  requestsCount: number;
  cacheHitRate: number;
  
  // إحصائيات محسوبة
  computedStats: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    reorderNeeded: number;
    totalValue: number;
    averageStock: number;
  } | null;
}

interface UseInventoryAdvancedActions {
  // عمليات البيانات
  loadProducts: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // البحث والفلترة
  setFilters: (newFilters: Partial<InventoryAdvancedFilters>) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  
  // العمليات المتقدمة
  bulkUpdate: (updates: BulkUpdateItem[]) => Promise<BulkUpdateResult>;
  exportData: (format?: 'csv' | 'xlsx') => Promise<void>;
  
  // إدارة الحالة
  clearError: () => void;
  clearCache: () => void;
  
  // تحكم في التحديث التلقائي
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
}

export type UseInventoryAdvancedReturn = UseInventoryAdvancedState & UseInventoryAdvancedActions;

const DEFAULT_OPTIONS: UseInventoryAdvancedOptions = {
  initialPageSize: 50,
  enableInfiniteScroll: true,
  enableRealTimeStats: true,
  cacheDuration: 30000,
  autoRefreshInterval: 300000 // 5 دقائق
};

export function useInventoryAdvanced(
  options: UseInventoryAdvancedOptions = {}
): UseInventoryAdvancedReturn {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // الحالة الأساسية
  const [state, setState] = useState<UseInventoryAdvancedState>({
    products: [],
    stats: null,
    isLoading: false,
    isLoadingMore: false,
    isRefreshing: false,
    isBulkUpdating: false,
    currentPage: 1,
    totalPages: 1,
    hasMore: false,
    totalCount: 0,
    filteredCount: 0,
    filters: {},
    searchQuery: '',
    autocompleteResults: [],
    error: null,
    bulkUpdateErrors: [],
    lastFetchTime: 0,
    requestsCount: 0,
    cacheHitRate: 0,
    computedStats: null
  });

  // مراجع للتحكم
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const cacheHitsRef = useRef<number>(0);
  const totalRequestsRef = useRef<number>(0);

  // Debounced search query
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);

  // تنظيف عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // تحديث الفلاتر عند تغيير البحث
  useEffect(() => {
    if (debouncedSearchQuery !== state.filters.search_query) {
      setFilters({ search_query: debouncedSearchQuery });
    }
  }, [debouncedSearchQuery]);

  // البحث السريع للـ autocomplete
  useEffect(() => {
    if (state.searchQuery.trim().length > 0) {
      const fetchAutocomplete = async () => {
        try {
          const results = await searchInventoryAutocomplete(state.searchQuery, 10);
          setState(prev => ({ ...prev, autocompleteResults: results }));
        } catch (error) {
        }
      };

      const timeoutId = setTimeout(fetchAutocomplete, 150);
      return () => clearTimeout(timeoutId);
    } else {
      setState(prev => ({ ...prev, autocompleteResults: [] }));
    }
  }, [state.searchQuery]);

  // تحديث الإحصائيات المحسوبة عند تغيير المنتجات
  useEffect(() => {
    if (!state.products.length) {
      setState(prev => ({ ...prev, computedStats: null }));
      return;
    }

    const inStock = state.products.filter(p => p.stock_status === 'in-stock').length;
    const lowStock = state.products.filter(p => p.stock_status === 'low-stock').length;
    const outOfStock = state.products.filter(p => p.stock_status === 'out-of-stock').length;
    const reorderNeeded = state.products.filter(p => p.reorder_needed).length;

    const computedStats = {
      inStock,
      lowStock,
      outOfStock,
      reorderNeeded,
      totalValue: state.products.reduce((sum, p) => sum + p.stock_value, 0),
      averageStock: state.products.reduce((sum, p) => sum + p.stock_quantity, 0) / state.products.length
    };

    setState(prev => ({ ...prev, computedStats }));
  }, [state.products]);

  // تحميل المنتجات
  const loadProducts = useCallback(async (reset: boolean = false) => {
    try {
      // إلغاء الطلب السابق
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const page = reset ? 1 : state.currentPage;
      const startTime = Date.now();

      setState(prev => ({
        ...prev,
        isLoading: reset,
        isLoadingMore: !reset && prev.products.length > 0,
        error: null
      }));

      // تتبع الطلبات
      totalRequestsRef.current++;

      const response: InventoryPaginatedResponse = await getInventoryProductsPaginated(
        page,
        config.initialPageSize!,
        state.filters
      );

      const requestTime = Date.now() - startTime;
      
      // تحقق من الcache hit (إذا كان الطلب سريع جداً)
      if (requestTime < 50) {
        cacheHitsRef.current++;
      }

      setState(prev => ({
        ...prev,
        products: reset ? response.products : [...prev.products, ...response.products],
        currentPage: page,
        totalPages: Math.ceil(response.filtered_count / config.initialPageSize!),
        hasMore: response.has_more,
        totalCount: response.total_count,
        filteredCount: response.filtered_count,
        isLoading: false,
        isLoadingMore: false,
        lastFetchTime: Date.now(),
        requestsCount: totalRequestsRef.current,
        cacheHitRate: (cacheHitsRef.current / totalRequestsRef.current) * 100
      }));

      // تحميل الإحصائيات في الخلفية
      if (config.enableRealTimeStats && reset) {
        loadStats();
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error('Error loading products:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        error: error.message || 'خطأ في تحميل المنتجات'
      }));
      
      toast.error('حدث خطأ أثناء تحميل المنتجات');
    }
  }, [state.currentPage, state.filters, config.initialPageSize, config.enableRealTimeStats]);

  // تحميل الإحصائيات
  const loadStats = useCallback(async () => {
    try {
      const stats = await getInventoryAdvancedStats();
      setState(prev => ({ ...prev, stats }));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  // تحميل المزيد
  const loadMore = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore) return;
    
    setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
    await loadProducts(false);
  }, [state.isLoadingMore, state.hasMore, loadProducts]);

  // تحديث البيانات
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true, currentPage: 1 }));
    clearCache();
    await loadProducts(true);
    setState(prev => ({ ...prev, isRefreshing: false }));
    toast.success('تم تحديث البيانات بنجاح');
  }, [loadProducts]);

  // تعيين الفلاتر
  const setFilters = useCallback((newFilters: Partial<InventoryAdvancedFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      currentPage: 1,
      products: []
    }));
  }, []);

  // تعيين استعلام البحث
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  // مسح الفلاتر
  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {},
      searchQuery: '',
      currentPage: 1,
      products: [],
      autocompleteResults: []
    }));
  }, []);

  // التحديث المجمع
  const bulkUpdate = useCallback(async (updates: BulkUpdateItem[]): Promise<BulkUpdateResult> => {
    try {
      setState(prev => ({ ...prev, isBulkUpdating: true, bulkUpdateErrors: [] }));

      const result = await bulkUpdateInventory(updates);

      setState(prev => ({
        ...prev,
        isBulkUpdating: false,
        bulkUpdateErrors: result.failed_updates || []
      }));

      if (result.success && result.updated_count > 0) {
        toast.success(`تم تحديث ${result.updated_count} منتج بنجاح`);
        await refresh();
      }

      if (result.failed_updates?.length > 0) {
        toast.error(`فشل في تحديث ${result.failed_updates.length} منتج`);
      }

      return result;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isBulkUpdating: false,
        error: error.message || 'خطأ في التحديث المجمع'
      }));
      
      toast.error('حدث خطأ أثناء التحديث المجمع');
      throw error;
    }
  }, [refresh]);

  // تصدير البيانات
  const exportData = useCallback(async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      const { exportInventoryData } = await import('@/lib/api/inventory-advanced-api');
      const blob = await exportInventoryData(format, state.filters);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('تم تصدير البيانات بنجاح');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  }, [state.filters]);

  // مسح الخطأ
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, bulkUpdateErrors: [] }));
  }, []);

  // مسح الـ cache
  const clearCache = useCallback(() => {
    clearInventoryCache();
    cacheHitsRef.current = 0;
    totalRequestsRef.current = 0;
    setState(prev => ({ ...prev, cacheHitRate: 0, requestsCount: 0 }));
  }, []);

  // التحديث التلقائي مع useOptimizedInterval
  useOptimizedInterval(() => {
    if (config.enableRealTimeStats) {
      loadStats();
    }
  }, config.enableRealTimeStats ? config.autoRefreshInterval : null, {
    enabled: config.enableRealTimeStats,
    adaptiveDelay: true,
    maxInstances: 1
  });

  // دوال فارغة للتوافق مع API السابق
  const startAutoRefresh = useCallback(() => {
    // لم تعد هناك حاجة لتنفيذ - يدار بـ useOptimizedInterval
  }, []);

  const stopAutoRefresh = useCallback(() => {
    // لم تعد هناك حاجة لتنفيذ - يدار بـ useOptimizedInterval
  }, []);

  // تحميل أولي
  useEffect(() => {
    loadProducts(true);
  }, [state.filters]);

  return {
    // الحالة
    ...state,
    
    // الإجراءات
    loadProducts,
    loadMore,
    refresh,
    setFilters,
    setSearchQuery,
    clearFilters,
    bulkUpdate,
    exportData,
    clearError,
    clearCache,
    startAutoRefresh,
    stopAutoRefresh
  };
}

export default useInventoryAdvanced;
