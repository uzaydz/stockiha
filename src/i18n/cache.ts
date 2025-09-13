// إدارة التخزين المؤقت للغة
import { langLog, langWarn } from '@/lib/debug/langDebug';

// تعريف global للـ organizationCache
declare global {
  interface Window {
    organizationCache?: Map<string, {
      data: any;
      timestamp: number;
      type: 'byId' | 'byDomain' | 'bySubdomain';
    }>;
  }
}

// واجهة التخزين المؤقت للغة
export interface LanguageCache {
  language: string;
  timestamp: number;
  organizationId: string;
  fromCache?: boolean;
}

// متغيرات التخزين المؤقت للغة
let languageCache: LanguageCache | null = null;
const LANGUAGE_CACHE_DURATION = 10 * 60 * 1000; // 10 دقائق
const IMMEDIATE_CACHE_DURATION = 60 * 1000; // دقيقة واحدة للتخزين الفوري

/**
 * الحصول على التخزين المؤقت للغة
 */
export const getLanguageCache = (): LanguageCache | null => {
  return languageCache;
};

/**
 * تحديث التخزين المؤقت للغة
 */
export const setLanguageCache = (cache: LanguageCache): void => {
  languageCache = cache;
  langLog('languageCache:updated', { language: cache.language, organizationId: cache.organizationId });
};

/**
 * التحقق من صلاحية التخزين المؤقت
 */
export const isCacheValid = (cache: LanguageCache, useImmediateCache = false): boolean => {
  const cacheAge = Date.now() - cache.timestamp;
  const cacheDuration = useImmediateCache ? IMMEDIATE_CACHE_DURATION : LANGUAGE_CACHE_DURATION;
  return cacheAge < cacheDuration;
};

/**
 * مسح التخزين المؤقت للغة
 */
export const clearLanguageCache = (): void => {
  languageCache = null;
  langLog('languageCache:cleared');
};

/**
 * التحقق من وجود بيانات المنظمة في التخزين المؤقت العام
 */
export const getOrganizationFromCache = (organizationId: string): any | null => {
  if (!window.organizationCache) {
    return null;
  }

  // البحث في مختلف أنواع التخزين المؤقت
  const cacheKeys = [
    `org-id-${organizationId}`,
    `org-subdomain-${organizationId}`,
    `org-domain-${organizationId}`
  ];

  for (const key of cacheKeys) {
    if (window.organizationCache.has(key)) {
      const cached = window.organizationCache.get(key);
      if (cached && cached.data) {
        langLog('organizationCache:hit', { key, organizationId });
        return cached.data;
      }
    }
  }

  return null;
};

/**
 * الحصول على اللغة الافتراضية من بيانات المنظمة المخزنة
 */
export const getDefaultLanguageFromOrganizationCache = (organizationId: string): string | null => {
  const orgData = getOrganizationFromCache(organizationId);
  if (!orgData) {
    return null;
  }

  // محاولة الحصول على اللغة من مصادر مختلفة
  const defaultLanguage = orgData.default_language ||
                         orgData.settings?.default_language ||
                         orgData.organization_settings?.default_language;

  if (defaultLanguage && ['ar', 'en', 'fr'].includes(defaultLanguage)) {
    return defaultLanguage;
  }

  return null;
};
