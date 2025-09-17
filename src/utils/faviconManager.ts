/**
 * مدير الفافيكون - لإدارة وتحديث فافيكون المتجر
 */

interface FaviconOptions {
  faviconUrl?: string;
  logoUrl?: string;
  storeName?: string;
  forceUpdate?: boolean;
}

/**
 * تحديث فافيكون الصفحة
 */
export function updateFavicon({
  faviconUrl,
  logoUrl,
  storeName = 'متجر',
  forceUpdate = false
}: FaviconOptions): boolean {
  try {
    // إذا لم نكن نريد تحديث قسري، تحقق إن كان الفافيكون موجود بالفعل
    if (!forceUpdate) {
      const existingFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (existingFavicon && existingFavicon.href && !existingFavicon.href.includes('data:image/svg+xml')) {
        return false; // فافيكون حقيقي موجود بالفعل
      }
    }

    // إزالة جميع الفافيكونات الموجودة
    document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove());

    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/x-icon';

    // أولوية للفافيكون المخصص، ثم اللوغو، ثم SVG احتياطي
    const iconUrl = faviconUrl || logoUrl;
    
    if (iconUrl && iconUrl.trim()) {
      // استخدام فافيكون/لوغو المتجر الحقيقي
      favicon.href = iconUrl.includes('?') ? iconUrl : `${iconUrl}?v=${Date.now()}`;
      
      // إضافة معالج خطأ للتعامل مع فشل التحميل
      favicon.onerror = () => {
        console.warn('فشل تحميل الفافيكون، استخدام الاحتياطي');
        updateFavicon({ storeName, forceUpdate: true }); // استخدام الاحتياطي
      };
    } else {
      // إنشاء فافيكون SVG احتياطي مع الحرف الأول من اسم المتجر
      const initial = storeName.charAt(0);
      const svgIcon = createFaviconSVG(initial);
      favicon.href = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgIcon)))}`;
    }

    document.head.appendChild(favicon);

    // إضافة shortcut icon للدعم الأوسع
    const shortcut = favicon.cloneNode(true) as HTMLLinkElement;
    shortcut.rel = 'shortcut icon';
    document.head.appendChild(shortcut);

    // حفظ URL الفافيكون للاستخدام السريع
    cacheFaviconUrl(iconUrl, storeName);

    return true;
  } catch (error) {
    console.warn('خطأ في تحديث الفافيكون:', error);
    return false;
  }
}

/**
 * إنشاء SVG للفافيكون الاحتياطي
 */
function createFaviconSVG(initial: string): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#grad)"/>
      <path d="M25 35h50l-5 30H30z" fill="white" opacity="0.9"/>
      <circle cx="35" cy="75" r="5" fill="white"/>
      <circle cx="65" cy="75" r="5" fill="white"/>
      <text x="50" y="55" text-anchor="middle" font-family="Arial" font-size="28" font-weight="bold" fill="white">${initial}</text>
    </svg>
  `;
}

/**
 * حفظ URL الفافيكون في الكاش
 */
function cacheFaviconUrl(iconUrl?: string, storeName?: string): void {
  try {
    const subdomain = window.location.hostname.split('.')[0];
    if (subdomain && subdomain !== 'localhost' && subdomain !== 'www' && iconUrl) {
      localStorage.setItem(`favicon_${subdomain}`, iconUrl);
      sessionStorage.setItem(`favicon_${subdomain}`, iconUrl);
      
      // حفظ معلومات إضافية
      const faviconInfo = {
        url: iconUrl,
        storeName,
        timestamp: Date.now()
      };
      localStorage.setItem(`favicon_info_${subdomain}`, JSON.stringify(faviconInfo));
    }
  } catch (error) {
    // تجاهل أخطاء التخزين
  }
}

/**
 * الحصول على URL الفافيكون المحفوظ
 */
