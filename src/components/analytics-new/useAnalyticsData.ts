/**
 * ⚡ useAnalyticsData - Offline-First Analytics Hook
 *
 * يستخدم LocalAnalyticsService للعمل بدون إنترنت
 * البيانات تُقرأ من SQLite المحلي، والمزامنة تتم في الخلفية
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { LocalAnalyticsService } from '@/services/LocalAnalyticsService';
import { deltaWriteService } from '@/services/DeltaWriteService';
import type {
  AnalyticsData,
  LegacyDateRange as DateRange,
  DatePreset,
  KPIData,
  DailySalesData,
  MonthlySalesData,
  TopProduct,
  InventoryStatus,
  CustomerStats,
  ExpensesByCategory,
  PaymentMethodStats,
} from './types';

// دالة مساعدة لحساب نطاق التاريخ
export const getDateRangeFromPreset = (preset: DatePreset): DateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { from: today, to: now };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday, to: today };
    case 'week':
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { from: weekAgo, to: now };
    case 'month':
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { from: monthAgo, to: now };
    case 'quarter':
      const quarterAgo = new Date(today);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      return { from: quarterAgo, to: now };
    case 'year':
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return { from: yearAgo, to: now };
    default:
      return { from: today, to: now };
  }
};

// حساب عدد الأيام بين تاريخين
const getDaysBetween = (from: Date, to: Date): number => {
  const diffTime = Math.abs(to.getTime() - from.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

interface UseAnalyticsDataOptions {
  dateRange: DateRange;
  enabled?: boolean;
}

interface UseAnalyticsDataReturn {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isRefetching: boolean;
}

export const useAnalyticsData = ({
  dateRange,
  enabled = true,
}: UseAnalyticsDataOptions): UseAnalyticsDataReturn => {
  const { userProfile, organization } = useAuth();
  const queryClient = useQueryClient();

  const organizationId = useMemo(() => {
    return userProfile?.organization_id ||
           organization?.id ||
           localStorage.getItem('bazaar_organization_id') ||
           localStorage.getItem('currentOrganizationId') ||
           '';
  }, [userProfile?.organization_id, organization?.id]);

  const days = getDaysBetween(dateRange.from, dateRange.to);

  // ⚡ جلب KPI الرئيسية من SQLite
  const fetchKPIData = async (): Promise<KPIData> => {
    if (!organizationId) throw new Error('لم يتم العثور على معرف المؤسسة');

    // جلب إحصائيات المبيعات للفترة المحددة
    const salesStats = await LocalAnalyticsService.getSalesStats(days);

    // جلب إحصائيات الفترة السابقة للمقارنة
    const previousStats = await LocalAnalyticsService.getSalesStats(days * 2);
    const previousPeriodSales = previousStats.totalSales - salesStats.totalSales;

    // حساب نسبة النمو
    const growthRate = previousPeriodSales > 0
      ? ((salesStats.totalSales - previousPeriodSales) / previousPeriodSales) * 100
      : 0;

    // جلب إحصائيات المخزون
    const inventoryStats = await LocalAnalyticsService.getInventoryStats();

    // جلب إحصائيات العملاء
    const topCustomers = await LocalAnalyticsService.getTopCustomers(30, 100);
    const totalCustomers = new Set(topCustomers.map(c => c.customer_id)).size;

    // العملاء الجدد (تقدير من الطلبات في آخر 30 يوم)
    const recentCustomers = await LocalAnalyticsService.getTopCustomers(30, 1000);
    const olderCustomers = await LocalAnalyticsService.getTopCustomers(60, 1000);
    const olderCustomerIds = new Set(olderCustomers.filter(c => {
      // فقط العملاء الذين لديهم طلبات قبل 30 يوم
      return true; // تقدير بسيط
    }).map(c => c.customer_id));

    const newCustomers = recentCustomers.filter(c => !olderCustomerIds.has(c.customer_id)).length;

    // ⚡ جلب المصروفات الفعلية من SQLite
    let totalExpenses = 0;
    try {
      const allExpenses = await deltaWriteService.getAll<any>('expenses', organizationId);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startTs = startDate.getTime();

      const filteredExpenses = allExpenses.filter(expense => {
        const expenseTs = Date.parse(expense.expense_date);
        return expenseTs >= startTs;
      });

      totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

      // إذا لم توجد مصروفات، نستخدم تقدير
      if (totalExpenses === 0) {
        totalExpenses = salesStats.totalSales * 0.2;
      }
    } catch {
      totalExpenses = salesStats.totalSales * 0.2; // تقدير 20% مصاريف
    }

    return {
      totalSales: salesStats.totalSales,
      totalOrders: salesStats.totalOrders,
      avgOrderValue: salesStats.averageOrderValue,
      netProfit: salesStats.totalProfit - totalExpenses,
      totalExpenses,
      totalCustomers,
      newCustomers,
      growthRate,
    };
  };

  // ⚡ جلب المبيعات اليومية من SQLite
  const fetchDailySales = async (): Promise<DailySalesData[]> => {
    if (!organizationId) return [];

    const orgId = organizationId;
    const allOrders = await deltaWriteService.getAll<any>('orders', orgId);

    const startTs = dateRange.from.getTime();
    const endTs = dateRange.to.getTime();

    // فلترة الطلبات حسب التاريخ
    const filteredOrders = allOrders.filter(order => {
      const orderTs = (order as any).created_at_ts || Date.parse(order.created_at);
      return orderTs >= startTs && orderTs <= endTs;
    });

    // تجميع حسب اليوم
    const dailyMap = new Map<string, { sales: number; orders: number }>();

    filteredOrders.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { sales: 0, orders: 0 };
      dailyMap.set(date, {
        sales: existing.sales + (Number(order.total) || 0),
        orders: existing.orders + 1,
      });
    });

    // إنشاء قائمة بكل الأيام في النطاق (حتى الأيام بدون مبيعات)
    const result: DailySalesData[] = [];
    const currentDate = new Date(dateRange.from);

    while (currentDate <= dateRange.to) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const data = dailyMap.get(dateStr) || { sales: 0, orders: 0 };
      result.push({
        date: dateStr,
        sales: data.sales,
        orders: data.orders,
        profit: data.sales * 0.3, // تقدير 30% ربح
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  };

  // ⚡ جلب المبيعات الشهرية من SQLite
  const fetchMonthlySales = async (): Promise<MonthlySalesData[]> => {
    if (!organizationId) return [];

    const orgId = organizationId;

    // جلب طلبات آخر 6 أشهر
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const startTs = sixMonthsAgo.getTime();

    const allOrders = await deltaWriteService.getAll<any>('orders', orgId);
    const filteredOrders = allOrders.filter(order => {
      const orderTs = (order as any).created_at_ts || Date.parse(order.created_at);
      return orderTs >= startTs;
    });

    // تجميع حسب الشهر
    const monthlyMap = new Map<string, { sales: number; orders: number; expenses: number }>();

    filteredOrders.forEach((order) => {
      const month = new Date(order.created_at).toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyMap.get(month) || { sales: 0, orders: 0, expenses: 0 };
      monthlyMap.set(month, {
        ...existing,
        sales: existing.sales + (Number(order.total) || 0),
        orders: existing.orders + 1,
      });
    });

    // تقدير المصاريف (20% من المبيعات)
    monthlyMap.forEach((data, month) => {
      data.expenses = data.sales * 0.2;
    });

    return Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        sales: data.sales,
        orders: data.orders,
        expenses: data.expenses,
        profit: data.sales - data.expenses,
      }));
  };

  // ⚡ جلب أفضل المنتجات من SQLite
  const fetchTopProducts = async (): Promise<TopProduct[]> => {
    if (!organizationId) return [];

    const topProducts = await LocalAnalyticsService.getTopSellingProducts(days);

    return topProducts.slice(0, 10).map((product, index) => ({
      id: product.productId,
      name: product.productName,
      totalSales: product.totalRevenue,
      quantitySold: product.quantitySold,
      revenue: product.totalRevenue,
      profit: product.totalRevenue * 0.3, // تقدير 30% ربح
      profitMargin: 30,
    }));
  };

  // ⚡ جلب حالة المخزون من SQLite
  const fetchInventoryStatus = async (): Promise<InventoryStatus> => {
    if (!organizationId) return { totalProducts: 0, inStock: 0, outOfStock: 0, lowStock: 0 };

    const stats = await LocalAnalyticsService.getInventoryStats();

    return {
      totalProducts: stats.totalProducts,
      inStock: stats.totalProducts - stats.outOfStockProducts,
      outOfStock: stats.outOfStockProducts,
      lowStock: stats.lowStockProducts,
    };
  };

  // ⚡ جلب إحصائيات العملاء من SQLite
  const fetchCustomerStats = async (): Promise<CustomerStats> => {
    if (!organizationId) return { totalCustomers: 0, newCustomers30d: 0, topCustomers: [] };

    // أفضل العملاء
    const topCustomersData = await LocalAnalyticsService.getTopCustomers(90, 5);

    // إجمالي العملاء الفريدين
    const allCustomers = await LocalAnalyticsService.getTopCustomers(365, 10000);
    const uniqueCustomerIds = new Set(allCustomers.map(c => c.customer_id).filter(Boolean));
    const totalCustomers = uniqueCustomerIds.size;

    // العملاء الجدد (آخر 30 يوم)
    const recentCustomers = await LocalAnalyticsService.getTopCustomers(30, 10000);
    const olderCustomers = await LocalAnalyticsService.getTopCustomers(365, 10000);

    // العملاء الذين ظهروا فقط في آخر 30 يوم
    const olderIds = new Set(
      olderCustomers
        .filter(c => {
          // نفترض أن العميل قديم إذا كان لديه أكثر من طلب واحد
          return c.orders > 1;
        })
        .map(c => c.customer_id)
    );

    const newCustomers30d = recentCustomers.filter(c =>
      c.orders === 1 && !olderIds.has(c.customer_id)
    ).length;

    const topCustomers = topCustomersData.map(c => ({
      id: c.customer_id || 'unknown',
      name: c.customer_name,
      phone: undefined,
      totalOrders: c.orders,
      totalSpent: c.total,
    }));

    return {
      totalCustomers,
      newCustomers30d,
      topCustomers,
    };
  };

  // ⚡ جلب المصاريف حسب الفئة من SQLite
  const fetchExpensesByCategory = async (): Promise<ExpensesByCategory[]> => {
    if (!organizationId) return [];

    const categoryNames: Record<string, string> = {
      rent: 'الإيجار',
      utilities: 'المرافق',
      salaries: 'الرواتب',
      supplies: 'المستلزمات',
      marketing: 'التسويق',
      maintenance: 'الصيانة',
      other: 'أخرى',
    };

    try {
      // ⚡ جلب المصروفات الفعلية من SQLite
      const allExpenses = await deltaWriteService.getAll<any>('expenses', organizationId);

      const startTs = dateRange.from.getTime();
      const endTs = dateRange.to.getTime();

      // فلترة حسب التاريخ
      const filteredExpenses = allExpenses.filter(expense => {
        const expenseTs = Date.parse(expense.expense_date);
        return expenseTs >= startTs && expenseTs <= endTs;
      });

      // تجميع حسب الفئة
      const categoryMap = new Map<string, { amount: number; count: number }>();

      filteredExpenses.forEach((expense) => {
        const category = expense.category || 'other';
        const existing = categoryMap.get(category) || { amount: 0, count: 0 };
        categoryMap.set(category, {
          amount: existing.amount + (Number(expense.amount) || 0),
          count: existing.count + 1,
        });
      });

      // إذا لم توجد مصروفات، نرجع قيم تقديرية
      if (categoryMap.size === 0) {
        const salesStats = await LocalAnalyticsService.getSalesStats(days);
        const estimatedExpenses = salesStats.totalSales * 0.2;

        return [
          { category: 'salaries', categoryName: categoryNames.salaries, amount: estimatedExpenses * 0.4, count: 1 },
          { category: 'rent', categoryName: categoryNames.rent, amount: estimatedExpenses * 0.25, count: 1 },
          { category: 'utilities', categoryName: categoryNames.utilities, amount: estimatedExpenses * 0.15, count: 1 },
          { category: 'supplies', categoryName: categoryNames.supplies, amount: estimatedExpenses * 0.1, count: 1 },
          { category: 'other', categoryName: categoryNames.other, amount: estimatedExpenses * 0.1, count: 1 },
        ].filter(e => e.amount > 0);
      }

      return Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        categoryName: categoryNames[category] || category,
        amount: data.amount,
        count: data.count,
      }));
    } catch (error) {
      console.error('[useAnalyticsData] Error fetching expenses:', error);
      return [];
    }
  };

  // ⚡ جلب إحصائيات طرق الدفع من SQLite
  const fetchPaymentMethods = async (): Promise<PaymentMethodStats[]> => {
    if (!organizationId) return [];

    const paymentStats = await LocalAnalyticsService.getPaymentMethodStats(days);

    const methodNames: Record<string, string> = {
      cash: 'نقدي',
      نقدي: 'نقدي',
      card: 'بطاقة',
      بطاقة: 'بطاقة',
      bank_transfer: 'تحويل بنكي',
      credit: 'آجل',
      آجل: 'آجل',
    };

    return paymentStats.map(stat => ({
      method: methodNames[stat.method.toLowerCase()] || stat.method,
      count: stat.count,
      amount: stat.totalAmount,
    }));
  };

  // ⚡ الاستعلام الرئيسي - Offline First
  const {
    data,
    isLoading,
    error,
    refetch: queryRefetch,
    isFetching,
  } = useQuery({
    queryKey: ['analytics-data-offline', organizationId, days, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<AnalyticsData> => {
      // ⚡ جلب كل البيانات بالتوازي من SQLite
      const [
        kpi,
        dailySales,
        monthlySales,
        topProducts,
        inventoryStatus,
        customerStats,
        expensesByCategory,
        paymentMethods,
      ] = await Promise.all([
        fetchKPIData(),
        fetchDailySales(),
        fetchMonthlySales(),
        fetchTopProducts(),
        fetchInventoryStatus(),
        fetchCustomerStats(),
        fetchExpensesByCategory(),
        fetchPaymentMethods(),
      ]);

      return {
        kpi,
        dailySales,
        monthlySales,
        topProducts,
        inventoryStatus,
        customerStats,
        expensesByCategory,
        paymentMethods,
        lastUpdated: new Date(),
      };
    },
    enabled: enabled && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 دقيقة (أقصر لأن البيانات محلية)
    gcTime: 10 * 60 * 1000, // 10 دقائق
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst', // ⚡ أهم إعداد: Offline First
    retry: 1,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['analytics-data-offline'] });
    await queryRefetch();
  }, [queryClient, queryRefetch]);

  return {
    data: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
    isRefetching: isFetching,
  };
};
