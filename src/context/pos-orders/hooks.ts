// =================================================================
// 🎯 POS Orders Hooks - Hooks محسنة للأداء
// =================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../TenantContext';
import { useAuth } from '../AuthContext';
import { useAppInitialization } from '../AppInitializationContext'; // ✅ استيراد جديد
import { 
  fetchPOSOrderStats,
  fetchPOSOrders,
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

// =================================================================
// 🔧 Hooks محسنة للأداء
// =================================================================

export const usePOSOrderStats = (orgId?: string) => {
  const { currentOrganization } = useTenant();
  const organizationId = orgId || currentOrganization?.id;

  return useQuery({
    queryKey: ['pos-order-stats', organizationId],
    queryFn: () => fetchPOSOrderStats(organizationId!),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 دقائق
    gcTime: 5 * 60 * 1000, // 5 دقائق
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

  return useQuery({
    queryKey: ['pos-orders', organizationId, page, limit, filters],
    queryFn: () => fetchPOSOrders(organizationId!, page, limit, filters),
    enabled: !!organizationId,
    staleTime: 1 * 60 * 1000, // 1 دقيقة
    gcTime: 3 * 60 * 1000, // 3 دقائق
    refetchOnWindowFocus: false,
    retry: 1,
    keepPreviousData: true // للحفاظ على البيانات أثناء التنقل بين الصفحات
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

  const invalidateOrderQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
    queryClient.invalidateQueries({ queryKey: ['pos-order-stats'] });
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

  const refreshProductsCache = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['pos-products'] });
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
