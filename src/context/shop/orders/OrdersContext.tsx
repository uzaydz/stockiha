/**
 * OrdersContext - سياق الطلبات المحسن
 *
 * التحسينات:
 * - useCallback للأداء
 * - التخزين المؤقت للطلبات
 * - تحديث تلقائي عند التغييرات
 * - دعم الفلترة والبحث
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode
} from 'react';
import { Order, OrderStatus } from '@/types';
import { OrdersState, OrdersContextType } from './types';
import { useTenant } from '@/context/TenantContext';
import * as orderService from '../orderService';
import { supabase } from '@/lib/supabase-client';
import { mapSupabaseOrderToOrder } from '../mappers';
import { withCache, SHORT_CACHE_TTL } from '@/lib/cache/storeCache';

// ============================================================================
// Initial State
// ============================================================================

const initialState: OrdersState = {
  orders: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// Context
// ============================================================================

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface OrdersProviderProps {
  children: ReactNode;
}

export const OrdersProvider = React.memo(function OrdersProvider({
  children
}: OrdersProviderProps) {
  const [state, setState] = useState<OrdersState>(initialState);
  const tenant = useTenant();

  // ========================================================================
  // Orders Actions
  // ========================================================================

  const fetchOrders = useCallback(async () => {
    const organizationId = tenant.currentOrganization?.id;
    if (!organizationId) {
      setState(prev => ({
        ...prev,
        error: 'لم يتم العثور على معرف المنظمة',
        isLoading: false,
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // استخدام التخزين المؤقت لتحسين الأداء
      const orders = await withCache<Order[]>(
        `orders:${organizationId}`,
        async () => {
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(100); // تحديد عدد الطلبات للأداء

          if (error) {
            throw error;
          }

          // تحويل البيانات
          const orderPromises = (data || []).map(order =>
            mapSupabaseOrderToOrder(order, false)
          );
          return Promise.all(orderPromises);
        },
        SHORT_CACHE_TTL
      );

      setState(prev => ({
        ...prev,
        orders,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في جلب الطلبات';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [tenant.currentOrganization?.id]);

  const addOrder = useCallback(async (
    order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Order> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const organizationId = tenant.currentOrganization?.id;
      if (!organizationId) {
        throw new Error('لا يمكن العثور على معرف المؤسسة');
      }

      const newOrder = await orderService.addOrder(order, organizationId);

      // تحديث الحالة المحلية
      setState(prev => ({
        ...prev,
        orders: [newOrder, ...prev.orders.slice(0, 49)], // الاحتفاظ بآخر 50 طلب
        isLoading: false,
      }));

      return newOrder;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في إضافة الطلب';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [tenant.currentOrganization?.id]);

  const updateOrder = useCallback((order: Order): Order => {
    const updatedOrder = { ...order, updatedAt: new Date() };

    // تحديث الحالة المحلية
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => (o.id === order.id ? updatedOrder : o)),
    }));

    return updatedOrder;
  }, []);

  const deleteOrder = useCallback(async (orderId: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await orderService.deleteOrder(orderId);

      // تحديث الحالة المحلية
      setState(prev => ({
        ...prev,
        orders: prev.orders.filter(o => o.id !== orderId),
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في حذف الطلب';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    await fetchOrders();
  }, [fetchOrders]);

  // ========================================================================
  // Context Value (memoized)
  // ========================================================================

  const value = useMemo<OrdersContextType>(
    () => ({
      state,
      fetchOrders,
      addOrder,
      updateOrder,
      deleteOrder,
      refreshOrders,
    }),
    [
      state,
      fetchOrders,
      addOrder,
      updateOrder,
      deleteOrder,
      refreshOrders,
    ]
  );

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
});

// ============================================================================
// Hook
// ============================================================================

export function useOrders(): OrdersContextType {
  const context = useContext(OrdersContext);

  if (context === undefined) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }

  return context;
}

// ============================================================================
// Selectors (for performance)
// ============================================================================

/**
 * Hook للحصول على قائمة الطلبات فقط
 */
export function useOrdersList() {
  const { state } = useOrders();
  return useMemo(() => state.orders, [state.orders]);
}

/**
 * Hook للحصول على طلب بالـ ID
 */
export function useOrderById(orderId: string) {
  const { state } = useOrders();
  return useMemo(
    () => state.orders.find(o => o.id === orderId),
    [state.orders, orderId]
  );
}

/**
 * Hook للحصول على الطلبات حسب الحالة
 */
export function useOrdersByStatus(status: OrderStatus) {
  const { state } = useOrders();
  return useMemo(
    () => state.orders.filter(o => o.status === status),
    [state.orders, status]
  );
}

/**
 * Hook للحصول على الطلبات اليوم
 */
export function useTodayOrders() {
  const { state } = useOrders();
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return state.orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });
  }, [state.orders]);
}

/**
 * Hook للحصول على الطلبات الأونلاين
 */
export function useOnlineOrders() {
  const { state } = useOrders();
  return useMemo(
    () => state.orders.filter(o => o.isOnline),
    [state.orders]
  );
}

/**
 * Hook للحصول على طلبات POS
 */
export function usePOSOrders() {
  const { state } = useOrders();
  return useMemo(
    () => state.orders.filter(o => !o.isOnline),
    [state.orders]
  );
}

/**
 * Hook للحصول على الطلبات المدفوعة جزئياً
 */
export function usePartialPaymentOrders() {
  const { state } = useOrders();
  return useMemo(
    () => state.orders.filter(o => o.partialPayment && o.partialPayment.remainingAmount > 0),
    [state.orders]
  );
}

/**
 * Hook للحصول على الطلبات حسب العميل
 */
export function useOrdersByCustomer(customerId: string) {
  const { state } = useOrders();
  return useMemo(
    () => state.orders.filter(o => o.customerId === customerId),
    [state.orders, customerId]
  );
}

/**
 * Hook للحصول على إجمالي المبيعات
 */
export function useTotalSales() {
  const { state } = useOrders();
  return useMemo(() => {
    return state.orders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((total, order) => total + order.total, 0);
  }, [state.orders]);
}

/**
 * Hook للحصول على إجمالي المبيعات اليوم
 */
export function useTodaySales() {
  const todayOrders = useTodayOrders();
  return useMemo(() => {
    return todayOrders
      .filter(o => o.paymentStatus === 'paid')
      .reduce((total, order) => total + order.total, 0);
  }, [todayOrders]);
}

/**
 * Hook للحصول على حالة التحميل
 */
export function useOrdersLoading() {
  const { state } = useOrders();
  return useMemo(() => state.isLoading, [state.isLoading]);
}

/**
 * Hook للحصول على الأخطاء
 */
export function useOrdersError() {
  const { state } = useOrders();
  return useMemo(() => state.error, [state.error]);
}
