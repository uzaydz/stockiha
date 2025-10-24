import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase-unified';
import { getOrganizationByDomain } from '@/lib/api/subdomain';
import { getOrganizationSettings } from '@/lib/api/settings';
import { useMemo, useCallback, useRef, useEffect } from 'react';

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

// دوال Cache محسنة مع deduplication أقوى
const getCachedData = (key: string) => {
  const cached = globalStoreDataCache[key];
  const timestamp = globalCacheTimestamp[key];
  
  if (cached && timestamp && (Date.now() - timestamp) < 5 * 60 * 1000) { // 5 دقائق
    return cached;
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

// دالة محسنة لمنع التكرار
const getOrCreateRequest = (cacheKey: string, requestFn: () => Promise<any>): Promise<any> => {
  // 🔥 تحسين: فحص cache أولاً
  if (globalStoreDataCache[cacheKey]) {
    const cacheAge = Date.now() - globalCacheTimestamp[cacheKey];
    if (cacheAge < 5 * 60 * 1000) { // 5 دقائق
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ useSharedStoreData: استخدام البيانات من cache', { cacheKey, cacheAge });
      }
      return Promise.resolve(globalStoreDataCache[cacheKey]);
    }
  }

  // 🔥 تحسين: deduplication أقوى
  if (requestDeduplication.has(cacheKey)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 useSharedStoreData: استخدام طلب موجود', { cacheKey });
    }
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
    // تم حذف console.log
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
}

// Hook مشترك لجلب بيانات المتجر مرة واحدة مع تحسينات الأداء
export const useSharedStoreData = (options: UseSharedStoreDataOptions = {}): SharedStoreDataReturn => {
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
    enabled = true
  } = options;

  // 🔥 إصلاح: استخدام useTenant بطريقة آمنة مع معالجة الأخطاء
  let currentOrganization = null;
  let organizationId: string | null = null;

  try {
    const tenantData = useTenant();
    currentOrganization = tenantData?.currentOrganization;
    organizationId = currentOrganization?.id;
  } catch (error) {
    // في حالة عدم وجود TenantProvider، نحاول الحصول على organizationId من localStorage
    if (error instanceof Error && error.message.includes('useTenant must be used within a TenantProvider')) {
      organizationId = localStorage.getItem('bazaar_organization_id');
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ useSharedStoreData: TenantProvider غير متاح، استخدام organizationId من localStorage:', organizationId);
      }
    } else {
      throw error;
    }
  }

  const queryClient = useQueryClient();
  
  // 🔥 تحسين: استخدام useRef لمنع إعادة الإنشاء المتكرر
  const lastOrganizationId = useRef<string | null>(null);
  const lastSubdomain = useRef<string | null>(null);
  const renderCount = useRef(0);
  const isRenderLimitReached = useRef(false);
  
  // 🔥 تحسين: منع الرندر المفرط بطريقة آمنة مع React hooks
  if (renderCount.current > 5 && !isRenderLimitReached.current) {
    console.warn('⚠️ useSharedStoreData: تم تجاوز حد الرندر، إيقاف العمليات');
    isRenderLimitReached.current = true;
  }
  
  // 🔥 إصلاح: استخدام useCallback لمنع إعادة الإنشاء المتكرر
  const resolveSubdomain = useCallback((): string | null => {
    try {
      const hostname = window.location.hostname.split(':')[0];
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
      const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
      const isCustomDomain = !isLocalhost && !isBaseDomain;
      
      // 🔥 إصلاح: تقليل console.log لتجنب التكرار
      if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
        console.log('🔍 useSharedStoreData: تحليل النطاق', { hostname, isLocalhost, isBaseDomain, isCustomDomain });
      }
      
      // 🔥 إصلاح: للنطاقات المخصصة، نستخدم النطاق الكامل مباشرة
      if (isCustomDomain) {
        if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
          console.log('🔍 useSharedStoreData: نطاق مخصص - استخدام النطاق الكامل', { hostname });
        }
        return hostname;
      }
      
      // للنطاقات الأساسية، نستخرج subdomain
      if (isBaseDomain) {
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] && parts[0] !== 'www') {
          const subdomain = parts[0];
          if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
            console.log('🔍 useSharedStoreData: subdomain من hostname', { subdomain, hostname });
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
              console.log('🔍 useSharedStoreData: نطاق محلي مع subdomain', { subdomain, hostname });
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
            console.log('🔍 useSharedStoreData: استخدام النطاق المخزن كـ fallback', { stored });
          }
          return stored;
        }
      } catch {}
      
    } catch (error) {
      console.warn('⚠️ useSharedStoreData: خطأ في resolveSubdomain', error);
    }
    
    return null;
  }, []); // 🔥 إصلاح: dependencies فارغة لمنع إعادة الإنشاء

  const subdomain = resolveSubdomain();
  
  // 🔥 تحسين: منع إعادة التحميل إذا لم تتغير البيانات
  const shouldRefetch = useMemo(() => {
    return (
      lastOrganizationId.current !== organizationId ||
      lastSubdomain.current !== subdomain
    );
  }, [organizationId, subdomain]);
  
  // تحديث القيم المرجعية
  useEffect(() => {
    lastOrganizationId.current = organizationId;
    lastSubdomain.current = subdomain;
  }, [organizationId, subdomain]);

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

  // ⚡ تحسين: تقليل console.log في production
  if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
    console.log('🔍 useSharedStoreData: subdomain النهائي', {
      subdomain,
      organizationId,
      enabled: shouldEnable && enabled
    });
  }

  const {
    data: storeData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['shared-store-data', organizationId, subdomain],
    queryFn: async () => {
      const startTime = performance.now();

      // 🔥 تحسين: منع إعادة التحميل إذا لم تتغير البيانات
      if (!shouldRefetch) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⏭️ useSharedStoreData: تخطي إعادة التحميل - نفس البيانات');
        }
        return null;
      }

      // 🔥 تحسين: منع الطلبات إذا تم تجاوز حد الرندر
      if (isRenderLimitReached.current) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⏭️ useSharedStoreData: تخطي الطلب - تم تجاوز حد الرندر');
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
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ useSharedStoreData: استخدام البيانات من cache الحديث', { cacheKey, cacheAge: `${(cacheAge / 1000).toFixed(1)}s` });
          }
          return cachedData;
        }
      }

      // استنتاج السابدومين من التخزين المحلي أو من hostname
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
      const isCustomDomain = !isLocalhost && !isBaseDomain;

      if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
        console.log('🔍 useSharedStoreData: معلومات النطاق', {
          hostname,
          isLocalhost,
          isBaseDomain,
          isCustomDomain
        });
      }

      // أولوية: إذا كنا على نطاق متجر (سابدومين أو نطاق مخصص)، استخدم RPC الموحد لاستدعاء واحد فقط
      let storeIdentifier = subdomain;

      // للنطاقات المخصصة، نحاول استخراج subdomain أولاً
      if (!storeIdentifier && isCustomDomain) {
        const domainParts = hostname.split('.');
        if (domainParts.length > 2 && domainParts[0] && domainParts[0] !== 'www') {
          const possibleSubdomain = domainParts[0].toLowerCase().trim();
          if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
            console.log('🔍 useSharedStoreData: محاولة استخراج subdomain من النطاق المخصص:', possibleSubdomain);
          }
          storeIdentifier = possibleSubdomain;
        } else {
          // إذا لم نتمكن من استخراج subdomain، استخدم النطاق كاملاً
          storeIdentifier = hostname;
        }
      }

      if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
        console.log('🔍 useSharedStoreData: معرف المتجر', { storeIdentifier });
      }

      if (storeIdentifier) {
        // ⚡ تحسين: استخدام cache محسن
        if (cachedData && cacheStrategy === 'aggressive') {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ useSharedStoreData: استخدام البيانات من cache', { cacheKey });
          }
          return cachedData;
        }

        if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
          console.log('🔄 useSharedStoreData: جلب بيانات جديدة', { storeIdentifier });
        }

        // ⚡ تحسين: استخدام نظام cache محسن
        return getOrCreateRequest(cacheKey, async () => {
          try {
            // استخدام الـ API الموحد لمنع التكرار
            const { getStoreInitData } = await import('@/lib/api/deduplicatedApi');
            const data = await getStoreInitData(storeIdentifier);

            if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
              console.log('✅ useSharedStoreData: تم جلب البيانات بنجاح', { data });
            }

            const orgDetails = data?.organization_details || null;
            const orgSettings = data?.organization_settings || null;
            const categories = includeCategories ? (data?.categories || []) : [];
            const featuredProducts = includeFeaturedProducts ? (data?.featured_products || []) : [];
            const products: any[] = includeProducts ? featuredProducts : [];
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
            if (process.env.NODE_ENV === 'development') {
              console.error('❌ useSharedStoreData: خطأ في جلب البيانات', error);
            }
            throw error;
          }
        });
      } else {
        if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
          console.log('❌ useSharedStoreData: لا يوجد معرف متجر صالح');
        }
        return null;
      }
    },
    // ⚡ تحسين: إعدادات cache محسنة
    staleTime: 5 * 60 * 1000, // 5 دقائق
    gcTime: 10 * 60 * 1000, // 10 دقائق
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: shouldEnable && enabled
  });
  
  // 🔥 إصلاح: تقليل console.log لتجنب التكرار
  if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
    console.log('🔄 useSharedStoreData: حالة useQuery', {
      hasData: !!storeData,
      isLoading,
      error: error?.message,
      enabled: shouldEnable && enabled
    });
  }

  // تتبع حالة التحميل
  const endTime = performance.now();
  
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
          const cacheKey = `store-data-unified-${hostname}`;
          delete globalStoreDataCache[cacheKey];
          delete globalCacheTimestamp[cacheKey];
        }
      }
      
      // إجبار إعادة التحميل مع الحفاظ على البيانات القديمة أثناء التحميل
      await queryClient.refetchQueries({ 
        queryKey: ['shared-store-data', organizationId, subdomain],
        type: 'active'
      });
      
    } catch (error) {
      // تم حذف console.log
    }
  }, [organizationId, subdomain, queryClient]);

  // إرجاع البيانات بشكل منظم (محسن مع memoization)
  return useMemo(() => {
    const data = storeData as any; // تحويل النوع بشكل آمن
    
    // 🔥 إصلاح مهم: ضمان إرجاع نفس البنية دائماً
    const result: SharedStoreDataReturn = {
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
      refreshData: refreshData || (() => Promise.resolve())
    };
    
    // 🔥 إصلاح: تقليل console.log لتجنب التكرار
    if (process.env.NODE_ENV === 'development' && renderCount.current === 0) {
      console.log('🔄 useSharedStoreData: تحديث البيانات', {
        hasData: !!data,
        organization: result.organization ? { id: result.organization.id, name: result.organization.name } : null,
        organizationSettings: result.organizationSettings ? { id: result.organizationSettings.id, site_name: result.organizationSettings.site_name } : null,
        productsCount: result.products.length,
        categoriesCount: result.categories.length,
        featuredProductsCount: result.featuredProducts.length,
        componentsCount: result.components.length,
        isLoading: result.isLoading,
        error: result.error
      });
    }
    
    // 🔥 إصلاح: زيادة عداد الرندر
    renderCount.current++;
    
    return result;
  }, [
    storeData,
    isLoading,
    error?.message,
    refreshData
  ]);
};
