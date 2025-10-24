import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { addAppEventListener, dispatchAppEvent } from '@/lib/events/eventManager';

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
  components: any[]; // 🔥 إضافة المكونات المخصصة
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
  console.log('🚀 [OptimizedSharedStoreDataProvider] تم تحميل OptimizedSharedStoreDataProvider');
  
  // 🔥 إصلاح: استخدام useTenantSafe لتجنب الأخطاء في الصفحات العامة
  let currentOrganization = null;
  try {
    const tenant = useTenant();
    currentOrganization = tenant?.currentOrganization;
    console.log('✅ [OptimizedSharedStoreDataProvider] تم الحصول على organization من useTenant:', currentOrganization);
  } catch (error) {
    // في حالة عدم توفر TenantContext، نحاول الحصول على البيانات من مصادر أخرى
    console.log('🔍 [OptimizedSharedStoreDataProvider] useTenant غير متوفر، البحث في مصادر أخرى');
    
    // البحث في window object للحصول على organization
    try {
      const win: any = typeof window !== 'undefined' ? window : {};
      const earlyData = win.__EARLY_STORE_DATA__?.data || win.__CURRENT_STORE_DATA__ || win.__PREFETCHED_STORE_DATA__;
      
      if (earlyData?.organization_details || earlyData?.organization) {
        const orgData = earlyData.organization_details || earlyData.organization;
        currentOrganization = {
          id: orgData.id || null,
          name: orgData.name || '',
          subdomain: orgData.subdomain || null,
          domain: orgData.domain || null,
          logo_url: orgData.logo_url || null,
          subscription_tier: orgData.subscription_tier || 'free',
          subscription_status: orgData.subscription_status || 'active',
          settings: orgData.settings || {},
          created_at: orgData.created_at || new Date().toISOString(),
          updated_at: orgData.updated_at || new Date().toISOString(),
          owner_id: orgData.owner_id || null
        };
        console.log('✅ [OptimizedSharedStoreDataProvider] تم الحصول على organization من window object:', currentOrganization);
      }
    } catch (windowError) {
      console.log('❌ [OptimizedSharedStoreDataProvider] فشل في الحصول على organization من window object:', windowError);
    }
  }
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
    components: [], // 🔥 إضافة المكونات المخصصة
    isLoading: true,
    error: null
  });
  
  const [cacheStats, setCacheStats] = useState<any>({});

  // إضافة كاش محسن للبيانات المشتركة
  const sharedDataCache = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const CACHE_DURATION = 10 * 60 * 1000; // 10 دقائق للبيانات المشتركة
  const SESSION_CACHE_KEY = 'shared_data_cache';

  // 🔥 إضافة استماع لبيانات window object من main.tsx
  useEffect(() => {
    const handleStoreDataReady = () => {
      console.log('🎯 [OptimizedSharedStoreDataProvider] تم استلام حدث storeDataReady');
      const windowEarlyData = (window as any).__EARLY_STORE_DATA__ || (window as any).__PREFETCHED_STORE_DATA__;
      const windowSharedData = (window as any).__SHARED_STORE_DATA__;
      
      if (windowEarlyData?.data || windowSharedData) {
        // 🔥 إصلاح: التعامل مع كلا التنسيقين
        let data = null;
        if (windowEarlyData?.data) {
          data = windowEarlyData.data;
        } else if (windowSharedData) {
          // إذا كان windowSharedData يحتوي على organization_details و organization_settings مباشرة
          if (windowSharedData.organization_details || windowSharedData.organization_settings) {
            data = windowSharedData;
          }
        }

        if (data) {
          console.log('🔄 [OptimizedSharedStoreDataProvider] تحديث البيانات من window object');
          console.log('🔍 [OptimizedSharedStoreDataProvider] فحص البيانات:', {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : [],
            hasOrganizationDetails: !!(data?.organization_details),
            hasOrganizationSettings: !!(data?.organization_settings),
            hasOrganization: !!(data?.organization),
            hasSettings: !!(data?.organizationSettings),
          });

          // 🔥 إصلاح: تحديث currentOrganization إذا لم يكن متوفراً
          if (!currentOrganization && (data.organization_details || data.organization)) {
            const orgData = data.organization_details || data.organization;
            currentOrganization = {
              id: orgData.id || null,
              name: orgData.name || '',
              subdomain: orgData.subdomain || null,
              domain: orgData.domain || null,
              logo_url: orgData.logo_url || null,
              subscription_tier: orgData.subscription_tier || 'free',
              subscription_status: orgData.subscription_status || 'active',
              settings: orgData.settings || {},
              created_at: orgData.created_at || new Date().toISOString(),
              updated_at: orgData.updated_at || new Date().toISOString(),
              owner_id: orgData.owner_id || null
            };
          }

          const newSharedData = {
            organization: data.organization_details || data.organization || currentOrganization,
            organizationSettings: data.organization_settings || data.organizationSettings || null,
            products: data.featured_products || [],
            categories: data.categories || [],
            featuredProducts: data.featured_products || [],
            provinces: data.provinces || [],
            municipalities: data.municipalities || [],
            callConfirmationStatuses: data.call_confirmation_statuses || [],
            shippingProviders: data.shipping_providers || [],
            components: data.store_layout_components || [], // 🔥 إضافة المكونات المخصصة
            isLoading: false,
            error: null
          };
          
          console.log('🔄 [OptimizedSharedStoreDataProvider] تحديث sharedData:', {
            hasOrganization: !!newSharedData.organization,
            hasOrganizationSettings: !!newSharedData.organizationSettings,
            hasCustomJs: !!newSharedData.organizationSettings?.custom_js,
            organizationSettingsId: newSharedData.organizationSettings?.id,
            organizationId: newSharedData.organization?.id,
            customJsValue: newSharedData.organizationSettings?.custom_js
          });
          
          setSharedData(newSharedData);
        
        // ✅ إصلاح: إرسال حدث للتنبيه بأن البيانات جاهزة
        dispatchAppEvent('optimizedStoreDataReady', {
          organization: data.organization_details || currentOrganization,
          organizationSettings: data.organization_settings,
          timestamp: Date.now()
        }, {
          dedupeKey: `optimizedStoreDataReady:${(data.organization_details || currentOrganization)?.id ?? 'global'}`
        });
      }
    }
  };

    const handleStoreInitDataReady = () => {
      console.log('🎯 [OptimizedSharedStoreDataProvider] تم استلام حدث storeInitDataReady');
      handleStoreDataReady();
    };

    const unsubscribeDataReady = addAppEventListener(
      'storeDataReady',
      handleStoreDataReady as any
    );
    const unsubscribeInitReady = addAppEventListener(
      'storeInitDataReady',
      handleStoreInitDataReady as any
    );

    return () => {
      unsubscribeDataReady();
      unsubscribeInitReady();
    };
  }, [currentOrganization]);

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

  // 🔥 تحسين: دالة للتحميل الأساسي السريع للبيانات الأساسية فقط
  const fetchBasicData = useMemo(() => async () => {
    if (!currentOrganization?.id) {
      setSharedData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const { getStoreBasicData } = await import('@/lib/api/deduplicatedApi');
      const data = await getStoreBasicData(currentOrganization.subdomain || 'default');

      if (data && !data.error) {
        setSharedData({
          organization: data.organization_details || currentOrganization,
          organizationSettings: data.organization_settings || null,
          products: [], // لا نحتاج المنتجات في البيانات الأساسية
          categories: [], // لا نحتاج الفئات في البيانات الأساسية
          featuredProducts: [], // لا نحتاج المنتجات المميزة في البيانات الأساسية
          provinces: [], // لا نحتاج المحافظات في البيانات الأساسية
          municipalities: [],
          callConfirmationStatuses: [],
          shippingProviders: [],
          components: [], // لا نحتاج المكونات في البيانات الأساسية
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      // في حالة فشل التحميل الأساسي، استخدم البيانات الجزئية كـ fallback
      try {
        const { getStoreInitDataPartial } = await import('@/lib/api/deduplicatedApi');
        const data = await getStoreInitDataPartial(currentOrganization.subdomain || 'default', ['basic']);
        if (data && !data.error) {
          setSharedData({
            organization: data.organization_details || currentOrganization,
            organizationSettings: data.organization_settings || null,
            products: [],
            categories: data.categories || [],
            featuredProducts: [],
            provinces: data.provinces || [],
            municipalities: [],
            callConfirmationStatuses: [],
            shippingProviders: [],
            components: data.store_layout_components || [],
            isLoading: false,
            error: null,
          });
        }
      } catch (fallbackError) {
        // في حالة فشل جميع المحاولات، استخدم البيانات الكاملة
        fetchSharedData();
      }
    }
  }, [currentOrganization]);

  // دالة جلب البيانات المشتركة المحسنة الكاملة
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
    if (currentOrganization?.id) {
      fetchSharedData();
    }
  }, [fetchSharedData, currentOrganization?.id]);

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
  const contextValue = useMemo(() => {
    const value = {
      ...sharedData,
      refreshData,
      getCacheStats: getCacheStatsFunc,
      clearCache,
    };
    
    console.log('🎯 [OptimizedSharedStoreDataProvider] إنشاء contextValue:', {
      hasOrganization: !!value.organization,
      hasOrganizationSettings: !!value.organizationSettings,
      hasCustomJs: !!value.organizationSettings?.custom_js,
      organizationSettingsId: value.organizationSettings?.id,
      organizationId: value.organization?.id,
      customJsValue: value.organizationSettings?.custom_js,
      isLoading: value.isLoading
    });
    
    return value;
  }, [
    // 🔥 إصلاح: استخدام قيم مستقرة بدلاً من الدوال
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
    sharedData.error
    // 🔥 إصلاح: إزالة الدوال من dependencies لتجنب إعادة الإنشاء
  ]);

  console.log('🎯 [OptimizedSharedStoreDataProvider] تقديم contextValue للأطفال:', {
    hasOrganization: !!contextValue.organization,
    hasOrganizationSettings: !!contextValue.organizationSettings,
    hasCustomJs: !!contextValue.organizationSettings?.custom_js,
    organizationSettingsId: contextValue.organizationSettings?.id,
    organizationId: contextValue.organization?.id,
    customJsValue: contextValue.organizationSettings?.custom_js,
    isLoading: contextValue.isLoading
  });

  return (
    <OptimizedSharedStoreDataContext.Provider value={contextValue}>
      {children}
    </OptimizedSharedStoreDataContext.Provider>
  );
});

