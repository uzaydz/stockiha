import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

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
  seoSettings?: {
    title?: string;
    description?: string;
    keywords?: string;
    og_image?: string;
    enable_open_graph?: boolean;
    enable_twitter_cards?: boolean;
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
  seoSettings
}) => {
  
  // حفظ البيانات في localStorage للاستخدام الفوري في المرات القادمة
  useEffect(() => {
    if (storeName && organizationId) {
      try {
        console.log('💾 StoreHead: بدء حفظ البيانات للمتجر:', storeName);
        
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
          favicon_url: faviconUrl
        };
        
        // حفظ البيانات في localStorage
        localStorage.setItem('bazaar_organization_id', organizationId);
        localStorage.setItem(`bazaar_organization_${organizationId}`, JSON.stringify(orgData));
        localStorage.setItem(`bazaar_org_settings_${organizationId}`, JSON.stringify(orgSettings));
        
        // حفظ في session storage أيضاً للوصول السريع
        const subdomain = window.location.hostname.split('.')[0];
        if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
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
          sessionStorage.setItem(`store_${subdomain}`, JSON.stringify(storeInfo));
          
          console.log('💾 StoreHead: تم حفظ بيانات المتجر:', storeInfo);
        }
        
        // إطلاق حدث مخصص لتنبيه النظام الديناميكي بتحديث البيانات
        const updateEvent = new CustomEvent('organizationDataUpdated', {
          detail: {
            organization: orgData,
            settings: orgSettings,
            subdomain
          }
        });
        window.dispatchEvent(updateEvent);
        
        console.log('🔔 StoreHead: تم إطلاق حدث تحديث البيانات');
        
        // أيضاً تحديث فوري للعنوان والأيقونة
        setTimeout(() => {
          const newTitle = seoSettings?.title || storeName;
          if (document.title !== newTitle) {
            document.title = newTitle;
            console.log('✅ StoreHead: تم تحديث العنوان إلى:', newTitle);
          }
          
          // تحديث الأيقونة فوراً
          updateFaviconFromStoreHead(faviconUrl || logoUrl, storeName);
        }, 100);
        
      } catch (error) {
        console.error('خطأ في حفظ بيانات المتجر:', error);
      }
    }
  }, [storeName, storeDescription, storeKeywords, faviconUrl, logoUrl, organizationId, seoSettings]);

  // دالة لتحديث الأيقونة من StoreHead
  const updateFaviconFromStoreHead = (iconUrl: string | undefined, storeName: string) => {
    try {
      console.log('🎨 StoreHead: تحديث الأيقونة:', iconUrl, 'للمتجر:', storeName);
      
      // إزالة الأيقونات الموجودة
      document.querySelectorAll('link[rel*="icon"]').forEach(el => {
        console.log('🗑️ StoreHead: إزالة أيقونة موجودة:', (el as HTMLLinkElement).href);
        el.remove();
      });
      
      // إنشاء أيقونة جديدة
      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = 'image/x-icon';
      
      if (iconUrl) {
        favicon.href = iconUrl + '?v=' + Date.now();
        console.log('🎨 StoreHead: تم تعيين أيقونة المتجر:', favicon.href);
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
        console.log('🎨 StoreHead: تم إنشاء أيقونة افتراضية');
      }
      
      document.head.appendChild(favicon);
    } catch (error) {
      console.error('❌ خطأ في تحديث الأيقونة من StoreHead:', error);
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
          <meta property="og:locale" content="ar_SA" />
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
          {(seoSettings?.og_image || logoUrl) && (
            <meta name="twitter:image" content={seoSettings?.og_image || logoUrl} />
          )}
        </>
      )}
      
      {/* تحسينات الأداء */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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