export function getCachedFaviconUrl(): string | null {
  try {
    const subdomain = window.location.hostname.split('.')[0];
    if (!subdomain || subdomain === 'localhost' || subdomain === 'www') {
      return null;
    }

    // البحث في الكاش المباشر أولاً
    const cached = localStorage.getItem(`favicon_${subdomain}`) || 
                   sessionStorage.getItem(`favicon_${subdomain}`);
    
    if (cached) {
      return cached;
    }

    // البحث في معلومات الفافيكون المفصلة
    const faviconInfo = localStorage.getItem(`favicon_info_${subdomain}`);
    if (faviconInfo) {
      const parsed = JSON.parse(faviconInfo);
      // التحقق من أن البيانات ليست قديمة جداً (أقل من يوم)
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.url;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * تحديث فوري للفافيكون من البيانات المحفوظة
 */
export function applyInstantFavicon(): boolean {
  try {
    const subdomain = window.location.hostname.split('.')[0];
    if (!subdomain || subdomain === 'localhost' || subdomain === 'www') {
      return false;
    }

    let faviconUrl = null;
    let logoUrl = null;
    let storeName = 'متجر';

    // البحث في مصادر مختلفة للحصول على الفافيكون
    
    // 1. البحث في favicon cache المباشر
    faviconUrl = getCachedFaviconUrl();
    
    // 2. البحث في store data المحفوظ
    if (!faviconUrl) {
      try {
        const storeData = sessionStorage.getItem(`store_${subdomain}`) || 
                         localStorage.getItem(`store_quick_${subdomain}`);
        if (storeData) {
          const parsed = JSON.parse(storeData);
          faviconUrl = parsed.favicon_url;
          logoUrl = parsed.logo_url;
          storeName = parsed.name || storeName;
        }
      } catch (e) {}
    }

    // 3. البحث في early preload data
    if (!faviconUrl && !logoUrl) {
      try {
        const earlyData = localStorage.getItem(`early_preload_${subdomain}`);
        if (earlyData) {
          const parsed = JSON.parse(earlyData);
          faviconUrl = parsed.data?.organization_settings?.favicon_url;
          logoUrl = parsed.data?.organization_settings?.logo_url || 
                   parsed.data?.organization_details?.logo_url;
          storeName = parsed.data?.organization_details?.name || 
                     parsed.data?.organization_settings?.site_name || storeName;
        }
      } catch (e) {}
    }

    // تحديث الفافيكون إذا وجدنا أي رابط
    if (faviconUrl || logoUrl) {
      return updateFavicon({
        faviconUrl,
        logoUrl,
        storeName,
        forceUpdate: true
      });
    }

    return false;
  } catch (error) {
    console.warn('خطأ في تطبيق الفافيكون الفوري:', error);
    return false;
  }
}

/**
 * مراقب لتحديث الفافيكون عند تحديث بيانات المتجر
 */
export function watchForStoreDataUpdates(): void {
  // مراقبة تحديثات بيانات المؤسسة
  window.addEventListener('organizationDataUpdated', (event: any) => {
    const { settings } = event.detail;
    if (settings?.favicon_url || settings?.logo_url) {
      updateFavicon({
        faviconUrl: settings.favicon_url,
        logoUrl: settings.logo_url,
        storeName: settings.site_name,
        forceUpdate: true
      });
    }
  });

  // مراقبة تحديثات localStorage
  window.addEventListener('storage', (event) => {
    if (event.key && event.key.includes('favicon_') && event.newValue) {
      const subdomain = window.location.hostname.split('.')[0];
      if (event.key === `favicon_${subdomain}`) {
        updateFavicon({
          faviconUrl: event.newValue,
          forceUpdate: true
        });
      }
    }
  });
}

/**
 * تهيئة مدير الفافيكون
 */
export function initFaviconManager(): void {
  // تطبيق فافيكون فوري
  applyInstantFavicon();
  
  // بدء مراقبة التحديثات
  watchForStoreDataUpdates();
}

// تصدير دالة للاستخدام العالمي
if (typeof window !== 'undefined') {
  (window as any).__FAVICON_MANAGER__ = {
    updateFavicon,
    applyInstantFavicon,
    getCachedFaviconUrl,
    initFaviconManager
  };
}
