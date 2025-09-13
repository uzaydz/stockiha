import React, { useEffect, useState } from 'react';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { isInAppWebView } from '@/utils/inAppWebView';

// واجهة بيانات أكواد التتبع
// ملاحظة: Facebook Pixel تم حذفه من هنا ويتم تحميله على مستوى المنتج فقط
interface TrackingPixel {
  enabled: boolean;
  pixelId: string;
}

interface TrackingPixels {
  facebook: TrackingPixel; // لا يتم استخدامه - محذوف من التطبيق
  tiktok: TrackingPixel;
  snapchat: TrackingPixel;
  google: TrackingPixel;
}

const StoreTracking: React.FC = () => {
  
  
  const { organizationSettings } = useSharedStoreDataContext();
  const [trackingPixels, setTrackingPixels] = useState<TrackingPixels | null>(null);
  const [customHeader, setCustomHeader] = useState<string | null>(null);
  const [customFooter, setCustomFooter] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationSettings) return;

    try {
      if (organizationSettings?.custom_js) {
        try {
          const parsedData = JSON.parse(organizationSettings.custom_js);
          if (parsedData.trackingPixels) {
            setTrackingPixels(parsedData.trackingPixels);
          }
        } catch (error) {
        }
      }
      
      // تعيين الرموز المخصصة للرأس والتذييل
      if (organizationSettings?.custom_header) {
        setCustomHeader(organizationSettings.custom_header);
      }
      
      if (organizationSettings?.custom_footer) {
        setCustomFooter(organizationSettings.custom_footer);
      }
    } catch (error) {
    }
  }, [organizationSettings]);

  // إضافة نصوص البرمجة للتتبع في صفحة الويب — مع تأجيل داخل المتصفحات المضمنة
  useEffect(() => {
    const bootstrap = () => {
      try {
        const g: any = typeof window !== 'undefined' ? (window as any) : {};

        // منع تشغيل تتبع المتجر في صفحات شراء المنتج لتجنب التكرار
        const path = (typeof window !== 'undefined' && (window as any).location ? (window as any).location.pathname : '') || '';
        const isProductPurchasePage =
          path.includes('/product-purchase-max-v1/') ||
          path.includes('/product-purchase-max-v2/') ||
          path.includes('/product-purchase-max-v3/') ||
          path.includes('/product-purchase-max/') ||
          path.includes('/product/') ||
          path.includes('/product-page/') ||
          path.includes('/buy/');

        if (isProductPurchasePage) return;
        if (g.__product_pixel_active) return;

        // إضافة رأس HTML المخصص (idempotent)
        if (customHeader) {
          const headerId = 'org-custom-header-container';
          if (!document.getElementById(headerId)) {
            const headerElement = document.createElement('div');
            headerElement.id = headerId;
            headerElement.setAttribute('data-injected', 'custom_header');
            headerElement.innerHTML = customHeader;
            document.head.appendChild(headerElement);
          }
        }

        // TikTok Pixel
        if (trackingPixels?.tiktok?.enabled && trackingPixels.tiktok.pixelId) {
          const ttScript = document.createElement('script');
          ttScript.innerHTML = `
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;
              var ttq=w[t]=w[t]||[];
              ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
              ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
              for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
              ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
              ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
              ttq._i=ttq._i||{},ttq._i[e]=[],ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
              var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;
              var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${trackingPixels.tiktok.pixelId}');
              ttq.page();
            }(window, document, 'ttq');
          `;
          document.head.appendChild(ttScript);
          setTimeout(() => {
            const candidates = Array.from(document.querySelectorAll('script[src*="analytics.tiktok.com/i18n/pixel/events.js"]')) as HTMLScriptElement[];
            candidates.forEach(s => {
              s.setAttribute('data-noncritical', 'true');
              s.setAttribute('data-source', 'tiktok-pixel');
              if (!s.onerror) s.onerror = () => console.warn('TikTok Pixel script failed to load');
            });
          }, 0);
        }

        // Snapchat Pixel
        if (trackingPixels?.snapchat?.enabled && trackingPixels.snapchat.pixelId) {
          const scScript = document.createElement('script');
          scScript.innerHTML = `
            (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
            a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
            r.src=n;var u=t.getElementsByTagName(s)[0];
            u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
            snaptr('init', '${trackingPixels.snapchat.pixelId}', {
              'user_email': '__INSERT_USER_EMAIL__'
            });
            snaptr('track', 'PAGE_VIEW');
          `;
          document.head.appendChild(scScript);
        }

        // Google Analytics
        if (trackingPixels?.google?.enabled && trackingPixels.google.pixelId) {
          const gaScriptLoader = document.createElement('script');
          gaScriptLoader.async = true;
          gaScriptLoader.src = `https://www.googletagmanager.com/gtag/js?id=${trackingPixels.google.pixelId}`;
          gaScriptLoader.setAttribute('data-noncritical', 'true');
          gaScriptLoader.setAttribute('data-source', 'gtag');
          document.head.appendChild(gaScriptLoader);

          const gaScript = document.createElement('script');
          gaScript.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);} 
            gtag('js', new Date());
            gtag('config', '${trackingPixels.google.pixelId}');
          `;
          document.head.appendChild(gaScript);
        }

        // Custom footer
        if (customFooter) {
          const footerId = 'org-custom-footer-container';
          if (!document.getElementById(footerId)) {
            const footerElement = document.createElement('div');
            footerElement.id = footerId;
            footerElement.setAttribute('data-injected', 'custom_footer');
            footerElement.innerHTML = customFooter;
            document.body.appendChild(footerElement);
          }
        }
      } catch (error) {
      }
    };

    const iab = isInAppWebView();
    if (iab) {
      let done = false;
      const onFirst = () => { if (done) return; done = true; bootstrap(); };
      const t = setTimeout(onFirst, 8000);
      window.addEventListener('iab-first-interaction', onFirst as any, { once: true } as any);
      return () => {
        clearTimeout(t);
        window.removeEventListener('iab-first-interaction', onFirst as any);
      };
    } else {
      // Default path for normal browsers: small delay to avoid blocking
      const conn = (navigator as any)?.connection?.effectiveType as string | undefined;
      const slow = conn === '2g' || conn === 'slow-2g';
      const delay = slow ? 2500 : 1200;
      const t = setTimeout(bootstrap, delay);
      return () => clearTimeout(t);
    }
  }, [trackingPixels, customHeader, customFooter]);

  // المكون لا يعرض أي عناصر في DOM
  return null;
};

export default StoreTracking;
