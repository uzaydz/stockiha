import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// Global cache for customer, address data to avoid repeated fetches
const globalDataCache = {
  customers: new Map<string, any>(),
  addresses: new Map<string, any>(),
  lastFetched: {
    customers: 0,
    addresses: 0
  }
};
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/context/TenantContext';
import { Order } from '@/components/orders/table/OrderTableTypes';
import { useOptimizedInterval } from '@/hooks/useOptimizedInterval';

interface UseOrdersDataOptions {
  pageSize?: number;
  initialStatus?: string;
  enablePolling?: boolean;
  pollingInterval?: number;
}

interface OrdersDataState {
  orders: Order[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  orderCounts: {
    all: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  orderStats: {
    totalSales: number;
    avgOrderValue: number;
    salesTrend: number;
    pendingAmount: number;
  };
}

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_POLLING_INTERVAL = 30000; // 30 seconds

export const useOrdersData = (options: UseOrdersDataOptions = {}) => {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    initialStatus = 'all',
    enablePolling = false,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
  } = options;

  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  
  const [state, setState] = useState<OrdersDataState>({
    orders: [],
    loading: true,
    error: null,
    hasMore: true,
    totalCount: 0,
    currentPage: 0,
    orderCounts: {
      all: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    },
    orderStats: {
      totalSales: 0,
      avgOrderValue: 0,
      salesTrend: 0,
      pendingAmount: 0,
    },
  });

  const [filters, setFilters] = useState({
    status: initialStatus,
    searchTerm: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, Order[]>>(new Map());

  // Generate cache key from filters
  const getCacheKey = useCallback((page: number) => {
    return `${filters.status}-${filters.searchTerm}-${filters.dateFrom?.toISOString()}-${filters.dateTo?.toISOString()}-${page}`;
  }, [filters]);

  // Fetch orders with fallback to existing structure
  const fetchOrdersOptimized = useCallback(async (page: number, signal?: AbortSignal) => {
    if (!currentOrganization?.id) return;

    const cacheKey = getCacheKey(page);
    
    // Check cache first
    if (cacheRef.current.has(cacheKey)) {
      const cachedOrders = cacheRef.current.get(cacheKey)!;
      setState(prev => ({
        ...prev,
        orders: page === 0 ? cachedOrders : [...prev.orders, ...cachedOrders],
        loading: false,
      }));
      return;
    }

    try {
      // Use existing query structure since RPC function doesn't exist yet
      let query = supabase
        .from('online_orders')
        .select(`
          id,
          customer_id,
          subtotal,
          tax,
          discount,
          total,
          status,
          payment_method,
          payment_status,
          shipping_address_id,
          shipping_method,
          shipping_cost,
          shipping_option,
          notes,
          employee_id,
          created_at,
          updated_at,
          organization_id,
          slug,
          customer_order_number,
          created_from,
          call_confirmation_status_id,
          call_confirmation_notes,
          call_confirmation_updated_at,
          call_confirmation_updated_by,
          form_data,
          metadata,
          yalidine_tracking_id,
          zrexpress_tracking_id,
          ecotrack_tracking_id,
          order_items:online_order_items(
            id, 
            product_id, 
            product_name, 
            quantity, 
            unit_price, 
            total_price, 
            color_id, 
            color_name, 
            size_id, 
            size_name
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.searchTerm) {
        query = query.or(`customer_order_number.ilike.%${filters.searchTerm}%,id.ilike.%${filters.searchTerm}%`);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }

      const { data: ordersData, error } = await query;

      if (error) throw error;

      // Process the data and fetch related customer/address data
      const rawOrders: any[] = ordersData || [];
      
      // Extract customer IDs, address IDs, and order IDs for batch fetching
      const customerIds = rawOrders
        .filter(order => order.customer_id)
        .map(order => order.customer_id);
      
      const addressIds = rawOrders
        .filter(order => order.shipping_address_id)
        .map(order => order.shipping_address_id);
      
      const orderIds = rawOrders.map(order => order.id);

      let customersData: any[] = [];
      let guestCustomersData: any[] = [];
      let addressesData: any[] = [];
      let shippingOrdersData: any[] = [];

      // Check if this is a fresh request (page 0) vs continuation
      const isFreshRequest = page === 0;
      
      // Smart data fetching strategy
      if (isFreshRequest) {
        // Clear cache on fresh requests to prevent stale data
        globalDataCache.customers.clear();
        globalDataCache.addresses.clear();
        
        // For fresh requests, fetch all required data
        const promises: any[] = [];

        // Fetch customers that are not already cached
        if (customerIds.length > 0) {
          const customersPromise = supabase
            .from('customers')
            .select('id, name, phone, email, organization_id')
            .in('id', customerIds)
            .eq('organization_id', currentOrganization.id)
            .then(result => {
              const customers = result.data || [];
              // Cache the customers
              customers.forEach(customer => {
                globalDataCache.customers.set(customer.id, customer);
              });
              return { type: 'customers' as const, data: customers };
            });
          promises.push(customersPromise);
          
          const guestCustomersPromise = supabase
            .from('guest_customers')
            .select('id, name, phone, organization_id')
            .in('id', customerIds)
            .eq('organization_id', currentOrganization.id)
            .then(result => {
              const guestCustomers = (result.data || []).map(guest => ({ ...guest, email: null }));
              // Cache the guest customers
              guestCustomers.forEach(customer => {
                globalDataCache.customers.set(customer.id, customer);
              });
              return { type: 'guestCustomers' as const, data: guestCustomers };
            });
          promises.push(guestCustomersPromise);
        }

        // Fetch addresses
        if (addressIds.length > 0) {
          const addressesPromise = supabase
            .from('addresses')
            .select('*')
            .in('id', addressIds)
            .then(result => {
              const addresses = result.data || [];
              // Cache the addresses
              addresses.forEach(address => {
                globalDataCache.addresses.set(address.id, address);
              });
              return { type: 'addresses' as const, data: addresses };
            });
          promises.push(addressesPromise);
        }

        // Fetch shipping orders data for all orders at once
        if (orderIds.length > 0) {
          const shippingOrdersPromise = supabase
            .from('shipping_orders')
            .select(`
              id,
              order_id,
              tracking_number,
              provider_id,
              shipping_providers!provider_id(id, code, name)
            `)
            .in('order_id', orderIds)
            .order('created_at', { ascending: false })
            .then(result => ({ type: 'shippingOrders' as const, data: result.data || [] }));
          promises.push(shippingOrdersPromise);
        }

        // Execute all promises and process results
        try {
          const results = await Promise.all(promises);
          
          results.forEach(result => {
            switch (result.type) {
              case 'customers':
                customersData = result.data;
                break;
              case 'guestCustomers':
                guestCustomersData = result.data;
                break;
              case 'addresses':
                addressesData = result.data;
                break;
              case 'shippingOrders':
                shippingOrdersData = result.data;
                break;
            }
          });
        } catch (error) {
        }
      } else {
        // For pagination, use cached data and only fetch missing items
        const promises: any[] = [];

        // Only fetch customers that are not already cached
        const uncachedCustomerIds = customerIds.filter(id => !globalDataCache.customers.has(id));
        if (uncachedCustomerIds.length > 0) {
          const customersPromise = supabase
            .from('customers')
            .select('id, name, phone, email, organization_id')
            .in('id', uncachedCustomerIds)
            .eq('organization_id', currentOrganization.id)
            .then(result => {
              const customers = result.data || [];
              customers.forEach(customer => {
                globalDataCache.customers.set(customer.id, customer);
              });
              return { type: 'customers' as const, data: customers };
            });
          promises.push(customersPromise);
          
          const guestCustomersPromise = supabase
            .from('guest_customers')
            .select('id, name, phone, organization_id')
            .in('id', uncachedCustomerIds)
            .eq('organization_id', currentOrganization.id)
            .then(result => {
              const guestCustomers = (result.data || []).map(guest => ({ ...guest, email: null }));
              guestCustomers.forEach(customer => {
                globalDataCache.customers.set(customer.id, customer);
              });
              return { type: 'guestCustomers' as const, data: guestCustomers };
            });
          promises.push(guestCustomersPromise);
        }

        // Only fetch addresses that are not already cached
        const uncachedAddressIds = addressIds.filter(id => !globalDataCache.addresses.has(id));
        if (uncachedAddressIds.length > 0) {
          const addressesPromise = supabase
            .from('addresses')
            .select('*')
            .in('id', uncachedAddressIds)
            .then(result => {
              const addresses = result.data || [];
              addresses.forEach(address => {
                globalDataCache.addresses.set(address.id, address);
              });
              return { type: 'addresses' as const, data: addresses };
            });
          promises.push(addressesPromise);
        }

        // Always fetch shipping orders for current page orders
        if (orderIds.length > 0) {
          const shippingOrdersPromise = supabase
            .from('shipping_orders')
            .select(`
              id,
              order_id,
              tracking_number,
              provider_id,
              shipping_providers!provider_id(id, code, name)
            `)
            .in('order_id', orderIds)
            .order('created_at', { ascending: false })
            .then(result => ({ type: 'shippingOrders' as const, data: result.data || [] }));
          promises.push(shippingOrdersPromise);
        }

        // Execute all promises and process results
        try {
          const results = await Promise.all(promises);
          
          results.forEach(result => {
            switch (result.type) {
              case 'customers':
                customersData = result.data;
                break;
              case 'guestCustomers':
                guestCustomersData = result.data;
                break;
              case 'addresses':
                addressesData = result.data;
                break;
              case 'shippingOrders':
                shippingOrdersData = result.data;
                break;
            }
          });
        } catch (error) {
        }
      }

      // Combine all customer data (fresh + cached)
      const allCustomersData = [...customersData, ...guestCustomersData];
      
      const processedOrders: Order[] = rawOrders.map(order => {
        // Find customer data (check cache first, then fetched data)
        let customer = null;
        if (order.customer_id) {
          customer = globalDataCache.customers.get(order.customer_id) || 
                   allCustomersData.find(c => c.id === order.customer_id) || 
                   null;
        }

        // Find address data (check cache first, then fetched data)
        let shippingAddress = null;
        if (order.shipping_address_id) {
          const addressData = globalDataCache.addresses.get(order.shipping_address_id) || 
                             addressesData.find(addr => addr.id === order.shipping_address_id);
          if (addressData) {
            shippingAddress = {
              id: addressData.id || '',
              name: addressData.name || undefined,
              street_address: addressData.street_address || undefined,
              state: addressData.state || undefined,
              municipality: addressData.municipality || undefined,
              country: addressData.country || undefined,
              phone: addressData.phone || undefined
            };
          }
        }

        // Find shipping orders data
        const orderShippingData = shippingOrdersData.filter(so => so.order_id === order.id);
        const latestShippingOrder = orderShippingData.length > 0 ? orderShippingData[0] : null;

        // Process form_data
        let formData = order.form_data;
        if (typeof formData === 'string') {
          try {
            formData = JSON.parse(formData);
          } catch (e) {
            formData = null;
          }
        }

        return {
          ...order,
          subtotal: Number(order.subtotal),
          tax: Number(order.tax),
          discount: order.discount ? Number(order.discount) : null,
          total: Number(order.total),
          shipping_cost: order.shipping_cost ? Number(order.shipping_cost) : null,
          employee_id: order.employee_id || null,
          order_items: Array.isArray(order.order_items) 
            ? order.order_items.map((item: any) => ({
                ...item,
                color_code: null
              }))
            : [],
          customer,
          shipping_address: shippingAddress,
          form_data: formData,
          call_confirmation_status: null, // This would need another lookup
          // Add shipping orders data to avoid individual fetches
          shipping_orders: orderShippingData.map(so => ({
            id: so.id,
            tracking_number: so.tracking_number,
            provider_id: so.provider_id,
            provider: so.shipping_providers
          })),
          // Add precomputed shipping info to reduce component-level computations
          _shipping_info: latestShippingOrder ? {
            tracking_number: latestShippingOrder.tracking_number,
            provider_name: latestShippingOrder.shipping_providers?.name || 'غير محدد',
            provider_code: latestShippingOrder.shipping_providers?.code || 'unknown'
          } : null
        };
      });

      // Cache the processed orders
      cacheRef.current.set(cacheKey, processedOrders);

      // Update state
      setState(prev => ({
        ...prev,
        orders: page === 0 ? processedOrders : [...prev.orders, ...processedOrders],
        loading: false,
        hasMore: processedOrders.length === pageSize,
        currentPage: page,
      }));

    } catch (error: any) {
      if (signal?.aborted) return;
      
      setState(prev => ({ 
        ...prev, 
        error: error as Error, 
        loading: false 
      }));
      
      toast({
        variant: "destructive",
        title: "خطأ في جلب البيانات",
        description: "حدث خطأ أثناء جلب بيانات الطلبات. يرجى المحاولة مرة أخرى.",
      });
    }
  }, [currentOrganization?.id, pageSize, filters, getCacheKey, toast]);

  // Fetch order metrics (counts & stats) - مع استقرار dependencies
  const fetchOrderMetrics = useCallback(async (signal?: AbortSignal) => {
    if (!currentOrganization?.id) return;

    try {
      // Use simplified metrics fetching to reduce API calls
      const [orderStatsResult, orderCountsResult] = await Promise.all([
        supabase.rpc('get_order_stats', { 
          org_id: currentOrganization.id 
        }),
        supabase.rpc('get_orders_count_by_status', { 
          org_id: currentOrganization.id 
        })
      ]);

      if (signal?.aborted) return;

      // Handle stats data (might be array or object)
      const statsData = Array.isArray(orderStatsResult.data) ? orderStatsResult.data[0] : orderStatsResult.data;
      const stats = {
        totalSales: Number(statsData?.total_sales) || 0,
        avgOrderValue: Number(statsData?.avg_order_value) || 0,
        salesTrend: Number(statsData?.sales_trend) || 0,
        pendingAmount: Number(statsData?.pending_amount) || 0,
      };

      const counts = orderCountsResult.data?.reduce((acc: any, item: any) => {
        acc[item.status] = item.count;
        return acc;
      }, {}) || {};

      const totalCountValue = Object.values(counts).reduce((sum: number, count: any) => sum + (Number(count) || 0), 0);

      setState(prev => ({
        ...prev,
        orderStats: stats,
        orderCounts: {
          all: totalCountValue,
          pending: Number(counts.pending) || 0,
          processing: Number(counts.processing) || 0,
          shipped: Number(counts.shipped) || 0,
          delivered: Number(counts.delivered) || 0,
          cancelled: Number(counts.cancelled) || 0,
        },
        totalCount: totalCountValue,
      }));

    } catch (error: any) {
      if (signal?.aborted) return;
      
      // معالجة أخطاء الموارد
      if (error.message && error.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
        throw error; // السماح لـ useOptimizedInterval بمعالجة الخطأ
      }
      
      // Silent fail for metrics to avoid disrupting main functionality
    }
  }, [currentOrganization?.id]); // dependencies ثابتة فقط

  // Load more orders
  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loading) return;

    const nextPage = state.currentPage + 1;
    setState(prev => ({ ...prev, currentPage: nextPage, loading: true }));
    fetchOrdersOptimized(nextPage);
  }, [state.hasMore, state.loading, state.currentPage, fetchOrdersOptimized]);

  // Go to specific page - new function for page navigation
  const goToPage = useCallback((targetPage: number) => {
    if (targetPage < 0 || state.loading) return;

    // Clear current orders and go to the specific page
    setState(prev => ({
      ...prev,
      orders: [],
      currentPage: targetPage,
      loading: true,
    }));
    
    fetchOrdersOptimized(targetPage);
  }, [state.loading, fetchOrdersOptimized]);

  // Reset and reload with new filters
  const applyFilters = useCallback((newFilters: Partial<typeof filters>) => {
    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear cache when filters change
    cacheRef.current.clear();

    setFilters(prev => ({ ...prev, ...newFilters }));
    setState(prev => ({
      ...prev,
      orders: [],
      currentPage: 0,
      hasMore: true,
      loading: true,
    }));
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    // Clear cache
    cacheRef.current.clear();
    
    // Reset state
    setState(prev => ({
      ...prev,
      orders: [],
      currentPage: 0,
      hasMore: true,
      loading: true,
    }));

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Fetch fresh data
    fetchOrdersOptimized(0, controller.signal);
    fetchOrderMetrics(controller.signal);
  }, [fetchOrdersOptimized, fetchOrderMetrics]);

  // Initial load and filter changes
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Only fetch data, don't automatically load subsequent pages
    fetchOrdersOptimized(0, controller.signal);
    fetchOrderMetrics(controller.signal);

    return () => {
      controller.abort();
    };
  }, [filters]); // Remove fetchOrdersOptimized and fetchOrderMetrics from dependencies to prevent infinite loops

  // Polling setup مع useOptimizedInterval - محسن ومحمي
  const pollingIntervalRef = useOptimizedInterval(() => {
    if (enablePolling && !state.loading) {
      // Only refresh metrics during polling, not full orders data
      fetchOrderMetrics();
    }
  }, enablePolling ? pollingInterval : null, {
    enabled: enablePolling && !state.loading,
    adaptiveDelay: true,
    maxInstances: 1,
    maxAttempts: 3, // تقليل عدد المحاولات
    onError: (error) => {
      
      // إيقاف polling مؤقتاً عند مشاكل الموارد
      if (error.message && error.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
        // يمكن إضافة منطق إيقاف polling هنا
      }
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Memoized values
  const memoizedState = useMemo(() => state, [state]);
  const memoizedFilters = useMemo(() => filters, [filters]);

  return {
    ...memoizedState,
    filters: memoizedFilters,
    loadMore,
    goToPage, // Add goToPage to the return object
    applyFilters,
    refresh,
    pageSize,
  };
};

// Hook for individual order operations
export const useOrderOperations = () => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    if (!currentOrganization?.id) return { success: false };

    try {
      const { error } = await supabase
        .from('online_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      toast({
        title: "تم تحديث حالة الطلب",
        description: "تم تحديث حالة الطلب بنجاح",
      });

      return { success: true };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث حالة الطلب",
        description: "حدث خطأ أثناء محاولة تحديث حالة الطلب.",
      });
      return { success: false, error };
    }
  }, [currentOrganization?.id, toast]);

  const bulkUpdateOrderStatus = useCallback(async (orderIds: string[], status: string) => {
    if (!currentOrganization?.id || orderIds.length === 0) return { success: false };

    try {
      const { error } = await supabase
        .from('online_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', orderIds)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      toast({
        title: "تم تحديث حالة الطلبات",
        description: `تم تحديث حالة ${orderIds.length} طلب بنجاح`,
      });

      return { success: true };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث حالة الطلبات",
        description: "حدث خطأ أثناء محاولة تحديث حالة الطلبات.",
      });
      return { success: false, error };
    }
  }, [currentOrganization?.id, toast]);

  return {
    updateOrderStatus,
    bulkUpdateOrderStatus,
  };
};
