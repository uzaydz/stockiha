import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

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

  // تحليل معلومات النطاق والمؤسسة
  const domainInfo = useMemo(() => analyzeDomain(), []);
  const { organizationId, subdomain, storeIdentifier } = domainInfo;

  console.log('🔗 [SHARED-DATA] تهيئة hook البيانات المشتركة', {
    options: {
      includeCategories,
      includeProducts,
      includeFeaturedProducts,
      cacheStrategy,
      enabled,
      forceStoreFetch
    },
    domainInfo,
    startTime: hookStartTime.current
  });

  const queryClient = useQueryClient();

  // 🔥 تحسين: استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastOrganizationId = useRef<string | null>(null);
  const lastSubdomain = useRef<string | null>(null);
  const renderCount = useRef(0);
  const isRenderLimitReached = useRef(false);

  // 🔥 تحسين: منع الرندر المفرط بطريقة آمنة مع React hooks
  renderCount.current++;
  if (renderCount.current > 10 && !isRenderLimitReached.current) {
    console.warn('⚠️ [useSharedStoreData] رندر مفرط مكتشف! إيقاف مؤقت...');
    isRenderLimitReached.current = true;

    // إيقاف مؤقت لمنع الرندر المفرط
    return {
      isLoading: false,
      error: 'تم إيقاف الرندر المفرط مؤقتاً',
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

  // 🔥 إصلاح: منطق shouldRefetch محسن مع كسر الحلقات المفرغة
  const shouldRefetch = useMemo(() => {
    // إذا وصلنا لحد الرندر، توقف نهائياً
    if (isRenderLimitReached.current) {
      console.log('🛑 [useSharedStoreData] تم إيقاف shouldRefetch بسبب حد الرندر');
      return false;
    }

    const currentOrgId = stableOrgId || '';
    const currentSubdomain = stableSubdomain || '';

    // فحص إذا كانت القيم تغيرت فعلاً
    const hasOrgChanged = lastOrganizationId.current !== currentOrgId;
    const hasSubdomainChanged = lastSubdomain.current !== currentSubdomain;
    const hasActualChange = hasOrgChanged || hasSubdomainChanged;

    // 🔥 إضافة حماية إضافية: منع التكرار المتتالي
    if (!hasActualChange && renderCount.current > 1) {
      if (renderCount.current % 10 === 0) { // تسجيل كل 10 مرات فقط
        console.log('⚡ [useSharedStoreData] منع refetch متكرر - لا توجد تغييرات فعلية');
      }
      return false;
    }

    // تحديث المراجع فوراً عند التغيير الفعلي فقط
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

    // أول تحميل فقط إذا لم نحمل من قبل
    const isFirstLoad = renderCount.current === 1 &&
                       currentOrgId &&
                       currentSubdomain &&
                       !lastOrganizationId.current;

    if (isFirstLoad) {
      lastOrganizationId.current = currentOrgId;
      lastSubdomain.current = currentSubdomain;
    }

    // 🔥 إضافة حماية: منع refetch إذا كانت البيانات متوفرة بالفعل في cache
    const cacheKey = createDomainCacheKey(storeIdentifier);
    const hasCachedData = !!getCachedData(cacheKey);
    if (hasCachedData && renderCount.current > 1) {
      if (renderCount.current % 5 === 0) { // تسجيل كل 5 مرات
        console.log('🎯 [useSharedStoreData] منع refetch - البيانات متوفرة في cache');
      }
      return false;
    }

    return isFirstLoad;
  }, [stableOrgId, stableSubdomain, storeIdentifier]); // dependencies مثبتة

  // إزالة useEffect المكرر - تم تحديث القيم في shouldRefetch

  // 🔥 تحسين: إعادة تعيين عداد الرندر عند تغيير المؤسسة
  useEffect(() => {
    if (stableOrgId !== lastOrganizationId.current) {
      renderCount.current = 0;
      isRenderLimitReached.current = false;
    }
  }, [stableOrgId]);

  // 🔥 إصلاح: تحسين منطق enabled لمنع التكرار
  const shouldEnable = useMemo(() => {
    const hasValidIdentifier = !!stableOrgId || !!stableSubdomain;
    const hasChanged = lastOrganizationId.current !== stableOrgId || lastSubdomain.current !== stableSubdomain;

    // 🔥 إضافة حماية: إذا وصلنا لحد الرندر، أوقف
    if (isRenderLimitReached.current) {
      return false;
    }

    // 🔥 إضافة حماية: منع التغيير المفرط في enabled
    if (!hasChanged && renderCount.current > 2) {
      // احتفظ بالحالة السابقة لمنع التغيير المفرط
      return lastEnabled.current;
    }

    // إذا تغير المعرف أو لدينا معرف صالح، فعل
    if (hasChanged || hasValidIdentifier) {
      return hasValidIdentifier;
    }

    // إذا لم يتغير المعرف، ابقِ على الحالة السابقة
    return lastEnabled.current;
  }, [stableOrgId, stableSubdomain]);

  // حفظ القيمة السابقة للمقارنة
  const lastEnabled = useRef(false);
  useEffect(() => {
    lastEnabled.current = shouldEnable;
  }, [shouldEnable]);

  // 🚀 إضافة استماع لحدث اكتمال البيانات الأولية مع معالجة محسنة
  const [initialDataReady, setInitialDataReady] = useState(false);

  useEffect(() => {
    const handleStoreInitReady = (event: CustomEvent) => {
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('🎯 [useSharedStoreData] تم استلام البيانات الأولية من main.tsx');
      }
      setInitialDataReady(true);
    };

    window.addEventListener('storeInitDataReady', handleStoreInitReady);

    // فحص إذا كانت البيانات جاهزة بالفعل
    if (storeIdentifier || !storeIdentifier) { // فحص حتى بدون storeIdentifier
      // فحص localStorage أولاً
      try {
        if (storeIdentifier) {
          const earlyData = localStorage.getItem(`early_preload_${storeIdentifier}`);
          if (earlyData) {
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
              console.log('🎯 [useSharedStoreData] البيانات الأولية موجودة بالفعل في localStorage');
            }
            setInitialDataReady(true);
            return;
          }
        }
      } catch (e) {
        console.warn('⚠️ localStorage غير متوفر (متصفح مخفي؟)');
      }

      // فحص جميع مصادر window objects
      const windowEarlyData = (window as any).__EARLY_STORE_DATA__;
      const windowSharedData = (window as any).__SHARED_STORE_DATA__;
      const windowCurrentData = (window as any).__CURRENT_STORE_DATA__;

      if (windowEarlyData?.data || windowSharedData || windowCurrentData) {
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log('🎯 [useSharedStoreData] البيانات الأولية موجودة في window object');
        }
        setInitialDataReady(true);
        return;
      }

      // 🚨 إذا لم نجد شيء، ابدأ countdown قصير للـ timeout
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
        console.log('⏳ [useSharedStoreData] لا توجد بيانات، انتظار لـ 1.5 ثوان...');
      }
      setTimeout(() => {
        const recheckWindowData = (window as any).__EARLY_STORE_DATA__;
        const recheckSharedData = (window as any).__SHARED_STORE_DATA__;
        if (recheckWindowData?.data || recheckSharedData) {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('🎯 [useSharedStoreData] وُجدت البيانات بعد الانتظار');
          }
          setInitialDataReady(true);
        } else {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('🚨 [useSharedStoreData] تفعيل اضطراري بعد timeout');
          }
          setInitialDataReady(true);
        }
      }, 1500); // تقليل الوقت إلى 1.5 ثانية
    } else {
      // إذا لم يكن هناك storeIdentifier، فعل مباشرة
      setInitialDataReady(true);
    }

    return () => {
      window.removeEventListener('storeInitDataReady', handleStoreInitReady);
    };
  }, [stableSubdomain, stableOrgId]);

  // 🔥 إصلاح: استخدام مفتاح مستقر لمنع re-queries متكررة
  const stableQueryKey = useMemo(() => {
    const key = [
      'shared-store-data-v2',
      stableOrgId || 'no-org',
      stableSubdomain || 'no-subdomain'
    ];
    // فقط أضف shouldRefetch إذا كان true لتجنب تكرار غير ضروري
    if (shouldRefetch && initialDataReady) {
      key.push('refetch', Date.now().toString().slice(-6)); // آخر 6 أرقام للطابع الزمني
    }
    return key;
  }, [stableOrgId, stableSubdomain, shouldRefetch, initialDataReady]);

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
      const data = await fetchStoreData(organizationId, subdomain, options, forceStoreFetch);

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
    // 🔥 إصلاح: إعدادات cache محسنة لمنع التكرار المفرط
    staleTime: 10 * 60 * 1000, // 10 دقائق - زيادة لمنع re-fetch متكرر
    gcTime: 15 * 60 * 1000, // 15 دقائق
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false, // منع إعادة التحميل عند إعادة الاتصال
    enabled: shouldEnable && enabled && initialDataReady && !isRenderLimitReached.current,
    // 🔥 منع إعادة الطلب إذا كانت البيانات متوفرة أو تجاوزنا حد الرندر
    retry: (failureCount, error) => {
      if (isRenderLimitReached.current || failureCount >= 2) return false;
      return true;
    },
    retryOnMount: false,
    // 🔥 إضافة networkMode للتعامل مع الحالات الغير متصلة
    networkMode: 'online'
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
  }, [stableOrgId, stableSubdomain, queryClient, stableQueryKey]);

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

  return result;
}

export default useSharedStoreData;
