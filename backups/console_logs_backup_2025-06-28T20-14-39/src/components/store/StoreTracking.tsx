import React, { useEffect, useState } from 'react';
import { useTenant } from '@/context/TenantContext';
import { getOrganizationSettings } from '@/lib/api/settings';

// واجهة بيانات أكواد التتبع
interface TrackingPixel {
  enabled: boolean;
  pixelId: string;
}

interface TrackingPixels {
  facebook: TrackingPixel;
  tiktok: TrackingPixel;
  snapchat: TrackingPixel;
  google: TrackingPixel;
}

const StoreTracking: React.FC = () => {
  const { currentOrganization } = useTenant();
  const [trackingPixels, setTrackingPixels] = useState<TrackingPixels | null>(null);
  const [customHeader, setCustomHeader] = useState<string | null>(null);
  const [customFooter, setCustomFooter] = useState<string | null>(null);

  useEffect(() => {
    const loadTrackingSettings = async () => {
      if (!currentOrganization?.id) return;

      try {
        const orgSettings = await getOrganizationSettings(currentOrganization.id);
        
        if (orgSettings?.custom_js) {
          try {
            const parsedData = JSON.parse(orgSettings.custom_js);
            if (parsedData.trackingPixels) {
              setTrackingPixels(parsedData.trackingPixels);
            }
          } catch (error) {
          }
        }
        
        // تعيين الرموز المخصصة للرأس والتذييل
        if (orgSettings?.custom_header) {
          setCustomHeader(orgSettings.custom_header);
        }
        
        if (orgSettings?.custom_footer) {
          setCustomFooter(orgSettings.custom_footer);
        }
      } catch (error) {
      }
    };

    loadTrackingSettings();
  }, [currentOrganization?.id]);

  // إضافة نصوص البرمجة للتتبع في صفحة الويب
  useEffect(() => {
    try {
      // إضافة رأس HTML المخصص
      if (customHeader) {
        const headerElement = document.createElement('div');
        headerElement.innerHTML = customHeader;
        document.head.appendChild(headerElement);
      }

      // إضافة بكسل فيسبوك
      if (trackingPixels?.facebook?.enabled && trackingPixels.facebook.pixelId) {
        // إضافة النص البرمجي الرئيسي
        const fbScript = document.createElement('script');
        fbScript.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${trackingPixels.facebook.pixelId}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(fbScript);

        // إضافة الصورة البديلة لمتصفحات بدون دعم JavaScript
        const fbNoscript = document.createElement('noscript');
        const fbImg = document.createElement('img');
        fbImg.height = 1;
        fbImg.width = 1;
        fbImg.style.display = 'none';
        fbImg.src = `https://www.facebook.com/tr?id=${trackingPixels.facebook.pixelId}&ev=PageView&noscript=1`;
        fbNoscript.appendChild(fbImg);
        document.head.appendChild(fbNoscript);
      }

      // إضافة بكسل تيك توك
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
            ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
            var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;
            var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
            ttq.load('${trackingPixels.tiktok.pixelId}');
            ttq.page();
          }(window, document, 'ttq');
        `;
        document.head.appendChild(ttScript);
      }

      // إضافة بكسل سناب شات
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

      // إضافة بكسل جوجل أناليتكس
      if (trackingPixels?.google?.enabled && trackingPixels.google.pixelId) {
        // إضافة النص البرمجي الأول لتحميل المكتبة
        const gaScriptLoader = document.createElement('script');
        gaScriptLoader.async = true;
        gaScriptLoader.src = `https://www.googletagmanager.com/gtag/js?id=${trackingPixels.google.pixelId}`;
        document.head.appendChild(gaScriptLoader);

        // إضافة النص البرمجي الثاني للتتبع
        const gaScript = document.createElement('script');
        gaScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${trackingPixels.google.pixelId}');
        `;
        document.head.appendChild(gaScript);
      }

      // إضافة تذييل HTML المخصص
      if (customFooter) {
        const footerElement = document.createElement('div');
        footerElement.innerHTML = customFooter;
        document.body.appendChild(footerElement);
      }
    } catch (error) {
    }

    // تنظيف عند إلغاء تحميل المكون
    return () => {
      // يمكن إضافة منطق التنظيف هنا إذا لزم الأمر
    };
  }, [trackingPixels, customHeader, customFooter]);

  // المكون لا يعرض أي عناصر في DOM
  return null;
};

export default StoreTracking;
