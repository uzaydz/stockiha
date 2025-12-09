/**
 * ⚡ useReactiveOrdersWithDebts - PowerSync Reactive Hook with Pagination
 * ============================================================
 *
 * 🚀 Hook للطلبات مع ديون (payment_status = pending أو partial)
 *    - يستخدم useQuery من @powersync/react
 *    - تحديث فوري عند أي تغيير (لا polling!)
 *    - نظام Pagination لتحسين الأداء (10 عملاء لكل صفحة)
 *    - أداء عالي جداً
 *
 * ============================================================
 */

import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ReactiveOrderWithDebt {
  id: string;
  customer_order_number: number | null;
  global_order_number: number | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  tax: number;
  discount: number | null;
  total: number;
  amount_paid: number;
  remaining_amount: number;
  status: string;
  payment_method: string | null;
  payment_status: string;
  notes: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  employee_id: string | null;
  employee_name: string | null;
  is_online: boolean;
}

export interface UseReactiveOrdersWithDebtsOptions {
  customerId?: string;
  limit?: number;
  offset?: number;
}

export interface UseReactiveOrdersWithDebtsResult {
  orders: ReactiveOrderWithDebt[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  total: number;
  stats: {
    totalDebts: number;
    totalPartialPayments: number;
    totalOrders: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactiveOrdersWithDebts
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للطلبات مع ديون (Reactive) - تحديث فوري!
 */
export function useReactiveOrdersWithDebts(options: UseReactiveOrdersWithDebtsOptions = {}): UseReactiveOrdersWithDebtsResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { customerId, limit = 100, offset = 0 } = options;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    // ⚡ استعلام محسّن لجلب الطلبات التي عليها ديون
    // - يجب أن يكون هناك مبلغ متبقي
    // - الطلب ليس ملغياً
    let query = `
      SELECT
        o.id,
        o.customer_order_number,
        o.global_order_number,
        o.customer_id,
        o.subtotal,
        o.tax,
        o.discount,
        o.total,
        o.amount_paid,
        o.remaining_amount,
        o.status,
        o.payment_method,
        o.payment_status,
        o.notes,
        o.organization_id,
        o.created_at,
        o.updated_at,
        o.employee_id,
        o.is_online,
        c.name as customer_name,
        c.phone as customer_phone,
        COALESCE(o.created_by_staff_name, u.name, 'غير محدد') as employee_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.employee_id = u.id
      WHERE o.organization_id = ?
        AND o.remaining_amount > 0
        AND o.status != 'cancelled'
        AND (o.payment_status = 'pending' OR o.payment_status = 'partial' OR o.payment_status != 'paid')
    `;
    const queryParams: any[] = [orgId];

    // فلتر بالعميل
    if (customerId) {
      query += ` AND o.customer_id = ?`;
      queryParams.push(customerId);
    }

    query += ` ORDER BY o.remaining_amount DESC, o.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    return { sql: query, params: queryParams };
  }, [orgId, customerId, limit, offset]);

  const { data, isLoading, isFetching, error } = useQuery<ReactiveOrderWithDebt>(sql, params);

  const orders = useMemo(() => {
    if (!data) return [];
    return data.map(o => ({
      ...o,
      subtotal: Number(o.subtotal) || 0,
      tax: Number(o.tax) || 0,
      discount: o.discount ? Number(o.discount) : null,
      total: Number(o.total) || 0,
      amount_paid: Number(o.amount_paid) || 0,
      remaining_amount: Number(o.remaining_amount) || 0,
      is_online: Boolean(o.is_online),
    }));
  }, [data]);

  const stats = useMemo(() => {
    const totalDebts = orders.reduce((sum, o) => sum + o.remaining_amount, 0);
    const totalPartialPayments = orders.filter(o => o.amount_paid > 0 && o.remaining_amount > 0).length;

    return {
      totalDebts,
      totalPartialPayments,
      totalOrders: orders.length
    };
  }, [orders]);

  return {
    orders,
    isLoading,
    isFetching,
    error: error || null,
    total: orders.length,
    stats
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Debts Stats Hook - للإحصائيات الكلية (بدون pagination)
// ═══════════════════════════════════════════════════════════════════════════

export interface DebtsGlobalStats {
  totalDebts: number;
  totalCustomers: number;
  totalOrders: number;
}

/**
 * 🚀 Hook للإحصائيات الكلية للديون
 */
export function useReactiveDebtsGlobalStats(): { stats: DebtsGlobalStats; isLoading: boolean } {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    // ⚡ إحصائيات محسّنة للديون
    // - يجب أن يكون هناك عميل مسجل (لأن صفحة المديونيات تعرض العملاء)
    // - يجب أن يكون هناك مبلغ متبقي
    return {
      sql: `
        SELECT
          COALESCE(SUM(remaining_amount), 0) as total_debts,
          COUNT(DISTINCT customer_id) as total_customers,
          COUNT(*) as total_orders
        FROM orders
        WHERE organization_id = ?
          AND customer_id IS NOT NULL
          AND remaining_amount > 0
          AND status != 'cancelled'
          AND (payment_status = 'pending' OR payment_status = 'partial' OR payment_status != 'paid')
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data, isLoading } = useQuery<{
    total_debts: number;
    total_customers: number;
    total_orders: number;
  }>(sql, params);

  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return { totalDebts: 0, totalCustomers: 0, totalOrders: 0 };
    }
    return {
      totalDebts: Number(data[0].total_debts) || 0,
      totalCustomers: Number(data[0].total_customers) || 0,
      totalOrders: Number(data[0].total_orders) || 0
    };
  }, [data]);

  return { stats, isLoading };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Paginated Customer Debts Hook
