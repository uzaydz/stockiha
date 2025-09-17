import React, { createContext, useContext, ReactNode, useMemo, useEffect, useRef, useState } from 'react';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';
import { OptimizedSharedStoreDataContext, type OptimizedSharedStoreDataContextType } from '@/context/OptimizedSharedStoreDataContext';

// نوع البيانات المشتركة
export interface SharedStoreDataContextType {
  organization: any | null;
  organizationSettings: any | null;
  products: any[];
  categories: any[];
  featuredProducts: any[];
  components?: any[];
  footerSettings?: any | null;
  testimonials?: any[];
  seoMeta?: any | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

// دالة آمنة لاستخدام useSharedStoreData مع معالجة الأخطاء المبسطة
function useSharedStoreDataSafe() {
  try {
    const result = useSharedStoreData({
      includeCategories: true,
      includeProducts: false,
      includeFeaturedProducts: true,
      includeComponents: true,
      enabled: true
    });

    // تبسيط الاستماع للأحداث - تقليل التكرار - إصلاح: إزالة dependencies لمنع loop
    useEffect(() => {
      const handleDataReady = () => {
        // فقط إعادة الجلب إذا لم تكن البيانات متوفرة ولم نكن في حالة تحميل
        if (!result.organization && !result.isLoading) {
          result.refreshData?.();
        }
      };

      window.addEventListener('storeDataReady', handleDataReady);
      window.addEventListener('storeInitDataReady', handleDataReady);

      return () => {
        window.removeEventListener('storeDataReady', handleDataReady);
        window.removeEventListener('storeInitDataReady', handleDataReady);
      };
    }, []); // إزالة dependencies لمنع إعادة التشغيل المتكرر

    // إزالة logging للإنتاج

    return result;
  } catch (error) {
    // معالجة أبسط للأخطاء
    if (error instanceof Error && error.message.includes('useTenant')) {
      return {
        organization: null,
        organizationSettings: null,
        products: [],
        categories: [],
        featuredProducts: [],
        components: [],
        footerSettings: null,
        testimonials: [],
        seoMeta: null,
        isLoading: false,
        error: 'TenantProvider غير متاح',
        refreshData: () => {}
      };
    }
    throw error;
  }
}

// السياق المركزي
export const SharedStoreDataContext = createContext<SharedStoreDataContextType | null>(null);

// مزود السياق المركزي - يستدعي useSharedStoreData مرة واحدة فقط
export const SharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  // 🚨 حقن مباشر للبيانات من window object
  const [injectedData, setInjectedData] = useState<SharedStoreDataContextType | null>(null);
  
  // متغير لتتبع تحديثات window object
  const [windowDataVersion, setWindowDataVersion] = useState<number>(0);

  // مراقبة تحديثات window object - إصلاح: إزالة windowDataVersion من dependencies
  useEffect(() => {
    const handleStoreDataUpdates = () => {
      setWindowDataVersion(prev => prev + 1);
    };

    window.addEventListener('storeDataReady', handleStoreDataUpdates);
    window.addEventListener('storeInitDataReady', handleStoreDataUpdates);

    return () => {
      window.removeEventListener('storeDataReady', handleStoreDataUpdates);
      window.removeEventListener('storeInitDataReady', handleStoreDataUpdates);
    };
  }, []); // إزالة windowDataVersion من dependencies لمنع loop
  
  // 🔥 إصلاح: منع إرسال الأحداث المتكررة
  const hasInjectedData = useRef(false);

