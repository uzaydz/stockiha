/**
 * useLocalPOSProducts - Hook لجلب المنتجات من SQLite المحلية
 *
 * ⚡ v3.0 (2025): يستخدم DeltaWriteService.searchProductsSmart
 * - SQL-level filtering بدلاً من JavaScript filtering
 * - Pagination على مستوى قاعدة البيانات
 * - ألوان ومقاسات مرفقة تلقائياً
 */

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStatus } from '@powersync/react';
import { useTenant } from '@/context/TenantContext';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { mapLocalProductToPOSProduct } from '@/context/POSDataContext';

interface UseLocalPOSProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  stockFilter?: 'all' | 'in_stock' | 'out_of_stock';
  enabled?: boolean;
}

interface PaginatedProductsResult {
  products: any[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  source: string;
}

export const useLocalPOSProducts = (options: UseLocalPOSProductsOptions = {}) => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();

  // ⚡ v2.0: مراقبة حالة PowerSync للانتظار حتى تكتمل المزامنة الأولى
  const powerSyncStatus = useStatus();
  const hasSynced = powerSyncStatus?.hasSynced || false;
  const initialSyncDone = useRef(false);

  const {
    page = 1,
    limit = 30,
    search = '',
    categoryId = '',
    stockFilter = 'all',
    enabled = true
  } = options;

  // Query key للتخزين المؤقت - يشمل hasSynced لإعادة الجلب بعد المزامنة
  const queryKey = useMemo(
    () => ['local-pos-products', currentOrganization?.id, page, limit, search, categoryId, stockFilter, hasSynced],
    [currentOrganization?.id, page, limit, search, categoryId, stockFilter, hasSynced]
  );

  // ⚡ v2.0: إعادة جلب البيانات عند اكتمال المزامنة الأولى
  useEffect(() => {
    if (hasSynced && !initialSyncDone.current) {
      initialSyncDone.current = true;
      console.log('[useLocalPOSProducts] ⚡ Initial sync completed, refetching data...');
      queryClient.invalidateQueries({ queryKey: ['local-pos-products'] });
    }
  }, [hasSynced, queryClient]);

  // ⚡ v3.0: جلب المنتجات باستخدام DeltaWriteService.searchProductsSmart
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedProductsResult> => {
      if (!currentOrganization?.id) {
        return {
          products: [],
          pagination: {
            current_page: page,
            total_pages: 1,
            total_count: 0,
            per_page: limit,
            has_next_page: false,
            has_prev_page: false
          },
          source: 'local'
        };
      }

      const startTime = Date.now();

      // ⚡ استخدام الدالة الذكية الجديدة - SQL filtering + pagination
      const result = await deltaWriteService.searchProductsSmart({
        organizationId: currentOrganization.id,
        search: search?.trim() || undefined,
        categoryId: categoryId && categoryId !== 'all' ? categoryId : undefined,
        page,
        limit,
        isActive: true,
        stockFilter // ⚡ فلتر المخزون على مستوى SQL
      });

      // تحويل المنتجات لصيغة POS
      const products = result.products.map(mapLocalProductToPOSProduct);

      const duration = Date.now() - startTime;
      console.log(`[useLocalPOSProducts] ⚡ Fetched ${products.length}/${result.totalCount} products in ${duration}ms`);

      return {
        products,
        pagination: {
          current_page: page,
          total_pages: result.totalPages,
          total_count: result.totalCount,
          per_page: limit,
          has_next_page: page < result.totalPages,
          has_prev_page: page > 1
        },
        source: 'local-smart'
      };
    },
    enabled: enabled && !!currentOrganization?.id,
    staleTime: 2 * 60 * 1000, // 2 دقيقة - البيانات تبقى fresh
    gcTime: 10 * 60 * 1000,   // 10 دقائق
    refetchOnWindowFocus: false,
    refetchOnMount: true, // جلب البيانات عند أول تحميل
    refetchOnReconnect: false
  });

  // دوال التنقل
  const goToPage = useCallback((newPage: number) => {
    if (newPage < 1) return;
    if (data?.pagination && newPage > data.pagination.total_pages) return;
  }, [data?.pagination]);

  const nextPage = useCallback(() => {
    if (data?.pagination?.has_next_page) {
      goToPage(page + 1);
    }
  }, [data?.pagination?.has_next_page, page, goToPage]);

  const prevPage = useCallback(() => {
    if (data?.pagination?.has_prev_page) {
      goToPage(page - 1);
    }
  }, [data?.pagination?.has_prev_page, page, goToPage]);

  // تحديث البيانات
  const refreshData = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // إبطال الكاش
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['local-pos-products', currentOrganization?.id]
    });
  }, [currentOrganization?.id, queryClient]);

  return {
    // البيانات
    products: data?.products || [],
    pagination: data?.pagination || null,
    source: data?.source || 'local',

    // حالات التحميل
    isLoading,
    isRefetching,
    error: error?.message || null,

    // معلومات الصفحة
    currentPage: page,
    totalPages: data?.pagination?.total_pages || 1,
    totalCount: data?.pagination?.total_count || 0,
    hasNextPage: data?.pagination?.has_next_page || false,
    hasPrevPage: data?.pagination?.has_prev_page || false,

    // دوال التنقل
    goToPage,
    nextPage,
    prevPage,

    // دوال التحديث
    refreshData,
    invalidateCache
  };
};

export default useLocalPOSProducts;
