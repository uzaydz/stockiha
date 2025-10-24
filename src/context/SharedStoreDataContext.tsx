import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';
import {
  OptimizedSharedStoreDataContext,
  type OptimizedSharedStoreDataContextType,
} from '@/context/OptimizedSharedStoreDataContext';
import { addAppEventListener, dispatchAppEvent } from '@/lib/events/eventManager';

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

type WindowStorePayload = Partial<Omit<SharedStoreDataContextType, 'refreshData'>>;

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

const EMPTY_CONTEXT: SharedStoreDataContextType = {
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
  refreshData: () => undefined,
};

const readWindowStorePayload = (): WindowStorePayload | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const win: any = window;
  const candidates = [
    win.__EARLY_STORE_DATA__?.data,
    win.__CURRENT_STORE_DATA__,
    win.__PREFETCHED_STORE_DATA__?.data ?? win.__PREFETCHED_STORE_DATA__,
    win.__STORE_DATA__,
    {
      organization: win.__STORE_ORGANIZATION__,
      organization_settings: win.__STORE_SETTINGS__,
    },
  ];

  devLog('🧪 [SharedStoreDataContext] readWindowStorePayload invoked', {
    hasEarly: !!candidates[0],
    hasCurrent: !!candidates[1],
    hasPrefetched: !!candidates[2],
    hasStoreData: !!candidates[3],
    hasDirect: !!(win.__STORE_ORGANIZATION__ || win.__STORE_SETTINGS__)
  });

  for (const payload of candidates) {
    if (!payload) {
      continue;
    }

    const organization = payload.organization_details || payload.organization || null;
    const organizationSettings =
      payload.organization_settings || payload.organizationSettings || null;

    if (organization || organizationSettings) {
      const result = {
        organization,
        organizationSettings,
        products: payload.products || [],
        categories: payload.categories || [],
        featuredProducts: payload.featured_products || payload.featuredProducts || [],
        components: payload.store_layout_components || payload.components || [],
        footerSettings: payload.footer_settings || payload.footerSettings || null,
        testimonials: payload.testimonials || [],
        seoMeta: payload.seo_meta || payload.seoMeta || null,
        isLoading: false,
        error: null,
      };

      devLog('🧪 [SharedStoreDataContext] readWindowStorePayload match found', {
        hasOrganization: !!result.organization,
        hasSettings: !!result.organizationSettings,
        categoriesCount: result.categories?.length ?? 0,
        componentsCount: result.components?.length ?? 0,
      });
      return result;
    }
  }

  devLog('🧪 [SharedStoreDataContext] readWindowStorePayload no match');
  return null;
};

function useSharedStoreDataSafe(): SharedStoreDataContextType {
  try {
    const result = useSharedStoreData({
      includeCategories: true,
      includeProducts: false,
      includeFeaturedProducts: true,
      includeComponents: true,
      enabled: true,
    });

    useEffect(() => {
      if (!result.refreshData) {
        return;
      }

      const handleStoreDataReady = () => {
        if (!result.organization && !result.organizationSettings && !result.isLoading) {
          result.refreshData();
        }
      };

      const unsubscribeDataReady = addAppEventListener(
        'storeDataReady',
        handleStoreDataReady as any
      );
      const unsubscribeInitReady = addAppEventListener(
        'storeInitDataReady',
        handleStoreDataReady as any
      );

      return () => {
        unsubscribeDataReady();
        unsubscribeInitReady();
      };
    }, [result.organization, result.organizationSettings, result.isLoading, result.refreshData]);

    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes('useTenant')) {
      return EMPTY_CONTEXT;
    }
    throw error;
  }
}

export const SharedStoreDataContext = createContext<SharedStoreDataContextType | null>(null);

export const SharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  const sharedData = useSharedStoreDataSafe();
  const [windowPayload, setWindowPayload] = useState<WindowStorePayload | null>(() => readWindowStorePayload());
  const hasBroadcastedRef = useRef(false);

  useEffect(() => {
    const handleUpdate = () => {
      const payload = readWindowStorePayload();
      if (payload) {
        devLog('🧪 [SharedStoreDataContext] handleUpdate applied payload', {
          hasOrganization: !!payload.organization,
          hasSettings: !!payload.organizationSettings,
          categoriesCount: payload.categories?.length ?? 0,
          componentsCount: payload.components?.length ?? 0,
        });
        setWindowPayload(payload);
      }
    };

    const unsubscribeDataReady = addAppEventListener(
      'storeDataReady',
      handleUpdate as any
    );
    const unsubscribeInitReady = addAppEventListener(
      'storeInitDataReady',
      handleUpdate as any
    );

    return () => {
      unsubscribeDataReady();
      unsubscribeInitReady();
    };
  }, []);

  useEffect(() => {
    if (!windowPayload || typeof window === 'undefined') {
      return;
    }

    const payloadWithRefresh: SharedStoreDataContextType = {
      ...EMPTY_CONTEXT,
      ...windowPayload,
      refreshData: sharedData.refreshData,
    };

    (window as any).__BAZAAR_STORE_CONTEXT__ = payloadWithRefresh;

    if (!hasBroadcastedRef.current) {
      hasBroadcastedRef.current = true;
      dispatchAppEvent('bazaarStoreContextReady', payloadWithRefresh, {
        dedupeKey: 'bazaarStoreContextReady'
      });
      dispatchAppEvent('injectedDataReady', payloadWithRefresh, {
        dedupeKey: 'injectedDataReady'
      });
    }

    import('../managers/FaviconManager')
      .then(({ faviconManager }) => {
        faviconManager.initialize();
      })
      .catch(() => undefined);
  }, [windowPayload, sharedData.refreshData]);

  const contextValue = useMemo<SharedStoreDataContextType>(() => {
    if (sharedData.organization || sharedData.organizationSettings) {
      devLog('🧪 [SharedStoreDataContext] using sharedData hook', {
        hasOrganization: !!sharedData.organization,
        hasSettings: !!sharedData.organizationSettings,
        categories: sharedData.categories?.length ?? 0,
        components: sharedData.components?.length ?? 0,
        isLoading: sharedData.isLoading,
      });
      return sharedData;
    }

    if (windowPayload) {
      devLog('🧪 [SharedStoreDataContext] using windowPayload fallback', {
        hasOrganization: !!windowPayload.organization,
        hasSettings: !!windowPayload.organizationSettings,
        categories: windowPayload.categories?.length ?? 0,
        components: windowPayload.components?.length ?? 0,
        sharedDataLoading: sharedData.isLoading,
      });
      return {
        ...EMPTY_CONTEXT,
        ...windowPayload,
        isLoading: false,
        error: sharedData.error,
        refreshData: sharedData.refreshData,
      };
    }

    devLog('🧪 [SharedStoreDataContext] falling back to sharedData (no payload)', {
      isLoading: sharedData.isLoading,
      hasError: !!sharedData.error,
    });
    return sharedData;
  }, [sharedData, windowPayload]);

  return <SharedStoreDataContext.Provider value={contextValue}>{children}</SharedStoreDataContext.Provider>;
});

