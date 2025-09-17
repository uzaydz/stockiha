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
  initialDataUpdatedAt,
  queryKey
}: UseUnifiedProductPageDataProps) => {
  // استخدام الـ hooks المساعدة
  const queryOptions = useQueryOptions(productId, organizationId, enabled, dataScope, initialData, initialDataUpdatedAt, queryKey);

  // استخدام React Query مع deduplication قوي
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery(queryOptions);

  // استخراج البيانات المنفصلة
  const extractedData = useExtractedData(data);

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
