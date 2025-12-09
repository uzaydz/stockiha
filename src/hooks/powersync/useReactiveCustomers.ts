/**
 * ⚡ useReactiveCustomers - PowerSync Reactive Hook
 * ============================================================
 *
 * 🚀 Hook للعملاء مع تحديث تلقائي
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

export interface ReactiveCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  nif: string | null;
  rc: string | null;
  nis: string | null;
  rib: string | null;
}

export interface UseReactiveCustomersOptions {
  searchTerm?: string;
  limit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Main Hook - useReactiveCustomers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للعملاء (Reactive)
 *
 * @example
 * ```tsx
 * const { customers, isLoading } = useReactiveCustomers();
 * // customers يتحدث تلقائياً عند أي تغيير!
 * ```
 */
export function useReactiveCustomers(options: UseReactiveCustomersOptions = {}) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { searchTerm, limit = 500 } = options;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM customers
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    // فلتر البحث
    if (searchTerm && searchTerm.length >= 2) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY name LIMIT ?`;
    queryParams.push(limit);

    return { sql: query, params: queryParams };
  }, [orgId, searchTerm, limit]);

  const { data, isLoading, isFetching, error } = useQuery<ReactiveCustomer>(sql, params);

  return {
    customers: data || [],
    isLoading,
    isFetching,
    error: error || null,
    total: data?.length || 0
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Single Customer Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لعميل واحد (Reactive)
 */
export function useReactiveCustomer(customerId: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !customerId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM customers WHERE id = ? AND organization_id = ? LIMIT 1',
      params: [customerId, orgId]
    };
  }, [customerId, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveCustomer>(sql, params);

  const customer = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0];
  }, [data]);

  return { customer, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Customer by Phone Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook للبحث عن عميل بالهاتف (Reactive)
 */
export function useReactiveCustomerByPhone(phone: string | null) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId || !phone) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }
    return {
      sql: 'SELECT * FROM customers WHERE phone = ? AND organization_id = ? LIMIT 1',
      params: [phone, orgId]
    };
  }, [phone, orgId]);

  const { data, isLoading, error } = useQuery<ReactiveCustomer>(sql, params);

  const customer = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0];
  }, [data]);

  return { customer, isLoading, error: error || null };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Customer Count Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لعدد العملاء (Reactive)
 */
export function useReactiveCustomerCount() {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }
    return {
      sql: 'SELECT COUNT(*) as count FROM customers WHERE organization_id = ?',
      params: [orgId]
    };
  }, [orgId]);

  const { data, isLoading } = useQuery<{ count: number }>(sql, params);

  const count = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Number(data[0].count) || 0;
  }, [data]);

  return { count, isLoading };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 Customer Debts Hook
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🚀 Hook لديون العملاء (Reactive)
 */
export function useReactiveCustomerDebts(customerId?: string) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const { sql, params } = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    if (customerId) {
      return {
        sql: `
          SELECT * FROM customer_debts
          WHERE organization_id = ? AND customer_id = ?
          ORDER BY created_at DESC
        `,
        params: [orgId, customerId]
      };
    }

    return {
      sql: `
        SELECT * FROM customer_debts
        WHERE organization_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `,
      params: [orgId]
    };
  }, [orgId, customerId]);

  const { data, isLoading, error } = useQuery<any>(sql, params);

  return {
    debts: data || [],
    isLoading,
    error: error || null
  };
}

export default useReactiveCustomers;
