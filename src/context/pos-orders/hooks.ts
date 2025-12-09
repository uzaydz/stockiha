// =================================================================
// 🎯 POS Orders Hooks - Hooks محسنة للأداء
// =================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../TenantContext';
import { useAuth } from '../AuthContext';
import { useAppInitialization } from '../AppInitializationContext'; // ✅ استيراد جديد
import { 
  fetchEmployees,
  fetchOrganizationSettings,
  fetchOrganizationSubscriptions,
  fetchPOSSettings,
  fetchOrderDetails,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder
} from './api';
import { 
  POSOrderStats, 
  POSOrderWithDetails, 
  POSOrderFilters, 
  Employee 
} from './types';
import { unifiedOrderService } from '@/services/UnifiedOrderService';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// =================================================================
// 🔧 Hooks محسنة للأداء
// =================================================================

export const usePOSOrderStats = (orgId?: string) => {
  const { currentOrganization } = useTenant();
  const organizationId = orgId || currentOrganization?.id;

  const fetchLocalStats = async (): Promise<POSOrderStats> => {
    if (!organizationId) throw new Error('organizationId is required');
    const ready = await powerSyncService.waitForInitialization(4000);
    if (!ready) {
      return {
        total_orders: 0,
        total_revenue: 0,
        completed_orders: 0,
        pending_orders: 0,
        cancelled_orders: 0,
        today_orders: 0,
        today_revenue: 0
      };
    }

    if (!powerSyncService.db) {
      console.warn('[pos-orders/hooks] PowerSync DB not initialized');
      return {
        total_orders: 0,
        total_revenue: 0,
        completed_orders: 0,
        pending_orders: 0,
        cancelled_orders: 0,
        today_orders: 0,
        today_revenue: 0
      };
    }
    const row = await powerSyncService.queryOne<POSOrderStats>({
      sql: `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_orders,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_orders,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled_orders,
        COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END), 0) as today_orders,
        COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now') THEN total ELSE 0 END), 0) as today_revenue
      FROM orders
      WHERE organization_id = ?`,
      params: [organizationId]
    });

    return row || {
      total_orders: 0,
      total_revenue: 0,
      completed_orders: 0,
      pending_orders: 0,
      cancelled_orders: 0,
      today_orders: 0,
      today_revenue: 0
    };
  };

  return useQuery({
    queryKey: ['pos-order-stats-local', organizationId],
    queryFn: fetchLocalStats,
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });
};

export const usePOSOrders = (
  page: number = 1,
  limit: number = 20,
  filters: POSOrderFilters = {},
  orgId?: string
) => {
  const { currentOrganization } = useTenant();
  const organizationId = orgId || currentOrganization?.id;

  const fetchLocalOrders = async () => {
    if (!organizationId) throw new Error('organizationId is required');
    unifiedOrderService.setOrganizationId(organizationId);
    return unifiedOrderService.getOrders(filters, page, limit);
  };

  return useQuery({
    queryKey: ['pos-orders-local', organizationId, page, limit, filters],
    queryFn: fetchLocalOrders,
    enabled: !!organizationId,
    staleTime: 1 * 60 * 1000,
    gcTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    keepPreviousData: true
  });
};

export const usePOSEmployees = (orgId?: string) => {
  const { currentOrganization } = useTenant();
  const organizationId = orgId || currentOrganization?.id;

  return useQuery({
    queryKey: ['pos-employees', organizationId],
    queryFn: () => fetchEmployees(organizationId!),
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    refetchOnWindowFocus: false,
    retry: 1
  });
};

export const useOrganizationSettings = (orgId?: string) => {
  const { currentOrganization } = useTenant();
  const organizationId = orgId || currentOrganization?.id;

  return useQuery({
    queryKey: ['organization-settings', organizationId],
    queryFn: () => fetchOrganizationSettings(organizationId!),
    enabled: !!organizationId,
    staleTime: 15 * 60 * 1000, // 15 دقيقة
    gcTime: 60 * 60 * 1000, // ساعة
    refetchOnWindowFocus: false,
    retry: 1
  });
};

