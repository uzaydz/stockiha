import useSWR from 'swr';
import { useMemo } from 'react';
import {
  fetchInventoryProducts,
  fetchInventoryStats,
  searchInventoryProducts,
  type InventoryFilters,
  type InventoryProduct,
  type InventoryListResult,
  type InventoryStats,
} from '@/services/InventoryService';
import { InventoryServiceError } from '@/services/InventoryService';

interface UseInventoryListOptions {
  filters?: InventoryFilters;
  enabled?: boolean;
}

interface InventoryListState {
  data: InventoryListResult | undefined;
  products: InventoryProduct[];
  totalCount: number;
  filteredCount: number;
  isLoading: boolean;
  isFetching: boolean;
  error: InventoryServiceError | null;
  refetch: () => Promise<InventoryListResult | undefined>;
}

export function useInventoryList(options: UseInventoryListOptions = {}): InventoryListState {
  const { filters, enabled = true } = options;
  const normalizedFilters = useMemo<InventoryFilters>(() => ({
    page: filters?.page ?? 1,
    pageSize: filters?.pageSize ?? 50,
    searchQuery: filters?.searchQuery ?? filters?.search_query,
    categoryId: filters?.categoryId ?? filters?.category_id,
    stockFilter: filters?.stockFilter ?? filters?.stock_filter ?? 'all',
    sortBy: filters?.sortBy ?? filters?.sort_by ?? 'name',
    sortOrder: filters?.sortOrder ?? filters?.sort_order ?? 'ASC',
    includeVariants: filters?.includeVariants ?? filters?.include_variants ?? true,
    includeInactive: filters?.includeInactive ?? filters?.include_inactive ?? false,
  }), [filters]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<InventoryListResult>(
    enabled ? ['inventory:list', normalizedFilters] : null,
    () => fetchInventoryProducts(normalizedFilters),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    products: data?.products ?? [],
    totalCount: data?.totalCount ?? 0,
    filteredCount: data?.filteredCount ?? 0,
    isLoading,
    isFetching: isValidating,
    error: (error as InventoryServiceError) ?? null,
    refetch: async () => {
      const result = await mutate();
      return result;
    },
  };
}

interface InventoryStatsState {
  stats: InventoryStats | undefined;
  isLoading: boolean;
  error: InventoryServiceError | null;
  refetch: () => Promise<InventoryStats | undefined>;
}

export function useInventoryStats(options: { enabled?: boolean } = {}): InventoryStatsState {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR<InventoryStats>(
    enabled ? ['inventory:stats'] : null,
    () => fetchInventoryStats(),
    {
      revalidateOnFocus: false,
      refreshInterval: 5 * 60 * 1000,
    }
  );

  return {
    stats: data,
    isLoading,
    error: (error as InventoryServiceError) ?? null,
    refetch: async () => mutate(),
  };
}

export function useInventorySearch(query: string, limit = 10) {
  const { data, error, isLoading } = useSWR(
    query.trim().length > 1 ? ['inventory:search', query, limit] : null,
    () => searchInventoryProducts(query, limit),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    results: data ?? [],
    isLoading,
    error: (error as InventoryServiceError) ?? null,
  };
}
