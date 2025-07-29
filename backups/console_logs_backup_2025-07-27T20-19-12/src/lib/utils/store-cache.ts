/**
 * نظام Cache محسن لبيانات المتاجر والسيو
 */

export interface StoreData {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  subdomain: string;
}

export interface StoreSettings {
  site_name: string;
  seo_store_title?: string;
  seo_meta_description?: string;
  meta_keywords?: string;
  logo_url?: string;
  favicon_url?: string;
}

export interface StoreSEOData {
  title: string;
  description: string;
  keywords?: string;
  og_image?: string;
}

export interface CachedStoreInfo {
  name: string;
  description?: string;
  logo_url?: string;
  favicon_url?: string;
  seo: StoreSEOData;
}

/**
 * حفظ بيانات المتجر في Cache
 */
export function saveStoreToCache(
  organizationId: string,
  storeData: StoreData,
  storeSettings: StoreSettings
): void {
  try {
    // حفظ بيانات المؤسسة
    localStorage.setItem('bazaar_organization_id', organizationId);
    localStorage.setItem(`bazaar_organization_${organizationId}`, JSON.stringify(storeData));
    localStorage.setItem(`bazaar_org_settings_${organizationId}`, JSON.stringify(storeSettings));
    
    // حفظ في session storage للوصول السريع
    const subdomain = storeData.subdomain;
    if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
      const cachedInfo: CachedStoreInfo = {
        name: storeData.name,
        description: storeData.description,
        logo_url: storeSettings.logo_url || storeData.logo_url,
        favicon_url: storeSettings.favicon_url,
        seo: {
          title: storeSettings.seo_store_title || storeSettings.site_name || storeData.name,
          description: storeSettings.seo_meta_description || storeData.description || `متجر ${storeData.name} - أفضل المنتجات بأفضل الأسعار`,
          keywords: storeSettings.meta_keywords || '',
          og_image: storeSettings.logo_url || storeData.logo_url
        }
      };
      
      sessionStorage.setItem(`store_${subdomain}`, JSON.stringify(cachedInfo));
    }
    
  } catch (error) {
    console.warn('خطأ في حفظ بيانات المتجر في Cache:', error);
  }
}

/**
 * استرجاع بيانات المتجر من Cache
 */
export function getStoreFromCache(subdomain: string): CachedStoreInfo | null {
  try {
    // محاولة من localStorage أولاً
    const orgId = localStorage.getItem('bazaar_organization_id');
    if (orgId) {
      const orgData = localStorage.getItem(`bazaar_organization_${orgId}`);
      const orgSettings = localStorage.getItem(`bazaar_org_settings_${orgId}`);
      
      if (orgData && orgSettings) {
        const org: StoreData = JSON.parse(orgData);
        const settings: StoreSettings = JSON.parse(orgSettings);
        
        if (org.subdomain === subdomain) {
          return {
            name: org.name,
            description: org.description,
            logo_url: settings.logo_url || org.logo_url,
            favicon_url: settings.favicon_url,
            seo: {
              title: settings.seo_store_title || settings.site_name || org.name,
              description: settings.seo_meta_description || org.description || `متجر ${org.name} - أفضل المنتجات بأفضل الأسعار`,
              keywords: settings.meta_keywords || '',
              og_image: settings.logo_url || org.logo_url
            }
          };
        }
      }
    }
    
    // محاولة من sessionStorage
    const sessionData = sessionStorage.getItem(`store_${subdomain}`);
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    
    return null;
  } catch (error) {
    console.warn('خطأ في استرجاع بيانات المتجر من Cache:', error);
    return null;
  }
}

/**
 * مسح Cache البيانات
 */
export function clearStoreCache(subdomain?: string): void {
  try {
    if (subdomain) {
      sessionStorage.removeItem(`store_${subdomain}`);
    }
    
    // مسح Cache المؤسسة إذا لم يعد مطلوباً
    const orgId = localStorage.getItem('bazaar_organization_id');
    if (orgId) {
      localStorage.removeItem(`bazaar_organization_${orgId}`);
      localStorage.removeItem(`bazaar_org_settings_${orgId}`);
    }
    localStorage.removeItem('bazaar_organization_id');
    
  } catch (error) {
    console.warn('خطأ في مسح Cache المتجر:', error);
  }
}

/**
 * تحديث السيو في Cache
 */
export function updateStoreSEOCache(subdomain: string, seoData: Partial<StoreSEOData>): void {
  try {
    const existingData = getStoreFromCache(subdomain);
    if (existingData) {
      existingData.seo = {
        ...existingData.seo,
        ...seoData
      };
      sessionStorage.setItem(`store_${subdomain}`, JSON.stringify(existingData));
    }
  } catch (error) {
    console.warn('خطأ في تحديث السيو في Cache:', error);
  }
} 