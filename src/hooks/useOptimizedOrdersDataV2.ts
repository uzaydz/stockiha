import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { Order } from '@/components/orders/table/OrderTableTypes';

interface OrdersListFilters {
  status?: string | null;
  search?: string | null;
  searchTerm?: string | null; // للتوافق مع الكود القديم
  callStatus?: number | null;
  shippingProvider?: string | null;
  viewMode?: 'all' | 'mine' | 'unassigned'; // للتوافق مع الكود القديم
  dateFrom?: string | null;
  dateTo?: string | null;
}

interface UseOptimizedOrdersDataV2Options {
  pageSize?: number;
  initialPage?: number;
  initialFilters?: OrdersListFilters;
  enableAutoRefresh?: boolean;
  autoRefreshInterval?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const SHARED_DATA_STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours
const ORDERS_STALE_TIME = 30 * 1000; // 30 seconds
const STATS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Hook محسّن لجلب بيانات الطلبات باستخدام RPCs الجديدة و React Query
 *
 * المميزات:
 * - فصل البيانات المشتركة (provinces, municipalities) عن قائمة الطلبات
 * - استخدام React Query للـ caching الذكي
 * - RPCs خفيفة تجلب فقط الحقول المطلوبة
 * - تحديثات تلقائية اختيارية
 */
export const useOptimizedOrdersDataV2 = (options: UseOptimizedOrdersDataV2Options = {}) => {
  const {
    pageSize = DEFAULT_PAGE_SIZE,
    initialPage = 1,
    initialFilters = {},
    enableAutoRefresh = false,
    autoRefreshInterval = 60000,
  } = options;

  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [filters, setFilters] = useState<OrdersListFilters>(initialFilters);

  const organizationId = currentOrganization?.id;

  // ==========================================
  // 1. Shared Data - يُجلب مرة واحدة فقط
  // ==========================================
  const {
    data: sharedData,
    isLoading: isLoadingShared,
    error: sharedDataError,
  } = useQuery({
    queryKey: ['orders-shared-data', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase.rpc('get_orders_shared_data' as any, {
        p_organization_id: organizationId,
      });

      if (error) throw error;
      return data || {} as any;
    },
    enabled: !!organizationId,
    staleTime: SHARED_DATA_STALE_TIME,
    gcTime: SHARED_DATA_STALE_TIME * 2,
    retry: 2,
  });

  // ==========================================
  // 2. Orders List - قائمة خفيفة للطلبات
  // ==========================================
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    error: ordersError,
    isFetching: isFetchingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['orders-list', organizationId, currentPage, pageSize, filters, user?.id],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');

      const viewMode = filters.viewMode || 'all';
      const userId = user?.id || null;

      console.log('[useOptimizedOrdersDataV2] Fetching orders:', {
        organizationId,
        currentPage,
        pageSize,
        viewMode,
        userId,
        filters
      });

      const { data, error } = await supabase.rpc('get_orders_list_optimized' as any, {
        p_organization_id: organizationId,
        p_page: currentPage,
        p_limit: pageSize,
        p_status: filters.status === 'all' ? null : filters.status,
        p_search: filters.search || filters.searchTerm || null,
        p_call_status: filters.callStatus || null,
        p_shipping_provider: filters.shippingProvider || null,
        p_view_mode: viewMode,
        p_current_user_id: userId,
      });

      if (error) {
        console.error('[useOptimizedOrdersDataV2] RPC Error:', error);
        throw error;
      }

      console.log('[useOptimizedOrdersDataV2] RPC Response:', {
        dataType: Array.isArray(data) ? 'array' : typeof data,
        dataLength: Array.isArray(data) ? data.length : 0,
        firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null
      });

      // تحويل النتائج إلى الشكل المطلوب
      const rawData = Array.isArray(data) ? data : [];
      const orders = rawData.map((order: any, index: number) => {
        // Debug: طباعة أول طلب لمعرفة التنسيق
        if (index === 0 && process.env.NODE_ENV === 'development') {
          console.log('[useOptimizedOrdersDataV2] Sample order data:', order);
        }

        // تحديد tracking_id بناءً على شركة الشحن
        const getTrackingId = () => {
          if (order.yalidine_tracking_id) return order.yalidine_tracking_id;
          if (order.zrexpress_tracking_id) return order.zrexpress_tracking_id;
          if (order.ecotrack_tracking_id) return order.ecotrack_tracking_id;
          if (order.maystro_tracking_id) return order.maystro_tracking_id;
          return null;
        };

        return {
          id: order.id,
          customer_order_number: order.customer_order_number,
          customer: {
            name: order.customer_name,
            phone: order.customer_phone,
          },
          // استخدام form_data الكامل من قاعدة البيانات إن وُجد
          form_data: order.form_data || {
            wilaya: order.wilaya,
            commune: order.commune,
            fullName: order.customer_name,
            phone: order.customer_phone,
          },
          // إضافة shipping_address إن وُجد
          shipping_address: order.shipping_address || null,
          total: Number(order.total),
          status: order.status,
          payment_status: order.payment_status,
          shipping_provider: order.shipping_provider,
          // استخدام الحقول الخاصة بكل شركة شحن
          yalidine_tracking_id: order.yalidine_tracking_id,
          zrexpress_tracking_id: order.zrexpress_tracking_id,
          ecotrack_tracking_id: order.ecotrack_tracking_id,
          maystro_tracking_id: order.maystro_tracking_id,
          shipping_tracking_id: getTrackingId(), // للتوافق مع الكود القديم
          call_confirmation_status_id: order.call_confirmation_status_id,
          call_confirmation_status: order.call_status_name ? {
            name: order.call_status_name,
            color: order.call_status_color,
          } : null,
          created_at: order.created_at,
          updated_at: order.updated_at,
          is_blocked: order.is_blocked,
          items_count: order.items_count,
        };
      });

      // إجمالي العدد يأتي في أول صف فقط
      const totalCount = data?.[0]?.total_count || 0;

      const result = {
        orders,
        totalCount,
        currentPage,
        hasMore: currentPage * pageSize < totalCount,
      };

      console.log('[useOptimizedOrdersDataV2] Processed result:', {
        ordersCount: orders.length,
        totalCount,
        currentPage,
        hasMore: result.hasMore
      });

      return result;
    },
    enabled: !!organizationId,
    staleTime: ORDERS_STALE_TIME,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchInterval: enableAutoRefresh ? autoRefreshInterval : false,
  });

  // ==========================================
  // 3. Order Statistics - إحصائيات من MV
  // ==========================================
  const {
    data: orderStats,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['orders-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase.rpc('get_orders_stats_from_mv' as any, {
        p_organization_id: organizationId,
        p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_end_date: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      // معالجة الإحصائيات
      const stats = data || [];
      const statusCounts: Record<string, number> = {};
      let totalSales = 0;
      let totalOrders = 0;

      stats.forEach((stat: any) => {
        const status = stat.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + Number(stat.total_orders || 0);
        totalSales += Number(stat.total_amount || 0);
        totalOrders += Number(stat.total_orders || 0);
      });

      return {
        counts: statusCounts,
        totalSales,
        avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
        totalOrders,
      };
    },
    enabled: !!organizationId,
    staleTime: STATS_STALE_TIME,
    gcTime: STATS_STALE_TIME * 2,
    retry: 1,
  });

  // ==========================================
  // 4. Get Single Order Details - عند الحاجة
  // ==========================================
  const getOrderDetails = useCallback(async (orderId: string) => {
    const { data, error } = await supabase.rpc('get_order_full_details' as any, {
      p_order_id: orderId,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب تفاصيل الطلب",
        description: error.message,
      });
      throw error;
    }

    return data;
  }, [toast]);

  // ==========================================
  // Navigation & Filtering
  // ==========================================
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const applyFilters = useCallback((newFilters: Partial<OrdersListFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page on filter change
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
    setCurrentPage(1);
  }, []);

  const refresh = useCallback(() => {
    refetchOrders();
    queryClient.invalidateQueries({ queryKey: ['orders-stats', organizationId] });
  }, [refetchOrders, queryClient, organizationId]);

  const refreshStats = useCallback(async () => {
    // تحديث الـ Materialized View
    try {
      await supabase.rpc('refresh_orders_stats' as any);
      queryClient.invalidateQueries({ queryKey: ['orders-stats', organizationId] });
      toast({
        title: "تم تحديث الإحصائيات",
        description: "تم تحديث إحصائيات الطلبات بنجاح",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الإحصائيات",
        description: error.message,
      });
    }
  }, [queryClient, organizationId, toast]);

  // ==========================================
  // Local Updates (Optimistic)
  // ==========================================
  const updateOrderLocally = useCallback((orderId: string, updates: Partial<Order>) => {
    queryClient.setQueryData(
      ['orders-list', organizationId, currentPage, pageSize, filters],
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          orders: oldData.orders.map((order: Order) =>
            order.id === orderId ? { ...order, ...updates } : order
          ),
        };
      }
    );
  }, [queryClient, organizationId, currentPage, pageSize, filters]);

  // ==========================================
  // Error Handling - removed to prevent infinite re-renders
  // Errors are handled in the component level instead
  // ==========================================

  // ==========================================
  // Return API
  // ==========================================
  const orders = ordersData?.orders || [];
  const totalCount = ordersData?.totalCount || 0;
  const hasMore = ordersData?.hasMore || false;

  const loading = isLoadingOrders || isLoadingShared || isLoadingStats;
  const error = ordersError || sharedDataError;

  return {
    // Data
    orders,
    totalCount,
    currentPage,
    hasMore,
    loading,
    fetching: isFetchingOrders,
    error,

    // Shared Data
    sharedData: {
      callConfirmationStatuses: (sharedData as any)?.call_statuses || [],
      provinces: (sharedData as any)?.provinces || [],
      municipalities: (sharedData as any)?.municipalities || [],
      // تحويل shippingProviders من تنسيق RPC إلى التنسيق المطلوب في UI
      shippingProviders: ((sharedData as any)?.shipping_providers || []).map((provider: any) => ({
        provider_id: provider.id,
        provider_code: provider.code,
        provider_name: provider.name,
        is_enabled: provider.is_active,
        auto_shipping: false, // يمكن إضافتها لاحقاً إذا لزم
      })),
      organizationSettings: null, // سيتم إضافتها لاحقاً إذا لزم
    },

    // Stats
    orderCounts: orderStats?.counts || {},
    orderStats: {
      totalSales: orderStats?.totalSales || 0,
      avgOrderValue: orderStats?.avgOrderValue || 0,
      totalOrders: orderStats?.totalOrders || 0,
    },

    // Filters
    filters,

    // Metadata
    metadata: {
      pagination: {
        page: currentPage,
        pageSize,
        totalItems: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        hasNextPage: hasMore,
        hasPreviousPage: currentPage > 1,
      },
    },

    // Actions
    goToPage,
    applyFilters,
    resetFilters,
    refresh,
    refreshStats,
    updateOrderLocally,
    getOrderDetails,

    // Advanced
    pageSize,
  };
};