  // حقن مباشر للبيانات من window object
  useEffect(() => {
    const injectDataFromWindow = () => {
      try {
        const win: any = typeof window !== 'undefined' ? window : {};
        const windowData = win.__EARLY_STORE_DATA__?.data ||
                           win.__CURRENT_STORE_DATA__ ||
                           win.__PREFETCHED_STORE_DATA__ ||
                           win.__STORE_DATA__ ||
                           null;

        if (windowData && !hasInjectedData.current) {
          const orgData = windowData.organization_details ||
                         windowData.organization ||
                         win.__STORE_ORGANIZATION__;
          const orgSettings = windowData.organization_settings ||
                            windowData.organizationSettings ||
                            win.__STORE_SETTINGS__;

          if (orgData && !injectedData) {
            hasInjectedData.current = true; // منع إرسال الحدث مرة أخرى

            // حقن البيانات مباشرة
            const injected: SharedStoreDataContextType = {
              organization: orgData,
              organizationSettings: orgSettings || null,
              products: windowData.products || [],
              categories: windowData.categories || [],
              featuredProducts: windowData.featured_products || windowData.featuredProducts || [],
              components: windowData.store_layout_components || windowData.components || [],
              footerSettings: windowData.footer_settings || windowData.footerSettings || null,
              testimonials: windowData.testimonials || [],
              seoMeta: windowData.seo_meta || windowData.seoMeta || null,
              isLoading: false,
              error: null,
              refreshData: () => {}
            };

            setInjectedData(injected);

            // حقن البيانات أيضاً في تنسيق مباشر للمكونات الأخرى
            (window as any).__BAZAAR_STORE_CONTEXT__ = injected;

            // إشعار العالم أن البيانات جاهزة - مرة واحدة فقط
            window.dispatchEvent(new CustomEvent('injectedDataReady', {
              detail: injected
            }));
            window.dispatchEvent(new CustomEvent('bazaarStoreContextReady', {
              detail: injected
            }));

            // 🔥 إعادة استدعاء FaviconManager بعد حقن البيانات
            setTimeout(() => {
              try {
                // استخدام import() بدلاً من require في ES modules
                import('../managers/FaviconManager').then(({ faviconManager }) => {
                  faviconManager.initialize();
                }).catch(error => {
                  console.warn('⚠️ [SharedStoreDataContext] فشل إعادة استدعاء FaviconManager:', error);
                });
              } catch (error) {
                console.warn('⚠️ [SharedStoreDataContext] خطأ في إعادة استدعاء FaviconManager:', error);
              }
            }, 200);
          }
        }
      } catch (error) {
        // تجاهل الأخطاء
      }
    };
    
    // حقن فوري
    injectDataFromWindow();
    
    // حقن دوري كل 500ms لمدة 10 ثوان
    const interval = setInterval(injectDataFromWindow, 500);
    setTimeout(() => clearInterval(interval), 10000);
    
    return () => clearInterval(interval);
  }, [injectedData]);

  // استدعاء آمن لـ useSharedStoreData في كامل التطبيق
  const sharedData = useSharedStoreDataSafe();
  
  // 🚨 إضافة state مباشر للبيانات من window object
  const [directWindowData, setDirectWindowData] = useState<any>(null);
  
  // فحص window object مباشرة عند التحميل وعند التحديثات
  useEffect(() => {
    const checkWindowData = () => {
      try {
        const win: any = typeof window !== 'undefined' ? window : {};
        const windowData = win.__EARLY_STORE_DATA__?.data ||
                           win.__CURRENT_STORE_DATA__ ||
                           win.__PREFETCHED_STORE_DATA__ ||
                           win.__STORE_DATA__ ||
                           null;
        
        if (windowData && (windowData.organization_details || windowData.organization)) {
          setDirectWindowData(windowData);
        }
      } catch (error) {
        console.error('❌ [DEBUG] خطأ في فحص window object:', error);
      }
    };
    
    // فحص فوري
    checkWindowData();
    
    // فحص دوري كل ثانية لمدة 10 ثوان
    const interval = setInterval(checkWindowData, 1000);
    setTimeout(() => clearInterval(interval), 10000);
    
    return () => clearInterval(interval);
  }, [windowDataVersion]);
  
