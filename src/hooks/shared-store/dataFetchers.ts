import { getStoreInitData, getStoreInitDataWithCustomDomainFallback, getStoreInitDataByCustomDomain } from '@/lib/api/deduplicatedApi';
import { hasPreloadedStoreData, getPreloadedStoreData } from '@/services/preloadService';
import { getEarlyPreloadedData } from '@/utils/earlyPreload';
import type { UseSharedStoreDataOptions, CachedStoreData } from './types';

/**
 * جلب البيانات من window object
 */
export const fetchFromWindowObject = (
  organizationId: string | null,
  subdomain: string | null,
  options: UseSharedStoreDataOptions
): CachedStoreData | null => {
  try {
    const win: any = window as any;
    const windowDataRoot = win.__EARLY_STORE_DATA__?.data || win.__PREFETCHED_STORE_DATA__ || null;
    if (!windowDataRoot) return null;

    const data = windowDataRoot;
    const currentOrganization = data?.organization_details || null;

    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      console.log('🎯 [DataFetchers] وجدت البيانات في window object');
    }

    return {
      organization: currentOrganization || data.organization_details || null,
      organizationSettings: data.organization_settings || null,
      categories: options.includeCategories ? (data.categories || []) : [],
      products: options.includeProducts ? (data.featured_products || []) : [],
      featuredProducts: options.includeFeaturedProducts ? (data.featured_products || []) : [],
      components: options.includeComponents ? (data.store_layout_components || data.components || []) : [],
      footerSettings: options.includeFooterSettings ? (data.footer_settings || null) : null,
      testimonials: options.includeTestimonials ? (data.testimonials || []) : [],
      seoMeta: options.includeSeoMeta ? (data.seo_meta || null) : null,
      isLoading: false,
      error: null,
      cacheTimestamp: new Date().toISOString()
    };
  } catch {
    return null;
  }
};

/**
 * جلب البيانات من localStorage
 */
export const fetchFromLocalStorage = (
  storeIdentifier: string,
  options: UseSharedStoreDataOptions
): CachedStoreData | null => {
  try {
    const earlyPreloadKey = `early_preload_${storeIdentifier}`;
    const storedData = localStorage.getItem(earlyPreloadKey);

    if (!storedData) return null;

    const parsed = JSON.parse(storedData);
    const data = parsed.data;

    if (!data) return null;

    const currentOrganization = (window as any).__EARLY_STORE_DATA__?.data?.organization_details ||
                                (window as any).__PREFETCHED_STORE_DATA__?.organization_details || null;

    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      console.log('🎯 [DataFetchers] استخدام البيانات من localStorage');
    }

    // حفظ البيانات في window object أيضاً للوصول السريع
    (window as any).__CURRENT_STORE_DATA__ = {
      organization: currentOrganization || data.organization_details || null,
      organizationSettings: data.organization_settings || null,
      storeIdentifier: storeIdentifier
    };

    return {
      organization: currentOrganization || data.organization_details || null,
      organizationSettings: data.organization_settings || null,
      categories: options.includeCategories ? (data.categories || []) : [],
      products: options.includeProducts ? (data.featured_products || []) : [],
      featuredProducts: options.includeFeaturedProducts ? (data.featured_products || []) : [],
      components: options.includeComponents ? (data.store_layout_components || data.components || []) : [],
      footerSettings: options.includeFooterSettings ? (data.footer_settings || null) : null,
      testimonials: options.includeTestimonials ? (data.testimonials || []) : [],
      seoMeta: options.includeSeoMeta ? (data.seo_meta || null) : null,
      isLoading: false,
      error: null,
      cacheTimestamp: new Date().toISOString()
    };
  } catch (e) {
    console.warn('⚠️ خطأ في قراءة البيانات من localStorage:', e);
    return null;
  }
};

/**
 * جلب البيانات من preloadService
 */
