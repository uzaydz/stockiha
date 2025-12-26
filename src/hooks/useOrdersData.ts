import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { unifiedCache } from '@/lib/unified-cache-system';
import { unifiedOrderService } from '@/services/UnifiedOrderService';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/context/TenantContext';
import { Order } from '@/components/orders/table/OrderTableTypes';
import { supabase } from '@/lib/supabase';
// تم إزالة useOptimizedInterval - نستخدم useEffect عادي

// ⚡ دالة إلغاء الطلب مع إرجاع المخزون (Offline-First)
const cancelOrderWithInventoryRestore = async (orderId: string, organizationId: string) => {
  try {
    // ⚡ استخدام UnifiedOrderService لإلغاء الطلب محلياً
    unifiedOrderService.setOrganizationId(organizationId);
    const cancelledOrder = await unifiedOrderService.cancelOrder(orderId, true);

    if (!cancelledOrder) {
      return {
        success: false,
        error: 'الطلب غير موجود أو لا يمكن الوصول إليه'
      };
    }

    return {
      success: true,
      order_id: orderId,
      inventory_restored: true,
      restored_items_count: cancelledOrder.items?.length || 0,
      message: 'تم إلغاء الطلب وإرجاع المخزون بنجاح'
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء إلغاء الطلب'
    };
  }
};

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
      // ⚡ استخدام UnifiedOrderService للجلب من PowerSync
      unifiedOrderService.setOrganizationId(currentOrganization.id);
      
      const orderFilters: any = {
        is_online: true, // فقط الطلبات الإلكترونية
      };
      
      if (filters.status !== 'all') {
        orderFilters.status = filters.status;
      }
      
      if (filters.searchTerm) {
        orderFilters.search = filters.searchTerm;
      }
      
      if (filters.dateFrom) {
        orderFilters.from_date = filters.dateFrom.toISOString();
      }
      
      if (filters.dateTo) {
        orderFilters.to_date = filters.dateTo.toISOString();
      }
      
      const result = await unifiedOrderService.getOrders(orderFilters, page + 1, pageSize);
      
      // تحويل البيانات إلى تنسيق Order
      const ordersData = result.data.map(orderWithItems => ({
        id: orderWithItems.id,
        customer_id: orderWithItems.customer_id,
        subtotal: orderWithItems.subtotal,
        tax: orderWithItems.tax,
        discount: orderWithItems.discount,
        total: orderWithItems.total,
        status: orderWithItems.status,
        payment_method: orderWithItems.payment_method,
        payment_status: orderWithItems.payment_status,
        shipping_address_id: orderWithItems.shipping_address_id,
        shipping_method: orderWithItems.shipping_method,
        shipping_cost: orderWithItems.shipping_cost,
        notes: orderWithItems.notes,
        employee_id: orderWithItems.employee_id,
        created_at: orderWithItems.created_at,
        updated_at: orderWithItems.updated_at,
        organization_id: orderWithItems.organization_id,
        slug: orderWithItems.slug,
        customer_order_number: orderWithItems.customer_order_number,
        order_items: orderWithItems.items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name || item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          color_id: item.color_id,
          color_name: item.color_name,
          size_id: item.size_id,
          size_name: item.size_name
        }))
      }));

      // Process the data and fetch related customer/address data
      const rawOrders: any[] = ordersData || [];
      
      // Extract customer IDs and address IDs for batch fetching
      const customerIds = rawOrders
        .filter(order => order.customer_id)
        .map(order => order.customer_id);
      
      const addressIds = rawOrders
        .filter(order => order.shipping_address_id)
        .map(order => order.shipping_address_id);

      let customersData: any[] = [];
      let guestCustomersData: any[] = [];
      let addressesData: any[] = [];

      // ⚡ v4.0: جلب بيانات العملاء من PowerSync باستعلام واحد
      if (customerIds.length > 0) {
        try {
          const { unifiedCustomerService } = await import('@/services/UnifiedCustomerService');
          unifiedCustomerService.setOrganizationId(currentOrganization.id);

          // ⚡ استعلام واحد لجميع العملاء بدلاً من استعلام لكل عميل
          const allCustomers = await unifiedCustomerService.getCustomersByIds(customerIds);

          customersData = allCustomers;
          guestCustomersData = []; // ⚠️ guest_customers قد لا يكون في PowerSync - يمكن إضافته لاحقاً
          
          // Fallback: محاولة جلب guest_customers من Supabase إذا لزم الأمر
          try {
            const guestCustomers = await supabase
              .from('guest_customers')
              .select('id, name, phone, organization_id')
              .in('id', customerIds)
              .eq('organization_id', currentOrganization.id);
            
            guestCustomersData = (guestCustomers.data || []).map(guest => ({
            ...guest,
            email: null
          }));
        } catch (error) {
        }
        } catch (error) {
          console.error('Error fetching customers from PowerSync:', error);
        }
      }

      // Fetch addresses data if we have address IDs
      if (addressIds.length > 0) {
        try {
          const { data: addresses } = await supabase
            .from('addresses')
            .select('*')
            .in('id', addressIds);

          addressesData = addresses || [];
        } catch (error) {
        }
      }

      // Combine all customer data
      const allCustomersData = [...customersData, ...guestCustomersData];
      
      const processedOrders: Order[] = rawOrders.map(order => {
        // Find customer data
        const customer = order.customer_id ? 
          allCustomersData.find(c => c.id === order.customer_id) || null : null;

        // Find address data
        let shippingAddress = null;
        if (order.shipping_address_id) {
          const addressData = addressesData.find(addr => addr.id === order.shipping_address_id);
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
          call_confirmation_status: null // This would need another lookup
        };
      });
      
      // Cache the results
      cacheRef.current.set(cacheKey, processedOrders);

      setState(prev => ({
        ...prev,
        orders: page === 0 ? processedOrders : [...prev.orders, ...processedOrders],
        hasMore: processedOrders.length === pageSize,
        loading: false,
        error: null,
      }));

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
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
  }, [currentOrganization?.id, filters, pageSize, getCacheKey, toast]);

  // Fetch order metrics (counts & stats) - مع استقرار dependencies
  const fetchOrderMetrics = useCallback(async (signal?: AbortSignal) => {
    if (!currentOrganization?.id) return;

    try {
      // تحديد نوع الطلبات الحالي
      const statusFilter = filters.status === 'all' ? '' : filters.status;
      
      // ⚡ استخدام UnifiedOrderService للحصول على الإحصائيات
      unifiedOrderService.setOrganizationId(currentOrganization.id);
      const stats = await unifiedOrderService.getOrderStats();
      
      // محاكاة نفس التنسيق الذي كان يُرجع من RPC
      const countsResult = { data: {
        all: stats.total_orders,
        pending: stats.ordersByStatus.pending || 0,
        processing: stats.ordersByStatus.processing || 0,
        shipped: 0, // لا يوجد في OrderStatus
        delivered: 0, // لا يوجد في OrderStatus
        cancelled: stats.ordersByStatus.cancelled || 0,
        completed: stats.ordersByStatus.completed || 0
      }, error: null };
      
      const statsResult = { data: {
        total_sales: stats.total_revenue,
        avg_order_value: stats.total_orders > 0 ? stats.total_revenue / stats.total_orders : 0,
        sales_trend: 0, // يمكن حسابه لاحقاً
        pending_amount: stats.total_pending
      }, error: null };

      // Process counts
      const counts = {
        all: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      };

      (countsResult.data || []).forEach((item: any) => {
        counts[item.status as keyof typeof counts] = item.count;
        counts.all += item.count;
      });

      // Process stats
      const statsData = statsResult.data as any;
      const formattedStats = {
        totalSales: statsData?.total_sales || 0,
        avgOrderValue: statsData?.avg_order_value || 0,
        salesTrend: statsData?.sales_trend || 0,
        pendingAmount: statsData?.pending_amount || 0,
      };

      setState(prev => ({
        ...prev,
        orderCounts: counts,
        orderStats: formattedStats,
        totalCount: counts.all,
      }));

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      // معالجة أخطاء الموارد
      if (error.message && error.message.includes('ERR_INSUFFICIENT_RESOURCES')) {
        throw error; // إعادة إرسال الخطأ للمعالجة
      }
    }
  }, [currentOrganization?.id, filters.status]); // dependencies ثابتة فقط

  // Load more orders
  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loading) return;

    const nextPage = state.currentPage + 1;
    setState(prev => ({ ...prev, currentPage: nextPage, loading: true }));
    fetchOrdersOptimized(nextPage);
  }, [state.hasMore, state.loading, state.currentPage, fetchOrdersOptimized]);

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

  // Update filters (alias for applyFilters to maintain compatibility)
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    applyFilters(newFilters);
  }, [applyFilters]);

  // Go to specific page
  const goToPage = useCallback(async (page: number) => {
    if (!currentOrganization?.id || state.loading) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState(prev => ({
      ...prev,
      loading: true,
      currentPage: page,
    }));

    try {
      await fetchOrdersOptimized(page, controller.signal);
    } catch (error) {
      if (error.name !== 'AbortError') {
      }
    }
  }, [currentOrganization?.id, state.loading, fetchOrdersOptimized]);

  // Update order locally
  const updateOrderLocally = useCallback((orderId: string, updates: Partial<Order>) => {
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(order =>
        order.id === orderId ? { ...order, ...updates } : order
      ),
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

    fetchOrdersOptimized(0, controller.signal);
    fetchOrderMetrics(controller.signal);

    return () => {
      controller.abort();
    };
  }, [filters, fetchOrdersOptimized, fetchOrderMetrics]);

  // Polling setup بسيط - فقط عند الحاجة
  useEffect(() => {
    if (!enablePolling || !pollingInterval) return;
    
    const interval = setInterval(() => {
      if (!state.loading) {
        fetchOrderMetrics();
      }
    }, pollingInterval);
    
    return () => clearInterval(interval);
  }, [enablePolling, pollingInterval, state.loading, fetchOrderMetrics]);

  // Cleanup
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
    applyFilters,
    updateFilters,
    goToPage,
    updateOrderLocally,
    refresh,
    pageSize,
  };
};

