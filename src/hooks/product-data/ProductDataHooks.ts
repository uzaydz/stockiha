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
  dataScope: 'basic' | 'ultra' | 'full' = 'ultra',
  initialData?: UnifiedProductPageData,
  initialDataUpdatedAt?: number
) => {
  return useMemo(() => {
    // إنشاء cache key ثابت لهذا المنتج  
    const cacheKey = createCacheKey(productId, organizationId);
    // لا نستخدم initialData كقيمة أولية إلا إذا احتوت على product
    const safeInitial = initialData && (initialData as any).product ? initialData : undefined;
    
    // 🔍 Debug: تشخيص إنشاء queryOptions
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [useQueryOptions] إنشاء Query Options:', {
        productId,
        organizationId,
        enabled,
        dataScope,
        cacheKey,
        finalEnabled: enabled && !!productId
      });
    }
    
    return {
      queryKey: ['unified-product-page', productId, organizationId, dataScope],
      queryFn: async (): Promise<UnifiedProductPageData> => {
        // 🔍 Debug: تشخيص تشغيل queryFn
        if (process.env.NODE_ENV === 'development') {
          console.log('🔥 [queryFn] بدء تشغيل fetchUnifiedProductData:', {
            productId,
            organizationId,
            dataScope
          });
        }
        
        
        if (!productId) {
          throw new Error('Product ID is required');
        }

        

        // ✅ أولوية أعلى للبيانات المحفوظة في Cache
        const cached = productDataCache.get(cacheKey);
        if (cached) {
          
          return cached;
        }

        // التحقق من الطلبات النشطة
        if (productDataCache.hasActiveRequest(cacheKey)) {
          
          const activeRequest = productDataCache.getActiveRequest(cacheKey);
          if (activeRequest) {
            return await activeRequest;
          }
        }

        
        // إنشاء طلب جديد
        const requestPromise = fetchUnifiedProductData(productId, {
          organizationId,
          dataScope,
          forceRefresh: false // ✅ عدم إجبار التحديث للسماح باستخدام Cache
        });
        productDataCache.setActiveRequest(cacheKey, requestPromise);

        try {
          const result = await requestPromise;
          
          
          // حفظ في Cache
          productDataCache.set(cacheKey, result);

          return result;
        } catch (error) {
          
          throw error;
        } finally {
          productDataCache.removeActiveRequest(cacheKey);
        }
      },
      enabled: enabled && !!productId,
      // 🔍 Debug: إضافة callback لمراقبة حالة Query
      onSuccess: (data) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [useQuery] Query نجح:', {
            hasData: !!data,
            productId: data?.product?.id,
            keys: data ? Object.keys(data) : []
          });
        }
      },
      onError: (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ [useQuery] Query فشل:', error);
        }
      },
      staleTime: 8 * 60 * 1000, // 8 دقائق - زيادة طفيفة للتقليل من re-fetch
      gcTime: 20 * 60 * 1000, // 20 دقيقة - زيادة لحفظ البيانات أطول
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false, // ✅ منع إعادة التحميل عند إعادة الاتصال
      // ✅ إصلاح: تحسين منطق التحميل ليعرض البيانات فوراً إذا كانت متوفرة
      placeholderData: safeInitial,
      retry: (failureCount, error) => {
        // 🔥 إصلاح: لا تعيد المحاولة إذا كان المنتج غير موجود
        if (error?.message?.includes('Product not found') || error?.message?.includes('404')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: 1000,
      // بيانات أولية لتسريع الظهور الأول
      initialData: safeInitial,
      initialDataUpdatedAt: safeInitial ? initialDataUpdatedAt : undefined,
      // ✅ منع re-render غير ضروري عند تغيير البيانات
      structuralSharing: true,
      networkMode: 'online'
    };
  }, [productId, organizationId, enabled, dataScope, initialData, initialDataUpdatedAt]);
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
  }, [productId, JSON.stringify(options)]);
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
  }), [productId, organizationId, enabled, queryFn, JSON.stringify(options)]);
};

/**
 * Hook لاستخراج البيانات المنفصلة
 */
export const useExtractedData = (data: UnifiedProductPageData | undefined) => {
  
  
  return useMemo(() => {
    // 🔥 إصلاح: معالجة البيانات المغلفة في RPC function
    let actualData: any = data;
    
    // التحقق من البيانات المغلفة في RPC
    if (data && typeof data === 'object' && (data as any).get_product_complete_data_ultra_optimized) {
      actualData = (data as any).get_product_complete_data_ultra_optimized;
    }
    
    // 🔍 Debug: تسجيل تشخيص استخراج البيانات
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [useExtractedData] تشخيص استخراج البيانات:', {
        hasOriginalData: !!data,
        hasActualData: !!actualData,
        hasProduct: !!actualData?.product,
        productId: actualData?.product?.id,
        originalDataKeys: data ? Object.keys(data) : [],
        actualDataKeys: actualData ? Object.keys(actualData) : []
      });
    }
    
    return {
      product: actualData?.product,
      organization: actualData?.organization || actualData?.product?.organization,
      organizationSettings: actualData?.organizationSettings,
      visitorAnalytics: actualData?.visitorAnalytics,
      categories: actualData?.categories || [],
      provinces: actualData?.provinces || [],
      trackingData: actualData?.trackingData || actualData?.stats,
    };
  }, [data]);
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
  }, [productId, organizationId, JSON.stringify(metadata)]);
};
