/**
 * ⚡ useReactiveOrders - PowerSync Reactive Hook
 * ============================================================
 *
 * 🚀 Hook للطلبات مع تحديث تلقائي
 *    - يستخدم useQuery من @powersync/react
 *    - تحديث فوري عند أي تغيير
 *
 * المصادر:
 * - https://docs.powersync.com/usage/use-case-examples/watch-queries
 * ============================================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'check' | 'credit' | 'other';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';

export interface ReactiveOrder {
  id: string;
  customer_id: string | null;
  subtotal: number;
  tax: number;
  discount: number | null;
  total: number;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  notes: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  employee_id: string | null;
  is_online: boolean;
}

export interface ReactiveOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  color_id: string | null;
  size_id: string | null;
  created_at: string;
}

export interface UseReactiveOrdersOptions {
  status?: OrderStatus;
  limit?: number;
  isOnline?: boolean;
  fromDate?: string;
  toDate?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactiveOrders
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للطلبات (Reactive)
 *
 * @example
 * ```tsx
 * const { orders, isLoading } = useReactiveOrders({ status: 'pending' });
 * // orders يتحدث تلقائياً عند أي تغيير!
 * ```
 */
export function useReactiveOrders(options: UseReactiveOrdersOptions = {}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { status, limit = 100, isOnline, fromDate, toDate } = options;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM orders
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    // فلتر الحالة
    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    // فلتر أونلاين/أوفلاين
    if (isOnline !== undefined) {
      query += ` AND is_online = ?`;
      queryParams.push(isOnline ? 1 : 0);
    }

    // فلتر التاريخ
    if (fromDate) {
      query += ` AND created_at >= ?`;
      queryParams.push(fromDate);
    }
    if (toDate) {
      query += ` AND created_at <= ?`;
      queryParams.push(toDate);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, status, isOnline, fromDate, toDate, limit]);

  const { data, isLoading, isFetching, error } = useQuery<ReactiveOrder>(sql, params);

  const orders = useMemo(() => {
    if (!data) return [];
    return data.map(o => ({
      ...o,
      subtotal: Number(o.subtotal) || 0,
      tax: Number(o.tax) || 0,
      discount: o.discount ? Number(o.discount) : null,
      total: Number(o.total) || 0,
      is_online: Boolean(o.is_online),
    }));
  }, [data]);

  return {
    orders,
    isLoading,
    isFetching,
    error: error || null,
    total: orders.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Single Order Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لطلب واحد (Reactive)
 */
export function useReactiveOrder(orderId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !orderId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM orders WHERE id = ? AND organization_id = ? LIMIT 1',
      params: [orderId, orgId]
    };
  }, [orderId, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveOrder>(sql, params);

  const order = useMemo(() => {
    if (!data || data.length === 0) return null;
    const o = data[0];
    return {
      ...o,
      subtotal: Number(o.subtotal) || 0,
      tax: Number(o.tax) || 0,
      discount: o.discount ? Number(o.discount) : null,
      total: Number(o.total) || 0,
    };
  }, [data]);

  return { order, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Order Items Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لعناصر الطلب (Reactive)
 */
export function useReactiveOrderItems(orderId: string | null) {
  const { sql, params } = useMemo(() => {
    if (!orderId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at',
      params: [orderId]
    };
  }, [orderId]);

  const { data, isLoading, error } = useQuery<ReactiveOrderItem>(sql, params);

  const items = useMemo(() => {
    if (!data) return [];
    return data.map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      total_price: Number(item.total_price) || 0,
    }));
  }, [data]);

  return { items, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Order Stats Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لإحصائيات الطلبات (Reactive)
 */
export function useReactiveOrderStats() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  // إحصائيات حسب الحالة
  const statusQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          status,
          COUNT(*) as count,
          SUM(total) as total_amount
        FROM orders
        WHERE organization_id = ?
        GROUP BY status
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: statusData, isLoading: statusLoading } = useQuery<{
    status: OrderStatus;
    count: number;
    total_amount: number;
  }>(statusQuery.sql, statusQuery.params);

  // إحصائيات اليوم
  const todayQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count, 0 as total', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(total), 0) as total
        FROM orders
        WHERE organization_id = ?
          AND date(created_at) = date('now')
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: todayData, isLoading: todayLoading } = useQuery<{
    count: number;
    total: number;
  }>(todayQuery.sql, todayQuery.params);

  const stats = useMemo(() => {
    const byStatus: Record<OrderStatus, { count: number; amount: number }> = {
      pending: { count: 0, amount: 0 },
      processing: { count: 0, amount: 0 },
      completed: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
      refunded: { count: 0, amount: 0 },
    };

    let totalOrders = 0;
    let totalRevenue = 0;

    if (statusData) {
      for (const row of statusData) {
        byStatus[row.status] = {
          count: Number(row.count) || 0,
          amount: Number(row.total_amount) || 0
        };
        totalOrders += Number(row.count) || 0;
        if (row.status === 'completed') {
          totalRevenue += Number(row.total_amount) || 0;
        }
      }
    }

    return {
      byStatus,
      totalOrders,
      totalRevenue,
      todayOrders: todayData?.[0]?.count ? Number(todayData[0].count) : 0,
      todayRevenue: todayData?.[0]?.total ? Number(todayData[0].total) : 0,
    };
  }, [statusData, todayData]);

  return {
    stats,
    isLoading: statusLoading || todayLoading
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Recent Orders Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لآخر الطلبات (Reactive)
 */
export function useReactiveRecentOrders(limit: number = 10) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT * FROM orders
        WHERE organization_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      params: [orgId, limit]
    };
  }, [orgId, limit]);

  const { data, isLoading, error } = useQuery<ReactiveOrder>(sql, params);

  return {
    orders: data || [],
    isLoading,
    error: error || null
  };
}

export default useReactiveOrders;
