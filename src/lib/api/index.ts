/**
 * ملف تجميعي لجميع الـ APIs الموحدة مع منع التكرار
 */

// تصدير جميع الدوال من الـ API الموحد
export * from './deduplicatedApi';

// تصدير الدوال المحسنة
export { getProductCompleteDataOptimized } from './productCompleteOptimized';

// تصدير الأنواع المطلوبة
export type { Database } from '@/types/database.types';

// دوال مساعدة سريعة للاستخدام الشائع
import {
  getOrganizationSettings,
  getOrganizationDefaultLanguage,
  getUserById,
  getOrganizationById,
  getProductCompleteDataOptimized as getProduct,
  getStoreInitData,
  clearAllCache,
  getCacheStats
} from './deduplicatedApi';

/**
 * مجموعة من الدوال السريعة للاستخدام الشائع
 */
export const quickApi = {
  // دوال المؤسسة
  getOrganization: getOrganizationById,
  getOrgSettings: getOrganizationSettings,
  getOrgLanguage: getOrganizationDefaultLanguage,
  
  // دوال المستخدم
  getUser: getUserById,
  
  // دوال المنتج
  getProduct,
  
  // دوال المتجر
  getStore: getStoreInitData,
  
  // دوال إدارة الكاش
  clearCache: clearAllCache,
  getStats: getCacheStats
};

/**
 * إعدادات الكاش الافتراضية
 */
export const CACHE_CONFIG = {
  SHORT_TTL: 30 * 1000,      // 30 ثانية
  DEFAULT_TTL: 5 * 60 * 1000, // 5 دقائق
  LONG_TTL: 15 * 60 * 1000   // 15 دقيقة
} as const;

/**
 * أنواع البيانات الشائعة
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface CacheStats {
  cacheSize: number;
  pendingRequests: number;
  cacheKeys: string[];
}

/**
 * دالة مساعدة لتنظيف الكاش بناءً على النوع
 */
export function clearCacheByType(type: 'user' | 'organization' | 'product' | 'store' | 'all'): void {
  switch (type) {
    case 'all':
      clearAllCache();
      break;
    default:
  }
}

/**
 * دالة مساعدة للحصول على معلومات الكاش
 */
export function getCacheInfo(): CacheStats & { config: typeof CACHE_CONFIG } {
  return {
    ...getCacheStats(),
    config: CACHE_CONFIG
  };
}
