'use client';

import { useEffect, useState } from 'react';
import ConversionTracking from './ConversionTracking';
import PixelLoader from './PixelLoader';

interface ProductTrackingWrapperProps {
  productId: string;
  orderId?: string;
  eventType: 'view_content' | 'add_to_cart' | 'initiate_checkout' | 'purchase';
  value?: number;
  currency?: string;
  userEmail?: string;
  userPhone?: string;
  customData?: Record<string, any>;
  loadPixels?: boolean; // تحميل البكسلات
}

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

// Supabase Edge Function URL
const SUPABASE_URL = 'https://wrnssatuvmumsczyldth.supabase.co';
const CONVERSION_SETTINGS_URL = `${SUPABASE_URL}/functions/v1/conversion-settings`;

/**
 * مكون شامل لتتبع التحويلات والبكسلات
 * يجمع بين تحميل البكسلات وتتبع الأحداث
 */
export default function ProductTrackingWrapper({
  productId,
  orderId,
  eventType,
  value,
  currency = 'DZD',
  userEmail,
  userPhone,
  customData,
  loadPixels = true
}: ProductTrackingWrapperProps) {
  const [pixelSettings, setPixelSettings] = useState<PixelSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // تحميل إعدادات البكسل
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // محاولة جلب الإعدادات من التخزين المؤقت أولاً
        const cachedSettings = sessionStorage.getItem(`pixel_settings_${productId}`);
        if (cachedSettings) {
          const settings = JSON.parse(cachedSettings);
          setPixelSettings(settings);
          setIsLoading(false);
          console.log('📦 تم جلب إعدادات البكسل من التخزين المؤقت');
          return;
        }

        console.log('🔍 جلب إعدادات البكسل من Edge Function للمنتج:', productId);

        // جلب من Edge Function
        const response = await fetch(`${CONVERSION_SETTINGS_URL}?productId=${productId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ تم جلب إعدادات التحويل من Edge Function:', data);
          
          // تحويل البيانات إلى التنسيق المطلوب
          const settings: PixelSettings = {
            facebook: {
              enabled: data.settings?.facebook?.enabled || false,
              pixel_id: data.settings?.facebook?.pixel_id,
              test_event_code: data.settings?.facebook?.test_event_code
            },
            google: {
              enabled: data.settings?.google?.enabled || false,
              gtag_id: data.settings?.google?.gtag_id
            },
            tiktok: {
              enabled: data.settings?.tiktok?.enabled || false,
              pixel_id: data.settings?.tiktok?.pixel_id,
              test_event_code: data.settings?.tiktok?.test_event_code
            },
            test_mode: data.settings?.test_mode || false
          };

          console.log('🎯 إعدادات البكسل المُعالجة:', settings);
          setPixelSettings(settings);
          
          // حفظ في التخزين المؤقت
          sessionStorage.setItem(`pixel_settings_${productId}`, JSON.stringify(settings));
        } else {
          console.error('❌ خطأ في response من Edge Function:', response.status, response.statusText);
          
          // محاولة fallback إلى API route المحلي
          console.log('🔄 محاولة fallback إلى API route المحلي...');
          const fallbackResponse = await fetch(`/api/conversion-settings/${productId}`);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log('✅ تم جلب إعدادات التحويل من API المحلي:', fallbackData);
            
            const settings: PixelSettings = {
              facebook: {
                enabled: fallbackData.settings?.facebook?.enabled || false,
                pixel_id: fallbackData.settings?.facebook?.pixel_id,
                test_event_code: fallbackData.settings?.facebook?.test_event_code
              },
              google: {
                enabled: fallbackData.settings?.google?.enabled || false,
                gtag_id: fallbackData.settings?.google?.gtag_id
              },
              tiktok: {
                enabled: fallbackData.settings?.tiktok?.enabled || false,
                pixel_id: fallbackData.settings?.tiktok?.pixel_id,
                test_event_code: fallbackData.settings?.tiktok?.test_event_code
              },
              test_mode: fallbackData.settings?.test_mode || false
            };
            
            setPixelSettings(settings);
            sessionStorage.setItem(`pixel_settings_${productId}`, JSON.stringify(settings));
          }
        }
      } catch (error) {
        console.error('❌ خطأ في تحميل إعدادات البكسل:', error);
        
        // محاولة أخيرة: جلب مباشر من قاعدة البيانات
        try {
          console.log('🔄 محاولة أخيرة: جلب مباشر من قاعدة البيانات...');
          // هذا fallback إضافي يمكن إضافته لاحقاً
        } catch (fallbackError) {
          console.error('❌ فشل في جميع محاولات جلب إعدادات البكسل:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (loadPixels) {
      loadSettings();
    } else {
      setIsLoading(false);
    }
  }, [productId, loadPixels]);

  // عدم عرض شيء أثناء التحميل
  if (isLoading) {
    return null;
  }

  return (
    <>
      {/* تحميل البكسلات مرة واحدة فقط */}
      {loadPixels && pixelSettings && (
        <PixelLoader 
          settings={pixelSettings}
          onLoad={() => {
            console.log('✅ تم تحميل جميع البكسلات بنجاح:', pixelSettings);
          }}
        />
      )}

      {/* تتبع الأحداث */}
      <ConversionTracking
        productId={productId}
        orderId={orderId}
        eventType={eventType}
        value={value}
        currency={currency}
        userEmail={userEmail}
        userPhone={userPhone}
        customData={{
          ...customData,
          pixel_settings_loaded: !!pixelSettings,
          timestamp: new Date().toISOString()
        }}
        autoTrack={true}
      />
    </>
  );
}

// Hook للاستخدام في المكونات المختلفة
export function useProductTracking(productId: string) {
  const [settings, setSettings] = useState<PixelSettings | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // محاولة Edge Function أولاً
        const response = await fetch(`${CONVERSION_SETTINGS_URL}?productId=${productId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
        } else {
          // Fallback إلى API المحلي
          const fallbackResponse = await fetch(`/api/conversion-settings/${productId}`);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            setSettings(fallbackData.settings);
          }
        }
      } catch (error) {
        console.error('خطأ في تحميل إعدادات التتبع:', error);
      }
    };

    loadSettings();
  }, [productId]);

  const trackEvent = async (
    eventType: 'view_content' | 'add_to_cart' | 'initiate_checkout' | 'purchase',
    eventData?: {
      orderId?: string;
      value?: number;
      currency?: string;
      userEmail?: string;
      userPhone?: string;
    }
  ) => {
    if (typeof window !== 'undefined' && (window as any).trackConversion) {
      await (window as any).trackConversion();
    }
  };

  return {
    settings,
    trackEvent,
    isPixelLoaded: !!settings
  };
} 