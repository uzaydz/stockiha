/**
 * API موحد مع منع التكرار للاستعلامات الشائعة
 */

import { supabase } from '@/lib/supabase-unified';
import { requestDeduplicator } from '@/lib/requestDeduplicator';
import { isAppOnline, markNetworkOffline, markNetworkOnline } from '@/utils/networkStatus';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
type OrganizationSettings = Tables['organization_settings']['Row'];
type User = Tables['users']['Row'];
type Organization = Tables['organizations']['Row'];
// type CallCenterAgent = Tables['call_center_agents']['Row']; // Table doesn't exist

const ORG_SETTINGS_CACHE_PREFIX = 'organization_settings_';

const readCachedOrganizationSettings = (organizationId: string): OrganizationSettings | null => {
  if (typeof window === 'undefined' || !organizationId) {
    return null;
  }

  try {
    const raw = window.localStorage?.getItem(`${ORG_SETTINGS_CACHE_PREFIX}${organizationId}`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as OrganizationSettings;
  } catch {
    return null;
  }
};

const writeCachedOrganizationSettings = (organizationId: string, settings: OrganizationSettings | null) => {
  if (typeof window === 'undefined' || !organizationId) {
    return;
  }

  try {
    if (settings) {
      window.localStorage?.setItem(`${ORG_SETTINGS_CACHE_PREFIX}${organizationId}`, JSON.stringify(settings));
    } else {
      window.localStorage?.removeItem(`${ORG_SETTINGS_CACHE_PREFIX}${organizationId}`);
    }
  } catch {
    // تجاهل أخطاء التخزين المحلي
  }
};

const ORG_CACHE_PREFIX = 'organization_cache_';
const ORG_SUBDOMAIN_CACHE_PREFIX = 'organization_subdomain_cache_';

const isLikelyOfflineError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }

  const message =
    typeof error === 'string'
      ? error
      : (error as any)?.message || (error as any)?.details || '';

  if (!message) {
    return false;
  }

  const normalized = String(message).toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('network error') ||
    normalized.includes('networkerror') ||
    normalized.includes('fetch failed')
  );
};

