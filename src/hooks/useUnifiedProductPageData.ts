import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProductCompleteData } from '@/lib/api/productComplete';

// أنواع البيانات
interface UnifiedProductPageData {
  product: any;
  organization: any;
  organizationSettings: any;
  visitorAnalytics: any;
  categories: any[];
  provinces: any[];
  trackingData: any;
}

interface UseUnifiedProductPageDataProps {
  productId?: string;
  organizationId?: string;
  enabled?: boolean;
}

// Cache عالمي لمنع الطلبات المتكررة
const GLOBAL_PRODUCT_CACHE = new Map<string, {
  data: UnifiedProductPageData;
  timestamp: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
const ACTIVE_REQUESTS = new Map<string, Promise<UnifiedProductPageData>>();

/**
 * Hook موحد لجلب جميع بيانات صفحة المنتج مع منع التكرار
 */
export const useUnifiedProductPageData = ({
  productId,
  organizationId,
  enabled = true
}: UseUnifiedProductPageDataProps) => {
  
  const cacheKey = `unified_product_${productId}_${organizationId}`;
  
  // استخدام React Query مع deduplication قوي
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['unified-product-page', productId, organizationId],
    queryFn: async (): Promise<UnifiedProductPageData> => {
      if (!productId || !organizationId) {
        throw new Error('Product ID and Organization ID are required');
      }

      // التحقق من الطلبات النشطة أولاً
      const activeRequest = ACTIVE_REQUESTS.get(cacheKey);
      if (activeRequest) {
        console.log('🔄 [UnifiedProductPage] انتظار طلب نشط:', cacheKey);
        return await activeRequest;
      }

      // التحقق من Cache
      const cached = GLOBAL_PRODUCT_CACHE.get(cacheKey);
      const now = Date.now();
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log('✅ [UnifiedProductPage] استخدام Cache:', cacheKey);
        return cached.data;
      }

      // إنشاء طلب جديد
      const requestPromise = fetchUnifiedProductData(productId, organizationId);
      ACTIVE_REQUESTS.set(cacheKey, requestPromise);

      try {
        const result = await requestPromise;
        
        // حفظ في Cache
        GLOBAL_PRODUCT_CACHE.set(cacheKey, {
          data: result,
          timestamp: now
        });

        return result;
      } finally {
        ACTIVE_REQUESTS.delete(cacheKey);
      }
    },
    enabled: enabled && !!productId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 15 * 60 * 1000, // 15 دقيقة
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: 1000,
  });

  return {
    data,
    isLoading,
    error,
    refetch,
    
    // بيانات منفصلة للسهولة
    product: data?.product,
    organization: data?.organization,
    organizationSettings: data?.organizationSettings,
    visitorAnalytics: data?.visitorAnalytics,
    categories: data?.categories || [],
    provinces: data?.provinces || [],
    trackingData: data?.trackingData,
  };
};

/**
 * دالة جلب البيانات الموحدة باستخدام الـ APIs الموجودة
 */
async function fetchUnifiedProductData(
  productId: string, 
  organizationId: string
): Promise<UnifiedProductPageData> {
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 [UnifiedProductPage] بدء جلب البيانات الموحدة:', {
      productId,
      organizationId,
      timestamp: new Date().toISOString()
    });
  }

  try {
    // استخدام الـ API الموجود لجلب بيانات المنتج
    const productResponse = await getProductCompleteData(productId, {
      organizationId,
      dataScope: 'ultra'
    });

    if (!productResponse || !productResponse.success) {
      throw new Error('فشل في جلب بيانات المنتج');
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [UnifiedProductPage] تم جلب البيانات بنجاح:', {
        hasProduct: !!productResponse.product,
        timestamp: new Date().toISOString()
      });
    }

    return {
      product: productResponse.product,
      organization: productResponse.product.organization,
      organizationSettings: null, // غير متوفر في ProductCompleteResponse
      visitorAnalytics: null, // سيتم جلبها منفصلة
      categories: productResponse.product.categories ? [productResponse.product.categories] : [],
      provinces: [], // غير متوفر في ProductCompleteResponse
      trackingData: productResponse.meta
    };

  } catch (error) {
    console.error('❌ [UnifiedProductPage] فشل في جلب البيانات:', error);
    throw error;
  }
}

/**
 * دالة تنظيف Cache
 */
export const clearUnifiedProductCache = (productId?: string) => {
  if (productId) {
    // مسح cache لمنتج محدد
    for (const [key] of GLOBAL_PRODUCT_CACHE) {
      if (key.includes(productId)) {
        GLOBAL_PRODUCT_CACHE.delete(key);
      }
    }
  } else {
    // مسح جميع Cache
    GLOBAL_PRODUCT_CACHE.clear();
  }
  ACTIVE_REQUESTS.clear();
};

export default useUnifiedProductPageData; 