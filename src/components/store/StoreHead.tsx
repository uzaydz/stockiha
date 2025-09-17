import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { langLog } from '@/lib/debug/langDebug';
import { setStoreHeadActive } from '@/lib/headGuard';
import { optimizeFacebookSharing, cacheStoreInfoForSharing } from '@/utils/facebookOptimizer';
import { updateFavicon } from '@/utils/faviconManager';

export interface StoreHeadProps {
  storeName?: string;
  storeDescription?: string;
  storeKeywords?: string;
  faviconUrl?: string;
  logoUrl?: string;
  organizationId?: string;
  customCSS?: string;
  customJSHeader?: string;
  themeColor?: string;
  // اللغة الافتراضية القادمة من إعدادات المؤسسة عبر RPC
  defaultLanguage?: 'ar' | 'en' | 'fr';
  seoSettings?: {
    title?: string;
    description?: string;
    keywords?: string;
    og_image?: string;
    enable_open_graph?: boolean;
    enable_twitter_cards?: boolean;
    twitter_handle?: string;
  };
}

export const StoreHead: React.FC<StoreHeadProps> = ({
  storeName,
  storeDescription,
  storeKeywords,
  faviconUrl,
  logoUrl,
  organizationId,
  customCSS,
  customJSHeader,
  themeColor = '#22c55e',
  defaultLanguage,
  seoSettings
}) => {
  
  // إضافة preconnect/dns-prefetch ديناميكياً لأصول الصور الحرجة (مثل اللوغو/LCP)
  useEffect(() => {
    try {
      const candidates = [
        faviconUrl,
        logoUrl,
        seoSettings?.og_image,
      ].filter(Boolean) as string[];

      const origins = Array.from(new Set(
        candidates
          .map((u) => {
            try { return new URL(u).origin; } catch { return null; }
          })
          .filter(Boolean) as string[]
      ));

      origins.forEach((origin) => {
        // preconnect
        const linkPre = document.createElement('link');
        linkPre.rel = 'preconnect';
        linkPre.href = origin;
        linkPre.crossOrigin = 'anonymous';
        document.head.appendChild(linkPre);

        // dns-prefetch
        const linkDns = document.createElement('link');
        linkDns.rel = 'dns-prefetch';
        linkDns.href = origin;
        document.head.appendChild(linkDns);
      });
    } catch {}
  }, [faviconUrl, logoUrl, seoSettings?.og_image]);

  // حفظ البيانات في localStorage للاستخدام الفوري في المرات القادمة
  useEffect(() => {
    // أعلن سيطرة StoreHead على الـ head لتجنب التحديثات المتعددة من مصادر أخرى
    try { setStoreHeadActive(true); } catch {}
    if (storeName && organizationId) {
      try {
        // إذا كانت اللغة الافتراضية متوفرة من الـ RPC، احفظها فوراً حتى تُقرأ عند تهيئة i18n
        if (defaultLanguage && ['ar', 'en', 'fr'].includes(defaultLanguage)) {
          try {
            const current = localStorage.getItem('i18nextLng');
            if (current !== defaultLanguage) {
              localStorage.setItem('i18nextLng', defaultLanguage);
              localStorage.setItem('i18nextLng_timestamp', Date.now().toString());
            }
            langLog('StoreHead:save-defaultLanguage', { defaultLanguage, organizationId });
          } catch {}
        }
        
        // حفظ البيانات الأساسية للمؤسسة
        const orgData = {
          id: organizationId,
          name: storeName,
          description: storeDescription,
          logo_url: logoUrl,
          subdomain: window.location.hostname.split('.')[0]
        };
        
        // حفظ إعدادات المؤسسة
        const orgSettings = {
          site_name: storeName,
          seo_store_title: seoSettings?.title || storeName,
          seo_meta_description: seoSettings?.description || storeDescription,
          meta_keywords: seoSettings?.keywords || storeKeywords,
          logo_url: logoUrl,
          favicon_url: faviconUrl,
          // تمرير اللغة الافتراضية ضمن الإعدادات لالتقاطها من مستمع i18n
          ...(defaultLanguage ? { default_language: defaultLanguage } : {})
        };
        
        // حفظ البيانات في localStorage
        localStorage.setItem('bazaar_organization_id', organizationId);
        localStorage.setItem(`bazaar_organization_${organizationId}`, JSON.stringify(orgData));
        localStorage.setItem(`bazaar_org_settings_${organizationId}`, JSON.stringify(orgSettings));
        
        // حفظ في session storage أيضاً للوصول السريع
        const currentSubdomain = window.location.hostname.split('.')[0];
        if (currentSubdomain && currentSubdomain !== 'localhost' && currentSubdomain !== 'www') {
          const storeInfo = {
            name: storeName,
            description: storeDescription,
            logo_url: logoUrl,
            favicon_url: faviconUrl,
            seo: {
              title: seoSettings?.title || storeName,
              description: seoSettings?.description || storeDescription,
              keywords: seoSettings?.keywords || storeKeywords,
              og_image: seoSettings?.og_image || logoUrl
            }
          };
          sessionStorage.setItem(`store_${currentSubdomain}`, JSON.stringify(storeInfo));
          
        }
        
        // إطلاق حدث مخصص لتنبيه النظام الديناميكي بتحديث البيانات
        const updateEvent = new CustomEvent('organizationDataUpdated', {
          detail: {
            organization: orgData,
            settings: orgSettings,
            subdomain: currentSubdomain
          }
        });
        langLog('StoreHead:dispatch-organizationDataUpdated', {
          organizationId,
          defaultLanguage,
          hasSeoTitle: Boolean(seoSettings?.title)
        });
        window.dispatchEvent(updateEvent);

        // أيضاً تحديث فوري للعنوان والأيقونة
        const newTitle = seoSettings?.title || storeName;
        if (document.title !== newTitle) {
          document.title = newTitle;
        }
        
        // تحديث الأيقونة فوراً باستخدام المدير الجديد
        updateFavicon({
          faviconUrl,
          logoUrl,
          storeName,
          forceUpdate: true
        });
        
        // تحسين Facebook sharing فوراً
        optimizeFacebookSharing({
          title: newTitle,
          description: storeDescription || seoSettings?.description || `${storeName} - متجر إلكتروني متخصص`,
          image: seoSettings?.og_image || logoUrl,
          siteName: storeName,
          type: 'website'
        });
        
        // حفظ معلومات المشاركة
        cacheStoreInfoForSharing({
          title: newTitle,
          description: storeDescription || seoSettings?.description || `${storeName} - متجر إلكتروني متخصص`,
          image: seoSettings?.og_image || logoUrl,
          siteName: storeName
        });
        
        // حفظ البيانات في instant cache للاستخدام السريع في المستقبل
        const storeSubdomain = window.location.hostname.split('.')[0];
        if (storeSubdomain && storeSubdomain !== 'localhost' && storeSubdomain !== 'www') {
          try {
            const instantStoreData = {
              name: storeName,
              description: storeDescription || seoSettings?.description,
              logo_url: logoUrl,
              favicon_url: faviconUrl,
              timestamp: Date.now()
            };
            
            // حفظ في sessionStorage للجلسة الحالية
            sessionStorage.setItem(`store_${storeSubdomain}`, JSON.stringify(instantStoreData));
            sessionStorage.setItem(`instant_store_${storeSubdomain}`, JSON.stringify(instantStoreData));
            
            // حفظ في localStorage أيضاً للزيارات القادمة
            localStorage.setItem(`store_quick_${storeSubdomain}`, JSON.stringify(instantStoreData));
            
            // حفظ favicon URL بشكل منفصل للوصول السريع
            if (faviconUrl || logoUrl) {
              try {
                localStorage.setItem(`favicon_${storeSubdomain}`, faviconUrl || logoUrl);
                sessionStorage.setItem(`favicon_${storeSubdomain}`, faviconUrl || logoUrl);
              } catch (e) {}
            }
          } catch (e) {
            // تجاهل أخطاء Storage
          }
        }
        
      } catch (error) {
      }
    }
    return () => {
      try { setStoreHeadActive(false); } catch {}
    };
  }, [storeName, storeDescription, storeKeywords, faviconUrl, logoUrl, organizationId, seoSettings]);

  // دالة لتحديث الأيقونة من StoreHead
  const updateFaviconFromStoreHead = (iconUrl: string | undefined, storeName: string) => {
    try {
      
      // إزالة الأيقونات الموجودة
      document.querySelectorAll('link[rel*="icon"]').forEach(el => {
        el.remove();
      });
      
      // إنشاء أيقونة جديدة
      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = 'image/x-icon';
      
      if (iconUrl) {
        favicon.href = iconUrl + '?v=' + Date.now();
      } else {
        // استخدام أيقونة SVG افتراضية
        const initial = storeName.charAt(0);
        const svgIcon = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${themeColor};stop-opacity:1" />
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
        favicon.href = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgIcon)));
      }
      
      document.head.appendChild(favicon);
    } catch (error) {
    }
  };

  // تحديث العنوان والأيقونة عند تغيير البيانات
  useEffect(() => {
    if (storeName) {
      // تحديث عنوان الصفحة فوراً
      const finalTitle = seoSettings?.title || storeName;
      document.title = finalTitle;
      
      // تحديث أو إنشاء الفافيكون
      const updateFavicon = () => {
        // البحث عن الفافيكون الحالي
        let faviconElement = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        
        if (!faviconElement) {
          // إنشاء فافيكون جديد إذا لم يكن موجوداً
          faviconElement = document.createElement('link');
          faviconElement.rel = 'icon';
          faviconElement.type = 'image/x-icon';
          document.head.appendChild(faviconElement);
        }
        
        // تحديث الفافيكون
        if (faviconUrl) {
          // استخدام فافيكون المتجر إذا كان متوفراً
          faviconElement.href = `${faviconUrl}?v=${Date.now()}`;
        } else if (logoUrl) {
          // استخدام لوغو المتجر كفافيكون إذا لم يكن هناك فافيكون مخصص
          faviconElement.href = `${logoUrl}?v=${Date.now()}`;
        } else {
          // فافيكون افتراضي جميل للمتاجر بـ SVG
          const initial = storeName.charAt(0);
          const svgIcon = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:${themeColor};stop-opacity:1" />
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
      };
      
      updateFavicon();
    }
  }, [storeName, faviconUrl, logoUrl, themeColor, seoSettings?.title]);

  const finalStoreName = seoSettings?.title || storeName || 'متجر إلكتروني';
  const finalDescription = seoSettings?.description || storeDescription || `${finalStoreName} - أفضل المنتجات بأفضل الأسعار`;
  const finalKeywords = seoSettings?.keywords || storeKeywords || `${finalStoreName}, متجر إلكتروني, تسوق أونلاين`;

  return (
    <Helmet>
      {/* Flag to indicate StoreHead controls head to prevent duplicate updates */}
      <meta name="x-store-head-active" content="1" />
      {/* العنوان والوصف الأساسي */}
      <title>{finalStoreName}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      
      {/* إعدادات المتصفح */}
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content={themeColor} />
      
      {/* Open Graph للشبكات الاجتماعية */}
      {seoSettings?.enable_open_graph !== false && (
        <>
          <meta property="og:title" content={finalStoreName} />
          <meta property="og:description" content={finalDescription} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={finalStoreName} />
          <meta property="og:locale" content="ar_DZ" />
          {(seoSettings?.og_image || logoUrl) && (
            <meta property="og:image" content={seoSettings?.og_image || logoUrl} />
          )}
        </>
      )}
      
      {/* Twitter Cards */}
      {seoSettings?.enable_twitter_cards !== false && (
        <>
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={finalStoreName} />
          <meta name="twitter:description" content={finalDescription} />
          <meta name="twitter:site" content={seoSettings?.twitter_handle || '@stockiha'} />
          {(seoSettings?.og_image || logoUrl) && (
            <meta name="twitter:image" content={seoSettings?.og_image || logoUrl} />
          )}
        </>
      )}
      
      {/* خطوط محلية: نعتمد على التعريفات العالمية في src/styles/fonts.css */}
      {/* تحسين اتصال مبكر مع Supabase وCloudflare Insights */}
      <link rel="preconnect" href="https://wrnssatuvmumsczyldth.supabase.co" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="//wrnssatuvmumsczyldth.supabase.co" />
      <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
      
      {/* الـ CSS المخصص */}
      {customCSS && (
        <style dangerouslySetInnerHTML={{ __html: customCSS }} />
      )}
      
      {/* الـ JavaScript المخصص في الـ Header */}
      {customJSHeader && (
        <script dangerouslySetInnerHTML={{ __html: customJSHeader }} />
      )}
    </Helmet>
  );
};
