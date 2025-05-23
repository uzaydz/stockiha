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
  };
  google: {
    enabled: boolean;
    gtag_id?: string;
  };
  tiktok: {
    enabled: boolean;
    pixel_id?: string;
  };
  test_mode: boolean;
}

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
          return;
        }

        // جلب من الخادم
        const response = await fetch(`/api/conversion-settings/${productId}`);
        if (response.ok) {
          const data = await response.json();
          
          // تحويل البيانات إلى التنسيق المطلوب
          const settings: PixelSettings = {
            facebook: {
              enabled: data.settings?.facebook?.enabled || false,
              pixel_id: data.settings?.facebook?.pixel_id
            },
            google: {
              enabled: data.settings?.google?.enabled || false,
              gtag_id: data.settings?.google?.gtag_id
            },
            tiktok: {
              enabled: data.settings?.tiktok?.enabled || false,
              pixel_id: data.settings?.tiktok?.pixel_id
            },
            test_mode: data.settings?.test_mode || false
          };

          setPixelSettings(settings);
          
          // حفظ في التخزين المؤقت
          sessionStorage.setItem(`pixel_settings_${productId}`, JSON.stringify(settings));
        }
      } catch (error) {
        console.error('خطأ في تحميل إعدادات البكسل:', error);
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
            console.log('✅ تم تحميل جميع البكسلات بنجاح');
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
        const response = await fetch(`/api/conversion-settings/${productId}`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
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