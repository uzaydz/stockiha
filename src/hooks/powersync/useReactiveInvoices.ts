/**
 * ⚡ useReactiveInvoices - PowerSync Reactive Hook
 * ============================================================
 *
 * 🚀 Hook للفواتير مع تحديث تلقائي فوري
 *    - يستخدم useQuery من @powersync/react
 *    - تحديث فوري عند أي تغيير (لا polling!)
 *    - أداء عالي جداً
 *
 * ============================================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export type InvoiceStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'draft';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'check' | 'credit' | 'other';

export interface ReactiveInvoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_nif: string | null;
  customer_rc: string | null;
  order_id: string | null;
  order_number: string | null;
  subtotal: number;
  subtotal_amount: number;
  tax: number;
  tax_amount: number;
  discount: number;
  discount_amount: number;
  discount_type: string | null;
  discount_percentage: number | null;
  total_amount: number;
  tva_rate: number | null;
  amount_ht: number | null;
  amount_tva: number | null;
  amount_ttc: number | null;
  invoice_date: string | null;
  due_date: string | null;
  status: InvoiceStatus;
  payment_status: PaymentStatus | null;
  payment_method: PaymentMethod | null;
  is_paid: boolean;
  paid_at: string | null;
  paid_amount: number | null;
  remaining_amount: number | null;
  source_type: string | null;
  notes: string | null;
  items: string | null; // JSON string
  currency: string;
  created_by: string | null;
  printed_at: string | null;
  print_count: number;
  created_at: string;
  updated_at: string;
}

export interface UseReactiveInvoicesOptions {
  status?: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface UseReactiveInvoicesResult {
  invoices: ReactiveInvoice[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  total: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactiveInvoices
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للفواتير (Reactive) - تحديث فوري!
 *
 * @example
 * ```tsx
 * const { invoices, isLoading } = useReactiveInvoices({ status: 'pending' });
 * // invoices يتحدث تلقائياً عند أي تغيير!
 * ```
 */
