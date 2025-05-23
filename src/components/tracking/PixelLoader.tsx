'use client';

import { useEffect } from 'react';

interface PixelSettings {
  facebook: {
    enabled: boolean;
    pixel_id?: string;
    test_event_code?: string;
  };
  google: {
    enabled: boolean;
    gtag_id?: string;
  };
  tiktok: {
    enabled: boolean;
    pixel_id?: string;
    test_event_code?: string;
  };
  test_mode: boolean;
}

interface PixelLoaderProps {
  settings: PixelSettings;
  onLoad?: () => void;
}

/**
 * مكون تحميل البكسلات المحسن
 * يحمل فقط البكسلات المفعلة ويتجنب التحميل المتكرر
 */
export default function PixelLoader({ settings, onLoad }: PixelLoaderProps) {
  useEffect(() => {
    if (onLoad) {
      onLoad();
    }
  }, [settings, onLoad]);

  useEffect(() => {
    console.log('🚀 بدء تحميل البكسلات:', settings);
    
    // تحميل Facebook Pixel
    if (settings.facebook.enabled && settings.facebook.pixel_id) {
      loadFacebookPixel(
        settings.facebook.pixel_id, 
        settings.test_mode, 
        settings.facebook.test_event_code
      );
    } else {
      console.log('❌ Facebook Pixel غير مفعل أو معرف البكسل مفقود');
    }

    // تحميل Google Analytics/Ads
    if (settings.google.enabled && settings.google.gtag_id) {
      loadGoogleAnalytics(settings.google.gtag_id, settings.test_mode);
    }

    // تحميل TikTok Pixel
    if (settings.tiktok.enabled && settings.tiktok.pixel_id) {
      loadTikTokPixel(
        settings.tiktok.pixel_id, 
        settings.test_mode, 
        settings.tiktok.test_event_code
      );
    }
  }, [settings]);

  return null; // هذا المكون لا يعرض أي UI
}

// دالة تحميل Facebook Pixel
function loadFacebookPixel(pixelId: string, testMode: boolean, testEventCode?: string) {
  if (typeof window === 'undefined') return;

  // تجنب التحميل المتكرر
  if ((window as any).fbq) {
    console.log('📱 Facebook Pixel محمل مسبقاً');
    return;
  }

  console.log(`🔵 تحميل Facebook Pixel: ${pixelId}${testMode ? ` (وضع الاختبار: ${testEventCode || 'TEST35620'})` : ''}`);

  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', '${pixelId}');
    ${testMode && testEventCode ? 
      `fbq('track', 'PageView', {}, {testEventCode: '${testEventCode}'});
       console.log('🧪 Facebook Pixel في وضع الاختبار مع Test Event Code: ${testEventCode}');` : 
      "fbq('track', 'PageView');"
    }
  `;
  
  document.head.appendChild(script);
  
  // إضافة noscript fallback
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1${testMode && testEventCode ? `&test_event_code=${testEventCode}` : ''}"/>`;
  document.body.appendChild(noscript);

  console.log(`✅ Facebook Pixel محمل بنجاح: ${pixelId}${testMode ? ` (${testEventCode || 'TEST35620'})` : ''}`);
}

// دالة تحميل Google Analytics
function loadGoogleAnalytics(gtagId: string, testMode: boolean) {
  if (typeof window === 'undefined') return;

  // تجنب التحميل المتكرر
  if ((window as any).gtag) {
    console.log('📊 Google Analytics محمل مسبقاً');
    return;
  }

  console.log(`🔴 تحميل Google Analytics: ${gtagId}${testMode ? ' (وضع الاختبار)' : ''}`);

  // تحميل gtag script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
  script.async = true;
  document.head.appendChild(script);

  // إعداد gtag
  const configScript = document.createElement('script');
  configScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gtagId}'${testMode ? ', { debug_mode: true }' : ''});
  `;
  document.head.appendChild(configScript);

  console.log(`✅ Google Analytics محمل بنجاح: ${gtagId}${testMode ? ' (وضع الاختبار)' : ''}`);
}

// دالة تحميل TikTok Pixel
function loadTikTokPixel(pixelId: string, testMode: boolean, testEventCode?: string) {
  if (typeof window === 'undefined') return;

  // تجنب التحميل المتكرر
  if ((window as any).ttq) {
    console.log('🎵 TikTok Pixel محمل مسبقاً');
    return;
  }

  console.log(`⚫ تحميل TikTok Pixel: ${pixelId}${testMode ? ` (وضع الاختبار: ${testEventCode || 'TEST'})` : ''}`);

  const script = document.createElement('script');
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');
      ttq.page();
    }(window, document, 'ttq');
    ${testMode ? `console.log('TikTok Pixel في وضع الاختبار: ${testEventCode || 'TEST'}');` : ""}
  `;
  document.head.appendChild(script);

  console.log(`✅ TikTok Pixel محمل بنجاح: ${pixelId}${testMode ? ` (${testEventCode || 'TEST'})` : ''}`);
}

// مكون للتحميل الشرطي للبكسلات حسب الصفحة
export function ConditionalPixelLoader({ 
  productId, 
  settings,
  loadOnlyFor 
}: { 
  productId: string;
  settings: PixelSettings;
  loadOnlyFor?: string[];
}) {
  const shouldLoad = loadOnlyFor ? 
    loadOnlyFor.some(page => window.location.pathname.includes(page)) : 
    true;

  if (!shouldLoad) {
    return null;
  }

  return <PixelLoader settings={settings} />;
}

// Hook لتحميل الإعدادات وتشغيل البكسلات
export function usePixelLoader(productId: string) {
  useEffect(() => {
    const loadPixelSettings = async () => {
      try {
        const response = await fetch(`/api/conversion-settings/${productId}`);
        if (response.ok) {
          const data = await response.json();
          
          // حفظ الإعدادات في sessionStorage للوصول السريع
          sessionStorage.setItem(
            `pixel_settings_${productId}`, 
            JSON.stringify(data.settings)
          );
          
          return data.settings;
        }
      } catch (error) {
        console.error('خطأ في تحميل إعدادات البكسل:', error);
      }
      return null;
    };

    loadPixelSettings();
  }, [productId]);
} 