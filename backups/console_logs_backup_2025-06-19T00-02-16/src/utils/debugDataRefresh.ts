/**
 * أداة تشخيص لاختبار تحديث البيانات
 * يمكن استخدامها في الكونسول لاختبار النظام
 */

import { queryClient } from '@/lib/config/queryClient';

// دالة لاختبار إعدادات React Query الحالية
export const debugQuerySettings = () => {
  const defaultOptions = queryClient.getDefaultOptions();
  console.log('🔍 إعدادات React Query الحالية:', {
    refetchOnMount: defaultOptions.queries?.refetchOnMount,
    refetchOnWindowFocus: defaultOptions.queries?.refetchOnWindowFocus,
    refetchOnReconnect: defaultOptions.queries?.refetchOnReconnect,
    staleTime: defaultOptions.queries?.staleTime,
    gcTime: defaultOptions.queries?.gcTime,
  });
};

// دالة لإجبار تحديث البيانات
export const forceRefreshData = (queryKeys?: string[]) => {
  console.log('🔄 إجبار تحديث البيانات...');
  
  if (queryKeys && queryKeys.length > 0) {
    // تحديث استعلامات محددة
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ 
        queryKey: [key],
        exact: false 
      });
    });
    console.log('✅ تم تحديث الاستعلامات المحددة:', queryKeys);
  } else {
    // تحديث جميع الاستعلامات النشطة
    queryClient.invalidateQueries({ 
      type: 'active',
      refetchType: 'active'
    });
    console.log('✅ تم تحديث جميع الاستعلامات النشطة');
  }
};

// دالة لعرض حالة الكاش الحالية
export const debugCacheState = () => {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  console.log('📊 حالة الكاش الحالية:');
  console.log(`عدد الاستعلامات المخزنة: ${queries.length}`);
  
  const queryInfo = queries.map(query => ({
    queryKey: query.queryKey,
    status: query.state.status,
    dataUpdatedAt: new Date(query.state.dataUpdatedAt).toLocaleString('ar-SA'),
    staleTime: query.options.staleTime,
    isStale: query.isStale()
  }));
  
  console.table(queryInfo);
  return queryInfo;
};

// دالة لاختبار تحديث فئة معينة
export const testCategoryRefresh = async (organizationId: string) => {
  console.log('🧪 اختبار تحديث فئات المنتجات...');
  
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
    
    console.log('✅ تم تحديث فئات المنتجات بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تحديث فئات المنتجات:', error);
  }
};

// دالة لاختبار تحديث المنتجات
export const testProductRefresh = async (organizationId: string) => {
  console.log('🧪 اختبار تحديث المنتجات...');
  
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
    
    console.log('✅ تم تحديث المنتجات بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تحديث المنتجات:', error);
  }
};

// تصدير الدوال للاستخدام في الكونسول
if (typeof window !== 'undefined') {
  (window as any).debugQuerySettings = debugQuerySettings;
  (window as any).forceRefreshData = forceRefreshData;
  (window as any).debugCacheState = debugCacheState;
  (window as any).testCategoryRefresh = testCategoryRefresh;
  (window as any).testProductRefresh = testProductRefresh;
  
  console.log('🛠️ أدوات التشخيص متاحة في الكونسول:');
  console.log('- debugQuerySettings() - عرض إعدادات React Query');
  console.log('- forceRefreshData([queryKeys]) - إجبار تحديث البيانات');
  console.log('- debugCacheState() - عرض حالة الكاش');
  console.log('- testCategoryRefresh(orgId) - اختبار تحديث الفئات');
  console.log('- testProductRefresh(orgId) - اختبار تحديث المنتجات');
} 