/**
 * 🎯 POSOrdersDataContext - PowerSync Version
 * نسخة محدثة تستخدم PowerSync للطلبات
 */

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { usePowerSync } from '@/hooks/powersync/usePowerSync';
import { usePowerSyncQuery } from '@/hooks/powersync/usePowerSyncQuery';
import type { LocalPOSOrder } from '@/database/localDb';

// =================================================================
// 🔹 INTERFACES
// =================================================================

interface POSOrderWithDetails extends LocalPOSOrder {
  order_items?: any[];
  customer?: any;
  employee?: any;
  items_count?: number;
}

interface POSOrderStats {
  total_orders: number;
  total_revenue: number;
  completed_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  today_orders: number;
  today_revenue: number;
}

interface POSOrdersDataContextType {
  // Orders
  orders: POSOrderWithDetails[];
  ordersLoading: boolean;
  ordersError: Error | null;

  // Stats
  stats: POSOrderStats | null;
  statsLoading: boolean;

  // Methods
  refreshOrders: () => Promise<void>;
  createOrder: (order: Partial<LocalPOSOrder>) => Promise<LocalPOSOrder>;
  updateOrder: (orderId: string, updates: Partial<LocalPOSOrder>) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  getOrderById: (orderId: string) => Promise<POSOrderWithDetails | null>;
  getOrderItems: (orderId: string) => Promise<any[]>;
}

const POSOrdersDataContext = createContext<POSOrdersDataContextType | undefined>(undefined);

// =================================================================
// 🔹 PROVIDER
// =================================================================

export function POSOrdersDataProvider({ children }: { children: ReactNode }) {
  const { organizationId } = useTenant();
  const { user } = useAuth();
  const { db, isReady, powerSyncService } = usePowerSync();
  const queryClient = useQueryClient();

  // =================================================================
  // 📊 ORDERS QUERY
  // =================================================================

  const {
    data: ordersData = [],
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = usePowerSyncQuery<POSOrderWithDetails>({
    queryKey: ['orders', organizationId],
    sql: `
      SELECT
        o.*,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
      FROM orders o
      WHERE o.organization_id = ?
      ORDER BY o.created_at DESC
      LIMIT 1000
    `,
    params: [organizationId],
    enabled: !!organizationId && isReady,
  });

  // =================================================================
  // 📊 STATS QUERY
  // =================================================================

  const { data: statsData, isLoading: statsLoading } = usePowerSyncQuery<any>({
    queryKey: ['orders-stats', organizationId],
    sql: `
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_orders,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_orders,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled_orders,
        COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END), 0) as today_orders,
        COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') THEN total_amount ELSE 0 END), 0) as today_revenue
      FROM orders
      WHERE organization_id = ?
    `,
    params: [organizationId],
    enabled: !!organizationId && isReady,
  });

  const stats: POSOrderStats | null = useMemo(() => {
    if (!statsData || statsData.length === 0) return null;
    return statsData[0];
  }, [statsData]);

  // =================================================================
  // 🔄 MUTATIONS
  // =================================================================

  /**
   * إنشاء طلب جديد
   */
  const createOrderMutation = useMutation({
    mutationFn: async (order: Partial<LocalPOSOrder>): Promise<LocalPOSOrder> => {
      if (!db) throw new Error('PowerSync not initialized');

      const newOrder: LocalPOSOrder = {
        id: crypto.randomUUID(),
        organization_id: organizationId!,
        order_number: `ORD-${Date.now()}`,
        status: 'completed',
        payment_status: 'paid',
        payment_method: 'cash',
        total_amount: 0,
        subtotal: 0,
        tax: 0,
        discount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...order,
      };

      await powerSyncService.transaction(async (tx) => {
        const columns = Object.keys(newOrder);
        const values = Object.values(newOrder);
        const placeholders = columns.map(() => '?').join(', ');

        await tx.execute(
          `INSERT INTO orders (${columns.join(', ')})
           VALUES (${placeholders})`,
          values
        );
      });

      return newOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['orders-stats', organizationId] });
    },
  });

  /**
   * تحديث طلب
   */
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: Partial<LocalPOSOrder> }) => {
      if (!db) throw new Error('PowerSync not initialized');

      const updatedFields = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await powerSyncService.transaction(async (tx) => {
        const setClause = Object.keys(updatedFields)
          .map((key) => `${key} = ?`)
          .join(', ');
        const values = [...Object.values(updatedFields), orderId];

        await tx.execute(`UPDATE orders SET ${setClause} WHERE id = ?`, values);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['orders-stats', organizationId] });
    },
  });

  /**
   * حذف طلب
   */
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (!db) throw new Error('PowerSync not initialized');

      await powerSyncService.transaction(async (tx) => {
        // حذف order items أولاً
        await tx.execute(`DELETE FROM order_items WHERE order_id = ?`, [orderId]);

        // حذف الطلب
        await tx.execute(`DELETE FROM orders WHERE id = ?`, [orderId]);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['orders-stats', organizationId] });
    },
  });

  /**
   * جلب طلب واحد بالتفاصيل
   */
  const getOrderById = useCallback(
    async (orderId: string): Promise<POSOrderWithDetails | null> => {
      if (!db) throw new Error('PowerSync not initialized');

      const result = await db.get<POSOrderWithDetails>(
        `SELECT * FROM orders WHERE id = ?`,
        [orderId]
      );

      if (!result) return null;

      // جلب order items
      const items = await db.getAll(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [orderId]
      );

      return {
        ...result,
        order_items: items,
        items_count: items.length,
      };
    },
    [db]
  );

  /**
   * جلب عناصر الطلب
   */
  const getOrderItems = useCallback(
    async (orderId: string): Promise<any[]> => {
      if (!db) throw new Error('PowerSync not initialized');

      return await db.getAll(
        `SELECT
          oi.*,
          p.name as product_name,
          p.image_url as product_image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?`,
        [orderId]
      );
    },
    [db]
  );

  // =================================================================
  // 🔹 CONTEXT VALUE
  // =================================================================

  const value: POSOrdersDataContextType = useMemo(
    () => ({
      // Orders
      orders: ordersData,
      ordersLoading,
      ordersError: ordersError as Error | null,

      // Stats
      stats,
      statsLoading,

      // Methods
      refreshOrders: async () => {
        await refetchOrders();
      },
      createOrder: async (order: Partial<LocalPOSOrder>) => {
        return await createOrderMutation.mutateAsync(order);
      },
      updateOrder: async (orderId: string, updates: Partial<LocalPOSOrder>) => {
        await updateOrderMutation.mutateAsync({ orderId, updates });
      },
      deleteOrder: async (orderId: string) => {
        await deleteOrderMutation.mutateAsync(orderId);
      },
      getOrderById,
      getOrderItems,
    }),
    [
      ordersData,
      ordersLoading,
      ordersError,
      stats,
      statsLoading,
      organizationId,
      getOrderById,
      getOrderItems,
    ]
  );

  return <POSOrdersDataContext.Provider value={value}>{children}</POSOrdersDataContext.Provider>;
}

// =================================================================
// 🔹 HOOK
// =================================================================

export function usePOSOrders() {
  const context = useContext(POSOrdersDataContext);
  if (!context) {
    throw new Error('usePOSOrders must be used within POSOrdersDataProvider');
  }
  return context;
}
