/**
 * ⚡ useReactiveLosses - PowerSync Reactive Hook
 * ============================================================
 *
 * 🚀 Hook للخسائر/التصريحات مع تحديث تلقائي فوري
 *    - يستخدم useQuery من @powersync/react
 *    - تحديث فوري عند أي تغيير (لا polling!)
 *    - أداء عالي جداً
 *
 * ⚠️ ملاحظة: اسم الجدول في PowerSync هو "losses" (ليس loss_declarations)
 * ============================================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types - متطابقة مع PowerSync Schema
// ═══════════════════════════════════════════════════════════════════════════

export type LossStatus = 'pending' | 'approved' | 'rejected' | 'processed' | 'completed';
export type LossType = 'damage' | 'theft' | 'expiry' | 'other' | 'breakage' | 'spoilage';

export interface ReactiveLoss {
  id: string;
  organization_id: string;
  loss_number: string | null;
  loss_type: LossType | null;
  loss_category: string | null;
  loss_description: string | null;
  incident_date: string | null;
  reported_by: string | null;
  witness_employee_id: string | null;
  witness_name: string | null;
  requires_manager_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  status: LossStatus;
  total_cost_value: number;
  total_selling_value: number;
  total_items_count: number;
  location_description: string | null;
  external_reference: string | null;
  insurance_claim: boolean;
  insurance_reference: string | null;
  notes: string | null;
  internal_notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseReactiveLossesOptions {
  status?: LossStatus;
  lossType?: LossType;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface UseReactiveLossesResult {
  losses: ReactiveLoss[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  total: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactiveLosses
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للخسائر (Reactive) - تحديث فوري!
 *
 * @example
 * ```tsx
 * const { losses, isLoading } = useReactiveLosses({ status: 'pending' });
 * // losses يتحدث تلقائياً عند أي تغيير!
 * ```
 */
