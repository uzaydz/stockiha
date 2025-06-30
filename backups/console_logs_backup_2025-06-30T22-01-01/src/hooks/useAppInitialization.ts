import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';

export interface AppInitializationData {
  success: boolean;
  organization: {
    id: string;
    name: string;
    logo_url?: string;
    description?: string;
    domain?: string;
    subdomain?: string;
    created_at: string;
    settings: any;
    default_language: string;
    theme_settings: any;
    subscription?: {
      id: string;
      subscription_type: string;
      status: string;
      expires_at: string;
      features: any;
    };
  };
  global_data: {
    product_categories: Array<{
      id: string;
      name: string;
      slug: string;
      description?: string;
      products_count: number;
    }>;
    shipping_provinces: Array<{
      id: number;
      name: string;
      is_deliverable: boolean;
      home_delivery_fee: number;
      desk_delivery_fee: number;
    }>;
    shipping_providers: Array<{
      id: number;
      name: string;
      code: string;
      is_active: boolean;
      organization_settings?: any;
      is_enabled_for_org: boolean;
    }>;
  };
  organization_data: {
    services: any[];
    store_settings: Record<string, any>;
    products_summary: {
      total_count: number;
      active_count: number;
      categories_count: number;
      out_of_stock_count: number;
    };
    shipping_clones: any[];
  };
  metadata: {
    fetched_at: string;
    cache_ttl: number;
    version: string;
    organization_id: string;
  };
}

interface UseAppInitializationOptions {
  domain?: string;
  subdomain?: string;
  organizationId?: string;
  enabled?: boolean;
}

/**
 * Hook موحد لتهيئة التطبيق وجلب جميع البيانات الأساسية مرة واحدة
 * يقلل من عدد الاستدعاءات من 20+ إلى استدعاء واحد فقط
 */
export const useAppInitialization = (options: UseAppInitializationOptions = {}) => {
  const { domain, subdomain, organizationId, enabled = true } = options;
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  const {
    data: appData,
    isLoading,
    error,
    refetch,
    isStale,
    isFetching
  } = useQuery({
    queryKey: ['app-initialization', domain, subdomain, organizationId],
    queryFn: async (): Promise<AppInitializationData> => {
      const { data, error } = await supabase.rpc('initialize_app_data', {
        p_domain: domain || null,
        p_subdomain: subdomain || null,
        p_organization_id: organizationId || null
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'فشل في تهيئة التطبيق');
      }

      // حفظ البيانات الفرعية في cache منفصل للاستخدام السريع
      if (data.organization?.id) {
        // حفظ فئات المنتجات
        queryClient.setQueryData(
          ['product-categories', data.organization.id],
          data.global_data.product_categories
        );

        // حفظ الولايات
        queryClient.setQueryData(
          ['shipping-provinces'],
          data.global_data.shipping_provinces
        );

        // حفظ مزودي الشحن
        queryClient.setQueryData(
          ['shipping-providers', data.organization.id],
          data.global_data.shipping_providers
        );

        // حفظ إعدادات المتجر
        queryClient.setQueryData(
          ['store-settings', data.organization.id],
          data.organization_data.store_settings
        );

        // حفظ الخدمات
        queryClient.setQueryData(
          ['services', data.organization.id],
          data.organization_data.services
        );
      }

      return data;
    },
    enabled: enabled && (!!domain || !!subdomain || !!organizationId),
    staleTime: 10 * 60 * 1000, // 10 دقائق
    cacheTime: 30 * 60 * 1000, // 30 دقيقة
    retry: (failureCount, error) => {
      // إعادة المحاولة فقط للأخطاء المؤقتة
      if (failureCount >= 3) return false;
      if (error?.message?.includes('not found')) return false;
      return true;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });

  // دوال مساعدة للوصول السريع للبيانات
  const getOrganization = () => appData?.organization;

  const getProductCategories = () => appData?.global_data?.product_categories || [];

  const getShippingProvinces = () => appData?.global_data?.shipping_provinces || [];

  const getShippingProviders = () => appData?.global_data?.shipping_providers || [];

  const getServices = () => appData?.organization_data?.services || [];

  const getStoreSettings = (componentType?: string) => {
    const settings = appData?.organization_data?.store_settings;
    if (!settings) return null;
    
    if (componentType) {
      return settings[componentType] || null;
    }
    
    return settings;
  };

  const getProductsSummary = () => appData?.organization_data?.products_summary;

  const getShippingClones = () => appData?.organization_data?.shipping_clones || [];

  const getEnabledShippingProviders = () => {
    return getShippingProviders().filter(provider => provider.is_enabled_for_org);
  };

  const getActiveProductCategories = () => {
    return getProductCategories().filter(category => category.products_count > 0);
  };

  // دوال لإدارة الـ Cache
  const invalidateAppData = () => {
    queryClient.invalidateQueries({
      queryKey: ['app-initialization']
    });
  };

  const updateOrganizationData = (updatedData: Partial<AppInitializationData['organization']>) => {
    if (!appData) return;

    const newData = {
      ...appData,
      organization: {
        ...appData.organization,
        ...updatedData
      }
    };

    queryClient.setQueryData(['app-initialization', domain, subdomain, organizationId], newData);
  };

  // معلومات حالة الـ Cache
  const getCacheInfo = () => ({
    lastFetched: appData?.metadata?.fetched_at,
    version: appData?.metadata?.version,
    cacheAge: appData?.metadata?.fetched_at 
      ? Date.now() - new Date(appData.metadata.fetched_at).getTime()
      : null,
    isStale,
    isFetching
  });

  // فحص ما إذا كانت البيانات جاهزة
  const isReady = !isLoading && !error && !!appData?.organization;

  return {
    // البيانات الأساسية
    appData,
    isLoading,
    error,
    refetch,
    isReady,

    // المؤسسة
    organization: getOrganization(),

    // البيانات العامة
    productCategories: getProductCategories(),
    shippingProvinces: getShippingProvinces(),
    shippingProviders: getShippingProviders(),

    // بيانات المؤسسة
    services: getServices(),
    storeSettings: getStoreSettings(),
    productsSummary: getProductsSummary(),
    shippingClones: getShippingClones(),

    // دوال مساعدة
    getStoreSettings,
    getEnabledShippingProviders,
    getActiveProductCategories,

    // إدارة الـ Cache
    invalidateAppData,
    updateOrganizationData,
    cacheInfo: getCacheInfo(),

    // حالات إضافية
    isFetching,
    isStale
  };
};

/**
 * Hook مبسط للحصول على بيانات المؤسسة فقط
 */
export const useOrganizationData = (options: UseAppInitializationOptions = {}) => {
  const { organization, isLoading, error, isReady } = useAppInitialization(options);

  return {
    organization,
    isLoading,
    error,
    isReady
  };
};

/**
 * Hook للحصول على البيانات العامة (فئات المنتجات، الولايات، إلخ)
 */
export const useGlobalData = () => {
  const { 
    productCategories, 
    shippingProvinces, 
    shippingProviders,
    isLoading,
    error 
  } = useAppInitialization();

  return {
    productCategories,
    shippingProvinces,
    shippingProviders,
    isLoading,
    error
  };
};

export default useAppInitialization;