const readCachedOrganization = (organizationId: string): Organization | null => {
  if (typeof window === 'undefined' || !organizationId) {
    return null;
  }

  try {
    const raw = window.localStorage?.getItem(`${ORG_CACHE_PREFIX}${organizationId}`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Organization;
  } catch {
    return null;
  }
};

const readCachedOrganizationBySubdomain = (subdomain: string): Organization | null => {
  if (typeof window === 'undefined' || !subdomain) {
    return null;
  }

  try {
    const raw = window.localStorage?.getItem(`${ORG_SUBDOMAIN_CACHE_PREFIX}${subdomain}`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Organization;
  } catch {
    return null;
  }
};

const cacheOrganization = (organization: Organization | null) => {
  if (typeof window === 'undefined' || !organization) {
    return;
  }

  try {
    window.localStorage?.setItem(
      `${ORG_CACHE_PREFIX}${organization.id}`,
      JSON.stringify(organization)
    );

    if (organization.subdomain) {
      window.localStorage?.setItem(
        `${ORG_SUBDOMAIN_CACHE_PREFIX}${organization.subdomain}`,
        JSON.stringify(organization)
      );
    }
  } catch {
    // تجاهل أخطاء التخزين المحلي
  }
};

/**
 * جلب إعدادات المؤسسة مع منع التكرار
 */
export async function getOrganizationSettings(
  organizationId: string,
  forceRefresh = false
): Promise<OrganizationSettings | null> {
  const key = `organization_settings:${organizationId}`;

  const cachedSettings = readCachedOrganizationSettings(organizationId);
  if (!isAppOnline() && !forceRefresh && cachedSettings) {
    return cachedSettings;
  }

  return requestDeduplicator.execute(
    key,
    async () => {
      const latestCached = readCachedOrganizationSettings(organizationId);

      if (!isAppOnline()) {
        markNetworkOffline({ force: true });
        return latestCached;
      }

      try {
        const { data, error } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (error) {
          if (isLikelyOfflineError(error)) {
            markNetworkOffline({ force: true });
            return latestCached;
          }
          throw error;
        }

        if (data) {
          writeCachedOrganizationSettings(organizationId, data as OrganizationSettings);
        }

        markNetworkOnline();
        return data;
      } catch (fetchError) {
        if (isLikelyOfflineError(fetchError)) {
          markNetworkOffline({ force: true });
          return latestCached;
        }
        throw fetchError;
      }
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 15 دقيقة - البيانات مستقرة
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب اللغة الافتراضية للمؤسسة مع منع التكرار
 */
export async function getOrganizationDefaultLanguage(
  organizationId: string,
  forceRefresh = false
): Promise<string> {
  // اعتمد على نفس كاش الإعدادات لتجنب ضربة ثانية
  const settings = await getOrganizationSettings(organizationId, forceRefresh);
  return (settings as any)?.default_language || 'ar';
}

/**
 * جلب بيانات المستخدم مع منع التكرار
 */
export async function getUserById(
  userId: string,
  forceRefresh = false
): Promise<User | null> {
  const key = `user:${userId}`;
  
  return requestDeduplicator.execute(
    key,
    async () => {
      if (!isAppOnline()) {
        markNetworkOffline({ force: true });
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          if (isLikelyOfflineError(error)) {
            markNetworkOffline({ force: true });
            return null;
          }
          throw error;
        }

        markNetworkOnline();
        return data;
      } catch (fetchError) {
        if (isLikelyOfflineError(fetchError)) {
          markNetworkOffline({ force: true });
          return null;
        }
        throw fetchError;
      }
    },
    {
      ttl: requestDeduplicator.getShortTTL(), // 30 ثانية - البيانات متغيرة
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب بيانات المستخدم بواسطة auth_user_id مع منع التكرار
 */
export async function getUserByAuthId(
  authUserId: string,
  forceRefresh = false
): Promise<User | null> {
  const key = `user_by_auth:${authUserId}`;
  
  return requestDeduplicator.execute(
    key,
    async () => {
      if (!isAppOnline()) {
        markNetworkOffline({ force: true });
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', authUserId)
          .maybeSingle();

        if (error) {
          if (isLikelyOfflineError(error)) {
            markNetworkOffline({ force: true });
            return null;
          }
          throw error;
        }

        markNetworkOnline();
        return data;
      } catch (fetchError) {
        if (isLikelyOfflineError(fetchError)) {
          markNetworkOffline({ force: true });
          return null;
        }
        throw fetchError;
      }
    },
    {
      ttl: requestDeduplicator.getShortTTL(), // 30 ثانية
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب جميع المستخدمين للمؤسسة مع منع التكرار
 */
export async function getOrganizationUsers(
  organizationId: string,
  forceRefresh = false
): Promise<User[]> {
  const key = `organization_users:${organizationId}`;
  
  return requestDeduplicator.execute(
    key,
    async () => {
      if (!isAppOnline()) {
        markNetworkOffline({ force: true });
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('organization_id', organizationId);

        if (error) {
          if (isLikelyOfflineError(error)) {
            markNetworkOffline({ force: true });
            return [];
          }
          throw error;
        }

        markNetworkOnline();
        return data || [];
      } catch (fetchError) {
        if (isLikelyOfflineError(fetchError)) {
          markNetworkOffline({ force: true });
          return [];
        }
        throw fetchError;
      }
    },
    {
      ttl: requestDeduplicator.getShortTTL(), // 30 ثانية
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب بيانات المؤسسة مع منع التكرار
 */
export async function getOrganizationById(
  organizationId: string,
  forceRefresh = false
): Promise<Organization | null> {
  const key = `organization:${organizationId}`;

  const cachedOrganization = readCachedOrganization(organizationId);
  if (!isAppOnline() && !forceRefresh && cachedOrganization) {
    return cachedOrganization;
  }

  return requestDeduplicator.execute(
    key,
    async () => {
      const latestCached = readCachedOrganization(organizationId);

      if (!isAppOnline()) {
        markNetworkOffline({ force: true });
        return latestCached;
      }

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .maybeSingle();

        if (error) {
          if (isLikelyOfflineError(error)) {
            markNetworkOffline({ force: true });
            return latestCached;
          }
          throw error;
        }

        if (data) {
          cacheOrganization(data as Organization);
        }

        markNetworkOnline();
        return data;
      } catch (fetchError) {
        if (isLikelyOfflineError(fetchError)) {
          markNetworkOffline({ force: true });
          return latestCached;
        }
        throw fetchError;
      }
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 15 دقيقة - البيانات مستقرة
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب بيانات المؤسسة حسب النطاق الفرعي مع منع التكرار
 */
export async function getOrganizationBySubdomain(
  subdomain: string,
  forceRefresh = false
): Promise<Organization | null> {
  const cleanSubdomain = (subdomain || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  if (!cleanSubdomain) return null;

  const key = `organization_subdomain:${cleanSubdomain}`;

  const cachedOrganization = readCachedOrganizationBySubdomain(cleanSubdomain);
  if (!isAppOnline() && !forceRefresh && cachedOrganization) {
    return cachedOrganization;
  }

  return requestDeduplicator.execute(
    key,
    async () => {
      const latestCached = readCachedOrganizationBySubdomain(cleanSubdomain);

      if (!isAppOnline()) {
        markNetworkOffline({ force: true });
        return latestCached;
      }

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('subdomain', cleanSubdomain)
          .maybeSingle();

        if (error) {
          if (isLikelyOfflineError(error)) {
            markNetworkOffline({ force: true });
            return latestCached;
          }
          throw error;
        }

        if (data) {
          cacheOrganization(data as Organization);
        }

        markNetworkOnline();
        return data;
      } catch (fetchError) {
        if (isLikelyOfflineError(fetchError)) {
          markNetworkOffline({ force: true });
          return latestCached;
        }
        throw fetchError;
      }
    },
    {
      ttl: requestDeduplicator.getLongTTL(),
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب بيانات المؤسسة حسب النطاق الرئيسي مع منع التكرار
 */
export async function getOrganizationByDomain(
  domain: string,
  forceRefresh = false
): Promise<Organization | null> {
  if (!domain) return null;

  let cleanDomain = domain.toLowerCase();
  cleanDomain = cleanDomain.replace(/^https?:\/\//i, '');
  if (cleanDomain.startsWith('www.')) cleanDomain = cleanDomain.substring(4);
  cleanDomain = cleanDomain.split(':')[0].split('/')[0];
  if (!cleanDomain) return null;

  const key = `organization_domain:${cleanDomain}`;
  return requestDeduplicator.execute(
    key,
    async () => {
      if (!isAppOnline()) {
        return null;
      }
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('domain', cleanDomain)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data;
    },
    {
      ttl: requestDeduplicator.getLongTTL(),
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب وكلاء مركز الاتصال للمؤسسة مع منع التكرار
 * Note: call_center_agents table doesn't exist, returning empty array
 */
export async function getCallCenterAgents(
  organizationId: string,
  forceRefresh = false
): Promise<any[]> {
  // Table doesn't exist, return empty array
  return [];
}

/**
 * جلب وكيل مركز الاتصال للمستخدم مع منع التكرار
 * Note: call_center_agents table doesn't exist, returning null
 */
export async function getCallCenterAgentByUserId(
  userId: string,
  forceRefresh = false
): Promise<any | null> {
  // Table doesn't exist, return null
  return null;
}

/**
 * مسح الكاش للمؤسسة
 */
export function clearOrganizationCache(organizationId: string): void {
  requestDeduplicator.clearCache(`organization:${organizationId}`);
  requestDeduplicator.clearCache(`organization_settings:${organizationId}`);
  requestDeduplicator.clearCache(`organization_default_language:${organizationId}`);
  requestDeduplicator.clearCache(`organization_users:${organizationId}`);
  // requestDeduplicator.clearCache(`call_center_agents:${organizationId}`); // Table doesn't exist
}

/**
 * مسح الكاش للمستخدم
 */
export function clearUserCache(userId: string, authUserId?: string): void {
  requestDeduplicator.clearCache(`user:${userId}`);
  if (authUserId) {
    requestDeduplicator.clearCache(`user_by_auth:${authUserId}`);
  }
  // requestDeduplicator.clearCache(`call_center_agent_user:${userId}`); // Table doesn't exist
}

/**
 * الحصول على إحصائيات الكاش
 */
export function getCacheStats() {
  return requestDeduplicator.getCacheStats();
}

/**
 * جلب بيانات المنتج الكاملة المحسنة مع منع التكرار
 * ✅ تحديث: تستخدم الدالتين الجديدتين المنفصلتين للسرعة الفائقة
 */
export async function getProductCompleteDataOptimized(
  productIdentifier: string,
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: 'full' | 'basic' | 'ultra';
    forceRefresh?: boolean;
  } = {},
  forceRefresh = false
): Promise<any> {
  const key = `product_complete_optimized:${productIdentifier}:${options.organizationId}:${options.dataScope}`;

  return requestDeduplicator.execute(
    key,
    async () => {
      // ✅ تحديث: استخدام الدالتين الجديدتين المنفصلتين
      const { getProductCombinedDataUltraFast } = await import('./productUltraFastApi');

        // تحويل خيارات dataScope إلى خيارات API الجديد
        const fastOptions = {
          organizationId: options.organizationId,
          includeInactive: options.includeInactive,
          includeExtended: options.dataScope !== 'basic',
          includeThumbnails: true,
          includeColorsBasic: true,
          includeMarketingData: options.dataScope === 'full' || options.dataScope === 'ultra',
          includeFormData: options.dataScope === 'full' || options.dataScope === 'ultra',
          includeAdvancedSettings: options.dataScope === 'ultra',
          dataDetailLevel: (options.dataScope === 'ultra' ? 'ultra' : 'full') as 'full' | 'ultra' | 'standard'
        };

      // تحديد السياق حسب dataScope
      let context: 'list' | 'card' | 'detail' | 'full' = 'detail';
      if (options.dataScope === 'basic') context = 'card';
      else if (options.dataScope === 'ultra') context = 'full';

      return await getProductCombinedDataUltraFast(productIdentifier, fastOptions);
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 15 دقيقة - البيانات مستقرة نسبياً
      forceRefresh: options.forceRefresh || forceRefresh,
      useCache: true
    }
  );
}

/**
 * 🔥 تحسين: جلب بيانات المنتج بأداء محسن مع خيارات متعددة - نسخة محسنة
 * تستخدم الدالتين الجديدتين المنفصلتين للسرعة الفائقة
 */
export async function getProductCompleteDataUltraOptimized(
  productIdentifier: string,
  options: {
    organizationId?: string;
    includeInactive?: boolean;
    dataScope?: 'basic' | 'medium' | 'full' | 'ultra';
    includeLargeImages?: boolean;
    forceRefresh?: boolean;
  } = {},
  forceRefresh = false
): Promise<any> {
  const key = `product_ultra_optimized:${productIdentifier}:${options.organizationId}:${options.dataScope}`;

  return requestDeduplicator.execute(
    key,
    async () => {
      const startTime = performance.now();

      try {
        // ✅ تحديث: استخدام الدالتين الجديدتين المنفصلتين
        const { getProductCombinedDataUltraFast } = await import('./productUltraFastApi');

        // تحويل خيارات dataScope إلى خيارات API الجديد
        const fastOptions = {
          organizationId: options.organizationId,
          includeInactive: options.includeInactive,
          includeExtended: options.dataScope !== 'basic',
          includeThumbnails: true,
          includeColorsBasic: true,
          includeLargeImages: options.includeLargeImages || false,
          includeMarketingData: options.dataScope === 'full' || options.dataScope === 'ultra',
          includeFormData: options.dataScope === 'full' || options.dataScope === 'ultra',
          includeAdvancedSettings: options.dataScope === 'ultra',
          dataDetailLevel: (options.dataScope === 'ultra' ? 'ultra' : 'full') as 'full' | 'ultra' | 'standard'
        };

        // تحديد السياق حسب dataScope
        let context: 'list' | 'card' | 'detail' | 'full' = 'detail';
        if (options.dataScope === 'basic') context = 'card';
        else if (options.dataScope === 'ultra') context = 'full';

        const data = await getProductCombinedDataUltraFast(productIdentifier, fastOptions);

        // 🔥 تحسين: حفظ البيانات في localStorage للتحميل السريع
        try {
          const cacheData = {
            data,
            timestamp: Date.now(),
            productId: productIdentifier,
            scope: options.dataScope
          };
          localStorage.setItem(`bazaar_product_ultra_${productIdentifier}_${options.dataScope}`, JSON.stringify(cacheData));
        } catch (e) {
          // تجاهل أخطاء localStorage
        }

        return data;
      } catch (error) {
        console.error('Error in getProductCompleteDataUltraOptimized:', error);
        throw error;
      }
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 15 دقيقة للبيانات المنتج
      forceRefresh: options.forceRefresh || forceRefresh,
      useCache: true
    }
  );
}

/**
 * 🔥 تحسين: جلب البيانات الأساسية للمتجر فقط (للصفحات التي لا تحتاج البيانات الكاملة)
 */
export async function getStoreBasicData(
  orgSubdomain: string,
  forceRefresh = false
): Promise<any> {
  const key = `store_basic_data:${orgSubdomain}`;

  return requestDeduplicator.execute(
    key,
    async () => {
      const startTime = performance.now();

      try {
        // استدعاء RPC للبيانات الكاملة
        const { data, error } = await supabase.rpc('get_store_init_data' as any, {
          org_identifier: orgSubdomain
        });

        if (error) {
          console.warn('RPC get_store_init_data failed, using fallback:', error);
          // استخدم الدالة الجزئية كـ fallback
          return await getStoreInitDataPartial(orgSubdomain, ['basic'], forceRefresh);
        }

        // 🔥 تحسين: حفظ البيانات في localStorage للتحميل السريع
        try {
          const cacheData = {
            data,
            timestamp: Date.now(),
            subdomain: orgSubdomain
          };
          localStorage.setItem('bazaar_store_basic_data', JSON.stringify(cacheData));
        } catch (e) {
          // تجاهل أخطاء localStorage
        }

        return data;
      } catch (error) {
        console.error('Error in getStoreBasicData:', error);
        // استخدم الدالة الجزئية كـ fallback
        return await getStoreInitDataPartial(orgSubdomain, ['basic'], forceRefresh);
      }
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 15 دقيقة للبيانات الأساسية
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * جلب بيانات تهيئة المتجر مع منع التكرار - محسن للسرعة
 */
/**
 * 🔥 تحسين: جلب بيانات المتجر مع تحميل جزئي للأقسام المطلوبة
 */
export async function getStoreInitDataPartial(
  orgSubdomain: string,
  sections: string[] = ['all'],
  forceRefresh = false
): Promise<any> {
  const key = `store_init_partial:${orgSubdomain}:${sections.sort().join('_')}`;

  return requestDeduplicator.execute(
    key,
    async () => {
      const startTime = performance.now();

      try {
        // استدعاء RPC مع معامل sections
        const { data, error } = await supabase.rpc('get_store_init_data_partial' as any, {
          org_identifier: orgSubdomain,
          requested_sections: sections.length > 0 ? sections : ['all']
        });

        if (error) {
          console.warn('RPC get_store_init_data_partial failed, using fallback:', error);
          // استخدم الدالة الكاملة كـ fallback
          return await getStoreInitData(orgSubdomain, forceRefresh);
        }

        // 🔥 تحسين: حفظ البيانات في localStorage للتحميل السريع
        try {
          const cacheData = {
            data,
            timestamp: Date.now(),
            subdomain: orgSubdomain,
            sections
          };
          localStorage.setItem(`bazaar_store_init_partial_${sections.join('_')}`, JSON.stringify(cacheData));
        } catch (e) {
          // تجاهل أخطاء localStorage
        }

        return data;
      } catch (error) {
        console.error('Error in getStoreInitDataPartial:', error);
        // استخدم الدالة الكاملة كـ fallback
        return await getStoreInitData(orgSubdomain, forceRefresh);
      }
    },
    {
      ttl: requestDeduplicator.getLongTTL(), // 🔥 تحسين: استخدام Long TTL (15 دقيقة) للبيانات الجزئية
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * 🔥 دالة محسنة لجلب بيانات المتجر مع fallback للنطاقات المخصصة
 */
export async function getStoreInitDataWithCustomDomainFallback(
  orgIdentifier: string,
  forceRefresh = false
): Promise<any> {
  const key = `store_init_custom_domain_fallback:${orgIdentifier}`;

  return requestDeduplicator.execute(
    key,
    async () => {
      const startTime = performance.now();

      try {
        // استخدام الدالة الجديدة المحسنة
        const { data, error } = await supabase.rpc('get_store_init_data_with_custom_domain_fallback' as any, { org_identifier: orgIdentifier });

        if (error) {
          console.warn('RPC get_store_init_data_with_custom_domain_fallback failed:', error);
          // fallback للدالة العادية
          return await getStoreInitData(orgIdentifier, forceRefresh);
        }

        // 🔥 تحسين: حفظ البيانات في localStorage للتحميل السريع
        try {
          const cacheData = {
            data,
            timestamp: Date.now(),
            identifier: orgIdentifier,
            fallback_used: (data as any)?.custom_domain_fallback?.fallback_used || false
          };
          localStorage.setItem('bazaar_store_custom_domain_fallback', JSON.stringify(cacheData));
        } catch (e) {
          // تجاهل أخطاء localStorage
        }

        return data;
      } catch (error) {
        console.error('Error in getStoreInitDataWithCustomDomainFallback:', error);
        // fallback للدالة العادية
        return await getStoreInitData(orgIdentifier, forceRefresh);
      }
    },
    {
      ttl: requestDeduplicator.getLongTTL() * 2, // زيادة TTL للنطاقات المخصصة
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * 🔥 دالة للبحث المباشر عن subdomain من النطاق المخصص
 */
export async function getStoreInitDataByCustomDomain(
  hostname: string,
  forceRefresh = false
): Promise<any> {
  const key = `store_init_custom_domain:${hostname}`;

  return requestDeduplicator.execute(
    key,
    async () => {
      const startTime = performance.now();

      try {
        console.log('🔍 [getStoreInitDataByCustomDomain] البحث عن subdomain من:', hostname);

        // استخراج subdomain من hostname
        const parts = hostname.split('.');
        if (parts.length >= 3 && parts[0] && parts[0] !== 'www') {
          const potentialSubdomain = parts[0];
          console.log('🔍 [getStoreInitDataByCustomDomain] استخراج subdomain:', potentialSubdomain);

          // أولاً جرب البحث بالـ subdomain المستخرج
          try {
            const subdomainData = await getStoreInitData(potentialSubdomain);
            if (subdomainData && !subdomainData.error && subdomainData.organization_details) {
              console.log('✅ [getStoreInitDataByCustomDomain] تم العثور على البيانات بالـ subdomain:', potentialSubdomain);
              return subdomainData;
            }
          } catch (e) {
            console.warn('⚠️ [getStoreInitDataByCustomDomain] فشل البحث بالـ subdomain:', potentialSubdomain);
          }

          // إذا لم يعمل، جرب إضافة "collection"
          if (potentialSubdomain.length >= 3 && !potentialSubdomain.includes('collection')) {
            const fullSubdomain = potentialSubdomain + 'collection';
            console.log('🔍 [getStoreInitDataByCustomDomain] محاولة مع collection:', fullSubdomain);

            try {
              const fullSubdomainData = await getStoreInitData(fullSubdomain);
              if (fullSubdomainData && !fullSubdomainData.error && fullSubdomainData.organization_details) {
                console.log('✅ [getStoreInitDataByCustomDomain] تم العثور على البيانات بالـ full subdomain:', fullSubdomain);
                return fullSubdomainData;
              }
            } catch (e) {
              console.warn('⚠️ [getStoreInitDataByCustomDomain] فشل البحث بالـ full subdomain:', fullSubdomain);
            }
          }
        }

        // إذا لم يعمل أي شيء، أعد null
        console.log('❌ [getStoreInitDataByCustomDomain] لم يتم العثور على أي بيانات');
        return null;
      } catch (error) {
        console.error('🚨 [getStoreInitDataByCustomDomain] خطأ:', error);
        return null;
      }
    },
    {
      ttl: requestDeduplicator.getLongTTL(),
      forceRefresh,
      useCache: true
    }
  );
}

export async function getStoreInitData(
  orgSubdomain: string,
  forceRefresh = false
): Promise<any> {
  const key = `store_init_data:${orgSubdomain}`;

  return requestDeduplicator.execute(
    key,
    async () => {
      const startTime = performance.now();

      try {
        // 🔥 استخدام الدالة المحسنة مع fallback للنطاقات المخصصة
        const { data, error } = await supabase.rpc('get_store_init_data_with_custom_domain_fallback' as any, { org_identifier: orgSubdomain });

        if (error) {
          console.warn('RPC get_store_init_data failed, using fallback:', error);
          // في حالة فشل الـ RPC، استخدم fallback
          const fallback = await getStoreInitDataFallback(orgSubdomain);
          return fallback;
        }

        // 🔥 تحسين: حفظ البيانات في localStorage للتحميل السريع
        try {
          const cacheData = {
            data,
            timestamp: Date.now(),
            subdomain: orgSubdomain
          };
          localStorage.setItem('bazaar_store_init_data', JSON.stringify(cacheData));
        } catch (e) {
          // تجاهل أخطاء localStorage
        }

        return data;
      } catch (error) {
        console.error('Error in getStoreInitData:', error);
        // في حالة أي خطأ، استخدم fallback
        const fallback = await getStoreInitDataFallback(orgSubdomain);

        // 🔥 تحسين: حفظ البيانات في localStorage حتى لو كانت من fallback
        try {
          const cacheData = {
            data: fallback,
            timestamp: Date.now(),
            subdomain: orgSubdomain
          };
          localStorage.setItem('bazaar_store_init_data', JSON.stringify(cacheData));
        } catch (e) {
          // تجاهل أخطاء localStorage
        }

        return fallback;
      }
    },
    {
      ttl: requestDeduplicator.getLongTTL() * 2, // 🔥 تحسين: زيادة TTL إلى 30 دقيقة - البيانات مستقرة جداً
      forceRefresh,
      useCache: true
    }
  );
}

/**
 * مسح الكاش للمنتج
 */
export function clearProductCache(productIdentifier: string): void {
  // مسح جميع الكاش المرتبط بالمنتج
  const keys = [
    `product_complete_optimized:${productIdentifier}`,
    `product:${productIdentifier}`
  ];
  
  keys.forEach(keyPrefix => {
    requestDeduplicator.clearCache(keyPrefix);
  });
  
}

/**
 * مسح الكاش للمتجر
 */
export function clearStoreCache(orgSubdomain: string): void {
  requestDeduplicator.clearCache(`store_init_data:${orgSubdomain}`);
}

/**
 * مسح جميع الكاش
 */
export function clearAllCache(): void {
  requestDeduplicator.clearAllCache();
}

// Fallback: بناء بيانات المتجر عبر REST بدلاً من RPC
async function getStoreInitDataFallback(orgIdentifier: string): Promise<any> {
  try {

    // تحديد المؤسسة عبر السابدومين أولاً، ثم الدومين كاحتياط
    let organization: any = null;
    {
      const { data: orgBySub, error: orgBySubErr } = await supabase
        .from('organizations')
        .select('*')
        .eq('subdomain', orgIdentifier)
        .eq('subscription_status', 'active')
        .maybeSingle();

      if (orgBySubErr) {
        // تجاهل الخطأ وحاول عبر الدومين
      }

      if (orgBySub) {
        organization = orgBySub;
      } else {
        const { data: orgByDomain } = await supabase
          .from('organizations')
          .select('*')
          .eq('domain', orgIdentifier)
          .eq('subscription_status', 'active')
          .maybeSingle();
        if (orgByDomain) organization = orgByDomain;
      }
    }

    if (!organization) {
      throw new Error('Organization not found for identifier: ' + orgIdentifier);
    }

    const organizationId = organization.id as string;

    // جلب البيانات الأساسية بالتوازي
    const [settingsRes, categoriesRes, featuredRes, productsFirstRes] = await Promise.all([
      supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabase
        .from('product_categories')
        .select('id, name, slug, image_url, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(100),
      supabase
        .from('products')
        .select(`
          id, name, description, price, compare_at_price,
          thumbnail_image, images, stock_quantity,
          is_featured, is_new, category_id, slug,
          category:category_id(id, name, slug),
          subcategory:subcategory_id(id, name, slug)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('products')
        .select(`
          id, name, description, price, compare_at_price,
          thumbnail_image, images, stock_quantity,
          is_featured, is_new, category_id, slug,
          category:category_id(id, name, slug),
          subcategory:subcategory_id(id, name, slug)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(48)
    ]);

    const fallbackData = {
      organization_details: organization,
      organization_settings: settingsRes.data || null,
      categories: categoriesRes.data || [],
      featured_products: featuredRes.data || [],
      products_first_page: productsFirstRes.data || [],
      store_layout_components: [],
      footer_settings: null,
      testimonials: [],
      seo_meta: null,
      cacheTimestamp: new Date().toISOString()
    };

    return fallbackData;
  } catch (err) {
    throw err;
  }
}

// دالة fallback لجلب البيانات الأساسية من جدول products
async function getBasicProductDataFallback(productIdentifier: string, organizationId?: string): Promise<any> {
  try {
    
    // البحث عن المنتج في جدول products
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(id, name, slug),
        subcategory:product_subcategories(id, name, slug),
        product_colors(*, product_sizes(*))
      `)
      .eq('is_active', true);
    
    // إذا كان slug، استخدم organization_id
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    // البحث بـ slug أو ID
    if (productIdentifier.length === 36 && productIdentifier.includes('-')) {
      query = query.eq('id', productIdentifier);
    } else {
      query = query.eq('slug', productIdentifier);
    }
    
    const { data: products, error } = await query.single();
    
    if (error || !products) {
      throw new Error('المنتج غير موجود');
    }
    
    // تحويل البيانات إلى النوع المطلوب
    const basicResponse = {
      success: true,
      data_scope: 'basic',
      product: products,
      stats: null,
      meta: {
        query_timestamp: new Date().toISOString(),
        data_freshness: 'fallback',
        performance_optimized: false,
        organization_id: organizationId || '',
        form_strategy: 'default_form_used'
      }
    };
    
    return basicResponse;
    
  } catch (error) {
    throw error;
  }
}