// Hook for individual order operations
export const useOrderOperations = (updateOrderLocally?: (orderId: string, updates: Partial<Order>) => void) => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    if (!currentOrganization?.id) return { success: false };

    try {
      // إذا كانت الحالة إلغاء، استخدم الدالة المخصصة لإرجاع المخزون
      if (status === 'cancelled') {
        // استدعاء دالة إلغاء مخصصة (تحتوي على فحص الطلب داخلياً)
        const result = await cancelOrderWithInventoryRestore(orderId, currentOrganization.id);
        
        if (!result.success) {
          throw new Error(result.error || 'فشل في إلغاء الطلب');
        }

        toast({
          title: "تم إلغاء الطلب",
          description: result.message,
          className: result.inventory_restored 
            ? "bg-green-100 border-green-400 text-green-700" 
            : undefined,
        });

        // تحديث البيانات محلياً
        if (updateOrderLocally) {
          updateOrderLocally(orderId, { 
            status: 'cancelled',
            updated_at: new Date().toISOString(),
            notes: result.inventory_restored 
              ? `تم إلغاء الطلب وإرجاع ${result.restored_items_count} قطعة للمخزون`
              : 'تم إلغاء الطلب (لم يتم إرجاع المخزون لأن خصم المخزون التلقائي غير مفعل)'
          });
        }

        return { success: true, data: result };
      } else {
        // للحالات الأخرى، استخدم التحديث العادي
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

        // تحديث البيانات محلياً
        if (updateOrderLocally) {
          updateOrderLocally(orderId, { 
            status,
            updated_at: new Date().toISOString()
          });
        }

        return { success: true };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : "حدث خطأ أثناء محاولة تحديث حالة الطلب.");
      
      toast({
        variant: "destructive",
        title: status === 'cancelled' ? "خطأ في إلغاء الطلب" : "خطأ في تحديث حالة الطلب",
        description: errorMessage,
      });
      return { success: false, error: errorMessage };
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

      // تحديث البيانات محلياً
      if (updateOrderLocally) {
        const updates = { 
          status,
          updated_at: new Date().toISOString()
        };
        orderIds.forEach(orderId => {
          updateOrderLocally(orderId, updates);
        });
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : "حدث خطأ أثناء محاولة تحديث حالة الطلبات.");
      
      toast({
        variant: "destructive",
        title: "خطأ في تحديث حالة الطلبات",
        description: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }, [currentOrganization?.id, toast]);

  return {
    updateOrderStatus,
    bulkUpdateOrderStatus,
  };
};
