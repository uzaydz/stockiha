/**
 * ⚡ useLocalOrders - Hook للطلبات المحلية
 * 
 * يوفر:
 * - جلب الطلبات مع Pagination
 * - البحث والتصفية
 * - إحصائيات الطلبات
 * - إنشاء طلبات POS
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  unifiedOrderService, 
  Order, 
  OrderWithItems, 
  OrderFilters, 
  OrderStats,
  CreateOrderInput,
  PaginatedOrders
} from '@/services/UnifiedOrderService';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// ========================================
// 📦 Types
// ========================================

export interface UseLocalOrdersOptions {
  filters?: OrderFilters;
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

export interface UseLocalOrdersResult {
  orders: OrderWithItems[];
  loading: boolean;
  error: Error | null;
  total: number;
  page: number;
  hasMore: boolean;
  
  // Actions
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
  setFilters: (filters: OrderFilters) => void;
  search: (query: string) => Promise<Order[]>;
  
  // Single order
  getOrder: (id: string) => Promise<OrderWithItems | null>;
  
  // Create
  createPOSOrder: (input: CreateOrderInput) => Promise<OrderWithItems>;
  
  // Update
  updateStatus: (orderId: string, status: Order['status']) => Promise<Order | null>;
  updatePayment: (orderId: string, amount: number, method?: Order['payment_method']) => Promise<Order | null>;
  cancelOrder: (orderId: string) => Promise<Order | null>;
  
  // Stats
  stats: OrderStats | null;
  loadStats: () => Promise<void>;
  todayStats: OrderStats | null;
  loadTodayStats: () => Promise<void>;
}

// ========================================
// 🔧 Hook Implementation
// ========================================

export function useLocalOrders(options: UseLocalOrdersOptions = {}): UseLocalOrdersResult {
  const {
    filters: initialFilters = {},
    page: initialPage = 1,
    limit = 50,
    autoFetch = true
  } = options;

  // State
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFiltersState] = useState<OrderFilters>(initialFilters);
  
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [todayStats, setTodayStats] = useState<OrderStats | null>(null);

  // ⚡ جلب الطلبات
  const fetchOrders = useCallback(async () => {
    if (!powerSyncService.isInitialized) {
      console.log('[useLocalOrders] PowerSync not initialized yet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await unifiedOrderService.getOrders(filters, page, limit);
      setOrders(result.data);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('[useLocalOrders] Error fetching orders:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  // ⚡ تحديث الفلاتر
  const setFilters = useCallback((newFilters: OrderFilters) => {
    setFiltersState(newFilters);
    setPage(1);
  }, []);

  // ⚡ البحث السريع
  const search = useCallback(async (query: string): Promise<Order[]> => {
    try {
      return await unifiedOrderService.searchOrders(query);
    } catch (err) {
      console.error('[useLocalOrders] Search error:', err);
      return [];
    }
  }, []);

  // ⚡ جلب طلب واحد
  const getOrder = useCallback(async (id: string): Promise<OrderWithItems | null> => {
    try {
      return await unifiedOrderService.getOrder(id);
    } catch (err) {
      console.error('[useLocalOrders] Get order error:', err);
      return null;
    }
  }, []);

  // ⚡ إنشاء طلب POS
  const createPOSOrder = useCallback(async (input: CreateOrderInput): Promise<OrderWithItems> => {
    const order = await unifiedOrderService.createPOSOrder(input);
    // Refetch to update list
    await fetchOrders();
    return order;
  }, [fetchOrders]);

  // ⚡ تحديث حالة الطلب
  const updateStatus = useCallback(async (orderId: string, status: Order['status']): Promise<Order | null> => {
    const result = await unifiedOrderService.updateOrderStatus(orderId, status);
    if (result) await fetchOrders();
    return result;
  }, [fetchOrders]);

  // ⚡ تحديث الدفع
  const updatePayment = useCallback(async (
    orderId: string, 
    amount: number, 
    method?: Order['payment_method']
  ): Promise<Order | null> => {
    const result = await unifiedOrderService.updatePayment(orderId, amount, method);
    if (result) await fetchOrders();
    return result;
  }, [fetchOrders]);

  // ⚡ إلغاء الطلب
  const cancelOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    const result = await unifiedOrderService.cancelOrder(orderId);
    if (result) await fetchOrders();
    return result;
  }, [fetchOrders]);

  // ⚡ جلب الإحصائيات
  const loadStats = useCallback(async () => {
    try {
      const orderStats = await unifiedOrderService.getOrderStats();
      setStats(orderStats);
    } catch (err) {
      console.error('[useLocalOrders] Load stats error:', err);
    }
  }, []);

  // ⚡ جلب إحصائيات اليوم
  const loadTodayStats = useCallback(async () => {
    try {
      const orderStats = await unifiedOrderService.getTodayStats();
      setTodayStats(orderStats);
    } catch (err) {
      console.error('[useLocalOrders] Load today stats error:', err);
    }
  }, []);

  // ⚡ Auto fetch
  useEffect(() => {
    if (autoFetch) {
      fetchOrders();
    }
  }, [fetchOrders, autoFetch]);

  return {
    orders,
    loading,
    error,
    total,
    page,
    hasMore,
    refetch: fetchOrders,
    setPage,
    setFilters,
    search,
    getOrder,
    createPOSOrder,
    updateStatus,
    updatePayment,
    cancelOrder,
    stats,
    loadStats,
    todayStats,
    loadTodayStats
  };
}

// ========================================
// 🔧 Today Orders Hook
// ========================================

export function useTodayOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<OrderStats | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [todayOrders, todayStats] = await Promise.all([
        unifiedOrderService.getTodayOrders(),
        unifiedOrderService.getTodayStats()
      ]);
      setOrders(todayOrders);
      setStats(todayStats);
    } catch (err) {
      console.error('[useTodayOrders] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { orders, loading, stats, refetch: fetch };
}

// ========================================
// 🔧 Single Order Hook
// ========================================

export function useLocalOrder(orderId: string | null) {
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await unifiedOrderService.getOrder(orderId);
      setOrder(result);
    } catch (err) {
      console.error('[useLocalOrder] Error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch order'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { order, loading, error, refetch: fetchOrder };
}

export default useLocalOrders;

