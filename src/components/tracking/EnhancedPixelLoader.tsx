import React, { useEffect, useState, useCallback } from 'react';

interface PixelSettings {
  facebook: {
    enabled: boolean;
    pixel_id?: string;
    conversion_api_enabled?: boolean;
    access_token?: string;
    test_event_code?: string;
  };
  google: {
    enabled: boolean;
    gtag_id?: string;
    ads_conversion_id?: string;
    ads_conversion_label?: string;
  };
  tiktok: {
    enabled: boolean;
    pixel_id?: string;
    events_api_enabled?: boolean;
    access_token?: string;
    test_event_code?: string;
  };
  test_mode: boolean;
}

interface EnhancedPixelLoaderProps {
  productId: string;
  organizationId?: string;
  settings?: PixelSettings;
  onPixelsLoaded?: (loadedPixels: string[]) => void;
  onPixelError?: (platform: string, error: string) => void;
}

declare global {
  interface Window {
    fbq?: (action: string, event: string, data?: any, options?: any) => void;
    gtag?: (...args: any[]) => void;
    ttq?: {
      track: (event: string, data?: any) => void;
      page: () => void;
      load: (pixelId: string) => void;
    };
    dataLayer?: any[];
  }
}

export const EnhancedPixelLoader: React.FC<EnhancedPixelLoaderProps> = ({
  productId,
  organizationId,
  settings,
  onPixelsLoaded,
  onPixelError
}) => {
  const [loadedPixels, setLoadedPixels] = useState<string[]>([]);
  const [pixelErrors, setPixelErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // دالة تحميل Facebook Pixel المحسنة
  const loadFacebookPixel = useCallback(async (pixelId: string, testMode: boolean, testEventCode?: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // تجنب التحميل المتكرر
        if (window.fbq) {
          console.log('✅ Facebook Pixel محمل مسبقاً');
          resolve();
          return;
        }

        // تحميل Facebook Pixel
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
          fbq('track', 'PageView');
          
          ${testMode && testEventCode ? `fbq('track', 'Test', {}, { testEventCode: '${testEventCode}' });` : ''}
        `;
        
        script.onload = () => {
          console.log('✅ Facebook Pixel تم تحميله بنجاح');
          resolve();
        };
        
        script.onerror = () => {
          const error = 'فشل في تحميل Facebook Pixel';
          console.error('❌', error);
          reject(new Error(error));
        };
        
        document.head.appendChild(script);
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  // دالة تحميل Google Analytics/Ads المحسنة
  const loadGoogleAnalytics = useCallback(async (gtagId: string, testMode: boolean) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // تجنب التحميل المتكرر
        if (window.gtag) {
          console.log('✅ Google Analytics محمل مسبقاً');
          resolve();
          return;
        }

        // تهيئة dataLayer
        window.dataLayer = window.dataLayer || [];
        window.gtag = function() {
          window.dataLayer!.push(arguments);
        };

        // تحميل Google Analytics
        const script = document.createElement('script');
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
        script.async = true;
        
        script.onload = () => {
          window.gtag!('js', new Date().toISOString());
          window.gtag!('config', gtagId, {
            debug_mode: testMode,
            send_page_view: true
          });
          
          console.log('✅ Google Analytics تم تحميله بنجاح');
          resolve();
        };
        
        script.onerror = () => {
          const error = 'فشل في تحميل Google Analytics';
          console.error('❌', error);
          reject(new Error(error));
        };
        
        document.head.appendChild(script);
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  // دالة تحميل TikTok Pixel المحسنة
  const loadTikTokPixel = useCallback(async (pixelId: string, testMode: boolean, testEventCode?: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // تجنب التحميل المتكرر
        if (window.ttq) {
          console.log('✅ TikTok Pixel محمل مسبقاً');
          resolve();
          return;
        }

        // تحميل TikTok Pixel
        const script = document.createElement('script');
        script.innerHTML = `
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
            
            ttq.load('${pixelId}');
            ttq.page();
            
            ${testMode && testEventCode ? `ttq.track('Test', {}, { test_event_code: '${testEventCode}' });` : ''}
          }(window, document, 'ttq');
        `;
        
        // انتظار تحميل السكريبت
        setTimeout(() => {
          if (window.ttq) {
            console.log('✅ TikTok Pixel تم تحميله بنجاح');
            resolve();
          } else {
            const error = 'فشل في تحميل TikTok Pixel';
            console.error('❌', error);
            reject(new Error(error));
          }
        }, 2000);
        
        document.head.appendChild(script);
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  // تحميل جميع البكسلات
  useEffect(() => {
    const loadAllPixels = async () => {
      if (!settings || !organizationId) {
        console.warn('🚨 إعدادات البكسل أو organizationId مفقود');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const loaded: string[] = [];
      const errors: Record<string, string> = {};

      console.log('🔄 بدء تحميل البكسلات...', settings);

      // تحميل Facebook Pixel
      if (settings.facebook.enabled && settings.facebook.pixel_id) {
        try {
          await loadFacebookPixel(
            settings.facebook.pixel_id,
            settings.test_mode,
            settings.facebook.test_event_code
          );
          loaded.push('facebook');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
          errors.facebook = errorMessage;
          onPixelError?.('facebook', errorMessage);
        }
      }

      // تحميل Google Analytics
      if (settings.google.enabled && settings.google.gtag_id) {
        try {
          await loadGoogleAnalytics(settings.google.gtag_id, settings.test_mode);
          loaded.push('google');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
          errors.google = errorMessage;
          onPixelError?.('google', errorMessage);
        }
      }

      // تحميل TikTok Pixel
      if (settings.tiktok.enabled && settings.tiktok.pixel_id) {
        try {
          await loadTikTokPixel(
            settings.tiktok.pixel_id,
            settings.test_mode,
            settings.tiktok.test_event_code
          );
          loaded.push('tiktok');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
          errors.tiktok = errorMessage;
          onPixelError?.('tiktok', errorMessage);
        }
      }

      setLoadedPixels(loaded);
      setPixelErrors(errors);
      setIsLoading(false);

      console.log('✅ اكتمل تحميل البكسلات:', { loaded, errors });
      onPixelsLoaded?.(loaded);
    };

    loadAllPixels();
  }, [settings, organizationId, loadFacebookPixel, loadGoogleAnalytics, loadTikTokPixel, onPixelsLoaded, onPixelError]);

  // عرض حالة البكسلات في وضع التطوير
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 left-4 bg-background border border-border rounded-lg p-3 shadow-lg z-50 max-w-xs">
        <div className="text-xs space-y-1">
          <div className="font-semibold text-foreground">📡 حالة البكسلات</div>
          
          {isLoading && (
            <div className="flex items-center gap-2 text-yellow-600">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <span>قيد التحميل...</span>
            </div>
          )}
          
          {!isLoading && (
            <>
              <div className="space-y-1">
                {['facebook', 'google', 'tiktok'].map(platform => {
                  const isLoaded = loadedPixels.includes(platform);
                  const hasError = pixelErrors[platform];
                  const platformSettings = settings?.[platform as keyof PixelSettings];
                  const isEnabled = typeof platformSettings === 'object' && platformSettings?.enabled;
                  
                  if (!isEnabled) return null;
                  
                  return (
                    <div key={platform} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        hasError ? 'bg-red-500' : isLoaded ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span className={`capitalize ${
                        hasError ? 'text-red-600' : isLoaded ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {platform}: {hasError ? 'خطأ' : isLoaded ? 'محمل' : 'غير محمل'}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {Object.keys(pixelErrors).length > 0 && (
                <div className="text-red-600 text-xs mt-2">
                  أخطاء: {Object.keys(pixelErrors).length}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default EnhancedPixelLoader; 