export const fetchFromPreloadService = (
  storeIdentifier: string,
  options: UseSharedStoreDataOptions
): CachedStoreData | null => {
  try {
    if (!hasPreloadedStoreData(storeIdentifier)) return null;

    const preloadedData = getPreloadedStoreData(storeIdentifier);
    if (!preloadedData) return null;

    const currentOrganization = (window as any).__EARLY_STORE_DATA__?.data?.organization_details ||
                                (window as any).__PREFETCHED_STORE_DATA__?.organization_details || null;

    return {
      organization: currentOrganization || preloadedData.organization_details || null,
      organizationSettings: preloadedData.organization_settings || null,
      categories: options.includeCategories ? (preloadedData.categories || []) : [],
      products: options.includeProducts ? (preloadedData.featured_products || []) : [],
      featuredProducts: options.includeFeaturedProducts ? (preloadedData.featured_products || []) : [],
      components: options.includeComponents ? (preloadedData.store_layout_components || preloadedData.components || []) : [],
      footerSettings: options.includeFooterSettings ? (preloadedData.footer_settings || null) : null,
      testimonials: options.includeTestimonials ? (preloadedData.testimonials || []) : [],
      seoMeta: options.includeSeoMeta ? (preloadedData.seo_meta || null) : null,
      isLoading: false,
      error: null,
      cacheTimestamp: new Date().toISOString()
    };
  } catch {
    return null;
  }
};

/**
 * جلب البيانات من early preload
 */
export const fetchFromEarlyPreload = (
  storeIdentifier: string,
  options: UseSharedStoreDataOptions
): CachedStoreData | null => {
  try {
    const earlyData = getEarlyPreloadedData(storeIdentifier);
    if (!earlyData) return null;

    const currentOrganization = (window as any).__EARLY_STORE_DATA__?.data?.organization_details ||
                                (window as any).__PREFETCHED_STORE_DATA__?.organization_details || null;

    return {
      organization: currentOrganization || earlyData.organization_details || null,
      organizationSettings: earlyData.organization_settings || null,
      categories: options.includeCategories ? (earlyData.categories || []) : [],
      products: options.includeProducts ? (earlyData.featured_products || []) : [],
      featuredProducts: options.includeFeaturedProducts ? (earlyData.featured_products || []) : [],
      components: options.includeComponents ? (earlyData.store_layout_components || earlyData.components || []) : [],
      footerSettings: options.includeFooterSettings ? (earlyData.footer_settings || null) : null,
      testimonials: options.includeTestimonials ? (earlyData.testimonials || []) : [],
      seoMeta: options.includeSeoMeta ? (earlyData.seo_meta || null) : null,
      isLoading: false,
      error: null,
      cacheTimestamp: new Date().toISOString()
    };
  } catch {
    return null;
  }
};

/**
 * انتظار البيانات من early preload
 */
