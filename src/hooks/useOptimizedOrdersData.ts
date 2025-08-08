import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/context/TenantContext';
import { Order } from '@/components/orders/table/OrderTableTypes';
// Simple debounce implementation with cancel method
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
  let timeoutId: NodeJS.Timeout;
  const debouncedFunction = (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
  debouncedFunction.cancel = () => clearTimeout(timeoutId);
  return debouncedFunction;
};

interface OptimizedOrdersDataOptions {
  pageSize?: number;
  initialStatus?: string;
  enablePolling?: boolean;
  pollingInterval?: number;
  enableCache?: boolean;
  // خيارات التحكم في حمولة RPC
  rpcOptions?: {
    includeItems?: boolean;
    includeShared?: boolean;
    includeCounts?: boolean;
  };
}

interface OrdersDataState {
  orders: Order[];
  loading: boolean;
  error: any;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  orderCounts: Record<string, number>;
  orderStats: {
    totalSales: number;
    avgOrderValue: number;
    salesTrend: number;
    pendingAmount: number;
  };
  sharedData: {
    callConfirmationStatuses: any[];
    provinces: any[];
    municipalities: any[];
    shippingProviders: any[];
    organizationSettings: any;
  };
  metadata: {
    pagination: any;
    filters: any;
    performance: any;
    dataFreshness: any;
  };
}

