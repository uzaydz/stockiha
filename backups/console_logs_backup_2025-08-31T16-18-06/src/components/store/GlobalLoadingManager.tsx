import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
// Lazy-load اللودر الثقيل لتجنب دخوله في الحزمة الأساسية
const LazyUnifiedLoader = React.lazy(() => import('./UnifiedLoader'));

interface LoadingManagerState {
  isVisible: boolean;
  progress: number;
  message: string;
  storeName: string;
  logoUrl?: string;
  primaryColor: string;
  phase: 'system' | 'store' | 'content' | 'complete';
}

interface LoadingManagerContextType {
  showLoader: (config: Partial<LoadingManagerState>) => void;
  hideLoader: () => void;
  updateProgress: (progress: number, message?: string) => void;
  setPhase: (phase: LoadingManagerState['phase']) => void;
  isLoaderVisible: boolean;
}

const LoadingManagerContext = createContext<LoadingManagerContextType | null>(null);

export const useGlobalLoading = () => {
  const context = useContext(LoadingManagerContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within GlobalLoadingProvider');
  }
  return context;
};

interface GlobalLoadingProviderProps {
  children: React.ReactNode;
}

// دالة للحصول على بيانات المتجر من مصادر متعددة
const getStoreDataFromSources = () => {
  try {
    // 1. محاولة الحصول على البيانات من current_organization (المصدر الأساسي)
    const currentOrg = localStorage.getItem('current_organization');
    if (currentOrg) {
      const orgData = JSON.parse(currentOrg);
      if (orgData.name || orgData.settings?.site_name || orgData.logo_url) {
        return {
          storeName: orgData.settings?.site_name || orgData.name,
          logoUrl: orgData.logo_url || orgData.settings?.logo_url
        };
      }
    }

    // 2. محاولة الحصول على البيانات من bazaar_app_init_data
    const appInitData = localStorage.getItem('bazaar_app_init_data');
    if (appInitData) {
      const initData = JSON.parse(appInitData);
      if (initData.organization?.name || initData.organization?.settings?.site_name) {
        return {
          storeName: initData.organization.settings?.site_name || initData.organization.name,
          logoUrl: initData.organization.logo_url || initData.organization.settings?.logo_url
        };
      }
    }

    // 3. محاولة الحصول على البيانات من localStorage (مفاتيح أخرى)
    const storedOrgData = localStorage.getItem('bazaar_organization_data');
    if (storedOrgData) {
      const orgData = JSON.parse(storedOrgData);
      if (orgData.name || orgData.logo_url) {
        return {
          storeName: orgData.name || orgData.site_name,
          logoUrl: orgData.logo_url || orgData.logoUrl
        };
      }
    }

    // 4. محاولة الحصول على البيانات من إعدادات المؤسسة المحفوظة
    const storedSettings = localStorage.getItem('bazaar_organization_settings');
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      if (settings.site_name || settings.logo_url) {
        return {
          storeName: settings.site_name,
          logoUrl: settings.logo_url
        };
      }
    }

    // 5. محاولة الحصول على البيانات من window object
    if (typeof window !== 'undefined') {
      const windowOrgData = (window as any).__BAZAAR_ORG_DATA__;
      if (windowOrgData?.name || windowOrgData?.logo_url) {
        return {
          storeName: windowOrgData.name,
          logoUrl: windowOrgData.logo_url
        };
      }
    }

    // 6. محاولة الحصول على البيانات من عنوان الصفحة
    const pageTitle = document.title;
    if (pageTitle && !pageTitle.includes('React App') && !pageTitle.includes('Vite')) {
      const storeName = pageTitle.split('|')[0]?.trim();
      if (storeName && storeName !== 'سطوكيها' && storeName !== 'سطوكيها - منصة إدارة المتاجر الذكية') {
        return { storeName };
      }
    }

    // 7. محاولة الحصول على البيانات من subdomain
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
      return {
        storeName: subdomain.charAt(0).toUpperCase() + subdomain.slice(1)
      };
    }

  } catch (error) {
  }

  return null;
};

