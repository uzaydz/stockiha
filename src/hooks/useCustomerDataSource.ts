/**
 * ⚡ useCustomerDataSource - v2.0 (PowerSync Reactive)
 * ============================================================
 *
 * 🚀 Hook محسّن للعملاء يستخدم:
 *   - useQuery من @powersync/react (reactive)
 *   - تحديث تلقائي عند أي تغيير
 *   - Offline-First بشكل طبيعي
 *
 * ============================================================
 */

import { useMemo, useCallback, useState } from 'react';
import { useQuery } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useDebounce } from '@/hooks/useDebounce';
import { Customer } from '@/types/customer';

// =====================================================
// 🎯 Main Hook
// =====================================================

export function useCustomerDataSource(searchQuery: string) {
  const { currentOrganization } = useTenant();
  const { isOnline } = useNetworkStatus();
  const orgId = currentOrganization?.id || localStorage.getItem('bazaar_organization_id') || '';

  const debouncedQuery = useDebounce(searchQuery, 300);
  const [offset, setOffset] = useState(0);
  const pageSize = 100;

  // ⚡ استعلام العملاء (Reactive)
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
    if (debouncedQuery && debouncedQuery.length >= 2) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${debouncedQuery}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY name LIMIT ?`;
    queryParams.push(pageSize + offset);

    return { sql: query, params: queryParams };
  }, [orgId, debouncedQuery, offset, pageSize]);

  const { data, isLoading, error } = useQuery<any>(sql, params);

  // ⚡ استعلام العدد الإجمالي (Reactive)
  const countQuery = useMemo(() => {
    if (!orgId) {
      return { sql: 'SELECT 0 as count', params: [] };
    }

    let query = `SELECT COUNT(*) as count FROM customers WHERE organization_id = ?`;
    const queryParams: any[] = [orgId];

    if (debouncedQuery && debouncedQuery.length >= 2) {
      query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${debouncedQuery}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    return { sql: query, params: queryParams };
  }, [orgId, debouncedQuery]);

  const { data: countData } = useQuery<{ count: number }>(countQuery.sql, countQuery.params);

  // تحويل البيانات
  const dataSource: Customer[] = useMemo(() => {
    if (!data) return [];
    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      email: c.email || '',
      phone: c.phone || null,
      organization_id: c.organization_id,
      created_at: c.created_at,
      updated_at: c.updated_at,
      nif: c.nif ?? null,
      rc: c.rc ?? null,
      nis: c.nis ?? null,
      rib: c.rib ?? null,
      address: c.address ?? null,
    }));
  }, [data]);

  const total = countData?.[0]?.count ? Number(countData[0].count) : dataSource.length;
  const hasMore = dataSource.length < total;

  // ⚡ تحميل المزيد
  const loadMore = useCallback(async () => {
    if (debouncedQuery) return; // لا تدعم المزيد أثناء البحث
    if (!hasMore) return;
    setOffset(prev => prev + pageSize);
  }, [debouncedQuery, hasMore, pageSize]);

  return {
    dataSource,
    total,
    hasMore,
    loadMore,
    isLocalLoading: isLoading
  };
}

export default useCustomerDataSource;
