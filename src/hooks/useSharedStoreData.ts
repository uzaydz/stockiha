import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase-client';
import { getOrganizationSettings } from '@/lib/api/settings';
import { useMemo, useCallback } from 'react';

// نوع البيانات المشتركة للمتجر
interface SharedStoreData {
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
}

// Cache عام لمنع الاستدعاءات المكررة
let globalStoreDataCache: { [key: string]: any } = {};
let globalCacheTimestamp: { [key: string]: number } = {};
const CACHE_DURATION = 2 * 60 * 1000; // دقيقتان
// منع نداءات RPC المكررة لنفس السابدومين
const pendingRequests: Record<string, Promise<any>> = {};

// تقليل الـ logging المفرط
let logCounter = 0;
const MAX_LOGS_PER_SESSION = 5;

// Preloader للصور
const preloadImages = (products: any[], categories: any[]) => {
  const imageUrls = new Set<string>();
  
  // جمع URLs الصور
  products.forEach(product => {
    if (product.thumbnail_image) imageUrls.add(product.thumbnail_image);
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img: string) => {
        if (img) imageUrls.add(img);
      });
    }
  });
  
  categories.forEach(category => {
    if (category.image_url) imageUrls.add(category.image_url);
  });
  
  // تحميل الصور في الخلفية
  const preloadPromises = Array.from(imageUrls).slice(0, 10).map(url => { // تحديد العدد لتجنب الحمل الزائد
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => resolve(url); // حتى لو فشلت، نكمل
      img.src = url;
    });
  });
  
  Promise.all(preloadPromises).then(() => {
    if (logCounter < MAX_LOGS_PER_SESSION) {
    }
  });
};

// خيارات Hook البيانات المشتركة
interface UseSharedStoreDataOptions {
  includeCategories?: boolean;
  includeProducts?: boolean;
  includeFeaturedProducts?: boolean;
}

