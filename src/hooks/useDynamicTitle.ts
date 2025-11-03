import { useEffect, useRef } from 'react';
import { getStoreFromCache } from '@/lib/utils/store-cache';
import { isStoreHeadActive } from '@/lib/headGuard';

// إضافة debouncing لتجنب التكرار المفرط
let updateTimeout: NodeJS.Timeout | null = null;
let lastUpdateTime = 0;
const UPDATE_THROTTLE = 1000; // ثانية واحدة بين التحديثات

/**
 * Hook لضمان تحديث العنوان والأيقونة ديناميكياً
 * محسن لتجنب التكرار والاستدعاءات غير الضرورية
 */
export function useDynamicTitle() {
  const isInitialized = useRef(false);
  
  useEffect(() => {
    // إذا كان StoreHead/SEOHead يسيطران على الرأس، لا تغيّر العنوان/الفافيكون
    if (isStoreHeadActive()) {
      return;
    }
    if (isInitialized.current) {
      return; // تجنب إعادة التهيئة
    }
    
    isInitialized.current = true;
    
    const updateTitleAndFavicon = () => {
      if (isStoreHeadActive()) return; // حراسة ثانية أثناء التشغيل
      // Throttling: تجنب التحديث المتكرر
      const now = Date.now();
      if (now - lastUpdateTime < UPDATE_THROTTLE) {
        return;
      }
      lastUpdateTime = now;
      
      try {
        const hostname = window.location.hostname;
        const pathname = (typeof window !== 'undefined' && window.location.hash && window.location.hash.startsWith('#/'))
          ? window.location.hash.slice(1)
          : window.location.pathname;

        // التحقق من نوع الصفحة
        if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
          if (document.title !== 'لوحة التحكم - سطوكيها') {
            document.title = 'لوحة التحكم - سطوكيها';
          }
          return;
        }
        
        // استخراج النطاق الفرعي
        let subdomain = null;
        
        if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
          const parts = hostname.split('.');
          if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127' && parts[0] !== 'www') {
            subdomain = parts[0];
          }
        } else {
          const hostParts = hostname.split('.');
          if (hostParts.length > 2 && hostParts[0] !== 'www') {
            subdomain = hostParts[0];
          } else if (hostParts.length === 2) {
            const PUBLIC_DOMAINS = ['ktobi.online', 'stockiha.com', 'stockiha.pages.dev', 'bazaar.com', 'bazaar.dev'];
            if (!PUBLIC_DOMAINS.includes(hostname)) {
              subdomain = hostParts[0];
            }
          }
        }
        
        if (subdomain) {
          
          // البحث عن البيانات المحفوظة
          const cachedData = getStoreFromCache(subdomain);
          
          // أيضاً البحث في localStorage مباشرة كنسخة احتياطية
          const orgId = localStorage.getItem('bazaar_organization_id');
          let fallbackData = null;
          
          if (orgId) {
            try {
              const orgData = localStorage.getItem(`bazaar_organization_${orgId}`);
              const orgSettings = localStorage.getItem(`bazaar_org_settings_${orgId}`);
              
              if (orgData) {
                const org = JSON.parse(orgData);
                const settings = orgSettings ? JSON.parse(orgSettings) : {};
                
                fallbackData = {
                  name: settings.site_name || org.name || `متجر ${subdomain}`,
                  description: settings.seo_meta_description || org.description || `${settings.site_name || org.name} - أفضل المنتجات بأفضل الأسعار`,
                  logo_url: settings.logo_url || org.logo_url,
                  favicon_url: settings.favicon_url,
                  seo: {
                    title: settings.seo_store_title || settings.site_name || org.name || `متجر ${subdomain}`,
                    description: settings.seo_meta_description || org.description || `${settings.site_name || org.name} - أفضل المنتجات بأفضل الأسعار`,
                    keywords: settings.meta_keywords || '',
                    og_image: settings.logo_url || org.logo_url
                  }
                };
              }
            } catch (error) {
            }
          }
          
          const finalData = cachedData || fallbackData;
          
          if (finalData?.name) {
            
            // تحديث العنوان
            const newTitle = finalData.seo?.title || finalData.name;
            if (document.title !== newTitle && !document.title.includes('سطوكيها - منصة إدارة المتاجر الذكية')) {
              document.title = newTitle;
            }
            
            // تحديث الأيقونة
            updateFaviconInHook(finalData.favicon_url || finalData.logo_url, finalData.name);
            
            // تحديث الميتا تاغز
            if (finalData.seo) {
              updateMetaTagsInHook(finalData.seo);
            }
          } else {
            // استخدام قيم افتراضية - تحديث العنوان دائماً إذا كان subdomain موجود
            const defaultTitle = `متجر ${subdomain}`;
            if (document.title !== defaultTitle) {
              document.title = defaultTitle;
              updateFaviconInHook(null, defaultTitle);
            }
          }
        }
        
      } catch (error) {
      }
    };
    
    // تشغيل فوري
    updateTitleAndFavicon();
    
    // دالة محسنة للتحديث مع debouncing
    const debouncedUpdate = () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      // ✅ تحديث فوري بدون تأخير لحل مشكلة العنوان
      updateTitleAndFavicon();
    };
    
    // مراقبة تغييرات localStorage (محسنة)
    const handleStorageChange = () => {
      debouncedUpdate();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // مراقبة الأحداث المخصصة (محسنة)
    const handleOrgDataUpdate = () => {
      debouncedUpdate();
    };
    
    window.addEventListener('organizationDataUpdated', handleOrgDataUpdate);
    window.addEventListener('appInitDataReady', handleOrgDataUpdate);
    
    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('organizationDataUpdated', handleOrgDataUpdate);
      window.removeEventListener('appInitDataReady', handleOrgDataUpdate);
      isInitialized.current = false;
    };
  }, []);
}

