/**
 * ملف index موحد لجميع وظائف TenantContext المحسنة
 * يسهل الاستيراد ويوفر نقطة وصول واحدة لجميع المكونات
 */

// تصدير الأنواع
export type {
  Organization,
  TenantContextType,
  OrganizationCacheItem,
  OrganizationFetchParams,
  CustomDomainResult
} from '@/types/tenant';

// تصدير إدارة Cache
export {
  initializeOrganizationCache,
  createCacheKey,
  getCachedOrganization,
  setCachedOrganization,
  managePendingRequest,
  cleanExpiredOrganizationCache,
  clearOrganizationCache,
  startCacheCleanup,
  ORGANIZATION_CACHE_TTL,
  CACHE_CLEANUP_INTERVAL
} from '@/lib/cache/organizationCache';

// تصدير جلب البيانات
export {
  fetchOrganizationUnified,
  getOrganizationFromCustomDomain,
  fetchOrganizationWithPriority,
  validateOrganizationAccess,
  refetchOrganizationData,
  fetchMultipleOrganizations
} from '@/lib/fetchers/organizationFetcher';

// تصدير معالجة البيانات
export {
  updateOrganizationFromData,
  saveCompleteOrganizationData,
  validateAndEnrichOrganization,
  mergeOrganizationData,
  updateOrganizationFields,
  extractOrganizationSummary,
  checkOrganizationPermissions
} from '@/lib/processors/organizationProcessor';

// تصدير أدوات النطاقات الفرعية
export {
  isMainDomain,
  extractSubdomain,
  checkCustomDomain,
  isValidSubdomain,
  normalizeSubdomain,
  buildSubdomainUrl
} from '@/utils/subdomainUtils';

// تصدير إدارة التخزين المحلي
export {
  updateLocalStorageOrgId,
  getStoredOrganizationId,
  saveOrganizationData,
  getStoredOrganizationData,
  saveOrganizationSettings,
  saveStoreInfoToSession,
  getRPCOrganizationData,
  clearOrganizationStorageData,
  dispatchOrganizationUpdateEvent,
  STORAGE_KEYS
} from '@/lib/storage/localStorageManager';

// تصدير إدارة اللغات
export {
  getLanguageSettings,
  detectLanguageFromData,
  findLanguageInObject,
  dispatchLanguageUpdateEvent,
  updateOrganizationLanguageSettings,
  clearLanguageCache
} from '@/lib/language/languageManager';

// دالة سريعة للحصول على ملخص المؤسسة
export const getQuickOrganizationSummary = async (orgId: string) => {
  const cachedData = getCachedOrganization(`org-id-${orgId}`);
  if (cachedData) {
    return extractOrganizationSummary(cachedData);
  }
  
  try {
    const orgData = await fetchOrganizationUnified({ orgId });
    if (orgData) {
      const processed = updateOrganizationFromData(orgData);
      if (processed) {
        return extractOrganizationSummary(processed);
      }
    }
  } catch (error) {
  }
  
  return null;
};

// دالة لتهيئة النظام الكامل
export const initializeTenantSystem = () => {
  initializeOrganizationCache();
  startCacheCleanup();
  
  if (process.env.NODE_ENV === 'development') {
  }
};

// استيراد الدوال المساعدة الشائعة
import { 
  getCachedOrganization, 
  setCachedOrganization,
  createCacheKey
} from '@/lib/cache/organizationCache';
import { 
  fetchOrganizationUnified 
} from '@/lib/fetchers/organizationFetcher';
import { 
  updateOrganizationFromData,
  extractOrganizationSummary 
} from '@/lib/processors/organizationProcessor';
