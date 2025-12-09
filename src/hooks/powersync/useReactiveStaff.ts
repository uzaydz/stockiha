/**
 * ⚡ useReactiveStaff - v2.0 (PowerSync Reactive)
 * ============================================================
 *
 * 🚀 Hook للموظفين يستخدم:
 *   - useQuery من @powersync/react (reactive)
 *   - تحديث تلقائي عند أي تغيير
 *   - لا يستخدم getAll() أبداً
 *
 * ============================================================
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';
import type { POSStaffSession } from '@/types/staff';

// ========================================
// 📦 Types
// ========================================

export interface ReactiveStaff {
  id: string;
  staff_name: string;
  pin_code?: string;
  permissions: string[];
  is_active: boolean;
  has_pin: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface UseReactiveStaffOptions {
  activeOnly?: boolean;
  search?: string;
  enabled?: boolean;
}

export interface UseReactiveStaffResult {
  staff: ReactiveStaff[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  activeCount: number;
  refetch: () => void;
}

// ========================================
// 🎯 Main Hook
// ========================================

export function useReactiveStaff(options: UseReactiveStaffOptions = {}): UseReactiveStaffResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { activeOnly = false, search, enabled = true } = options;

  // ⚡ بناء الاستعلام ديناميكياً
  const { sql, params } = useMemo(() => {
    if (!orgId || !enabled) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM pos_staff_sessions
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    // فلتر النشط فقط
    if (activeOnly) {
      query += ` AND is_active = 1`;
    }

    // فلتر البحث
    if (search && search.length >= 2) {
      query += ` AND staff_name LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY staff_name`;

    return { sql: query, params: queryParams };
  }, [orgId, activeOnly, search, enabled]);

  // ⚡ Reactive Query
  const { data, isLoading, error } = useQuery<any>(sql, params);

  // تحويل البيانات
  const staff = useMemo((): ReactiveStaff[] => {
    if (!data) return [];
    return data.map((s: any) => ({
      id: s.id,
      staff_name: s.staff_name,
      pin_code: s.pin_code,
      permissions: s.permissions ? (typeof s.permissions === 'string' ? JSON.parse(s.permissions) : s.permissions) : [],
      is_active: Boolean(s.is_active),
      has_pin: Boolean(s.has_pin || s.pin_code),
      organization_id: s.organization_id,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));
  }, [data]);

  const total = staff.length;
  const activeCount = staff.filter(s => s.is_active).length;

  const refetch = useCallback(() => {
    // مع PowerSync، البيانات تتحدث تلقائياً
    console.log('[useReactiveStaff] Data refreshes automatically via PowerSync');
  }, []);

  return {
    staff,
    isLoading,
    error: error || null,
    total,
    activeCount,
    refetch,
  };
}

// ========================================
// 🔧 Single Staff Hook
// ========================================

export function useReactiveStaffMember(staffId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !staffId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM pos_staff_sessions WHERE id = ? AND organization_id = ? LIMIT 1',
      params: [staffId, orgId],
    };
  }, [staffId, orgId]);

  const { data, isLoading, error } = useQuery<any>(sql, params);

  const staffMember = useMemo((): ReactiveStaff | null => {
    if (!data || data.length === 0) return null;
    const s = data[0];
    return {
      id: s.id,
      staff_name: s.staff_name,
      pin_code: s.pin_code,
      permissions: s.permissions ? (typeof s.permissions === 'string' ? JSON.parse(s.permissions) : s.permissions) : [],
      is_active: Boolean(s.is_active),
      has_pin: Boolean(s.has_pin || s.pin_code),
      organization_id: s.organization_id,
      created_at: s.created_at,
      updated_at: s.updated_at,
    };
  }, [data]);

  return { staffMember, isLoading, error: error || null };
}

// ========================================
// 🔧 Staff Count Hook
// ========================================

export function useReactiveStaffCount() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as total, 0 as active', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
        FROM pos_staff_sessions
        WHERE organization_id = ?
      `,
      params: [orgId],
    };
  }, [orgId]);

  const { data, isLoading } = useQuery<{ total: number; active: number }>(sql, params);

  return {
    total: data?.[0]?.total ? Number(data[0].total) : 0,
    active: data?.[0]?.active ? Number(data[0].active) : 0,
    isLoading,
  };
}

// ========================================
// 🔧 Work Sessions Hook
// ========================================

export interface ReactiveWorkSession {
  id: string;
  staff_id: string;
  staff_name?: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'ended';
  total_sales?: number;
  total_orders?: number;
  organization_id: string;
}

export function useReactiveWorkSessions(options: {
  staffId?: string;
  status?: 'active' | 'ended';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
} = {}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { staffId, status, dateFrom, dateTo, limit = 50 } = options;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT ws.*, pss.staff_name
      FROM staff_work_sessions ws
      LEFT JOIN pos_staff_sessions pss ON ws.staff_id = pss.id
      WHERE ws.organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    if (staffId) {
      query += ` AND ws.staff_id = ?`;
      queryParams.push(staffId);
    }

    if (status) {
      query += ` AND ws.status = ?`;
      queryParams.push(status);
    }

    if (dateFrom) {
      query += ` AND ws.start_time >= ?`;
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND ws.start_time <= ?`;
      queryParams.push(dateTo);
    }

    query += ` ORDER BY ws.start_time DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, staffId, status, dateFrom, dateTo, limit]);

  const { data, isLoading, error } = useQuery<any>(sql, params);

  const sessions = useMemo((): ReactiveWorkSession[] => {
    if (!data) return [];
    return data.map((s: any) => ({
      id: s.id,
      staff_id: s.staff_id,
      staff_name: s.staff_name,
      start_time: s.start_time,
      end_time: s.end_time,
      status: s.status || (s.end_time ? 'ended' : 'active'),
      total_sales: s.total_sales ? Number(s.total_sales) : undefined,
      total_orders: s.total_orders ? Number(s.total_orders) : undefined,
      organization_id: s.organization_id,
    }));
  }, [data]);

  return {
    sessions,
    isLoading,
    error: error || null,
    total: sessions.length,
  };
}

// ========================================
// 🔧 Active Work Session Hook
// ========================================

export function useActiveWorkSession(staffId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !staffId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: `
        SELECT ws.*, pss.staff_name
        FROM staff_work_sessions ws
        LEFT JOIN pos_staff_sessions pss ON ws.staff_id = pss.id
        WHERE ws.organization_id = ?
          AND ws.staff_id = ?
          AND ws.status = 'active'
        ORDER BY ws.start_time DESC
        LIMIT 1
      `,
      params: [orgId, staffId],
    };
  }, [orgId, staffId]);

  const { data, isLoading, error } = useQuery<any>(sql, params);

  const session = useMemo((): ReactiveWorkSession | null => {
    if (!data || data.length === 0) return null;
    const s = data[0];
    return {
      id: s.id,
      staff_id: s.staff_id,
      staff_name: s.staff_name,
      start_time: s.start_time,
      end_time: s.end_time,
      status: 'active',
      total_sales: s.total_sales ? Number(s.total_sales) : undefined,
      total_orders: s.total_orders ? Number(s.total_orders) : undefined,
      organization_id: s.organization_id,
    };
  }, [data]);

  return {
    session,
    hasActiveSession: !!session,
    isLoading,
    error: error || null,
  };
}

export default useReactiveStaff;