/**
 * تحديث الأيقونة في Hook
 */
function updateFaviconInHook(iconUrl: string | null | undefined, storeName: string) {
  try {
    // البحث عن الأيقونة الحالية
    let faviconElement = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    
    if (!faviconElement) {
      // إنشاء أيقونة جديدة إذا لم تكن موجودة
      faviconElement = document.createElement('link');
      faviconElement.rel = 'icon';
      faviconElement.type = 'image/x-icon';
      document.head.appendChild(faviconElement);
    }
    
    const currentHref = faviconElement.href;
    
    if (iconUrl && !currentHref.includes(iconUrl)) {
      faviconElement.href = iconUrl + '?v=' + Date.now();
    } else if (!iconUrl && !currentHref.includes('data:image/svg') && !currentHref.includes(storeName.charAt(0))) {
      // إنشاء أيقونة SVG افتراضية
      const initial = storeName.charAt(0);
      const svgIcon = `
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
          <path d="M35 25l5 10h20l5-10" stroke="white" stroke-width="3" fill="none"/>
          <text x="50" y="50" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="white">${initial}</text>
        </svg>
      `;
      faviconElement.href = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgIcon)));
    }
  } catch (error) {
  }
}

/**
 * تحديث الميتا تاغز في Hook
 */
function updateMetaTagsInHook(seoData: any) {
  try {
    // تحديث الوصف
    if (seoData.description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      if (metaDesc.getAttribute('content') !== seoData.description) {
        metaDesc.setAttribute('content', seoData.description);
      }
    }
    
    // تحديث الكلمات المفتاحية
    if (seoData.keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      if (metaKeywords.getAttribute('content') !== seoData.keywords) {
        metaKeywords.setAttribute('content', seoData.keywords);
      }
    }
    
    // تحديث Open Graph
    const ogTags = [
      { property: 'og:title', content: seoData.title },
      { property: 'og:description', content: seoData.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'ar_SA' }
    ];
    
    if (seoData.og_image) {
      ogTags.push({ property: 'og:image', content: seoData.og_image });
    }
    
    ogTags.forEach(tag => {
      if (tag.content) {
        let metaTag = document.querySelector(`meta[property="${tag.property}"]`);
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('property', tag.property);
          document.head.appendChild(metaTag);
        }
        if (metaTag.getAttribute('content') !== tag.content) {
          metaTag.setAttribute('content', tag.content);
        }
      }
    });
    
  } catch (error) {
  }
}
