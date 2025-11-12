/**
 * Hook متقدم للتحليلات
 * يجلب البيانات من Supabase مع RLS تلقائي
 * يدعم Permissions - كل مسؤول يرى بياناته فقط
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenant } from '@/context/TenantContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase-unified';
import {
  calculateFinancialMetrics,
  calculateProductMetrics,
  calculateCategoryMetrics,
  calculateCustomerMetrics,
  calculateEmployeeMetrics,
  calculateTimeSeriesData,
  calculateChannelMetrics,
  calculatePaymentMethodMetrics,
  filterByOrganization,
  filterByDateRange,
  type Order,
  type Product,
  type Expense,
  type FinancialMetrics,
  type ProductMetrics,
  type CategoryMetrics,
  type CustomerMetrics,
  type EmployeeMetrics,
  type TimeSeriesData,
  type ChannelMetrics,
  type PaymentMethodMetrics
} from '@/lib/analytics/metrics';

// ============================================================================
// Types
// ============================================================================

export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  dateRange?: DateRange;
  channel?: 'pos' | 'online' | 'all';
  employeeId?: string;
  customerId?: string;
  categoryId?: string;
  paymentMethod?: string;
}

export interface AnalyticsData {
  // مقاييس مالية
  financial: FinancialMetrics;

  // مقاييس المنتجات
  products: ProductMetrics[];
  topProducts: ProductMetrics[];

  // مقاييس الفئات
  categories: CategoryMetrics[];

  // مقاييس العملاء
  customers: CustomerMetrics[];
  topCustomers: CustomerMetrics[];

  // مقاييس الموظفين
  employees: EmployeeMetrics[];

  // بيانات زمنية
  timeSeries: TimeSeriesData[];

  // مقاييس القنوات
  channels: ChannelMetrics[];

  // مقاييس طرق الدفع
  paymentMethods: PaymentMethodMetrics[];

  // معلومات إضافية
  metadata: {
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    totalEmployees: number;
    period: AnalyticsPeriod;
    dateRange: DateRange;
    lastUpdated: Date;
  };
}

export interface UseAnalyticsResult {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  filters: AnalyticsFilters;
  setFilters: (filters: AnalyticsFilters) => void;
}

// ============================================================================
// Hook الرئيسي
// ============================================================================

export function useAnalytics(
  initialFilters?: Partial<AnalyticsFilters>
): UseAnalyticsResult {
  const { currentOrganization } = useTenant();
  const perms = usePermissions();

  const [filters, setFiltersState] = useState<AnalyticsFilters>({
    period: initialFilters?.period || 'month',
    dateRange: initialFilters?.dateRange || getDefaultDateRange('month'),
    channel: initialFilters?.channel || 'all',
    ...initialFilters
  });

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // دالة لحساب نطاق التاريخ الافتراضي
  function getDefaultDateRange(period: AnalyticsPeriod): DateRange {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'custom':
        start.setMonth(end.getMonth() - 1);
        break;
    }

    return { start, end };
  }

  // دالة لجلب البيانات
  const fetchAnalytics = useCallback(async () => {
    if (!currentOrganization?.id) {
      setError('لم يتم تحديد المؤسسة');
      setIsLoading(false);
      return;
    }

    // التحقق من الصلاحيات
    if (perms.ready && !perms.anyOf(['viewSalesReports', 'viewReports'])) {
      setError('ليس لديك صلاحية الوصول إلى التحليلات');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const dateRange = filters.dateRange || getDefaultDateRange(filters.period);

      // جلب الطلبات مع RLS تلقائي
      // Supabase سيطبق RLS تلقائياً بناءً على organization_id
      let ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      // تطبيق الفلاتر الإضافية
      if (filters.channel !== 'all') {
        ordersQuery = ordersQuery.eq('is_online', filters.channel === 'online');
      }
      if (filters.employeeId) {
        ordersQuery = ordersQuery.eq('employee_id', filters.employeeId);
      }
      if (filters.customerId) {
        ordersQuery = ordersQuery.eq('customer_id', filters.customerId);
      }
      if (filters.paymentMethod) {
        ordersQuery = ordersQuery.eq('payment_method', filters.paymentMethod);
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;

      if (ordersError) {
        throw new Error(`خطأ في جلب الطلبات: ${ordersError.message}`);
      }

      // جلب المنتجات
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      if (productsError) {
        console.error('خطأ في جلب المنتجات:', productsError);
      }

      // جلب المصروفات
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .gte('expense_date', dateRange.start.toISOString())
        .lte('expense_date', dateRange.end.toISOString());

      if (expensesError) {
        console.error('خطأ في جلب المصروفات:', expensesError);
      }

      // جلب بيانات الفترة السابقة للمقارنة
      const previousDateRange = getPreviousPeriod(dateRange, filters.period);
      const { data: previousOrdersData } = await supabase
        .from('orders')
        .select('total, items:order_items(*)')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'completed')
        .gte('created_at', previousDateRange.start.toISOString())
        .lte('created_at', previousDateRange.end.toISOString());

      // حساب مقاييس الفترة السابقة
      let previousPeriodData;
      if (previousOrdersData && previousOrdersData.length > 0) {
        const prevRevenue = previousOrdersData.reduce((sum, o) => sum + (o.total || 0), 0);
        const prevProfit = previousOrdersData.reduce((sum, o) => {
          if (o.items && o.items.length > 0) {
            const cost = o.items.reduce((s: number, item: any) => {
              return s + ((item.purchase_price || item.unit_price * 0.65) * item.quantity);
            }, 0);
            return sum + ((o.total || 0) - cost);
          }
          return sum + ((o.total || 0) * 0.35);
        }, 0);
        previousPeriodData = { revenue: prevRevenue, profit: prevProfit };
      }

      // حساب جميع المقاييس
      const orders = (ordersData || []) as Order[];
      const products = (productsData || []) as Product[];
      const expenses = (expensesData || []) as Expense[];

      const financial = calculateFinancialMetrics(orders, expenses, previousPeriodData);
      const productMetrics = calculateProductMetrics(orders);
      const categoryMetrics = calculateCategoryMetrics(orders, products);
      const customerMetrics = calculateCustomerMetrics(orders);
      const employeeMetrics = calculateEmployeeMetrics(orders);
      const timeSeries = calculateTimeSeriesData(orders, filters.period);
      const channels = calculateChannelMetrics(orders);
      const paymentMethods = calculatePaymentMethodMetrics(orders);

      // بناء البيانات النهائية
      const analyticsData: AnalyticsData = {
        financial,
        products: productMetrics,
        topProducts: productMetrics.slice(0, 10),
        categories: categoryMetrics,
        customers: customerMetrics,
        topCustomers: customerMetrics.slice(0, 10),
        employees: employeeMetrics,
        timeSeries,
        channels,
        paymentMethods,
        metadata: {
          totalOrders: orders.length,
          totalProducts: products.length,
          totalCustomers: new Set(orders.map(o => o.customer_id).filter(Boolean)).size,
          totalEmployees: employeeMetrics.length,
          period: filters.period,
          dateRange,
          lastUpdated: new Date()
        }
      };

      setData(analyticsData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id, filters, perms.ready, perms.anyOf]);

  // جلب البيانات عند التحميل أو تغيير الفلاتر
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // دالة لتحديث الفلاتر
  const setFilters = useCallback((newFilters: AnalyticsFilters) => {
    setFiltersState(newFilters);
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
    filters,
    setFilters
  };
}

// ============================================================================
// دوال مساعدة
// ============================================================================

function getPreviousPeriod(dateRange: DateRange, period: AnalyticsPeriod): DateRange {
  const duration = dateRange.end.getTime() - dateRange.start.getTime();
  const start = new Date(dateRange.start.getTime() - duration);
  const end = new Date(dateRange.end.getTime() - duration);
  return { start, end };
}

// ============================================================================
// Hook للحصول على Filters محفوظة
// ============================================================================

export function useSavedFilters(key: string = 'analytics-filters') {
  const [savedFilters, setSavedFilters] = useState<AnalyticsFilters[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (error) {
        console.error('Error parsing saved filters:', error);
      }
    }
  }, [key]);

  const saveFilter = useCallback((name: string, filters: AnalyticsFilters) => {
    const newFilters = [...savedFilters, { ...filters, name } as any];
    setSavedFilters(newFilters);
    localStorage.setItem(key, JSON.stringify(newFilters));
  }, [savedFilters, key]);

  const deleteFilter = useCallback((index: number) => {
    const newFilters = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(newFilters);
    localStorage.setItem(key, JSON.stringify(newFilters));
  }, [savedFilters, key]);

  return { savedFilters, saveFilter, deleteFilter };
}

// ============================================================================
// Hook للـ Real-time Updates
// ============================================================================

export function useRealtimeAnalytics(
  enabled: boolean = true,
  interval: number = 30000 // 30 ثانية
) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRealtime, setIsRealtime] = useState(enabled);

  useEffect(() => {
    if (!isRealtime) return;

    const timer = setInterval(() => {
      setLastUpdate(new Date());
    }, interval);

    return () => clearInterval(timer);
  }, [isRealtime, interval]);

  return {
    lastUpdate,
    isRealtime,
    setIsRealtime,
    forceUpdate: () => setLastUpdate(new Date())
  };
}