export function useReactiveLosses(options: UseReactiveLossesOptions = {}): UseReactiveLossesResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { status, lossType, searchTerm, fromDate, toDate, limit = 100 } = options;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM losses
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    // فلتر الحالة
    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    // فلتر نوع الخسارة
    if (lossType) {
      query += ` AND loss_type = ?`;
      queryParams.push(lossType);
    }

    // فلتر البحث
    if (searchTerm && searchTerm.length >= 2) {
      query += ` AND (
        LOWER(loss_number) LIKE LOWER(?) OR
        LOWER(loss_description) LIKE LOWER(?) OR
        LOWER(loss_category) LIKE LOWER(?) OR
        LOWER(location_description) LIKE LOWER(?)
      )`;
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // فلتر التاريخ
    if (fromDate) {
      query += ` AND (incident_date >= ? OR created_at >= ?)`;
      queryParams.push(fromDate, fromDate);
    }
    if (toDate) {
      query += ` AND (incident_date <= ? OR created_at <= ?)`;
      queryParams.push(toDate, toDate);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, status, lossType, searchTerm, fromDate, toDate, limit]);

  const { data, isLoading, isFetching, error } = useQuery<ReactiveLoss>(sql, params);

  const losses = useMemo(() => {
    if (!data) return [];
    return data.map(l => ({
      ...l,
      total_cost_value: Number(l.total_cost_value) || 0,
      total_selling_value: Number(l.total_selling_value) || 0,
      total_items_count: Number(l.total_items_count) || 0,
      requires_manager_approval: Boolean(l.requires_manager_approval),
      insurance_claim: Boolean(l.insurance_claim),
    }));
  }, [data]);

  return {
    losses,
    isLoading,
    isFetching,
    error: error || null,
    total: losses.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Single Loss Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لخسارة واحدة (Reactive)
 */
export function useReactiveLoss(lossId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !lossId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM losses WHERE id = ? AND organization_id = ? LIMIT 1',
      params: [lossId, orgId]
    };
  }, [lossId, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveLoss>(sql, params);

  const loss = useMemo(() => {
    if (!data || data.length === 0) return null;
    const l = data[0];
    return {
      ...l,
      total_cost_value: Number(l.total_cost_value) || 0,
      total_selling_value: Number(l.total_selling_value) || 0,
      total_items_count: Number(l.total_items_count) || 0,
      requires_manager_approval: Boolean(l.requires_manager_approval),
      insurance_claim: Boolean(l.insurance_claim),
    };
  }, [data]);

  return { loss, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Losses Stats Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لإحصائيات الخسائر (Reactive)
 */
export function useReactiveLossStats() {
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
          SUM(total_cost_value) as total_cost,
          SUM(total_selling_value) as total_selling,
          SUM(total_items_count) as total_items
        FROM losses
        WHERE organization_id = ?
        GROUP BY status
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: statusData, isLoading: statusLoading } = useQuery<{
    status: LossStatus;
    count: number;
    total_cost: number;
    total_selling: number;
    total_items: number;
  }>(statusQuery.sql, statusQuery.params);

  // إحصائيات حسب النوع
  const typeQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT
          loss_type,
          COUNT(*) as count,
          SUM(total_cost_value) as total_cost
        FROM losses
        WHERE organization_id = ?
        GROUP BY loss_type
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: typeData, isLoading: typeLoading } = useQuery<{
    loss_type: LossType;
    count: number;
    total_cost: number;
  }>(typeQuery.sql, typeQuery.params);

  // إحصائيات اليوم
  const todayQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count, 0 as total', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(total_cost_value), 0) as total
        FROM losses
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
    const byStatus: Record<LossStatus, { count: number; costValue: number; sellingValue: number; items: number }> = {
      pending: { count: 0, costValue: 0, sellingValue: 0, items: 0 },
      approved: { count: 0, costValue: 0, sellingValue: 0, items: 0 },
      rejected: { count: 0, costValue: 0, sellingValue: 0, items: 0 },
      processed: { count: 0, costValue: 0, sellingValue: 0, items: 0 },
      completed: { count: 0, costValue: 0, sellingValue: 0, items: 0 },
    };

    const byType: Record<string, { count: number; costValue: number }> = {};

    let totalLosses = 0;
    let totalCostValue = 0;
    let totalSellingValue = 0;
    let totalItems = 0;

    if (statusData) {
      for (const row of statusData) {
        if (byStatus[row.status]) {
          byStatus[row.status] = {
            count: Number(row.count) || 0,
            costValue: Number(row.total_cost) || 0,
            sellingValue: Number(row.total_selling) || 0,
            items: Number(row.total_items) || 0
          };
        }
        totalLosses += Number(row.count) || 0;
        totalCostValue += Number(row.total_cost) || 0;
        totalSellingValue += Number(row.total_selling) || 0;
        totalItems += Number(row.total_items) || 0;
      }
    }

    if (typeData) {
      for (const row of typeData) {
        byType[row.loss_type] = {
          count: Number(row.count) || 0,
          costValue: Number(row.total_cost) || 0
        };
      }
    }

    return {
      byStatus,
      byType,
      totalLosses,
      totalCostValue,
      totalSellingValue,
      totalItems,
      todayLosses: todayData?.[0]?.count ? Number(todayData[0].count) : 0,
      todayCostValue: todayData?.[0]?.total ? Number(todayData[0].total) : 0,
      pendingCount: byStatus.pending.count,
    };
  }, [statusData, typeData, todayData]);

  return {
    stats,
    isLoading: statusLoading || typeLoading || todayLoading
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Recent Losses Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لآخر الخسائر (Reactive)
 */
export function useReactiveRecentLosses(limit: number = 10) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT * FROM losses
        WHERE organization_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      params: [orgId, limit]
    };
  }, [orgId, limit]);

  const { data, isLoading, error } = useQuery<ReactiveLoss>(sql, params);

  return {
    losses: data || [],
    isLoading,
    error: error || null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Loss Count Hook (Lightweight)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لعدد الخسائر فقط (خفيف جداً)
 */
export function useReactiveLossCount(status?: LossStatus) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }

    if (status) {
      return {
        sql: 'SELECT COUNT(*) as count FROM losses WHERE organization_id = ? AND status = ?',
        params: [orgId, status]
      };
    }

    return {
      sql: 'SELECT COUNT(*) as count FROM losses WHERE organization_id = ?',
      params: [orgId]
    };
  }, [orgId, status]);

  const { data, isLoading } = useQuery<{ count: number }>(sql, params);

  return {
    count: data?.[0]?.count ? Number(data[0].count) : 0,
    isLoading
  };
}

export default useReactiveLosses;