interface Filters {
  status: string;
  searchTerm: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  callConfirmationStatusId: number | null;
  shippingProvider: string | null;
}

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_POLLING_INTERVAL = 60000; // 60 seconds
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useOptimizedOrdersData = (options: OptimizedOrdersDataOptions = {}) => {
  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => {
    const defaultRpcOptions = {
      includeItems: false,
      includeShared: false,
      includeCounts: true,
    };
    return {
      pageSize: DEFAULT_PAGE_SIZE,
      initialStatus: 'all',
      enablePolling: false,
      pollingInterval: DEFAULT_POLLING_INTERVAL,
      enableCache: true,
      ...options,
      rpcOptions: { ...defaultRpcOptions, ...(options.rpcOptions || {}) },
    } as OptimizedOrdersDataOptions;
  }, [JSON.stringify(options)]);

  const {
    pageSize,
    initialStatus,
    enablePolling,
    pollingInterval,
    enableCache,
  } = memoizedOptions;
  const rpcOptions = (memoizedOptions as OptimizedOrdersDataOptions).rpcOptions || { includeItems: false, includeShared: false, includeCounts: true };

  const { currentOrganization } = useTenant();
  const { toast } = useToast();

  const [state, setState] = useState<OrdersDataState>({
    orders: [],
    loading: true,
    error: null,
    hasMore: true,
    totalCount: 0,
    currentPage: 1,
    orderCounts: {},
    orderStats: {
      totalSales: 0,
      avgOrderValue: 0,
      salesTrend: 0,
      pendingAmount: 0,
    },
    sharedData: {
      callConfirmationStatuses: [],
      provinces: [],
      municipalities: [],
      shippingProviders: [],
      organizationSettings: null,
    },
    metadata: {
      pagination: {},
      filters: {},
      performance: {},
      dataFreshness: {},
    },
  });

  const [filters, setFilters] = useState<Filters>({
    status: initialStatus,
    searchTerm: '',
    dateFrom: null,
    dateTo: null,
    callConfirmationStatusId: null,
    shippingProvider: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track last filter call to prevent duplicates
  const lastApplyFiltersRef = useRef<string>('');

  // Generate cache key
  const getCacheKey = useCallback((page: number, currentFilters: Filters) => {
    return `orders-${currentOrganization?.id}-${page}-${pageSize}-${JSON.stringify(currentFilters)}`;
  }, [currentOrganization?.id, pageSize]);

  // Check cache validity
  const isCacheValid = useCallback((timestamp: number) => {
    return enableCache && (Date.now() - timestamp) < CACHE_DURATION;
  }, [enableCache]);

  // Main data fetching function using the optimized RPC
  const fetchOrdersData = useCallback(async (
    page: number = 1, 
    currentFilters: Filters = filters,
    useCache: boolean = true
  ) => {
    if (!currentOrganization?.id) return;

    const cacheKey = getCacheKey(page, currentFilters);
    
    // Check cache first
    if (useCache && cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      if (isCacheValid(cached.timestamp)) {
        
        setState(prev => ({
          ...prev,
          ...cached.data,
          loading: false,
          error: null,
        }));
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const startTime = performance.now();

      // استدعاء الدالة مع دعم الأعلام الإضافية وفولباك في حال عدم توافق التوقيع
      let data: any;
      let error: any;
      try {
        const resp = await supabase.rpc('get_orders_complete_data' as any, {
          p_organization_id: currentOrganization.id,
          p_page: page,
          p_page_size: pageSize,
          p_status: currentFilters.status === 'all' ? null : currentFilters.status,
          p_call_confirmation_status_id: currentFilters.callConfirmationStatusId,
          p_shipping_provider: currentFilters.shippingProvider,
          p_search_term: currentFilters.searchTerm || null,
          p_date_from: currentFilters.dateFrom?.toISOString() || null,
          p_date_to: currentFilters.dateTo?.toISOString() || null,
          p_sort_by: 'created_at',
          p_sort_order: 'desc',
          p_include_items: rpcOptions.includeItems ?? false,
          p_include_shared: rpcOptions.includeShared ?? false,
          // اجعل العد ديناميكياً: الصفحة الأولى فقط لتقليل التكلفة
          p_include_counts: (rpcOptions.includeCounts ?? true) && page === 1,
        });
        data = resp.data;
        error = resp.error;
        if (error && typeof error.message === 'string' && /get_orders_complete_data/i.test(error.message)) {
          throw error;
        }
      } catch (_) {
        const respFallback = await supabase.rpc('get_orders_complete_data' as any, {
          p_organization_id: currentOrganization.id,
          p_page: page,
          p_page_size: pageSize,
          p_status: currentFilters.status === 'all' ? null : currentFilters.status,
          p_call_confirmation_status_id: currentFilters.callConfirmationStatusId,
          p_shipping_provider: currentFilters.shippingProvider,
          p_search_term: currentFilters.searchTerm || null,
          p_date_from: currentFilters.dateFrom?.toISOString() || null,
          p_date_to: currentFilters.dateTo?.toISOString() || null,
          p_sort_by: 'created_at',
          p_sort_order: 'desc',
        });
        data = respFallback.data;
        error = respFallback.error;
      }

      const endTime = performance.now();

      if (error) {
        throw error;
      }

      const responseData = data as any;
      if (!responseData?.success) {
        throw new Error(responseData?.error || 'Failed to fetch orders data');
      }

      // Process the response
      const processedOrders: Order[] = (responseData.orders || []).map((order: any) => ({
        ...order,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        discount: order.discount ? Number(order.discount) : null,
        total: Number(order.total),
        shipping_cost: order.shipping_cost ? Number(order.shipping_cost) : null,
        employee_id: order.employee_id || null,
        order_items: Array.isArray(order.order_items) ? order.order_items : [],
        customer: order.customer || null,
        shipping_address: order.shipping_address || null,
        call_confirmation_status: order.call_confirmation_status || null,
      }));

      const newState = {
        orders: processedOrders,
        loading: false,
        error: null,
        hasMore: responseData.metadata?.pagination?.hasNextPage || false,
        totalCount: responseData.metadata?.pagination?.totalItems || 0,
        currentPage: page,
        orderCounts: responseData.counts || {},
        orderStats: {
          totalSales: responseData.stats?.totalSales || 0,
          avgOrderValue: responseData.stats?.avgOrderValue || 0,
          salesTrend: responseData.stats?.salesTrend || 0,
          pendingAmount: responseData.stats?.pendingAmount || 0,
        },
        sharedData: {
          callConfirmationStatuses: responseData.sharedData?.callConfirmationStatuses || [],
          provinces: responseData.sharedData?.provinces || [],
          municipalities: responseData.sharedData?.municipalities || [],
          shippingProviders: responseData.sharedData?.shippingProviders || [],
          organizationSettings: responseData.sharedData?.organizationSettings || null,
        },
        metadata: responseData.metadata || {},
      };

      setState(prev => ({ ...prev, ...newState }));

      // Cache the result
      if (enableCache) {
        cacheRef.current.set(cacheKey, {
          data: newState,
          timestamp: Date.now(),
        });
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error,
      }));
      
      toast({
        variant: "destructive",
        title: "خطأ في جلب الطلبات",
        description: "حدث خطأ أثناء محاولة جلب الطلبات. يرجى المحاولة مرة أخرى.",
      });
    }
  }, [currentOrganization?.id, pageSize, getCacheKey, isCacheValid, enableCache]);

  // Load more orders (for infinite scroll) مع Gate لمنع السباقات
  const loadMoreInFlightRef = useRef(false);
  const loadMore = useCallback(() => {
    if (loadMoreInFlightRef.current) return;
    if (!state.loading && state.hasMore) {
      loadMoreInFlightRef.current = true;
      Promise.resolve(fetchOrdersData(state.currentPage + 1, filters, true))
        .finally(() => { loadMoreInFlightRef.current = false; });
    }
  }, [state.loading, state.hasMore, state.currentPage, filters, fetchOrdersData]);

  // Go to specific page (page is 0-based index from UI)
  const goToPage = useCallback((page: number) => {
    const targetPage = page + 1; // Convert to 1-based for RPC
    fetchOrdersData(targetPage, filters, true);
  }, [filters, fetchOrdersData]);

  // Debounced fetch for search filters
  const debouncedFetchOrdersData = useMemo(
    () => debounce((page: number, filters: Filters, useCache: boolean) => {
      fetchOrdersData(page, filters, useCache);
    }, 500), // 500ms delay for search
    [fetchOrdersData]
  );

  // Apply filters with debouncing for search
  const applyFilters = useCallback((newFilters: Partial<Filters>) => {
    setFilters(currentFilters => {
      // Create a unique key for this filter call
      const filterKey = JSON.stringify({ current: currentFilters, new: newFilters });
      
      // Check if this is a duplicate call
      if (lastApplyFiltersRef.current === filterKey) {
        return currentFilters; // Return current state without changes
      }

      lastApplyFiltersRef.current = filterKey;
      
      const updatedFilters = { ...currentFilters, ...newFilters };
      
      // If it's a search term change, use debounced function
      if (newFilters.searchTerm !== undefined && newFilters.searchTerm !== currentFilters.searchTerm) {
        debouncedFetchOrdersData(1, updatedFilters, false);
      } else {
        // For non-search filters (status, date, etc.), fetch immediately
        fetchOrdersData(1, updatedFilters, false);
      }
      
      // Clear the duplicate check after a short delay
      setTimeout(() => {
        lastApplyFiltersRef.current = '';
      }, 100);
      
      return updatedFilters;
    });
  }, [fetchOrdersData, debouncedFetchOrdersData]);

  // Update filters without fetching
  const updateFilters = useCallback((newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Update order locally مع تحديث كاش الصفحات بدلاً من المسح الكامل
  const updateOrderLocally = useCallback((orderId: string, updates: Partial<Order>) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(order => 
        order.id === orderId ? { ...order, ...updates } : order
      ),
    }));
    for (const [key, entry] of cacheRef.current.entries()) {
      if (!entry?.data?.orders) continue;
      const updated = (entry.data.orders as Order[]).map((o: Order) => (o.id === orderId ? { ...o, ...updates } : o));
      cacheRef.current.set(key, { ...entry, data: { ...entry.data, orders: updated } });
    }
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    // Clear cache
    cacheRef.current.clear();
    
    // Fetch fresh data
    fetchOrdersData(state.currentPage, filters, false);
  }, [state.currentPage, filters, fetchOrdersData]);

  // Setup polling
  useEffect(() => {
    if (enablePolling && pollingInterval > 0) {
      pollingIntervalRef.current = setInterval(() => {
        if (!state.loading) {
          fetchOrdersData(state.currentPage, filters, false);
        }
      }, pollingInterval);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [enablePolling, pollingInterval, state.loading, state.currentPage, filters, fetchOrdersData]);

  // Initial load only (run once when organization changes)
  useEffect(() => {
    if (currentOrganization?.id) {
      fetchOrdersData(1, filters, true);
    }
  }, [currentOrganization?.id]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      // Cancel any pending debounced calls
      debouncedFetchOrdersData.cancel();
    };
  }, [debouncedFetchOrdersData]);

  // Memoized values
  const memoizedState = useMemo(() => state, [state]);
  const memoizedFilters = useMemo(() => filters, [filters]);

  return {
    ...memoizedState,
    filters: memoizedFilters,
    loadMore,
    applyFilters,
    updateFilters,
    goToPage,
    updateOrderLocally,
    refresh,
    pageSize,
    // Additional performance info
    getCacheStats: () => ({
      cacheSize: cacheRef.current.size,
      cacheKeys: Array.from(cacheRef.current.keys()),
    }),
    clearCache: () => cacheRef.current.clear(),
  };
};