export const waitForEarlyPreload = async (
  storeIdentifier: string,
  timeoutMs: number = 700,
  options: UseSharedStoreDataOptions
): Promise<CachedStoreData | null> => {
  try {
    const existing = getEarlyPreloadedData(storeIdentifier);
    if (existing) {
      return fetchFromEarlyPreload(storeIdentifier, options);
    }

    const result = await new Promise<any | null>((resolve) => {
      let settled = false;
      const onDone = (e: any) => {
        const id = e?.detail?.storeIdentifier;
        if (id === storeIdentifier && !settled) {
          settled = true;
          resolve(e.detail?.data || null);
          window.removeEventListener('earlyPreloadComplete' as any, onDone);
        }
      };
      window.addEventListener('earlyPreloadComplete' as any, onDone, { once: true });
      setTimeout(() => {
        if (!settled) {
          settled = true;
          window.removeEventListener('earlyPreloadComplete' as any, onDone);
          resolve(null);
        }
      }, timeoutMs);
    });

    if (result) {
      const currentOrganization = (window as any).__EARLY_STORE_DATA__?.data?.organization_details ||
                                  (window as any).__PREFETCHED_STORE_DATA__?.organization_details || null;
      return {
        organization: currentOrganization || result.organization_details || null,
        organizationSettings: result.organization_settings || null,
        categories: options.includeCategories ? (result.categories || []) : [],
        products: options.includeProducts ? (result.featured_products || []) : [],
        featuredProducts: options.includeFeaturedProducts ? (result.featured_products || []) : [],
        components: options.includeComponents ? (result.store_layout_components || []) : [],
        footerSettings: options.includeFooterSettings ? (result.footer_settings || null) : null,
        testimonials: options.includeTestimonials ? (result.testimonials || []) : [],
        seoMeta: options.includeSeoMeta ? (result.seo_meta || null) : null,
        isLoading: false,
        error: null,
        cacheTimestamp: new Date().toISOString()
      };
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * جلب البيانات من API مع fallback للنطاقات المخصصة
 */
export const fetchFromAPI = async (
  finalStoreIdentifier: string,
  options: UseSharedStoreDataOptions
): Promise<CachedStoreData | null> => {
  try {
    console.log('🚀 [fetchFromAPI] بدء البحث عن البيانات للمعرف:', finalStoreIdentifier);

    // 🔥 استخدام الدالة الجديدة مع fallback للنطاقات المخصصة
    let data = await getStoreInitDataWithCustomDomainFallback(finalStoreIdentifier);

    console.log('🔍 [fetchFromAPI] البيانات المستلمة من RPC:', {
      storeIdentifier: finalStoreIdentifier,
      hasData: !!data,
      hasError: data?.error,
      dataKeys: data ? Object.keys(data) : [],
      hasStoreLayoutComponents: !!(data?.store_layout_components),
      hasComponents: !!(data?.components),
      storeLayoutComponentsCount: (data?.store_layout_components || [])?.length || 0,
      componentsCount: (data?.components || [])?.length || 0,
      organization_details: !!data?.organization_details,
      organization_settings: !!data?.organization_settings,
      custom_domain_fallback: data?.custom_domain_fallback,
      error: data?.error,
      message: data?.message,
      // إضافة تفاصيل أكثر
      store_layout_components: data?.store_layout_components,
      components: data?.components,
      organization_details_id: data?.organization_details?.id,
      organization_details_name: data?.organization_details?.name,
      rawDataSize: JSON.stringify(data).length
    });

    // 🔥 إصلاح للنطاقات المخصصة: إذا لم نجد البيانات، نبحث بطرق أخرى
    if (!data || data.error) {
      console.log('🔄 [fetchFromAPI] لم نجد البيانات بالمعرف الأصلي، محاولة fallback strategies');

      // محاولة 1: استخراج subdomain من النطاق المخصص
      const fallbackData = await tryCustomDomainFallback(finalStoreIdentifier, options);
      if (fallbackData) {
        console.log('✅ [fetchFromAPI] تم العثور على البيانات باستخدام fallback strategy');
        data = fallbackData;
      } else {
        console.warn('⚠️ [fetchFromAPI] فشل جميع fallback strategies للمعرف:', finalStoreIdentifier);
        return null;
      }
    }

    // 🔥 تحقق إضافي: إذا كانت البيانات فارغة تماماً، حاول البحث المباشر
    if (data && !data.organization_details && !data.organization_settings && (!data.store_layout_components || data.store_layout_components.length === 0)) {
      console.log('⚠️ [fetchFromAPI] البيانات فارغة، محاولة البحث المباشر عن subdomain');

      // محاولة البحث المباشر عن subdomain
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const parts = hostname.split('.');
      if (parts.length >= 3 && parts[0] && parts[0] !== 'www') {
        const potentialSubdomain = parts[0];
        console.log('🔍 [fetchFromAPI] محاولة البحث المباشر عن:', potentialSubdomain);

        // استخدم الدالة المخصصة للبحث المباشر
        try {
          const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
          const directData = await getStoreInitDataByCustomDomain(hostname);
          if (directData && !directData.error && directData.organization_details) {
            console.log('✅ [fetchFromAPI] تم العثور على البيانات بالبحث المباشر');
            data = directData;
          }
        } catch (e) {
          console.warn('⚠️ [fetchFromAPI] فشل البحث المباشر:', e);
        }
      }
    }

    // 🔥 إصلاح محسن: إذا كان store_layout_components موجود، انسخ البيانات دائماً
    if (data?.store_layout_components && data.store_layout_components.length > 0) {
      console.log('🔧 [fetchFromAPI] نسخ store_layout_components إلى components لضمان التوافق');
      console.log('🔍 [fetchFromAPI] store_layout_components:', {
        length: data.store_layout_components.length,
        types: data.store_layout_components.map((c: any) => c.type || c.component_type),
        ids: data.store_layout_components.map((c: any) => c.id)
      });

      // 🔥 إصلاح: انسخ البيانات دائماً لضمان التوافق مع جميع المكونات
      data.components = data.store_layout_components;
    }

    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      console.log('🎯 [DataFetchers] استخدام API الموحد');
    }

    const currentOrganization = (window as any).__EARLY_STORE_DATA__?.data?.organization_details || null;

    const orgDetails = data?.organization_details || null;
    const orgSettings = data?.organization_settings || null;
    const categories = options.includeCategories ? (data?.categories || []) : [];
    const featuredProducts = options.includeFeaturedProducts ? (data?.featured_products || []) : [];
    const products: any[] = options.includeProducts
      ? (data?.products_first_page || data?.products || featuredProducts || [])
      : [];
    const components = options.includeComponents ? (data?.store_layout_components || data?.components || []) : [];
    const footerSettings = options.includeFooterSettings ? (data?.footer_settings || null) : null;
    const testimonials = options.includeTestimonials ? (data?.testimonials || []) : [];
    const seoMeta = options.includeSeoMeta ? (data?.seo_meta || null) : null;

    const result: CachedStoreData = {
      organization: currentOrganization || orgDetails,
      organizationSettings: orgSettings,
      categories,
      products,
      featuredProducts,
      components,
      footerSettings,
      testimonials,
      seoMeta,
      isLoading: false,
      error: null,
      cacheTimestamp: new Date().toISOString()
    };

    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 [DataFetchers] خطأ في API الموحد:', error);
    }
    throw error;
  }
};

/**
 * محاولة fallback للنطاقات المخصصة
 */
const tryCustomDomainFallback = async (
  originalIdentifier: string,
  options: UseSharedStoreDataOptions
): Promise<any | null> => {
  try {
    console.log('🔄 [tryCustomDomainFallback] محاولة fallback للنطاق:', originalIdentifier);

    // محاولة 1: استخراج subdomain محتمل من النطاق المخصص
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    if (hostname && hostname.includes('.')) {
      const parts = hostname.split('.');
      if (parts.length >= 3 && parts[0] && parts[0] !== 'www') {
        const potentialSubdomain = parts[0];
        console.log('🔍 [tryCustomDomainFallback] استخراج subdomain من hostname:', {
          hostname,
          potentialSubdomain,
          parts
        });

        // أولاً: جرب البحث بالـ subdomain المستخرج مباشرة
        try {
          const subdomainData = await getStoreInitData(potentialSubdomain);
          if (subdomainData && !subdomainData.error && subdomainData.organization_details) {
            console.log('✅ [tryCustomDomainFallback] تم العثور على البيانات باستخدام subdomain المباشر:', potentialSubdomain);
            return subdomainData;
          }
        } catch (e) {
          console.warn('⚠️ [tryCustomDomainFallback] فشل في البحث المباشر بـ subdomain:', potentialSubdomain);
        }

        // ثانياً: جرب إضافة "collection" للـ subdomain إذا كان قصيراً
        if (potentialSubdomain.length >= 3 && !potentialSubdomain.includes('collection')) {
          const fullSubdomain = potentialSubdomain + 'collection';
          console.log('🔍 [tryCustomDomainFallback] محاولة subdomain مع collection:', fullSubdomain);

          try {
            const fullSubdomainData = await getStoreInitData(fullSubdomain);
            if (fullSubdomainData && !fullSubdomainData.error && fullSubdomainData.organization_details) {
              console.log('✅ [tryCustomDomainFallback] تم العثور على البيانات باستخدام full subdomain:', fullSubdomain);
              return fullSubdomainData;
            }
          } catch (e) {
            console.warn('⚠️ [tryCustomDomainFallback] فشل في البحث بـ full subdomain:', fullSubdomain);
          }
        }

        // ثالثاً: جرب البحث بالنطاق كامل
        try {
          const domainData = await getStoreInitData(originalIdentifier);
          if (domainData && !domainData.error && domainData.organization_details) {
            console.log('✅ [tryCustomDomainFallback] تم العثور على البيانات بالنطاق الأصلي');
            return domainData;
          }
        } catch (e) {
          console.warn('⚠️ [tryCustomDomainFallback] فشل البحث بالنطاق الأصلي');
        }
      }
    }

    // محاولة 2: البحث في localStorage عن أي بيانات متعلقة بالنطاق
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.includes('organization') || key.includes('store') || key.includes('domain')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              if (parsed && typeof parsed === 'object') {
                // البحث عن subdomain أو organization id
                if (parsed.subdomain || parsed.id) {
                  const fallbackIdentifier = parsed.subdomain || parsed.id;
                  console.log('🔍 [tryCustomDomainFallback] محاولة من localStorage:', fallbackIdentifier);

                  try {
                    const localData = await getStoreInitData(fallbackIdentifier);
                    if (localData && !localData.error) {
                      console.log('✅ [tryCustomDomainFallback] تم العثور على البيانات من localStorage:', fallbackIdentifier);
                      return localData;
                    }
                  } catch (e) {
                    console.warn('⚠️ [tryCustomDomainFallback] فشل في البحث من localStorage:', fallbackIdentifier);
                  }
                }
              }
            }
          } catch (e) {
            // تجاهل أخطاء التحليل
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ [tryCustomDomainFallback] خطأ في البحث في localStorage:', e);
    }

    // محاولة 3: البحث عن أي منظمة نشطة كـ fallback نهائي
    try {
      console.log('🔍 [tryCustomDomainFallback] محاولة البحث عن أي منظمة نشطة كـ fallback');

      // هذا fallback نهائي - في الإنتاج قد نحتاج لتحسينه
      // لكن للآن سنعيد null لتجنب عرض بيانات خاطئة
      return null;
    } catch (e) {
      console.warn('⚠️ [tryCustomDomainFallback] فشل في fallback النهائي:', e);
    }

    console.log('❌ [tryCustomDomainFallback] فشلت جميع fallback strategies');
    return null;
  } catch (error) {
    console.error('🚨 [tryCustomDomainFallback] خطأ عام:', error);
    return null;
  }
};

