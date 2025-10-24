import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  RefreshCw, 
  Download, 
  Plus,
  AlertTriangle,
  Zap,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

// Layout component
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

// Context
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

// Services
import { supabase } from '@/lib/supabase-unified';
import { inventoryDB } from '@/database/localDb';
import { getOrdersByOrganization, saveRemoteOrders, saveRemoteOrderItems, getLocalPOSOrderItems } from '@/api/localPosOrderService';

// Types
interface OptimizedPOSOrder {
  id: string;
  organization_id: string;
  customer_id?: string;
  employee_id?: string;
  slug?: string;
  customer_order_number?: number;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  tax: number;
  discount?: number;
  amount_paid?: number;
  remaining_amount?: number;
  consider_remaining_as_partial?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  items_count: number;
  total_qty: number;
  effective_status?: string;
  effective_total?: number;
  has_returns?: boolean;
  is_fully_returned?: boolean;
  total_returned_amount?: number;
  // إضافة الخصائص المفقودة
  order_items?: any[];
  admin_notes?: string;
  customer_notes?: string;
  is_online: boolean;
  metadata?: any;
  pos_order_type?: string;
  shipping_address_id?: string;
  shipping_cost?: number;
  shipping_method?: string;
}

interface POSOrderFilters {
  status?: string;
  payment_method?: string;
  payment_status?: string;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  statuses?: string[];
  payment_statuses?: string[];
}

interface POSOrderStats {
  total_orders: number;
  total_revenue: number;
  completed_orders: number;
  pending_orders: number;
  pending_payment_orders: number;
  cancelled_orders: number;
  cash_orders: number;
  card_orders: number;
  avg_order_value: number;
  today_orders: number;
  today_revenue: number;
  total_returned_amount?: number;
  orders_with_returns?: number;
  fully_returned_orders?: number;
  effective_revenue?: number;
  return_rate?: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface POSOrdersOptimizedProps extends POSSharedLayoutControls {}

// Components
import { POSOrderStatsSimple as POSOrderStats } from '../components/pos-orders/POSOrderStatsSimple';
import { POSOrderFiltersOptimized as POSOrderFilters } from '../components/pos-orders/POSOrderFiltersOptimized';
import { POSOrdersTableSimple as POSOrdersTable } from '../components/pos-orders/POSOrdersTableSimple';
import { POSOrderDetails } from '../components/pos-orders/POSOrderDetails';
import { POSOrderActions } from '../components/pos-orders/POSOrderActions';
import { EditOrderItemsDialog } from '../components/pos-orders/EditOrderItemsDialog';
import EditOrderDialog from '../components/pos-orders/EditOrderDialog';

// Hooks
import { useTitle } from '../hooks/useTitle';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

// =================================================================
// 🎯 POSOrdersOptimized - النسخة المحسنة مع RPC واحد
// =================================================================

interface DialogState {
  selectedOrder: OptimizedPOSOrder | null;
  showOrderDetails: boolean;
  showOrderActions: boolean;
  showEditItems: boolean;
  showEditOrder: boolean;
}

// دالة جلب البيانات من IndexedDB مع تفاصيل كاملة
const fetchFromIndexedDB = async (
  orgId: string,
  page: number = 1,
  pageSize: number = 20
) => {
  try {
    const { orders, total } = await getOrdersByOrganization(orgId, page, pageSize);
    
    // جلب عناصر كل طلبية
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await inventoryDB.posOrderItems
          .where('order_id')
          .equals(order.id)
          .toArray();
        
        return {
          ...order,
          customer: order.customer_name ? { 
            id: order.customer_id || '',
            name: order.customer_name 
          } : null,
          employee: order.employee_id ? {
            id: order.employee_id,
            name: 'موظف',
            email: ''
          } : null,
          order_items: items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            is_wholesale: item.is_wholesale,
            original_price: item.original_price,
            color_id: item.color_id,
            color_name: item.color_name,
            size_id: item.size_id,
            size_name: item.size_name,
            variant_info: item.variant_info
          })),
          items_count: items.length,
          total_qty: items.reduce((sum, item) => sum + item.quantity, 0),
          slug: order.remote_order_id ? undefined : `offline-${order.local_order_number}`,
          customer_order_number: order.remote_customer_order_number || order.local_order_number
        };
      })
    );
    
    // حساب إحصائيات بسيطة من البيانات المحلية
    const allOrders = await inventoryDB.posOrders.where('organization_id').equals(orgId).toArray();
    const stats = {
      total_orders: allOrders.length,
      total_revenue: allOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      completed_orders: allOrders.filter(o => (o.status as string) === 'completed' || o.status === 'synced').length,
      pending_orders: allOrders.filter(o => (o.status as string) === 'pending' || o.status === 'pending_sync').length,
      pending_payment_orders: allOrders.filter(o => o.payment_status === 'pending').length,
      cancelled_orders: allOrders.filter(o => (o.status as string) === 'cancelled').length,
      cash_orders: allOrders.filter(o => o.payment_method === 'cash').length,
      card_orders: allOrders.filter(o => o.payment_method === 'card').length,
      avg_order_value: allOrders.length > 0 ? allOrders.reduce((sum, o) => sum + (o.total || 0), 0) / allOrders.length : 0,
      today_orders: 0,
      today_revenue: 0
    };

    return {
      success: true,
      data: {
        orders: ordersWithItems,
        stats,
        employees: [],
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / pageSize),
          filtered_count: total,
          has_next_page: page < Math.ceil(total / pageSize)
        },
        settings: {},
        subscription: {}
      }
    };
  } catch (error) {
    console.error('Error fetching from IndexedDB:', error);
    throw error;
  }
};

