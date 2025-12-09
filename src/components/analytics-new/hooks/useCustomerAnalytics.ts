/**
 * ============================================
 * STOCKIHA ANALYTICS - CUSTOMER DATA HOOK
 * جلب وتحليل بيانات العملاء
 * ============================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/tenant';
import type { FilterState, CustomerData, DebtData, TopCustomer, RFMSegmentType } from '../types';
import { parseISO, differenceInDays } from 'date-fns';

// ==================== Types ====================

export interface UseCustomerAnalyticsReturn {
  customerData: CustomerData | null;
  debtData: DebtData | null;
  isLoading: boolean;
  error: Error | null;
}

// ==================== SQL Queries ====================

const buildCustomersQuery = (orgId: string) => {
  const sql = `
    SELECT
      c.id,
      c.name,
      c.phone,
      c.email,
      c.address,
      c.created_at
    FROM customers c
    WHERE c.organization_id = ?
    ORDER BY c.name
  `;

  return { sql, params: [orgId] };
};

const buildCustomerOrdersQuery = (orgId: string, filters: FilterState) => {
  const { dateRange } = filters;

  const sql = `
    SELECT
      o.id,
      o.customer_id,
      o.total as order_total,
      o.created_at,
      o.status,
      o.payment_method,
      o.pos_order_type as sale_type,
      c.name as customer_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.organization_id = ?
      AND o.status IN ('completed', 'delivered')
      AND o.created_at >= ?
      AND o.created_at <= ?
      AND o.customer_id IS NOT NULL
    ORDER BY o.created_at DESC
  `;

  const params = [orgId, dateRange.start.toISOString(), dateRange.end.toISOString()];

  return { sql, params };
};

const buildDebtsQuery = (orgId: string) => {
  // ⚡ تم التعديل لجلب الديون من جدول orders مباشرة
  // المصدر الحقيقي للديون هو الطلبات ذات المبالغ المتبقية (remaining_amount > 0)
  const sql = `
    SELECT
      o.id as order_id,
      o.customer_id,
      o.total as amount,
      o.amount_paid as paid_amount,
      o.remaining_amount,
      o.created_at as due_date, -- نستخدم وقت الإنشاء كمرجع
      o.payment_status as status,
      o.created_at,
      c.name as customer_name,
      c.phone as customer_phone
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.organization_id = ?
      AND o.remaining_amount > 0.01
    ORDER BY o.remaining_amount DESC
  `;

  return { sql, params: [orgId] };
};

// ==================== RFM Analysis ====================

interface RFMScores {
  customerId: string;
  recency: number;
  frequency: number;
  monetary: number;
  rScore: number;
  fScore: number;
  mScore: number;
  segment: RFMSegmentType;
}

const calculateRFMScores = (
  customers: any[],
  orders: any[],
  referenceDate: Date
): RFMScores[] => {
  const customerOrders = new Map<string, { orders: any[]; totalSpent: number; lastPurchase: Date | null }>();

  orders.forEach((order) => {
    const customerId = order.customer_id;
    if (!customerId) return;

    if (!customerOrders.has(customerId)) {
      customerOrders.set(customerId, { orders: [], totalSpent: 0, lastPurchase: null });
    }

    const data = customerOrders.get(customerId)!;
    data.orders.push(order);
    data.totalSpent += (order.order_total || 0);

    const orderDate = parseISO(order.created_at);
    if (!data.lastPurchase || orderDate > data.lastPurchase) {
      data.lastPurchase = orderDate;
    }
  });

  const rfmValues: RFMScores[] = [];

  customers.forEach((customer) => {
    const orderData = customerOrders.get(customer.id);

    const recency = orderData?.lastPurchase
      ? differenceInDays(referenceDate, orderData.lastPurchase)
      : 365;

    const frequency = orderData?.orders.length || 0;
    const monetary = orderData?.totalSpent || 0;

    rfmValues.push({
      customerId: customer.id,
      recency,
      frequency,
      monetary,
      rScore: 0,
      fScore: 0,
      mScore: 0,
      segment: 'at_risk',
    });
  });

  const assignScore = (values: number[], value: number, isInverse: boolean = false): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const index = sorted.findIndex((v) => v >= value);
    const percentile = index >= 0 ? index / sorted.length : 0;

    let score = Math.ceil(percentile * 5);
    if (score === 0) score = 1;
    return isInverse ? 6 - score : score;
  };

  const recencyValues = rfmValues.map((r) => r.recency);
  const frequencyValues = rfmValues.map((r) => r.frequency);
  const monetaryValues = rfmValues.map((r) => r.monetary);

  rfmValues.forEach((rfm) => {
    rfm.rScore = assignScore(recencyValues, rfm.recency, true);
    rfm.fScore = assignScore(frequencyValues, rfm.frequency);
    rfm.mScore = assignScore(monetaryValues, rfm.monetary);

    if (rfm.rScore >= 4 && rfm.fScore >= 4 && rfm.mScore >= 4) {
      rfm.segment = 'champions';
    } else if (rfm.rScore >= 3 && rfm.fScore >= 3) {
      rfm.segment = 'loyal';
    } else if (rfm.rScore >= 4 && rfm.fScore <= 2) {
      rfm.segment = 'new';
    } else if (rfm.rScore >= 3 && rfm.mScore >= 3) {
      rfm.segment = 'potential';
    } else if (rfm.rScore <= 2 && rfm.fScore >= 3) {
      rfm.segment = 'at_risk';
    } else {
      rfm.segment = 'lost';
    }
  });

  return rfmValues;
};

// ==================== Data Processing ====================

const processCustomerData = (
  customers: any[],
  orders: any[],
  filters: FilterState
): CustomerData => {
  const totalCustomers = customers.length;

  const customerIdsWithOrders = new Set(orders.map((o) => o.customer_id).filter(Boolean));
  const activeCustomers = customerIdsWithOrders.size;

  const newCustomers = customers.filter((c) => {
    const createdAt = parseISO(c.created_at);
    return createdAt >= filters.dateRange.start && createdAt <= filters.dateRange.end;
  }).length;

  // Customer Types
  const typeMap = new Map<string, { count: number; totalSpent: number }>();
  const typeLabels: Record<string, string> = {
    retail: 'تجزئة',
    wholesale: 'جملة',
    partial_wholesale: 'نصف جملة',
    regular: 'عادي',
  };

  const customerSpending = new Map<string, number>();
  orders.forEach((o) => {
    if (o.customer_id) {
      customerSpending.set(o.customer_id, (customerSpending.get(o.customer_id) || 0) + (o.order_total || 0));
    }
  });

  customers.forEach((c) => {
    const spent = customerSpending.get(c.id) || 0;
    let type = 'regular';
    if (spent >= 100000) type = 'wholesale';
    else if (spent >= 50000) type = 'partial_wholesale';
    else if (spent > 0) type = 'retail';

    if (!typeMap.has(type)) {
      typeMap.set(type, { count: 0, totalSpent: 0 });
    }
    const t = typeMap.get(type)!;
    t.count += 1;
    t.totalSpent += spent;
  });

  // Top Customers
  const customerOrderStats = new Map<string, { count: number; lastPurchase: string | null }>();
  orders.forEach((o) => {
    if (o.customer_id) {
      const current = customerOrderStats.get(o.customer_id) || { count: 0, lastPurchase: null };
      current.count += 1;
      if (!current.lastPurchase || o.created_at > current.lastPurchase) {
        current.lastPurchase = o.created_at;
      }
      customerOrderStats.set(o.customer_id, current);
    }
  });

  const topCustomers: TopCustomer[] = customers
    .map((c) => {
      const spent = customerSpending.get(c.id) || 0;
      const stats = customerOrderStats.get(c.id) || { count: 0, lastPurchase: null };
      return {
        customerId: c.id,
        customerName: c.name || 'غير مسمى',
        phone: c.phone || 'بدون رقم',
        totalPurchases: spent,
        ordersCount: stats.count,
        averageOrderValue: stats.count > 0 ? spent / stats.count : 0,
        lastOrderDate: stats.lastPurchase || '',
        segment: 'regular' as const
      };
    })
    .filter((c) => c.totalPurchases > 0)
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 10);

  // Averages
  const totalRevenue = orders.reduce((sum, o) => sum + (o.order_total || 0), 0);
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const customerLifetimeValue = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

  // RFM
  const rfmScores = calculateRFMScores(customers, orders, new Date());
  const rfmSegments: Record<RFMSegmentType, number> = {
    champions: 0,
    loyal: 0,
    potential: 0,
    new: 0,
    at_risk: 0,
    lost: 0,
  };
  rfmScores.forEach((rfm) => {
    if (rfmSegments[rfm.segment] !== undefined) {
      rfmSegments[rfm.segment]++;
    }
  });

  // ⚡ Calculate Rates with Rounding
  const retentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;
  const churnRate = totalCustomers > 0 ? ((totalCustomers - activeCustomers) / totalCustomers) * 100 : 0;

  return {
    totalCustomers,
    newCustomers,
    activeCustomers,
    inactiveCustomers: totalCustomers - activeCustomers,
    customerGrowth: 0,
    retentionRate: Number(retentionRate.toFixed(1)), // ⚡ ROUNDED
    churnRate: Number(churnRate.toFixed(1)), // ⚡ ROUNDED
    averageCustomerValue: averageOrderValue,
    customerLifetimeValue,
    topCustomers,
    customersByType: [],
    rfmSegments
  } as unknown as CustomerData;
};

const processDebtData = (debts: any[]): DebtData => {
  let totalReceivables = 0;
  let paidReceivables = 0;
  let overdueReceivables = 0;

  const customerDebtMap = new Map<string, {
    name: string;
    phone: string;
    total: number;
    paid: number;
    remaining: number;
    count: number;
    oldestDate: string | null;
  }>();

  const today = new Date();
  const debtorsSet = new Set<string>();

  debts.forEach((debt) => {
    const amount = Number(debt.amount) || 0;
    const paid = Number(debt.paid_amount) || 0;
    const remaining = Number(debt.remaining_amount) || (amount - paid);
    const dueDate = debt.due_date ? parseISO(debt.due_date) : null;
    const createdAt = debt.created_at;

    totalReceivables += amount;
    paidReceivables += paid;

    if (remaining > 0.01) {
      debtorsSet.add(debt.customer_id);
      if (dueDate && differenceInDays(today, dueDate) > 30) {
        overdueReceivables += remaining;
      } else if (createdAt && differenceInDays(today, parseISO(createdAt)) > 30) {
        overdueReceivables += remaining;
      }
    }

    const customerId = debt.customer_id;
    if (customerId) {
      if (!customerDebtMap.has(customerId)) {
        customerDebtMap.set(customerId, {
          name: debt.customer_name || 'غير معروف',
          phone: debt.customer_phone,
          total: 0,
          paid: 0,
          remaining: 0,
          count: 0,
          oldestDate: null
        });
      }
      const c = customerDebtMap.get(customerId)!;
      c.total += amount;
      c.paid += paid;
      c.remaining += remaining;
      c.count += 1;
      if (!c.oldestDate || (createdAt && createdAt < c.oldestDate)) {
        c.oldestDate = createdAt;
      }
    }
  });

  const topDebtors = Array.from(customerDebtMap.entries())
    .map(([id, data]) => ({
      customerId: id,
      customerName: data.name,
      phone: data.phone,
      totalDebt: data.remaining,
      paidAmount: data.paid,
      remainingAmount: data.remaining,
      ordersCount: data.count,
      oldestDebtDate: data.oldestDate || '',
      isOverdue: false,
      daysOverdue: 0
    }))
    .filter((d) => d.remainingAmount > 1)
    .sort((a, b) => b.remainingAmount - a.remainingAmount)
    .slice(0, 10);

  const totalOutstanding = totalReceivables - paidReceivables;

  // ⚡ Calculate Collection Rate with Rounding
  const collectionRate = totalReceivables > 0 ? (paidReceivables / totalReceivables) * 100 : 0;

  return {
    totalReceivables: totalOutstanding,
    receivablesCount: debtorsSet.size,
    overdueReceivables,
    collectionRate: Number(collectionRate.toFixed(1)), // ⚡ ROUNDED
    averageCollectionDays: 0,
    totalPayables: 0,
    payablesCount: 0,
    overduePayables: 0,
    netDebtPosition: totalOutstanding,
    totalDebt: totalReceivables,
    paidDebt: paidReceivables,
    remainingDebt: totalOutstanding,
    overdueDebt: overdueReceivables,
    debtsByCustomer: topDebtors.map(d => ({
      name: d.customerName,
      value: d.remainingAmount
    })),
    topDebtors: topDebtors
  } as unknown as DebtData;
};

// ==================== Main Hook ====================

export function useCustomerAnalytics(filters: FilterState): UseCustomerAnalyticsReturn {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id || '';

  const customersQuery = useMemo(() => buildCustomersQuery(orgId), [orgId]);
  const ordersQuery = useMemo(() => buildCustomerOrdersQuery(orgId, filters), [orgId, filters]);
  const debtsQuery = useMemo(() => buildDebtsQuery(orgId), [orgId]);

  const { data: customersData, isLoading: customersLoading, error: customersError } = useQuery(customersQuery.sql, customersQuery.params);
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery(ordersQuery.sql, ordersQuery.params);
  const { data: debtsData, isLoading: debtsLoading, error: debtsError } = useQuery(debtsQuery.sql, debtsQuery.params);

  const { customerData, debtData } = useMemo(() => {
    if (!customersData) return { customerData: null, debtData: null };

    const customers = customersData as any[];
    const orders = (ordersData as any[]) || [];
    const debts = (debtsData as any[]) || [];

    return {
      customerData: processCustomerData(customers, orders, filters),
      debtData: processDebtData(debts),
    };
  }, [customersData, ordersData, debtsData, filters]);

  return {
    customerData,
    debtData,
    isLoading: customersLoading || ordersLoading || debtsLoading,
    error: customersError || ordersError || debtsError,
  };
}

export default useCustomerAnalytics;
