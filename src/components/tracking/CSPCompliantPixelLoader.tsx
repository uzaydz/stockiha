import React, { useEffect } from 'react';
import { logPixelDiagnostics } from '@/utils/pixelDiagnostics';

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

interface CSPCompliantPixelLoaderProps {
  settings: PixelSettings;
  onLoad?: () => void;
  advancedMatch?: Record<string, any>;
}

declare global {
  interface Window {
    fbq?: (action: string, event: string, data?: any, options?: any) => void;
    gtag?: (action: string, event: string, data?: any) => void;
    ttq?: { track: (event: string, data?: any) => void };
    dataLayer?: any[];
  }
}

/**
 * CSP-Compliant Pixel Loader
 * Uses external script loading and window functions instead of inline scripts
 */
export default function CSPCompliantPixelLoader({ 
  settings, 
  onLoad, 
  advancedMatch 
}: CSPCompliantPixelLoaderProps) {
  
  useEffect(() => {
    // تعيين إشارة أن البيكسل الخاص بالمنتج نشط
    const g: any = typeof window !== 'undefined' ? (window as any) : {};
    g.__product_pixel_active = true;
    
    if (process.env.NODE_ENV === 'development') {
      
    }
    
    if (onLoad) {
      onLoad();
    }

    // تشخيص البيكسل بعد التحميل (في وضع التطوير)
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        logPixelDiagnostics();
      }, 2000);
    }

    // تنظيف عند إلغاء التحميل
    return () => {
      g.__product_pixel_active = false;
      if (process.env.NODE_ENV === 'development') {
        
      }
    };
  }, [settings, onLoad]);

  useEffect(() => {
    // فحص إضافي للتأكد من عدم تشغيل StoreTracking
    const g: any = typeof window !== 'undefined' ? (window as any) : {};
    const path = typeof window !== 'undefined' && window.location ? window.location.pathname : '';
    
    if (process.env.NODE_ENV === 'development') {
    }

    // تحميل Facebook Pixel
    if (settings.facebook.enabled && settings.facebook.pixel_id) {
      if (process.env.NODE_ENV === 'development') {
        
      }
      loadFacebookPixelCSPCompliant(
        settings.facebook.pixel_id,
        settings.test_mode,
        settings.facebook.test_event_code,
        advancedMatch
      );
    }

    // تحميل Google Analytics/Ads
    if (settings.google.enabled && settings.google.gtag_id) {
      if (process.env.NODE_ENV === 'development') {
        
      }
      loadGoogleAnalyticsCSPCompliant(settings.google.gtag_id, settings.test_mode);
    }

    // تحميل TikTok Pixel
    if (settings.tiktok.enabled && settings.tiktok.pixel_id) {
      if (process.env.NODE_ENV === 'development') {
        
      }
      loadTikTokPixelCSPCompliant(
        settings.tiktok.pixel_id, 
        settings.test_mode, 
        settings.tiktok.test_event_code
      );
    }
  }, [settings, advancedMatch]);

  return null; // هذا المكون لا يعرض أي UI
}

