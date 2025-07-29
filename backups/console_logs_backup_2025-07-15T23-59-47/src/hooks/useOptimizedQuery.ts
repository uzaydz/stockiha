import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { optimizedSupabase } from '@/lib/supabase/OptimizedSupabaseClient';
import { cacheManager } from '@/lib/cache/CentralCacheManager';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  prefetch?: boolean;
  invalidateOn?: string[];
  dependencies?: string[];
}

/**
 * Hook for optimized data fetching with caching
 */
export function useOptimizedQuery<T>(
  queryKey: string | string[],
  fetcher: () => Promise<T>,
  options: OptimizedQueryOptions<T> = {}
) {
  const queryClient = useQueryClient();
  const {
    prefetch = false,
    invalidateOn = [],
    dependencies = [],
    ...queryOptions
  } = options;

  // Create cache key
  const cacheKey = Array.isArray(queryKey) ? queryKey.join('_') : queryKey;

  // Wrapped fetcher with caching
  const cachedFetcher = useCallback(async () => {
    return cacheManager.get(
      cacheKey,
      fetcher,
      {
        dependencies,
        ttl: queryOptions.staleTime,
        staleWhileRevalidate: queryOptions.gcTime
      }
    );
  }, [cacheKey, fetcher, dependencies, queryOptions.staleTime, queryOptions.gcTime]);

  // Main query
  const query = useQuery({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn: cachedFetcher,
    ...queryOptions
  });

  // Prefetch if needed
  useEffect(() => {
    if (prefetch && !query.data) {
      cacheManager.prefetch(cacheKey, fetcher);
    }
  }, [prefetch, cacheKey, fetcher, query.data]);

  // Setup invalidation listeners
  useEffect(() => {
    if (invalidateOn.length === 0) return;

    const handleInvalidation = (event: CustomEvent) => {
      const { table, organizationId } = event.detail;
      
      if (invalidateOn.includes(table)) {
        // Invalidate cache
        cacheManager.invalidate(cacheKey);
        
        // Invalidate React Query
        queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
        
        // Also invalidate related caches
        optimizedSupabase.invalidateRelatedCaches(table, organizationId);
      }
    };

    window.addEventListener('data-invalidation', handleInvalidation as EventListener);
    
    return () => {
      window.removeEventListener('data-invalidation', handleInvalidation as EventListener);
    };
  }, [invalidateOn, cacheKey, queryKey, queryClient]);

  return query;
}

/**
 * Hook for batch queries
 */
export function useBatchQueries<T extends Record<string, any>>(
  queries: Array<{
    key: string;
    fetcher: () => Promise<any>;
    options?: OptimizedQueryOptions<any>;
  }>
) {
  const results = queries.map(({ key, fetcher, options }) => 
    useOptimizedQuery(key, fetcher, options)
  );

  const isLoading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);
  const errors = results.filter(r => r.error).map(r => r.error);

  const data = results.reduce((acc, result, index) => {
    if (result.data) {
      acc[queries[index].key] = result.data;
    }
    return acc;
  }, {} as T);

  return {
    data,
    isLoading,
    isError,
    errors,
    queries: results
  };
}

/**
 * Hook for dashboard data
 */
export function useDashboardData(organizationId: string | null) {
  return useOptimizedQuery(
    ['dashboard', organizationId],
    async () => {
      if (!organizationId) return null;
      return optimizedSupabase.getCombinedDashboardData(organizationId);
    },
    {
      enabled: !!organizationId,
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 60 * 1000, // 1 minute
      invalidateOn: ['orders', 'products', 'customers', 'services']
    }
  );
}

/**
 * Hook for products with categories
 */
export function useProductsWithCategories(
  organizationId: string | null,
  filters: {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}
) {
  const { page = 1, limit = 50, ...filterParams } = filters;
  const offset = (page - 1) * limit;

  return useOptimizedQuery(
    ['products', organizationId, filterParams, page, limit],
    async () => {
      if (!organizationId) return null;
      
      const { data, error } = await optimizedSupabase.executeWithRetry(() =>
        optimizedSupabase.client.rpc('get_products_with_categories', {
          p_organization_id: organizationId,
          p_limit: limit,
          p_offset: offset,
          p_search: filterParams.search || null,
          p_category_id: filterParams.categoryId || null,
          p_is_active: filterParams.isActive ?? null
        })
      );

      if (error) throw error;
      return data;
    },
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      invalidateOn: ['products', 'product_categories']
    }
  );
}

/**
 * Hook for cache statistics
 */
export function useCacheStats() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['cache-stats'],
    queryFn: () => ({
      cache: cacheManager.getStats(),
      reactQuery: {
        queryCount: queryClient.getQueryCache().getAll().length,
        mutationCount: queryClient.getMutationCache().getAll().length
      }
    }),
    refetchInterval: 5000 // Update every 5 seconds
  });
}

/**
 * Utility to trigger data invalidation
 */
export function triggerDataInvalidation(table: string, organizationId: string) {
  const event = new CustomEvent('data-invalidation', {
    detail: { table, organizationId }
  });
  window.dispatchEvent(event);
}