  // 🔥 تحسين: استخدام useMemo مع dependencies محسنة لمنع إعادة الإنشاء المتكرر
  const contextValue = useMemo(() => {
    // أولوية للبيانات المحقونة مباشرة
    if (injectedData) {
      return injectedData;
    }
    
    // 🚨 استخدام directWindowData إذا كانت البيانات من sharedData فارغة
    if ((!sharedData.organization && !sharedData.organizationSettings && !sharedData.isLoading) || directWindowData) {
      const windowData = directWindowData || (() => {
        try {
          const win: any = typeof window !== 'undefined' ? window : {};
          return win.__EARLY_STORE_DATA__?.data ||
                 win.__CURRENT_STORE_DATA__ ||
                 win.__PREFETCHED_STORE_DATA__ ||
                 null;
        } catch {
          return null;
        }
      })();
      
      if (windowData) {
        const orgData = windowData.organization_details || windowData.organization;
        const orgSettings = windowData.organization_settings || windowData.organizationSettings;
        
        if (orgData || orgSettings) {
          // استخدام البيانات من window object
          console.log('🎯 [DEBUG] استخدام fallback من window object:', {
            hasOrgData: !!orgData,
            hasOrgSettings: !!orgSettings,
            orgId: orgData?.id,
            orgName: orgData?.name,
            settingsSiteName: orgSettings?.site_name
          });
          
          return {
            organization: orgData || null,
            organizationSettings: orgSettings || null,
            products: windowData.products || [],
            categories: windowData.categories || [],
            featuredProducts: windowData.featured_products || windowData.featuredProducts || [],
            components: windowData.store_layout_components || windowData.components || [],
            footerSettings: windowData.footer_settings || windowData.footerSettings || null,
            testimonials: windowData.testimonials || [],
            seoMeta: windowData.seo_meta || windowData.seoMeta || null,
            isLoading: false,
            error: null,
            refreshData: sharedData.refreshData || (() => {})
          } as SharedStoreDataContextType;
        }
      }
    }
    
    console.log('🔍 [DEBUG] إرجاع sharedData العادية:', {
      hasOrganization: !!sharedData.organization,
      hasOrganizationSettings: !!sharedData.organizationSettings,
      isLoading: sharedData.isLoading,
      orgId: sharedData.organization?.id
    });
    
    return sharedData;
  }, [
    // 🔥 تبسيط dependencies لضمان التحديث
    injectedData, // أولوية للبيانات المحقونة
    sharedData,
    windowDataVersion, // إضافة windowDataVersion لإجبار إعادة التقييم عند تحديث window object
    directWindowData // إضافة directWindowData لإجبار إعادة التقييم عند توفر البيانات
  ]);

  // إضافة useEffect لمنع الاستدعاءات المكررة
  useEffect(() => {
    // تنظيف cache قديم عند تغيير المؤسسة
    if (sharedData.organization?.id) {
      const cacheKey = `store-data-${sharedData.organization.id}`;
      // الاحتفاظ بالبيانات الحالية فقط
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 [SharedStoreDataContext] البيانات جاهزة:', {
          organization: !!sharedData.organization,
          organizationSettings: !!sharedData.organizationSettings,
          featuredProducts: sharedData.featuredProducts?.length || 0
        });
      }
      
      // إرسال حدث للمكونات بأن البيانات جاهزة
      window.dispatchEvent(new CustomEvent('sharedStoreDataReady', {
        detail: {
          organization: sharedData.organization,
          organizationSettings: sharedData.organizationSettings,
          timestamp: Date.now()
        }
      }));
    }
  }, [sharedData.organization?.id ?? null, sharedData.organizationSettings?.id ?? null]);

  return (
    <SharedStoreDataContext.Provider value={contextValue}>
      {children}
    </SharedStoreDataContext.Provider>
  );
});

