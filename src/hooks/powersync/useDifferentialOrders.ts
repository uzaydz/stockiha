/**
 * ⚡ useDifferentialOrders - Differential Watch Implementation
 * ============================================================
 *
 * 🚀 استخدام differentialWatch للحصول على:
 *   - فقط التغييرات (added, removed, updated)
 *   - أداء ممتاز مع القوائم الكبيرة
 *   - تحديثات ذكية بدون إعادة تحميل كل البيانات
 *
 * الاستخدام:
 * ```tsx
 * import { useDifferentialOrders } from '@/hooks/powersync/useDifferentialOrders';
 *
 * function LiveOrdersComponent() {
 *   const { orders, stats, isConnected } = useDifferentialOrders(orgId);
 *   // الطلبات تتحدث تلقائياً مع كل تغيير!
 * }
 * ```
 *
 * المصادر:
 * - https://docs.powersync.com/usage/use-case-examples/watch-queries
 * ============================================================
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePowerSync } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface DifferentialOrder {
  id: string;
  order_number?: string;
  customer_id?: string;
  customer_name?: string;
  total_amount: number;
  status: string;
  payment_status?: string;
  payment_method?: string;
  created_at: string;
  updated_at?: string;
  organization_id: string;
}

export interface OrderDiff {
  added: DifferentialOrder[];
  removed: DifferentialOrder[];
  updated: DifferentialOrder[];
}

export interface DifferentialOrdersStats {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
  totalAmount: number;
}

export interface UseDifferentialOrdersOptions {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  enabled?: boolean;
  onDiff?: (diff: OrderDiff) => void;
}

export interface UseDifferentialOrdersResult {
  orders: DifferentialOrder[];
  stats: DifferentialOrdersStats;
  isLoading: boolean;
  isConnected: boolean;
  error: Error | null;
  lastDiff: OrderDiff | null;
  refresh: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useDifferentialOrders(
  options: UseDifferentialOrdersOptions = {}
): UseDifferentialOrdersResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;
  const db = usePowerSync();

  const {
    status,
    dateFrom,
    dateTo,
    limit = 100,
    enabled = true,
    onDiff,
  } = options;

  // State
  const [orders, setOrders] = useState<DifferentialOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastDiff, setLastDiff] = useState<OrderDiff | null>(null);

  // Refs for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const ordersMapRef = useRef<Map<string, DifferentialOrder>>(new Map());

  // Build SQL query
  const { sql, params } = useMemo(() => {
    if (!orgId || !enabled) {
      return { sql: '', params: [] };
    }

    let query = `
      SELECT * FROM orders
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    if (dateFrom) {
      query += ` AND created_at >= ?`;
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND created_at <= ?`;
      queryParams.push(dateTo);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, status, dateFrom, dateTo, limit, enabled]);

  // Calculate stats
  const stats = useMemo((): DifferentialOrdersStats => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      completed: orders.filter(o => o.status === 'completed' || o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalAmount: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    };
  }, [orders]);

  // Apply diff to orders
  const applyDiff = useCallback((diff: OrderDiff) => {
    setOrders(prevOrders => {
      const ordersMap = new Map(prevOrders.map(o => [o.id, o]));

      // Remove deleted
      diff.removed.forEach(order => {
        ordersMap.delete(order.id);
      });

      // Update existing
      diff.updated.forEach(order => {
        ordersMap.set(order.id, order);
      });

      // Add new
      diff.added.forEach(order => {
        ordersMap.set(order.id, order);
      });

      // Convert back to array and sort
      const newOrders = Array.from(ordersMap.values());
      newOrders.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return newOrders;
    });

    setLastDiff(diff);
    onDiff?.(diff);
  }, [onDiff]);

  // Setup differential watch
  useEffect(() => {
    if (!db || !sql || !enabled) {
      setIsLoading(false);
      return;
    }

    const setupWatch = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initial fetch
        const initialData = await db.getAll<DifferentialOrder>(sql, params);
        setOrders(initialData);
        ordersMapRef.current = new Map(initialData.map(o => [o.id, o]));
        setIsConnected(true);
        setIsLoading(false);

        console.log('[DifferentialOrders] Initial load:', initialData.length, 'orders');

        // Setup watch for changes
        unsubscribeRef.current = db.watch(sql, params, {
          onResult: (result) => {
            const newOrders = result.rows?._array || [];
            const newOrdersMap = new Map(newOrders.map((o: DifferentialOrder) => [o.id, o]));
            const oldOrdersMap = ordersMapRef.current;

            // Calculate diff
            const diff: OrderDiff = {
              added: [],
              removed: [],
              updated: [],
            };

            // Find added and updated
            newOrdersMap.forEach((order, id) => {
              const oldOrder = oldOrdersMap.get(id);
              if (!oldOrder) {
                diff.added.push(order);
              } else if (JSON.stringify(order) !== JSON.stringify(oldOrder)) {
                diff.updated.push(order);
              }
            });

            // Find removed
            oldOrdersMap.forEach((order, id) => {
              if (!newOrdersMap.has(id)) {
                diff.removed.push(order);
              }
            });

            // Only apply if there are changes
            if (diff.added.length || diff.removed.length || diff.updated.length) {
              console.log('[DifferentialOrders] Diff:', {
                added: diff.added.length,
                removed: diff.removed.length,
                updated: diff.updated.length,
              });

              ordersMapRef.current = newOrdersMap;
              applyDiff(diff);
            }
          },
          onError: (err) => {
            console.error('[DifferentialOrders] Watch error:', err);
            setError(err);
            setIsConnected(false);
          },
        });

      } catch (err) {
        console.error('[DifferentialOrders] Setup error:', err);
        setError(err as Error);
        setIsLoading(false);
        setIsConnected(false);
      }
    };

    setupWatch();

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [db, sql, JSON.stringify(params), enabled, applyDiff]);

  // Refresh function
  const refresh = useCallback(async () => {
    if (!db || !sql) return;

    try {
      setIsLoading(true);
      const data = await db.getAll<DifferentialOrder>(sql, params);
      setOrders(data);
      ordersMapRef.current = new Map(data.map(o => [o.id, o]));
      setIsLoading(false);
    } catch (err) {
      console.error('[DifferentialOrders] Refresh error:', err);
      setError(err as Error);
      setIsLoading(false);
    }
  }, [db, sql, params]);

  return {
    orders,
    stats,
    isLoading,
    isConnected,
    error,
    lastDiff,
    refresh,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 POS Orders Differential Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useDifferentialPOSOrders(
  options: UseDifferentialOrdersOptions = {}
): UseDifferentialOrdersResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;
  const db = usePowerSync();

  const {
    status,
    dateFrom,
    dateTo,
    limit = 100,
    enabled = true,
    onDiff,
  } = options;

  const [orders, setOrders] = useState<DifferentialOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastDiff, setLastDiff] = useState<OrderDiff | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const ordersMapRef = useRef<Map<string, DifferentialOrder>>(new Map());

  const { sql, params } = useMemo(() => {
    if (!orgId || !enabled) {
      return { sql: '', params: [] };
    }

    let query = `
      SELECT * FROM pos_orders
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    if (dateFrom) {
      query += ` AND created_at >= ?`;
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND created_at <= ?`;
      queryParams.push(dateTo);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, status, dateFrom, dateTo, limit, enabled]);

  const stats = useMemo((): DifferentialOrdersStats => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalAmount: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    };
  }, [orders]);

  const applyDiff = useCallback((diff: OrderDiff) => {
    setOrders(prevOrders => {
      const ordersMap = new Map(prevOrders.map(o => [o.id, o]));

      diff.removed.forEach(order => ordersMap.delete(order.id));
      diff.updated.forEach(order => ordersMap.set(order.id, order));
      diff.added.forEach(order => ordersMap.set(order.id, order));

      const newOrders = Array.from(ordersMap.values());
      newOrders.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return newOrders;
    });

    setLastDiff(diff);
    onDiff?.(diff);
  }, [onDiff]);

  useEffect(() => {
    if (!db || !sql || !enabled) {
      setIsLoading(false);
      return;
    }

    const setupWatch = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const initialData = await db.getAll<DifferentialOrder>(sql, params);
        setOrders(initialData);
        ordersMapRef.current = new Map(initialData.map(o => [o.id, o]));
        setIsConnected(true);
        setIsLoading(false);

        unsubscribeRef.current = db.watch(sql, params, {
          onResult: (result) => {
            const newOrders = result.rows?._array || [];
            const newOrdersMap = new Map(newOrders.map((o: DifferentialOrder) => [o.id, o]));
            const oldOrdersMap = ordersMapRef.current;

            const diff: OrderDiff = { added: [], removed: [], updated: [] };

            newOrdersMap.forEach((order, id) => {
              const oldOrder = oldOrdersMap.get(id);
              if (!oldOrder) {
                diff.added.push(order);
              } else if (JSON.stringify(order) !== JSON.stringify(oldOrder)) {
                diff.updated.push(order);
              }
            });

            oldOrdersMap.forEach((order, id) => {
              if (!newOrdersMap.has(id)) {
                diff.removed.push(order);
              }
            });

            if (diff.added.length || diff.removed.length || diff.updated.length) {
              ordersMapRef.current = newOrdersMap;
              applyDiff(diff);
            }
          },
          onError: (err) => {
            setError(err);
            setIsConnected(false);
          },
        });

      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
        setIsConnected(false);
      }
    };

    setupWatch();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [db, sql, JSON.stringify(params), enabled, applyDiff]);

  const refresh = useCallback(async () => {
    if (!db || !sql) return;

    try {
      setIsLoading(true);
      const data = await db.getAll<DifferentialOrder>(sql, params);
      setOrders(data);
      ordersMapRef.current = new Map(data.map(o => [o.id, o]));
      setIsLoading(false);
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, [db, sql, params]);

  return {
    orders,
    stats,
    isLoading,
    isConnected,
    error,
    lastDiff,
    refresh,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 Exports
// ═══════════════════════════════════════════════════════════════════════════

export default useDifferentialOrders;
