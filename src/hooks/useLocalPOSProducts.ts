/**
 * useLocalPOSProducts - Hook لجلب المنتجات من SQLite المحلية
 * 
 * ⚡ التحسينات:
 * - Pagination محلية بدون استدعاء السيرفر
 * - البحث والفلترة محلياً
 * - أداء عالي جداً (< 50ms)
 * - يعمل أوفلاين بالكامل
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { localProductSearchService, PaginatedProductsResult } from '@/services/LocalProductSearchService';
import { isAppOnline } from '@/utils/networkStatus';

interface UseLocalPOSProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  stockFilter?: 'all' | 'in_stock' | 'out_of_stock';
  enabled?: boolean;
}

interface LocalPOSProductsState {
  products: any[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  } | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: string | null;
  source: 'local' | 'server';
}

export const useLocalPOSProducts = (options: UseLocalPOSProductsOptions = {}) => {
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();

  const {
    page = 1,
    limit = 30,
    search = '',
    categoryId = '',
    stockFilter = 'all',
    enabled = true
  } = options;

  // Query key للتخزين المؤقت
  const queryKey = useMemo(
    () => ['local-pos-products', currentOrganization?.id, page, limit, search, categoryId, stockFilter],
    [currentOrganization?.id, page, limit, search, categoryId, stockFilter]
  );

  // جلب المنتجات من SQLite
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

      console.log(`[useLocalPOSProducts] 📦 جلب المنتجات - صفحة ${page}`);
      const startTime = performance.now();

      const result = await localProductSearchService.getProductsPaginated(
        currentOrganization.id,
        {
          page,
          limit,
          search,
          categoryId,
          stockFilter
        }
      );

      const endTime = performance.now();
      console.log(`[useLocalPOSProducts] ✅ تم جلب ${result.products.length} منتج في ${Math.round(endTime - startTime)}ms`);

      return result;
    },
    enabled: enabled && !!currentOrganization?.id,
    staleTime: 2 * 60 * 1000, // 2 دقيقة
    gcTime: 5 * 60 * 1000, // 5 دقائق
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData
  });

  // دوال التنقل
  const goToPage = useCallback((newPage: number) => {
    if (newPage < 1) return;
    if (data?.pagination && newPage > data.pagination.total_pages) return;
    
    // تحديث الـ query مباشرة
    queryClient.invalidateQueries({ 
      queryKey: ['local-pos-products', currentOrganization?.id, newPage] 
    });
  }, [data?.pagination, currentOrganization?.id, queryClient]);

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
