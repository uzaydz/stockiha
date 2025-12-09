/**
 * ⚡ usePOSOrdersSmart - Hook تفاعلي للطلبات
 *
 * التحسينات الرئيسية:
 * - يستخدم SQL-level filtering بدلاً من JavaScript filtering
 * - يجلب فقط الطلبات المطلوبة للصفحة الحالية
 * - يستخدم Watch API للتحديثات اللحظية
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTenant } from '@/context/TenantContext';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

export interface OrdersQueryOptions {
  /** رقم الصفحة (يبدأ من 1) */
  page?: number;
  /** عدد الطلبات في الصفحة */
  limit?: number;
  /** حالة الطلب */
  status?: string;
  /** حالة الدفع */
  paymentStatus?: string;
  /** معرف العميل */
  customerId?: string;
  /** تاريخ البداية */
  dateFrom?: string;
  /** تاريخ النهاية */
  dateTo?: string;
  /** تفعيل الـ Hook */
  enabled?: boolean;
  /** استخدام Watch للتحديثات اللحظية */
  enableWatch?: boolean;
}

export interface OrdersQueryResult {
  /** قائمة الطلبات */
  orders: any[];
  /** معلومات الصفحات */
  pagination: {
    page: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  /** حالة التحميل */
  isLoading: boolean;
  /** حالة إعادة التحميل */
  isRefetching: boolean;
  /** الخطأ إن وجد */
  error: Error | null;
  /** إحصائيات الطلبات */
  stats: {
    totalOrders: number;
    todayOrders: number;
    totalSales: number;
    todaySales: number;
  };
  /** إعادة تحميل البيانات */
  refetch: () => Promise<void>;
  /** إضافة طلب جديد للكاش */
  addOrderToCache: (order: any) => void;
  /** تحديث طلب في الكاش */
  updateOrderInCache: (orderId: string, updates: Partial<any>) => void;
}

export const usePOSOrdersSmart = (options: OrdersQueryOptions = {}): OrdersQueryResult => {
  const { currentOrganization } = useTenant();
  const organizationId = currentOrganization?.id;

  const {
    page = 1,
    limit = 50,
    status,
    paymentStatus,
    customerId,
    dateFrom,
    dateTo,
    enabled = true,
    enableWatch = true
  } = options;

  // State
  const [orders, setOrders] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    todayOrders: 0,
    totalSales: 0,
    todaySales: 0
  });

  // Refs
  const watchCleanupRef = useRef<(() => void) | null>(null);
  const lastQueryRef = useRef<string>('');

  // Query key for deduplication
  const queryKey = useMemo(
    () => `${organizationId}:${page}:${limit}:${status || ''}:${paymentStatus || ''}:${customerId || ''}:${dateFrom || ''}:${dateTo || ''}`,
    [organizationId, page, limit, status, paymentStatus, customerId, dateFrom, dateTo]
  );

  // ⚡ Fetch orders using smart SQL query
  const fetchOrders = useCallback(async (isRefetch = false) => {
    if (!organizationId || !enabled) return;

    // Prevent duplicate queries
    if (lastQueryRef.current === queryKey && !isRefetch) return;
    lastQueryRef.current = queryKey;

    if (isRefetch) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch orders and stats in parallel
      const [ordersResult, orderStats] = await Promise.all([
        deltaWriteService.getOrdersSmart({
          organizationId,
          status,
          paymentStatus,
          customerId,
          dateFrom,
          dateTo,
          page,
          limit
        }),
        deltaWriteService.getOrderStats(organizationId)
      ]);

      setOrders(ordersResult.orders);
      setTotalCount(ordersResult.totalCount);
      setTotalPages(ordersResult.totalPages);
      setStats(orderStats);
    } catch (err) {
      console.error('[usePOSOrdersSmart] Error fetching orders:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [organizationId, enabled, queryKey, status, paymentStatus, customerId, dateFrom, dateTo, page, limit]);

  // ⚡ Setup Watch subscription for real-time updates
  useEffect(() => {
    if (!enableWatch || !organizationId || !powerSyncService.isReady()) return;

    // Cleanup previous watcher
    if (watchCleanupRef.current) {
      watchCleanupRef.current();
      watchCleanupRef.current = null;
    }

    const watchSql = `SELECT id FROM orders WHERE organization_id = ?`;

    const cleanup = powerSyncService.watch<{ id: string }>(
      { sql: watchSql, params: [organizationId] },
      {
        onResult: () => {
          console.log('[usePOSOrdersSmart] 🔄 Orders changed, refetching...');
          fetchOrders(true);
        },
        onError: (err) => {
          console.error('[usePOSOrdersSmart] Watch error:', err);
        },
        throttleMs: 100
      }
    );

    watchCleanupRef.current = cleanup;

    return () => {
      if (watchCleanupRef.current) {
        watchCleanupRef.current();
        watchCleanupRef.current = null;
      }
    };
  }, [enableWatch, organizationId, fetchOrders]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ⚡ Add order to local cache (optimistic update)
  const addOrderToCache = useCallback((order: any) => {
    setOrders(prev => [order, ...prev]);
    setTotalCount(prev => prev + 1);
    setStats(prev => ({
      ...prev,
      totalOrders: prev.totalOrders + 1,
      todayOrders: prev.todayOrders + 1,
      totalSales: prev.totalSales + (order.total || 0),
      todaySales: prev.todaySales + (order.total || 0)
    }));
  }, []);

  // ⚡ Update order in local cache
  const updateOrderInCache = useCallback((orderId: string, updates: Partial<any>) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? { ...order, ...updates }
          : order
      )
    );
  }, []);

  // Refetch function
  const refetch = useCallback(async () => {
    lastQueryRef.current = '';
    await fetchOrders(true);
  }, [fetchOrders]);

  return {
    orders,
    pagination: {
      page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    isLoading,
    isRefetching,
    error,
    stats,
    refetch,
    addOrderToCache,
    updateOrderInCache
  };
};

export default usePOSOrdersSmart;
