/**
 * ============================================
 * STOCKIHA ANALYTICS - RETURNS DATA HOOK
 * جلب وتحليل بيانات المرتجعات
 * ============================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/tenant';
import type { FilterState, ReturnData, TimeSeriesDataPoint, CategoryBreakdown } from '../types';
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

// ==================== Types ====================

export interface UseReturnsAnalyticsReturn {
  data: ReturnData | null;
  isLoading: boolean;
  error: Error | null;
}

// ==================== SQL Query ====================

const buildReturnsQuery = (orgId: string, filters: FilterState) => {
  const { dateRange } = filters;

  // ⚡ تم تصحيح أسماء الأعمدة لتتوافق مع PowerSync Schema
  // original_order_id بدلاً من order_id
  const sql = `
    SELECT
      r.id,
      r.return_number,
      r.customer_id,
      r.original_order_id as order_id,
      r.return_reason,
      r.return_type,
      r.refund_amount,
      r.refund_method,
      r.status,
      r.notes,
      r.created_at,
      COALESCE(r.customer_name, c.name) as customer_name
    FROM returns r
    LEFT JOIN customers c ON r.customer_id = c.id
    WHERE r.organization_id = ?
      AND r.created_at >= ?
      AND r.created_at <= ?
    ORDER BY r.created_at DESC
  `;

  const params = [orgId, dateRange.start.toISOString(), dateRange.end.toISOString()];

  return { sql, params };
};

const buildReturnItemsQuery = (orgId: string, filters: FilterState) => {
  const { dateRange } = filters;

  // ⚡ تم تصحيح أسماء الأعمدة لتتوافق مع PowerSync Schema
  // total_return_amount بدلاً من refund_amount في return_items
  // condition_status بدلاً من condition
  // r.return_reason من returns بدلاً من ri.return_reason
  const sql = `
    SELECT
      ri.id,
      ri.return_id,
      ri.product_id,
      ri.return_quantity,
      r.return_reason as item_reason,
      ri.total_return_amount as item_refund,
      ri.condition_status as condition,
      COALESCE(ri.product_name, p.name) as product_name,
      p.category_id,
      pc.name as category_name,
      r.created_at
    FROM return_items ri
    INNER JOIN returns r ON ri.return_id = r.id
    LEFT JOIN products p ON ri.product_id = p.id
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE r.organization_id = ?
      AND r.created_at >= ?
      AND r.created_at <= ?
  `;

  const params = [orgId, dateRange.start.toISOString(), dateRange.end.toISOString()];

  return { sql, params };
};

// ==================== Data Processing ====================

const returnReasonLabels: Record<string, string> = {
  defective: 'عيب مصنعي',
  damaged: 'تالف',
  wrong_item: 'منتج خاطئ',
  not_as_described: 'لا يطابق الوصف',
  changed_mind: 'تغيير الرأي',
  size_issue: 'مشكلة في المقاس',
  color_issue: 'مشكلة في اللون',
  quality_issue: 'مشكلة في الجودة',
  other: 'أخرى',
};

const processReturnsTimeSeries = (
  returns: any[],
  dateRange: { start: Date; end: Date }
): TimeSeriesDataPoint[] => {
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

  // Group returns by date
  const returnsByDate = new Map<string, { amount: number; count: number }>();

  returns.forEach((ret) => {
    const date = format(parseISO(ret.created_at), groupPattern);

    if (!returnsByDate.has(date)) {
      returnsByDate.set(date, { amount: 0, count: 0 });
    }

    const data = returnsByDate.get(date)!;
    data.amount += ret.refund_amount || 0;
    data.count += 1;
  });

  return intervals.map((date) => {
    const dateKey = format(date, groupPattern);
    const data = returnsByDate.get(dateKey) || { amount: 0, count: 0 };

    return {
      date: format(date, formatPattern, { locale: ar }),
      value: data.amount,
      count: data.count,
      label: format(date, 'EEEE d MMMM', { locale: ar }),
    };
  });
};

const processReturnsByReason = (returns: any[]): CategoryBreakdown[] => {
  const reasonMap = new Map<string, { amount: number; count: number }>();

  returns.forEach((ret) => {
    const reason = ret.return_reason || 'other';

    if (!reasonMap.has(reason)) {
      reasonMap.set(reason, { amount: 0, count: 0 });
    }

    const r = reasonMap.get(reason)!;
    r.amount += ret.refund_amount || 0;
    r.count += 1;
  });

  const total = Array.from(reasonMap.values()).reduce((sum, r) => sum + r.amount, 0);

  return Array.from(reasonMap.entries())
    .map(([reason, data]) => ({
      id: reason,
      name: returnReasonLabels[reason] || reason,
      value: data.amount,
      count: data.count,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
};

const processReturnsByCategory = (items: any[]): CategoryBreakdown[] => {
  const categoryMap = new Map<string, { name: string; amount: number; count: number }>();

  items.forEach((item) => {
    const categoryId = item.category_id || 'uncategorized';
    const categoryName = item.category_name || 'بدون تصنيف';

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, { name: categoryName, amount: 0, count: 0 });
    }

    const cat = categoryMap.get(categoryId)!;
    cat.amount += item.item_refund || 0;
    cat.count += item.return_quantity || 0;
  });

  const total = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.amount, 0);

  return Array.from(categoryMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      value: data.amount,
      count: data.count,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

const processTopReturnedProducts = (items: any[]): ReturnData['topReturnedProducts'] => {
  const productMap = new Map<string, {
    name: string;
    count: number;
    amount: number;
    reasons: Map<string, number>
  }>();

  items.forEach((item) => {
    const productId = item.product_id;
    if (!productId) return;

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        name: item.product_name || 'منتج غير معروف',
        count: 0,
        amount: 0,
        reasons: new Map(),
      });
    }

    const p = productMap.get(productId)!;
    p.count += item.return_quantity || 0;
    p.amount += item.item_refund || 0;

    const reason = item.item_reason || 'other';
    p.reasons.set(reason, (p.reasons.get(reason) || 0) + (item.return_quantity || 0));
  });

  return Array.from(productMap.entries())
    .map(([id, data]) => {
      // Find top reason
      let topReason = 'other';
      let maxCount = 0;
      data.reasons.forEach((count, reason) => {
        if (count > maxCount) {
          maxCount = count;
          topReason = reason;
        }
      });

      return {
        id,
        name: data.name,
        returnCount: data.count,
        refundAmount: data.amount,
        topReason: returnReasonLabels[topReason] || topReason,
      };
    })
    .sort((a, b) => b.returnCount - a.returnCount)
    .slice(0, 10);
};

// ==================== Main Hook ====================

export function useReturnsAnalytics(filters: FilterState): UseReturnsAnalyticsReturn {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id || '';

  // Build queries
  const returnsQuery = useMemo(() => buildReturnsQuery(orgId, filters), [orgId, filters]);
  const itemsQuery = useMemo(() => buildReturnItemsQuery(orgId, filters), [orgId, filters]);

  // Execute queries
  const {
    data: returnsData,
    isLoading: returnsLoading,
    error: returnsError
  } = useQuery(returnsQuery.sql, returnsQuery.params);

  const {
    data: itemsData,
    isLoading: itemsLoading,
    error: itemsError
  } = useQuery(itemsQuery.sql, itemsQuery.params);

  // Process data
  const returnData = useMemo((): ReturnData | null => {
    if (!returnsData) return null;

    const returns = returnsData as any[];
    const items = (itemsData as any[]) || [];

    // Calculate totals
    const totalReturns = returns.length;
    const totalRefundAmount = returns.reduce((sum, r) => sum + (r.refund_amount || 0), 0);
    const totalReturnedItems = items.reduce((sum, i) => sum + (i.return_quantity || 0), 0);
    const averageRefund = totalReturns > 0 ? totalRefundAmount / totalReturns : 0;

    // Return rate would need total orders comparison
    const returnRate = 0; // Calculate with total orders

    return {
      totalReturns,
      totalRefundAmount,
      totalReturnedItems,
      averageRefund,
      returnRate,
      returnsByDay: processReturnsTimeSeries(returns, filters.dateRange),
      returnsByReason: processReturnsByReason(returns),
      returnsByCategory: processReturnsByCategory(items),
      topReturnedProducts: processTopReturnedProducts(items),
      returnGrowth: 0,
    };
  }, [returnsData, itemsData, filters.dateRange]);

  return {
    data: returnData,
    isLoading: returnsLoading || itemsLoading,
    error: returnsError || itemsError,
  };
}

export default useReturnsAnalytics;
