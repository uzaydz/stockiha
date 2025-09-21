// ===========================================
// نظام إدارة الفافيكون والأيقونات
// ===========================================

import { performanceTracker } from './PerformanceTracker';

type StoreMeta = {
  iconUrl: string | null;
  storeName: string | null;
};

type PartialStoreMeta = Partial<StoreMeta>;

const isDevEnvironment = (() => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return !(import.meta as any).env.PROD;
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  return true;
})();

/**
 * نظام إدارة الفافيكون والأيقونات المحسن
 * - يطبق الأيقونات مبكراً لتجنب الأيقونة الافتراضية
 * - يدعم مصادر متعددة للبيانات
 * - يتعامل مع أنواع النطاقات المختلفة
 */
export class FaviconManager {
  private log(message: string, payload?: Record<string, unknown>): void {
    if (!isDevEnvironment) {
      return;
    }
    console.log(`🧭 [FaviconManager] ${message}`, payload ?? {});
  }

  private extractMeta(payload: any): PartialStoreMeta {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const organizationSettings = payload.organization_settings || payload.organizationSettings || null;
    const organizationDetails =
      payload.organization_details || payload.organization || payload.organizationDetails || null;

    const iconUrl =
      organizationSettings?.favicon_url ??
      organizationSettings?.logo_url ??
      organizationDetails?.logo_url ??
      null;

    const storeName =
      organizationSettings?.site_name ?? organizationDetails?.name ?? payload.name ?? null;

    return { iconUrl: iconUrl ?? null, storeName: storeName ?? null };
  }

  private mergeMeta(...entries: PartialStoreMeta[]): StoreMeta {
    return entries.reduce<StoreMeta>(
      (acc, entry) => ({
        iconUrl: acc.iconUrl ?? entry.iconUrl ?? null,
        storeName: acc.storeName ?? entry.storeName ?? null
      }),
      { iconUrl: null, storeName: null }
    );
  }

  private readFromSessionStorage(storeIdentifier: string | null, hostname: string): PartialStoreMeta {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      const keys = [
        storeIdentifier ? `store_${storeIdentifier}` : null,
        `store_${hostname}`,
        `store_${hostname.replace(/\./g, '_')}`
      ].filter(Boolean) as string[];

      for (const key of keys) {
        const raw = sessionStorage.getItem(key);
        if (!raw) {
          continue;
        }

        try {
          const parsed = JSON.parse(raw);
          if (parsed?.data) {
            const meta = this.extractMeta(parsed.data);
            if (meta.iconUrl || meta.storeName) {
              this.log('sessionStorage hit', { key });
              return meta;
            }
          }

          const legacyMeta = this.extractMeta(parsed);
          if (legacyMeta.iconUrl || legacyMeta.storeName) {
            this.log('sessionStorage legacy hit', { key });
            return legacyMeta;
          }
        } catch (error) {
          this.log('sessionStorage parse error', { key, error });
        }
      }
    } catch (error) {
      this.log('sessionStorage access error', { error });
    }

    return {};
  }

  private readFromLocalStorage(storeIdentifier: string | null): PartialStoreMeta {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      const orgId = localStorage.getItem('bazaar_organization_id');
      if (!orgId && !storeIdentifier) {
        return {};
      }

      const entries: PartialStoreMeta[] = [];

      if (orgId) {
        const settingsRaw = localStorage.getItem(`bazaar_org_settings_${orgId}`);
        const orgRaw = localStorage.getItem(`bazaar_organization_${orgId}`);

        if (settingsRaw) {
          try {
            entries.push(this.extractMeta(JSON.parse(settingsRaw)));
          } catch (error) {
            this.log('localStorage settings parse error', { error });
          }
        }

        if (orgRaw) {
          try {
            entries.push(this.extractMeta(JSON.parse(orgRaw)));
          } catch (error) {
            this.log('localStorage organization parse error', { error });
          }
        }
      }

      if (storeIdentifier) {
        const preloadRaw = localStorage.getItem(`early_preload_${storeIdentifier}`);
        if (preloadRaw) {
          try {
            const parsed = JSON.parse(preloadRaw);
            entries.push(this.extractMeta(parsed?.data));
          } catch (error) {
            this.log('early preload parse error', { error });
          }
        }
      }

      return this.mergeMeta(...entries);
    } catch (error) {
      this.log('localStorage access error', { error });
      return {};
    }
  }

  private readFromWindow(): PartialStoreMeta {
    if (typeof window === 'undefined') {
      return {};
    }

    const win: any = window;
    const candidates = [
      win.__EARLY_STORE_DATA__?.data,
      win.__PREFETCHED_STORE_DATA__?.data ?? win.__PREFETCHED_STORE_DATA__,
      win.__CURRENT_STORE_DATA__,
      win.__STORE_DATA__,
      {
        organization_settings: win.__STORE_SETTINGS__,
        organization_details: win.__STORE_ORGANIZATION__
      }
    ];

    for (const payload of candidates) {
      const meta = this.extractMeta(payload);
      if (meta.iconUrl || meta.storeName) {
        this.log('window data hit');
        return meta;
      }
    }

    return {};
  }

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
  findStoreInfo(): StoreMeta {
    const domainInfo = this.analyzeDomain();

    const sessionMeta = this.readFromSessionStorage(domainInfo.storeIdentifier, domainInfo.hostname);
    const windowMeta = this.readFromWindow();
    const localMeta = this.readFromLocalStorage(domainInfo.storeIdentifier);

    const meta = this.mergeMeta(sessionMeta, windowMeta, localMeta);
    this.log('resolved meta', meta);
    return meta;
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
