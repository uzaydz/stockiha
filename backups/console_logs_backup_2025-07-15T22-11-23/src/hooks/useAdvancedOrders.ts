import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useToast } from '@/hooks/use-toast';

export interface AdvancedOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  color_name?: string;
  size_name?: string;
}

export interface AdvancedOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  shipping_provider?: string;
  shipping_cost: number;
  call_confirmation_status: string;
  call_confirmation_notes?: string;
  created_at: string;
  updated_at: string;
  items: AdvancedOrderItem[];
  customer_address?: string;
  tracking_id?: string;
  form_data?: any;
}

export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  pending_orders: number;
  status_distribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  top_shipping_providers: Array<{
    provider: string;
    count: number;
    percentage: number;
  }>;
  daily_trend: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

export interface OrderFilters {
  status?: string;
  search_term?: string;
  date_from?: string;
  date_to?: string;
  call_confirmation_status_id?: string;
  shipping_provider?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface UseAdvancedOrdersOptions {
  pageSize?: number;
  enablePolling?: boolean;
  pollingInterval?: number;
}

export interface UseAdvancedOrdersReturn {
  orders: AdvancedOrder[];
  stats: OrderStats | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
  filters: OrderFilters;
  
  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  applyFilters: (newFilters: OrderFilters) => void;
  goToPage: (page: number) => void;
  exportToCSV: () => Promise<void>;
}

export const useAdvancedOrders = (options: UseAdvancedOrdersOptions = {}): UseAdvancedOrdersReturn => {
  const { user } = useAuth();
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  
  const {
    pageSize = 20,
    enablePolling = false,
    pollingInterval = 60000
  } = options;

  // State
  const [orders, setOrders] = useState<AdvancedOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<OrderFilters>({
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // Get organization ID
  const organizationId = currentOrganization?.id;

  // Fetch orders using RPC function
  const fetchOrders = useCallback(async (page: number = 0, newFilters?: OrderFilters) => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const currentFilters = newFilters || filters;
      const offset = page * pageSize;

                   const { data, error } = await supabase.rpc('get_advanced_online_orders' as any, {
        p_organization_id: organizationId,
        p_limit: pageSize,
        p_offset: offset,
        p_status: currentFilters.status || null,
        p_search_term: currentFilters.search_term || null,
        p_date_from: currentFilters.date_from || null,
        p_date_to: currentFilters.date_to || null,
        p_call_confirmation_status_id: currentFilters.call_confirmation_status_id || null,
        p_shipping_provider: currentFilters.shipping_provider || null,
        p_sort_by: currentFilters.sort_by || 'created_at',
        p_sort_order: currentFilters.sort_order || 'desc'
      });

      if (error) {
        console.error('Error fetching orders:', error);
        setError('فشل في جلب الطلبيات');
        return;
      }

             const ordersData = (data as AdvancedOrder[]) || [];
       
       if (page === 0) {
         setOrders(ordersData);
       } else {
         setOrders(prev => [...prev, ...ordersData]);
       }

      setHasMore(ordersData.length === pageSize);
      setCurrentPage(page);
      
      // Update total count (approximate)
      if (page === 0) {
        setTotalCount(ordersData.length < pageSize ? ordersData.length : ordersData.length + 100);
      }

    } catch (err) {
      console.error('Error in fetchOrders:', err);
      setError('حدث خطأ أثناء جلب الطلبيات');
    } finally {
      setLoading(false);
    }
  }, [organizationId, pageSize, filters]);

  // Fetch stats using RPC function
  const fetchStats = useCallback(async () => {
    if (!organizationId) return;

    try {
                   const { data, error } = await supabase.rpc('get_online_orders_stats' as any, {
        p_organization_id: organizationId
      });

       if (error) {
         console.error('Error fetching stats:', error);
         return;
       }

       setStats(data as OrderStats);
    } catch (err) {
      console.error('Error in fetchStats:', err);
    }
  }, [organizationId]);

  // Load more orders
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchOrders(currentPage + 1);
  }, [fetchOrders, hasMore, loading, currentPage]);

  // Refresh orders
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchOrders(0),
      fetchStats()
    ]);
  }, [fetchOrders, fetchStats]);

  // Apply filters
  const applyFilters = useCallback((newFilters: OrderFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(0);
    fetchOrders(0, { ...filters, ...newFilters });
  }, [filters, fetchOrders]);

  // Go to specific page
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    fetchOrders(page);
  }, [fetchOrders]);

  // Export to CSV
  const exportToCSV = useCallback(async () => {
    if (!organizationId) return;

    try {
      toast({
        title: "جاري التصدير...",
        description: "يتم تحضير ملف CSV للتحميل",
      });

             // Fetch all orders for export
       const { data, error } = await supabase.rpc('get_advanced_online_orders' as any, {
         organization_id: organizationId,
         limit: 10000, // Large limit for export
         offset: 0,
         status: filters.status || null,
         search_term: filters.search_term || null,
         date_from: filters.date_from || null,
         date_to: filters.date_to || null,
         call_confirmation_status_id: filters.call_confirmation_status_id || null,
         shipping_provider: filters.shipping_provider || null,
         sort_by: filters.sort_by || 'created_at',
         sort_order: filters.sort_order || 'desc'
       });

       if (error) {
         throw error;
       }

       // Convert to CSV
       const csvContent = convertOrdersToCSV((data as AdvancedOrder[]) || []);
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "تم التصدير بنجاح",
        description: "تم تحميل ملف CSV بنجاح",
      });

    } catch (err) {
      console.error('Error exporting to CSV:', err);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات",
        variant: "destructive",
      });
    }
  }, [organizationId, filters, toast]);

  // Helper function to convert orders to CSV
  const convertOrdersToCSV = (orders: AdvancedOrder[]): string => {
    const headers = [
      'رقم الطلب',
      'اسم العميل',
      'رقم الهاتف',
      'البريد الإلكتروني',
      'المجموع الفرعي',
      'الضريبة',
      'الخصم',
      'الإجمالي',
      'الحالة',
      'طريقة الدفع',
      'حالة الدفع',
      'مزود الشحن',
      'تكلفة الشحن',
      'تأكيد المكالمة',
      'ملاحظات المكالمة',
      'تاريخ الإنشاء',
      'المنتجات'
    ];

    const csvRows = [headers.join(',')];

    orders.forEach(order => {
      const products = order.items.map(item => 
        `${item.product_name} (${item.quantity}x${item.unit_price})`
      ).join('; ');

      const row = [
        order.id,
        `"${order.customer_name}"`,
        order.customer_phone,
        order.customer_email || '',
        order.subtotal,
        order.tax,
        order.discount,
        order.total,
        order.status,
        order.payment_method,
        order.payment_status,
        order.shipping_provider || '',
        order.shipping_cost,
        order.call_confirmation_status,
        `"${order.call_confirmation_notes || ''}"`,
        new Date(order.created_at).toLocaleDateString('ar-SA'),
        `"${products}"`
      ];

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  // Initial load
  useEffect(() => {
    if (organizationId) {
      refresh();
    }
  }, [organizationId, refresh]);

  // Polling for real-time updates
  useEffect(() => {
    if (!enablePolling || !organizationId) return;

    const interval = setInterval(() => {
      fetchStats(); // Only refresh stats to avoid disrupting user interaction
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [enablePolling, organizationId, fetchStats, pollingInterval]);

  return {
    orders,
    stats,
    loading,
    error,
    hasMore,
    currentPage,
    totalCount,
    filters,
    loadMore,
    refresh,
    applyFilters,
    goToPage,
    exportToCSV
  };
}; 