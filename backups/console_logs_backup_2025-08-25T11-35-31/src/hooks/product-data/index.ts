/**
 * تصدير جميع مكونات product-data المحسنة
 */

// الأنواع والواجهات
export type * from './ProductDataTypes';

// إدارة التخزين المؤقت
export { 
  productDataCache,
  createCacheKey,
  clearUnifiedProductCache
} from './ProductDataCache';

// جلب البيانات
export { 
  fetchUnifiedProductData,
  fetchEnhancedProductData,
  fetchWithRetry,
  fetchWithTimeout
} from './ProductDataFetcher';

// الـ hooks المساعدة
export { 
  useCacheKey,
  useQueryKey,
  useQueryOptions,
  useEnhancedQueryFn,
  useEnhancedQueryOptions,
  useExtractedData,
  useCacheKeyWithMetadata
} from './ProductDataHooks';

// الـ hooks الرئيسية
export { default as useUnifiedProductPageData } from './useUnifiedProductPageData';
export { default as useEnhancedProductPageData } from './useEnhancedProductPageData';

// تصدير للتوافق مع الإصدار السابق
export { default } from './useUnifiedProductPageData';