/**
 * جلب البيانات من جميع المصادر بالترتيب
 */
export const fetchStoreData = async (
  organizationId: string | null,
  subdomain: string | null,
  options: UseSharedStoreDataOptions,
  forceStoreFetch: boolean = false
): Promise<CachedStoreData | null> => {
  const storeIdentifier = subdomain || organizationId;

  // النطاقات العامة - لا تحتاج store data
  if (storeIdentifier) {
    // فحص البيانات من window object
    const windowData = fetchFromWindowObject(organizationId, subdomain, options);
    if (windowData) return windowData;

    // فحص البيانات من localStorage
    const localStorageData = fetchFromLocalStorage(storeIdentifier, options);
    if (localStorageData) return localStorageData;

    // فحص البيانات من preloadService
    const preloadData = fetchFromPreloadService(storeIdentifier, options);
    if (preloadData) return preloadData;

    // فحص البيانات من early preload
    const earlyPreloadData = fetchFromEarlyPreload(storeIdentifier, options);
    if (earlyPreloadData) return earlyPreloadData;

    // انتظار البيانات من early preload
    const awaitedEarlyData = await waitForEarlyPreload(storeIdentifier, 150, options);
    if (awaitedEarlyData) return awaitedEarlyData;
  }

  // إذا لم نجد البيانات أو كان forceStoreFetch مفعل، نستخدم API
  if (storeIdentifier) {
    return await fetchFromAPI(storeIdentifier, options);
  }

  return null;
};
