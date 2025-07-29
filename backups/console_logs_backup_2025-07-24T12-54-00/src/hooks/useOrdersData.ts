import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/context/TenantContext';
import { Order, CallConfirmationStatus } from '@/components/orders/table/OrderTableTypes';

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

  // Call confirmation statuses state
  const [callConfirmationStatuses, setCallConfirmationStatuses] = useState<CallConfirmationStatus[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, Order[]>>(new Map());

  // Generate cache key from filters
  const getCacheKey = useCallback((page: number) => {
    return `${filters.status}-${filters.searchTerm}-${filters.dateFrom?.toISOString()}-${filters.dateTo?.toISOString()}-${page}`;
  }, [filters]);

  // Fetch orders using optimized RPC function with pagination support
  const fetchOrdersOptimized = useCallback(async (page: number, replaceData = false, signal?: AbortSignal) => {
    if (!currentOrganization?.id) return;

    const cacheKey = getCacheKey(page);
    
    // Check cache first only for infinite scroll mode
    if (!replaceData && cacheRef.current.has(cacheKey)) {
      const cachedOrders = cacheRef.current.get(cacheKey)!;
      setState(prev => ({
        ...prev,
        orders: page === 0 ? cachedOrders : [...prev.orders, ...cachedOrders],
        loading: false,
      }));
      return;
    }

    try {
      // Use the optimized RPC function
      const { data: ordersData, error } = await supabase.rpc('get_advanced_online_orders' as any, {
        p_organization_id: currentOrganization.id,
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_status: filters.status !== 'all' ? filters.status : null,
        p_search_term: filters.searchTerm || null,
        p_date_from: filters.dateFrom?.toISOString() || null,
        p_date_to: filters.dateTo?.toISOString() || null,
        p_call_confirmation_status_id: null,
        p_shipping_provider: null,
        p_sort_by: 'created_at',
        p_sort_order: 'desc'
      });

      if (error) throw error;

      // The RPC function returns data in the correct format already with all joined data
      const rawOrders: any[] = ordersData || [];
      
      // Transform the data to match the expected Order interface
      const processedOrders: Order[] = rawOrders.map(order => ({
        id: order.order_id || order.id,
        customer_id: order.customer_id,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        discount: Number(order.discount),
        total: Number(order.total),
        status: order.status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        shipping_address_id: order.shipping_address_id,
        shipping_method: order.shipping_method,
        shipping_cost: Number(order.shipping_cost),
        shipping_option: order.shipping_option,
        notes: order.notes,
        employee_id: order.employee_id,
        created_at: order.created_at,
        updated_at: order.updated_at,
        organization_id: order.organization_id,
        slug: order.slug,
        customer_order_number: order.customer_order_number,
        created_from: order.created_from,
        call_confirmation_status_id: order.call_confirmation_status_id,
        call_confirmation_notes: order.call_confirmation_notes,
        call_confirmation_updated_at: order.call_confirmation_updated_at,
        call_confirmation_updated_by: order.call_confirmation_updated_by,
        form_data: order.form_data,
        metadata: order.metadata,
        yalidine_tracking_id: order.tracking_info?.yalidine_tracking_id,
        zrexpress_tracking_id: order.tracking_info?.zrexpress_tracking_id,
        ecotrack_tracking_id: order.tracking_info?.ecotrack_tracking_id,
        
        // Customer data (already joined)
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email,
        
        // Add customer object for backward compatibility
        customer: order.customer_name ? {
          id: order.customer_id,
          name: order.customer_name,
          phone: order.customer_phone,
          email: order.customer_email
        } : null,
        
        // Address data (already joined)
        shipping_address: order.shipping_address ? {
          id: order.shipping_address_id,
          wilaya: order.shipping_address.province,
          municipality: order.shipping_address.municipality,
          address_line: order.shipping_address.address,
          postal_code: order.shipping_address.postal_code,
          notes: order.shipping_address.notes
        } : null,
        
        // Order items (already joined)
        order_items: order.order_items || [],
        
        // Shipping provider data (already joined)
        shipping_provider: order.shipping_provider ? {
          id: order.shipping_provider.id,
          code: order.shipping_provider.code,
          name: order.shipping_provider.name
        } : null,
        
        // Call confirmation status (already joined)
        call_confirmation_status: order.call_confirmation_status_id ? {
          id: order.call_confirmation_status_id,
          name: order.call_confirmation_status_name,
          color: order.call_confirmation_status_color,
          icon: order.call_confirmation_status_icon,
          is_default: false
          } : null
      }));

      // Cache the processed orders
      cacheRef.current.set(cacheKey, processedOrders);

      // Update state with the processed orders
      setState(prev => ({
        ...prev,
        orders: (page === 0 || replaceData) ? processedOrders : [...prev.orders, ...processedOrders],
        loading: false,
        hasMore: processedOrders.length === pageSize,
        currentPage: page,
        error: null
      }));

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: error as Error
      }));
    }
  }, [currentOrganization?.id, pageSize, filters, getCacheKey]);

  // Fetch order counts and stats using the optimized stats function
  const fetchOrderStats = useCallback(async () => {
    if (!currentOrganization?.id) {
      return;
    }

    try {

      const { data: statsData, error } = await supabase.rpc('get_online_orders_stats' as any, {
        p_organization_id: currentOrganization.id,
        p_date_from: filters.dateFrom?.toISOString() || null,
        p_date_to: filters.dateTo?.toISOString() || null
      });

      if (error) {
        throw error;
      }

      const stats = statsData?.[0] || {};

      const calculatedCounts = {
        all: stats.total_orders || 0,
        pending: stats.pending_orders || 0,
        processing: stats.processing_orders || 0,
        shipped: stats.shipped_orders || 0,
        delivered: stats.delivered_orders || 0,
        cancelled: stats.cancelled_orders || 0,
      };

      const calculatedStats = {
        totalSales: stats.total_revenue || 0,
        avgOrderValue: stats.avg_order_value || 0,
        salesTrend: 0, // Can be calculated if needed
        pendingAmount: stats.pending_amount || 0,
      };

      setState(prev => ({
        ...prev,
        orderCounts: calculatedCounts,
        orderStats: calculatedStats,
        totalCount: stats.total_orders || 0
      }));

    } catch (error) {
    }
  }, [currentOrganization?.id, filters.dateFrom, filters.dateTo]);

  // Load more orders (infinite scroll)
  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.loading) return;

    setState(prev => ({ ...prev, loading: true }));
    await fetchOrdersOptimized(state.currentPage + 1);
  }, [state.hasMore, state.loading, state.currentPage, fetchOrdersOptimized]);

  // Go to specific page (replaces current data)
  const goToPage = useCallback(async (page: number) => {
    if (page < 0 || state.loading) return;

    setState(prev => ({ ...prev, loading: true }));
    await fetchOrdersOptimized(page, true); // true = replace data
  }, [state.loading, fetchOrdersOptimized]);

  // Refresh orders
  const refresh = useCallback(async () => {
    cacheRef.current.clear();
    setState(prev => ({ ...prev, loading: true, orders: [], currentPage: 0 }));
    await Promise.all([
      fetchOrdersOptimized(0),
      fetchOrderStats()
    ]);
  }, [fetchOrdersOptimized, fetchOrderStats]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    cacheRef.current.clear();
  }, []);

  // Update order locally without refetching
  const updateOrderLocally = useCallback((orderId: string, updates: Partial<Order>) => {
    setState(prev => {
      // Find the order being updated to check for status changes
      const orderToUpdate = prev.orders.find(order => order.id === orderId);
      const oldStatus = orderToUpdate?.status;
      const newStatus = updates.status;
      
             // Calculate updated counts if status is changing
       let newOrderCounts = prev.orderCounts;
       if (oldStatus && newStatus && oldStatus !== newStatus) {
         newOrderCounts = {
           ...prev.orderCounts,
           // Decrease old status count
           ...(oldStatus in prev.orderCounts && {
             [oldStatus]: Math.max(0, prev.orderCounts[oldStatus as keyof typeof prev.orderCounts] - 1)
           }),
           // Increase new status count
           ...(newStatus in prev.orderCounts && {
             [newStatus]: prev.orderCounts[newStatus as keyof typeof prev.orderCounts] + 1
           }),
         };
       }

      return {
        ...prev,
        orderCounts: newOrderCounts,
        orders: prev.orders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                ...updates,
                // Special handling for call confirmation status updates
                ...(updates.call_confirmation_status_id !== undefined && {
                  call_confirmation_status: order.call_confirmation_status ? {
                    ...order.call_confirmation_status,
                    id: updates.call_confirmation_status_id
                  } : {
                    id: updates.call_confirmation_status_id,
                    name: 'تم التحديث',
                    color: '#10b981',
                    icon: 'CheckCircle',
                    is_default: false
                  }
                })
              }
            : order
        )
      };
    });
  }, []);

  // Initial load and filter changes
  useEffect(() => {
    if (currentOrganization?.id) {
      setState(prev => ({ ...prev, loading: true, orders: [], currentPage: 0 }));
      Promise.all([
        fetchOrdersOptimized(0),
        fetchOrderStats()
      ]);
    }
  }, [currentOrganization?.id, filters, fetchOrdersOptimized, fetchOrderStats]);

  // Polling for real-time updates
  useEffect(() => {
    if (!enablePolling || !currentOrganization?.id) return;

    const interval = setInterval(() => {
      fetchOrderStats();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [enablePolling, currentOrganization?.id, pollingInterval, fetchOrderStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Memoized return value
  const returnValue = useMemo(() => ({
    ...state,
    loadMore,
    goToPage,
    refresh,
    updateFilters,
    updateOrderLocally,
    filters,
  }), [state, loadMore, goToPage, refresh, updateFilters, updateOrderLocally, filters]);

  return returnValue;
};

// Hook for individual order operations
export const useOrderOperations = (updateOrderLocally?: (orderId: string, updates: Partial<Order>) => void) => {
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

      // Update order locally if function is available
      if (updateOrderLocally) {
        updateOrderLocally(orderId, {
          status,
          updated_at: new Date().toISOString()
        });
      }

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
  }, [currentOrganization?.id, toast, updateOrderLocally]);

  const bulkUpdateOrderStatus = useCallback(async (orderIds: string[], status: string) => {
    if (!currentOrganization?.id || orderIds.length === 0) return { success: false };

    try {
      const { error } = await supabase
        .from('online_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', orderIds)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      // Update orders locally if function is available
      if (updateOrderLocally) {
        orderIds.forEach(orderId => {
          updateOrderLocally(orderId, {
            status,
            updated_at: new Date().toISOString()
          });
        });
      }

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
  }, [currentOrganization?.id, toast, updateOrderLocally]);

  const updateCallConfirmation = useCallback(async (
    orderId: string,
    statusId: number,
    notes?: string,
    userId?: string
  ) => {
    if (!currentOrganization?.id) return { success: false };

    try {
      const { error } = await supabase
        .from('online_orders')
        .update({
          call_confirmation_status_id: statusId,
          call_confirmation_notes: notes,
          call_confirmation_updated_at: new Date().toISOString(),
          call_confirmation_updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      // Update order locally if function is available
      if (updateOrderLocally) {
        updateOrderLocally(orderId, {
          call_confirmation_status_id: statusId,
          call_confirmation_notes: notes,
          call_confirmation_updated_at: new Date().toISOString(),
          call_confirmation_updated_by: userId,
          updated_at: new Date().toISOString()
        });
      }

      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة تأكيد الاتصال بنجاح"
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ في تحديث حالة تأكيد الاتصال';
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: errorMessage
      });
      return { success: false, error };
    }
  }, [currentOrganization?.id, toast, updateOrderLocally]);

  return {
    updateOrderStatus,
    bulkUpdateOrderStatus,
    updateCallConfirmation,
  };
};