export const GlobalLoadingProvider: React.FC<GlobalLoadingProviderProps> = ({ children }) => {
  const [state, setState] = useState<LoadingManagerState>({
    isVisible: false,
    progress: 0,
    message: 'جاري التحميل...',
    storeName: 'المتجر',
    primaryColor: '#fc5a3e',
    phase: 'system'
  });

  // مراجع لتتبع الحالة
  const hideTimerRef = useRef<number | null>(null);
  const lastShowTimeRef = useRef<number>(0);
  const forceHideRef = useRef<boolean>(false);
  const storeDataFetched = useRef<boolean>(false);
  // تحكم في تحميل اللودر الثقيل فقط عند الحاجة
  const heavyLoaderTimerRef = useRef<number | null>(null);
  const [shouldLoadHeavyLoader, setShouldLoadHeavyLoader] = useState<boolean>(false);
  // تفضيل تقليل الحركة
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  // تهدئة تحديثات التخزين
  const storageUpdateTimeoutRef = useRef<number | null>(null);

  // مكون بسيط كـ fallback وخفيف جداً
  const MinimalLoader: React.FC<{ primaryColor: string }> = ({ primaryColor }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div
        className="w-10 h-10 rounded-full border-4 animate-spin"
        style={{ borderColor: `${primaryColor}33`, borderTopColor: primaryColor }}
      />
    </div>
  );

  // تحديث بيانات المتجر عند التحميل
  useEffect(() => {
    if (!storeDataFetched.current) {
      const storeData = getStoreDataFromSources();
      if (storeData) {
        setState(prev => ({
          ...prev,
          storeName: storeData.storeName || prev.storeName,
          logoUrl: storeData.logoUrl || prev.logoUrl
        }));
        // console.log('📊 تم تحديث بيانات المتجر:', storeData);
      }
      storeDataFetched.current = true;
    }
  }, []);

  // تتبع تفضيل تقليل الحركة من النظام
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => setIsReducedMotion(mediaQuery.matches);
    updateReducedMotion();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateReducedMotion);
      return () => mediaQuery.removeEventListener('change', updateReducedMotion);
    } else {
      // @ts-ignore - Safari أقدم
      mediaQuery.addListener(updateReducedMotion);
      return () => {
        // @ts-ignore - Safari أقدم
        mediaQuery.removeListener(updateReducedMotion);
      };
    }
  }, []);

  // مراقبة تغييرات localStorage للحصول على البيانات الجديدة (مع تهدئة)
  useEffect(() => {
    const handleStorageChange = () => {
      if (storageUpdateTimeoutRef.current) {
        window.clearTimeout(storageUpdateTimeoutRef.current);
      }
      storageUpdateTimeoutRef.current = window.setTimeout(() => {
        const storeData = getStoreDataFromSources();
        if (storeData) {
          setState(prev => {
            const shouldUpdate =
              (storeData.storeName && storeData.storeName !== prev.storeName) ||
              (storeData.logoUrl && storeData.logoUrl !== prev.logoUrl);
            if (shouldUpdate) {
              return {
                ...prev,
                storeName: storeData.storeName || prev.storeName,
                logoUrl: storeData.logoUrl || prev.logoUrl
              };
            }
            return prev;
          });
        }
      }, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
    };

    window.addEventListener('storage', handleStorageChange);

    // مراقبة الأحداث المخصصة لتحديث بيانات المؤسسة
    const handleOrgDataUpdate = (event: CustomEvent) => {
      const orgData = event.detail;
      if (orgData) {
        setState(prev => ({
          ...prev,
          storeName: orgData.settings?.site_name || orgData.name || prev.storeName,
          logoUrl: orgData.logo_url || orgData.settings?.logo_url || prev.logoUrl
        }));
        // console.log('🔄 تم تحديث بيانات المتجر من الحدث:', orgData);
      }
    };

    window.addEventListener('organizationDataUpdated', handleOrgDataUpdate);
    window.addEventListener('appInitDataReady', handleOrgDataUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('organizationDataUpdated', handleOrgDataUpdate);
      window.removeEventListener('appInitDataReady', handleOrgDataUpdate);
      if (storageUpdateTimeoutRef.current) {
        window.clearTimeout(storageUpdateTimeoutRef.current);
        storageUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  // إخفاء فوري عند وصول التقدم إلى 60% أو أكثر (تحميل أول مكون)
  useEffect(() => {
    if (state.progress >= 60 && state.isVisible && !forceHideRef.current) {
      forceHideRef.current = true;
      
      // إخفاء فوري
      setState(prev => ({ ...prev, isVisible: false }));
      
      // تنظيف أي timers
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      // تنظيف مؤقت تحميل اللودر الثقيل وإعادة الحالة
      if (heavyLoaderTimerRef.current) {
        window.clearTimeout(heavyLoaderTimerRef.current);
        heavyLoaderTimerRef.current = null;
      }
      setShouldLoadHeavyLoader(false);
    }
  }, [state.progress, state.isVisible]);

  // timeout أمان مُحسن - وقت قصير جداً
  useEffect(() => {
    if (state.isVisible) {
      const safetyTimer = window.setTimeout(() => {
        forceHideRef.current = true;
        setState(prev => ({ ...prev, isVisible: false }));
      }, 4000); // 4 ثواني فقط

      return () => window.clearTimeout(safetyTimer);
    }
  }, [state.isVisible, isReducedMotion]);

  // إخفاء تلقائي إذا لم يتم تحديث التقدم لفترة
  useEffect(() => {
    if (state.isVisible && state.progress > 0) {
      const progressTimer = window.setTimeout(() => {
        if (state.isVisible && !forceHideRef.current) {
          forceHideRef.current = true;
          setState(prev => ({ ...prev, isVisible: false }));
        }
      }, 2000); // إخفاء بعد ثانيتين من عدم التحديث

      return () => window.clearTimeout(progressTimer);
    }
  }, [state.progress, state.isVisible]);

  // بدء تحميل اللودر الثقيل فقط إذا استمر المؤشر مرئياً لأكثر من 250ms
  useEffect(() => {
    if (state.isVisible && !forceHideRef.current) {
      // ابدأ عدّاد التأخير إذا لم يكن قيد التشغيل
      if (heavyLoaderTimerRef.current == null && !shouldLoadHeavyLoader) {
        heavyLoaderTimerRef.current = window.setTimeout(() => {
          // لا تحمّل اللودر الثقيل إذا تم الإخفاء خلال المهلة
          if (state.isVisible && !forceHideRef.current) {
            setShouldLoadHeavyLoader(true);
          }
          if (heavyLoaderTimerRef.current) {
            window.clearTimeout(heavyLoaderTimerRef.current);
            heavyLoaderTimerRef.current = null;
          }
        }, 250);
      }
    } else {
      // إذا لم يعد مرئياً قم بإلغاء المؤقت وإعادة الحالة
      if (heavyLoaderTimerRef.current) {
        window.clearTimeout(heavyLoaderTimerRef.current);
        heavyLoaderTimerRef.current = null;
      }
      if (shouldLoadHeavyLoader) setShouldLoadHeavyLoader(false);
    }
    return () => {
      if (heavyLoaderTimerRef.current) {
        window.clearTimeout(heavyLoaderTimerRef.current);
        heavyLoaderTimerRef.current = null;
      }
    };
  }, [state.isVisible]);

  const showLoader = useCallback((config: Partial<LoadingManagerState>) => {
    // تجنب عرض المؤشر إذا تم إخفاؤه بالقوة مؤخراً
    const now = Date.now();
    if (forceHideRef.current && (now - lastShowTimeRef.current) < 3000) {
              // console.log('🚫 تجاهل عرض مؤشر التحميل - تم إخفاؤه مؤخراً');
      return;
    }

    // إعادة تعيين العلامات
    forceHideRef.current = false;
    lastShowTimeRef.current = now;

    setState(prev => {
      // الحصول على أحدث بيانات المتجر
      const latestStoreData = getStoreDataFromSources();
      
      const newState = {
        ...prev,
        ...config,
        isVisible: true,
        // استخدام البيانات المحدثة أو القيم الممررة أو القيم الافتراضية
        storeName: config.storeName || 
                  latestStoreData?.storeName || 
                  prev.storeName || 
                  'المتجر الإلكتروني',
        logoUrl: config.logoUrl || 
                latestStoreData?.logoUrl || 
                prev.logoUrl,
        primaryColor: config.primaryColor || prev.primaryColor || '#fc5a3e'
      };
      
      // console.log('🔄 عرض مؤشر التحميل:', {
      //   storeName: newState.storeName,
      //   logoUrl: newState.logoUrl,
      //   progress: newState.progress
      // });
      
      return newState;
    });
  }, []);

  const hideLoader = useCallback(() => {
    // console.log('🔄 إخفاء مؤشر التحميل يدوياً');
    forceHideRef.current = true;
    
    // تنظيف أي timers
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (heavyLoaderTimerRef.current) {
      window.clearTimeout(heavyLoaderTimerRef.current);
      heavyLoaderTimerRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isVisible: false
    }));
    setShouldLoadHeavyLoader(false);
  }, []);

  const updateProgress = useCallback((progress: number, message?: string) => {
    // تجاهل التحديثات إذا تم إخفاء المؤشر بالقوة
    if (forceHideRef.current) {
      return;
    }

    const clampedProgress = Math.min(Math.max(progress, 0), 100);
    
    setState(prev => ({
      ...prev,
      progress: clampedProgress,
      ...(message && { message })
    }));

  }, []);

  const setPhase = useCallback((phase: LoadingManagerState['phase']) => {
    // تجاهل التحديثات إذا تم إخفاء المؤشر بالقوة
    if (forceHideRef.current) {
      return;
    }

    setState(prev => {
      let progress = prev.progress;
      let message = prev.message;

      switch (phase) {
        case 'system':
          progress = Math.max(progress, 20);
          message = 'جاري تحضير النظام...';
          break;
        case 'store':
          progress = Math.max(progress, 60); // وصول إلى 60% = إخفاء فوري
          message = `جاري تحميل ${prev.storeName}...`;
          break;
        case 'content':
          progress = Math.max(progress, 90);
          message = 'جاري تحضير المحتوى...';
          break;
        case 'complete':
          progress = 100;
          message = 'تم التحميل بنجاح!';
          break;
      }

      return {
        ...prev,
        phase,
        progress,
        message
      };
    });
  }, []);

  const contextValue: LoadingManagerContextType = {
    showLoader,
    hideLoader,
    updateProgress,
    setPhase,
    isLoaderVisible: state.isVisible && !forceHideRef.current
  };

  return (
    <LoadingManagerContext.Provider value={contextValue}>
      {children}
      {state.isVisible && !forceHideRef.current && (
        shouldLoadHeavyLoader && !isReducedMotion ? (
          <React.Suspense fallback={<MinimalLoader primaryColor={state.primaryColor} />}>
            <LazyUnifiedLoader
              isVisible={true}
              progress={state.progress}
              message={state.message}
              type="full"
              storeName={state.storeName}
              logoUrl={state.logoUrl}
              primaryColor={state.primaryColor}
            />
          </React.Suspense>
        ) : (
          <MinimalLoader primaryColor={state.primaryColor} />
        )
      )}
    </LoadingManagerContext.Provider>
  );
};
