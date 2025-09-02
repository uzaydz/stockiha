/**
 * مدير التخزين المحلي للمؤسسات
 * منفصل لتحسين الأداء وتنظيم عمليات التخزين
 */

import type { Organization } from '@/types/tenant';

// مفاتيح التخزين المحلي
export const STORAGE_KEYS = {
  ORGANIZATION_ID: 'bazaar_organization_id',
  CURRENT_SUBDOMAIN: 'bazaar_current_subdomain',
  ORGANIZATION_PREFIX: 'bazaar_organization_',
  ORG_SETTINGS_PREFIX: 'bazaar_org_settings_',
  ORG_LANGUAGE_PREFIX: 'org-language-',
  ORG_LANGUAGE_TIMESTAMP_PREFIX: 'org-language-timestamp-',
  RPC_ORG_PREFIX: 'bazaar_rpc_org_details_',
  STORE_PREFIX: 'store_'
} as const;

/**
 * تحديث معرف المؤسسة في التخزين المحلي
 */
export function updateLocalStorageOrgId(organizationId: string | null): void {
  try {
    if (organizationId) {
      const currentStoredId = localStorage.getItem(STORAGE_KEYS.ORGANIZATION_ID);
      if (currentStoredId !== organizationId) {
        if (process.env.NODE_ENV === 'development') {
        }
        localStorage.setItem(STORAGE_KEYS.ORGANIZATION_ID, organizationId);

        // إرسال حدث إعلام بحفظ معرف المؤسسة
        window.dispatchEvent(new CustomEvent('organizationDataSaved', {
          detail: {
            organizationId: organizationId,
            source: 'updateLocalStorageOrgId',
            timestamp: Date.now()
          }
        }));

        if (process.env.NODE_ENV === 'development') {
        }
      }
    } else {
      // إذا كان المعرف فارغاً، قم بحذف المعرف المخزن
      localStorage.removeItem(STORAGE_KEYS.ORGANIZATION_ID);
      if (process.env.NODE_ENV === 'development') {
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
}

/**
 * الحصول على معرف المؤسسة من التخزين المحلي
 */
export function getStoredOrganizationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ORGANIZATION_ID);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
    return null;
  }
}

/**
 * حفظ بيانات المؤسسة في التخزين المحلي
 */
export function saveOrganizationData(organization: Organization): void {
  try {
    const orgDataForCache = {
      id: organization.id,
      name: organization.name,
      description: organization.description || `${organization.name} - متجر إلكتروني متميز`,
      logo_url: organization.logo_url,
      subdomain: organization.subdomain
    };

    localStorage.setItem(
      `${STORAGE_KEYS.ORGANIZATION_PREFIX}${organization.id}`,
      JSON.stringify(orgDataForCache)
    );

    if (process.env.NODE_ENV === 'development') {
    }

    // إرسال حدث إعلام بحفظ بيانات المؤسسة
    window.dispatchEvent(new CustomEvent('organizationDataSaved', {
      detail: {
        organizationId: organization.id,
        organizationName: organization.name,
        source: 'saveOrganizationData',
        timestamp: Date.now()
      }
    }));

    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
}

/**
 * الحصول على بيانات المؤسسة من التخزين المحلي
 */
export function getStoredOrganizationData(orgId: string): any | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEYS.ORGANIZATION_PREFIX}${orgId}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
    return null;
  }
}

/**
 * حفظ إعدادات المؤسسة
 */
export function saveOrganizationSettings(orgId: string, organization: Organization): void {
  try {
    const orgSettings = {
      site_name: organization.name,
      seo_store_title: organization.name,
      seo_meta_description: organization.description || `${organization.name} - أفضل المنتجات بأفضل الأسعار`,
      meta_keywords: `${organization.name}, متجر إلكتروني, تسوق أونلاين`,
      logo_url: organization.logo_url,
      favicon_url: organization.logo_url
    };
    
    localStorage.setItem(
      `${STORAGE_KEYS.ORG_SETTINGS_PREFIX}${orgId}`,
      JSON.stringify(orgSettings)
    );
    
    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
}

/**
 * حفظ معلومات المتجر في session storage
 */
export function saveStoreInfoToSession(
  subdomain: string,
  organization: Organization
): void {
  try {
    if (!subdomain || subdomain === 'main') return;
    
    const storeInfo = {
      name: organization.name,
      description: organization.description || `${organization.name} - متجر إلكتروني متميز`,
      logo_url: organization.logo_url,
      favicon_url: organization.logo_url,
      seo: {
        title: organization.name,
        description: organization.description || `${organization.name} - أفضل المنتجات بأفضل الأسعار`,
        keywords: `${organization.name}, متجر إلكتروني, تسوق أونلاين`,
        og_image: organization.logo_url
      }
    };
    
    sessionStorage.setItem(
      `${STORAGE_KEYS.STORE_PREFIX}${subdomain}`,
      JSON.stringify(storeInfo)
    );
    
    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
}

/**
 * الحصول على بيانات المؤسسة من RPC cache
 */
export function getRPCOrganizationData(subdomain: string): any | null {
  try {
    const rpcOrgKey = `${STORAGE_KEYS.RPC_ORG_PREFIX}${subdomain}`;
    const rpcOrgRaw = localStorage.getItem(rpcOrgKey);
    return rpcOrgRaw ? JSON.parse(rpcOrgRaw) : null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
    return null;
  }
}

/**
 * مسح كل البيانات المتعلقة بالمؤسسة
 */
export function clearOrganizationStorageData(orgId?: string): void {
  try {
    if (orgId) {
      // مسح بيانات مؤسسة محددة
      localStorage.removeItem(`${STORAGE_KEYS.ORGANIZATION_PREFIX}${orgId}`);
      localStorage.removeItem(`${STORAGE_KEYS.ORG_SETTINGS_PREFIX}${orgId}`);
      localStorage.removeItem(`${STORAGE_KEYS.ORG_LANGUAGE_PREFIX}${orgId}`);
      localStorage.removeItem(`${STORAGE_KEYS.ORG_LANGUAGE_TIMESTAMP_PREFIX}${orgId}`);
      
      if (process.env.NODE_ENV === 'development') {
      }
    } else {
      // مسح كل البيانات المتعلقة بالمؤسسات
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith(STORAGE_KEYS.ORGANIZATION_PREFIX) ||
          key.startsWith(STORAGE_KEYS.ORG_SETTINGS_PREFIX) ||
          key.startsWith(STORAGE_KEYS.ORG_LANGUAGE_PREFIX) ||
          key.startsWith(STORAGE_KEYS.RPC_ORG_PREFIX) ||
          key.includes('tenant:') ||
          key.includes('domain:')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (process.env.NODE_ENV === 'development') {
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
}

/**
 * إرسال حدث تحديث بيانات المؤسسة
 */
export function dispatchOrganizationUpdateEvent(
  organization: any,
  settings: any,
  subdomain?: string
): void {
  try {
    if (typeof window === 'undefined') return;
    
    const updateEvent = new CustomEvent('organizationDataUpdated', {
      detail: {
        organization,
        settings,
        subdomain
      }
    });
    
    window.dispatchEvent(updateEvent);
    
    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
    }
  }
}
