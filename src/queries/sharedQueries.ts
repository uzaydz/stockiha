/**
 * ⚡ Shared Queries - WatchedQuery Implementation
 * ============================================================
 *
 * 🚀 استخدام WatchedQuery للـ queries المشتركة بين عدة components:
 *   - Caching ذكي
 *   - مشاركة البيانات بدون إعادة الاستعلام
 *   - تحديث تلقائي عند تغيير البيانات
 *
 * الاستخدام:
 * ```tsx
 * import { useWatchedProducts, useWatchedCategories } from '@/queries/sharedQueries';
 *
 * function MyComponent() {
 *   const { data: products, isLoading } = useWatchedProducts(orgId);
 *   const { data: categories } = useWatchedCategories(orgId);
 * }
 * ```
 *
 * المصادر:
 * - https://docs.powersync.com/usage/use-case-examples/watch-queries
 * ============================================================
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { usePowerSync } from '@powersync/react';
import type { PowerSyncDatabase } from '@powersync/web';

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WatchedQueryResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export interface WatchedQueryOptions {
  enabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 Core Watch Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ⚡ useWatchedQuery - Core hook for watched queries with caching
 */
export function useWatchedQuery<T = any>(
  sql: string,
  params: any[] = [],
  options: WatchedQueryOptions = {}
): WatchedQueryResult<T> {
  const { enabled = true } = options;
  const db = usePowerSync();

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ⚡ Watch the query
  useEffect(() => {
    if (!enabled || !db || !sql) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Create abort controller for cleanup
    const abortController = new AbortController();

    const watchQuery = async () => {
      try {
        // Initial fetch
        const result = await db.getAll<T>(sql, params);
        if (!abortController.signal.aborted) {
          setData(result);
          setIsLoading(false);
        }

        // Setup watch for changes
        const unsubscribe = db.watch(sql, params, {
          onResult: (results) => {
            if (!abortController.signal.aborted) {
              setData(results.rows?._array || []);
            }
          },
          onError: (err) => {
            if (!abortController.signal.aborted) {
              console.error('[WatchedQuery] Watch error:', err);
              setError(err);
            }
          }
        });

        // Cleanup on unmount
        return () => {
          abortController.abort();
          if (unsubscribe && typeof unsubscribe === 'function') {
            unsubscribe();
          }
        };
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('[WatchedQuery] Initial fetch error:', err);
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    const cleanup = watchQuery();

    return () => {
      abortController.abort();
      cleanup?.then(fn => fn?.());
    };
  }, [db, sql, JSON.stringify(params), enabled]);

  const refresh = useCallback(() => {
    // Trigger re-fetch by updating state
    setIsLoading(true);
    if (db) {
      db.getAll<T>(sql, params)
        .then(result => {
          setData(result);
          setIsLoading(false);
        })
        .catch(err => {
          setError(err);
          setIsLoading(false);
        });
    }
  }, [db, sql, params]);

  return { data, isLoading, error, refresh };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Products Watched Query
// ═══════════════════════════════════════════════════════════════════════════

export function useWatchedProducts(
  organizationId: string | null,
  options: {
    categoryId?: string;
    search?: string;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  const { categoryId, search, limit = 500, enabled = true } = options;

  const { sql, params } = useMemo(() => {
    if (!organizationId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM products
      WHERE organization_id = ?
        AND (is_active = 1 OR is_active IS NULL)
    `;
    const queryParams: any[] = [organizationId];

    if (categoryId) {
      query += ` AND category_id = ?`;
      queryParams.push(categoryId);
    }

    if (search && search.length >= 2) {
      query += ` AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY name LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [organizationId, categoryId, search, limit]);

  return useWatchedQuery(sql, params, { enabled: enabled && !!organizationId });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Categories Watched Query
// ═══════════════════════════════════════════════════════════════════════════

export function useWatchedCategories(
  organizationId: string | null,
  options: WatchedQueryOptions = {}
) {
  const { sql, params } = useMemo(() => {
    if (!organizationId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    return {
      sql: `
        SELECT * FROM product_categories
        WHERE organization_id = ?
          AND (is_active = 1 OR is_active IS NULL)
        ORDER BY name
      `,
      params: [organizationId]
    };
  }, [organizationId]);

  return useWatchedQuery(sql, params, { enabled: options.enabled !== false && !!organizationId });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Customers Watched Query
// ═══════════════════════════════════════════════════════════════════════════

export function useWatchedCustomers(
  organizationId: string | null,
  options: {
    search?: string;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  const { search, limit = 100, enabled = true } = options;

  const { sql, params } = useMemo(() => {
    if (!organizationId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `SELECT * FROM customers WHERE organization_id = ?`;
    const queryParams: any[] = [organizationId];

    if (search && search.length >= 2) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY name LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [organizationId, search, limit]);

  return useWatchedQuery(sql, params, { enabled: enabled && !!organizationId });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Orders Watched Query
// ═══════════════════════════════════════════════════════════════════════════

export function useWatchedOrders(
  organizationId: string | null,
  options: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  const { status, dateFrom, dateTo, limit = 50, enabled = true } = options;

  const { sql, params } = useMemo(() => {
    if (!organizationId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `SELECT * FROM orders WHERE organization_id = ?`;
    const queryParams: any[] = [organizationId];

    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    if (dateFrom) {
      query += ` AND created_at >= ?`;
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND created_at <= ?`;
      queryParams.push(dateTo);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [organizationId, status, dateFrom, dateTo, limit]);

  return useWatchedQuery(sql, params, { enabled: enabled && !!organizationId });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Suppliers Watched Query
// ═══════════════════════════════════════════════════════════════════════════

export function useWatchedSuppliers(
  organizationId: string | null,
  options: {
    search?: string;
    enabled?: boolean;
  } = {}
) {
  const { search, enabled = true } = options;

  const { sql, params } = useMemo(() => {
    if (!organizationId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `SELECT * FROM suppliers WHERE organization_id = ?`;
    const queryParams: any[] = [organizationId];

    if (search && search.length >= 2) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY name`;

    return { sql: query, params: queryParams };
  }, [organizationId, search]);

  return useWatchedQuery(sql, params, { enabled: enabled && !!organizationId });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Expenses Watched Query
// ═══════════════════════════════════════════════════════════════════════════

export function useWatchedExpenses(
  organizationId: string | null,
  options: {
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  const { categoryId, dateFrom, dateTo, limit = 100, enabled = true } = options;

  const { sql, params } = useMemo(() => {
    if (!organizationId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `SELECT * FROM expenses WHERE organization_id = ?`;
    const queryParams: any[] = [organizationId];

    if (categoryId) {
      query += ` AND category_id = ?`;
      queryParams.push(categoryId);
    }

    if (dateFrom) {
      query += ` AND expense_date >= ?`;
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND expense_date <= ?`;
      queryParams.push(dateTo);
    }

    query += ` ORDER BY expense_date DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [organizationId, categoryId, dateFrom, dateTo, limit]);

  return useWatchedQuery(sql, params, { enabled: enabled && !!organizationId });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Staff Watched Query
// ═══════════════════════════════════════════════════════════════════════════

export function useWatchedStaff(
  organizationId: string | null,
  options: {
    activeOnly?: boolean;
    enabled?: boolean;
  } = {}
) {
  const { activeOnly = false, enabled = true } = options;

  const { sql, params } = useMemo(() => {
    if (!organizationId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `SELECT * FROM pos_staff_sessions WHERE organization_id = ?`;
    const queryParams: any[] = [organizationId];

    if (activeOnly) {
      query += ` AND is_active = 1`;
    }

    query += ` ORDER BY staff_name`;

    return { sql: query, params: queryParams };
  }, [organizationId, activeOnly]);

  return useWatchedQuery(sql, params, { enabled: enabled && !!organizationId });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 POS Orders Watched Query
// ═══════════════════════════════════════════════════════════════════════════

export function useWatchedPOSOrders(
  organizationId: string | null,
  options: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  const { status, dateFrom, dateTo, limit = 50, enabled = true } = options;

  const { sql, params } = useMemo(() => {
    if (!organizationId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `SELECT * FROM pos_orders WHERE organization_id = ?`;
    const queryParams: any[] = [organizationId];

    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    if (dateFrom) {
      query += ` AND created_at >= ?`;
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND created_at <= ?`;
      queryParams.push(dateTo);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [organizationId, status, dateFrom, dateTo, limit]);

  return useWatchedQuery(sql, params, { enabled: enabled && !!organizationId });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 Invoices Watched Query
// ═══════════════════════════════════════════════════════════════════════════

export function useWatchedInvoices(
  organizationId: string | null,
  options: {
    status?: string;
    supplierId?: string;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  const { status, supplierId, limit = 50, enabled = true } = options;

  const { sql, params } = useMemo(() => {
    if (!organizationId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `SELECT * FROM invoices WHERE organization_id = ?`;
    const queryParams: any[] = [organizationId];

    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }

    if (supplierId) {
      query += ` AND supplier_id = ?`;
      queryParams.push(supplierId);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [organizationId, status, supplierId, limit]);

  return useWatchedQuery(sql, params, { enabled: enabled && !!organizationId });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 Export All
// ═══════════════════════════════════════════════════════════════════════════

export default {
  useWatchedQuery,
  useWatchedProducts,
  useWatchedCategories,
  useWatchedCustomers,
  useWatchedOrders,
  useWatchedSuppliers,
  useWatchedExpenses,
  useWatchedStaff,
  useWatchedPOSOrders,
  useWatchedInvoices,
};
