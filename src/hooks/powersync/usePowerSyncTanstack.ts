/**
 * ⚡ usePowerSyncTanstack - TanStack Query Integration
 * ============================================================
 *
 * 🚀 دمج PowerSync مع TanStack Query للحصول على:
 *   - Caching من TanStack Query
 *   - Reactivity من PowerSync
 *   - أفضل ما في العالمين!
 *
 * الاستخدام:
 * ```tsx
 * import { usePowerSyncTanstack } from '@/hooks/powersync/usePowerSyncTanstack';
 *
 * function MyComponent() {
 *   const { data, isLoading } = usePowerSyncTanstack({
 *     queryKey: ['products', orgId],
 *     query: {
 *       sql: 'SELECT * FROM products WHERE organization_id = ?',
 *       parameters: [orgId],
 *     },
 *   });
 * }
 * ```
 *
 * المصادر:
 * - https://docs.powersync.com/client-sdk-references/javascript-web/javascript-spa-frameworks
 * - https://www.powersync.com/blog/sqlite-optimizations-for-ultra-high-performance
 * ============================================================
 */

import { useCallback, useMemo } from 'react';
import { useQuery as useTanstackQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useQuery as usePowerSyncQuery, usePowerSync } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface PowerSyncQueryOptions<T = any> {
  sql: string;
  parameters?: any[];
}

export interface UsePowerSyncTanstackOptions<T = any> {
  queryKey: QueryKey;
  query: PowerSyncQueryOptions<T>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
}

export interface UsePowerSyncTanstackResult<T = any> {
  data: T[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - TanStack + PowerSync Integration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚡ usePowerSyncTanstack
 *
 * يجمع بين:
 * - PowerSync reactivity (تحديث تلقائي عند تغيير البيانات)
 * - TanStack Query caching (تخزين مؤقت ذكي)
 */
export function usePowerSyncTanstack<T = any>(
  options: UsePowerSyncTanstackOptions<T>
): UsePowerSyncTanstackResult<T> {
  const {
    queryKey,
    query,
    enabled = true,
    staleTime = Infinity, // لا حاجة لـ refetch - PowerSync يدير التحديثات
    gcTime = 30 * 60 * 1000, // 30 دقيقة
    refetchOnWindowFocus = false,
  } = options;

  const queryClient = useQueryClient();

  // ⚡ استخدام PowerSync reactive query
  const {
    data: powerSyncData,
    isLoading: powerSyncLoading,
    error: powerSyncError,
  } = usePowerSyncQuery<T>(
    enabled ? query.sql : 'SELECT 1 WHERE 0',
    enabled ? (query.parameters || []) : []
  );

  // ⚡ TanStack Query للـ caching والـ state management
  const tanstackQuery = useTanstackQuery({
    queryKey,
    queryFn: async () => {
      // البيانات تأتي من PowerSync مباشرة
      return powerSyncData || [];
    },
    enabled: enabled && !powerSyncLoading,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    // تحديث البيانات عند تغيير powerSyncData
    initialData: powerSyncData as T[] | undefined,
  });

  // ⚡ تحديث TanStack cache عند تغيير PowerSync data
  useMemo(() => {
    if (powerSyncData && enabled) {
      queryClient.setQueryData(queryKey, powerSyncData);
    }
  }, [powerSyncData, queryKey, queryClient, enabled]);

  // ⚡ Refetch function
  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // ⚡ Invalidate function
  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    data: powerSyncData as T[] | undefined,
    isLoading: powerSyncLoading,
    isFetching: tanstackQuery.isFetching,
    isRefetching: tanstackQuery.isRefetching,
    error: powerSyncError || tanstackQuery.error || null,
    refetch,
    invalidate,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Specialized Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚡ useProductsTanstack - Products with TanStack caching
 */
export function useProductsTanstack(options: {
  categoryId?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { categoryId, search, limit = 100, enabled = true } = options;

  const query = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', parameters: [] };
    }

    let sql = `
      SELECT * FROM products
      WHERE organization_id = ?
        AND (is_active = 1 OR is_active IS NULL)
    `;
    const params: any[] = [orgId];

    if (categoryId) {
      sql += ` AND category_id = ?`;
      params.push(categoryId);
    }

    if (search && search.length >= 2) {
      sql += ` AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY name LIMIT ?`;
    params.push(limit);

    return { sql, parameters: params };
  }, [orgId, categoryId, search, limit]);

  return usePowerSyncTanstack({
    queryKey: ['products-tanstack', orgId, categoryId, search, limit],
    query,
    enabled: enabled && !!orgId,
  });
}

/**
 * ⚡ useOrdersTanstack - Orders with TanStack caching
 */
export function useOrdersTanstack(options: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { status, dateFrom, dateTo, limit = 50, enabled = true } = options;

  const query = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', parameters: [] };
    }

    let sql = `SELECT * FROM orders WHERE organization_id = ?`;
    const params: any[] = [orgId];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (dateFrom) {
      sql += ` AND created_at >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ` AND created_at <= ?`;
      params.push(dateTo);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    return { sql, parameters: params };
  }, [orgId, status, dateFrom, dateTo, limit]);

  return usePowerSyncTanstack({
    queryKey: ['orders-tanstack', orgId, status, dateFrom, dateTo, limit],
    query,
    enabled: enabled && !!orgId,
  });
}

/**
 * ⚡ useCustomersTanstack - Customers with TanStack caching
 */
export function useCustomersTanstack(options: {
  search?: string;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { search, limit = 100, enabled = true } = options;

  const query = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', parameters: [] };
    }

    let sql = `SELECT * FROM customers WHERE organization_id = ?`;
    const params: any[] = [orgId];

    if (search && search.length >= 2) {
      sql += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY name LIMIT ?`;
    params.push(limit);

    return { sql, parameters: params };
  }, [orgId, search, limit]);