// Hook مشترك لجلب بيانات المتجر مرة واحدة مع تحسينات الأداء
export const useSharedStoreData = (options: UseSharedStoreDataOptions = {}) => {
  const {
    includeCategories = true,
    includeProducts = true,
    includeFeaturedProducts = true
  } = options;
  const { currentOrganization } = useTenant();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  // استنتاج السابدومين من التخزين المحلي أو من hostname
  const resolveSubdomain = (): string | null => {
    try {
      const stored = localStorage.getItem('bazaar_current_subdomain');
      if (stored && stored !== 'main' && stored !== 'www') return stored;
    } catch {}
    try {
      const host = window.location.hostname;
      if (!host) return null;
      const parts = host.split(':')[0].split('.');
      if (parts.length > 1 && parts[0] && parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== '127') {
        return parts[0];
      }
    } catch {}
    return null;
  };
  const subdomain = resolveSubdomain();

  // تتبع الأداء - بداية (مقيد)
  const startTime = performance.now();
  if (logCounter < MAX_LOGS_PER_SESSION) {
    logCounter++;
  }

  // تحسين: استخدام cache محلي أولاً
  const getCachedData = (key: string) => {
    const cached = globalStoreDataCache[key];
    const timestamp = globalCacheTimestamp[key];
    
    if (cached && timestamp && (Date.now() - timestamp) < CACHE_DURATION) {
      if (logCounter < MAX_LOGS_PER_SESSION) {
      }
      return cached;
    }
    return null;
  };

  const setCachedData = (key: string, data: any) => {
    globalStoreDataCache[key] = data;
    globalCacheTimestamp[key] = Date.now();
    if (logCounter < MAX_LOGS_PER_SESSION) {
    }
  };

  // جلب جميع البيانات معاً في استدعاء واحد محسن
  const {
    data: storeData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['shared-store-data', organizationId, subdomain, includeCategories, includeProducts, includeFeaturedProducts],
    queryFn: async () => {
      // أولوية: إذا كنا على نطاق متجر (سابدومين)، استخدم RPC الموحد لاستدعاء واحد فقط
      if (subdomain) {
        // تحقق من cache محلي أولاً حسب السابدومين
        const cacheKey = `store-data-sd-${subdomain}`;
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }

        // نداء واحد: get_store_init_data (مع منع التكرار)
        if (!pendingRequests[subdomain]) {
          pendingRequests[subdomain] = (supabase as any)
            .rpc('get_store_init_data', { org_subdomain: subdomain })
            .then((res: any) => res)
            .finally(() => { delete pendingRequests[subdomain]; });
        }
        const rpcResult = await pendingRequests[subdomain];
        const { data, error } = rpcResult || {};
        if (error) {
          throw error;
        }
        const orgDetails = data?.organization_details || null;
        const orgSettings = data?.organization_settings || null;
        const categories = includeCategories ? (data?.categories || []) : [];
        // المنتجات الكاملة غير ضرورية لصفحة المتجر العامة، نكتفي بالمميزة من الـ RPC
        const featuredProducts = includeFeaturedProducts ? (data?.featured_products || []) : [];
        const products: any[] = includeProducts ? featuredProducts : [];
        const components = data?.store_layout_components || [];
        const footerSettings = data?.footer_settings || null;
        const testimonials = data?.testimonials || [];
        const seoMeta = data?.seo_meta || null;

        const result = {
          organization: currentOrganization || orgDetails,
          organizationSettings: orgSettings,
          products,
          categories,
          featuredProducts,
          components,
          footerSettings,
          testimonials,
          seoMeta
        };
        setCachedData(cacheKey, result);

        // مزامنة سريعة مع التخزين المحلي + حدث لتحديث بقية النظام
        try {
          if (subdomain && orgDetails?.id) {
            localStorage.setItem('bazaar_current_subdomain', subdomain);
            localStorage.setItem('bazaar_organization_id', orgDetails.id);
            localStorage.setItem(`bazaar_organization_${orgDetails.id}`, JSON.stringify(orgDetails));
            localStorage.setItem(`bazaar_rpc_org_details_${subdomain}`, JSON.stringify(orgDetails));
            if (orgSettings) {
              localStorage.setItem(`bazaar_org_settings_${orgDetails.id}`, JSON.stringify(orgSettings));
            }
            try {
              const storeInfo = {
                name: orgSettings?.site_name || orgDetails?.name,
                description: orgDetails?.description || `${orgDetails?.name} - متجر إلكتروني متميز`,
                logo_url: orgSettings?.logo_url || orgDetails?.logo_url,
                favicon_url: orgSettings?.favicon_url || orgSettings?.logo_url || orgDetails?.logo_url
              };
              sessionStorage.setItem(`store_${subdomain}`, JSON.stringify(storeInfo));
            } catch {}
            try {
              const updateEvent = new CustomEvent('organizationDataUpdated', {
                detail: {
                  organization: orgDetails,
                  settings: orgSettings,
                  subdomain
                }
              });
              window.dispatchEvent(updateEvent);
            } catch {}
          }
        } catch {}

        // تحميل صور خفيف في الخلفية
        setTimeout(() => preloadImages(products, categories), 50);
        return result;
      }

      // خلاف ذلك (لوحة التحكم)، استخدم المعرف وجلب البيانات اللازمة فقط
      if (!organizationId) {
        return null;
      }

      const cacheKey = `store-data-${organizationId}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) return cachedData;

      const orgSettings = await getOrganizationSettings(organizationId).catch(() => null);

      const [productsResponse, categoriesResponse] = await Promise.all([
        includeProducts
          ? supabase
              .from('products')
              .select(`
                id, name, description, price, compare_at_price,
                thumbnail_image, images, stock_quantity,
                is_featured, is_new, category_id, slug,
                category:category_id(id, name, slug),
                subcategory:subcategory_id(id, name, slug)
              `)
              .eq('organization_id', organizationId)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(200)
          : Promise.resolve({ data: [], error: null } as any),
        includeCategories
          ? supabase
              .from('product_categories')
              .select('id, name, slug, image_url, is_active')
              .eq('organization_id', organizationId)
              .eq('is_active', true)
              .order('name', { ascending: true })
              .limit(100)
          : Promise.resolve({ data: [], error: null } as any)
      ]);

      if ((productsResponse as any).error) throw (productsResponse as any).error;
      if ((categoriesResponse as any).error) throw (categoriesResponse as any).error;

      const products = (productsResponse as any).data || [];
      const categories = (categoriesResponse as any).data || [];
      const featuredProducts = includeFeaturedProducts && includeProducts ? products.filter((p: any) => p.is_featured) : [];

      const result = {
        organization: currentOrganization,
        organizationSettings: orgSettings,
        products,
        categories,
        featuredProducts,
        components: [],
        footerSettings: null,
        testimonials: [],
        seoMeta: null
      };
      setCachedData(cacheKey, result);
      setTimeout(() => preloadImages(products, categories), 50);
      return result;
    },
    // مفعّل إذا كان لدينا orgId أو subdomain
    enabled: !!organizationId || !!subdomain,
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // تحسين الأداء بإعطاء أولوية عالية
    networkMode: 'online',
    retry: 1, // تقليل المحاولات
    retryDelay: 500, // تقليل التأخير
  });

  // تتبع حالة التحميل
  const endTime = performance.now();
  if (logCounter < MAX_LOGS_PER_SESSION) {
  }

  // دالة لتحديث البيانات
  const refreshData = useCallback(() => {
    if (logCounter < MAX_LOGS_PER_SESSION) {
    }
    const refreshStart = performance.now();
    
    if (organizationId) {
      const cacheKey = `store-data-${organizationId}`;
      delete globalStoreDataCache[cacheKey];
      delete globalCacheTimestamp[cacheKey];
      if (logCounter < MAX_LOGS_PER_SESSION) {
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['shared-store-data', organizationId] });
    
    const refreshEnd = performance.now();
    if (logCounter < MAX_LOGS_PER_SESSION) {
    }
  }, [organizationId, queryClient]);

  // إرجاع البيانات بشكل منظم (محسن مع memoization)
  return useMemo(() => ({
    organization: storeData?.organization || null,
    organizationSettings: storeData?.organizationSettings || null,
    products: storeData?.products || [],
    categories: storeData?.categories || [],
    featuredProducts: storeData?.featuredProducts || [],
    components: storeData?.components || [],
    footerSettings: storeData?.footerSettings || null,
    testimonials: storeData?.testimonials || [],
    seoMeta: storeData?.seoMeta || null,
    isLoading,
    error: error?.message || null,
    refreshData
  }), [storeData, isLoading, error, refreshData]);
};
