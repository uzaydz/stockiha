import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';

// نوع البيانات المشتركة المحسنة
interface OptimizedSharedStoreDataContextType {
  organization: any | null;
  organizationSettings: any | null;
  products: any[];
  categories: any[];
  featuredProducts: any[];
  provinces: any[];
  municipalities: any[];
  callConfirmationStatuses: any[];
  shippingProviders: any[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
  getCacheStats: () => any;
  clearCache: () => void;
}

// السياق المحسن
const OptimizedSharedStoreDataContext = createContext<OptimizedSharedStoreDataContextType | null>(null);

// مزود البيانات المحسن - استدعاء واحد للبيانات المشتركة
export const OptimizedSharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  const { currentOrganization } = useTenant();
  const [sharedData, setSharedData] = useState<any>({
    organization: null,
    organizationSettings: null,
    products: [],
    categories: [],
    featuredProducts: [],
    provinces: [],
    municipalities: [],
    callConfirmationStatuses: [],
    shippingProviders: [],
    isLoading: true,
    error: null,
  });
  
  const [cacheStats, setCacheStats] = useState<any>({});

  // دالة جلب البيانات المشتركة المحسنة
  const fetchSharedData = useMemo(() => async () => {
    if (!currentOrganization?.id) {
      setSharedData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const startTime = performance.now();
    console.log('🚀 [OPTIMIZED SHARED] Fetching shared data with single RPC call...');

    try {
      setSharedData(prev => ({ ...prev, isLoading: true, error: null }));

      // استدعاء RPC واحد محسن للبيانات المشتركة
      const { data, error } = await supabase.rpc('get_shared_data_complete', {
        p_organization_id: currentOrganization.id,
      });

      const endTime = performance.now();
      console.log(`✅ [OPTIMIZED SHARED] Single RPC completed in ${(endTime - startTime).toFixed(2)}ms`);

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from get_shared_data_complete');
      }

      // البيانات مُنسقة بالفعل من RPC
      const responseData = {
        organizationSettings: data.organizationSettings || null,
        products: data.products || [],
        categories: data.categories || [],
        featuredProducts: data.featuredProducts || [],
        provinces: data.provinces || [],
        municipalities: data.municipalities || [],
        callConfirmationStatuses: data.callConfirmationStatuses || [],
        shippingProviders: data.shippingProviders || [],
      };

      // تحديث البيانات المشتركة
      setSharedData({
        organization: currentOrganization,
        organizationSettings: responseData.organizationSettings,
        products: responseData.products,
        categories: responseData.categories,
        featuredProducts: responseData.featuredProducts,
        provinces: responseData.provinces,
        municipalities: responseData.municipalities,
        callConfirmationStatuses: responseData.callConfirmationStatuses,
        shippingProviders: responseData.shippingProviders,
        isLoading: false,
        error: null,
      });

      // تحديث إحصائيات الكاش
      setCacheStats({
        lastFetch: new Date().toISOString(),
        duration: endTime - startTime,
        dataSize: JSON.stringify(responseData).length,
        providersCount: responseData.shippingProviders?.length || 0,
        provincesCount: responseData.provinces?.length || 0,
        municipalitiesCount: responseData.municipalities?.length || 0,
        categoriesCount: responseData.categories?.length || 0,
        productsCount: responseData.products?.length || 0,
      });

      console.log('📊 [OPTIMIZED SHARED] Loaded shared data successfully:', {
        organizations: currentOrganization?.name,
        providersCount: responseData.shippingProviders?.length || 0,
        provincesCount: responseData.provinces?.length || 0,
        municipalitiesCount: responseData.municipalities?.length || 0,
        categoriesCount: responseData.categories?.length || 0,
        productsCount: responseData.products?.length || 0,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
      });

    } catch (error: any) {
      console.error('❌ [OPTIMIZED SHARED] Error fetching shared data:', error);
      setSharedData(prev => ({
        ...prev,
        isLoading: false,
        error: error?.message || 'خطأ في جلب البيانات المشتركة',
      }));
    }
  }, [currentOrganization?.id]);

  // تحميل البيانات عند التهيئة أو تغيير المؤسسة
  useEffect(() => {
    fetchSharedData();
  }, [fetchSharedData]);

  // دوال الإدارة
  const refreshData = useMemo(() => () => {
    console.log('🔄 [OPTIMIZED SHARED] Refreshing shared data...');
    fetchSharedData();
  }, [fetchSharedData]);

  const getCacheStatsFunc = useMemo(() => () => cacheStats, [cacheStats]);

  const clearCache = useMemo(() => () => {
    console.log('🧹 [OPTIMIZED SHARED] Clearing cache...');
    setCacheStats({});
    refreshData();
  }, [refreshData]);

  // قيمة السياق المحسنة
  const contextValue = useMemo(() => ({
    ...sharedData,
    refreshData,
    getCacheStats: getCacheStatsFunc,
    clearCache,
  }), [
    sharedData.organization?.id,
    sharedData.organizationSettings?.id,
    sharedData.products?.length,
    sharedData.categories?.length,
    sharedData.featuredProducts?.length,
    sharedData.provinces?.length,
    sharedData.municipalities?.length,
    sharedData.callConfirmationStatuses?.length,
    sharedData.shippingProviders?.length,
    sharedData.isLoading,
    sharedData.error,
    refreshData,
    getCacheStatsFunc,
    clearCache,
  ]);

  return (
    <OptimizedSharedStoreDataContext.Provider value={contextValue}>
      {children}
    </OptimizedSharedStoreDataContext.Provider>
  );
});

// Hook لاستخدام البيانات المشتركة المحسنة
export const useOptimizedSharedStoreDataContext = (): OptimizedSharedStoreDataContextType => {
  const context = useContext(OptimizedSharedStoreDataContext);
  
  if (!context) {
    throw new Error('useOptimizedSharedStoreDataContext must be used within an OptimizedSharedStoreDataProvider');
  }
  
  return context;
};

// مزود بديل للصفحات التي لا تحتاج TenantProvider
export const MinimalOptimizedSharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  // بيانات افتراضية للصفحات البسيطة
  const defaultData = {
    organization: null,
    organizationSettings: null,
    products: [],
    categories: [],
    featuredProducts: [],
    provinces: [],
    municipalities: [],
    callConfirmationStatuses: [],
    shippingProviders: [],
    isLoading: false,
    error: null,
    refreshData: () => {},
    getCacheStats: () => ({}),
    clearCache: () => {},
  };

  return (
    <OptimizedSharedStoreDataContext.Provider value={defaultData}>
      {children}
    </OptimizedSharedStoreDataContext.Provider>
  );
}); 