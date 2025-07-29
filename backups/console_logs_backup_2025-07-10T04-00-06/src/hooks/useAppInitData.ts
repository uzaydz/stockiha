/**
 * Hooks للوصول للبيانات المحفوظة من النظام المركزي
 * تقرأ من localStorage بدلاً من قاعدة البيانات لضمان السرعة
 */

import { useMemo } from 'react';
import { getAppInitData } from '@/lib/appInitializer';

/**
 * Hook للحصول على جميع بيانات التهيئة
 */
export function useAppInitData() {
  return useMemo(() => getAppInitData(), []);
}

/**
 * Hook للحصول على بيانات المتجر
 */
export function useStoreInfo() {
  const data = useAppInitData();
  return useMemo(() => {
    if (!data) return null;
    return {
      id: data.organization.id,
      name: data.organization.settings.site_name || data.organization.name,
      subdomain: data.organization.subdomain,
      logo_url: data.organization.settings.logo_url
    };
  }, [data]);
}

/**
 * Hook للحصول على إعدادات المؤسسة
 */
export function useOrganizationSettings() {
  const data = useAppInitData();
  return useMemo(() => {
    if (!data) return null;
    return data.organization.settings;
  }, [data]);
}

/**
 * Hook للحصول على إعدادات الثيم
 */
export function useThemeSettings() {
  const data = useAppInitData();
  return useMemo(() => {
    if (!data) return null;
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