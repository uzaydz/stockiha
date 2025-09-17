/**
 * مساعد للحصول على معلومات المتجر فوراً من مصادر مختلفة
 * يستخدم لعرض اسم المتجر في عنوان الصفحة قبل تحميل البيانات
 */

interface InstantStoreInfo {
  name?: string;
  description?: string;
  logoUrl?: string;
  faviconUrl?: string;
  source: string;
}

/**
 * الحصول على اسم المتجر فوراً من مصادر متعددة
 */
export function getInstantStoreName(): InstantStoreInfo | null {
  try {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    
    // إذا كان localhost أو www، لا نفعل شيئاً
    if (subdomain === 'localhost' || subdomain === 'www' || hostname === 'localhost') {
      return null;
    }

    // 1. البحث في sessionStorage أولاً (أسرع مصدر)
    try {
      const sessionData = sessionStorage.getItem(`store_${subdomain}`);
      if (sessionData) {
        const storeInfo = JSON.parse(sessionData);
        if (storeInfo.name) {
          return {
            name: storeInfo.name,
            description: storeInfo.description,
            logoUrl: storeInfo.logo_url,
            faviconUrl: storeInfo.favicon_url,
            source: 'sessionStorage'
          };
        }
      }
    } catch (e) {
      // تجاهل أخطاء parsing
    }

    // 2. البحث في localStorage للمؤسسة المحفوظة
    try {
      const organizationId = localStorage.getItem('bazaar_organization_id');
      if (organizationId) {
        // بيانات المؤسسة الأساسية
        const orgData = localStorage.getItem(`bazaar_organization_${organizationId}`);
        if (orgData) {
          const parsed = JSON.parse(orgData);
          if (parsed.name && parsed.subdomain === subdomain) {
            return {
              name: parsed.name,
              description: parsed.description,
              logoUrl: parsed.logo_url,
              source: 'localStorage-org'
            };
          }
        }
        
        // إعدادات المؤسسة
        const orgSettings = localStorage.getItem(`bazaar_org_settings_${organizationId}`);
        if (orgSettings) {
          const parsed = JSON.parse(orgSettings);
          if (parsed.site_name) {
            return {
              name: parsed.site_name,
              description: parsed.seo_meta_description,
              logoUrl: parsed.logo_url,
              faviconUrl: parsed.favicon_url,
              source: 'localStorage-settings'
            };
          }
        }
      }
    } catch (e) {
      // تجاهل أخطاء parsing
    }

    // 3. البحث في early preload cache
    try {
      const earlyPreload = localStorage.getItem(`early_preload_${subdomain}`);
      if (earlyPreload) {
        const data = JSON.parse(earlyPreload);
        const orgDetails = data.data?.organization_details;
        const orgSettings = data.data?.organization_settings;
        
        if (orgDetails?.name || orgSettings?.site_name) {
          return {
            name: orgDetails?.name || orgSettings?.site_name,
            description: orgDetails?.description || orgSettings?.seo_meta_description,
            logoUrl: orgDetails?.logo_url || orgSettings?.logo_url,
            faviconUrl: orgSettings?.favicon_url,
            source: 'early-preload'
          };
        }
      }
    } catch (e) {
      // تجاهل أخطاء parsing
    }

    // 4. البحث في window object (إذا كان متوفراً)
    try {
      const windowOrg = (window as any).__TENANT_CONTEXT_ORG__;
      if (windowOrg?.name) {
        return {
          name: windowOrg.name,
          description: windowOrg.description,
          logoUrl: windowOrg.logo_url,
          source: 'window-object'
        };
      }
    } catch (e) {
      // تجاهل أخطاء window object
    }

    // 5. البحث في app init data
    try {
      const appInitData = localStorage.getItem('bazaar_app_init_data');
      if (appInitData) {
        const data = JSON.parse(appInitData);
        if (data.organization?.name) {
          return {
            name: data.organization.name,
            description: data.organization.description,
            logoUrl: data.organization.logo_url,
            source: 'app-init-data'
          };
        }
      }
    } catch (e) {
      // تجاهل أخطاء parsing
    }

    return null;
  } catch (error) {
    console.warn('خطأ في getInstantStoreName:', error);
    return null;
  }
}

/**
 * تعيين عنوان الصفحة فوراً باستخدام اسم المتجر
 */
export function setInstantPageTitle(): boolean {
  const storeInfo = getInstantStoreName();
  
  if (storeInfo?.name) {
    document.title = storeInfo.name;
    
    // حفظ في sessionStorage للاستخدام السريع
    const subdomain = window.location.hostname.split('.')[0];
    if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
      try {
        sessionStorage.setItem(`instant_store_${subdomain}`, JSON.stringify({
          name: storeInfo.name,
          description: storeInfo.description,
          timestamp: Date.now()
        }));
      } catch (e) {
        // تجاهل أخطاء sessionStorage
      }
    }
    
    return true;
  }
  
  return false;
}

/**
 * تحديث favicon فوراً إذا كان متوفراً
 */
export function setInstantFavicon(): boolean {
  const storeInfo = getInstantStoreName();
  
  if (storeInfo?.faviconUrl || storeInfo?.logoUrl) {
    try {
      // إزالة الفافيكون الموجود
      const existingFavicon = document.querySelector('link[rel="icon"]');
      if (existingFavicon) {
        existingFavicon.remove();
      }
      
      // إنشاء فافيكون جديد
      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = 'image/x-icon';
      favicon.href = (storeInfo.faviconUrl || storeInfo.logoUrl) + '?v=' + Date.now();
      
      document.head.appendChild(favicon);
      return true;
    } catch (e) {
      // تجاهل أخطاء الفافيكون
    }
  }
  
  return false;
}

/**
 * تطبيق معلومات المتجر الفورية (العنوان + الفافيكون)
 */
export function applyInstantStoreInfo(): void {
  setInstantPageTitle();
  setInstantFavicon();
}

/**
 * الحصول على subdomain الحالي
 */
export function getCurrentSubdomain(): string | null {
  try {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    if (parts.length > 2 && parts[0] !== 'www') {
      return parts[0];
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * حفظ معلومات المتجر للاستخدام السريع لاحقاً
 */
export function saveInstantStoreInfo(storeInfo: {
  name: string;
  description?: string;
  logoUrl?: string;
  faviconUrl?: string;
  subdomain?: string;
}): void {
  try {
    const subdomain = storeInfo.subdomain || getCurrentSubdomain();
    if (!subdomain) return;
    
    const dataToSave = {
      name: storeInfo.name,
      description: storeInfo.description,
      logo_url: storeInfo.logoUrl,
      favicon_url: storeInfo.faviconUrl,
      timestamp: Date.now()
    };
    
    // حفظ في sessionStorage للجلسة الحالية
    sessionStorage.setItem(`store_${subdomain}`, JSON.stringify(dataToSave));
    
    // حفظ في localStorage للزيارات القادمة
    sessionStorage.setItem(`instant_store_${subdomain}`, JSON.stringify(dataToSave));
    
  } catch (e) {
    // تجاهل أخطاء الحفظ
  }
}
