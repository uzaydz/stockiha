import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { unifiedCache } from '@/lib/unified-cache-system';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/context/TenantContext';
import { Order } from '@/components/orders/table/OrderTableTypes';
// تم إزالة useOptimizedInterval - نستخدم useEffect عادي

// دالة إلغاء الطلب مع إرجاع المخزون
const cancelOrderWithInventoryRestore = async (orderId: string, organizationId: string) => {
  try {
    // جلب إعدادات المؤسسة
    const { data: settings, error: settingsError } = await supabase
      .from('organization_settings')
      .select('custom_js')
      .eq('organization_id', organizationId)
      .single();

    if (settingsError) {
      throw new Error('فشل في جلب إعدادات المؤسسة');
    }

    // التحقق من إعداد خصم المخزون التلقائي
    let autoDeductInventory = false;
    if (settings?.custom_js) {
      try {
        const customJs = typeof settings.custom_js === 'string' 
          ? JSON.parse(settings.custom_js) 
          : settings.custom_js;
        autoDeductInventory = customJs?.auto_deduct_inventory === true;
      } catch (e) {
        // تجاهل أخطاء تحليل JSON
      }
    }

    let totalRestoredItems = 0;

    // إذا كان خصم المخزون التلقائي مفعلاً، قم بإرجاع المخزون
    if (autoDeductInventory) {
      // جلب منتجات الطلب
      const { data: orderItems, error: itemsError } = await supabase
        .from('online_order_items')
        .select('product_id, quantity, product_name')
        .eq('order_id', orderId);

      if (itemsError) {
        throw new Error('فشل في جلب منتجات الطلب');
      }

      // إرجاع المخزون لكل منتج
      for (const item of orderItems || []) {
        if (item.product_id) {
          // جلب المخزون الحالي
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .eq('organization_id', organizationId)
            .single();

          if (!productError && product) {
            const previousStock = product.stock_quantity || 0;
            const newStock = previousStock + item.quantity;

            // تحديث المخزون
            await supabase
              .from('products')
              .update({ 
                stock_quantity: newStock,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.product_id)
              .eq('organization_id', organizationId);

            // تسجيل حركة المخزون
            await supabase
              .from('inventory_logs')
              .insert({
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                previous_stock: previousStock,
                new_stock: newStock,
                type: 'return',
                reference_id: orderId,
                notes: 'إرجاع مخزون بسبب إلغاء الطلب',
                organization_id: organizationId
              });

            totalRestoredItems += item.quantity;
          }
        }
      }
    }

    // تحديث حالة الطلب إلى ملغي
    const { error: updateError } = await supabase
      .from('online_orders')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        notes: autoDeductInventory 
          ? `تم إلغاء الطلب وإرجاع ${totalRestoredItems} قطعة للمخزون`
          : 'تم إلغاء الطلب (لم يتم إرجاع المخزون لأن خصم المخزون التلقائي غير مفعل)'
      })
      .eq('id', orderId)
      .eq('organization_id', organizationId);

    if (updateError) {
      throw new Error('فشل في تحديث حالة الطلب');
    }

    // إنشاء سجل إلغاء الطلب
    await supabase
      .from('order_cancellations')
      .insert({
        order_id: orderId,
        organization_id: organizationId,
        cancellation_reason: 'تم إلغاء الطلب من صفحة الطلبات',
        inventory_restored: autoDeductInventory,
        cancelled_items_count: totalRestoredItems,
        cancelled_amount: 0, // يمكن حساب المبلغ لاحقاً
        total_items_count: totalRestoredItems,
        is_partial_cancellation: false
      });

    return {
      success: true,
      order_id: orderId,
      inventory_restored: autoDeductInventory,
      restored_items_count: totalRestoredItems,
      message: autoDeductInventory 
        ? `تم إلغاء الطلب وإرجاع ${totalRestoredItems} قطعة للمخزون`
        : 'تم إلغاء الطلب (لم يتم إرجاع المخزون لأن خصم المخزون التلقائي غير مفعل)'
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

      // Fetch customers data if we have customer IDs
      if (customerIds.length > 0) {
        try {
          const [regularCustomers, guestCustomers] = await Promise.all([
            supabase
              .from('customers')
              .select('id, name, phone, email, organization_id')
              .in('id', customerIds)
              .eq('organization_id', currentOrganization.id),
            supabase
              .from('guest_customers')
              .select('id, name, phone, organization_id')
              .in('id', customerIds)
              .eq('organization_id', currentOrganization.id)
          ]);

          customersData = regularCustomers.data || [];
          guestCustomersData = (guestCustomers.data || []).map(guest => ({
            ...guest,
            email: null
          }));
        } catch (error) {
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
      
      // استخدام requests متوازية
      const [countsResult, statsResult] = await Promise.all([
        supabase.rpc('get_orders_count_by_status', {
          org_id: currentOrganization.id
        }).abortSignal(signal),
        supabase.rpc('get_order_stats', {
          org_id: currentOrganization.id
        }).abortSignal(signal)
      ]);

      if (countsResult.error) throw countsResult.error;
      if (statsResult.error) throw statsResult.error;

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
      const stats = {
        totalSales: statsData?.total_sales || 0,
        avgOrderValue: statsData?.avg_order_value || 0,
        salesTrend: statsData?.sales_trend || 0,
        pendingAmount: statsData?.pending_amount || 0,
      };

      setState(prev => ({
        ...prev,
        orderCounts: counts,
        orderStats: stats,
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
        // استخدام الدالة المباشرة بدلاً من RPC لتجنب مشكلة TypeScript
        const { data, error } = await supabase
          .from('online_orders')
          .select('id, organization_id')
          .eq('id', orderId)
          .eq('organization_id', currentOrganization.id)
          .single();

        if (error || !data) {
          throw new Error('الطلب غير موجود');
        }

        // استدعاء دالة إلغاء مخصصة
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
      toast({
        variant: "destructive",
        title: status === 'cancelled' ? "خطأ في إلغاء الطلب" : "خطأ في تحديث حالة الطلب",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء محاولة تحديث حالة الطلب.",
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
