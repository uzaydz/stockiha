/**
 * ============================================
 * STOCKIHA ANALYTICS - LOSSES DATA HOOK
 * جلب وتحليل بيانات الخسائر والهدر
 * ============================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/tenant';
import type { FilterState, LossData, TimeSeriesDataPoint, CategoryBreakdown } from '../types';
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

// ==================== Types ====================

export interface UseLossAnalyticsReturn {
  data: LossData | null;
  isLoading: boolean;
  error: Error | null;
}

// ==================== Loss Type Labels ====================

const lossTypeLabels: Record<string, string> = {
  damage: 'تلف',
  theft: 'سرقة',
  expiry: 'انتهاء صلاحية',
  error: 'خطأ مخزني',
  sample: 'عينة',
  donation: 'تبرع',
  personal_use: 'استخدام شخصي',
  adjustment: 'تسوية جرد',
  other: 'أخرى',
};

// ==================== SQL Queries ====================

const buildLossesQuery = (orgId: string, filters: FilterState) => {
  const { dateRange } = filters;

  // ⚡ تم تصحيح أسماء الأعمدة لتتوافق مع PowerSync Schema
  // incident_date بدلاً من loss_date
  // total_selling_value بدلاً من total_retail_value
  // reported_by بدلاً من staff_id
  const sql = `
    SELECT
      l.id,
      l.loss_number,
      l.loss_type,
      l.incident_date as loss_date,
      l.total_cost_value,
      l.total_selling_value as total_retail_value,
      l.loss_description as notes,
      l.status,
      l.created_at,
      l.reported_by as staff_id,
      ps.staff_name
    FROM losses l
    LEFT JOIN pos_staff_sessions ps ON l.reported_by = ps.id
    WHERE l.organization_id = ?
      AND l.incident_date >= ?
      AND l.incident_date <= ?
    ORDER BY l.incident_date DESC
  `;

  const params = [
    orgId,
    format(dateRange.start, 'yyyy-MM-dd'),
    format(dateRange.end, 'yyyy-MM-dd'),
  ];

  return { sql, params };
};

const buildLossItemsQuery = (orgId: string, filters: FilterState) => {
  const { dateRange, categories } = filters;

  // ⚡ تم تصحيح أسماء الأعمدة لتتوافق مع PowerSync Schema
  let sql = `
    SELECT
      li.id,
      li.loss_id,
      li.product_id,
      li.lost_quantity,
      li.total_cost_value as cost_value,
      li.total_selling_value as retail_value,
      li.item_notes as loss_reason,
      COALESCE(li.product_name, p.name) as product_name,
      p.category_id,
      p.unit_type as product_type,
      pc.name as category_name,
      l.loss_type,
      l.incident_date as loss_date
    FROM loss_items li
    INNER JOIN losses l ON li.loss_id = l.id
    LEFT JOIN products p ON li.product_id = p.id
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE l.organization_id = ?
      AND l.incident_date >= ?
      AND l.incident_date <= ?
  `;

  const params: any[] = [
    orgId,
    format(dateRange.start, 'yyyy-MM-dd'),
    format(dateRange.end, 'yyyy-MM-dd'),
  ];

  if (categories.length > 0) {
    sql += ` AND p.category_id IN (${categories.map(() => '?').join(',')})`;
    params.push(...categories);
  }

  return { sql, params };
};

// ==================== Data Processing ====================

const processLossTimeSeries = (
  losses: any[],
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

  // Group losses by date
  const lossesByDate = new Map<string, { costValue: number; retailValue: number; count: number }>();

  losses.forEach((loss) => {
    const dateStr = loss.loss_date || loss.created_at;
    const date = format(parseISO(dateStr), groupPattern);

    if (!lossesByDate.has(date)) {
      lossesByDate.set(date, { costValue: 0, retailValue: 0, count: 0 });
    }

    const data = lossesByDate.get(date)!;
    data.costValue += loss.total_cost_value || 0;
    data.retailValue += loss.total_retail_value || 0;
    data.count += 1;
  });

  return intervals.map((date) => {
    const dateKey = format(date, groupPattern);
    const data = lossesByDate.get(dateKey) || { costValue: 0, retailValue: 0, count: 0 };

    return {
      date: format(date, formatPattern, { locale: ar }),
      value: data.costValue,
      count: data.count,
      label: format(date, 'EEEE d MMMM', { locale: ar }),
    };
  });
};

const processLossByType = (losses: any[]): CategoryBreakdown[] => {
  const typeMap = new Map<string, { costValue: number; retailValue: number; count: number }>();

  losses.forEach((loss) => {
    const type = loss.loss_type || 'other';

    if (!typeMap.has(type)) {
      typeMap.set(type, { costValue: 0, retailValue: 0, count: 0 });
    }

    const t = typeMap.get(type)!;
    t.costValue += loss.total_cost_value || 0;
    t.retailValue += loss.total_retail_value || 0;
    t.count += 1;
  });

  const total = Array.from(typeMap.values()).reduce((sum, t) => sum + t.costValue, 0);

  return Array.from(typeMap.entries())
    .map(([type, data]) => ({
      id: type,
      name: lossTypeLabels[type] || type,
      value: data.costValue,
      count: data.count,
      percentage: total > 0 ? (data.costValue / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

const processLossByCategory = (items: any[]): CategoryBreakdown[] => {
  const categoryMap = new Map<string, { name: string; costValue: number; quantity: number }>();

  items.forEach((item) => {
    const categoryId = item.category_id || 'uncategorized';
    const categoryName = item.category_name || 'بدون تصنيف';

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, { name: categoryName, costValue: 0, quantity: 0 });
    }

    const cat = categoryMap.get(categoryId)!;
    cat.costValue += item.cost_value || 0;
    cat.quantity += item.lost_quantity || 0;
  });

  const total = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.costValue, 0);

  return Array.from(categoryMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      value: data.costValue,
      count: data.quantity,
      percentage: total > 0 ? (data.costValue / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
};

const processTopLossProducts = (items: any[]): LossData['topLossProducts'] => {
  const productMap = new Map<string, {
    name: string;
    quantity: number;
    costValue: number;
    reasons: Map<string, number>
  }>();

  items.forEach((item) => {
    const productId = item.product_id;
    if (!productId) return;

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        name: item.product_name || 'منتج غير معروف',
        quantity: 0,
        costValue: 0,
        reasons: new Map(),
      });
    }

    const p = productMap.get(productId)!;
    p.quantity += item.lost_quantity || 0;
    p.costValue += item.cost_value || 0;

    const reason = item.loss_type || item.loss_reason || 'other';
    p.reasons.set(reason, (p.reasons.get(reason) || 0) + (item.lost_quantity || 0));
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
        lostQuantity: data.quantity,
        costValue: data.costValue,
        topReason: lossTypeLabels[topReason] || topReason,
      };
    })
    .sort((a, b) => b.costValue - a.costValue)
    .slice(0, 10);
};

// ==================== Main Hook ====================

export function useLossAnalytics(filters: FilterState): UseLossAnalyticsReturn {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id || '';

  // Build queries
  const lossesQuery = useMemo(() => buildLossesQuery(orgId, filters), [orgId, filters]);
  const itemsQuery = useMemo(() => buildLossItemsQuery(orgId, filters), [orgId, filters]);

  // Execute queries
  const {
    data: lossesData,
    isLoading: lossesLoading,
    error: lossesError
  } = useQuery(lossesQuery.sql, lossesQuery.params);

  const {
    data: itemsData,
    isLoading: itemsLoading,
    error: itemsError
  } = useQuery(itemsQuery.sql, itemsQuery.params);

  // Process data
  const lossData = useMemo((): LossData | null => {
    if (!lossesData) return null;

    const losses = lossesData as any[];
    const items = (itemsData as any[]) || [];

    // Calculate totals
    const totalLosses = losses.length;
    const totalCostValue = losses.reduce((sum, l) => sum + (l.total_cost_value || 0), 0);
    const totalRetailValue = losses.reduce((sum, l) => sum + (l.total_retail_value || 0), 0);
    const totalLostItems = items.reduce((sum, i) => sum + (i.lost_quantity || 0), 0);

    // Average loss
    const averageLoss = totalLosses > 0 ? totalCostValue / totalLosses : 0;

    // Loss rate would need total inventory value
    const lossRate = 0;

    return {
      totalLosses,
      totalCostValue,
      totalRetailValue,
      totalLostItems,
      averageLoss,
      lossRate,
      lossesByDay: processLossTimeSeries(losses, filters.dateRange),
      lossesByType: processLossByType(losses),
      lossesByCategory: processLossByCategory(items),
      topLossProducts: processTopLossProducts(items),
      lossGrowth: 0,
    };
  }, [lossesData, itemsData, filters.dateRange]);

  return {
    data: lossData,
    isLoading: lossesLoading || itemsLoading,
    error: lossesError || itemsError,
  };
}

export default useLossAnalytics;
