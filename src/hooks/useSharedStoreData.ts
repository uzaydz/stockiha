import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrganizationByDomain } from '@/lib/api/subdomain';
import { getOrganizationSettings } from '@/lib/api/settings';
import { getStoreInitData } from '@/lib/api/deduplicatedApi';
import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { hasPreloadedStoreData, getPreloadedStoreData } from '@/services/preloadService';
import { updateLanguageFromSettings } from '@/lib/language/languageManager';
import { getEarlyPreloadedData } from '@/utils/earlyPreload';

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

// نوع البيانات المرجعة من الـ hook
interface SharedStoreDataReturn {
  organization: any | null;
  organizationSettings: any | null;
  products: any[];
  categories: any[];
  featuredProducts: any[];
  components: any[];
  footerSettings: any | null;
  testimonials: any[];
  seoMeta: any | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

// Cache عام محسن لمنع الاستدعاءات المكررة
let globalStoreDataCache: { [key: string]: any } = {};
let globalCacheTimestamp: { [key: string]: number } = {};
let activeRequests: { [key: string]: Promise<any> } = {};

// 🔥 تحسين: إضافة deduplication أقوى
const requestDeduplication = new Map<string, Promise<any>>();

// دوال Cache محسنة مع deduplication أقوى ودعم النطاقات مع www
const getCachedData = (key: string) => {
  // البحث المباشر أولاً
  let cached = globalStoreDataCache[key];
  let timestamp = globalCacheTimestamp[key];
  
  if (cached && timestamp && (Date.now() - timestamp) < 5 * 60 * 1000) { // 5 دقائق
    return cached;
  }

  // 🔥 جديد: إذا لم نجد البيانات، جرب مفاتيح بديلة للنطاقات مع www
  if (key.includes('store-data-unified-')) {
    const storeIdentifier = key.replace('store-data-unified-', '');
    
    // جرب مع www. أو بدونها
    const alternativeIdentifier = storeIdentifier.startsWith('www.') 
      ? storeIdentifier.substring(4) 
      : `www.${storeIdentifier}`;
    
    const alternativeKey = `store-data-unified-${alternativeIdentifier}`;
    
    cached = globalStoreDataCache[alternativeKey];
    timestamp = globalCacheTimestamp[alternativeKey];
    
    if (cached && timestamp && (Date.now() - timestamp) < 5 * 60 * 1000) {
      
      return cached;
    }
  }
  
  return null;
};

const setCachedData = (key: string, data: any, ttl: number = 10 * 60 * 1000) => {
  globalStoreDataCache[key] = data;
  globalCacheTimestamp[key] = Date.now();
  
  // تنظيف cache قديم تلقائياً
  setTimeout(() => {
    if (globalCacheTimestamp[key] && (Date.now() - globalCacheTimestamp[key]) > ttl) {
      delete globalStoreDataCache[key];
      delete globalCacheTimestamp[key];
    }
  }, ttl);
};

// دالة محسنة لمنع التكرار مع تسجيل أفضل
const getOrCreateRequest = (cacheKey: string, requestFn: () => Promise<any>): Promise<any> => {
  // 🔥 تحسين: فحص cache أولاً
  if (globalStoreDataCache[cacheKey]) {
    const cacheAge = Date.now() - globalCacheTimestamp[cacheKey];
    if (cacheAge < 5 * 60 * 1000) { // 5 دقائق
      
      return Promise.resolve(globalStoreDataCache[cacheKey]);
    }
  }

  // 🔥 تحسين: deduplication أقوى
  if (requestDeduplication.has(cacheKey)) {
    
    return requestDeduplication.get(cacheKey)!;
  }

  
  
  // إنشاء طلب جديد
  const request = requestFn().then(result => {
    // حفظ النتيجة في cache
    globalStoreDataCache[cacheKey] = result;
    globalCacheTimestamp[cacheKey] = Date.now();
    
    
    
    // إزالة من deduplication
    requestDeduplication.delete(cacheKey);
    
    return result;
  }).catch(error => {
    // إزالة من deduplication في حالة الخطأ
    requestDeduplication.delete(cacheKey);
    throw error;
  });

  // حفظ الطلب في deduplication
  requestDeduplication.set(cacheKey, request);
  
  return request;
};

// Preloader للصور (محسّن لتقليل استهلاك البيانات)
import { getCdnImageUrl } from '@/lib/image-cdn';

// Cache للصور المحملة مسبقاً لمنع التكرار
const preloadedImages = new Set<string>();

const preloadImages = (products: any[], categories: any[]) => {
  try {
    // احترام Data Saver والاتصالات البطيئة
    const nav: any = navigator as any;
    const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
    if (conn?.saveData) return;
    const type = (conn?.effectiveType || '').toString();
    if (type.includes('2g') || type.includes('slow-2g')) return;
  } catch {}

  const imageUrls = new Set<string>();

  // جمع URLs الصور
  products.forEach(product => {
    if (product.thumbnail_image && !preloadedImages.has(product.thumbnail_image)) {
      imageUrls.add(product.thumbnail_image);
    }
    const imgs = Array.isArray(product.images) ? product.images : [];
    imgs.forEach((img: any) => {
      const url = typeof img === 'string' ? img : img?.url;
      if (url && !preloadedImages.has(url)) {
        imageUrls.add(url);
      }
    });
  });

  categories.forEach(category => {
    if (category.image_url && !preloadedImages.has(category.image_url)) {
      imageUrls.add(category.image_url);
    }
  });

  const limited = Array.from(imageUrls).slice(0, 3); // تقليل العدد أكثر لتجنب الحمل الزائد

  const preloadPromises = limited.map(url => {
    return new Promise(resolve => {
      try {
        const img = new Image();
        img.loading = 'lazy';
        img.src = getCdnImageUrl(url, { width: 300, quality: 60, fit: 'cover', format: 'auto' });
        img.onload = () => {
          preloadedImages.add(url);
          resolve(url);
        };
        img.onerror = () => {
          preloadedImages.add(url); // إضافة حتى لو فشل التحميل لمنع المحاولة مرة أخرى
          resolve(url);
        };
      } catch {
        preloadedImages.add(url);
        resolve(url);
      }
    });
  });

  Promise.allSettled(preloadPromises).then(() => {
    // silent
  });
};

// خيارات Hook البيانات المشتركة - محسنة
interface UseSharedStoreDataOptions {
  includeCategories?: boolean;
  includeProducts?: boolean;
  includeFeaturedProducts?: boolean;
  includeComponents?: boolean;
  includeFooterSettings?: boolean;
  includeTestimonials?: boolean;
  includeSeoMeta?: boolean;
  enableOptimisticUpdates?: boolean;
  cacheStrategy?: 'aggressive' | 'conservative';
  enabled?: boolean;
  // إجبار الجلب حتى على النطاقات العامة (يناسب صفحات المتجر العامة)
  forceStoreFetch?: boolean;
}

// Hook مشترك لجلب بيانات المتجر مرة واحدة مع تحسينات الأداء
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