export function useReactiveInvoices(options: UseReactiveInvoicesOptions = {}): UseReactiveInvoicesResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { status, paymentStatus, customerId, searchTerm, fromDate, toDate, limit = 100 } = options;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM invoices
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    // فلتر الحالة
    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    // فلتر حالة الدفع
    if (paymentStatus) {
      query += ` AND payment_status = ?`;
      queryParams.push(paymentStatus);
    }

    // فلتر العميل
    if (customerId) {
      query += ` AND customer_id = ?`;
      queryParams.push(customerId);
    }

    // فلتر البحث
    if (searchTerm && searchTerm.length >= 2) {
      query += ` AND (
        LOWER(invoice_number) LIKE LOWER(?) OR
        LOWER(customer_name) LIKE LOWER(?) OR
        LOWER(customer_phone) LIKE LOWER(?)
      )`;
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // فلتر التاريخ
    if (fromDate) {
      query += ` AND (invoice_date >= ? OR created_at >= ?)`;
      queryParams.push(fromDate, fromDate);
    }
    if (toDate) {
      query += ` AND (invoice_date <= ? OR created_at <= ?)`;
      queryParams.push(toDate, toDate);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, status, paymentStatus, customerId, searchTerm, fromDate, toDate, limit]);

  const { data, isLoading, isFetching, error } = useQuery<ReactiveInvoice>(sql, params);

  const invoices = useMemo(() => {
    if (!data) return [];
    return data.map(inv => ({
      ...inv,
      subtotal: Number(inv.subtotal) || Number(inv.subtotal_amount) || 0,
      subtotal_amount: Number(inv.subtotal_amount) || Number(inv.subtotal) || 0,
      tax: Number(inv.tax) || Number(inv.tax_amount) || 0,
      tax_amount: Number(inv.tax_amount) || Number(inv.tax) || 0,
      discount: Number(inv.discount) || Number(inv.discount_amount) || 0,
      discount_amount: Number(inv.discount_amount) || Number(inv.discount) || 0,
      total_amount: Number(inv.total_amount) || 0,
      tva_rate: inv.tva_rate ? Number(inv.tva_rate) : null,
      amount_ht: inv.amount_ht ? Number(inv.amount_ht) : null,
      amount_tva: inv.amount_tva ? Number(inv.amount_tva) : null,
      amount_ttc: inv.amount_ttc ? Number(inv.amount_ttc) : null,
      discount_percentage: inv.discount_percentage ? Number(inv.discount_percentage) : null,
      paid_amount: inv.paid_amount ? Number(inv.paid_amount) : null,
      remaining_amount: inv.remaining_amount ? Number(inv.remaining_amount) : null,
      is_paid: Boolean(inv.is_paid),
      print_count: Number(inv.print_count) || 0,
      currency: inv.currency || 'DZD',
    }));
  }, [data]);

  return {
    invoices,
    isLoading,
    isFetching,
    error: error || null,
    total: invoices.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Single Invoice Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لفاتورة واحدة (Reactive)
 */
export function useReactiveInvoice(invoiceId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !invoiceId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM invoices WHERE id = ? AND organization_id = ? LIMIT 1',
      params: [invoiceId, orgId]
    };
  }, [invoiceId, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveInvoice>(sql, params);

  const invoice = useMemo(() => {
    if (!data || data.length === 0) return null;
    const inv = data[0];
    return {
      ...inv,
      subtotal: Number(inv.subtotal) || Number(inv.subtotal_amount) || 0,
      subtotal_amount: Number(inv.subtotal_amount) || Number(inv.subtotal) || 0,
      tax: Number(inv.tax) || Number(inv.tax_amount) || 0,
      tax_amount: Number(inv.tax_amount) || Number(inv.tax) || 0,
      discount: Number(inv.discount) || Number(inv.discount_amount) || 0,
      discount_amount: Number(inv.discount_amount) || Number(inv.discount) || 0,
      total_amount: Number(inv.total_amount) || 0,
      is_paid: Boolean(inv.is_paid),
      print_count: Number(inv.print_count) || 0,
      currency: inv.currency || 'DZD',
    };
  }, [data]);

  return { invoice, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Invoice by Number Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للبحث عن فاتورة برقمها (Reactive)
 */
export function useReactiveInvoiceByNumber(invoiceNumber: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !invoiceNumber) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM invoices WHERE invoice_number = ? AND organization_id = ? LIMIT 1',
      params: [invoiceNumber, orgId]
    };
  }, [invoiceNumber, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveInvoice>(sql, params);

  const invoice = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0];
  }, [data]);

  return { invoice, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Invoice Stats Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لإحصائيات الفواتير (Reactive)
 */
export function useReactiveInvoiceStats() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  // إحصائيات حسب الحالة
  const statusQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          status,
          COUNT(*) as count,
          SUM(total_amount) as total_amount
        FROM invoices
        WHERE organization_id = ?
        GROUP BY status
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: statusData, isLoading: statusLoading } = useQuery<{
    status: InvoiceStatus;
    count: number;
    total_amount: number;
  }>(statusQuery.sql, statusQuery.params);

  // إحصائيات حسب حالة الدفع
  const paymentQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          payment_status,
          COUNT(*) as count,
          SUM(total_amount) as total_amount
        FROM invoices
        WHERE organization_id = ?
        GROUP BY payment_status
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: paymentData, isLoading: paymentLoading } = useQuery<{
    payment_status: PaymentStatus | null;
    count: number;
    total_amount: number;
  }>(paymentQuery.sql, paymentQuery.params);

  // إحصائيات اليوم
  const todayQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count, 0 as total', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total
        FROM invoices
        WHERE organization_id = ?
          AND date(created_at) = date('now')
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: todayData, isLoading: todayLoading } = useQuery<{
    count: number;
    total: number;
  }>(todayQuery.sql, todayQuery.params);

  // الفواتير المتأخرة
  const overdueQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count, 0 as total', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as total
        FROM invoices
        WHERE organization_id = ?
          AND due_date < date('now')
          AND (status = 'pending' OR payment_status = 'pending' OR payment_status = 'partial')
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: overdueData, isLoading: overdueLoading } = useQuery<{
    count: number;
    total: number;
  }>(overdueQuery.sql, overdueQuery.params);

  const stats = useMemo(() => {
    const byStatus: Record<InvoiceStatus, { count: number; amount: number }> = {
      draft: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      partial: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    };

    const byPayment: Record<string, { count: number; amount: number }> = {
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      partial: { count: 0, amount: 0 },
      refunded: { count: 0, amount: 0 },
    };

    let totalInvoices = 0;
    let totalAmount = 0;

    if (statusData) {
      for (const row of statusData) {
        if (byStatus[row.status]) {
          byStatus[row.status] = {
            count: Number(row.count) || 0,
            amount: Number(row.total_amount) || 0
          };
        }
        totalInvoices += Number(row.count) || 0;
        totalAmount += Number(row.total_amount) || 0;
      }
    }

    if (paymentData) {
      for (const row of paymentData) {
        const key = row.payment_status || 'pending';
        if (byPayment[key]) {
          byPayment[key] = {
            count: Number(row.count) || 0,
            amount: Number(row.total_amount) || 0
          };
        }
      }
    }

    return {
      byStatus,
      byPayment,
      totalInvoices,
      totalAmount,
      todayInvoices: todayData?.[0]?.count ? Number(todayData[0].count) : 0,
      todayAmount: todayData?.[0]?.total ? Number(todayData[0].total) : 0,
      overdueInvoices: overdueData?.[0]?.count ? Number(overdueData[0].count) : 0,
      overdueAmount: overdueData?.[0]?.total ? Number(overdueData[0].total) : 0,
      pendingCount: byStatus.pending.count,
      paidAmount: byPayment.paid.amount,
    };
  }, [statusData, paymentData, todayData, overdueData]);

  return {
    stats,
    isLoading: statusLoading || paymentLoading || todayLoading || overdueLoading
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Recent Invoices Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لآخر الفواتير (Reactive)
 */
export function useReactiveRecentInvoices(limit: number = 10) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT * FROM invoices
        WHERE organization_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      params: [orgId, limit]
    };
  }, [orgId, limit]);

  const { data, isLoading, error } = useQuery<ReactiveInvoice>(sql, params);

  return {
    invoices: data || [],
    isLoading,
    error: error || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Customer Invoices Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لفواتير عميل معين (Reactive)
 */
export function useReactiveCustomerInvoices(customerId: string | null, limit: number = 50) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !customerId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT * FROM invoices
        WHERE organization_id = ? AND customer_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      params: [orgId, customerId, limit]
    };
  }, [orgId, customerId, limit]);

  const { data, isLoading, error } = useQuery<ReactiveInvoice>(sql, params);

  return {
    invoices: data || [],
    isLoading,
    error: error || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Invoice Count Hook (Lightweight)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لعدد الفواتير فقط (خفيف جداً)
 */
export function useReactiveInvoiceCount(status?: InvoiceStatus) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }

    if (status) {
      return {
        sql: 'SELECT COUNT(*) as count FROM invoices WHERE organization_id = ? AND status = ?',
        params: [orgId, status]
      };
    }

    return {
      sql: 'SELECT COUNT(*) as count FROM invoices WHERE organization_id = ?',
      params: [orgId]
    };
  }, [orgId, status]);

  const { data, isLoading } = useQuery<{ count: number }>(sql, params);

  return {
    count: data?.[0]?.count ? Number(data[0].count) : 0,
    isLoading
  };
}

export default useReactiveInvoices;
