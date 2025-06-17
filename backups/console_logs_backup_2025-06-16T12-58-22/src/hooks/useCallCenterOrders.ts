import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { CallCenterOrder, OrderPriority, CallOutcome } from '../types/callCenter';

interface OrderFilters {
  status?: string[];
  priority?: OrderPriority[];
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  assignedToMe?: boolean;
}

interface UseCallCenterOrdersReturn {
  // بيانات الطلبيات
  orders: CallCenterOrder[];
  totalCount: number;
  
  // حالات التحميل والأخطاء
  loading: boolean;
  error: string | null;
  
  // التصفية والبحث
  filters: OrderFilters;
  setFilters: (filters: OrderFilters) => void;
  
  // العمليات
  assignOrderToAgent: (orderId: string, agentId: string, priority?: OrderPriority) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: string) => Promise<boolean>;
  recordCallAttempt: (orderId: string, outcome: CallOutcome, notes?: string) => Promise<boolean>;
  scheduleCallback: (orderId: string, scheduledTime: Date, notes?: string) => Promise<boolean>;
  
  // تحديث البيانات
  refreshOrders: () => Promise<void>;
  loadMore: () => Promise<void>;
  
  // إحصائيات سريعة
  stats: {
    assigned: number;
    pending: number;
    completed: number;
    highPriority: number;
  };
}

export const useCallCenterOrders = (agentId?: string): UseCallCenterOrdersReturn => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CallCenterOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [stats, setStats] = useState({
    assigned: 0,
    pending: 0,
    completed: 0,
    highPriority: 0
  });

  const PAGE_SIZE = 20;

  // بناء استعلام الطلبيات
  const buildOrdersQuery = useCallback(() => {
    let query = supabase
      .from('online_orders')
      .select(`
        id,
        customer_order_number,
        status,
        form_data,
        total,
        created_at,
        updated_at,
        call_confirmation_status_id,
        call_confirmation_notes,
        call_confirmation_statuses(id, name, color, icon)
      `, { count: 'exact' });

    // تصفية حسب الحالة
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    // البحث النصي
    if (filters.search) {
      query = query.or(`
        customer_order_number.ilike.%${filters.search}%,
        form_data->>customer_name.ilike.%${filters.search}%,
        form_data->>customer_phone.ilike.%${filters.search}%
      `);
    }

    // تصفية حسب التاريخ
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString());
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString());
    }

    return query;
  }, [filters]);

  // جلب الطلبيات
  const fetchOrders = async (page = 0, append = false) => {
    try {
      if (!append) {
        setLoading(true);
        setError(null);
      }

      const query = buildOrdersQuery()
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      // تحويل البيانات إلى النوع المطلوب
      const transformedOrders: CallCenterOrder[] = (data || []).map(order => ({
        id: order.id,
        customer_order_number: order.customer_order_number,
        assigned_agent_id: agentId,
        agent_priority: 'medium' as OrderPriority,
        call_attempts: 0,
        status: order.status,
        call_confirmation_status_id: order.call_confirmation_status_id,
        call_confirmation_notes: order.call_confirmation_notes,
        form_data: order.form_data as any,
        total: order.total,
        created_at: new Date(order.created_at),
        updated_at: new Date(order.updated_at)
      }));

      if (append) {
        setOrders(prev => [...prev, ...transformedOrders]);
      } else {
        setOrders(transformedOrders);
      }

      setTotalCount(count || 0);
      setCurrentPage(page);

    } catch (err) {
      console.error('خطأ في جلب الطلبيات:', err);
      setError('فشل في جلب الطلبيات');
    } finally {
      setLoading(false);
    }
  };

  // جلب الإحصائيات
  const fetchStats = async () => {
    try {
      const baseQuery = supabase.from('online_orders').select('*', { count: 'exact', head: true });

      const [assignedResult, pendingResult, completedResult, highPriorityResult] = await Promise.all([
        baseQuery.not('id', 'is', null),
        baseQuery.in('status', ['pending', 'processing']),
        baseQuery.eq('status', 'delivered'),
        baseQuery.not('id', 'is', null)
      ]);

      setStats({
        assigned: assignedResult.count || 0,
        pending: pendingResult.count || 0,
        completed: completedResult.count || 0,
        highPriority: highPriorityResult.count || 0
      });
    } catch (err) {
      console.error('خطأ في جلب الإحصائيات:', err);
    }
  };

  // تخصيص طلب لموظف
  const assignOrderToAgent = async (
    orderId: string, 
    targetAgentId: string, 
    priority: OrderPriority = 'medium'
  ): Promise<boolean> => {
    try {
      // سيتم تنفيذ هذا لاحقاً عند إضافة الأعمدة المطلوبة
      console.log('تخصيص الطلب:', { orderId, targetAgentId, priority });
      return true;
    } catch (err) {
      console.error('خطأ في تخصيص الطلب:', err);
      setError('فشل في تخصيص الطلب');
      return false;
    }
  };

  // تحديث حالة الطلب
  const updateOrderStatus = async (orderId: string, status: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('online_orders')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // تحديث الطلب في القائمة المحلية
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status, updated_at: new Date() }
          : order
      ));

      await fetchStats();
      return true;
    } catch (err) {
      console.error('خطأ في تحديث حالة الطلب:', err);
      setError('فشل في تحديث حالة الطلب');
      return false;
    }
  };

  // تسجيل محاولة مكالمة
  const recordCallAttempt = async (
    orderId: string, 
    outcome: CallOutcome, 
    notes?: string
  ): Promise<boolean> => {
    try {
      // سيتم تنفيذ هذا لاحقاً
      console.log('تسجيل محاولة مكالمة:', { orderId, outcome, notes });
      return true;
    } catch (err) {
      console.error('خطأ في تسجيل محاولة المكالمة:', err);
      setError('فشل في تسجيل محاولة المكالمة');
      return false;
    }
  };

  // جدولة مكالمة لاحقة
  const scheduleCallback = async (
    orderId: string, 
    scheduledTime: Date, 
    notes?: string
  ): Promise<boolean> => {
    try {
      // سيتم تنفيذ هذا لاحقاً
      console.log('جدولة مكالمة:', { orderId, scheduledTime, notes });
      return true;
    } catch (err) {
      console.error('خطأ في جدولة المكالمة:', err);
      setError('فشل في جدولة المكالمة');
      return false;
    }
  };

  // تحديث البيانات
  const refreshOrders = async (): Promise<void> => {
    setCurrentPage(0);
    await Promise.all([
      fetchOrders(0, false),
      fetchStats()
    ]);
  };

  // تحميل المزيد
  const loadMore = async (): Promise<void> => {
    const nextPage = currentPage + 1;
    await fetchOrders(nextPage, true);
  };

  // تحميل البيانات عند تغيير المرشحات
  useEffect(() => {
    refreshOrders();
  }, [filters, agentId]);

  // تحميل الإحصائيات عند التحميل الأول
  useEffect(() => {
    fetchStats();
  }, [agentId]);

  return {
    orders,
    totalCount,
    loading,
    error,
    filters,
    setFilters,
    assignOrderToAgent,
    updateOrderStatus,
    recordCallAttempt,
    scheduleCallback,
    refreshOrders,
    loadMore,
    stats
  };
}; 