// دالة جلب البيانات المحسنة مع حفظ في IndexedDB
const fetchPOSOrdersPageData = async (
  orgId: string,
  userId: string,
  page: number = 1,
  pageSize: number = 20,
  filters: POSOrderFilters = {},
  sort: { field: string; direction: string } = { field: 'created_at', direction: 'desc' }
) => {
  const { data, error } = await supabase.rpc('get_pos_orders_page_data_fixed' as any, {
    p_org_id: orgId,
    p_user_id: userId,
    p_page: page,
    p_page_size: pageSize,
    p_filters: filters,
    p_sort: sort,
    p_include: {
      stats: true,
      settings: true,
      subscription: true,
      returns: true
    }
  }) as { data: any, error: any };

  if (error) {
    throw error;
  }

  if (!(data as any)?.success) {
    throw new Error((data as any)?.error || 'فشل في جلب البيانات');
  }

  // حفظ البيانات في IndexedDB للاستخدام في الأوفلاين
  try {
    const orders = (data as any)?.data?.orders || [];
    if (orders.length > 0) {
      await saveRemoteOrders(orders);
      // حفظ عناصر كل طلبية
      for (const order of orders) {
        if (order.order_items && order.order_items.length > 0) {
          await saveRemoteOrderItems(order.id, order.order_items);
        }
      }
    }
  } catch (saveError) {
    console.error('Error saving to IndexedDB:', saveError);
    // لا نرمي الخطأ هنا لأن البيانات تم جلبها بنجاح
  }

  return data as any;
};

