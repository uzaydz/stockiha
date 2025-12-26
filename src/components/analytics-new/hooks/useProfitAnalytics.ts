/**
 * ============================================
 * STOCKIHA ANALYTICS - PROFIT DATA HOOK
 * جلب وتحليل بيانات الأرباح من PowerSync
 * ============================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/tenant';
import type { FilterState, ProfitData } from '../types';
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

// ⚡ v2.0: Module-level deduplication لمنع الـ logging المتكرر
let _lastLoggedTotals = '';

type TimeSeriesDataPoint = {
  date: string;
  value: number;
  count?: number;
  label?: string;
};

type CategoryBreakdown = {
  id: string;
  name: string;
  value: number;
  count: number;
  percentage: number;
};

// ==================== Types ====================

export interface UseProfitAnalyticsReturn {
  data: ProfitData | null;
  isLoading: boolean;
  error: Error | null;
}

// ==================== SQL Query ====================

const buildProfitQuery = (orgId: string, filters: FilterState) => {
  const { dateRange } = filters;

  // ⚡ تم تصحيح أسماء الأعمدة لتتوافق مع PowerSync Schema
  const sql = `
    SELECT
      oi.id,
      oi.order_id,
      oi.product_id,
      oi.quantity,
      oi.unit_price,
      oi.total_price,
      oi.sale_type,
      p.name as product_name,
      p.category_id,
      p.purchase_price,
      p.price as retail_price,
      p.wholesale_price,
      p.partial_wholesale_price,
      pc.name as category_name,
      o.created_at,
      o.pos_order_type,
      o.discount as order_discount,
      o.total as order_total
    FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE o.organization_id = ?
      AND o.status IN ('completed', 'delivered')
      AND o.created_at >= ?
      AND o.created_at <= ?
    ORDER BY o.created_at DESC
  `;

  const params = [orgId, dateRange.start.toISOString(), dateRange.end.toISOString()];

  return { sql, params };
};

const buildOperatingExpensesQuery = (orgId: string, filters: FilterState) => {
  const { dateRange } = filters;

  // Use date-only comparison to avoid timezone boundary issues on expense_date
  const sql = `
    SELECT
      COALESCE(SUM(CAST(amount AS REAL)), 0) as total_expenses
    FROM expenses
    WHERE organization_id = ?
      AND (
        substr(expense_date, 1, 10) >= ?
        AND substr(expense_date, 1, 10) <= ?
      )
      AND (is_deleted IS NULL OR is_deleted = 0)
  `;

  const params = [
    orgId,
    format(dateRange.start, 'yyyy-MM-dd'),
    format(dateRange.end, 'yyyy-MM-dd'),
  ];

  return { sql, params };
};

// ==================== Data Processing ====================

const calculateItemProfit = (item: any): { revenue: number; cost: number; profit: number } => {
  const quantity = Number(item.quantity) || 0;

  // ⚡ جلب الأسعار بطرق متعددة للتوافق مع مختلف schemas
  const totalPrice = Number(item.total_price) || Number(item.total) || 0;
  const unitPrice = Number(item.unit_price) || Number(item.price) || 0;
  const purchasePrice = Number(item.purchase_price) || Number(item.cost_price) || 0;

  // ⚡ حساب الإيرادات: إما total_price أو (unit_price * quantity)
  const revenue = totalPrice > 0 ? totalPrice : (unitPrice * quantity);

  // ⚡ حساب التكلفة
  const cost = purchasePrice * quantity;

  // ⚡ حساب الربح
  const profit = revenue - cost;

  return { revenue, cost, profit };
};

const processProfitTimeSeries = (
  items: any[],
  dateRange: { start: Date; end: Date }
): TimeSeriesDataPoint[] => {
  // Determine granularity
  const daysDiff = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );

  let intervals: Date[];
  let formatPattern: string;
  let groupPattern: string;

  if (daysDiff > 90) {
    intervals = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    formatPattern = "MMM yyyy";
    groupPattern = "yyyy-MM";
  } else if (daysDiff > 30) {
    intervals = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end });
    formatPattern = "d MMM";
    groupPattern = "yyyy-ww";
  } else {
    intervals = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    formatPattern = "d/M";
    groupPattern = "yyyy-MM-dd";
  }

  // Group items by date
  const profitByDate = new Map<string, { revenue: number; cost: number; profit: number; count: number }>();

  items.forEach((item) => {
    const date = format(parseISO(item.created_at), groupPattern);
    const { revenue, cost, profit } = calculateItemProfit(item);

    if (!profitByDate.has(date)) {
      profitByDate.set(date, { revenue: 0, cost: 0, profit: 0, count: 0 });
    }

    const data = profitByDate.get(date)!;
    data.revenue += revenue;
    data.cost += cost;
    data.profit += profit;
    data.count += item.quantity || 0;
  });

  // Create time series
  return intervals.map((date) => {
    const dateKey = format(date, groupPattern);
    const data = profitByDate.get(dateKey) || { revenue: 0, cost: 0, profit: 0, count: 0 };

    return {
      date: format(date, formatPattern, { locale: ar }),
      value: data.profit,
      count: data.count,
      label: format(date, 'EEEE d MMMM', { locale: ar }),
    };
  });
};

const processProfitByCategory = (items: any[]): CategoryBreakdown[] => {
  const categoryMap = new Map<string, {
    name: string;
    revenue: number;
    cost: number;
    profit: number;
    count: number
  }>();

  items.forEach((item) => {
    const categoryId = item.category_id || 'uncategorized';
    const categoryName = item.category_name || 'بدون تصنيف';
    const { revenue, cost, profit } = calculateItemProfit(item);

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, { name: categoryName, revenue: 0, cost: 0, profit: 0, count: 0 });
    }

    const cat = categoryMap.get(categoryId)!;
    cat.revenue += revenue;
    cat.cost += cost;
    cat.profit += profit;
    cat.count += item.quantity || 0;
  });

  const totalProfit = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.profit, 0);

  return Array.from(categoryMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      value: data.profit,
      count: data.count,
      percentage: totalProfit > 0 ? (data.profit / totalProfit) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

const processProfitBySaleType = (items: any[]): CategoryBreakdown[] => {
  const typeMap = new Map<string, { revenue: number; cost: number; profit: number; count: number }>();

  // ⚡ تم تصحيح أسماء الأنواع لتتوافق مع البيانات الفعلية
  const typeLabels: Record<string, string> = {
    retail: 'تجزئة',
    wholesale: 'جملة',
    partial_wholesale: 'نصف جملة',
    piece: 'قطعة',
    weight: 'وزن',
    meter: 'متر',
    box: 'صندوق',
  };

  items.forEach((item) => {
    // استخدام sale_type من order_items أو pos_order_type من orders
    const saleType = item.sale_type || item.pos_order_type || 'retail';
    const { revenue, cost, profit } = calculateItemProfit(item);

    if (!typeMap.has(saleType)) {
      typeMap.set(saleType, { revenue: 0, cost: 0, profit: 0, count: 0 });
    }

    const t = typeMap.get(saleType)!;
    t.revenue += revenue;
    t.cost += cost;
    t.profit += profit;
    t.count += item.quantity || 0;
  });

  const totalProfit = Array.from(typeMap.values()).reduce((sum, t) => sum + t.profit, 0);

  return Array.from(typeMap.entries())
    .map(([type, data]) => ({
      id: type,
      name: typeLabels[type] || type,
      value: data.profit,
      count: data.count,
      percentage: totalProfit > 0 ? (data.profit / totalProfit) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

// ==================== Main Hook ====================

export function useProfitAnalytics(filters: FilterState): UseProfitAnalyticsReturn {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id || '';

  // Build query
  const query = useMemo(() => buildProfitQuery(orgId, filters), [orgId, filters]);

  const expensesQuery = useMemo(() => buildOperatingExpensesQuery(orgId, filters), [orgId, filters]);

  // Execute query
  const { data: itemsData, isLoading, error } = useQuery(query.sql, query.params);

  const {
    data: operatingExpensesData,
    isLoading: operatingExpensesLoading,
    error: operatingExpensesError,
  } = useQuery(expensesQuery.sql, expensesQuery.params);

  // Process data
  const profitData = useMemo((): ProfitData | null => {
    if (!itemsData) return null;

    const items = itemsData as any[];

    // ⚡ v2.0: Debug log معطل للتقليل من الضوضاء
    // if (process.env.NODE_ENV === 'development' && items.length > 0) {
    //   console.log('[useProfitAnalytics] Sample item:', items[0]);
    //   console.log('[useProfitAnalytics] Total items:', items.length);
    // }

    // Calculate totals
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalItemsSold = 0;

    items.forEach((item) => {
      const { revenue, cost, profit } = calculateItemProfit(item);
      totalRevenue += revenue;
      totalCost += cost;
      totalProfit += profit;
      totalItemsSold += item.quantity || 0;
    });

    // ⚡ v2.0: Debug log مع global deduplication
    const totalsKey = `${totalRevenue}:${totalCost}:${totalProfit}:${totalItemsSold}`;
    if (process.env.NODE_ENV === 'development' && _lastLoggedTotals !== totalsKey && totalRevenue > 0) {
      _lastLoggedTotals = totalsKey;
      console.log('[useProfitAnalytics] Totals:', { totalRevenue, totalCost, totalProfit, totalItemsSold });
    }

    const operatingExpenses =
      Number((operatingExpensesData as any[])?.[0]?.total_expenses) || 0;

    const operatingProfit = totalProfit - operatingExpenses;

    // Calculate margins
    const grossMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;

    return {
      // ⚡ تم تصحيح الأسماء لتتوافق مع ProfitData interface
      grossRevenue: totalRevenue,        // الإيرادات
      cogs: totalCost,                   // تكلفة البضاعة المباعة
      grossProfit: totalProfit,          // إجمالي الربح
      grossMargin,                       // هامش الربح الإجمالي

      operatingExpenses,                // مصاريف التشغيل (من جدول expenses)
      losses: 0,                         // الخسائر
      returns: 0,                        // المرتجعات

      operatingProfit,                  // ربح التشغيل
      operatingMargin,                  // هامش ربح التشغيل

      otherIncome: 0,                    // إيرادات أخرى

      netProfit: operatingProfit,        // صافي الربح (بعد المصاريف)
      netMargin: operatingMargin,        // هامش صافي الربح

      profitByDay: processProfitTimeSeries(items, filters.dateRange),
      profitByCategory: processProfitByCategory(items),
      profitBySaleType: processProfitBySaleType(items),
    };
  }, [itemsData, operatingExpensesData, filters.dateRange]);

  return {
    data: profitData,
    isLoading: isLoading || operatingExpensesLoading,
    error: (error || operatingExpensesError) as Error | null,
  };
}

export default useProfitAnalytics;
