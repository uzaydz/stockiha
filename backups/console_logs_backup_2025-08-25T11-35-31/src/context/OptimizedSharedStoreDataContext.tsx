import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';

// نوع البيانات المشتركة المحسنة
export interface OptimizedSharedStoreDataContextType {
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
export const OptimizedSharedStoreDataContext = createContext<OptimizedSharedStoreDataContextType | null>(null);

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

  // إضافة كاش محسن للبيانات المشتركة
  const sharedDataCache = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const CACHE_DURATION = 10 * 60 * 1000; // 10 دقائق للبيانات المشتركة
  const SESSION_CACHE_KEY = 'shared_data_cache';

  // دالة للحصول من sessionStorage
  const getFromSessionStorage = (orgId: string) => {
    try {
      const cached = sessionStorage.getItem(`${SESSION_CACHE_KEY}_${orgId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.timestamp && parsed.data) {
          return parsed;
        }
      }
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
    return null;
  };

  // دالة للحفظ في sessionStorage
  const saveToSessionStorage = (orgId: string, data: any, timestamp: number) => {
    try {
      const cacheData = {
        data,
        timestamp
      };
      sessionStorage.setItem(`${SESSION_CACHE_KEY}_${orgId}`, JSON.stringify(cacheData));
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
  };

  // دالة جلب البيانات المشتركة المحسنة
  const fetchSharedData = useMemo(() => async () => {
    if (!currentOrganization?.id) {
      setSharedData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const startTime = performance.now();

    // التحقق من sessionStorage أولاً (يبقى بعد تحديث الصفحة)
    const sessionCached = getFromSessionStorage(currentOrganization.id);
    const now = Date.now();

    if (sessionCached && (now - sessionCached.timestamp) < CACHE_DURATION) {
      // استخدام البيانات المخزنة مؤقتاً
      setSharedData({
        organization: currentOrganization,
        organizationSettings: sessionCached.data.organizationSettings,
        products: sessionCached.data.products,
        categories: sessionCached.data.categories,
        featuredProducts: sessionCached.data.featuredProducts,
        provinces: sessionCached.data.provinces,
        municipalities: sessionCached.data.municipalities,
        callConfirmationStatuses: sessionCached.data.callConfirmationStatuses,
        shippingProviders: sessionCached.data.shippingProviders,
        isLoading: false,
        error: null,
      });
      return;
    }

    // التحقق من كاش الذاكرة
    const cacheKey = `shared_data_${currentOrganization.id}`;
    const cached = sharedDataCache.current.get(cacheKey);

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // حفظ في sessionStorage أيضاً
      saveToSessionStorage(currentOrganization.id, cached.data, now);
      
      // استخدام البيانات المخزنة مؤقتاً
      setSharedData({
        organization: currentOrganization,
        organizationSettings: cached.data.organizationSettings,
        products: cached.data.products,
        categories: cached.data.categories,
        featuredProducts: cached.data.featuredProducts,
        provinces: cached.data.provinces,
        municipalities: cached.data.municipalities,
        callConfirmationStatuses: cached.data.callConfirmationStatuses,
        shippingProviders: cached.data.shippingProviders,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setSharedData(prev => ({ ...prev, isLoading: true, error: null }));

      // استدعاء RPC واحد محسن للبيانات المشتركة
      const { data, error } = await (supabase as any).rpc('get_shared_data_complete', {
        p_organization_id: currentOrganization.id,
      });

      const endTime = performance.now();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from get_shared_data_complete');
      }

      // البيانات مُنسقة بالفعل من RPC
      const responseData = {
        organizationSettings: (data as any).organizationSettings || null,
        products: (data as any).products || [],
        categories: (data as any).categories || [],
        featuredProducts: (data as any).featuredProducts || [],
        provinces: (data as any).provinces || [],
        municipalities: (data as any).municipalities || [],
        callConfirmationStatuses: (data as any).callConfirmationStatuses || [],
        shippingProviders: (data as any).shippingProviders || [],
      };

      // حفظ في كاش الذاكرة
      sharedDataCache.current.set(cacheKey, {
        data: responseData,
        timestamp: now
      });

      // حفظ في sessionStorage
      saveToSessionStorage(currentOrganization.id, responseData, now);

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
      setCacheStats(prev => ({
        ...prev,
        sharedDataFetches: prev.sharedDataFetches + 1,
        lastSharedDataFetch: endTime - startTime
      }));

    } catch (error: any) {
      setSharedData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [currentOrganization?.id, supabase]);

  // تحميل البيانات عند التهيئة أو تغيير المؤسسة
  useEffect(() => {
    fetchSharedData();
  }, [fetchSharedData]);

  // دوال الإدارة
  const refreshData = useMemo(() => () => {
    fetchSharedData();
  }, [fetchSharedData]);

  const getCacheStatsFunc = useMemo(() => () => cacheStats, [cacheStats]);

  const clearCache = useMemo(() => () => {
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
