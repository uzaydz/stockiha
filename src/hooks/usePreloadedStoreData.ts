/**
 * Hook محسن لاستخدام بيانات المتجر المحفوظة مسبقاً
 * يستخدم البيانات المحفوظة فوراً إذا كانت متوفرة، وإلا يجلبها
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useCallback } from 'react';
import { preloadService, getPreloadedStoreData, hasPreloadedStoreData } from '@/services/preloadService';
import { getEarlyPreloadedData } from '@/utils/earlyPreload';
import { useSharedStoreData } from './useSharedStoreData';

interface UsePreloadedStoreDataOptions {
  includeCategories?: boolean;
  includeProducts?: boolean;
  includeFeaturedProducts?: boolean;
  includeComponents?: boolean;
  includeFooterSettings?: boolean;
  includeTestimonials?: boolean;
  includeSeoMeta?: boolean;
  enabled?: boolean;
  storeIdentifier?: string;
}

interface PreloadedStoreData {
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
  refreshData: () => void;
  isFromPreload: boolean;
  preloadStats: any;
}

export const usePreloadedStoreData = (options: UsePreloadedStoreDataOptions = {}): PreloadedStoreData => {
  const {
    includeCategories = true,
    includeProducts = false,
    includeFeaturedProducts = true,
    includeComponents = true,
    includeFooterSettings = true,
    includeTestimonials = true,
    includeSeoMeta = true,
    enabled = true,
    storeIdentifier: propStoreIdentifier
  } = options;

  const queryClient = useQueryClient();

  // تحديد store identifier
  const resolveStoreIdentifier = useCallback((): string | null => {
    if (propStoreIdentifier) return propStoreIdentifier;
    
    try {
      const stored = localStorage.getItem('bazaar_current_subdomain');
      if (stored && stored !== 'main' && stored !== 'www') return stored;
    } catch {}
    
    try {
      const hostname = window.location.hostname.split(':')[0];
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
      const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
      const isCustomDomain = !isLocalhost && !isBaseDomain;
      
      if (isBaseDomain) {
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] && parts[0] !== 'www') {
          // تنظيف النطاق الفرعي مثل extractSubdomainFromHostname
          const cleanSubdomain = parts[0]
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-');
          return cleanSubdomain;
        }
      }
      
      // إصلاح: التعامل مع localhost مع subdomain
      if (isLocalhost && hostname.includes('.')) {
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[0] && parts[0] !== 'localhost') {
          const cleanSubdomain = parts[0]
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-');
          
          return cleanSubdomain;
        }
      }
      
      if (isCustomDomain) {
        // 🔥 إصلاح: إزالة www. من النطاق المخصص لمطابقة قاعدة البيانات
        let cleanHostname = hostname;
        if (cleanHostname.startsWith('www.')) {
          cleanHostname = cleanHostname.substring(4);
        }
        return cleanHostname;
      }
    } catch {}
    
    return null;
  }, [propStoreIdentifier]);

  const storeIdentifier = resolveStoreIdentifier();
  
  // 🔍 تسجيل إضافي لمعرفة ما يحدث
  
  
  // التحقق من وجود بيانات محفوظة مسبقاً
  const hasPreloadedData = useMemo(() => {
    if (!storeIdentifier) return false;

    

    // التحقق من preloadService أولاً
    if (hasPreloadedStoreData(storeIdentifier)) {
      
      return true;
    }

    // التحقق من earlyPreload كـ fallback
    const earlyData = getEarlyPreloadedData(storeIdentifier);
    if (earlyData) {
      
      return true;
    }

    
    return false;
  }, [storeIdentifier]);

  // الحصول على البيانات المحفوظة مسبقاً (من preloadService أو earlyPreload)
  const preloadedData = useMemo(() => {
    if (!storeIdentifier) return null;

    // أولوية للبيانات من preloadService
    const serviceData = getPreloadedStoreData(storeIdentifier);
    if (serviceData) {
      
      return serviceData;
    }

    // fallback للبيانات المحفوظة مبكراً
    const earlyData = getEarlyPreloadedData(storeIdentifier);
    if (earlyData) {
      
      return earlyData;
    }

    // 🔍 محاولة البحث بمفاتيح بديلة للنطاقات مع www
    if (storeIdentifier && storeIdentifier.includes('.')) {
      // جرب البحث مع www. إذا لم يكن موجود
      const withWww = storeIdentifier.startsWith('www.') ? storeIdentifier : `www.${storeIdentifier}`;
      const withoutWww = storeIdentifier.startsWith('www.') ? storeIdentifier.substring(4) : storeIdentifier;
      
      
      
      // جرب مع www في preloadService
      const serviceDataWithWww = getPreloadedStoreData(withWww);
      if (serviceDataWithWww) {
        
        return serviceDataWithWww;
      }
      
      // جرب بدون www في preloadService
      const serviceDataWithoutWww = getPreloadedStoreData(withoutWww);
      if (serviceDataWithoutWww) {
        
        return serviceDataWithoutWww;
      }

      // 🔥 جديد: محاولة البحث في useSharedStoreData cache
      try {
        const unifiedCacheKey = `store-data-unified-${withoutWww}`;
        const cachedData = localStorage.getItem(unifiedCacheKey);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          
          return parsedData;
        }
      } catch (error) {
        
      }
      
      // جرب earlyPreload مع www
      const earlyDataWithWww = getEarlyPreloadedData(withWww);
      if (earlyDataWithWww) {
        
        return earlyDataWithWww;
      }
      
      // جرب earlyPreload بدون www
      const earlyDataWithoutWww = getEarlyPreloadedData(withoutWww);
      if (earlyDataWithoutWww) {
        
        return earlyDataWithoutWww;
      }
    }

    
    return null;
  }, [storeIdentifier, hasPreloadedData]);

  // استخدام البيانات المحفوظة مسبقاً إذا كانت متوفرة (من أي مصدر)
  const shouldUsePreloaded = preloadedData && enabled;

  // fallback إلى useSharedStoreData العادي إذا لم تكن البيانات محفوظة مسبقاً
  const fallbackData = useSharedStoreData({
    includeCategories,
    includeProducts,
    includeFeaturedProducts,
    includeComponents,
    includeFooterSettings,
    includeTestimonials,
    includeSeoMeta,
    enabled: enabled && !shouldUsePreloaded
  });

  // دالة إعادة التحميل محسنة
  const refreshData = useCallback(async () => {
    

    if (storeIdentifier) {
      try {
        // مسح البيانات المحفوظة مسبقاً من كلا النظامين
        preloadService.clearPreloadedData(storeIdentifier);

        // مسح البيانات من earlyPreload أيضاً
        if (typeof window !== 'undefined') {
          try {
            // استيراد earlyPreloader ومسح البيانات
            import('@/utils/earlyPreload').then(({ earlyPreloader }) => {
              earlyPreloader.clearPreloadedData();
            });
          } catch (e) {
            console.warn('⚠️ فشل في مسح البيانات من earlyPreload:', e);
          }
        }

        

        // إعادة تحميل البيانات باستخدام preloadService
        const preloadResult = await preloadService.preloadStoreData({
          storeIdentifier,
          forceRefresh: true
        });

        if (preloadResult.success) {
          

          // إعادة تحميل البيانات في React Query أيضاً
          await queryClient.refetchQueries({
            queryKey: ['shared-store-data'],
            type: 'active'
          });

          
        } else {
          console.warn(`⚠️ [usePreloadedStoreData] فشل تحديث البيانات:`, preloadResult.error);
        }

      } catch (error) {
        console.error('❌ [usePreloadedStoreData] خطأ في إعادة التحميل:', error);
      }
    } else {
      // fallback إلى refreshData العادي
      
      fallbackData.refreshData();
    }
  }, [storeIdentifier, queryClient, fallbackData.refreshData]);

  // استخراج البيانات من البيانات المحفوظة مسبقاً
  const extractPreloadedData = useCallback((data: any) => {
    if (!data) return null;
    
    // تشخيص البيانات المحملة مسبقاً
    
    return {
      organization: data.organization_details || null,
      organizationSettings: data.organization_settings || null,
      categories: includeCategories ? (data.categories || []) : [],
      products: includeProducts ? (data.featured_products || []) : [],
      featuredProducts: includeFeaturedProducts ? (data.featured_products || []) : [],
      components: includeComponents ? (data.store_layout_components || []) : [],
      footerSettings: includeFooterSettings ? (data.footer_settings || null) : null,
      testimonials: includeTestimonials ? (data.testimonials || []) : [],
      seoMeta: includeSeoMeta ? (data.seo_meta || null) : null
    };
  }, [storeIdentifier, includeCategories, includeProducts, includeFeaturedProducts, includeComponents, includeFooterSettings, includeTestimonials, includeSeoMeta]);

  // إرجاع البيانات المناسبة
  return useMemo(() => {
    if (shouldUsePreloaded) {
      const extractedData = extractPreloadedData(preloadedData);

      return {
        organization: extractedData?.organization || null,
        organizationSettings: extractedData?.organizationSettings || null,
        products: extractedData?.products || [],
        categories: extractedData?.categories || [],
        featuredProducts: extractedData?.featuredProducts || [],
        components: extractedData?.components || [],
        footerSettings: extractedData?.footerSettings || null,
        testimonials: extractedData?.testimonials || [],
        seoMeta: extractedData?.seoMeta || null,
        isLoading: false,
        error: null,
        refreshData,
        isFromPreload: true,
        preloadStats: preloadService.getPreloadStats()
      };
    }

    // fallback إلى البيانات العادية

    return {
      ...fallbackData,
      isFromPreload: false,
      preloadStats: preloadService.getPreloadStats()
    };
  }, [shouldUsePreloaded, extractPreloadedData, preloadedData, fallbackData, refreshData, storeIdentifier, hasPreloadedData]);
};

// Hook مبسط للاستخدام السريع
export const usePreloadedFeaturedProducts = () => {
  const { featuredProducts, isLoading, error, refreshData, isFromPreload } = usePreloadedStoreData({
    includeCategories: false,
    includeProducts: false,
    includeFeaturedProducts: true,
    includeComponents: false,
    includeFooterSettings: false,
    includeTestimonials: false,
    includeSeoMeta: false
  });

  return {
    featuredProducts,
    isLoading,
    error,
    refreshData,
    isFromPreload
  };
};
