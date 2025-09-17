// ===========================================
// نظام إدارة الفافيكون والأيقونات
// ===========================================

import { performanceTracker } from './PerformanceTracker';

/**
 * نظام إدارة الفافيكون والأيقونات المحسن
 * - يطبق الأيقونات مبكراً لتجنب الأيقونة الافتراضية
 * - يدعم مصادر متعددة للبيانات
 * - يتعامل مع أنواع النطاقات المختلفة
 */
export class FaviconManager {
  /**
   * تحليل نوع النطاق والمضيف
   */
  analyzeDomain(): {
    hostname: string;
    parts: string[];
    isLocalhost: boolean;
    isPlatform: boolean;
    hasSubdomain: boolean;
    isCustomDomain: boolean;
    storeIdentifier: string | null;
  } {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
    const platformDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
    const isPlatform = platformDomains.some(d => hostname.endsWith(d));
    const hasSubdomain = !isLocalhost && isPlatform && parts.length > 2 && parts[0] !== 'www';
    const isCustomDomain = !isLocalhost && !isPlatform;

    let storeIdentifier: string | null = null;

    if (isLocalhost && parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
      storeIdentifier = parts[0];
    } else if (hasSubdomain) {
      storeIdentifier = parts[0];
    } else if (isCustomDomain) {
      storeIdentifier = hostname.startsWith('www.') ? hostname.substring(4) : hostname;
    }

    return {
      hostname,
      parts,
      isLocalhost,
      isPlatform,
      hasSubdomain,
      isCustomDomain,
      storeIdentifier
    };
  }

  /**
   * البحث عن رابط الأيقونة واسم المتجر من مصادر متعددة
   */
  findStoreInfo(): { iconUrl: string | null; storeName: string | null } {
    const startTime = performance.now();
    console.log('🔍 [FaviconManager] بدء البحث عن معلومات المتجر - TIME:', startTime);

    const domainInfo = this.analyzeDomain();
    let iconUrl: string | null = null;
    let storeName: string | null = null;

    // البحث في sessionStorage أولاً (الأسرع)
    if (domainInfo.storeIdentifier) {
      const sessionStart = performance.now();
      try {
        // البحث في عدة مفاتيح محتملة
        const possibleKeys = [
          `store_${domainInfo.storeIdentifier}`,
          `store_${domainInfo.hostname}`,
          `store_${domainInfo.hostname.replace(/\./g, '_')}`
        ];

        let sessionData = null;
        let foundKey = null;

        for (const key of possibleKeys) {
          sessionData = sessionStorage.getItem(key);
          if (sessionData) {
            foundKey = key;
            break;
          }
        }

        const sessionEnd = performance.now();
        console.log('📦 [FaviconManager] بحث sessionStorage:', {
          duration: sessionEnd - sessionStart,
          found: !!sessionData,
          foundKey: foundKey,
          triedKeys: possibleKeys,
          time: sessionEnd,
          storeIdentifier: domainInfo.storeIdentifier,
          hostname: domainInfo.hostname
        });

        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          // البحث في البيانات المحفوظة من early preload
          if (parsed.data && parsed.data.organization_settings) {
            const settings = parsed.data.organization_settings;
            iconUrl = settings.favicon_url || settings.logo_url;
            storeName = settings.site_name || parsed.data.organization_details?.name;
          } else if (parsed.favicon_url || parsed.logo_url) {
            // البحث في البيانات القديمة المنسقة
            iconUrl = parsed.favicon_url || parsed.logo_url;
            storeName = parsed.name;
          }

          if (iconUrl && storeName) {
            console.log('✅ [FaviconManager] وُجدت البيانات في sessionStorage:', {
              iconUrl: !!iconUrl,
              storeName: !!storeName,
              duration: performance.now() - startTime
            });
            return { iconUrl, storeName };
          }
        }
      } catch (error) {
        console.log('❌ [FaviconManager] خطأ في sessionStorage:', { error, duration: performance.now() - sessionStart });
      }
    }

    // البحث في localStorage باستخدام معرف المؤسسة
    const localStorageStart = performance.now();
    const orgId = localStorage.getItem('bazaar_organization_id');
    console.log('💾 [FaviconManager] بدء بحث localStorage:', {
      orgId: !!orgId,
      time: localStorageStart
    });

    if (orgId) {
      try {
        const settingsRaw = localStorage.getItem(`bazaar_org_settings_${orgId}`);
        const orgRaw = localStorage.getItem(`bazaar_organization_${orgId}`);

        const localStorageEnd = performance.now();
        console.log('💾 [FaviconManager] بحث localStorage مكتمل:', {
          duration: localStorageEnd - localStorageStart,
          hasSettings: !!settingsRaw,
          hasOrg: !!orgRaw,
          time: localStorageEnd
        });

        if (settingsRaw) {
          const settings = JSON.parse(settingsRaw);
          iconUrl = iconUrl || settings?.favicon_url || settings?.logo_url || null;
          storeName = storeName || settings?.site_name || null;
        }

        if (orgRaw) {
          const org = JSON.parse(orgRaw);
          iconUrl = iconUrl || org?.logo_url || null;
          storeName = storeName || org?.name || null;
        }
      } catch (error) {
        console.log('❌ [FaviconManager] خطأ في localStorage:', { error, duration: performance.now() - localStorageStart });
      }
    }

