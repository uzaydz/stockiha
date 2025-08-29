import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase-client';
import { getOrganizationByDomain } from '@/lib/api/subdomain';
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

// Cache عام محسن لمنع الاستدعاءات المكررة
let globalStoreDataCache: { [key: string]: any } = {};
let globalCacheTimestamp: { [key: string]: number } = {};
const CACHE_DURATION = 10 * 60 * 1000; // تحسين: 10 دقائق بدلاً من دقيقتين
// منع نداءات RPC المكررة لنفس السابدومين - محسن
const pendingRequests: Record<string, Promise<any>> = {};
const requestTimestamps: Record<string, number> = {};
const REQUEST_TIMEOUT = 30 * 1000; // 30 ثانية timeout للطلبات

// تحسين: إضافة cache للطلبات النشطة لمنع التكرار
const activeRequests = new Set<string>();
const requestResults = new Map<string, { data: any; timestamp: number }>();

// دوال Cache محسنة مع deduplication أقوى
const getCachedData = (key: string) => {
  const cached = globalStoreDataCache[key];
  const timestamp = globalCacheTimestamp[key];
  
  if (cached && timestamp && (Date.now() - timestamp) < CACHE_DURATION) {
    return cached;
  }
  return null;
};

const setCachedData = (key: string, data: any, ttl: number = CACHE_DURATION) => {
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

// دالة محسنة لمنع الطلبات المكررة
const getOrCreateRequest = (key: string, requestFn: () => Promise<any>): Promise<any> => {
  const now = Date.now();
  
  // تنظيف الطلبات المنتهية الصلاحية
  if (requestTimestamps[key] && (now - requestTimestamps[key]) > REQUEST_TIMEOUT) {
    delete pendingRequests[key];
    delete requestTimestamps[key];
    activeRequests.delete(key);
  }
  
  // إذا كان هناك طلب معلق، استخدمه
  if (pendingRequests[key]) {
    console.log(`⏳ [useSharedStoreData] انتظار طلب معلق: ${key}`);
    return pendingRequests[key];
  }
  
  // إذا كان الطلب نشطاً، استخدم النتيجة المحفوظة
  if (activeRequests.has(key) && requestResults.has(key)) {
    const result = requestResults.get(key);
    if (result && (now - result.timestamp) < 5000) { // 5 ثواني
      console.log(`🎯 [useSharedStoreData] استخدام نتيجة طلب نشط: ${key}`);
      return Promise.resolve(result.data);
    }
  }
  
  // إنشاء طلب جديد
  console.log(`🚀 [useSharedStoreData] إنشاء طلب جديد: ${key}`);
  const requestPromise = requestFn();
  
  pendingRequests[key] = requestPromise;
  requestTimestamps[key] = now;
  activeRequests.add(key);
  
  // حفظ النتيجة عند الانتهاء
  requestPromise.then((result) => {
    requestResults.set(key, { data: result, timestamp: now });
    
    // تنظيف بعد 10 ثواني
    setTimeout(() => {
      requestResults.delete(key);
      activeRequests.delete(key);
    }, 10000);
  });
  
  // تنظيف عند الانتهاء
  requestPromise.finally(() => {
    delete pendingRequests[key];
    delete requestTimestamps[key];
  });
  
  return requestPromise;
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
export const useSharedStoreData = (options: UseSharedStoreDataOptions = {}) => {
  const {
    includeCategories = true,
    includeProducts = true,
    includeFeaturedProducts = true,
    includeComponents = true,
    includeFooterSettings = true,
    includeTestimonials = true,
    includeSeoMeta = true,
    enableOptimisticUpdates = true,
    cacheStrategy = 'aggressive',
    enabled = true
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
      const hostname = host.split(':')[0];

      // نطاقاتنا الأساسية التي تعتمد على السابدومين
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));

      const parts = hostname.split('.');
      // حالة نطاق أساسي: يسمح فقط باستخراج السابدومين إذا كان هناك أكثر من جزئين
      // مثال: sub.ktobi.online → parts.length = 3 → subdomain = parts[0]
      if (isBaseDomain) {
        if (parts.length > 2 && parts[0] && parts[0] !== 'www') {
          return parts[0];
        }
        return null;
      }

      // نطاق مخصص:
      // - إذا كان على شكل sub.domain.com (3 أجزاء فأكثر) قد يكون subdomain حقيقي تابع للعميل
      // - إذا كان apex مثل mybrand.com (جزءان) فهذا ليس سابدومين ويجب إرجاع null
      if (parts.length > 2 && parts[0] && parts[0] !== 'www') {
        return parts[0];
      }
      return null;
    } catch {}
    return null;
  };
  const subdomain = resolveSubdomain();

  const {
    data: storeData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['shared-store-data', organizationId, subdomain, includeCategories, includeProducts, includeFeaturedProducts],
    queryFn: async () => {
      const startTime = performance.now();
      
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
      const isCustomDomain = !isLocalhost && !isBaseDomain;

      // أولوية: إذا كنا على نطاق متجر (سابدومين أو نطاق مخصص)، استخدم RPC الموحد لاستدعاء واحد فقط
      const storeIdentifier = subdomain || (isCustomDomain ? hostname : null);
      
      if (storeIdentifier) {
        // تحقق من cache محلي أولاً
        const cacheKey = `store-data-unified-${storeIdentifier}`;
        const cachedData = getCachedData(cacheKey);
        if (cachedData && cacheStrategy === 'aggressive') {
          console.log(`🎯 [useSharedStoreData] استخدام cache محلي: ${cacheKey}`);
          return cachedData;
        }

        console.log(`🏪 [useSharedStoreData] استخدام دالة get_store_init_data الموحدة مع: ${storeIdentifier}`);
        
        // استخدام النظام المحسن لمنع التكرار
        return getOrCreateRequest(cacheKey, async () => {
          // استخدام الـ API الموحد لمنع التكرار
          const { getStoreInitData } = await import('@/lib/api/deduplicatedApi');
          const data = await getStoreInitData(storeIdentifier);
          const error = null;
          if (error) {
            throw error;
          }
          
          // إضافة console.log للتشخيص
          // تم إزالة console.log التشخيصي
          
          const orgDetails = data?.organization_details || null;
          const orgSettings = data?.organization_settings || null;
          const categories = includeCategories ? (data?.categories || []) : [];
          // المنتجات الكاملة غير ضرورية لصفحة المتجر العامة، نكتفي بالمميزة من الـ RPC
          const featuredProducts = includeFeaturedProducts ? (data?.featured_products || []) : [];
          const products: any[] = includeProducts ? featuredProducts : [];
          const components = includeComponents ? (data?.store_layout_components || []) : [];
          const footerSettings = includeFooterSettings ? (data?.footer_settings || null) : null;
          // 🔒 استخدام testimonials من get_store_init_data فقط - منع الاستدعاءات المنفصلة
          const testimonials = includeTestimonials ? (data?.testimonials || []) : [];
          const seoMeta = includeSeoMeta ? (data?.seo_meta || null) : null;

          // تم إزالة console.log التشخيصي

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

          // تم إزالة console.log التشخيصي

          // حفظ في cache محلي
          setCachedData(cacheKey, result, 10 * 60 * 1000); // 10 دقائق

          const executionTime = performance.now() - startTime;
          console.log(`⚡ [useSharedStoreData] تم الانتهاء من جلب البيانات في ${executionTime.toFixed(2)}ms`);

          return result;
        });
      }

      // 🔒 منع المسار البطيء - إجبار استخدام get_store_init_data
      console.warn(`⚠️ [useSharedStoreData] تم إلغاء المسار البطيء - يجب استخدام get_store_init_data الموحد`);
      return null;
    },
    // مفعّل إذا كان لدينا orgId أو subdomain
    enabled: (!!organizationId || !!subdomain) && enabled,
    staleTime: 5 * 60 * 1000, // تحسين: 5 دقائق بدلاً من 15 دقيقة - تقليل الوقت لضمان تحديث البيانات
    gcTime: 30 * 60 * 1000, // تحسين: 30 دقيقة بدلاً من ساعة كاملة - تقليل وقت الاحتفاظ
    refetchOnWindowFocus: true, // تحسين: تفعيل إعادة التحميل عند العودة للنافذة
    refetchOnMount: true, // تحسين: تفعيل إعادة التحميل عند تركيب المكون
    refetchOnReconnect: true, // تحسين: تفعيل إعادة التحميل عند استعادة الاتصال
    // تحسين الأداء مع ضمان توفر البيانات
    networkMode: 'online',
    retry: 3, // تحسين: زيادة المحاولات من 2 إلى 3
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // تحسين: زيادة التأخير الأقصى
    // في إصدارات أحدث من React Query، استخدم placeholderData بدلاً من keepPreviousData
    placeholderData: (previousData) => previousData,
    // إضافة deduplication أقوى
    structuralSharing: false, // تعطيل المقارنة الهيكلية لتحسين الأداء
  });

  // تتبع حالة التحميل
  const endTime = performance.now();
  
  // دالة محسنة لتحديث البيانات مع الحفاظ على البيانات المؤقتة
  const refreshData = useCallback(async () => {
    try {
      console.log('🔄 [useSharedStoreData] بدء تحديث البيانات...');
      
      // إبطال البيانات المؤقتة بشكل انتقائي
      if (organizationId) {
        const cacheKey = `store-data-${organizationId}`;
        delete globalStoreDataCache[cacheKey];
        delete globalCacheTimestamp[cacheKey];
        console.log(`🗑️ [useSharedStoreData] إزالة cache للمؤسسة: ${organizationId}`);
      }
      
      if (subdomain) {
        const cacheKey = `store-data-sd-${subdomain}`;
        delete globalStoreDataCache[cacheKey];
        delete globalCacheTimestamp[cacheKey];
        console.log(`🗑️ [useSharedStoreData] إزالة cache للسابدومين: ${subdomain}`);
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
          console.log(`🗑️ [useSharedStoreData] إزالة cache للنطاق المخصص: ${hostname}`);
        }
      }
      
      // إجبار إعادة التحميل مع الحفاظ على البيانات القديمة أثناء التحميل
      await queryClient.refetchQueries({ 
        queryKey: ['shared-store-data', organizationId, subdomain],
        type: 'active'
      });
      
      console.log('✅ [useSharedStoreData] تم تحديث البيانات بنجاح');
    } catch (error) {
      console.error('❌ [useSharedStoreData] خطأ في تحديث البيانات:', error);
    }
  }, [organizationId, subdomain, queryClient]);

  // إرجاع البيانات بشكل منظم (محسن مع memoization)
  return useMemo(() => {
    const data = storeData as any; // تحويل النوع بشكل آمن
    const result = {
      organization: data?.organization || null,
      organizationSettings: data?.organizationSettings || null,
      products: data?.products || [],
      categories: data?.categories || [],
      featuredProducts: data?.featuredProducts || [],
      components: data?.components || [],
      footerSettings: data?.footerSettings || null,
      testimonials: data?.testimonials || [],
      seoMeta: data?.seoMeta || null,
      isLoading,
      error: error?.message || null,
      refreshData
    };
    
    return result;
  }, [
    storeData,
    isLoading,
    error?.message,
    refreshData
  ]);
};
