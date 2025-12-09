/**
 * ⚡ useReactiveReturns - PowerSync Reactive Hook
 * ============================================================
 *
 * 🚀 Hook للمرتجعات مع تحديث تلقائي فوري
 *    - يستخدم useQuery من @powersync/react
 *    - تحديث فوري عند أي تغيير (لا polling!)
 *    - أداء عالي جداً
 *
 * ⚠️ ملاحظة: اسم الجدول في PowerSync هو "returns" (ليس product_returns)
 * ============================================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types - متطابقة مع PowerSync Schema
// ═══════════════════════════════════════════════════════════════════════════

export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'processed' | 'completed' | 'cancelled';
export type ReturnType = 'refund' | 'exchange' | 'store_credit' | 'replacement';
export type RefundMethod = 'cash' | 'card' | 'bank_transfer' | 'store_credit' | 'original_method';

export interface ReactiveReturn {
  id: string;
  organization_id: string;
  return_number: string | null;
  original_order_id: string | null;
  original_order_number: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  return_type: ReturnType | null;
  return_reason: string | null;
  return_reason_description: string | null;
  original_total: number;
  return_amount: number;
  refund_amount: number;
  restocking_fee: number;
  status: ReturnStatus;
  approved_by: string | null;
  approved_at: string | null;
  processed_by: string | null;
  processed_at: string | null;
  refund_method: RefundMethod | null;
  notes: string | null;
  internal_notes: string | null;
  requires_manager_approval: boolean;
  created_by: string | null;
  approval_notes: string | null;
  rejection_reason: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseReactiveReturnsOptions {
  status?: ReturnStatus;
  returnType?: ReturnType;
  customerId?: string;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface UseReactiveReturnsResult {
  returns: ReactiveReturn[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  total: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactiveReturns
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للمرتجعات (Reactive) - تحديث فوري!
 *
 * @example
 * ```tsx
 * const { returns, isLoading } = useReactiveReturns({ status: 'pending' });
 * // returns يتحدث تلقائياً عند أي تغيير!
 * ```
 */
export function useReactiveReturns(options: UseReactiveReturnsOptions = {}): UseReactiveReturnsResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { status, returnType, customerId, searchTerm, fromDate, toDate, limit = 100 } = options;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM returns
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    // فلتر الحالة
    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    // فلتر نوع المرتجع
    if (returnType) {
      query += ` AND return_type = ?`;
      queryParams.push(returnType);
    }

    // فلتر العميل
    if (customerId) {
      query += ` AND customer_id = ?`;
      queryParams.push(customerId);
    }

    // فلتر البحث
    if (searchTerm && searchTerm.length >= 2) {
      query += ` AND (
        LOWER(return_number) LIKE LOWER(?) OR
        LOWER(customer_name) LIKE LOWER(?) OR
        LOWER(customer_phone) LIKE LOWER(?) OR
        LOWER(original_order_number) LIKE LOWER(?)
      )`;
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // فلتر التاريخ
    if (fromDate) {
      query += ` AND created_at >= ?`;
      queryParams.push(fromDate);
    }
    if (toDate) {
      query += ` AND created_at <= ?`;
      queryParams.push(toDate);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, status, returnType, customerId, searchTerm, fromDate, toDate, limit]);

  const { data, isLoading, isFetching, error } = useQuery<ReactiveReturn>(sql, params);

  const returns = useMemo(() => {
    if (!data) return [];
    return data.map(r => ({
      ...r,
      original_total: Number(r.original_total) || 0,
      return_amount: Number(r.return_amount) || 0,
      refund_amount: Number(r.refund_amount) || 0,
      restocking_fee: Number(r.restocking_fee) || 0,
      requires_manager_approval: Boolean(r.requires_manager_approval),
    }));
  }, [data]);

  return {
    returns,
    isLoading,
    isFetching,
    error: error || null,
    total: returns.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Single Return Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لمرتجع واحد (Reactive)
 */
export function useReactiveReturn(returnId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !returnId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM returns WHERE id = ? AND organization_id = ? LIMIT 1',
      params: [returnId, orgId]
    };
  }, [returnId, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveReturn>(sql, params);

  const returnItem = useMemo(() => {
    if (!data || data.length === 0) return null;
    const r = data[0];
    return {
      ...r,
      original_total: Number(r.original_total) || 0,
      return_amount: Number(r.return_amount) || 0,
      refund_amount: Number(r.refund_amount) || 0,
      restocking_fee: Number(r.restocking_fee) || 0,
      requires_manager_approval: Boolean(r.requires_manager_approval),
    };
  }, [data]);

  return { returnItem, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Returns Stats Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لإحصائيات المرتجعات (Reactive)
 */
export function useReactiveReturnStats() {
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
          SUM(refund_amount) as total_refund
        FROM returns
        WHERE organization_id = ?
        GROUP BY status
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: statusData, isLoading: statusLoading } = useQuery<{
    status: ReturnStatus;
    count: number;
    total_refund: number;
  }>(statusQuery.sql, statusQuery.params);

  // إحصائيات اليوم
  const todayQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count, 0 as total', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(refund_amount), 0) as total
        FROM returns
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

  const stats = useMemo(() => {
    const byStatus: Record<ReturnStatus, { count: number; amount: number }> = {
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      processed: { count: 0, amount: 0 },
      completed: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    };

    let totalReturns = 0;
    let totalRefunds = 0;

    if (statusData) {
      for (const row of statusData) {
        if (byStatus[row.status]) {
          byStatus[row.status] = {
            count: Number(row.count) || 0,
            amount: Number(row.total_refund) || 0
          };
        }
        totalReturns += Number(row.count) || 0;
        totalRefunds += Number(row.total_refund) || 0;
      }
    }

    return {
      byStatus,
      totalReturns,
      totalRefunds,
      todayReturns: todayData?.[0]?.count ? Number(todayData[0].count) : 0,
      todayRefunds: todayData?.[0]?.total ? Number(todayData[0].total) : 0,
      pendingCount: byStatus.pending.count,
    };
  }, [statusData, todayData]);

  return {
    stats,
    isLoading: statusLoading || todayLoading
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Recent Returns Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لآخر المرتجعات (Reactive)
 */
export function useReactiveRecentReturns(limit: number = 10) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT * FROM returns
        WHERE organization_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      params: [orgId, limit]
    };
  }, [orgId, limit]);

  const { data, isLoading, error } = useQuery<ReactiveReturn>(sql, params);

  return {
    returns: data || [],
    isLoading,
    error: error || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Returns Count Hook (Lightweight)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لعدد المرتجعات فقط (خفيف جداً)
 */
export function useReactiveReturnCount(status?: ReturnStatus) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }

    if (status) {
      return {
        sql: 'SELECT COUNT(*) as count FROM returns WHERE organization_id = ? AND status = ?',
        params: [orgId, status]
      };
    }

    return {
      sql: 'SELECT COUNT(*) as count FROM returns WHERE organization_id = ?',
      params: [orgId]
    };
  }, [orgId, status]);

  const { data, isLoading } = useQuery<{ count: number }>(sql, params);

  return {
    count: data?.[0]?.count ? Number(data[0].count) : 0,
    isLoading
  };
}

export default useReactiveReturns;
