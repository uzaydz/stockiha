/**
 * مجلب بيانات المؤسسات - منفصل لتحسين الأداء
 * يتولى جميع عمليات جلب بيانات المؤسسات مع التخزين المؤقت الذكي
 */

import { getOrganizationBySubdomain, getOrganizationByDomain } from '@/lib/api/subdomain';
import { getOrganizationById } from '@/lib/api/organization';
import type { OrganizationFetchParams, CustomDomainResult } from '@/types/tenant';
import {
  getCachedOrganization,
  setCachedOrganization,
  managePendingRequest,
  createCacheKey
} from '@/lib/cache/organizationCache';
import { API_TIMEOUTS } from '@/config/api-timeouts';

/**
 * جلب موحد للمؤسسة مع cache محسن - محسن للسرعة
 */
export async function fetchOrganizationUnified(
  params: OrganizationFetchParams
): Promise<any> {
  const cacheInfo = createCacheKey(params);
  if (!cacheInfo) {
    throw new Error('معاملات غير صالحة لجلب المؤسسة');
  }

  // التحقق من cache أولاً
  if (window.organizationCache) {
    const cached = window.organizationCache.get(cacheInfo.key);
    if (cached) {
      if (process.env.NODE_ENV === 'development') {
      }
      return cached;
    }
  }

  try {
    const startTime = performance.now();
    
    // استخدام timeout محسن من الإعدادات (8 ثوان)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Organization fetch timeout after ${API_TIMEOUTS.ORGANIZATION_LOAD / 1000} seconds`)), API_TIMEOUTS.ORGANIZATION_LOAD)
    );
    
    let orgData: any = null;
    
    // جلب البيانات حسب المعاملات باستخدام الدوال الموجودة
    if (params.orgId) {
      const fetchPromise = getOrganizationById(params.orgId);
      orgData = await Promise.race([fetchPromise, timeoutPromise]) as any;
    } else if (params.hostname) {
      const fetchPromise = getOrganizationByDomain(params.hostname);
      orgData = await Promise.race([fetchPromise, timeoutPromise]) as any;
    } else if (params.subdomain) {
      const fetchPromise = getOrganizationBySubdomain(params.subdomain);
      orgData = await Promise.race([fetchPromise, timeoutPromise]) as any;
    }

    const executionTime = performance.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
    }

    // حفظ في cache
    if (orgData && window.organizationCache) {
      window.organizationCache.set(cacheInfo.key, orgData);
    }

    return orgData;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
    throw error;
  }
}

/**
 * جلب المؤسسة من النطاق المخصص
 */
export async function getOrganizationFromCustomDomain(hostname: string): Promise<CustomDomainResult | null> {
  if (!hostname || hostname.includes('localhost')) {
    return null;
  }
  
  try {
    if (process.env.NODE_ENV === 'development') {
    }
    
    const orgData = await fetchOrganizationUnified({ hostname });
      
    if (orgData && orgData.id && orgData.subdomain) {
      if (process.env.NODE_ENV === 'development') {
      }
      
      return {
        id: orgData.id,
        subdomain: orgData.subdomain
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
  
  return null;
}

/**
 * جلب المؤسسة بأولوية ذكية (orgId > domain > subdomain) - محسن للكاش
 */
export async function fetchOrganizationWithPriority(params: {
  storedOrgId?: string | null;
  hostname?: string;
  subdomain?: string;
}): Promise<any> {
  const { storedOrgId, hostname, subdomain } = params;
  
  let orgData = null;
  
  // ⚡ فحص الكاش أولاً لجميع المعايير المتاحة
  const cacheChecks = [
    storedOrgId ? `org-id-${storedOrgId}` : null,
    hostname && !hostname.includes('localhost') ? `org-domain-${hostname}` : null,
    subdomain && subdomain !== 'main' ? `org-subdomain-${subdomain}` : null
  ].filter(Boolean);
  
  // البحث في الكاش أولاً
  for (const cacheKey of cacheChecks) {
    if (cacheKey) {
      const cachedData = getCachedOrganization(cacheKey);
      if (cachedData) {
        if (process.env.NODE_ENV === 'development') {
        }
        return cachedData;
      }
    }
  }
  
  // أولوية 1: المعرف المخزن
  if (storedOrgId) {
    if (process.env.NODE_ENV === 'development') {
    }
    orgData = await fetchOrganizationUnified({ orgId: storedOrgId });
  }
  
  // أولوية 2: النطاق المخصص  
  else if (hostname && !hostname.includes('localhost')) {
    if (process.env.NODE_ENV === 'development') {
    }
    orgData = await fetchOrganizationUnified({ hostname });
  }
  
  // أولوية 3: النطاق الفرعي
  else if (subdomain && subdomain !== 'main') {
    if (process.env.NODE_ENV === 'development') {
    }
    orgData = await fetchOrganizationUnified({ subdomain });
  }
  
  return orgData;
}

/**
 * التحقق من وجود المؤسسة بمعايير متعددة
 */
export async function validateOrganizationAccess(
  orgId: string,
  expectedSubdomain?: string
): Promise<boolean> {
  try {
    const orgData = await fetchOrganizationUnified({ orgId });
    
    if (!orgData) {
      return false;
    }
    
    // التحقق من النطاق الفرعي إذا تم توفيره
    if (expectedSubdomain && orgData.subdomain !== expectedSubdomain) {
      if (process.env.NODE_ENV === 'development') {
      }
      return false;
    }
    
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
    return false;
  }
}

/**
 * إعادة جلب بيانات المؤسسة مع مسح cache
 */
export async function refetchOrganizationData(
  params: OrganizationFetchParams,
  clearCache = true
): Promise<any> {
  if (clearCache) {
    const cacheInfo = createCacheKey(params);
    if (cacheInfo && window.organizationCache) {
      window.organizationCache.delete(cacheInfo.key);
      
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }
  
  return fetchOrganizationUnified(params);
}

/**
 * جلب متعدد للمؤسسات (لحالات الاستخدام المتقدمة)
 */
export async function fetchMultipleOrganizations(
  paramsList: OrganizationFetchParams[]
): Promise<(any | null)[]> {
  const promises = paramsList.map(params => fetchOrganizationUnified(params));
  
  try {
    return await Promise.all(promises);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
    // إرجاع array بنفس الطول مع null للفاشل
    return paramsList.map(() => null);
  }
}