// Hook لاستخدام البيانات المشتركة المحسنة
export const useOptimizedSharedStoreDataContext = (): OptimizedSharedStoreDataContextType => {
  const context = useContext(OptimizedSharedStoreDataContext);
  
  console.log('🔍 [useOptimizedSharedStoreDataContext] استدعاء hook:', {
    hasContext: !!context,
    hasOrganization: !!context?.organization,
    hasOrganizationSettings: !!context?.organizationSettings,
    hasCustomJs: !!context?.organizationSettings?.custom_js,
    organizationSettingsId: context?.organizationSettings?.id,
    organizationId: context?.organization?.id,
    customJsValue: context?.organizationSettings?.custom_js,
    isLoading: context?.isLoading
  });
  
  if (!context) {
    throw new Error('useOptimizedSharedStoreDataContext must be used within an OptimizedSharedStoreDataProvider');
  }
  
  return context;
};

// مزود بديل للصفحات التي لا تحتاج TenantProvider
export const MinimalOptimizedSharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  // 🔥 تحسين: تحميل سريع من localStorage عند التهيئة - البيانات الأساسية أولاً
  const getInitialData = () => {
    try {
      // محاولة البيانات الأساسية أولاً (أسرع)
      const basicCached = localStorage.getItem('bazaar_store_basic_data');
      if (basicCached) {
        const basicParsed = JSON.parse(basicCached);
        if (basicParsed && basicParsed.data && (Date.now() - basicParsed.timestamp) < 600000) { // 10 دقائق
          return {
            organization: basicParsed.data.organization_details || null,
            organizationSettings: basicParsed.data.organization_settings || null,
            products: [],
            categories: [],
            featuredProducts: [],
            provinces: [],
            municipalities: [],
            callConfirmationStatuses: [],
            shippingProviders: [],
            components: [],
            isLoading: false,
            error: null,
          };
        }
      }

      // fallback للبيانات الكاملة
      const fullCached = localStorage.getItem('bazaar_store_init_data');
      if (fullCached) {
        const fullParsed = JSON.parse(fullCached);
        if (fullParsed && fullParsed.data && (Date.now() - fullParsed.timestamp) < 300000) { // 5 دقائق
          return {
            organization: fullParsed.data.organization_details || null,
            organizationSettings: fullParsed.data.organization_settings || null,
            products: fullParsed.data.featured_products || [],
            categories: fullParsed.data.categories || [],
            featuredProducts: fullParsed.data.featured_products || [],
            provinces: fullParsed.data.provinces || [],
            municipalities: fullParsed.data.municipalities || [],
            callConfirmationStatuses: fullParsed.data.call_confirmation_statuses || [],
            shippingProviders: fullParsed.data.shipping_providers || [],
            components: fullParsed.data.store_layout_components || [],
            isLoading: false,
            error: null,
          };
        }
      }
    } catch (e) {
      // تجاهل أخطاء localStorage
    }
    return {
      organization: null,
      organizationSettings: null,
      products: [],
      categories: [],
      featuredProducts: [],
      provinces: [],
      municipalities: [],
      callConfirmationStatuses: [],
      shippingProviders: [],
      components: [],
      isLoading: false,
      error: null,
    };
  };

  const [sharedData, setSharedData] = useState<any>(getInitialData());

  // 🔥 إضافة استماع لبيانات window object من main.tsx
  useEffect(() => {
    let lastSignature: string | null = null;
    const handleStoreDataReady = () => {
      console.log('🎯 [MinimalOptimizedSharedStoreDataProvider] تم استلام حدث storeDataReady');
      const windowEarlyData = (window as any).__EARLY_STORE_DATA__ || (window as any).__PREFETCHED_STORE_DATA__;
      const windowSharedData = (window as any).__SHARED_STORE_DATA__;

      // 🔥 إصلاح: إضافة logs لتتبع البيانات المستلمة
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 [MinimalOptimizedSharedStoreDataProvider] البيانات المستلمة من window object:', {
          hasWindowEarlyData: !!windowEarlyData,
          hasWindowSharedData: !!windowSharedData,
          windowEarlyDataKeys: windowEarlyData ? Object.keys(windowEarlyData) : [],
          windowSharedDataKeys: windowSharedData ? Object.keys(windowSharedData) : [],
          hasWindowEarlyDataData: !!(windowEarlyData?.data),
          hasWindowSharedDataDirect: !!windowSharedData,
        });
      }

      if (windowEarlyData?.data || windowSharedData) {
        // 🔥 إصلاح: التعامل مع كلا التنسيقين
        let data = null;
        if (windowEarlyData?.data) {
          data = windowEarlyData.data;
        } else if (windowSharedData) {
          // إذا كان windowSharedData يحتوي على organization_details و organization_settings مباشرة
          if (windowSharedData.organization_details || windowSharedData.organization_settings) {
            data = windowSharedData;
          }
        }

        if (data) {
          console.log('🔄 [MinimalOptimizedSharedStoreDataProvider] تحديث البيانات من window object');
          console.log('🔍 [MinimalOptimizedSharedStoreDataProvider] فحص البيانات:', {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : [],
            hasStoreLayoutComponents: !!(data?.store_layout_components),
            hasOrganizationDetails: !!(data?.organization_details),
            hasOrganizationSettings: !!(data?.organization_settings),
            hasOrganization: !!(data?.organization),
            hasSettings: !!(data?.organizationSettings),
            storeLayoutComponents: data?.store_layout_components,
            componentsCount: data?.store_layout_components?.length || 0,
            components: data?.store_layout_components?.map((c: any) => c.component_type) || []
          });
          // تجاهل التحديث إذا لم تتغير البصمة لتفادي إعادة الرندر
          try {
            const sig = JSON.stringify({
              org: data.organization_details?.id || data.organization?.id || null,
              settings: data.organization_settings?.id || data.organizationSettings?.id || null,
              comps: (data.store_layout_components || []).length
            });
            if (sig === lastSignature) {
              return;
            }
            lastSignature = sig;
          } catch {}

          setSharedData(prevData => {
            const newData = {
              organization: data.organization_details || data.organization || null,
              organizationSettings: data.organization_settings || data.organizationSettings || null,
              products: data.featured_products || [],
              categories: data.categories || [],
              featuredProducts: data.featured_products || [],
              provinces: data.provinces || [],
              municipalities: data.municipalities || [],
              callConfirmationStatuses: data.call_confirmation_statuses || [],
              shippingProviders: data.shipping_providers || [],
              components: data.store_layout_components || [], // 🔥 إضافة المكونات المخصصة
              isLoading: false,
              error: null
            };

            // 🔥 إصلاح: إضافة logs لتتبع تحديث البيانات
            if (process.env.NODE_ENV === 'development') {
              console.log('🧪 [MinimalOptimizedSharedStoreDataProvider] تحديث البيانات:', {
                hasOrganization: !!newData.organization,
                hasOrganizationSettings: !!newData.organizationSettings,
                hasCustomJs: !!newData.organizationSettings?.custom_js,
                organizationSettingsId: newData.organizationSettings?.id,
                organizationId: newData.organization?.id,
                dataSource: windowEarlyData?.data ? 'early' : 'shared',
                timestamp: Date.now()
              });
            }

            return newData;
          });
        
        // ✅ إصلاح: إرسال حدث للتنبيه بأن البيانات جاهزة
        dispatchAppEvent('minimalOptimizedStoreDataReady', {
          organization: data.organization_details,
          organizationSettings: data.organization_settings,
          timestamp: Date.now()
        }, {
          dedupeKey: `minimalOptimizedStoreDataReady:${data.organization_details?.id ?? 'global'}`
        });
      }
    }
  };

    const handleStoreInitDataReady = () => {
      console.log('🎯 [MinimalOptimizedSharedStoreDataProvider] تم استلام حدث storeInitDataReady');
      handleStoreDataReady();
    };

    const unsubscribeDataReady = addAppEventListener(
      'storeDataReady',
      handleStoreDataReady as any
    );
    const unsubscribeInitReady = addAppEventListener(
      'storeInitDataReady',
      handleStoreInitDataReady as any
    );

    return () => {
      unsubscribeDataReady();
      unsubscribeInitReady();
    };
  }, []);

  const contextValue = {
    ...sharedData,
    refreshData: () => {},
    getCacheStats: () => ({}),
    clearCache: () => {}
  };

  return (
    <OptimizedSharedStoreDataContext.Provider value={contextValue}>
      {children}
    </OptimizedSharedStoreDataContext.Provider>
  );
});