  return usePowerSyncTanstack({
    queryKey: ['customers-tanstack', orgId, search, limit],
    query,
    enabled: enabled && !!orgId,
  });
}

/**
 * ⚡ useCategoriesTanstack - Categories with TanStack caching
 */
export function useCategoriesTanstack(options: {
  enabled?: boolean;
} = {}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { enabled = true } = options;

  const query = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', parameters: [] };
    }

    return {
      sql: `
        SELECT * FROM product_categories
        WHERE organization_id = ?
          AND (is_active = 1 OR is_active IS NULL)
        ORDER BY name
      `,
      parameters: [orgId],
    };
  }, [orgId]);

  return usePowerSyncTanstack({
    queryKey: ['categories-tanstack', orgId],
    query,
    enabled: enabled && !!orgId,
  });
}

/**
 * ⚡ useExpensesTanstack - Expenses with TanStack caching
 */
export function useExpensesTanstack(options: {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { dateFrom, dateTo, categoryId, limit = 100, enabled = true } = options;

  const query = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', parameters: [] };
    }

    let sql = `SELECT * FROM expenses WHERE organization_id = ?`;
    const params: any[] = [orgId];

    if (categoryId) {
      sql += ` AND category_id = ?`;
      params.push(categoryId);
    }

    if (dateFrom) {
      sql += ` AND expense_date >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ` AND expense_date <= ?`;
      params.push(dateTo);
    }

    sql += ` ORDER BY expense_date DESC LIMIT ?`;
    params.push(limit);

    return { sql, parameters: params };
  }, [orgId, categoryId, dateFrom, dateTo, limit]);

  return usePowerSyncTanstack({
    queryKey: ['expenses-tanstack', orgId, categoryId, dateFrom, dateTo, limit],
    query,
    enabled: enabled && !!orgId,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 Exports
// ═══════════════════════════════════════════════════════════════════════════

export default usePowerSyncTanstack;