  console.log('🔗 [SHARED-DATA] تهيئة hook البيانات المشتركة', {
    options: {
      includeCategories,
      includeProducts,
      includeFeaturedProducts,
      cacheStrategy,
      enabled,
      forceStoreFetch
    },
    startTime: hookStartTime.current
  });

  // Lightweight organization resolution (avoids importing heavy TenantContext)
  let currentOrganization: any = null;
  let organizationId: string | null = null;
  try {
    const early = (window as any).__EARLY_STORE_DATA__;
    const earlyOrg = early?.data?.organization_details || early?.organization;
    if (earlyOrg?.id) {
      currentOrganization = earlyOrg;
      organizationId = String(earlyOrg.id);
    } else {
      organizationId = localStorage.getItem('bazaar_organization_id');
    }
  } catch {
    organizationId = localStorage.getItem('bazaar_organization_id');
  }

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
  
  // 🔥 إصلاح: استخدام useCallback مع useRef لمنع إعادة الإنشاء المتكرر
  const resolveSubdomainRef = useRef<(() => string | null) | null>(null);
  
  if (!resolveSubdomainRef.current) {
    resolveSubdomainRef.current = (): string | null => {
    try {
      const hostname = window.location.hostname.split(':')[0];
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const publicDomains = ['stockiha.pages.dev', 'ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com'];
      
      // 🔥 فحص النطاقات العامة أولاً - لا تحتاج subdomain
      if (publicDomains.includes(hostname)) {
        return null; // لا يوجد subdomain للنطاقات العامة
      }
      
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
      const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
      const isCustomDomain = !isLocalhost && !isBaseDomain;

      // للنطاقات المخصصة، نتحقق من localStorage
      if (isCustomDomain) {
        if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
          console.log('تم الكشف عن نطاق مخصص:', hostname);
        }
        return null;
      }
      
      // للنطاقات الأساسية، نستخرج subdomain
      if (isBaseDomain) {
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] && parts[0] !== 'www') {
          const subdomain = parts[0];
          if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
          }
          return subdomain;
        }
      }
      
      // للنطاقات المحلية
      if (isLocalhost) {
        if (hostname.includes('localhost')) {
          const subdomain = hostname.split('.')[0];
          if (subdomain && subdomain !== 'localhost') {
            if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
            }
            return subdomain;
          }
        }
        return null;
      }
      
      // 🔥 fallback: استخدام النطاق المخزن في localStorage فقط إذا لم نتمكن من تحديد النطاق الحالي
      try {
        const stored = localStorage.getItem('bazaar_current_subdomain');
        if (stored && stored !== 'main' && stored !== 'www') {
          if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
          }
          return stored;
        }
      } catch {}

      return null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('خطأ في تحليل subdomain:', error);
      }
      return null;
    }
    
    return null;
    };
  }
  
  const resolveSubdomain = resolveSubdomainRef.current;
  const subdomain = resolveSubdomain();
  
  // 🔥 إصلاح: منطق shouldRefetch محسن مع كسر الحلقات المفرغة
  const shouldRefetch = useMemo(() => {
    // إذا وصلنا لحد الرندر، توقف نهائياً
    if (isRenderLimitReached.current) {
      console.log('🛑 [useSharedStoreData] تم إيقاف shouldRefetch بسبب حد الرندر');
      return false;
    }
    
    const currentOrgId = organizationId || '';
    const currentSubdomain = subdomain || '';
    
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
    
    return isFirstLoad;
  }, [organizationId, subdomain]); // dependencies ثابتة
  
  // إزالة useEffect المكرر - تم تحديث القيم في shouldRefetch

  // 🔥 تحسين: إعادة تعيين عداد الرندر عند تغيير المؤسسة
  useEffect(() => {
    if (organizationId !== lastOrganizationId.current) {
      renderCount.current = 0;
      isRenderLimitReached.current = false;
    }
  }, [organizationId]);

  // 🔥 إصلاح: تحسين منطق enabled لمنع التكرار
  const shouldEnable = useMemo(() => {
    const hasValidIdentifier = !!organizationId || !!subdomain;
    const hasChanged = lastOrganizationId.current !== organizationId || lastSubdomain.current !== subdomain;

    // إذا تغير المعرف أو لدينا معرف صالح، فعل
    if (hasChanged || hasValidIdentifier) {
      return hasValidIdentifier;
    }

    // إذا لم يتغير المعرف، ابقِ على الحالة السابقة
    return lastEnabled.current;
  }, [organizationId, subdomain]);

  // حفظ القيمة السابقة للمقارنة
  const lastEnabled = useRef(false);
  useEffect(() => {
    lastEnabled.current = shouldEnable;
  }, [shouldEnable]);

  // إنشاء نظام التسجيل العام
  const __useSharedStoreDataLogs__ = (() => {
    (window as any).__useSharedStoreDataLogs__ = (window as any).__useSharedStoreDataLogs__ || { preload: new Set<string>(), early: new Set<string>() };
    return (window as any).__useSharedStoreDataLogs__;
  })();

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
    const storeIdentifier = subdomain || organizationId;
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
  }, [subdomain, organizationId]);

  // 🔥 إصلاح: استخدام مفتاح مستقر لمنع re-queries متكررة
  const stableQueryKey = useMemo(() => {
    const key = [
      'shared-store-data-v2', 
      organizationId || 'no-org', 
      subdomain || 'no-subdomain'
    ];
    // فقط أضف shouldRefetch إذا كان true لتجنب تكرار غير ضروري
    if (shouldRefetch && initialDataReady) {
      key.push('refetch', Date.now().toString().slice(-6)); // آخر 6 أرقام للطابع الزمني
    }
    return key;
  }, [organizationId, subdomain, shouldRefetch, initialDataReady]);

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
      let storeIdentifier = subdomain || organizationId;
      
      // أولاً: تجربة جلب البيانات من مصادر مختلفة
      if (storeIdentifier) {
        // فحص البيانات من window.__EARLY_STORE_DATA__ أولاً
        const windowData = (window as any).__EARLY_STORE_DATA__;
        if (windowData && windowData.data) {
          const windowDataTime = performance.now();
          console.log('🎯 [SHARED-DATA] وجدت البيانات في window object', {
            timing: windowDataTime - startTime,
            dataSize: JSON.stringify(windowData.data).length,
            hasOrganization: !!windowData.data.organization_details,
            hasSettings: !!windowData.data.organization_settings
          });
          const data = windowData.data;
          
          const result = {
            organization: currentOrganization || data.organization_details || null,
            organizationSettings: data.organization_settings || null,
            categories: includeCategories ? (data.categories || []) : [],
            products: includeProducts ? (data.featured_products || []) : [],
            featuredProducts: includeFeaturedProducts ? (data.featured_products || []) : [],
            components: includeComponents ? (data.store_layout_components || []) : [],
            footerSettings: includeFooterSettings ? (data.footer_settings || null) : null,
            testimonials: includeTestimonials ? (data.testimonials || []) : [],
            seoMeta: includeSeoMeta ? (data.seo_meta || null) : null,
            cacheTimestamp: new Date().toISOString()
          };
          
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('🎯 [useSharedStoreData] سأعيد البيانات التالية:', {
              hasOrganization: !!result.organization,
              hasOrganizationSettings: !!result.organizationSettings,
              organizationName: result.organization?.name,
              settingsLang: result.organizationSettings?.default_language
            });
          }
          
          return result;
        }
        
        // 🚨 آخر محاولة: استخدام window object حتى لو لم تكن initialDataReady
        const lastChanceWindowData = (window as any).__EARLY_STORE_DATA__;
        if (lastChanceWindowData?.data) {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('🚨 [useSharedStoreData] استخدام window object كآخر محاولة');
          }
          const data = lastChanceWindowData.data;
          return {
            organization: currentOrganization || data.organization_details || null,
            organizationSettings: data.organization_settings || null,
            categories: includeCategories ? (data.categories || []) : [],
            products: includeProducts ? (data.featured_products || []) : [],
            featuredProducts: includeFeaturedProducts ? (data.featured_products || []) : [],
            components: includeComponents ? (data.store_layout_components || []) : [],
            footerSettings: includeFooterSettings ? (data.footer_settings || null) : null,
            testimonials: includeTestimonials ? (data.testimonials || []) : [],
            seoMeta: includeSeoMeta ? (data.seo_meta || null) : null,
            cacheTimestamp: new Date().toISOString()
          };
        }
      }

      // 🔥 إصلاح: تقليل انتظار البيانات وتحميل أسرع
      if (!initialDataReady) {
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log('⏳ [useSharedStoreData] انتظار قصير للبيانات الأولية...');
        }
        
        // 🚀 تقليل timeout لتسريع التحميل
        setTimeout(() => {
          if (!initialDataReady) {
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
              console.log('🚨 [useSharedStoreData] timeout سريع - إجبار تحميل البيانات');
            }
            setInitialDataReady(true);
          }
        }, 1500); // تقليل من 5 ثوان إلى 1.5 ثانية
        
        // 🔥 إضافة: إذا كان هناك بيانات جزئية، استخدمها فوراً
        const hasPartialData = !!(organizationId || subdomain);
        if (hasPartialData) {
          console.log('⚡ [useSharedStoreData] وجدت بيانات جزئية - تفعيل فوري');
          setTimeout(() => setInitialDataReady(true), 200); // تفعيل سريع جداً
        }
        
        return null;
      }

      // 🔥 تحسين: منع إعادة التحميل إذا لم تتغير البيانات
      if (!shouldRefetch) {
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log('🎯 [useSharedStoreData] منع إعادة التحميل - البيانات لم تتغير');
        }
        return null;
      }

      // 🔥 تحسين: فحص البيانات المحملة مسبقاً أولاً لمنع الطلبات المتكررة
      // استخدام نفس storeIdentifier المعرف أعلاه
      if (storeIdentifier) {
        // 🚀 فحص البيانات من localStorage مباشرة
        try {
          const earlyPreloadKey = `early_preload_${storeIdentifier}`;
          const storedData = localStorage.getItem(earlyPreloadKey);
          if (storedData) {
            const parsed = JSON.parse(storedData);
            const data = parsed.data;
            if (data) {
              if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
                console.log('🎯 [useSharedStoreData] استخدام البيانات من localStorage مباشرة');
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
                categories: includeCategories ? (data.categories || []) : [],
                products: includeProducts ? (data.featured_products || []) : [],
                featuredProducts: includeFeaturedProducts ? (data.featured_products || []) : [],
                components: includeComponents ? (data.store_layout_components || []) : [],
                footerSettings: includeFooterSettings ? (data.footer_settings || null) : null,
                testimonials: includeTestimonials ? (data.testimonials || []) : [],
                seoMeta: includeSeoMeta ? (data.seo_meta || null) : null,
                cacheTimestamp: new Date().toISOString()
              };
            }
          }
        } catch (e) {
          console.warn('⚠️ خطأ في قراءة البيانات من localStorage:', e);
        }

        // التحقق من preloadService أولاً
        if (hasPreloadedStoreData(storeIdentifier)) {
          const preloadedData = getPreloadedStoreData(storeIdentifier);
          if (preloadedData) {
            if (!__useSharedStoreDataLogs__.preload.has(storeIdentifier)) {
              if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
                console.log('🎯 [useSharedStoreData] استخدام البيانات من preloadService');
              }
              __useSharedStoreDataLogs__.preload.add(storeIdentifier);
            }
            return {
              organization: currentOrganization || preloadedData.organization_details || null,
              organizationSettings: preloadedData.organization_settings || null,
              categories: includeCategories ? (preloadedData.categories || []) : [],
              products: includeProducts ? (preloadedData.featured_products || []) : [],
              featuredProducts: includeFeaturedProducts ? (preloadedData.featured_products || []) : [],
              components: includeComponents ? (preloadedData.store_layout_components || []) : [],
              footerSettings: includeFooterSettings ? (preloadedData.footer_settings || null) : null,
              testimonials: includeTestimonials ? (preloadedData.testimonials || []) : [],
              seoMeta: includeSeoMeta ? (preloadedData.seo_meta || null) : null,
              cacheTimestamp: new Date().toISOString()
            };
          }
        }

        // التحقق من earlyPreload كـ fallback
        const earlyData = getEarlyPreloadedData(storeIdentifier);
        if (earlyData) {
          if (!__useSharedStoreDataLogs__.early.has(storeIdentifier)) {
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
              console.log('🎯 [useSharedStoreData] استخدام البيانات من earlyPreload');
            }
            __useSharedStoreDataLogs__.early.add(storeIdentifier);
          }
          return {
            organization: currentOrganization || earlyData.organization_details || null,
            organizationSettings: earlyData.organization_settings || null,
            categories: includeCategories ? (earlyData.categories || []) : [],
            products: includeProducts ? (earlyData.featured_products || []) : [],
            featuredProducts: includeFeaturedProducts ? (earlyData.featured_products || []) : [],
            components: includeComponents ? (earlyData.store_layout_components || []) : [],
            footerSettings: includeFooterSettings ? (earlyData.footer_settings || null) : null,
            testimonials: includeTestimonials ? (earlyData.testimonials || []) : [],
            seoMeta: includeSeoMeta ? (earlyData.seo_meta || null) : null,
            cacheTimestamp: new Date().toISOString()
          };
        }

        // 🕒 انتظار قصير في حال كان earlyPreload قيد التنفيذ لتجنب طلب RPC إضافي
        const waitForEarlyPreload = async (timeoutMs = 700) => {
          try {
            const existing = getEarlyPreloadedData(storeIdentifier);
            if (existing) return existing;
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
            return result;
          } catch {
            return null;
          }
        };
        const awaitedEarly = await waitForEarlyPreload(150);
        if (awaitedEarly) {
          return {
            organization: currentOrganization || awaitedEarly.organization_details || null,
            organizationSettings: awaitedEarly.organization_settings || null,
            categories: includeCategories ? (awaitedEarly.categories || []) : [],
            products: includeProducts ? (awaitedEarly.featured_products || []) : [],
            featuredProducts: includeFeaturedProducts ? (awaitedEarly.featured_products || []) : [],
            components: includeComponents ? (awaitedEarly.store_layout_components || []) : [],
            footerSettings: includeFooterSettings ? (awaitedEarly.footer_settings || null) : null,
            testimonials: includeTestimonials ? (awaitedEarly.testimonials || []) : [],
            seoMeta: includeSeoMeta ? (awaitedEarly.seo_meta || null) : null,
            cacheTimestamp: new Date().toISOString()
          };
        }
      }

      // 🔥 تحسين: منع الطلبات إذا تم تجاوز حد الرندر
      if (isRenderLimitReached.current) {
        if (process.env.NODE_ENV === 'development') {
        }
        return null;
      }

      // ⚡ تحسين: استخدام cache محسن
      const cacheKey = `store-data-unified-${subdomain || organizationId}`;
      const cachedData = getCachedData(cacheKey);

      // 🔥 تحسين: استخدام cache إذا كان حديثاً (أقل من 5 دقائق)
      if (cachedData && cacheStrategy === 'aggressive') {
        const cacheAge = Date.now() - new Date(cachedData.cacheTimestamp).getTime();
        if (cacheAge < 5 * 60 * 1000) { // 5 دقائق
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('🎯 [useSharedStoreData] استخدام cache محسن');
          }
          return cachedData;
        }
      }

      // استنتاج السابدومين من التخزين المحلي أو من hostname
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const publicDomains = ['stockiha.pages.dev', 'ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com'];
      const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
      const isPublicDomain = publicDomains.includes(hostname);
      const isCustomDomain = !isLocalhost && !isBaseDomain && !isPublicDomain;

      if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
      }

      // أولوية: إذا كنا على نطاق متجر (سابدومين أو نطاق مخصص)، استخدم RPC الموحد لاستدعاء واحد فقط
      let finalStoreIdentifier = subdomain;

      // التحقق من النطاقات العامة - لا نحتاج store data
      if (isPublicDomain && !forceStoreFetch) {
        if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
          
        }
        return {
          storeData: { organization_details: null, organization_settings: null },
          categories: [],
          featuredProducts: [],
          isLoading: false,
          error: null
        };
      }

      // للنطاقات المخصصة، نحاول استخراج subdomain أولاً
      if (!finalStoreIdentifier && isCustomDomain) {
        const domainParts = hostname.split('.');
        if (domainParts.length > 2 && domainParts[0] && domainParts[0] !== 'www') {
          const possibleSubdomain = domainParts[0].toLowerCase().trim();
          if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
          }
          finalStoreIdentifier = possibleSubdomain;
        } else {
          // إذا لم نتمكن من استخراج subdomain، استخدم النطاق بدون www
          let cleanHostname = hostname;
          if (cleanHostname.startsWith('www.')) {
            cleanHostname = cleanHostname.substring(4);
          }
          finalStoreIdentifier = cleanHostname;
        }
      }

      if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
      }

      if (finalStoreIdentifier) {
        // ⚡ تحسين: استخدام cache محسن
        if (cachedData && cacheStrategy === 'aggressive') {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('🎯 [useSharedStoreData] استخدام cache محسن');
          }
          return cachedData;
        }

        if (process.env.NODE_ENV === 'development' && renderCount.current === 0 && Math.random() < 0.1) {
          console.log('🎯 [useSharedStoreData] استخدام cache محسن');
        }

        // ⚡ تحسين: استخدام نظام cache محسن
        return getOrCreateRequest(cacheKey, async () => {
          try {
            // استخدام الـ API الموحد لمنع التكرار
            const data = await getStoreInitData(finalStoreIdentifier);

            if (process.env.NODE_ENV === 'development' && renderCount.current === 0 && Math.random() < 0.1) {
              console.log('🎯 [useSharedStoreData] استخدام API الموحد');
            }

            const orgDetails = data?.organization_details || null;
            const orgSettings = data?.organization_settings || null;
            const categories = includeCategories ? (data?.categories || []) : [];
            const featuredProducts = includeFeaturedProducts ? (data?.featured_products || []) : [];
            const products: any[] = includeProducts 
              ? (data?.products_first_page || data?.products || featuredProducts || []) 
              : [];
            const components = includeComponents ? (data?.store_layout_components || []) : [];
            const footerSettings = includeFooterSettings ? (data?.footer_settings || null) : null;
            const testimonials = includeTestimonials ? (data?.testimonials || []) : [];
            const seoMeta = includeSeoMeta ? (data?.seo_meta || null) : null;

            const result = {
              organization: currentOrganization || orgDetails,
              organizationSettings: orgSettings,
              categories,
              products,
              featuredProducts,
              components,
              footerSettings,
              testimonials,
              seoMeta,
              cacheTimestamp: new Date().toISOString()
            };

            // ⚡ تحسين: حفظ في cache مع timestamp
            setCachedData(cacheKey, result, 10 * 60 * 1000); // 10 دقائق

            return result;
          } catch (error) {
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
              console.log('🚨 [useSharedStoreData] خطأ في API الموحد:', error);
            }
            throw error;
          }
        });
      } else {
        if (process.env.NODE_ENV === 'development' && renderCount.current === 0 && Math.random() < 0.1) {
          console.log('🎯 [useSharedStoreData] لا يوجد storeIdentifier');
        }
        return null;
      }
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

  // تطبيق اللغة فور توفرها من RPC/البيانات الموحدة
  const currentLanguage = useMemo(() => {
    return (storeData as any)?.organizationSettings?.default_language;
  }, [storeData?.organizationSettings?.default_language]);

  useEffect(() => {
    try {
      const lang = currentLanguage;
      if (lang && ['ar', 'en', 'fr'].includes(lang)) {
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log('🎯 [useSharedStoreData] تطبيق اللغة:', lang);
        }

        // حفظ سريع للوصول من مزودات أخرى إن لزم
        (window as any).__SHARED_STORE_ORG_SETTINGS__ = {
          ...(storeData as any)?.organizationSettings,
          default_language: lang
        };
        updateLanguageFromSettings(lang);
      }
      
      // 🚀 أيضاً تطبيق الألوان إذا كانت متوفرة
      const settings = (storeData as any)?.organizationSettings;
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        console.log('🎨 [useSharedStoreData] فحص الألوان:', {
          hasSettings: !!settings,
          settingsKeys: settings ? Object.keys(settings) : [],
          primaryColor: settings?.theme_primary_color,
          secondaryColor: settings?.theme_secondary_color,
          accentColor: settings?.accent_color,
          // إضافة معلومات إضافية للفهم
          rawSettings: settings
        });
      }
      
      if (settings) {
        const primaryColor = settings.theme_primary_color;
        const secondaryColor = settings.theme_secondary_color;
        const accentColor = settings.accent_color;
        
        if (primaryColor) {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('🎯 [useSharedStoreData] تطبيق اللون الأساسي:', primaryColor);
          }
          document.documentElement.style.setProperty('--primary-color', primaryColor);
          document.documentElement.style.setProperty('--primary', primaryColor);
          document.documentElement.style.setProperty('--color-primary', primaryColor);
          // إضافة متغيرات Tailwind
          document.documentElement.style.setProperty('--tw-color-primary', primaryColor);
        } else {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('⚠️ [useSharedStoreData] لا يوجد لون أساسي');
          }
        }
        
        if (secondaryColor) {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('🎯 [useSharedStoreData] تطبيق اللون الثانوي:', secondaryColor);
          }
          document.documentElement.style.setProperty('--secondary-color', secondaryColor);
          document.documentElement.style.setProperty('--secondary', secondaryColor);
        } else {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('⚠️ [useSharedStoreData] لا يوجد لون ثانوي');
          }
        }
        
        if (accentColor) {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('🎯 [useSharedStoreData] تطبيق لون التمييز:', accentColor);
          }
          document.documentElement.style.setProperty('--accent-color', accentColor);
          document.documentElement.style.setProperty('--accent', accentColor);
        } else {
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('⚠️ [useSharedStoreData] لا يوجد لون تمييز');
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log('⚠️ [useSharedStoreData] لا توجد إعدادات مؤسسة للألوان');
        }
      }
    } catch (e) {
      console.warn('⚠️ خطأ في تطبيق إعدادات المؤسسة:', e);
    }
  }, [currentLanguage, storeData?.organizationSettings?.theme_primary_color, storeData?.organizationSettings?.theme_secondary_color]);

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
      if (organizationId) {
        const cacheKey = `store-data-${organizationId}`;
        delete globalStoreDataCache[cacheKey];
        delete globalCacheTimestamp[cacheKey];
      }
      
      if (subdomain) {
        const cacheKey = `store-data-sd-${subdomain}`;
        delete globalStoreDataCache[cacheKey];
        delete globalCacheTimestamp[cacheKey];
      }
      
      // إزالة cache للبيانات الموحدة أيضاً
      if (subdomain || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
        const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
        const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
        const isCustomDomain = !isLocalhost && !isBaseDomain;
        
        if (isCustomDomain) {
          // 🔥 إصلاح: استخدام النطاق بدون www للـ cache key
          let cleanHostname = hostname;
          if (cleanHostname.startsWith('www.')) {
            cleanHostname = cleanHostname.substring(4);
          }
          const cacheKey = `store-data-unified-${cleanHostname}`;
          delete globalStoreDataCache[cacheKey];
          delete globalCacheTimestamp[cacheKey];
        }
      }
    } catch (error) {
      // معالجة الأخطاء في refreshData
      if (process.env.NODE_ENV === 'development') {
        console.error('خطأ في تحديث البيانات:', error);
      }
    }
  }, [organizationId, subdomain, queryClient]);

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
