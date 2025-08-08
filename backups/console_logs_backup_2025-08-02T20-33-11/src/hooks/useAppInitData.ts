/**
 * Hooks للوصول للبيانات المحفوظة من النظام المركزي
 * تقرأ من localStorage بدلاً من قاعدة البيانات لضمان السرعة
 */

import { useMemo } from 'react';
import { getAppInitData } from '@/lib/appInitializer';

/**
 * Hook للحصول على بيانات التطبيق المبدئية
 */
export function useAppInitData() {
  return getAppInitData();
}

/**
 * Hook للحصول على بيانات المتجر - مع تحسين للأداء
 */
export function useStoreInfo() {
  // فحص هل نحن في صفحة متجر أم لا
  const isStoreContext = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // التحقق من صفحات المتجر والمنتجات
    const isProductPage = pathname.includes('/product') || pathname.includes('/products');
    const isStorePage = pathname === '/' || pathname.includes('/category/') || pathname.includes('/thank-you');
    const hasSubdomainOrCustomDomain = !hostname.includes('stockiha.com') && !hostname.includes('ktobi.online');
    
    return (isProductPage || isStorePage) && hasSubdomainOrCustomDomain;
  }, []);
  
  // نستدعي useAppInitData دائماً، لكن نرجع null إذا لم نكن في صفحة متجر
  const data = useAppInitData();
  
  return useMemo(() => {
    if (!isStoreContext || !data || !data.organization) {
      return null;
    }
    
    return {
      id: data.organization.id,
      name: data.organization.settings?.site_name || data.organization.name,
      subdomain: data.organization.subdomain,
      logo_url: data.organization.settings?.logo_url
    };
  }, [data, isStoreContext]);
}

/**
 * Hook للحصول على إعدادات المؤسسة
 */
export function useOrganizationSettings() {
  const data = useAppInitData();
  return useMemo(() => {
    if (!data || !data.organization) {
      return null;
    }
    return data.organization.settings;
  }, [data]);
}

/**
 * Hook للحصول على إعدادات الثيم
 */
export function useThemeSettings() {
  const data = useAppInitData();
  return useMemo(() => {
    if (!data || !data.theme) {
      return null;
    }
    return data.theme;
  }, [data]);
}

/**
 * Hook للحصول على الفئات من AppInitializer
 */
export function useAppInitCategories() {
  const data = useAppInitData();
  return useMemo(() => {
    if (!data) return [];
    return data.categories || [];
  }, [data]);
}

/**
 * Hook للحصول على المنتجات من AppInitializer
 */
export function useAppInitProducts() {
  const data = useAppInitData();
  return useMemo(() => {
    if (!data) return [];
    return data.products || [];
  }, [data]);
}

/**
 * Hook للحصول على إعدادات المتجر من AppInitializer
 */
export function useAppInitStoreSettings() {
  const data = useAppInitData();
  return useMemo(() => {
    if (!data) return [];
    return data.storeSettings || [];
  }, [data]);
}

/**
 * Hook للحصول على شهادات العملاء من AppInitializer
 */
export function useAppInitTestimonials() {
  const data = useAppInitData();
  return useMemo(() => {
    if (!data) return [];
    return data.testimonials || [];
  }, [data]);
}