export const MinimalSharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  return <SharedStoreDataContext.Provider value={EMPTY_CONTEXT}>{children}</SharedStoreDataContext.Provider>;
});

const useProductPageStoreData = () => {
  try {
    return useSharedStoreData({
      includeCategories: false,
      includeProducts: false,
      includeFeaturedProducts: false,
      includeComponents: false,
      enabled: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('useTenant')) {
      return EMPTY_CONTEXT;
    }
    throw error;
  }
};

export const ProductPageSharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  const sharedData = useProductPageStoreData();
  const isDefault = sharedData === EMPTY_CONTEXT;

  const contextValue = useMemo(() => {
    if (isDefault) {
      return EMPTY_CONTEXT;
    }

    return {
      ...EMPTY_CONTEXT,
      ...sharedData,
    };
  }, [
    isDefault,
    sharedData.organization?.id ?? null,
    sharedData.organizationSettings?.id ?? null,
    sharedData.isLoading,
    sharedData.error,
  ]);

  return <SharedStoreDataContext.Provider value={contextValue}>{children}</SharedStoreDataContext.Provider>;
});

export const useSharedOrgSettingsOnly = () => useProductPageStoreData();

export const useSharedStoreDataContext = (): SharedStoreDataContextType => {
  const sharedContext = useContext(SharedStoreDataContext);
  const optimizedContext = useContext(
    OptimizedSharedStoreDataContext as React.Context<OptimizedSharedStoreDataContextType | null>,
  );

  // 🔥 تحسين: تقليل logs في development mode مع useCallback
  const logContextCall = useCallback(() => {
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      devLog('🧪 [useSharedStoreDataContext] تم استدعاء useSharedStoreDataContext');
    }
  }, []);

  // استدعاء الدالة مرة واحدة فقط
  useEffect(() => {
    logContextCall();
  }, [logContextCall]);

  // 🔥 تحسين: استخدام useMemo لتحسين الأداء
  const optimizedResult = useMemo(() => {
    if (optimizedContext && (optimizedContext.organization || optimizedContext.organizationSettings)) {
      // تقليل logs في development mode
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        devLog('🧪 [useSharedStoreDataContext] استخدام OptimizedSharedStoreDataContext');
      }

      return {
        organization: optimizedContext.organization,
        organizationSettings: optimizedContext.organizationSettings,
        products: optimizedContext.products,
        categories: optimizedContext.categories,
        featuredProducts: optimizedContext.featuredProducts,
        components: optimizedContext.components,
        footerSettings: null,
        testimonials: [],
        seoMeta: null,
        isLoading: optimizedContext.isLoading,
        error: optimizedContext.error,
        refreshData: optimizedContext.refreshData,
      };
    }
    return null;
  }, [
    optimizedContext?.organization?.id,
    optimizedContext?.organizationSettings?.id,
    optimizedContext?.isLoading,
    optimizedContext?.error,
    optimizedContext?.products?.length,
    optimizedContext?.categories?.length,
    optimizedContext?.featuredProducts?.length,
    optimizedContext?.components?.length
  ]);

  if (optimizedResult) {
    return optimizedResult;
  }

  // fallback لـ SharedStoreDataContext مع تقليل logs
  if (sharedContext) {
    // تقليل logs في development mode
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) { // 5% فقط من الاستدعاءات
      devLog('🧪 [useSharedStoreDataContext] استخدام SharedStoreDataContext fallback');
    }
    return sharedContext;
  }

  // تقليل logs في development mode
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.02) { // 2% فقط من الاستدعاءات
    devLog('🧪 [useSharedStoreDataContext] إرجاع EMPTY_CONTEXT - لا توجد بيانات');
  }

  return EMPTY_CONTEXT;
};