// ═══════════════════════════════════════════════════════════════════════════

export interface CustomerDebtSummary {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  totalDebts: number;
  ordersCount: number;
}

export interface UsePaginatedCustomerDebtsOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
}

export interface UsePaginatedCustomerDebtsResult {
  customers: CustomerDebtSummary[];
  isLoading: boolean;
  error: Error | null;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCustomers: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
}

/**
 * 🚀 Hook لقائمة العملاء المدينين مع Pagination
 */
export function usePaginatedCustomerDebts(options: UsePaginatedCustomerDebtsOptions = {}): UsePaginatedCustomerDebtsResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { pageSize = 10, searchQuery = '' } = options;
  const [currentPage, setCurrentPage] = useState(options.page || 1);

  // جلب عدد العملاء الكلي
  const { sql: countSql, params: countParams } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }

    // ⚡ شروط المديونية المحسّنة:
    // 1. يجب أن يكون هناك مبلغ متبقي
    // 2. يجب أن يكون هناك عميل مسجل (ليس زائر)
    // 3. حالة الدفع إما pending أو partial أو أي حالة مع مبلغ متبقي
    let query = `
      SELECT COUNT(DISTINCT o.customer_id) as count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.organization_id = ?
        AND o.customer_id IS NOT NULL
        AND o.remaining_amount > 0
        AND o.status != 'cancelled'
        AND (o.payment_status = 'pending' OR o.payment_status = 'partial' OR o.payment_status != 'paid')
    `;
    const params: any[] = [orgId];

    if (searchQuery.trim()) {
      query += ` AND (c.name LIKE ? OR c.phone LIKE ?)`;
      const searchPattern = `%${searchQuery.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    return { sql: query, params };
  }, [orgId, searchQuery]);

  const { data: countData } = useQuery<{ count: number }>(countSql, countParams);
  const totalCustomers = countData?.[0]?.count || 0;
  const totalPages = Math.ceil(totalCustomers / pageSize);

  // جلب العملاء للصفحة الحالية
  const offset = (currentPage - 1) * pageSize;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    // ⚡ استعلام محسّن لجلب العملاء المدينين
    // - يجب أن يكون هناك عميل مسجل
    // - يجب أن يكون هناك مبلغ متبقي > 0
    // - الطلب ليس ملغياً
    let query = `
      SELECT
        o.customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        SUM(o.remaining_amount) as total_debts,
        COUNT(*) as orders_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.organization_id = ?
        AND o.customer_id IS NOT NULL
        AND o.remaining_amount > 0
        AND o.status != 'cancelled'
        AND (o.payment_status = 'pending' OR o.payment_status = 'partial' OR o.payment_status != 'paid')
    `;
    const queryParams: any[] = [orgId];

    if (searchQuery.trim()) {
      query += ` AND (c.name LIKE ? OR c.phone LIKE ?)`;
      const searchPattern = `%${searchQuery.trim()}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    query += `
      GROUP BY o.customer_id, c.name, c.phone
      ORDER BY total_debts DESC
      LIMIT ? OFFSET ?
    `;
    queryParams.push(pageSize, offset);

    return { sql: query, params: queryParams };
  }, [orgId, searchQuery, pageSize, offset]);

  const { data, isLoading, error } = useQuery<{
    customer_id: string;
    customer_name: string;
    customer_phone: string | null;
    total_debts: number;
    orders_count: number;
  }>(sql, params);

  const customers: CustomerDebtSummary[] = useMemo(() => {
    if (!data) return [];
    return data.map(row => ({
      customerId: row.customer_id || 'unknown',
      customerName: row.customer_name || 'عميل غير معروف',
      customerPhone: row.customer_phone,
      totalDebts: Number(row.total_debts) || 0,
      ordersCount: Number(row.orders_count) || 0
    }));
  }, [data]);

  // دوال التنقل
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  return {
    customers,
    isLoading,
    error: error || null,
    pagination: {
      currentPage,
      pageSize,
      totalCustomers,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    },
    goToPage,
    nextPage,
    prevPage
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Customer Orders Hook - طلبات عميل محدد
// ═══════════════════════════════════════════════════════════════════════════

export interface CustomerOrderDebt {
  orderId: string;
  orderNumber: string;
  date: string;
  total: number;
  amountPaid: number;
  remainingAmount: number;
  employee: string;
}

/**
 * 🚀 Hook لجلب طلبات عميل محدد (Lazy Loading)
 */
export function useCustomerOrdersDebts(customerId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  // ⚡ Debug log
  console.log('[useCustomerOrdersDebts] Called with:', { customerId, orgId });

  const { sql, params } = useMemo(() => {
    if (!orgId || !customerId || customerId === 'unknown') {
      console.log('[useCustomerOrdersDebts] Skipping query - missing params:', { orgId, customerId });
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    console.log('[useCustomerOrdersDebts] Building query for customer:', customerId);
    // ⚡ استعلام محسّن لجلب طلبات العميل التي عليها ديون
    return {
      sql: `
        SELECT
          o.id,
          o.customer_order_number,
          o.global_order_number,
          o.total,
          o.amount_paid,
          o.remaining_amount,
          o.created_at,
          o.payment_status,
          COALESCE(o.created_by_staff_name, u.name, 'غير محدد') as employee_name
        FROM orders o
        LEFT JOIN users u ON o.employee_id = u.id
        WHERE o.organization_id = ?
          AND o.customer_id = ?
          AND o.remaining_amount > 0
          AND o.status != 'cancelled'
          AND (o.payment_status = 'pending' OR o.payment_status = 'partial' OR o.payment_status != 'paid')
        ORDER BY o.created_at DESC
        LIMIT 50
      `,
      params: [orgId, customerId]
    };
  }, [orgId, customerId]);

  const { data, isLoading, error } = useQuery<{
    id: string;
    customer_order_number: number | null;
    global_order_number: number | null;
    total: number;
    amount_paid: number;
    remaining_amount: number;
    created_at: string;
    employee_name: string;
  }>(sql, params);

  // ⚡ Debug log
  console.log('[useCustomerOrdersDebts] Query result:', {
    customerId,
    dataLength: data?.length || 0,
    isLoading,
    error,
    firstOrder: data?.[0]
  });

  const orders: CustomerOrderDebt[] = useMemo(() => {
    if (!data) return [];
    return data.map(o => {
      // ⚡ استخدام global_order_number أو customer_order_number
      const orderNum = o.global_order_number
        ? `#${o.global_order_number}`
        : o.customer_order_number
          ? `#${o.customer_order_number}`
          : `طلب-${new Date(o.created_at).getTime().toString().slice(-6)}`;

      return {
        orderId: o.id,
        orderNumber: orderNum,
        date: o.created_at,
        total: Number(o.total) || 0,
        amountPaid: Number(o.amount_paid) || 0,
        remainingAmount: Number(o.remaining_amount) || 0,
        employee: o.employee_name || 'غير محدد'
      };
    });
  }, [data]);

  return {
    orders,
    isLoading,
    error: error || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Complete Customer Debts Data Hook (للتوافق مع الكود القديم)
// ═══════════════════════════════════════════════════════════════════════════

export interface CustomerDebtsComplete {
  customerId: string;
  customerName: string;
  totalDebt: number;
  ordersCount: number;
  orders: Array<{
    orderId: string;
    orderNumber: string;
    date: string;
    total: number;
    amountPaid: number;
    remainingAmount: number;
    employee: string;
  }>;
}

/**
 * 🚀 Hook لبيانات ديون العملاء الكاملة (Reactive) - للتوافق مع الكود القديم
 * ⚠️ استخدم usePaginatedCustomerDebts للأداء الأفضل
 */
export function useReactiveCustomerDebtsComplete() {
  const { stats: globalStats, isLoading: loadingGlobalStats } = useReactiveDebtsGlobalStats();
  const { customers, isLoading: loadingCustomers, pagination } = usePaginatedCustomerDebts({ pageSize: 10 });
  const { orders, isLoading: loadingOrders } = useReactiveOrdersWithDebts({ limit: 100 });

  // بناء customerDebts من البيانات المتاحة
  const customerDebts: CustomerDebtsComplete[] = useMemo(() => {
    // تجميع الطلبات حسب العميل
    const customerMap = new Map<string, CustomerDebtsComplete>();

    // أولاً: إضافة العملاء من قائمة العملاء المدينين
    customers.forEach(c => {
      customerMap.set(c.customerId, {
        customerId: c.customerId,
        customerName: c.customerName,
        totalDebt: c.totalDebts,
        ordersCount: c.ordersCount,
        orders: []
      });
    });

    // ثانياً: إضافة الطلبات لكل عميل
    orders.forEach(order => {
      const key = order.customer_id || 'unknown';
      const customer = customerMap.get(key);

      if (customer) {
        const orderNum = order.global_order_number
          ? `#${order.global_order_number}`
          : order.customer_order_number
            ? `#${order.customer_order_number}`
            : `طلب-${new Date(order.created_at).getTime().toString().slice(-6)}`;

        customer.orders.push({
          orderId: order.id,
          orderNumber: orderNum,
          date: order.created_at,
          total: order.total,
          amountPaid: order.amount_paid,
          remainingAmount: order.remaining_amount,
          employee: order.employee_name || 'غير محدد'
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [customers, orders]);

  return {
    customerDebts,
    debtsByCustomer: customers,
    stats: {
      totalDebts: globalStats.totalDebts,
      totalPartialPayments: globalStats.totalOrders,
      totalOrders: globalStats.totalOrders
    },
    pagination,
    isLoading: loadingGlobalStats || loadingCustomers || loadingOrders
  };
}

export default useReactiveOrdersWithDebts;