// دالة تحميل Facebook Pixel متوافقة مع CSP
function loadFacebookPixelCSPCompliant(
  pixelId: string, 
  testMode: boolean, 
  testEventCode?: string, 
  advancedMatch?: Record<string, any>
) {
  if (typeof window === 'undefined') return;

  if (process.env.NODE_ENV === 'development') {
    
  }

  // حارس عام لمنع التهيئة المكررة لكل pixelId
  const g: any = window as any;
  g.__fb_pixel_guard = g.__fb_pixel_guard || {};
  g.__csp_pixel_guard = g.__csp_pixel_guard || {};
  
  if (g.__fb_pixel_guard[pixelId] || g.__csp_pixel_guard[pixelId]) {
    if (process.env.NODE_ENV === 'development') {
    }
    return; // تم تفعيل نفس البكسل مسبقاً في هذه الصفحة
  }
  g.__fb_pixel_guard[pixelId] = true;
  g.__csp_pixel_guard[pixelId] = true;

  // تجنب التحميل المتكرر للسكريبت
  if (window.fbq && typeof window.fbq === 'function') {
    if (process.env.NODE_ENV === 'development') {
      
    }
    
    // فحص إذا كان البيكسل نفسه تم تهيئته مسبقاً
    const existingPixelInitialized = g.__fb_pixel_guard[pixelId] || g.__csp_pixel_guard[pixelId];
    if (existingPixelInitialized) {
      if (process.env.NODE_ENV === 'development') {
        
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      
    }
    // إعادة تهيئة البيكسل الجديد فقط
    if (advancedMatch && Object.keys(advancedMatch).length > 0) {
      window.fbq('init', pixelId, advancedMatch);
    } else {
      window.fbq('init', pixelId);
    }
    
    // تعيين الحراسة
    g.__fb_pixel_guard[pixelId] = true;
    g.__csp_pixel_guard[pixelId] = true;
    return;
  }

  // إنشاء fbq function
  (window as any).fbq = function(...args: any[]) {
    const fbqAny = (window as any).fbq;
    if (fbqAny?.callMethod) {
      fbqAny.callMethod.apply(fbqAny, args);
    } else {
      fbqAny.queue.push(args);
    }
  };
  
  if (!(window as any)._fbq) (window as any)._fbq = window.fbq;
  (window.fbq as any).push = window.fbq;
  (window.fbq as any).loaded = true;
  (window.fbq as any).version = '2.0';
  (window.fbq as any).queue = [];

  // تحميل السكريبت الخارجي مع معالجة أخطاء CSP
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  // ملاحظة: عدم تعيين crossorigin هنا يضمن تحميل السكربت كوضع classic script بدون طلب CORS
  // لأن connect.facebook.net لا يُرجع Access-Control-Allow-Origin، وتعيين crossorigin
  // سيحوّل التحميل إلى CORS ويؤدي إلى خطأ "No 'Access-Control-Allow-Origin' header"
  
  // إضافة معالج للأخطاء
  script.onerror = (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Facebook Pixel script failed to load (CSP or network issue):', error);
    }
    // محاولة fallback - تهيئة fbq محلياً
    if (!window.fbq) {
      window.fbq = function() {
        console.warn('📊 Facebook Pixel not loaded - tracking disabled');
      };
    }
  };
  
  script.onload = () => {
    if (process.env.NODE_ENV === 'development') {
      
    }
    
      // تهيئة البكسل بعد تحميل السكريبت
      try {
        // إضافة إعدادات محسنة لتحسين دقة التتبع
        const enhancedConfig = {
          autoConfig: true,
          debug: false,
          // تمكين تتبع المصدر التلقائي لتحسين _fbc cookie
          track_conversions: true
        };

        if (advancedMatch && Object.keys(advancedMatch).length > 0) {
          if (process.env.NODE_ENV === 'development') {
            
          }
          
          // فحص إذا كانت صفحة منتج لمنع PageView التلقائي
          const isProductPage = typeof window !== 'undefined' && 
                               window.location.pathname.includes('/product');
          
          if (isProductPage) {
            if (process.env.NODE_ENV === 'development') {
              
            }
            window.fbq?.('init', pixelId, { ...advancedMatch, ...enhancedConfig }, { autoPageView: false });
          } else {
            window.fbq?.('init', pixelId, { ...advancedMatch, ...enhancedConfig });
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            
          }
          
          // فحص إذا كانت صفحة منتج لمنع PageView التلقائي
          const isProductPage = typeof window !== 'undefined' && 
                               window.location.pathname.includes('/product');
          
          if (isProductPage) {
            if (process.env.NODE_ENV === 'development') {
              
            }
            window.fbq?.('init', pixelId, enhancedConfig, { autoPageView: false });
          } else {
            window.fbq?.('init', pixelId, enhancedConfig);
          }
        }
      
    // تتبع PageView مع حارس عالمي لمنع التكرار
    const g: any = window as any;
    g.__fb_pageview_guard = g.__fb_pageview_guard || false;
    
    if (process.env.NODE_ENV === 'development') {
    }
    
    // فحص إذا كانت صفحة منتج - لا نرسل PageView في صفحات المنتج
    const isProductPage = typeof window !== 'undefined' && 
                         window.location.pathname.includes('/product');
    
    if (isProductPage) {
      if (process.env.NODE_ENV === 'development') {
        
      }
      g.__fb_pageview_guard = 'blocked_for_product_page'; // منع إرسال PageView من مصادر أخرى
    } else {
      // إرسال PageView فقط في الصفحات غير المنتج
      if (!g.__fb_pageview_guard) {
        if (testMode && testEventCode) {
          if (process.env.NODE_ENV === 'development') {
            
          }
          window.fbq?.('track', 'PageView', {}, { testEventCode });
        } else {
          if (process.env.NODE_ENV === 'development') {
            
          }
          window.fbq?.('track', 'PageView');
        }
        g.__fb_pageview_guard = true;
        if (process.env.NODE_ENV === 'development') {
          
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          
        }
      }
    }

      // إشعار جاهزية فيسبوك بكسل
      try {
        const readyEvent = new CustomEvent('pixel:facebook-ready', {
          detail: { pixelId }
        });
        window.dispatchEvent(readyEvent);
        if (process.env.NODE_ENV === 'development') {
          
        }
      } catch (e) {
        console.warn('⚠️ [Facebook Pixel] فشل في إرسال إشعار الجاهزية:', e);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [Facebook Pixel] خطأ في التهيئة:', error);
      }
    }
  };
  
  document.head.appendChild(script);
  
  // إضافة noscript fallback
  const noscript = document.createElement('noscript');
  const img = document.createElement('img');
  img.height = 1;
  img.width = 1;
  img.style.display = 'none';
  img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1${
    testMode && testEventCode ? `&test_event_code=${testEventCode}` : ''
  }`;
  noscript.appendChild(img);
  document.body.appendChild(noscript);
}

// دالة تحميل Google Analytics متوافقة مع CSP
function loadGoogleAnalyticsCSPCompliant(gtagId: string, testMode: boolean) {
  if (typeof window === 'undefined') return;

  if (process.env.NODE_ENV === 'development') {
    
  }

  // تجنب التحميل المتكرر
  if (window.gtag && typeof window.gtag === 'function') {
    if (process.env.NODE_ENV === 'development') {
      
    }
    (window as any).gtag('config', gtagId, {
      debug_mode: testMode
    });
    return;
  }

  // إنشاء dataLayer و gtag function
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(...args: any[]) {
    window.dataLayer?.push(args);
  };
  
  if (process.env.NODE_ENV === 'development') {
    
  }
  (window as any).gtag('js', new Date());
  (window as any).gtag('config', gtagId, {
    debug_mode: testMode
  });

  // تحميل السكريبت الخارجي
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
  
  script.onload = () => {
    if (process.env.NODE_ENV === 'development') {
      
    }
  };
  
  script.onerror = (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ [Google Analytics] فشل تحميل السكريبت:', error);
    }
  };
  
  document.head.appendChild(script);
}

// دالة تحميل TikTok Pixel متوافقة مع CSP
function loadTikTokPixelCSPCompliant(pixelId: string, testMode: boolean, testEventCode?: string) {
  if (typeof window === 'undefined') return;

  if (process.env.NODE_ENV === 'development') {
    
  }

  // تجنب التحميل المتكرر
  if (window.ttq && typeof window.ttq === 'object') {
    if (process.env.NODE_ENV === 'development') {
      
    }
    return;
  }

  // إنشاء ttq object
  (window as any).TiktokAnalyticsObject = 'ttq';
  const ttq: any = (window as any).ttq || [];
  (window as any).ttq = ttq;
  (ttq as any).methods = [
    'page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 
    'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'
  ];
  
  (ttq as any).setAndDefer = function(t: any, e: string) {
    t[e] = function() {
      t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
    };
  };
  
  for (let i = 0; i < (ttq as any).methods.length; i++) {
    (ttq as any).setAndDefer(ttq, (ttq as any).methods[i]);
  }
  
  (ttq as any).instance = function(t: string) {
    const e = (ttq as any)._i[t] || [];
    for (let n = 0; n < (ttq as any).methods.length; n++) {
      (ttq as any).setAndDefer(e, (ttq as any).methods[n]);
    }
    return e;
  };
  
  (ttq as any).load = function(e: string, n?: any) {
    const i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
    (ttq as any)._i = (ttq as any)._i || {};
    (ttq as any)._i[e] = [];
    (ttq as any)._i[e]._u = i;
    (ttq as any)._t = (ttq as any)._t || {};
    (ttq as any)._t[e] = +new Date();
    (ttq as any)._o = (ttq as any)._o || {};
    (ttq as any)._o[e] = n || {};
    
    const o = document.createElement('script');
    o.type = 'text/javascript';
    o.async = true;
    o.src = i + '?sdkid=' + e + '&lib=ttq';
    // وسم كسكريبت غير حرج حتى لا يُظهر طبقة خطأ عند الفشل
    o.setAttribute('data-noncritical', 'true');
    o.setAttribute('data-source', 'tiktok-pixel');
    o.onerror = () => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ [TikTok Pixel] فشل تحميل السكريبت');
      }
    };
    
    o.onload = () => {
      if (process.env.NODE_ENV === 'development') {
        
      }
    };
    
    const a = document.getElementsByTagName('script')[0];
    a.parentNode?.insertBefore(o, a);
  };
  
  // تحميل البكسل
  if (process.env.NODE_ENV === 'development') {
    
  }
  (ttq as any).load(pixelId);
  ttq.page();
  
  // إضافة test event إذا كان في وضع الاختبار
  if (testMode && testEventCode) {
    if (process.env.NODE_ENV === 'development') {
      
    }
    ttq.track('Test', {}, { test_event_code: testEventCode });
  }
}

// مكون للتحميل الشرطي للبكسلات حسب الصفحة
export function ConditionalCSPPixelLoader({ 
  productId, 
  settings,
  loadOnlyFor 
}: { 
  productId: string;
  settings: PixelSettings;
  loadOnlyFor?: string[];
}) {
  
  // تحقق من أن المنتج في قائمة التحميل المحددة
  if (loadOnlyFor && !loadOnlyFor.includes(productId)) {
    return null;
  }

  return <CSPCompliantPixelLoader settings={settings} />;
}