// Hook لاستخدام البيانات المشتركة - محسن لمنع re-renders
export const useSharedStoreDataContext = (): SharedStoreDataContextType => {
  const sharedContext = useContext(SharedStoreDataContext);
  const optimizedContext = useContext(
    OptimizedSharedStoreDataContext as React.Context<OptimizedSharedStoreDataContextType | null>
  );

  // 🔥 إصلاح: إزالة setForceUpdate لمنع re-renders المستمرة - الآن نعتمد على dependencies المستقرة في useMemo

  // 🔥 تحسين: استخدام useMemo لضمان إرجاع نفس الكائن المرجعي
  const renderCount = useRef(0);
  const lastWarningTime = useRef(0);
  renderCount.current++;

  return useMemo(() => {
    // تقليل رسائل التصحيح لتحسين الأداء - عرض كل 15 renders فقط
    const shouldLogContext = renderCount.current === 1 || renderCount.current % 15 === 0;

    // تحذير للاستدعاءات المتكررة جداً - مع تقليل التكرار باستخدام الوقت
    const now = Date.now();
    if (renderCount.current > 50 && (now - lastWarningTime.current) > 5000) { // تحذير كل 5 ثوانٍ
      console.warn('⚠️ [useSharedStoreDataContext] عدد استدعاءات مرتفع جداً:', renderCount.current);
      lastWarningTime.current = now;
    }

    // 🔥 تحسين: التحقق من البيانات الجديدة مرة واحدة فقط
    const win: any = typeof window !== 'undefined' ? window : {};
    const latestEarlyData = win.__EARLY_STORE_DATA__?.data;
    const latestPrefetchedData = win.__PREFETCHED_STORE_DATA__;

    let result: SharedStoreDataContextType;

    // 🔥 تحسين: التحقق من sessionStorage أولاً للاستمرارية عند التنقل بين الصفحات
    let sessionData = null;
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const storeKey = `store_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const storedData = typeof window !== 'undefined' ? sessionStorage.getItem(storeKey) : null;

      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData && parsedData.data && (parsedData.data.components?.length > 0 || parsedData.data.products?.length > 0)) {
          sessionData = parsedData.data;
        }
      }
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }

    // 🔥 تحسين: التحقق من البيانات الجديدة من early preload أولاً (تحقق من البيانات الأساسية)
    if (latestEarlyData && (latestEarlyData.organization_details || latestEarlyData.organization || latestEarlyData.components?.length > 0 || latestEarlyData.products?.length > 0 || latestEarlyData.categories?.length > 0)) {
      const orgData = latestEarlyData.organization_details || latestEarlyData.organization || null;
      const orgSettings = latestEarlyData.organization_settings || latestEarlyData.organizationSettings || null;
      
      // إزالة logging للإنتاج
      
      result = {
        organization: orgData,
        organizationSettings: orgSettings,
        products: latestEarlyData.products || [],
        categories: latestEarlyData.categories || [],
        featuredProducts: latestEarlyData.featured_products || latestEarlyData.featuredProducts || [],
        components: latestEarlyData.store_layout_components || latestEarlyData.components || [],
        footerSettings: latestEarlyData.footer_settings || latestEarlyData.footerSettings,
        testimonials: latestEarlyData.testimonials || [],
        seoMeta: latestEarlyData.seo_meta || latestEarlyData.seoMeta,
        isLoading: false,
        error: null,
        refreshData: () => {},
      } as SharedStoreDataContextType;
    }
    // ثم تحقق من البيانات المحملة مسبقاً من prefetchManager (فقط إذا كانت تحتوي على بيانات حقيقية)
    else if (latestPrefetchedData && (latestPrefetchedData.components?.length > 0 || latestPrefetchedData.products?.length > 0 || latestPrefetchedData.categories?.length > 0)) {
      result = {
        organization: latestPrefetchedData.organization_details || latestPrefetchedData.organization || null,
        organizationSettings: latestPrefetchedData.organization_settings || latestPrefetchedData.organizationSettings || latestPrefetchedData,
        products: latestPrefetchedData.products || [],
        categories: latestPrefetchedData.categories || [],
        featuredProducts: latestPrefetchedData.featured_products || latestPrefetchedData.featuredProducts || [],
        components: latestPrefetchedData.store_layout_components || latestPrefetchedData.components || [],
        footerSettings: latestPrefetchedData.footer_settings || latestPrefetchedData.footerSettings,
        testimonials: latestPrefetchedData.testimonials || [],
        seoMeta: latestPrefetchedData.seo_meta || latestPrefetchedData.seoMeta,
        isLoading: false,
        error: null,
        refreshData: () => {},
      } as SharedStoreDataContextType;
    }
    // 🔥 إضافة: استخدام sessionStorage كمصدر أساسي للاستمرارية
    else if (sessionData) {
      const parsedData = JSON.parse(sessionData);
      if (parsedData && parsedData.data) {
        const data = parsedData.data;
        result = {
          organization: data.organization_details || data.organization || null,
          organizationSettings: data.organization_settings || data.organizationSettings || null,
          products: data.products || [],
          categories: data.categories || [],
          featuredProducts: data.featured_products || data.featuredProducts || [],
          components: data.store_layout_components || data.components || [],
          footerSettings: data.footer_settings || data.footerSettings,
          testimonials: data.testimonials || [],
          seoMeta: data.seo_meta || data.seoMeta,
          isLoading: false,
          error: null,
          refreshData: () => {},
        } as SharedStoreDataContextType;
      }
    }
    // 1) Preferred shared context (store entry)
    else if (sharedContext) {
      result = sharedContext;
    }
    // 2) Fallback to optimized context (platform entry)
    else if (optimizedContext) {
      // If optimized context has data, surface it using the same shape
      if (optimizedContext.organization || optimizedContext.organizationSettings ||
          optimizedContext.components?.length > 0 || optimizedContext.categories?.length > 0) {
        result = {
          organization: optimizedContext.organization,
          organizationSettings: optimizedContext.organizationSettings,
          products: optimizedContext.products,
          categories: optimizedContext.categories,
          featuredProducts: optimizedContext.featuredProducts,
          components: optimizedContext.components || [],
          footerSettings: null,
          testimonials: [],
          seoMeta: null,
          isLoading: optimizedContext.isLoading,
          error: null,
          refreshData: optimizedContext.refreshData,
        } as SharedStoreDataContextType;
      } else {
        // إذا لم تكن البيانات جاهزة بعد، استخدم البيانات من window
        let data = win.__EARLY_STORE_DATA__?.data ||
                   win.__CURRENT_STORE_DATA__ ||
                   win.__PREFETCHED_STORE_DATA__ || null;

        if (data) {
          result = {
            organization: data.organization_details || data.organization || null,
            organizationSettings: data.organization_settings || data.organizationSettings || null,
            products: data.featured_products || [],
            categories: data.categories || [],
            featuredProducts: data.featured_products || [],
            components: data.store_layout_components || data.components || [],
            footerSettings: data.footer_settings || null,
            testimonials: data.testimonials || [],
            seoMeta: data.seo_meta || null,
            isLoading: false,
            error: null,
            refreshData: () => {},
          } as SharedStoreDataContextType;
        } else {
          // Safe default placeholder with better fallback components to avoid loading screen
          result = {
            organization: null,
            organizationSettings: null,
            products: [],
            categories: [],
            featuredProducts: [],
            components: [
              {
                id: 'fallback-hero',
                type: 'hero',
                content: {
                  title: 'متجرنا',
                  subtitle: 'جار تحميل المتجر...',
                  background_image: null
                },
                position: 0
              },
              {
                id: 'fallback-products',
                type: 'featured_products',
                content: {
                  title: 'منتجاتنا'
                },
                position: 1
              }
            ],
            footerSettings: null,
            testimonials: [],
            seoMeta: null,
            isLoading: false,
            error: null,
            refreshData: () => {}
          } as SharedStoreDataContextType;
        }
      }
    }
    // 3) Final fallback to window-injected early data
    else {
      const data = win.__EARLY_STORE_DATA__?.data || win.__CURRENT_STORE_DATA__ || win.__PREFETCHED_STORE_DATA__ || null;

      if (data) {
        result = {
          organization: data.organization_details || data.organization || null,
          organizationSettings: data.organization_settings || data.organizationSettings || null,
          products: data.featured_products || [],
          categories: data.categories || [],
          featuredProducts: data.featured_products || [],
          components: data.store_layout_components || data.components || [],
          footerSettings: data.footer_settings || null,
          testimonials: data.testimonials || [],
          seoMeta: data.seo_meta || null,
          isLoading: false,
          error: null,
          refreshData: () => {},
        } as SharedStoreDataContextType;
      } else {
        // Safe default placeholder with fallback components to avoid loading screen
        result = {
          organization: null,
          organizationSettings: null,
          products: [],
          categories: [],
          featuredProducts: [],
          components: [
            {
              id: 'fallback-hero-final',
              type: 'hero',
              content: {
                title: 'متجرنا',
                subtitle: 'جار تحميل المتجر...',
                background_image: null
              },
              position: 0
            },
            {
              id: 'fallback-products-final',
              type: 'featured_products',
              content: {
                title: 'منتجاتنا'
              },
              position: 1
            }
          ],
          footerSettings: null,
          testimonials: [],
          seoMeta: null,
          isLoading: false,
          error: null,
          refreshData: () => {}
        } as SharedStoreDataContextType;
      }
    }

    // تقليل console.log لتحسين الأداء
    if (shouldLogContext && process.env.NODE_ENV === 'development') {
      console.log('📤 [useSharedStoreDataContext] Returning result:', {
        hasOrganization: !!result.organization,
        hasOrganizationSettings: !!result.organizationSettings,
        componentsLength: result.components?.length || 0,
        categoriesLength: result.categories?.length || 0,
        isLoading: result.isLoading
      });
    }

    return result;
  }, [
    // 🔥 إصلاح: استخدام dependencies مستقرة بدلاً من الكائنات الكاملة
    sharedContext?.organization?.id ?? null,
    sharedContext?.organizationSettings?.id ?? null,
    sharedContext?.isLoading,
    sharedContext?.error,
    sharedContext?.components?.length ?? 0,
    sharedContext?.categories?.length ?? 0,
    sharedContext?.featuredProducts?.length ?? 0,
    optimizedContext?.organization?.id ?? null,
    optimizedContext?.organizationSettings?.id ?? null,
    optimizedContext?.isLoading,
    optimizedContext?.components?.length ?? 0,
    optimizedContext?.categories?.length ?? 0,
    optimizedContext?.featuredProducts?.length ?? 0,
    // 🔥 إضافة: تحقق من البيانات المتكررة في window object بطريقة مستقرة
    typeof window !== 'undefined' ? (window as any).__EARLY_STORE_DATA__?.data?.organization_details?.id : null,
    typeof window !== 'undefined' ? (window as any).__EARLY_STORE_DATA__?.data?.featured_products?.length ?? 0 : null,
    typeof window !== 'undefined' ? (window as any).__PREFETCHED_STORE_DATA__?.organization_details?.id : null,
    typeof window !== 'undefined' ? (window as any).__PREFETCHED_STORE_DATA__?.featured_products?.length ?? 0 : null,
  ]);
};

// مزود بديل للصفحات التي لا تحتاج TenantProvider
export const MinimalSharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  // بيانات افتراضية للصفحات البسيطة
  const defaultData = {
    organization: null,
    organizationSettings: null,
    products: [],
    categories: [],
    featuredProducts: [],
    components: [],
    footerSettings: null,
    testimonials: [],
    seoMeta: null,
    isLoading: false,
    error: null,
    refreshData: () => {}
  };

  return (
    <SharedStoreDataContext.Provider value={defaultData}>
      {children}
    </SharedStoreDataContext.Provider>
  );
});

// Provider مخصص لصفحات المنتجات - فقط إعدادات المؤسسة
export const ProductPageSharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  // استدعاء useSharedStoreData مع تعطيل الفئات والمنتجات
  const sharedData = useSharedStoreData({
    includeCategories: false,
    includeProducts: false,
    includeFeaturedProducts: false
  });
  
  // 🔥 تحسين: استخدام useMemo مع dependencies محسنة
  const contextValue = useMemo(() => sharedData, [
    sharedData.isLoading,
    sharedData.error,
    sharedData.organization?.id ?? null,
    sharedData.organizationSettings?.id ?? null
    // 🔥 إصلاح: إزالة refreshData من dependencies
  ]);

  return (
    <SharedStoreDataContext.Provider value={contextValue}>
      {children}
    </SharedStoreDataContext.Provider>
  );
});

// Hook مخصص لصفحات المنتجات - فقط إعدادات المؤسسة بدون الفئات والمنتجات
export const useSharedOrgSettingsOnly = () => {
  // ✅ إبقاء ترتيب الـ hooks ثابت دائماً
  // - استخدم السياق الموحد الآمن الذي يتعامل مع جميع الحالات داخلياً
  // - لا تستدعِ أي hook شرطياً
  const base = useSharedStoreDataContext();

  // 🔎 قراءة مبكرة من window لتحسين زمن الإتاحة بدون كسر ترتيب الـ hooks
  const earlyWindowData = (() => {
    try {
      const win: any = typeof window !== 'undefined' ? window : {};
      return win.__EARLY_STORE_DATA__?.data || win.__CURRENT_STORE_DATA__ || win.__PREFETCHED_STORE_DATA__ || null;
    } catch {
      return null;
    }
  })();

  // 🎯 أولوية البيانات: السياق ثم بيانات window
  const organization = base.organization || earlyWindowData?.organization_details || earlyWindowData?.organization || null;
  const organizationSettings = base.organizationSettings || earlyWindowData?.organization_settings || base.organizationSettings || null;

  // ⚖️ حافظ على نفس شكل الكائن المرجع لتوافق بقية الشيفرة
  return {
    organization,
    organizationSettings,
    products: [],
    categories: [],
    featuredProducts: [],
    isLoading: base.isLoading,
    error: base.error,
    refreshData: base.refreshData
  };
};
