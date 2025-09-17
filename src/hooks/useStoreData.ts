import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { getSupabaseClient } from '@/lib/supabase';
import {
  getStoreDataProgressive,
  forceReloadStoreData,
  StoreInitializationData
} from '@/api/optimizedStoreDataService';
import { StoreComponent, ComponentType } from '@/types/store-editor';

// Import our new modular hooks
import {
  useBasicStoreData,
  useAdditionalStoreData,
  useStoreTheme,
  useStoreDomainCheck,
  useStoreComputedValues
} from './store-data';

interface UseStoreDataOptions {
  initialStoreData?: Partial<StoreInitializationData>;
}

interface UseStoreDataReturn {
  // State
  storeSettings: any;
  dataLoading: boolean;
  storeData: Partial<StoreInitializationData> | null;
  dataError: string | null;
  footerSettings: any;
  additionalDataLoaded: boolean;
  categories: any[];
  featuredProducts: any[];
  customComponents: StoreComponent[];

  // Computed values
  storeName: string;
  extendedCategories: any[];
  defaultStoreComponents: StoreComponent[];
  componentsToRender: StoreComponent[];

  // Actions
  handleReload: () => Promise<void>;
  applyOrganizationTheme: (orgId: string, settings: {
    theme_primary_color?: string;
    theme_secondary_color?: string;
    theme_mode?: 'light' | 'dark' | 'auto';
    custom_css?: string;
  }) => void;
}

