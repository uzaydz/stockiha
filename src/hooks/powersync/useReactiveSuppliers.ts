/**
 * ⚡ useReactiveSuppliers - PowerSync Reactive Hook
 * ============================================================
 *
 * 🚀 Hook للموردين مع تحديث تلقائي
 *    - يستخدم useQuery من @powersync/react
 *    - تحديث فوري عند أي تغيير
 *
 * المصادر:
 * - https://docs.powersync.com/usage/use-case-examples/watch-queries
 * ============================================================
 */

import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ReactiveSupplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface UseReactiveSuppliersOptions {
  searchTerm?: string;
  isActive?: boolean;
  limit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactiveSuppliers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للموردين (Reactive)
 *
 * @example
 * ```tsx
 * const { suppliers, isLoading } = useReactiveSuppliers();
 * // suppliers يتحدث تلقائياً عند أي تغيير!
 * ```
 */
export function useReactiveSuppliers(options: UseReactiveSuppliersOptions = {}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { searchTerm, isActive = true, limit = 200 } = options;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM suppliers
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    // فلتر النشط
    if (isActive !== undefined) {
      query += ` AND (is_active = ? OR is_active IS NULL)`;
      queryParams.push(isActive ? 1 : 0);
    }

    // فلتر البحث
    if (searchTerm && searchTerm.length >= 2) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY name LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, searchTerm, isActive, limit]);

  const { data, isLoading, isFetching, error } = useQuery<ReactiveSupplier>(sql, params);

  const suppliers = useMemo(() => {
    if (!data) return [];
    return data.map(s => ({
      ...s,
      is_active: Boolean(s.is_active)
    }));
  }, [data]);

  return {
    suppliers,
    isLoading,
    isFetching,
    error: error || null,
    total: suppliers.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Single Supplier Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لمورد واحد (Reactive)
 */
export function useReactiveSupplier(supplierId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !supplierId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM suppliers WHERE id = ? AND organization_id = ? LIMIT 1',
      params: [supplierId, orgId]
    };
  }, [supplierId, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveSupplier>(sql, params);

  const supplier = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0];
  }, [data]);

  return { supplier, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Supplier Count Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لعدد الموردين (Reactive)
 */
export function useReactiveSupplierCount() {
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
          SUM(CASE WHEN is_active = 1 OR is_active IS NULL THEN 1 ELSE 0 END) as active
        FROM suppliers
        WHERE organization_id = ?
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data, isLoading } = useQuery<{ total: number; active: number }>(sql, params);

  const counts = useMemo(() => {
    if (!data || data.length === 0) {
      return { total: 0, active: 0 };
    }
    return {
      total: Number(data[0].total) || 0,
      active: Number(data[0].active) || 0
    };
  }, [data]);

  return { counts, isLoading };
}

export default useReactiveSuppliers;
