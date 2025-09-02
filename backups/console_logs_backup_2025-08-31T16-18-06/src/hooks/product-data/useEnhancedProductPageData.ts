/**
 * useEnhancedProductPageData - Hook محسن لجلب بيانات صفحة المنتج
 * مكون متقدم مع خيارات إضافية وتحسينات
 */

import { useQuery } from '@tanstack/react-query';
import type { UseUnifiedProductPageDataProps, ProductFetchOptions } from './ProductDataTypes';
import { useEnhancedQueryOptions, useExtractedData } from './ProductDataHooks';

interface UseEnhancedProductPageDataProps extends UseUnifiedProductPageDataProps {
  options?: ProductFetchOptions;
  enableRetry?: boolean;
  enableTimeout?: boolean;
}

/**
 * Hook محسن لجلب بيانات صفحة المنتج مع خيارات متقدمة
 */
export const useEnhancedProductPageData = ({
  productId,
  organizationId,
  enabled = true,
  options = {},
  enableRetry = true,
  enableTimeout = true
}: UseEnhancedProductPageDataProps) => {
  
  // استخدام الـ hooks المساعدة المحسنة
  const queryOptions = useEnhancedQueryOptions(
    productId, 
    organizationId, 
    enabled, 
    options
  );

  // تخصيص الخيارات
  const enhancedOptions = {
    ...queryOptions,
    retry: enableRetry ? 3 : 0,
    retryDelay: enableRetry ? 1000 : 0,
  };

  // استخدام React Query مع الخيارات المحسنة
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    isError,
    isSuccess
  } = useQuery(enhancedOptions);

  // استخراج البيانات المنفصلة
  const extractedData = useExtractedData(data);

  return {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    isError,
    isSuccess,
    
    // البيانات المنفصلة
    ...extractedData,
    
    // معلومات إضافية
    hasData: !!data,
    isEmpty: !data || Object.keys(data).length === 0,
    isStale: false, // يمكن إضافته لاحقاً
  };
};

export default useEnhancedProductPageData;