export const useStoreData = ({ initialStoreData = {} }: UseStoreDataOptions = {}): UseStoreDataReturn => {
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();

  // State Management
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [storeData, setStoreData] = useState<Partial<StoreInitializationData> | null>(
    useMemo(() =>
      initialStoreData && Object.keys(initialStoreData).length > 0 ? initialStoreData : null,
      [initialStoreData]
    )
  );
  const [dataError, setDataError] = useState<string | null>(null);
  const [footerSettings, setFooterSettings] = useState<any>(null);

  // Additional data loaded lazily
  const [additionalDataLoaded, setAdditionalDataLoaded] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [customComponents, setCustomComponents] = useState<StoreComponent[]>([]);

  const dataFetchAttempted = useRef(false);
  const forceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // =================================================================
  // Use our modular hooks
  // =================================================================

  const { loadBasicStoreData } = useBasicStoreData({
    onDataLoaded: (data) => {
      setStoreData(data);
      setStoreSettings(data.organization_settings);
      setDataLoading(false);

      // Load additional data after basic data is loaded
      if (data.organization_details?.id) {
        loadAdditionalData(data.organization_details.id);
      }
    },
    onError: (error) => {
      setDataError(error);
      setDataLoading(false);
    }
  });

  const { loadAdditionalData } = useAdditionalStoreData({
    onDataLoaded: (data) => {
      setCategories(data.categories);
      setFeaturedProducts(data.featuredProducts);
      setCustomComponents(data.customComponents);
      setAdditionalDataLoaded(true);

      // Update storeData with new data
      setStoreData(prev => prev ? {
        ...prev,
        categories: data.categories,
        featured_products: data.featuredProducts as any,
        store_layout_components: data.customComponents
      } : null);
    },
    onError: (error) => {
      console.warn('Additional data loading error:', error);
    }
  });

  const { applyOrganizationTheme } = useStoreTheme();

  const { checkCustomDomainAndLoadData } = useStoreDomainCheck();

  // =================================================================
  // Computed Values Hook
  // =================================================================

  const {
    storeName,
    extendedCategories,
    defaultStoreComponents,
    componentsToRender
  } = useStoreComputedValues({
    storeData,
    customComponents
  });

  // =================================================================
  // Main Data Loading Effect
  // =================================================================

  useEffect(() => {
    const loadStoreData = async () => {
      if (dataFetchAttempted.current) return;

      // Use existing data if available
      if (initialStoreData && Object.keys(initialStoreData).length > 0) {
        setStoreData(initialStoreData);
        setStoreSettings(initialStoreData.organization_settings || null);
        setDataLoading(false);
        dataFetchAttempted.current = true;

        if (initialStoreData.organization_settings && currentOrganization?.id) {
          applyOrganizationTheme(currentOrganization.id, {
            theme_primary_color: initialStoreData.organization_settings.theme_primary_color,
            theme_secondary_color: initialStoreData.organization_settings.theme_secondary_color,
            theme_mode: (initialStoreData.organization_settings as any).theme_mode,
            custom_css: initialStoreData.organization_settings.custom_css
          });
        }
        return;
      }

      dataFetchAttempted.current = true;
      setDataLoading(true);
      setDataError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        let subdomainToUse = currentSubdomain;

        const customDomainSubdomain = await checkCustomDomainAndLoadData(controller.signal);
        if (typeof customDomainSubdomain === 'string') {
          subdomainToUse = customDomainSubdomain;
        }

        if (!subdomainToUse || controller.signal.aborted) {
          if (!controller.signal.aborted) {
            setDataLoading(false);
            setDataError("لم يتم تحديد المتجر. يرجى التحقق من الرابط.");
          }
          return;
        }

        const result = await getStoreDataProgressive(subdomainToUse);

        if (controller.signal.aborted) return;

        if (result.data?.error) {
          setDataError(result.data.error);
          setStoreData(null);
          setStoreSettings(null);
        } else if (result.data) {
          setStoreData(result.data);
          setStoreSettings(result.data.organization_settings || null);

          if (result.data.organization_settings && currentOrganization?.id) {
            applyOrganizationTheme(currentOrganization.id, {
              theme_primary_color: result.data.organization_settings.theme_primary_color,
              theme_secondary_color: result.data.organization_settings.theme_secondary_color,
              theme_mode: (result.data.organization_settings as any).theme_mode,
              custom_css: result.data.organization_settings.custom_css
            });
          }
        } else {
          setDataError("لم يتم العثور على بيانات للمتجر.");
          setStoreData(null);
          setStoreSettings(null);
        }
      } catch (error: any) {
        if (!controller.signal.aborted) {
          setDataError(error.message || "خطأ أثناء تحميل البيانات.");
          setStoreData(null);
          setStoreSettings(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDataLoading(false);
        }
      }
    };

    loadStoreData();

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentSubdomain, initialStoreData, currentOrganization?.id, applyOrganizationTheme, checkCustomDomainAndLoadData]);

  // =================================================================
  // Footer Settings Effect
  // =================================================================

  useEffect(() => {
    const fetchFooterSettings = async () => {
      if (!storeData?.organization_details?.id) return;

      try {
        const supabase = getSupabaseClient();
        const { data: footerData, error } = await supabase
          .from('store_settings')
          .select('settings')
          .eq('organization_id', storeData.organization_details.id)
          .eq('component_type', 'footer')
          .eq('is_active', true)
          .maybeSingle();

        if (!error && footerData?.settings) {
          setFooterSettings(footerData.settings);
        }
      } catch (error) {
      }
    };

    fetchFooterSettings();
  }, [storeData?.organization_details?.id]);

  // =================================================================
  // Force Timeout Effect
  // =================================================================

  useEffect(() => {
    if (dataLoading) {
      forceTimerRef.current = setTimeout(() => {
        if (dataLoading) {
          setDataLoading(false);
          if (!storeData && !dataError) {
            setDataError("استغرق تحميل بيانات المتجر وقتًا طويلاً. يرجى المحاولة مرة أخرى.");
          }
        }
      }, 3000);
    } else if (forceTimerRef.current) {
      clearTimeout(forceTimerRef.current);
      forceTimerRef.current = null;
    }

    return () => {
      if (forceTimerRef.current) {
        clearTimeout(forceTimerRef.current);
      }
    };
  }, [dataLoading, storeData, dataError]);

  // =================================================================
  // Event Handlers
  // =================================================================

  const handleReload = useCallback(async () => {
    const subdomainToReload = localStorage.getItem('bazaar_current_subdomain') || currentSubdomain;
    if (!subdomainToReload) return;

    // Cancel any previous operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setDataLoading(true);
    setDataError(null);
    dataFetchAttempted.current = false;

    try {
      const result = await forceReloadStoreData(subdomainToReload);

      if (controller.signal.aborted) return;

      if (result.data?.error) {
        setDataError(result.data.error);
        setStoreData(null);
        setStoreSettings(null);
      } else if (result.data) {
        setStoreData(result.data);
        setStoreSettings(result.data.organization_settings || null);

        if (result.data.organization_settings && currentOrganization?.id) {
          applyOrganizationTheme(currentOrganization.id, {
            theme_primary_color: result.data.organization_settings.theme_primary_color,
            theme_secondary_color: result.data.organization_settings.theme_secondary_color,
            theme_mode: (result.data.organization_settings as any).theme_mode,
            custom_css: result.data.organization_settings.custom_css
          });
        }
      } else {
        setDataError("فشل إعادة تحميل البيانات.");
        setStoreData(null);
        setStoreSettings(null);
      }
    } catch (error: any) {
      if (!controller.signal.aborted) {
        setDataError(error.message || "خطأ أثناء إعادة التحميل.");
        setStoreData(null);
        setStoreSettings(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setDataLoading(false);
      }
    }
  }, [currentSubdomain, currentOrganization?.id, applyOrganizationTheme]);


  return {
    // State
    storeSettings,
    dataLoading,
    storeData,
    dataError,
    footerSettings,
    additionalDataLoaded,
    categories,
    featuredProducts,
    customComponents,

    // Computed values
    storeName,
    extendedCategories,
    defaultStoreComponents,
    componentsToRender,

    // Actions
    handleReload,
    applyOrganizationTheme,
  };
};
