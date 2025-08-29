/**
 * ProductDataHooks - الـ hooks المساعدة لبيانات المنتج
 * ملف منفصل لتحسين الأداء وسهولة الصيانة
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { 
  UnifiedProductPageData, 
  UseUnifiedProductPageDataProps,
  ProductFetchOptions 
} from './ProductDataTypes';
import { productDataCache, createCacheKey } from './ProductDataCache';
import { fetchUnifiedProductData, fetchEnhancedProductData } from './ProductDataFetcher';

/**
 * Hook لإنشاء مفتاح Cache
 */
export const useCacheKey = (productId?: string, organizationId?: string) => {
  return useMemo(() => {
    if (!productId) return null;
    return createCacheKey(productId, organizationId);
  }, [productId, organizationId]);
};

/**
 * Hook لإنشاء query key
 */
export const useQueryKey = (productId?: string, organizationId?: string) => {
  return useMemo(() => {
    return ['unified-product-page', productId, organizationId];
  }, [productId, organizationId]);
};

/**
 * Hook لإنشاء query options
 */
export const useQueryOptions = (
  productId?: string, 
  organizationId?: string, 
  enabled: boolean = true,
  dataScope: 'basic' | 'ultra' | 'full' = 'ultra'
) => {
  return useMemo(() => ({
    queryKey: ['unified-product-page', productId, organizationId, dataScope],
    queryFn: async (): Promise<UnifiedProductPageData> => {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      const cacheKey = createCacheKey(productId, organizationId);

      // التحقق من الطلبات النشطة أولاً
      if (productDataCache.hasActiveRequest(cacheKey)) {
        const activeRequest = productDataCache.getActiveRequest(cacheKey);
        if (activeRequest) {
          return await activeRequest;
        }
      }

      // 🚀 إجبار تحديث البيانات - تجاهل Cache لتشمل صور الألوان الجديدة
      // const cached = productDataCache.get(cacheKey);
      // if (cached) {
      //   return cached;
      // }

      // إنشاء طلب جديد
      const requestPromise = fetchUnifiedProductData(productId, {
        organizationId,
        dataScope,
        forceRefresh: true // 🚀 إجبار تحديث البيانات لتشمل صور الألوان الجديدة
      });
      productDataCache.setActiveRequest(cacheKey, requestPromise);

      try {
        const result = await requestPromise;
        
        // حفظ في Cache
        productDataCache.set(cacheKey, result);

        return result;
      } finally {
        productDataCache.removeActiveRequest(cacheKey);
      }
    },
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 15 * 60 * 1000, // 15 دقيقة
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: 1000,
  }), [productId, organizationId, enabled, dataScope]);
};

/**
 * Hook لإنشاء query function محسنة
 */
export const useEnhancedQueryFn = (productId?: string, options?: ProductFetchOptions) => {
  return useCallback(async (): Promise<UnifiedProductPageData> => {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    return await fetchEnhancedProductData(productId, options);
  }, [productId, options]);
};

/**
 * Hook لإنشاء query options محسنة
 */
export const useEnhancedQueryOptions = (
  productId?: string, 
  organizationId?: string, 
  enabled: boolean = true,
  options?: ProductFetchOptions
) => {
  const queryFn = useEnhancedQueryFn(productId, options);
  
  return useMemo(() => ({
    queryKey: ['enhanced-unified-product-page', productId, organizationId, options],
    queryFn,
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 15 * 60 * 1000, // 15 دقيقة
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,
    retryDelay: 1000,
  }), [productId, organizationId, enabled, queryFn, options]);
};

/**
 * Hook لاستخراج البيانات المنفصلة
 */
export const useExtractedData = (data: UnifiedProductPageData | undefined) => {
  return useMemo(() => ({
    product: data?.product,
    organization: data?.organization,
    organizationSettings: data?.organizationSettings,
    visitorAnalytics: data?.visitorAnalytics,
    categories: data?.categories || [],
    provinces: data?.provinces || [],
    trackingData: data?.trackingData,
  }), [data]);
};

/**
 * Hook لإنشاء cache key مع metadata
 */
export const useCacheKeyWithMetadata = (
  productId?: string, 
  organizationId?: string,
  metadata?: Record<string, any>
) => {
  return useMemo(() => {
    if (!productId) return null;
    
    const baseKey = createCacheKey(productId, organizationId);
    if (!metadata) return baseKey;
    
    const metadataString = JSON.stringify(metadata);
    return `${baseKey}_${metadataString}`;
  }, [productId, organizationId, metadata]);
};
