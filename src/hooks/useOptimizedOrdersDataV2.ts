import { useEffect, useState, useCallback } from 'react';
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
  useCursorPagination?: boolean;
}

const DEFAULT_PAGE_SIZE = 20;
const SHARED_DATA_STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours
const ORDERS_STALE_TIME = 30 * 1000; // 30 seconds
const STATS_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const ORG_SETTINGS_STALE_TIME = 10 * 60 * 1000; // 10 minutes

const safeParseJson = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

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
    // Cursor pagination هو الافتراضي لأنه أسرع بكثير على آلاف الطلبات.
    // يمكن تعطيله صراحة عبر VITE_ORDERS_CURSOR_PAGINATION=false أو بتمرير useCursorPagination=false.
    useCursorPagination = (() => {
      const envValue = String((import.meta as any)?.env?.VITE_ORDERS_CURSOR_PAGINATION ?? '').trim().toLowerCase();
      if (envValue === 'false' || envValue === '0' || envValue === 'no') return false;
      if (envValue === 'true' || envValue === '1' || envValue === 'yes') return true;
      return true;
    })(),
  } = options;

  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [filters, setFilters] = useState<OrdersListFilters>(initialFilters);
  const [cursorByPage, setCursorByPage] = useState<Array<{ createdAt: string; id: string } | null>>(
    () => {
      // page 1 uses null cursor
      const arr: Array<{ createdAt: string; id: string } | null> = [];
      arr[1] = null;
      return arr;
    }
  );
  const [statsEnabled, setStatsEnabled] = useState(false);

  const organizationId = currentOrganization?.id;

  // ==========================================
  // Defer heavy stats query (after first paint)
  // ==========================================
  useEffect(() => {
    if (!organizationId) return;

    setStatsEnabled(false);

    const enable = () => setStatsEnabled(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(enable, { timeout: 1500 });
      return () => (window as any).cancelIdleCallback?.(id);
    }

    const t = window.setTimeout(enable, 800);
    return () => window.clearTimeout(t);
  }, [organizationId]);

  // ==========================================
  // 0. Organization Settings - إعدادات المؤسسة
  // (نحتاجها لـ auto_deduct_inventory وغيرها)
  // ==========================================
  const {
    data: organizationSettings,
    isLoading: isLoadingOrgSettings,
    error: organizationSettingsError,
  } = useQuery({
    queryKey: ['organization-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');

      const { data, error } = await supabase
        .from('organization_settings')
        .select('custom_js')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;
      return safeParseJson((data as any)?.custom_js) || {};
    },
    enabled: !!organizationId,
    staleTime: ORG_SETTINGS_STALE_TIME,
    gcTime: ORG_SETTINGS_STALE_TIME * 2,
    retry: 1,
  });

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
    queryKey: [
      'orders-list',
      organizationId,
      currentPage,
      pageSize,
      filters,
      user?.id,
      useCursorPagination ? cursorByPage[currentPage] : null,
      useCursorPagination ? 'cursor' : 'offset',
    ],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');

      const viewMode = filters.viewMode || 'all';
      const userId = user?.id || null;

      const isDev = (import.meta as any)?.env?.DEV;
      if (isDev) {
        console.log('[useOptimizedOrdersDataV2] Fetching orders:', {
          organizationId,
          currentPage,
          pageSize,
          viewMode,
          userId,
          filters,
          cursor: useCursorPagination ? cursorByPage[currentPage] : null,
          mode: useCursorPagination ? 'cursor' : 'offset',
        });
      }

      let data: any;
      let error: any;

      if (useCursorPagination) {
        const cursor = cursorByPage[currentPage] || null;
        const cursorParams = {
          p_organization_id: organizationId,
          // Cursor RPC يحسب has_more داخلياً عبر (limit + 1) لتجنب إرسال صف إضافي للعميل
          // (ويكون أكثر دقة من الاعتماد على طول المصفوفة).
          p_limit: pageSize,
          p_cursor_created_at: cursor?.createdAt ?? null,
          p_cursor_id: cursor?.id ?? null,
          p_status: filters.status === 'all' ? null : filters.status,
          p_search: filters.search || filters.searchTerm || null,
          p_call_status: filters.callStatus || null,
          p_shipping_provider: filters.shippingProvider || null,
          p_view_mode: viewMode,
          p_current_user_id: userId,
        };

        // 1) Try cursor RPC (fast path)
        try {
          const res = await supabase.rpc('get_orders_list_cursor_light' as any, cursorParams);
          if (res.error) {
            const msg = String((res.error as any)?.message || res.error);
            if (isDev) console.warn('[useOptimizedOrdersDataV2] Cursor RPC error, falling back:', msg);
            // 2) Fallback to offset RPC to keep UI usable even if cursor RPC is temporarily broken
            const fallback = await supabase.rpc('get_orders_list_optimized' as any, {
              p_organization_id: organizationId,
              p_page: currentPage,
              p_limit: pageSize + 1,
              p_status: filters.status === 'all' ? null : filters.status,
              p_search: filters.search || filters.searchTerm || null,
              p_call_status: filters.callStatus || null,
              p_shipping_provider: filters.shippingProvider || null,
              p_view_mode: viewMode,
              p_current_user_id: userId,
            });
            data = fallback.data;
            error = fallback.error || res.error;
          } else {
            data = res.data;
            error = null;
          }
        } catch (e: any) {
          // Fallback إذا فشل الاستدعاء (شبكة/توقيع/أي سبب)
          const msg = String(e?.message || e);
          if (isDev) console.warn('[useOptimizedOrdersDataV2] Cursor RPC failed, falling back:', msg);
          const res = await supabase.rpc('get_orders_list_optimized' as any, {
            p_organization_id: organizationId,
            p_page: currentPage,
            p_limit: pageSize + 1,
            p_status: filters.status === 'all' ? null : filters.status,
            p_search: filters.search || filters.searchTerm || null,
            p_call_status: filters.callStatus || null,
            p_shipping_provider: filters.shippingProvider || null,
            p_view_mode: viewMode,
            p_current_user_id: userId,
          });
          data = res.data;
          error = res.error;
        }
      } else {
        // نطلب +1 عنصر لاستخراج hasMore بشكل صحيح حتى لو total_count غير متوفر/غير دقيق
        const res = await supabase.rpc('get_orders_list_optimized' as any, {
          p_organization_id: organizationId,
          p_page: currentPage,
          p_limit: pageSize + 1,
          p_status: filters.status === 'all' ? null : filters.status,
          p_search: filters.search || filters.searchTerm || null,
          p_call_status: filters.callStatus || null,
          p_shipping_provider: filters.shippingProvider || null,
          p_view_mode: viewMode,
          p_current_user_id: userId,
        });
        data = res.data;
        error = res.error;
      }

      if (error) {
        if (isDev) console.error('[useOptimizedOrdersDataV2] RPC Error:', error);
        throw error;
      }

      if (isDev) {
        console.log('[useOptimizedOrdersDataV2] RPC Response:', {
          dataType: Array.isArray(data) ? 'array' : typeof data,
          dataLength: Array.isArray(data) ? data.length : 0,
          firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null,
        });
      }

      // تحويل النتائج إلى الشكل المطلوب
      const rawData = Array.isArray(data) ? data : [];
      const rowsForUi = useCursorPagination ? rawData : rawData.slice(0, pageSize);
      const orders = rowsForUi.map((order: any, index: number) => {
        // Debug: طباعة أول طلب لمعرفة التنسيق
        if (index === 0 && isDev) {
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
            wilayaName: order.wilaya,
            communeName: order.commune,
            province: order.wilaya,
            municipality: order.commune,
            fullName: order.customer_name,
            phone: order.customer_phone,
            deliveryType: order.delivery_type,
            delivery_type: order.delivery_type,
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
          // Keep the raw value as-is so downstream can distinguish between:
          // - `undefined` (RPC/table schema didn't provide it)
          // - `null` (explicitly unassigned)
          // - UUID (assigned)
          assigned_staff_id: order.assigned_staff_id,
          assignment: order.assigned_staff_id ? { staff_id: order.assigned_staff_id, status: 'assigned' } : null,
          assigned_staff_name: order.assigned_staff_name || null,
        };
      });

      const hasMoreFromApi =
        useCursorPagination && Array.isArray(rawData) && rawData.length > 0 && typeof (rawData as any)[0]?.has_more === 'boolean'
          ? Boolean((rawData as any)[0]?.has_more)
          : null;
      const hasMoreFromExtraRow = rawData.length > pageSize;

      // إجمالي العدد يأتي في أول صف فقط (إن وُجد) - قد لا يكون متاحاً في cursor mode
      const totalCountRaw =
        (Array.isArray(data) && data.length > 0)
          ? (data as any)[0]?.total_count
          : (data as any)?.total_count;
      const totalCount = Number(totalCountRaw || 0) || 0;

      // في cursor mode: حفظ cursor للصفحة التالية بناءً على آخر عنصر في الصفحة الحالية
      if (useCursorPagination && orders.length > 0) {
        const nextCursorCreatedAt = (rawData as any)[0]?.next_cursor_created_at ?? null;
        const nextCursorId = (rawData as any)[0]?.next_cursor_id ?? null;
        const nextCursor =
          nextCursorCreatedAt && nextCursorId ? { createdAt: String(nextCursorCreatedAt), id: String(nextCursorId) } : null;
        if (nextCursor) {
          setCursorByPage((prev) => {
            const copy = prev.slice();
            copy[currentPage + 1] = nextCursor;
            return copy;
          });
        }
      }

      const result = {
        orders,
        totalCount,
        currentPage,
        hasMore: (() => {
          if (hasMoreFromApi !== null) return hasMoreFromApi;
          if (hasMoreFromExtraRow) return true;
          return totalCount > 0 ? currentPage * pageSize < totalCount : false;
        })(),
      };

      if (isDev) {
        console.log('[useOptimizedOrdersDataV2] Processed result:', {
          ordersCount: orders.length,
          totalCount,
          currentPage,
          hasMore: result.hasMore,
        });
      }

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
    enabled: !!organizationId && statsEnabled,
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
    setCursorByPage((prev) => {
      const copy = prev.slice();
      copy[1] = null;
      return copy;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
    setCurrentPage(1);
    setCursorByPage((prev) => {
      const copy = prev.slice();
      copy[1] = null;
      return copy;
    });
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
    if (!organizationId) return;
    // ✅ حدّث كل كاشات orders-list الخاصة بهذه المنظمة (كل الصفحات/الفلاتر/أنماط pagination)
    queryClient.setQueriesData(
      { queryKey: ['orders-list', organizationId] },
      (oldData: any) => {
        if (!oldData?.orders || !Array.isArray(oldData.orders)) return oldData;
        return {
          ...oldData,
          orders: oldData.orders.map((order: Order) =>
            order.id === orderId ? { ...order, ...updates } : order
          ),
        };
      }
    );
  }, [queryClient, organizationId]);

  // ==========================================
  // Error Handling - removed to prevent infinite re-renders
  // Errors are handled in the component level instead
  // ==========================================

  // ==========================================
  // Return API
  // ==========================================
  const orders = ordersData?.orders || [];
  // في cursor mode قد لا يكون total_count متاحاً، لذلك نستخدم totalOrders من الإحصائيات كبديل.
  const totalCount = ordersData?.totalCount || orderStats?.totalOrders || 0;
  const hasMore = ordersData?.hasMore || false;

  const loading = isLoadingOrders || isLoadingShared || isLoadingStats || isLoadingOrgSettings;
  const error = ordersError || sharedDataError || organizationSettingsError;

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
      callConfirmationStatuses: ((sharedData as any)?.call_statuses || []).map((s: any) => ({
        id: Number(s.id),
        name: String(s.name ?? ''),
        color: String(s.color ?? '#6366F1'),
        icon: s.icon ?? null,
        is_default: !!s.is_default,
      })),
      provinces: (sharedData as any)?.provinces || [],
      municipalities: (sharedData as any)?.municipalities || [],
      // تحويل shippingProviders من تنسيق RPC إلى التنسيق المطلوب في UI
      shippingProviders: ((sharedData as any)?.shipping_providers || []).map((provider: any) => ({
        code: provider.code,
        name: provider.name,
        provider_id: provider.id,
        provider_code: provider.code,
        provider_name: provider.name,
        is_enabled: provider.is_active,
        auto_shipping: false, // يمكن إضافتها لاحقاً إذا لزم
      })),
      organizationSettings: organizationSettings || null,
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