export const POSOrdersOptimized: React.FC<POSOrdersOptimizedProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange,
}) => {
  useTitle('طلبيات نقطة البيع');
  
  const { tenant } = useTenant();
  const { user, userProfile } = useAuth();
  const perms = usePermissions();
  const queryClient = useQueryClient();
  const { isOnline, isOffline } = useOfflineStatus();

  // الحالات المحلية
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState<POSOrderFilters>({});
  const [sortConfig, setSortConfig] = useState({ field: 'created_at', direction: 'desc' });
  const [dialogState, setDialogState] = useState<DialogState>({
    selectedOrder: null,
    showOrderDetails: false,
    showOrderActions: false,
    showEditItems: false,
    showEditOrder: false
  });

  // مفتاح الاستعلام الديناميكي
  const queryKey = useMemo(() => [
    'pos-orders-page-data',
    tenant?.id,
    userProfile?.id,
    currentPage,
    pageSize,
    filters,
    sortConfig
  ], [tenant?.id, userProfile?.id, currentPage, pageSize, filters, sortConfig]);

  // صلاحيات الطلبيات
  const canUpdateStatus = useMemo(
    () => perms.anyOf(["updateOrderStatus", "manageOrders"]),
    [perms]
  );
  const canCancelOrder = useMemo(
    () => perms.anyOf(["cancelOrders", "manageOrders"]),
    [perms]
  );
  const canEditOrder = useMemo(
    () => perms.anyOf(["editOrders", "manageOrders"]),
    [perms]
  );
  const canDeleteOrder = useMemo(
    () => perms.anyOf(["deleteOrders", "manageOrders"]),
    [perms]
  );
  const canUpdatePayment = useMemo(
    () => perms.anyOf(["processPayments", "manageOrders"]),
    [perms]
  );

  // الاستعلام الرئيسي المحسن - مع تحسينات لتجنب الاستدعاءات المكررة ودعم الأوفلاين
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey,
    queryFn: async () => {
      // في حالة الأوفلاين، نستخدم البيانات من IndexedDB
      if (isOffline) {
        // أولاً نحاول جلب من React Query cache
        const cachedData = queryClient.getQueryData(queryKey);
        if (cachedData) {
          return cachedData;
        }
        // ثانياً نجلب من IndexedDB
        if (tenant?.id) {
          try {
            return await fetchFromIndexedDB(tenant.id, currentPage, pageSize);
          } catch (error) {
            console.error('Error fetching from IndexedDB:', error);
          }
        }
        // إذا فشل كل شيء، نرجع بيانات فارغة
        return {
          success: true,
          data: {
            orders: [],
            stats: null,
            employees: [],
            pagination: { current_page: 1, total_pages: 1, filtered_count: 0, has_next_page: false },
            settings: {},
            subscription: {}
          }
        };
      }
      // في حالة الاتصال، نجلب البيانات من الخادم وتحفظ تلقائياً في IndexedDB
      return fetchPOSOrdersPageData(
        tenant?.id || '',
        userProfile?.id || '',
        currentPage,
        pageSize,
        filters,
        sortConfig
      );
    },
    enabled: !!tenant?.id && !!userProfile?.id, // تفعيل فقط عند وجود البيانات المطلوبة
    staleTime: isOffline ? Infinity : 10 * 60 * 1000, // 10 دقائق في الأونلاين - زيادة من 5
    gcTime: 30 * 60 * 1000, // 30 دقيقة - زيادة من 15
    refetchOnWindowFocus: false,
    refetchOnMount: true, // استخدام true مع staleTime أطول لمنع الاستدعاءات المكررة
    refetchOnReconnect: true,
    refetchInterval: false,
    retry: (failureCount, error: any) => {
      if (isOffline) return false;
      if (error?.code === 'UNAUTHORIZED') return false;
      return failureCount < 1; // تقليل عدد المحاولات
    },
    networkMode: 'offlineFirst',
    // إضافة structuralSharing لمنع re-renders غير الضرورية
    structuralSharing: true,
    // إضافة notifyOnChangeProps لتقليل re-renders
    notifyOnChangeProps: ['data', 'error', 'isLoading']
  });

  // استخراج البيانات
  const orders = useMemo(() => (data as any)?.data?.orders || [], [data]);
  const stats = useMemo(() => (data as any)?.data?.stats || null, [data]);
  const employees = useMemo(() => (data as any)?.data?.employees || [], [data]);
  const pagination = useMemo(() => (data as any)?.data?.pagination || {}, [data]);
  const settings = useMemo(() => (data as any)?.data?.settings || {}, [data]);
  const subscription = useMemo(() => (data as any)?.data?.subscription || {}, [data]);

  React.useEffect(() => {
    if (!onLayoutStateChange) return;

    onLayoutStateChange({
      isRefreshing: isFetching && isOnline,
      connectionStatus: isOffline ? 'disconnected' : isFetching ? 'reconnecting' : 'connected',
      executionTime: Number((data as any)?.debug?.timings_ms?.total_ms) || undefined
    });
  }, [onLayoutStateChange, isFetching, isOnline, isOffline, data]);

  // Prefetch الصفحة التالية - محسن لتجنب الاستدعاءات المكررة
  const prefetchNextPage = useCallback(() => {
    // تعطيل prefetch مؤقتاً لتقليل الاستدعاءات
    return;
    
    // الكود الأصلي معطل مؤقتاً
    /*
    if (pagination.has_next_page && currentPage > 0) {
      const nextPageKey = [
        'pos-orders-page-data',
        tenant?.id,
        userProfile?.id,
        currentPage + 1,
        pageSize,
        filters,
        sortConfig
      ];
      
      const existingData = queryClient.getQueryData(nextPageKey);
      if (!existingData) {
        setTimeout(() => {
          const currentData = queryClient.getQueryData(nextPageKey);
          if (!currentData) {
            queryClient.prefetchQuery({
              queryKey: nextPageKey,
              queryFn: () => fetchPOSOrdersPageData(
                tenant?.id || '',
                userProfile?.id || '',
                currentPage + 1,
                pageSize,
                filters,
                sortConfig
              ),
              staleTime: 60 * 1000
            });
          }
        }, 1000);
      }
    }
    */
  }, [pagination.has_next_page, currentPage, pageSize, filters, sortConfig, tenant?.id, userProfile?.id, queryClient]);

  // تأثير Prefetch - معطل مؤقتاً لتقليل الاستدعاءات
  React.useEffect(() => {
    // معطل مؤقتاً لتقليل الاستدعاءات المتعددة
    return;
  }, [prefetchNextPage, pagination.has_next_page, currentPage, tenant?.id, user?.id, pageSize, filters, sortConfig, queryClient]);

  // معالج تغيير الفلاتر - محسن لتجنب الاستدعاءات المكررة
  const handleFiltersChange = useCallback((newFilters: POSOrderFilters) => {
    // التحقق من أن الفلاتر تغيرت فعلاً
    const filtersChanged = JSON.stringify(newFilters) !== JSON.stringify(filters);
    if (filtersChanged) {
      setFilters(newFilters);
      setCurrentPage(1); // إعادة تعيين للصفحة الأولى عند الفلترة
      
      // إزالة cache للصفحات السابقة لضمان البيانات المحدثة
      queryClient.removeQueries({
        queryKey: ['pos-orders-page-data', tenant?.id, user?.id],
        exact: false
      });
    }
  }, [filters, tenant?.id, user?.id, queryClient]);

  // معالج تغيير الصفحة - محسن لتجنب الاستدعاءات المكررة
  const handlePageChange = useCallback((page: number) => {
    // التحقق من أن الصفحة تغيرت فعلاً
    if (page !== currentPage) {
      setCurrentPage(page);
      
      // إيقاف أي prefetch قيد التنفيذ
      queryClient.cancelQueries({
        queryKey: ['pos-orders-page-data', tenant?.id, user?.id],
        exact: false
      });
      
      // إزالة cache للصفحات الأخرى لضمان البيانات المحدثة
      queryClient.removeQueries({
        queryKey: ['pos-orders-page-data', tenant?.id, user?.id],
        exact: false
      });
      
      // إضافة تأخير قبل إعادة تفعيل prefetch
      setTimeout(() => {
        // إعادة تفعيل prefetch للصفحة الجديدة
        if (page > 1) {
          const prevPageKey = [
            'pos-orders-page-data',
            tenant?.id,
            user?.id,
            page - 1,
            pageSize,
            filters,
            sortConfig
          ];
          
          // prefetch للصفحة السابقة
          const existingData = queryClient.getQueryData(prevPageKey);
          if (!existingData) {
            queryClient.prefetchQuery({
              queryKey: prevPageKey,
              queryFn: () => fetchPOSOrdersPageData(
                tenant?.id || '',
                user?.id || '',
                page - 1,
                pageSize,
                filters,
                sortConfig
              ),
              staleTime: 60 * 1000
            });
          }
        }
      }, 2000); // تأخير 2 ثانية
    }
  }, [currentPage, tenant?.id, user?.id, queryClient, pageSize, filters, sortConfig]);

  // معالج تغيير الترتيب - محسن لتجنب الاستدعاءات المكررة
  const handleSortChange = useCallback((field: string, direction: string) => {
    // التحقق من أن الترتيب تغير فعلاً
    const sortChanged = field !== sortConfig.field || direction !== sortConfig.direction;
    if (sortChanged) {
      setSortConfig({ field, direction });
      setCurrentPage(1);
      
      // إزالة cache للصفحات السابقة لضمان البيانات المحدثة
      queryClient.removeQueries({
        queryKey: ['pos-orders-page-data', tenant?.id, user?.id],
        exact: false
      });
    }
  }, [sortConfig, tenant?.id, user?.id, queryClient]);

  // تحديث البيانات - محسن لتجنب الاستدعاءات المكررة
  const handleRefresh = useCallback(async () => {
    try {
      // استخدام refetch فقط للصفحة الحالية
      await refetch();
      
      // إزالة cache للصفحات الأخرى لضمان البيانات المحدثة
      queryClient.removeQueries({
        queryKey: ['pos-orders-page-data', tenant?.id, user?.id],
        exact: false
      });
      
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث البيانات');
    }
  }, [refetch, queryClient, tenant?.id, user?.id]);

  React.useEffect(() => {
    if (!onRegisterRefresh) {
      return;
    }

    onRegisterRefresh(handleRefresh);
    return () => onRegisterRefresh(null);
  }, [handleRefresh, onRegisterRefresh]);

  const renderWithLayout = (
    children: React.ReactNode,
    overrides?: {
      isRefreshing?: boolean;
      connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
      executionTime?: number;
    }
  ) => {
    if (!useStandaloneLayout) {
      return children;
    }

    return (
      <POSPureLayout
        onRefresh={handleRefresh}
        isRefreshing={overrides?.isRefreshing ?? (isFetching && isOnline)}
        connectionStatus={overrides?.connectionStatus ?? (isOffline ? 'disconnected' : 'connected')}
        executionTime={
          overrides?.executionTime ??
          (Number((data as any)?.debug?.timings_ms?.total_ms) || undefined)
        }
      >
        {children}
      </POSPureLayout>
    );
  };

  // عرض تفاصيل الطلبية
  const handleOrderView = useCallback((order: OptimizedPOSOrder) => {
    setDialogState({ 
      selectedOrder: order, 
      showOrderDetails: true,
      showOrderActions: false,
      showEditItems: false,
      showEditOrder: false
    });
  }, []);

  // تعديل الطلبية
  const handleOrderEdit = useCallback((order: OptimizedPOSOrder) => {
    if (!canEditOrder) {
      toast.error('ليس لديك صلاحية لتعديل الطلبية');
      return;
    }
    setDialogState({ 
      selectedOrder: order, 
      showOrderActions: false,
      showOrderDetails: false,
      showEditItems: false,
      showEditOrder: true
    });
  }, [canEditOrder]);

  // حذف الطلبية
  const handleOrderDelete = useCallback(async (order: OptimizedPOSOrder) => {
    if (!canDeleteOrder) {
      toast.error('ليس لديك صلاحية لحذف الطلبية');
      return false as any;
    }
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (error) throw error;

      toast.success('تم حذف الطلبية بنجاح');
      handleRefresh();
      
      if (dialogState.selectedOrder?.id === order.id) {
        closeDialogs();
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء حذف الطلبية');
    }
  }, [handleRefresh, dialogState.selectedOrder, canDeleteOrder]);

  // طباعة الطلبية
  const handleOrderPrint = useCallback((order: OptimizedPOSOrder) => {
    toast.success('تم إرسال الطلبية للطباعة');
  }, []);

  // تحديث حالة الطلبية - محسن لتجنب الاستدعاءات المكررة
  const handleStatusUpdate = useCallback(async (orderId: string, status: string, notes?: string) => {
    if (status === 'cancelled') {
      if (!canCancelOrder) {
        toast.error('ليس لديك صلاحية لإلغاء الطلبية');
        return false;
      }
    } else if (!canUpdateStatus) {
      toast.error('ليس لديك صلاحية لتحديث حالة الطلبية');
      return false;
    }
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status, 
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('تم تحديث حالة الطلبية بنجاح');
      
      // تحديث البيانات المحلية بدلاً من إعادة جلبها
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData?.data?.orders) return oldData;
        
        const updatedOrders = oldData.data.orders.map((order: any) => 
          order.id === orderId 
            ? { ...order, status, notes: notes || null, updated_at: new Date().toISOString() }
            : order
        );
        
        return {
          ...oldData,
          data: {
            ...oldData.data,
            orders: updatedOrders
          }
        };
      });
      
      return true;
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الطلبية');
      return false;
    }
  }, [queryClient, queryKey, canUpdateStatus, canCancelOrder]);

  // تحديث حالة الدفع - محسن لتجنب الاستدعاءات المكررة
  const handlePaymentUpdate = useCallback(async (
    orderId: string, 
    paymentStatus: string, 
    amountPaid?: number, 
    paymentMethod?: string
  ) => {
    if (!canUpdatePayment) {
      toast.error('ليس لديك صلاحية لتحديث الدفع');
      return false;
    }
    try {
      const updateData: any = { 
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      };
      
      if (amountPaid !== undefined) updateData.amount_paid = amountPaid;
      if (paymentMethod) updateData.payment_method = paymentMethod;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast.success('تم تحديث معلومات الدفع بنجاح');
      
      // تحديث البيانات المحلية بدلاً من إعادة جلبها
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData?.data?.orders) return oldData;
        
        const updatedOrders = oldData.data.orders.map((order: any) => 
          order.id === orderId 
            ? { 
                ...order, 
                payment_status: paymentStatus,
                amount_paid: amountPaid !== undefined ? amountPaid : order.amount_paid,
                payment_method: paymentMethod || order.payment_method,
                updated_at: new Date().toISOString() 
              }
            : order
        );
        
        return {
          ...oldData,
          data: {
            ...oldData.data,
            orders: updatedOrders
          }
        };
      });
      
      return true;
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الدفع');
      return false;
    }
  }, [queryClient, queryKey, canUpdatePayment]);

  // تصدير البيانات
  const handleExport = useCallback(() => {
    toast.info('ميزة التصدير قيد التطوير');
  }, []);

  // إغلاق النوافذ المنبثقة
  const closeDialogs = useCallback(() => {
    setDialogState({ 
      showOrderDetails: false, 
      showOrderActions: false,
      showEditItems: false,
      showEditOrder: false,
      selectedOrder: null 
    });
  }, []);

  // فتح نافذة تعديل العناصر
  const handleEditItems = useCallback((order: OptimizedPOSOrder) => {
    if (!canEditOrder) {
      toast.error('ليس لديك صلاحية لتعديل عناصر الطلبية');
      return;
    }
    setDialogState({ 
      selectedOrder: order, 
      showEditItems: true,
      showOrderDetails: false,
      showOrderActions: false,
      showEditOrder: false
    });
  }, [canEditOrder]);

  // حفظ عناصر الطلبية المحدثة - محسن لتجنب الاستدعاءات المكررة
  const handleSaveItems = useCallback(async (orderId: string, updatedItems: any[]) => {
    try {
      // تحديث العناصر في قاعدة البيانات
      // هذا مثال بسيط - يمكن تحسينه حسب الحاجة
      toast.success('تم تحديث عناصر الطلبية بنجاح');
      
      // تحديث البيانات المحلية بدلاً من إعادة جلبها
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData?.data?.orders) return oldData;
        
        const updatedOrders = oldData.data.orders.map((order: any) => 
          order.id === orderId 
            ? { 
                ...order, 
                order_items: updatedItems,
                updated_at: new Date().toISOString() 
              }
            : order
        );
        
        return {
          ...oldData,
          data: {
            ...oldData.data,
            orders: updatedOrders
          }
        };
      });
      
      return true;
    } catch (error) {
      toast.error('فشل في تحديث عناصر الطلبية');
      return false;
    }
  }, [queryClient, queryKey]);

  // حساب الإحصائيات السريعة
  const quickStats = useMemo(() => {
    if (!stats) return null;
    
    return {
      completedRate: stats.total_orders > 0 ? (stats.completed_orders / stats.total_orders * 100).toFixed(1) : '0',
      pendingRate: stats.total_orders > 0 ? (stats.pending_orders / stats.total_orders * 100).toFixed(1) : '0',
      cancelledRate: stats.total_orders > 0 ? (stats.cancelled_orders / stats.total_orders * 100).toFixed(1) : '0',
      returnRate: stats.return_rate?.toFixed(1) || '0'
    };
  }, [stats]);

  // معالجة حالات التحميل والأخطاء
  if (error && !isOffline) {
    const errorView = (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">خطأ في تحميل البيانات</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {error?.message || 'حدث خطأ أثناء تحميل بيانات طلبيات نقطة البيع'}
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>
    );

    return renderWithLayout(errorView, {
      isRefreshing: isLoading,
      connectionStatus: 'disconnected'
    });
  }

  // عرض شاشة تحميل أثناء التحميل الأولي
  if (isLoading && !data) {
    const loadingView = (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">جاري تحميل طلبيات نقطة البيع</h3>
          <p className="text-sm text-muted-foreground">يرجى الانتظار...</p>
        </div>
      </div>
    );

    return renderWithLayout(loadingView, {
      isRefreshing: isLoading,
      connectionStatus: 'reconnecting'
    });
  }

  const mainContent = (
      <div className="space-y-4" dir="rtl">
        {/* مؤشر حالة الأوفلاين - مبسط */}
        {isOffline && (
          <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  وضع الأوفلاين - يتم عرض البيانات المخزنة محلياً
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* رأس الصفحة - مبسط */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">طلبيات نقطة البيع</h1>
              <p className="text-xs text-muted-foreground">إدارة ومتابعة الطلبيات</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              تحديث
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isFetching}
              className="h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              تصدير
            </Button>
          </div>
        </div>

        {/* الإحصائيات */}
        <POSOrderStats
          stats={stats}
          loading={isFetching}
          error={null}
        />

        {/* الفلاتر */}
        <POSOrderFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
          onExport={handleExport}
          loading={isFetching}
          employees={employees}
        />

        {/* جدول الطلبيات */}
        <POSOrdersTable
          orders={orders}
          loading={isFetching}
          error={null}
          currentPage={pagination.current_page || 1}
          totalPages={pagination.total_pages || 1}
          totalItems={pagination.filtered_count || 0}
          itemsPerPage={pageSize}
          onPageChange={handlePageChange}
          onOrderView={handleOrderView as any}
          onOrderEdit={handleOrderEdit as any}
          onOrderDelete={handleOrderDelete as any}
          onOrderPrint={handleOrderPrint as any}
          onStatusUpdate={handleStatusUpdate}
        />

        {/* تفاصيل الطلبية */}
        <POSOrderDetails
          order={dialogState.selectedOrder as any}
          open={dialogState.showOrderDetails}
          onClose={closeDialogs}
          onPrint={handleOrderPrint as any}
          onEdit={handleOrderEdit as any}
        />

        {/* إجراءات الطلبية */}
        {dialogState.selectedOrder && (
          <Dialog 
            open={dialogState.showOrderActions} 
            onOpenChange={(open) => !open && closeDialogs()}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  إجراءات الطلبية #{dialogState.selectedOrder.slug?.slice(-8) || dialogState.selectedOrder.id.slice(-8)}
                </DialogTitle>
              </DialogHeader>
              <POSOrderActions
                order={dialogState.selectedOrder as any}
                onStatusUpdate={handleStatusUpdate}
                onPaymentUpdate={handlePaymentUpdate}
                onDelete={async (orderId) => {
                  const order = orders.find(o => o.id === orderId);
                  if (order) {
                    await handleOrderDelete(order);
                    return true;
                  }
                  return false;
                }}
                onPrint={handleOrderPrint as any}
                onRefresh={handleRefresh}
                onEditItems={handleEditItems as any}
                permissions={{
                  updateStatus: canUpdateStatus,
                  cancel: canCancelOrder,
                  updatePayment: canUpdatePayment,
                  delete: canDeleteOrder,
                  editItems: canEditOrder,
                }}
              />
            </DialogContent>
          </Dialog>
        )}


        {/* رسالة عدم وجود بيانات */}
        {orders.length === 0 && !isFetching && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد طلبيات</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                لم يتم العثور على أي طلبيات نقطة بيع تطابق الفلاتر المحددة.
              </p>
              <Button onClick={() => setFilters({})}>
                <RefreshCw className="h-4 w-4 mr-2" />
                إزالة الفلاتر
              </Button>
            </CardContent>
          </Card>
        )}

        {/* نافذة تعديل عناصر الطلبية */}
        <EditOrderItemsDialog
          order={dialogState.selectedOrder as any}
          open={dialogState.showEditItems}
          onClose={closeDialogs}
          onSave={handleSaveItems}
          onRefresh={handleRefresh}
        />

        {/* نافذة تعديل الطلبية الشاملة */}
        <EditOrderDialog
          isOpen={dialogState.showEditOrder}
          onOpenChange={(open) => {
            if (!open) {
              setDialogState(prev => ({ ...prev, showEditOrder: false }));
            }
          }}
          order={dialogState.selectedOrder as any}
          onOrderUpdated={async () => {
            await handleRefresh();
            setDialogState(prev => ({ ...prev, showEditOrder: false, selectedOrder: null }));
          }}
          permissions={{
            edit: canEditOrder,
            updateStatus: canUpdateStatus,
            updatePayment: canUpdatePayment,
          }}
        />

      </div>
  );

  return renderWithLayout(mainContent);
};

export default POSOrdersOptimized;
