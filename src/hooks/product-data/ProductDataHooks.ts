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

const isDevEnvironment = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);

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
  initialDataUpdatedAt?: number,
  queryKey?: string[]
) => {
  return useMemo(() => {
    // لا نستخدم initialData كقيمة أولية إلا إذا احتوت على product
    const safeInitial = initialData && (initialData as any).product ? initialData : undefined;

    return {
      queryKey: queryKey || ['unified-product-page', productId, organizationId, dataScope],
      queryFn: async (): Promise<UnifiedProductPageData> => {
        if (!productId) {
          throw new Error('Product ID is required');
        }

        // إنشاء cache key للاستخدام داخل queryFn
        const cacheKey = queryKey ? queryKey.join('-') : createCacheKey(productId, organizationId);

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
      // 🔍 Debug: إضافة callback لمراقبة حالة Query - مفعل في الإنتاج مؤقتاً
      onSuccess: (data) => {
        if (isDevEnvironment) {
          console.log('✅ [useQuery] Query نجح:', {
            hasData: !!data,
            productId: data?.product?.id,
            keys: data ? Object.keys(data) : []
          });
        }
      },
      onError: (error) => {
        if (isDevEnvironment) {
          console.error('❌ [useQuery] Query فشل:', error);
        }
      },
      staleTime: 30 * 60 * 1000, // 30 دقيقة - زيادة أكثر لتقليل re-fetch
      gcTime: 60 * 60 * 1000, // 60 دقيقة - زيادة لحفظ البيانات أطول
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
      structuralSharing: true
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
    // 🔥 إصلاح: معالجة البيانات المغلفة في RPC function مع تحسينات للسرعة
    if (!data) {
      return {
        product: null,
        organization: null,
        organizationSettings: null,
        visitorAnalytics: null,
        categories: [],
        provinces: [],
        trackingData: null,
      };
    }

    let actualData: any = data;

    // التحقق من البيانات المغلفة في API الجديد أو القديم - تحسين المنطق للسرعة
    // استخدام type assertion لأن البيانات الخام قد تحتوي على خصائص إضافية
    const rawData = data as any;
    if (typeof rawData === 'object') {
      // ✅ تحديث: التحقق من البيانات الجديدة المدمجة أولاً
      if (rawData.basic && rawData.extended !== undefined) {
        // البيانات من API الجديد المدمج - استخدم المنتج المدمج مباشرة
        actualData = {
          product: rawData.product || rawData.basic.product,
          stats: rawData.stats || rawData.basic.stats,
          // إضافة البيانات المتقدمة
          ...(rawData.extended?.product_extended && {
            extended: rawData.extended.product_extended
          })
        };
      }
      // التحقق من البنية المباشرة لـ RPC القديم (للتوافق)
      else if (rawData.get_product_complete_data_ultra_optimized) {
        actualData = rawData.get_product_complete_data_ultra_optimized;
      }
      // التحقق من البيانات المباشرة في data
      else if (rawData.data && typeof rawData.data === 'object') {
        const innerData = rawData.data;
        // التحقق من البيانات الجديدة في data
        if (innerData.basic && innerData.extended !== undefined) {
          actualData = {
            product: innerData.product || innerData.basic.product,
            stats: innerData.stats || innerData.basic.stats,
            ...(innerData.extended?.product_extended && {
              extended: innerData.extended.product_extended
            })
          };
        }
        // التحقق من البيانات القديمة في data
        else if (innerData.get_product_complete_data_ultra_optimized) {
          actualData = innerData.get_product_complete_data_ultra_optimized;
        } else {
          actualData = innerData;
        }
      }
    }

    // 🔍 Debug: تسجيل تشخيص استخراج البيانات - تقليل التسجيل للسرعة
    if (isDevEnvironment && actualData?.product?.id) {
      console.log('🔍 [useExtractedData] تم استخراج المنتج:', {
        productId: actualData.product.id,
        hasOrganization: !!actualData.organization,
        hasCategories: !!actualData.categories?.length
      });
    }

    return {
      product: actualData?.product || null,
      organization: actualData?.organization || actualData?.product?.organization || null,
      organizationSettings: actualData?.organizationSettings || null,
      visitorAnalytics: actualData?.visitorAnalytics || null,
      categories: actualData?.categories || [],
      provinces: actualData?.provinces || [],
      trackingData: actualData?.trackingData || actualData?.stats || null,
    };
  }, [data]); // استخدام data كامل لضمان التحديث عند تغيير البيانات
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
