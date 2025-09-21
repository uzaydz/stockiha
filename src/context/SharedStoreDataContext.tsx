import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';
import {
  OptimizedSharedStoreDataContext,
  type OptimizedSharedStoreDataContextType,
} from '@/context/OptimizedSharedStoreDataContext';

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

  console.log('🧪 [SharedStoreDataContext] readWindowStorePayload invoked', {
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

      console.log('🧪 [SharedStoreDataContext] readWindowStorePayload match found', {
        hasOrganization: !!result.organization,
        hasSettings: !!result.organizationSettings,
        categoriesCount: result.categories?.length ?? 0,
        componentsCount: result.components?.length ?? 0,
      });
      return result;
    }
  }

  console.log('🧪 [SharedStoreDataContext] readWindowStorePayload no match');
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

      window.addEventListener('storeDataReady', handleStoreDataReady);
      window.addEventListener('storeInitDataReady', handleStoreDataReady);

      return () => {
        window.removeEventListener('storeDataReady', handleStoreDataReady);
        window.removeEventListener('storeInitDataReady', handleStoreDataReady);
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
        console.log('🧪 [SharedStoreDataContext] handleUpdate applied payload', {
          hasOrganization: !!payload.organization,
          hasSettings: !!payload.organizationSettings,
          categoriesCount: payload.categories?.length ?? 0,
          componentsCount: payload.components?.length ?? 0,
        });
        setWindowPayload(payload);
      }
    };

    window.addEventListener('storeDataReady', handleUpdate);
    window.addEventListener('storeInitDataReady', handleUpdate);

    return () => {
      window.removeEventListener('storeDataReady', handleUpdate);
      window.removeEventListener('storeInitDataReady', handleUpdate);
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
      window.dispatchEvent(
        new CustomEvent('bazaarStoreContextReady', {
          detail: payloadWithRefresh,
        }),
      );
      window.dispatchEvent(
        new CustomEvent('injectedDataReady', {
          detail: payloadWithRefresh,
        }),
      );
    }

    import('../managers/FaviconManager')
      .then(({ faviconManager }) => {
        faviconManager.initialize();
      })
      .catch(() => undefined);
  }, [windowPayload, sharedData.refreshData]);

  const contextValue = useMemo<SharedStoreDataContextType>(() => {
    if (sharedData.organization || sharedData.organizationSettings) {
      console.log('🧪 [SharedStoreDataContext] using sharedData hook', {
        hasOrganization: !!sharedData.organization,
        hasSettings: !!sharedData.organizationSettings,
        categories: sharedData.categories?.length ?? 0,
        components: sharedData.components?.length ?? 0,
        isLoading: sharedData.isLoading,
      });
      return sharedData;
    }

    if (windowPayload) {
      console.log('🧪 [SharedStoreDataContext] using windowPayload fallback', {
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

    console.log('🧪 [SharedStoreDataContext] falling back to sharedData (no payload)', {
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

  console.log('🧪 [useSharedStoreDataContext] contexts snapshot', {
    hasShared: !!sharedContext,
    sharedHasOrg: sharedContext?.organization?.id ?? null,
    sharedIsLoading: sharedContext?.isLoading,
    hasOptimized: !!optimizedContext,
    optimizedHasOrg: optimizedContext?.organization?.id ?? null,
    optimizedIsLoading: optimizedContext?.isLoading,
  });

  if (sharedContext) {
    return sharedContext;
  }

  if (optimizedContext) {
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

  return EMPTY_CONTEXT;
};
