import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { unifiedOrderService } from '@/services/UnifiedOrderService';
import { useLocalOrders } from './useLocalOrders';

// أنواع البيانات المحسنة
export type OptimizedOrder = {
  order_id: string;
  customer_id: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  shipping_address_id: string;
  shipping_method: string;
  shipping_cost: number;
  shipping_option: string;
  notes: string;
  employee_id: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  slug: string;
  customer_order_number: number;
  created_from: string;
  call_confirmation_status_id: number;
  call_confirmation_notes: string;
  call_confirmation_updated_at: string;
  call_confirmation_updated_by: string;
  form_data: any;
  metadata: any;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: any;
  call_confirmation_status: any;
  order_items: any[];
};

export type OrdersFilter = {
  status?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type OrdersStats = {
  order_counts: Record<string, number>;
  order_stats: {
    totalSales: number;
    avgOrderValue: number;
    pendingAmount: number;
    salesTrend: number;
  };
};

export const useOptimizedOrders = () => {
  const { currentOrganization } = useTenant();
  const { toast } = useToast();

  const [orders, setOrders] = useState<OptimizedOrder[]>([]);
  const [stats, setStats] = useState<OrdersStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ⚡ إصلاح Race Condition: تتبع الطلب الحالي لإلغاء الطلبات السابقة
  const fetchRequestIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // ⚡ استخدام الخدمة الموحدة Offline-First
  // 🔧 FIX: Only set organizationId when it's valid (not null/empty)
  useEffect(() => {
    if (currentOrganization?.id) {
      unifiedOrderService.setOrganizationId(currentOrganization.id);
    }
  }, [currentOrganization?.id]);

  // جلب الطلبيات مع التحسين باستخدام استدعاءات منفصلة
  const fetchOrders = useCallback(async (filters: OrdersFilter = {}) => {
    if (!currentOrganization?.id) return;

    // ⚡ إصلاح Race Condition: إنشاء معرف فريد لهذا الطلب
    const currentRequestId = ++fetchRequestIdRef.current;

    try {
      setLoading(true);
      setError(null);

      // ⚡ استخدام الخدمة الموحدة محلياً
      const orderFilters: any = {
        status: filters.status as any,
        from_date: filters.dateFrom,
        to_date: filters.dateTo,
        search: filters.searchTerm,
        is_online: false // طلبات محلية فقط
      };

      const page = filters.offset ? Math.floor(filters.offset / (filters.limit || 15)) + 1 : 1;
      const limit = filters.limit || 15;

      const result = await unifiedOrderService.getOrders(orderFilters, page, limit);

      // ⚡ إصلاح Race Condition: تجاهل النتيجة إذا جاء طلب أحدث
      if (currentRequestId !== fetchRequestIdRef.current || !isMountedRef.current) {
        return;
      }

      if (!result.data?.length) {
        setOrders([]);
        return;
      }

      // تحويل إلى OptimizedOrder format
      const ordersData = result.data.map(order => ({
        order_id: order.id,
        customer_id: order.customer_id || '',
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        status: order.status,
        payment_method: order.payment_method || '',
        payment_status: order.payment_status,
        shipping_address_id: order.shipping_address_id || '',
        shipping_method: order.shipping_method || '',
        shipping_cost: order.shipping_cost,
        shipping_option: '',
        notes: order.notes || '',
        employee_id: order.employee_id || '',
        created_at: order.created_at || '',
        updated_at: order.updated_at || '',
        organization_id: order.organization_id,
        slug: order.slug || '',
        customer_order_number: parseInt(order.customer_order_number || '0'),
        created_from: '',
        call_confirmation_status_id: 0,
        call_confirmation_notes: '',
        call_confirmation_updated_at: '',
        call_confirmation_updated_by: '',
        form_data: null,
        metadata: null,
        customer_name: order.customer?.name || '',
        customer_email: '',
        customer_phone: order.customer?.phone || '',
        shipping_address: null,
        call_confirmation_status: null,
        order_items: order.items || []
      }));

      // ⚡ إصلاح Race Condition: تجاهل النتيجة إذا جاء طلب أحدث
      if (currentRequestId !== fetchRequestIdRef.current || !isMountedRef.current) {
        return;
      }

      setOrders(ordersData);
          : Promise.resolve({ data: [] }),
        
        addressIds.length > 0
          ? supabase.from('addresses').select('*').in('id', addressIds)
          : Promise.resolve({ data: [] }),
        
        statusIds.length > 0
          ? supabase.from('call_confirmation_statuses').select('*').in('id', statusIds)
          : Promise.resolve({ data: [] }),
        
        supabase
          .from('online_order_items')
          .select('*')
      setOrders(ordersData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في جلب الطلبيات';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "خطأ في جلب الطلبيات",
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, toast]);

  // جلب إحصائيات الطلبيات
  const fetchStats = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      // جلب عدد الطلبيات حسب الحالة
      const { data: statusCounts, error: statusError } = await supabase
        .from('online_orders')
        .select('status')
        .eq('organization_id', currentOrganization.id);

      if (statusError) throw statusError;

      // حساب الإحصائيات
      const { data: orderStats, error: statsError } = await supabase
        .from('online_orders')
        .select('total, status, created_at')
        .eq('organization_id', currentOrganization.id);

      if (statsError) throw statsError;

      if (statusCounts && orderStats) {
        // حساب عدد الطلبيات حسب الحالة
        const counts = statusCounts.reduce((acc: any, order: any) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {});
        counts.all = statusCounts.length;

        // حساب إحصائيات المبيعات
        const totalSales = orderStats.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
        const avgOrderValue = orderStats.length ? totalSales / orderStats.length : 0;
        const pendingAmount = orderStats
          .filter(order => order.status === 'pending')
          .reduce((sum, order) => sum + (Number(order.total) || 0), 0);

        setStats({
          order_counts: counts,
          order_stats: {
            totalSales,
            avgOrderValue,
            pendingAmount,
            salesTrend: 0
          }
        });
      }
    } catch (err) {
    }
  }, [currentOrganization?.id]);

  // تحديث حالة تأكيد الإتصال
  const updateCallConfirmation = useCallback(async (
    orderId: string,
    statusId: number,
    notes?: string,
    userId?: string
  ) => {
    if (!currentOrganization?.id) return;

    try {
      const { error } = await supabase
        .from('online_orders')
        .update({
          call_confirmation_status_id: statusId,
          call_confirmation_notes: notes,
          call_confirmation_updated_at: new Date().toISOString(),
          call_confirmation_updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      // تحديث الطلب محلياً
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.order_id === orderId 
            ? {
                ...order,
                call_confirmation_status_id: statusId,
                call_confirmation_notes: notes || order.call_confirmation_notes,
                call_confirmation_updated_at: new Date().toISOString(),
                call_confirmation_updated_by: userId || order.call_confirmation_updated_by,
                updated_at: new Date().toISOString()
              }
            : order
        )
      );

      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة تأكيد الإتصال بنجاح"
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في تحديث حالة تأكيد الإتصال';
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: errorMessage
      });
      throw err;
    }
  }, [currentOrganization?.id, toast]);

  // تحديث حالة الطلبيات المتعددة
  const bulkUpdateOrderStatus = useCallback(async (
    orderIds: string[],
    newStatus: string,
    userId?: string
  ) => {
    if (!currentOrganization?.id || orderIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('online_orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(userId && { employee_id: userId })
        })
        .in('id', orderIds)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      // تحديث الطلبيات محلياً
      setOrders(prevOrders => 
        prevOrders.map(order => 
          orderIds.includes(order.order_id) 
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      );

      toast({
        title: "تم التحديث",
        description: `تم تحديث ${orderIds.length} طلب بنجاح`
      });

      // إعادة جلب الإحصائيات
      fetchStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في تحديث حالة الطلبيات';
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: errorMessage
      });
      throw err;
    }
  }, [currentOrganization?.id, toast, fetchStats]);

  // تحديث حالة طلب واحد
  const updateOrderStatus = useCallback(async (
    orderId: string,
    newStatus: string,
    userId?: string
  ) => {
    return bulkUpdateOrderStatus([orderId], newStatus, userId);
  }, [bulkUpdateOrderStatus]);

  // إحصائيات محسوبة محلياً كنسخة احتياطية
  const computedStats = useMemo(() => {
    if (!orders.length) return null;

    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const avgOrderValue = orders.length ? totalSales / orders.length : 0;
    const pendingAmount = orders
      .filter(order => order.status === 'pending')
      .reduce((sum, order) => sum + (order.total || 0), 0);

    return {
      order_counts: { all: orders.length, ...statusCounts },
      order_stats: {
        totalSales,
        avgOrderValue,
        pendingAmount,
        salesTrend: 0
      }
    };
  }, [orders]);

  // جلب البيانات عند تحميل المكون
  useEffect(() => {
    // ⚡ إصلاح Race Condition: تتبع حالة التثبيت
    isMountedRef.current = true;

    if (currentOrganization?.id) {
      fetchOrders();
      fetchStats();
    }

    // ⚡ تنظيف عند إلغاء التثبيت
    return () => {
      isMountedRef.current = false;
    };
  }, [currentOrganization?.id, fetchOrders, fetchStats]);

  return {
    orders,
    stats: stats || computedStats,
    loading,
    error,
    fetchOrders,
    fetchStats,
    updateCallConfirmation,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    refresh: () => {
      fetchOrders();
      fetchStats();
    }
  };
};