    // البحث في بيانات early preload
    if (domainInfo.storeIdentifier) {
      const earlyStart = performance.now();
      try {
        const earlyRaw = localStorage.getItem(`early_preload_${domainInfo.storeIdentifier}`);
        const earlyEnd = performance.now();
        console.log('🚀 [FaviconManager] بحث early preload:', {
          duration: earlyEnd - earlyStart,
          found: !!earlyRaw,
          key: `early_preload_${domainInfo.storeIdentifier}`,
          time: earlyEnd
        });

        if (earlyRaw) {
          const early = JSON.parse(earlyRaw);
          const data = early?.data;
          iconUrl = iconUrl || data?.organization_settings?.favicon_url || data?.organization_settings?.logo_url || null;
          storeName = storeName || data?.organization_settings?.site_name || data?.organization_details?.name || null;
        }
      } catch (error) {
        console.log('❌ [FaviconManager] خطأ في early preload:', { error, duration: performance.now() - earlyStart });
      }
    }

    // البحث في window object - جميع المصادر
    const windowStart = performance.now();
    try {
      const win: any = window;
      const windowData = win.__EARLY_STORE_DATA__?.data ||
                        win.__PREFETCHED_STORE_DATA__?.data ||
                        win.__STORE_DATA__ ||
                        null;

      // البحث في البيانات المباشرة أيضاً
      const directOrgSettings = win.__STORE_SETTINGS__;
      const directOrg = win.__STORE_ORGANIZATION__;

      const windowEnd = performance.now();
      console.log('🌐 [FaviconManager] بحث window object:', {
        duration: windowEnd - windowStart,
        hasData: !!windowData,
        hasDirectSettings: !!directOrgSettings,
        hasDirectOrg: !!directOrg,
        time: windowEnd
      });

      if (windowData) {
        iconUrl = iconUrl || windowData?.organization_settings?.favicon_url || windowData?.organization_settings?.logo_url || null;
        storeName = storeName || windowData?.organization_settings?.site_name || windowData?.organization_details?.name || null;
      }

      // البحث في البيانات المباشرة إذا لم نجد شيئاً
      if (!iconUrl || !storeName) {
        iconUrl = iconUrl || directOrgSettings?.favicon_url || directOrgSettings?.logo_url || null;
        storeName = storeName || directOrgSettings?.site_name || directOrg?.name || null;
      }
    } catch (error) {
      console.log('❌ [FaviconManager] خطأ في window object:', { error, duration: performance.now() - windowStart });
    }

    const totalDuration = performance.now() - startTime;
    console.log('🏁 [FaviconManager] اكتمل البحث عن معلومات المتجر:', {
      totalDuration,
      foundIcon: !!iconUrl,
      foundName: !!storeName,
      iconUrl: iconUrl ? 'موجود' : 'غير موجود',
      storeName: storeName ? 'موجود' : 'غير موجود'
    });

    return { iconUrl, storeName };
  }

  /**
   * تطبيق الأيقونة على الصفحة
   */
  applyIcon(iconUrl: string): void {
    try {
      // إزالة الأيقونات الحالية
      document.querySelectorAll('link[rel*="icon"]').forEach((el) => el.parentElement?.removeChild(el));

      const withBust = `${iconUrl}?v=${Date.now()}`;

      // إضافة أيقونة favicon
      const linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      linkIcon.type = 'image/png';
      linkIcon.href = withBust;
      document.head.appendChild(linkIcon);

      // إضافة أيقونة Apple touch
      const linkApple = document.createElement('link');
      linkApple.rel = 'apple-touch-icon';
      linkApple.href = withBust;
      document.head.appendChild(linkApple);

      performanceTracker.log('تم تطبيق الفافيكون', { iconUrl });
    } catch (error) {
      performanceTracker.log('خطأ في تطبيق الفافيكون', { error });
    }
  }

  /**
   * تطبيق اسم المتجر على العنوان
   */
  applyTitle(storeName: string): void {
    try {
      const currentTitle = document.title;
      // لا تغيّر العنوان إذا كان بالفعل يحتوي على اسم المتجر أو إذا كان هناك عنوان SEO مخصص
      if (!currentTitle.includes(storeName) && currentTitle === 'سطوكيها - منصة إدارة المتاجر الذكية') {
        document.title = storeName;
        performanceTracker.log('تم تطبيق اسم المتجر', { storeName });
      }
    } catch (error) {
      performanceTracker.log('خطأ في تطبيق اسم المتجر', { error });
    }
  }

  /**
   * تهيئة نظام الفافيكون والعنوان
   */
  initialize(): void {
    const { iconUrl, storeName } = this.findStoreInfo();
    
    // تطبيق اسم المتجر فوراً إذا وُجد
    if (storeName) {
      this.applyTitle(storeName);
    }
    
    // تطبيق الفافيكون فوراً إذا وُجد
    if (iconUrl) {
      this.applyIcon(iconUrl);
    }

    performanceTracker.log('تم تهيئة مدير الفافيكون والعنوان', { 
      hasIcon: !!iconUrl, 
      hasStoreName: !!storeName 
    });
  }
}

// إنشاء نسخة عالمية
export const faviconManager = new FaviconManager();
