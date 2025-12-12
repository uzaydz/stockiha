/**
 * ============================================
 * STOCKIHA ANALYTICS - SALES DATA HOOK
 * جلب وتحليل بيانات المبيعات من PowerSync
 * ============================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/tenant';
import type { FilterState, SalesData, TopProduct } from '../types';
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';

// ==================== Types ====================

export interface UseSalesAnalyticsReturn {
  data: SalesData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

type TimeSeriesDataPoint = {
  date: string;
  value: number;
  count: number;
  label?: string;
};

type CategoryBreakdown = {
  id: string;
  name: string;
  value: number;
  count: number;
  percentage: number;
};

// ==================== SQL Queries ====================

const buildSalesQuery = (orgId: string, filters: FilterState) => {
  const { dateRange, paymentMethods, staff } = filters;

  // ⚡ تم تصحيح أسماء الأعمدة لتتوافق مع PowerSync Schema
  let sql = `
    SELECT
      o.id,
      o.global_order_number as order_number,
      o.total as total_amount,
      o.subtotal,
      o.discount,
      o.tax,
      o.payment_method,
      o.pos_order_type,
      o.status,
      o.created_at,
      o.customer_id,
      o.created_by_staff_id as staff_id,
      o.created_by_staff_name as staff_name,
      c.name as customer_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.organization_id = ?
      AND o.status IN ('completed', 'delivered')
      AND o.created_at >= ?
      AND o.created_at <= ?
  `;

  const params: any[] = [orgId, dateRange.start.toISOString(), dateRange.end.toISOString()];

  if (paymentMethods.length > 0) {
    sql += ` AND o.payment_method IN (${paymentMethods.map(() => '?').join(',')})`;
    params.push(...paymentMethods);
  }

  if (staff.length > 0) {
    sql += ` AND o.created_by_staff_id IN (${staff.map(() => '?').join(',')})`;
    params.push(...staff);
  }

  sql += ' ORDER BY o.created_at DESC';

  return { sql, params };
};

const buildOrderItemsQuery = (orgId: string, filters: FilterState) => {
  const { dateRange, categories, productTypes, saleTypes } = filters;

  // ⚡ تم تصحيح أسماء الأعمدة لتتوافق مع PowerSync Schema
  let sql = `
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
      p.unit_type,
      CASE
        WHEN COALESCE(p.sell_by_weight, 0) = 1 THEN 'weight'
        WHEN COALESCE(p.sell_by_meter, 0) = 1 THEN 'meter'
        WHEN COALESCE(p.sell_by_box, 0) = 1 THEN 'box'
        ELSE 'piece'
      END as product_type,
      pc.name as category_name,
      o.created_at,
      o.pos_order_type
    FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE o.organization_id = ?
      AND o.status IN ('completed', 'delivered')
      AND o.created_at >= ?
      AND o.created_at <= ?
  `;

  const params: any[] = [orgId, dateRange.start.toISOString(), dateRange.end.toISOString()];

  if (categories.length > 0) {
    sql += ` AND p.category_id IN (${categories.map(() => '?').join(',')})`;
    params.push(...categories);
  }

  if (productTypes.length > 0) {
    sql += ` AND (
      CASE
        WHEN COALESCE(p.sell_by_weight, 0) = 1 THEN 'weight'
        WHEN COALESCE(p.sell_by_meter, 0) = 1 THEN 'meter'
        WHEN COALESCE(p.sell_by_box, 0) = 1 THEN 'box'
        ELSE 'piece'
      END
    ) IN (${productTypes.map(() => '?').join(',')})`;
    params.push(...productTypes);
  }

  if (saleTypes.length > 0) {
    sql += ` AND oi.sale_type IN (${saleTypes.map(() => '?').join(',')})`;
    params.push(...saleTypes);
  }

  return { sql, params };
};

// ==================== Data Processing ====================

const processTimeSeriesData = (
  orders: any[],
  dateRange: { start: Date; end: Date },
  granularity: 'day' | 'week' | 'month' = 'day'
): TimeSeriesDataPoint[] => {
  // Generate all dates in range
  let intervals: Date[];
  let formatPattern: string;

  switch (granularity) {
    case 'week':
      intervals = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end });
      formatPattern = "d MMM";
      break;
    case 'month':
      intervals = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
      formatPattern = "MMM yyyy";
      break;
    default:
      intervals = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      formatPattern = "d/M";
  }

  // Group orders by date
  const ordersByDate = new Map<string, any[]>();

  orders.forEach((order) => {
    const date = format(parseISO(order.created_at), 'yyyy-MM-dd');
    if (!ordersByDate.has(date)) {
      ordersByDate.set(date, []);
    }
    ordersByDate.get(date)!.push(order);
  });

  // Create time series
  return intervals.map((date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayOrders = ordersByDate.get(dateKey) || [];

    const value = dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const count = dayOrders.length;

    return {
      date: format(date, formatPattern, { locale: ar }),
      value,
      count,
      label: format(date, 'EEEE d MMMM', { locale: ar }),
    };
  });
};

const processCategoryBreakdown = (orderItems: any[]): CategoryBreakdown[] => {
  const categoryMap = new Map<string, { value: number; count: number; name: string }>();

  orderItems.forEach((item) => {
    const categoryId = item.category_id || 'uncategorized';
    const categoryName = item.category_name || 'بدون تصنيف';

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, { value: 0, count: 0, name: categoryName });
    }

    const cat = categoryMap.get(categoryId)!;
    cat.value += item.total_price || 0;
    cat.count += item.quantity || 0;
  });

  const total = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.value, 0);

  return Array.from(categoryMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      value: data.value,
      count: data.count,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

const processPaymentBreakdown = (orders: any[]): CategoryBreakdown[] => {
  const paymentMap = new Map<string, { value: number; count: number }>();

  const paymentLabels: Record<string, string> = {
    cash: 'نقدي',
    card: 'بطاقة',
    bank_transfer: 'تحويل بنكي',
    ccp: 'CCP',
    baridimob: 'بريدي موب',
    credit: 'آجل',
  };

  orders.forEach((order) => {
    const method = order.payment_method || 'cash';

    if (!paymentMap.has(method)) {
      paymentMap.set(method, { value: 0, count: 0 });
    }

    const pm = paymentMap.get(method)!;
    pm.value += order.total_amount || 0;
    pm.count += 1;
  });

  const total = Array.from(paymentMap.values()).reduce((sum, p) => sum + p.value, 0);

  return Array.from(paymentMap.entries())
    .map(([method, data]) => ({
      id: method,
      name: paymentLabels[method] || method,
      value: data.value,
      count: data.count,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

const processSaleTypeBreakdown = (orders: any[]): CategoryBreakdown[] => {
  // NOTE: Kept for backward compatibility; prefer processSaleTypeBreakdownFromItems
  return [];
};

const processSaleTypeBreakdownFromItems = (orderItems: any[]): CategoryBreakdown[] => {
  const typeMap = new Map<string, { value: number; count: number }>();

  const typeLabels: Record<string, string> = {
    retail: 'تجزئة',
    wholesale: 'جملة',
    partial_wholesale: 'نصف جملة',
  };

  for (const item of orderItems) {
    const type = item.sale_type || 'retail';
    const quantity = Number(item.quantity) || 0;
    const totalPrice = Number(item.total_price) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const revenue = totalPrice > 0 ? totalPrice : unitPrice * quantity;

    if (!typeMap.has(type)) {
      typeMap.set(type, { value: 0, count: 0 });
    }

    const t = typeMap.get(type)!;
    t.value += revenue;
    t.count += quantity;
  }

  const total = Array.from(typeMap.values()).reduce((sum, t) => sum + t.value, 0);

  return Array.from(typeMap.entries())
    .map(([type, data]) => ({
      id: type,
      name: typeLabels[type] || type,
      value: data.value,
      count: data.count,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

const processTopProducts = (orderItems: any[]): TopProduct[] => {
  const byProduct = new Map<
    string,
    {
      productName: string;
      categoryName?: string;
      quantitySold: number;
      revenue: number;
      cost: number;
    }
  >();

  for (const item of orderItems) {
    const productId = item.product_id;
    if (!productId) continue;

    const quantity = Number(item.quantity) || 0;
    const totalPrice = Number(item.total_price) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const purchasePrice = Number(item.purchase_price) || 0;

    const revenue = totalPrice > 0 ? totalPrice : unitPrice * quantity;
    const cost = purchasePrice * quantity;

    if (!byProduct.has(productId)) {
      byProduct.set(productId, {
        productName: item.product_name || 'منتج',
        categoryName: item.category_name || undefined,
        quantitySold: 0,
        revenue: 0,
        cost: 0,
      });
    }

    const agg = byProduct.get(productId)!;
    agg.quantitySold += quantity;
    agg.revenue += revenue;
    agg.cost += cost;
  }

  return Array.from(byProduct.entries())
    .map(([productId, data]) => {
      const profit = data.revenue - data.cost;
      const profitMargin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

      return {
        productId,
        productName: data.productName,
        categoryName: data.categoryName,
        quantitySold: data.quantitySold,
        revenue: data.revenue,
        cost: data.cost,
        profit,
        profitMargin,
        hasColors: false,
        hasSizes: false,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
};

// ==================== Main Hook ====================

export function useSalesAnalytics(filters: FilterState): UseSalesAnalyticsReturn {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id || '';

  // Build queries
  const ordersQuery = useMemo(() => buildSalesQuery(orgId, filters), [orgId, filters]);
  const itemsQuery = useMemo(() => buildOrderItemsQuery(orgId, filters), [orgId, filters]);

  // Execute queries
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError
  } = useQuery(ordersQuery.sql, ordersQuery.params);

  const {
    data: itemsData,
    isLoading: itemsLoading,
    error: itemsError
  } = useQuery(itemsQuery.sql, itemsQuery.params);

  // Process data
  const salesData = useMemo((): SalesData | null => {
    if (!ordersData || !itemsData) return null;

    const orders = ordersData as any[];
    const items = itemsData as any[];

    // Calculate totals - ⚡ تم تصحيح أسماء الحقول
    const totalSales = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const totalOrders = orders.length;
    const totalDiscount = orders.reduce((sum, o) => sum + (Number(o.discount) || 0), 0);
    const totalTax = orders.reduce((sum, o) => sum + (Number(o.tax) || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Calculate items sold
    const totalItemsSold = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    // Breakdown totals (legacy fields used by some widgets)
    let cashSales = 0;
    let cardSales = 0;
    let creditSales = 0;
    let otherPaymentSales = 0;

    for (const o of orders) {
      const amount = Number(o.total_amount) || 0;
      const method = o.payment_method || 'cash';
      if (method === 'cash') cashSales += amount;
      else if (method === 'card') cardSales += amount;
      else if (method === 'credit') creditSales += amount;
      else otherPaymentSales += amount;
    }

    let retailSales = 0;
    let wholesaleSales = 0;
    let partialWholesaleSales = 0;

    for (const item of items) {
      const quantity = Number(item.quantity) || 0;
      const totalPrice = Number(item.total_price) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const revenue = totalPrice > 0 ? totalPrice : unitPrice * quantity;

      const type = item.sale_type || 'retail';
      if (type === 'retail') retailSales += revenue;
      else if (type === 'wholesale') wholesaleSales += revenue;
      else if (type === 'partial_wholesale') partialWholesaleSales += revenue;
    }

    let pieceSales = 0;
    let weightSales = 0;
    let meterSales = 0;
    let boxSales = 0;

    for (const item of items) {
      const revenue = (Number(item.total_price) || 0) || (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
      const pt = item.product_type || item.unit_type;
      if (pt === 'piece') pieceSales += revenue;
      else if (pt === 'weight') weightSales += revenue;
      else if (pt === 'meter') meterSales += revenue;
      else if (pt === 'box') boxSales += revenue;
    }

    // Determine granularity based on date range
    const daysDiff = Math.ceil(
      (filters.dateRange.end.getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const granularity = daysDiff > 90 ? 'month' : daysDiff > 30 ? 'week' : 'day';

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      totalDiscount,
      totalTax,
      totalItemsSold,
      salesByDay: processTimeSeriesData(orders, filters.dateRange, granularity),
      salesByCategory: processCategoryBreakdown(items),
      salesByPaymentMethod: processPaymentBreakdown(orders).map((p) => ({ name: p.name, value: p.value })),
      salesBySaleType: processSaleTypeBreakdownFromItems(items).map((t) => ({ name: t.name, value: t.value })),
      topProducts: processTopProducts(items),

      // Legacy/Other props
      ordersCount: totalOrders,
      itemsSold: totalItemsSold,

      retailSales,
      wholesaleSales,
      partialWholesaleSales,

      cashSales,
      cardSales,
      creditSales,
      otherPaymentSales,

      pieceSales,
      weightSales,
      meterSales,
      boxSales,
    };
  }, [ordersData, itemsData, filters.dateRange]);

  const refetch = () => {
    // PowerSync queries auto-update, but we can trigger a re-render
  };

  return {
    data: salesData,
    isLoading: ordersLoading || itemsLoading,
    error: ordersError || itemsError,
    refetch,
  };
}

export default useSalesAnalytics;
