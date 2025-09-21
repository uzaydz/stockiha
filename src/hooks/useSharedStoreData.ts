import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { isProduction } from '@/utils/environment';

// استيراد المكونات المنفصلة
import {
  type SharedStoreDataReturn,
  type UseSharedStoreDataOptions,
  getCachedData,
  setCachedData,
  getOrCreateRequest,
  preloadImages,
  analyzeDomain,
  createDomainCacheKey,
  fetchStoreData,
  applyThemeSettings,
  clearCache
} from './shared-store';

/**
 * Hook مشترك لجلب بيانات المتجر مرة واحدة مع تحسينات الأداء
 * تم إعادة هيكلته لاستخدام مكونات منفصلة لتحسين الصيانة والأداء
 */
// 🔥 تحسين: استخدام global cache لمنع إنشاء عدة instances
const globalSharedDataCache = new Map<string, SharedStoreDataReturn>();

export function useSharedStoreData(options: UseSharedStoreDataOptions = {}): SharedStoreDataReturn {
  const hookStartTime = useRef(performance.now());

  const {
    includeComponents = true,
    includeFooterSettings = true,
    includeTestimonials = true,
    includeSeoMeta = true,
    includeCategories = true,
    includeProducts = true,
    includeFeaturedProducts = true,
    enableOptimisticUpdates = true,
    cacheStrategy = 'aggressive',
    enabled = true,
    forceStoreFetch = false
  } = options;

  // تحليل معلومات النطاق والمؤسسة - إعادة تقييم عندما تصبح البيانات جاهزة
  const [windowDataTimestamp, setWindowDataTimestamp] = useState<number>(0);
  
  // مراقبة تغيرات window.__EARLY_STORE_DATA__ / __PREFETCHED_STORE_DATA__
  useEffect(() => {
    const checkWindowData = () => {
      const early = (window as any).__EARLY_STORE_DATA__;
      const prefetched = (window as any).__PREFETCHED_STORE_DATA__;
      const storeData = (window as any).__STORE_DATA__;
      const storeSettings = (window as any).__STORE_SETTINGS__;

      // البحث عن أحدث timestamp من جميع المصادر
      // 🔥 إصلاح: استخدام timestamps ثابتة ومنفصلة لكل مصدر لمنع الرندر المفرط
      const timestamps = [
        early?.timestamp,
        prefetched?.timestamp,
        storeData ? (early?.timestamp || prefetched?.timestamp || Date.now()) : 0,
        storeSettings ? (early?.timestamp || prefetched?.timestamp || Date.now()) : 0
      ].filter(ts => ts > 0);

      const newTs = Math.max(...timestamps, 0);

      if (newTs && newTs !== windowDataTimestamp) {
        setWindowDataTimestamp(newTs);
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [useSharedStoreData] تحديث windowDataTimestamp:', {
            newTs,
            sources: {
              early: !!early,
              prefetched: !!prefetched,
              storeData: !!storeData,
              storeSettings: !!storeSettings
            }
          });
        }
      }
    };
    
    // فحص فوري
    checkWindowData();
    
    // الاستماع للأحداث
    const handleStoreDataReady = () => {
      setTimeout(checkWindowData, 50); // تأخير صغير للتأكد من تحديث window object
    };
    
    window.addEventListener('storeDataReady', handleStoreDataReady);
    window.addEventListener('storeInitDataReady', handleStoreDataReady);
    
    return () => {
      window.removeEventListener('storeDataReady', handleStoreDataReady);
      window.removeEventListener('storeInitDataReady', handleStoreDataReady);
    };
  }, [windowDataTimestamp]);
  
  const domainInfo = useMemo(() => {
    const result = analyzeDomain();
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [useSharedStoreData] إعادة تحليل domain:', {
        organizationId: result.organizationId,
        storeIdentifier: result.storeIdentifier,
        windowDataTimestamp
      });
    }
    return result;
  }, [windowDataTimestamp]); // 🔥 تحسين: يُعاد الحساب فقط عند تغير windowDataTimestamp بشكل حقيقي
  
  const { organizationId, subdomain, storeIdentifier } = domainInfo;

  // 🔥 تحسين: فحص الـ cache العالمي أولاً مع حماية من التغييرات المتكررة
  const cacheKey = `${organizationId || 'no-org'}-${subdomain || 'no-subdomain'}`;
  const cachedData = globalSharedDataCache.get(cacheKey);
  const shouldUseCache = cachedData && !forceStoreFetch;

  // 🔥 إصلاح: منع إعادة الاستعلام عند تغيير cacheKey فقط
  const stableCacheKey = useRef(cacheKey);
  const isCacheKeyChanged = stableCacheKey.current !== cacheKey;

  // تحديث stableCacheKey فقط عند تغيير حقيقي
  if (isCacheKeyChanged && organizationId && subdomain) {
    stableCacheKey.current = cacheKey;
  }

  const queryClient = useQueryClient();

  // 🔥 تحسين: استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastOrganizationId = useRef<string | null>(null);
  const lastSubdomain = useRef<string | null>(null);
  const renderCount = useRef(0);

  // 🔥 تحسين: منع الرندر المفرط بطريقة آمنة مع React hooks
  renderCount.current++;

  // تقليل logs لتجنب التكرار المفرط - فقط عندما لا نستخدم cache
  if (process.env.NODE_ENV === 'development' && !shouldUseCache) {
    console.log('🔗 [SHARED-DATA] تهيئة hook البيانات المشتركة (بيانات جديدة)', {
      options: {
        includeCategories,
        includeProducts,
        includeFeaturedProducts,
        cacheStrategy,
        enabled,
        forceStoreFetch
      },
      domainInfo,
      startTime: hookStartTime.current,
      usingCache: shouldUseCache
    });
  }
  if (renderCount.current > 15) {
    console.warn('⚠️ [useSharedStoreData] رندر مفرط مكتشف! إيقاف نهائي...');

    // إيقاف نهائي لمنع الرندر المفرط
    return {
      isLoading: false,
      error: 'تم إيقاف الرندر المفرط نهائياً',
      organization: null,
      organizationSettings: null,
      products: [],
      categories: [],
      featuredProducts: [],
      components: [],
      footerSettings: null,
      testimonials: [],
      seoMeta: null,
      refreshData: async () => {}
    };
  }

  // 🔥 إصلاح: تثبيت القيم باستخدام useMemo لمنع إعادة الإنشاء
  const stableOrgId = useMemo(() => organizationId, [organizationId]);
  const stableSubdomain = useMemo(() => subdomain, [subdomain]);

  // 🔥 إصلاح: منطق shouldRefetch مبسط لمنع الرندر المفرط
  const shouldRefetch = useMemo(() => {
    const currentOrgId = stableOrgId || '';
    const currentSubdomain = stableSubdomain || '';

    // فحص إذا كانت القيم تغيرت فعلاً
    const hasOrgChanged = lastOrganizationId.current !== currentOrgId;
    const hasSubdomainChanged = lastSubdomain.current !== currentSubdomain;
    const hasActualChange = hasOrgChanged || hasSubdomainChanged;

    // تحديث المراجع عند التغيير الفعلي
    if (hasActualChange) {
      console.log('🔄 [useSharedStoreData] تغيير فعلي مكتشف:', {
        oldOrg: lastOrganizationId.current,
        newOrg: currentOrgId,
        oldSubdomain: lastSubdomain.current,
        newSubdomain: currentSubdomain
      });
      lastOrganizationId.current = currentOrgId;
      lastSubdomain.current = currentSubdomain;
      return true;
    }

    // أول تحميل فقط إذا لم نحمل من قبل ولدينا معرف صالح
    const hasValidIdentifier = !!(currentOrgId || currentSubdomain);
    const isFirstLoad = renderCount.current === 1 && hasValidIdentifier && !lastOrganizationId.current;

    if (isFirstLoad) {
      lastOrganizationId.current = currentOrgId;
      lastSubdomain.current = currentSubdomain;
    }

    // لا نعيد الجلب إلا عند التغيير الفعلي أو التحميل الأول
    return hasActualChange || isFirstLoad;
  }, [stableOrgId, stableSubdomain]);

  // إزالة useEffect المكرر - تم تحديث القيم في shouldRefetch

  // 🔥 إصلاح: منطق enabled مبسط
  const shouldEnable = useMemo(() => {
    return !!stableOrgId || !!stableSubdomain;
  }, [stableOrgId, stableSubdomain]);

  // 🚀 تبسيط استماع لحدث اكتمال البيانات الأولية
  const [initialDataReady, setInitialDataReady] = useState(true);

  useEffect(() => {
    const handleStoreInitReady = () => {
      setInitialDataReady(true);
    };

    window.addEventListener('storeInitDataReady', handleStoreInitReady);

    // فحص البيانات الموجودة في window objects
    const windowEarlyData = (window as any).__EARLY_STORE_DATA__ || (window as any).__PREFETCHED_STORE_DATA__;
    const windowSharedData = (window as any).__SHARED_STORE_DATA__;

    if (windowEarlyData?.data || windowSharedData) {
      setInitialDataReady(true);
    }

    return () => {
      window.removeEventListener('storeInitDataReady', handleStoreInitReady);
    };
  }, []);

  // 🔥 إصلاح: مفتاح query مبسط
  const stableQueryKey = useMemo(() => [
    'shared-store-data-v2',
    stableOrgId || 'no-org',
    stableSubdomain || 'no-subdomain'
  ], [stableOrgId, stableSubdomain]);

  const {
    data: storeData,
    isLoading,
    error
  } = useQuery({
    queryKey: stableQueryKey,
    queryFn: async () => {
      const startTime = performance.now();
      console.log('🚀 [SHARED-DATA] بدء جلب البيانات المشتركة', {
        organizationId,
        subdomain,
        initialDataReady,
        shouldRefetch,
        startTime,
        cacheStrategy
      });

      // 🔥 تجربة جلب البيانات أولاً حتى لو لم تكن "ready" بعد
      // في الإنتاج، أضف تأخير قصير للسماح للبيانات الأولية بالتحميل
      if (isProduction && !initialDataReady) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const data = await fetchStoreData(organizationId, subdomain, options, forceStoreFetch);

      console.log('🔍 [useSharedStoreData] البيانات المُعادة من fetchStoreData:', {
        hasData: !!data,
        componentsLength: data?.components?.length || 0,
        components: data?.components,
        organization: !!data?.organization,
        organizationSettings: !!data?.organizationSettings,
        categoriesLength: data?.categories?.length || 0,
        featuredProductsLength: data?.featuredProducts?.length || 0,
        dataKeys: data ? Object.keys(data) : [],
        rawData: data
      });

      if (data) {
        // تطبيق السمات والألوان
        if (data.organization && data.organizationSettings) {
          applyThemeSettings(data.organization.id, data.organizationSettings);
        }

        // تحميل الصور مسبقاً
        if (data.products?.length || data.categories?.length) {
          preloadImages(data.products || [], data.categories || []);
        }

        console.log('✅ [SHARED-DATA] تم جلب البيانات بنجاح', {
          timing: performance.now() - startTime,
          hasOrganization: !!data.organization,
          hasSettings: !!data.organizationSettings
        });

        return data;
      }

      return null;
    },
    // 🔥 إصلاح: إعدادات cache محسنة للإنتاج والتطوير
    staleTime: isProduction ? 15 * 60 * 1000 : 5 * 60 * 1000, // 15 دقيقة في الإنتاج، 5 دقائق في التطوير
    gcTime: isProduction ? 30 * 60 * 1000 : 10 * 60 * 1000, // 30 دقيقة في الإنتاج، 10 دقائق في التطوير
    refetchOnWindowFocus: false,
    refetchOnMount: isProduction ? false : true, // في الإنتاج، لا نعيد التحميل عند التركيز
    refetchOnReconnect: isProduction ? false : true, // في الإنتاج، لا نعيد التحميل عند إعادة الاتصال
    enabled: shouldEnable && enabled && initialDataReady,
    retry: isProduction ? 3 : 2, // المزيد من المحاولات في الإنتاج
    retryOnMount: false,
    // تحسين للإنتاج: انتظار أطول قبل إعادة المحاولة
    retryDelay: isProduction ? (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000) : undefined
  });

  // 🚀 تطبيق البيانات على window للوصول السريع
  useEffect(() => {
    if (storeData?.organization && storeData?.organizationSettings) {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('🎯 [useSharedStoreData] تطبيق البيانات على window object');
      }
      (window as any).__SHARED_STORE_DATA__ = {
        organization: storeData.organization,
        organizationSettings: storeData.organizationSettings,
        timestamp: Date.now()
      };

      // 🚀 إطلاق حدث أن البيانات جاهزة للمكونات
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('🎯 [useSharedStoreData] إطلاق حدث storeDataReady');
      }
      window.dispatchEvent(new CustomEvent('storeDataReady', {
        detail: {
          hasData: true,
          source: 'useSharedStoreData',
          dataTypes: {
            hasOrganization: !!storeData.organization,
            hasOrganizationSettings: !!storeData.organizationSettings,
            categoriesCount: storeData.categories?.length || 0,
            componentsCount: storeData.components?.length || 0
          }
        }
      }));
    }
  }, [storeData?.organization, storeData?.organizationSettings]);


  // دالة محسنة لتحديث البيانات مع الحفاظ على البيانات المؤقتة
  const refreshData = useCallback(async () => {
    try {
      // 🔥 تحسين: مسح الـ cache العالمي أولاً
      globalSharedDataCache.delete(cacheKey);

      // إبطال البيانات المؤقتة بشكل انتقائي
      if (stableOrgId) {
        const cacheKey = `store-data-${stableOrgId}`;
        clearCache(cacheKey);
      }

      if (stableSubdomain) {
        const cacheKey = `store-data-sd-${stableSubdomain}`;
        clearCache(cacheKey);
      }

      // إزالة cache للبيانات الموحدة أيضاً
      if (subdomain || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
        const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
        const isCustomDomain = !isBaseDomain;

        if (isCustomDomain) {
          // 🔥 إصلاح: استخدام النطاق بدون www للـ cache key
          let cleanHostname = hostname;
          if (cleanHostname.startsWith('www.')) {
            cleanHostname = cleanHostname.substring(4);
          }
          const cacheKey = `store-data-unified-${cleanHostname}`;
          clearCache(cacheKey);
        }
      }

      // إبطال React Query cache
      await queryClient.invalidateQueries({ queryKey: stableQueryKey });
    } catch (error) {
      // معالجة الأخطاء في refreshData
      if (process.env.NODE_ENV === 'development') {
        console.error('خطأ في تحديث البيانات:', error);
      }
    }
  }, [stableOrgId, stableSubdomain, queryClient, stableQueryKey, cacheKey]);

  // إرجاع البيانات بشكل منظم (محسن مع memoization)
  const data = storeData as any; // تحويل النوع بشكل آمن

  // 🔥 إصلاح مهم: ضمان إرجاع نفس البنية دائماً
  const result: SharedStoreDataReturn = useMemo(() => ({
    organization: data?.organization || null,
    organizationSettings: data?.organizationSettings || null,
    products: data?.products || [],
    categories: data?.categories || [],
    featuredProducts: data?.featuredProducts || [],
    components: data?.components || [],
    footerSettings: data?.footerSettings || null,
    testimonials: data?.testimonials || [],
    seoMeta: data?.seoMeta || null,
    isLoading: isLoading || false,
    error: error?.message || null,
    refreshData: refreshData || (() => Promise.resolve(void 0))
  }), [storeData, isLoading, error, refreshData]);

  // 🔥 تحسين: حفظ النتيجة في الـ cache العالمي
  if (result && !result.isLoading && !result.error) {
    globalSharedDataCache.set(cacheKey, result);
  }

  // إرجاع الـ cache إذا كان متوفراً، وإلا إرجاع النتيجة المحسوبة
  return shouldUseCache ? cachedData : result;
}

// 🔥 تحسين: دالة لمسح الـ cache العالمي (للاستخدام في التطوير)
export const clearGlobalSharedDataCache = () => {
  globalSharedDataCache.clear();
};

export default useSharedStoreData;
