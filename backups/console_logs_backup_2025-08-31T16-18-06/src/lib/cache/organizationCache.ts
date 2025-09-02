/**
 * مدير Cache للمؤسسات - منفصل لتحسين الأداء
 * يتولى جميع عمليات التخزين المؤقت للمؤسسات
 */

import type { OrganizationCacheItem } from '@/types/tenant';

// ثوابت Cache
export const ORGANIZATION_CACHE_TTL = 10 * 60 * 1000; // 10 دقائق
export const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 دقائق

// طلبات معلقة لمنع التكرار
const pendingRequests = new Map<string, Promise<any>>();

/**
 * تهيئة cache عالمي للمؤسسات
 */
export function initializeOrganizationCache(): void {
  if (typeof window !== 'undefined' && !window.organizationCache) {
    window.organizationCache = new Map();
  }
}

/**
 * إنشاء مفتاح cache بناءً على المعايير
 */
export function createCacheKey(params: {
  orgId?: string;
  hostname?: string;
  subdomain?: string;
}): { key: string; type: 'byId' | 'byDomain' | 'bySubdomain' } | null {
  const { orgId, hostname, subdomain } = params;
  
  if (orgId) {
    return { key: `org-id-${orgId}`, type: 'byId' };
  } else if (hostname) {
    return { key: `org-domain-${hostname}`, type: 'byDomain' };
  } else if (subdomain) {
    return { key: `org-subdomain-${subdomain}`, type: 'bySubdomain' };
  }
  
  return null;
}

/**
 * الحصول على بيانات من Cache
 */
export function getCachedOrganization(cacheKey: string): any | null {
  if (!window.organizationCache?.has(cacheKey)) {
    return null;
  }
  
  const cached = window.organizationCache.get(cacheKey)!;
  const now = Date.now();
  
  if (now - cached.timestamp < ORGANIZATION_CACHE_TTL) {
    return cached.data;
  } else {
    // إزالة البيانات منتهية الصلاحية
    window.organizationCache.delete(cacheKey);
    return null;
  }
}

/**
 * حفظ بيانات في Cache مع جميع المفاتيح المختلفة
 */
export function setCachedOrganization(
  orgData: any,
  cacheKey: string,
  fetchType: 'byId' | 'byDomain' | 'bySubdomain'
): void {
  if (!orgData || !window.organizationCache) return;
  
  const cacheItem: OrganizationCacheItem = {
    data: orgData,
    timestamp: Date.now(),
    type: fetchType
  };
  
  // حفظ بالمفتاح الأساسي
  window.organizationCache.set(cacheKey, cacheItem);
  
  // حفظ نفس البيانات بمفاتيح مختلفة لتجنب الاستدعاءات المستقبلية
  if (orgData.id && fetchType !== 'byId') {
    window.organizationCache.set(`org-id-${orgData.id}`, {
      ...cacheItem,
      type: 'byId'
    });
  }
  
  if (orgData.subdomain && fetchType !== 'bySubdomain') {
    window.organizationCache.set(`org-subdomain-${orgData.subdomain}`, {
      ...cacheItem,
      type: 'bySubdomain'
    });
  }
  
  if (orgData.domain && fetchType !== 'byDomain') {
    window.organizationCache.set(`org-domain-${orgData.domain}`, {
      ...cacheItem,
      type: 'byDomain'
    });
  }
}

/**
 * إدارة الطلبات المعلقة لمنع التكرار
 */
export function managePendingRequest<T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>
): Promise<T> {
  // التحقق من وجود طلب مماثل قيد التنفيذ
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // إنشاء Promise جديد وحفظه
  const fetchPromise = fetchFunction().finally(() => {
    // إزالة من قائمة الطلبات المعلقة
    pendingRequests.delete(cacheKey);
  });
  
  // حفظ Promise في قائمة الطلبات المعلقة
  pendingRequests.set(cacheKey, fetchPromise);
  
  return fetchPromise;
}

/**
 * تنظيف cache منتهي الصلاحية
 */
export function cleanExpiredOrganizationCache(): void {
  if (!window.organizationCache) return;
  
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  window.organizationCache.forEach((value, key) => {
    if (now - value.timestamp > ORGANIZATION_CACHE_TTL) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => {
    window.organizationCache?.delete(key);
  });
  
  if (process.env.NODE_ENV === 'development' && keysToDelete.length > 0) {
  }
}

/**
 * مسح جميع بيانات cache للمؤسسة
 */
export function clearOrganizationCache(orgId?: string): void {
  if (!window.organizationCache) return;
  
  if (orgId) {
    // مسح cache خاص بمؤسسة معينة
    const keysToDelete: string[] = [];
    window.organizationCache.forEach((value, key) => {
      if (key.includes(orgId)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      window.organizationCache?.delete(key);
    });
  } else {
    // مسح جميع cache المؤسسات
    window.organizationCache.clear();
  }
}

/**
 * تشغيل تنظيف cache تلقائياً
 */
export function startCacheCleanup(): void {
  if (typeof window !== 'undefined') {
    setInterval(cleanExpiredOrganizationCache, CACHE_CLEANUP_INTERVAL);
  }
}

// تهيئة Cache وبدء التنظيف التلقائي
initializeOrganizationCache();
startCacheCleanup();
