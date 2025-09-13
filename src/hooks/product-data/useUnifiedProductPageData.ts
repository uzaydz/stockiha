/**
 * useUnifiedProductPageData - Hook موحد لجلب جميع بيانات صفحة المنتج
 * مكون محسن ومبسط يستخدم المكونات المنفصلة
 */

import { useQuery } from '@tanstack/react-query';
import type { UseUnifiedProductPageDataProps } from './ProductDataTypes';
import { useQueryOptions, useExtractedData } from './ProductDataHooks';

/**
 * Hook موحد لجلب جميع بيانات صفحة المنتج مع منع التكرار
 */
export const useUnifiedProductPageData = ({
  productId,
  organizationId,
  enabled = true,
  dataScope = 'full',
  initialData,
  initialDataUpdatedAt
}: UseUnifiedProductPageDataProps) => {
  
  // 🔍 Debug: تشخيص استدعاء useUnifiedProductPageData
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [useUnifiedProductPageData] استدعاء Hook:', {
      productId,
      organizationId,
      enabled,
      dataScope,
      hasInitialData: !!initialData
    });
  }
  
  // استخدام الـ hooks المساعدة
  const queryOptions = useQueryOptions(productId, organizationId, enabled, dataScope, initialData, initialDataUpdatedAt);
  
  // استخدام React Query مع deduplication قوي
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery(queryOptions);


  // 🔍 Debug: تشخيص نتيجة useQuery
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [useUnifiedProductPageData] نتيجة useQuery:', {
      hasData: !!data,
      isLoading,
      hasError: !!error,
      dataKeys: data ? Object.keys(data) : 'no data',
      dataValue: data
    });
  }

  // استخراج البيانات المنفصلة
  const extractedData = useExtractedData(data);

  // 🔍 Debug: تشخيص البيانات المستخرجة
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [useUnifiedProductPageData] البيانات المستخرجة:', {
      hasProduct: !!extractedData.product,
      productId: extractedData.product?.id,
      hasOrganization: !!extractedData.organization,
      extractedKeys: Object.keys(extractedData)
    });
  }

  return {
    data,
    isLoading,
    error,
    refetch,
    
    // البيانات المنفصلة
    ...extractedData
  };
};

export default useUnifiedProductPageData;
