/**
 * أداة تشخيص لاختبار تحديث البيانات
 * يمكن استخدامها في الكونسول لاختبار النظام
 */

import { queryClient } from '@/lib/config/queryClient';

// دالة لاختبار إعدادات React Query الحالية
export const debugQuerySettings = () => {
  const defaultOptions = queryClient.getDefaultOptions();
};

// دالة لإجبار تحديث البيانات
export const forceRefreshData = (queryKeys?: string[]) => {
  
  if (queryKeys && queryKeys.length > 0) {
    // تحديث استعلامات محددة
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ 
        queryKey: [key],
        exact: false 
      });
    });
  } else {
    // تحديث جميع الاستعلامات النشطة
    queryClient.invalidateQueries({ 
      type: 'active',
      refetchType: 'active'
    });
  }
};

// دالة لعرض حالة الكاش الحالية
export const debugCacheState = () => {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  const queryInfo = queries.map(query => ({
    queryKey: query.queryKey,
    status: query.state.status,
    dataUpdatedAt: new Date(query.state.dataUpdatedAt).toLocaleString('ar-SA'),
    staleTime: query.options.staleTime,
    isStale: query.isStale()
  }));
  
  return queryInfo;
};

// دالة لاختبار تحديث فئة معينة
export const testCategoryRefresh = async (organizationId: string) => {
  
  try {
    // إزالة الكاش الحالي
    await queryClient.invalidateQueries({
      queryKey: ['categories', organizationId],
      exact: true
    });
    
    // إجبار جلب البيانات الجديدة
    await queryClient.refetchQueries({
      queryKey: ['categories', organizationId],
      exact: true
    });
    
  } catch (error) {
  }
};

// دالة لاختبار تحديث المنتجات
export const testProductRefresh = async (organizationId: string) => {
  
  try {
    // إزالة الكاش الحالي
    await queryClient.invalidateQueries({
      queryKey: ['products', organizationId],
      exact: false // استخدام false للحصول على جميع المنتجات
    });
    
    // إجبار جلب البيانات الجديدة
    await queryClient.refetchQueries({
      queryKey: ['products', organizationId],
      exact: false
    });
    
  } catch (error) {
  }
};

// تصدير الدوال للاستخدام في الكونسول
if (typeof window !== 'undefined') {
  (window as any).debugQuerySettings = debugQuerySettings;
  (window as any).forceRefreshData = forceRefreshData;
  (window as any).debugCacheState = debugCacheState;
  (window as any).testCategoryRefresh = testCategoryRefresh;
  (window as any).testProductRefresh = testProductRefresh;
  
}