export const useOrganizationSubscriptions = (orgId?: string) => {
  const { currentOrganization } = useTenant();
  const organizationId = orgId || currentOrganization?.id;

  return useQuery({
    queryKey: ['organization-subscriptions', organizationId],
    queryFn: () => fetchOrganizationSubscriptions(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 15 * 60 * 1000, // 15 دقيقة
    refetchOnWindowFocus: false,
    retry: 1
  });
};

// ✅ تحديث usePOSSettings لاستخدام البيانات من AppInitializationContext
export const usePOSSettings = (params?: { organizationId?: string }) => {
  const { posSettings, isLoading } = useAppInitialization();
  const { currentOrganization } = useTenant();
  const organizationId = params?.organizationId || currentOrganization?.id;

  // ✅ استخدام البيانات من AppInitializationContext مباشرة
  return useQuery({
    queryKey: ['pos-settings', organizationId],
    queryFn: async () => {
      // إذا كانت البيانات متوفرة من AppInitializationContext، استخدمها
      if (posSettings) {
        console.log('✅ [usePOSSettings] استخدام البيانات من AppInitializationContext');
        return posSettings;
      }
      
      // Fallback: جلب من قاعدة البيانات
      console.log('⚠️ [usePOSSettings] fallback - جلب من قاعدة البيانات');
      return fetchPOSSettings(organizationId!);
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 دقائق
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    refetchOnWindowFocus: false,
    retry: 1,
    // ✅ إذا كانت البيانات متوفرة، استخدمها كـ initialData
    initialData: posSettings || undefined
  });
};

export const useOrderDetails = (orderId?: string) => {
  return useQuery({
    queryKey: ['order-details', orderId],
    queryFn: () => fetchOrderDetails(orderId!),
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 15 * 60 * 1000, // 15 دقيقة
    refetchOnWindowFocus: false,
    retry: 1
  });
};

// =================================================================
// 🔧 Hooks للعمليات (Mutations)
// =================================================================

export const usePOSOrderOperations = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useTenant();

  // 🚀 تحسين الأداء: توحيد invalidation في استدعاء واحد
  const invalidateOrderQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith('pos-order') || key === 'pos-orders';
      }
    });
  };

  const updateOrderStatusMutation = async (
    orderId: string, 
    status: string, 
    notes?: string
  ) => {
    const success = await updateOrderStatus(orderId, status, notes);
    if (success) {
      invalidateOrderQueries();
    }
    return success;
  };

  const updatePaymentStatusMutation = async (
    orderId: string, 
    paymentStatus: string, 
    amountPaid?: number
  ) => {
    const success = await updatePaymentStatus(orderId, paymentStatus, amountPaid);
    if (success) {
      invalidateOrderQueries();
    }
    return success;
  };

  const deleteOrderMutation = async (orderId: string) => {
    const success = await deleteOrder(orderId);
    if (success) {
      invalidateOrderQueries();
    }
    return success;
  };

  const updateOrderInCache = (updatedOrder: POSOrderWithDetails) => {
    // تحديث البيانات في الكاش بدون إعادة جلب
    queryClient.setQueryData(
      ['pos-orders', currentOrganization?.id],
      (oldData: any) => {
        if (!oldData) return oldData;
        
        const updatedOrders = oldData.orders.map((order: POSOrderWithDetails) =>
          order.id === updatedOrder.id ? updatedOrder : order
        );
        
        return {
          ...oldData,
          orders: updatedOrders
        };
      }
    );
  };

  // 🚀 تحسين الأداء: توحيد invalidation
  const refreshProductsCache = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key === 'products' || key?.startsWith('pos-product');
      }
    });
  };

  return {
    updateOrderStatus: updateOrderStatusMutation,
    updatePaymentStatus: updatePaymentStatusMutation,
    deleteOrder: deleteOrderMutation,
    updateOrderInCache,
    refreshProductsCache,
    invalidateOrderQueries
  };
};
