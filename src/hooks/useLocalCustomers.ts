/**
 * ⚡ useLocalCustomers - v2.0 (PowerSync Reactive)
 * ============================================================
 *
 * 🚀 Hook للعملاء المحلية يستخدم:
 *   - useQuery من @powersync/react (reactive)
 *   - تحديث تلقائي عند أي تغيير
 *   - لا يستخدم getAll() أبداً
 *
 * ============================================================
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';
import { unifiedCustomerService } from '@/services/UnifiedCustomerService';
import type { Customer } from '@/services/UnifiedCustomerService';

// ========================================
// 📦 Types
// ========================================

export interface CustomerWithStats extends Customer {
  total_orders?: number;
  total_spent?: number;
  total_debt?: number;
}

export interface CustomerFilters {
  search?: string;
  has_debt?: boolean;
}

export interface CustomerStats {
  total: number;
  with_debt: number;
  total_debt: number;
}

export interface UseLocalCustomersOptions {
  filters?: CustomerFilters;
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

export interface UseLocalCustomersResult {
  customers: CustomerWithStats[];
  loading: boolean;
  error: Error | null;
  total: number;
  page: number;
  hasMore: boolean;

  // Actions
  refetch: () => Promise<void>;
  setPage: (page: number) => void;
  setFilters: (filters: CustomerFilters) => void;
  search: (query: string) => Promise<Customer[]>;

  // Single customer
  getCustomer: (id: string) => Promise<CustomerWithStats | null>;
  getByPhone: (phone: string) => Promise<Customer | null>;

  // CRUD
  createCustomer: (data: Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer | null>;
  deleteCustomer: (id: string) => Promise<boolean>;

  // Debt
  customersWithDebt: CustomerWithStats[];
  loadCustomersWithDebt: () => Promise<void>;

  // Stats
  stats: CustomerStats | null;
  loadStats: () => Promise<void>;

  // Top customers
  topCustomers: CustomerWithStats[];
  loadTopCustomers: () => Promise<void>;
}

// ========================================
// 🎯 Main Hook
// ========================================

export function useLocalCustomers(options: UseLocalCustomersOptions = {}): UseLocalCustomersResult {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const {
    filters: initialFilters = {},
    page: initialPage = 1,
    limit = 50,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [filters, setFiltersState] = useState<CustomerFilters>(initialFilters);

  // ⚡ استعلام العملاء (Reactive)
  const customersQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    let query = `
      SELECT * FROM customers
      WHERE organization_id = ?
    `;
    const queryParams: any[] = [orgId];

    // فلتر البحث
    if (filters.search && filters.search.length >= 2) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${filters.search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query += ` ORDER BY name LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    return { sql: query, params: queryParams };
  }, [orgId, filters, page, limit]);

  const { data: customersData, isLoading, error: queryError } = useQuery<Customer>(
    customersQuery.sql,
    customersQuery.params
  );

  // ⚡ استعلام العدد الإجمالي
  const countQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }

    let query = `SELECT COUNT(*) as count FROM customers WHERE organization_id = ?`;
    const queryParams: any[] = [orgId];

    if (filters.search && filters.search.length >= 2) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${filters.search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    return { sql: query, params: queryParams };
  }, [orgId, filters]);

  const { data: countData } = useQuery<{ count: number }>(countQuery.sql, countQuery.params);

  // ⚡ استعلام الإحصائيات
  const statsQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as total, 0 as with_debt, 0 as total_debt', params: [] };
    }
    return {
      sql: `
        SELECT
          COUNT(*) as total,
          0 as with_debt,
          0 as total_debt
        FROM customers
        WHERE organization_id = ?
      `,
      params: [orgId]
    };
  }, [orgId]);

  const { data: statsData } = useQuery<any>(statsQuery.sql, statsQuery.params);

  // تحويل البيانات
  const customers = useMemo((): CustomerWithStats[] => {
    if (!customersData) return [];
    return customersData.map(c => ({
      ...c,
      total_orders: 0,
      total_spent: 0,
      total_debt: 0
    }));
  }, [customersData]);

  const total = countData?.[0]?.count ? Number(countData[0].count) : 0;
  const hasMore = customers.length < total;

  const [customersWithDebt, setCustomersWithDebt] = useState<CustomerWithStats[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerWithStats[]>([]);

  const stats = useMemo((): CustomerStats | null => {
    if (!statsData || statsData.length === 0) return null;
    const row = statsData[0];
    return {
      total: Number(row.total) || 0,
      with_debt: Number(row.with_debt) || 0,
      total_debt: Number(row.total_debt) || 0
    };
  }, [statsData]);

  // ========================================
  // 🔧 Helper Functions
  // ========================================

  const setFilters = useCallback((newFilters: CustomerFilters) => {
    setFiltersState(newFilters);
    setPage(1);
  }, []);

  const refetch = useCallback(async () => {
    // مع PowerSync، البيانات تتحدث تلقائياً
    console.log('[useLocalCustomers] Data refreshes automatically via PowerSync');
  }, []);

  const search = useCallback(async (query: string): Promise<Customer[]> => {
    setFiltersState(prev => ({ ...prev, search: query }));
    return customers.filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.phone?.includes(query) ||
      c.email?.toLowerCase().includes(query.toLowerCase())
    );
  }, [customers]);

  const getCustomer = useCallback(async (id: string): Promise<CustomerWithStats | null> => {
    return customers.find(c => c.id === id) || null;
  }, [customers]);

  const getByPhone = useCallback(async (phone: string): Promise<Customer | null> => {
    return customers.find(c => c.phone === phone) || null;
  }, [customers]);

  // CRUD operations use the service
  const createCustomer = useCallback(async (
    data: Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<Customer> => {
    return await unifiedCustomerService.createCustomer(data);
  }, []);

  const updateCustomer = useCallback(async (
    id: string,
    updates: Partial<Customer>
  ): Promise<Customer | null> => {
    return await unifiedCustomerService.updateCustomer(id, updates);
  }, []);

  const deleteCustomer = useCallback(async (id: string): Promise<boolean> => {
    return await unifiedCustomerService.deleteCustomer(id);
  }, []);

  const loadCustomersWithDebt = useCallback(async () => {
    try {
      const result = await unifiedCustomerService.getCustomersWithDebt();
      setCustomersWithDebt(result);
    } catch (err) {
      console.error('[useLocalCustomers] Load debt customers error:', err);
    }
  }, []);

  const loadStats = useCallback(async () => {
    // الإحصائيات تُحمّل تلقائياً مع PowerSync
  }, []);

  const loadTopCustomers = useCallback(async () => {
    try {
      const result = await unifiedCustomerService.getTopCustomers();
      setTopCustomers(result);
    } catch (err) {
      console.error('[useLocalCustomers] Load top customers error:', err);
    }
  }, []);

  return {
    customers,
    loading: isLoading,
    error: queryError || null,
    total,
    page,
    hasMore,
    refetch,
    setPage,
    setFilters,
    search,
    getCustomer,
    getByPhone,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    customersWithDebt,
    loadCustomersWithDebt,
    stats,
    loadStats,
    topCustomers,
    loadTopCustomers
  };
}

// ========================================
// 🔧 Single Customer Hook
// ========================================

export function useLocalCustomer(customerId: string | null) {
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

  const { data, isLoading, error } = useQuery<Customer>(sql, params);

  const customer = useMemo((): CustomerWithStats | null => {
    if (!data || data.length === 0) return null;
    return {
      ...data[0],
      total_orders: 0,
      total_spent: 0,
      total_debt: 0
    };
  }, [data]);

  const refetch = useCallback(async () => {
    // مع PowerSync، البيانات تتحدث تلقائياً
  }, []);

  return { customer, loading: isLoading, error: error || null, refetch };
}

// ========================================
// 🔧 Customer Search Hook
// ========================================

export function useCustomerSearch(debounceMs: number = 300) {
  const { currentOrganization } = useTenant();
  const orgId = currentOrganization?.id;

  const [query, setQuery] = useState('');

  const { sql, params } = useMemo(() => {
    if (!orgId || query.length < 2) {
      return { sql: 'SELECT 1 WHERE 0', params: [] };
    }

    const searchPattern = `%${query}%`;
    return {
      sql: `
        SELECT * FROM customers
        WHERE organization_id = ?
          AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)
        ORDER BY name
        LIMIT 20
      `,
      params: [orgId, searchPattern, searchPattern, searchPattern]
    };
  }, [orgId, query]);

  const { data, isLoading } = useQuery<Customer>(sql, params);

  return {
    query,
    setQuery,
    results: data || [],
    loading: isLoading
  };
}

export default useLocalCustomers;
