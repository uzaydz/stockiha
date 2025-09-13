'use client';

import { useEffect, useState } from 'react';
import ConversionTracking from './ConversionTracking';
import CSPCompliantPixelLoader from './CSPCompliantPixelLoader';

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
          return;
        }

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

          setPixelSettings(settings);
          
          // حفظ في التخزين المؤقت
          sessionStorage.setItem(`pixel_settings_${productId}`, JSON.stringify(settings));
        } else {
          
          // محاولة fallback إلى API route المحلي
          const fallbackResponse = await fetch(`/api/conversion-settings/${productId}`);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            
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
        
        // محاولة أخيرة: جلب مباشر من قاعدة البيانات
        try {
          // هذا fallback إضافي يمكن إضافته لاحقاً
        } catch (fallbackError) {
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
      {/* تحميل البكسلات مرة واحدة فقط - CSP Compliant */}
      {loadPixels && pixelSettings && (
        <CSPCompliantPixelLoader 
          settings={pixelSettings}
          onLoad={() => {
          }}
          advancedMatch={buildAdvancedMatch({
            email: userEmail || (customData as any)?.customer_email || (customData as any)?.email,
            phone: userPhone || (customData as any)?.customer_phone || (customData as any)?.phone,
            name: (customData as any)?.customer_name || (customData as any)?.name,
            city: (customData as any)?.city || (customData as any)?.municipality,
            state: (customData as any)?.state || (customData as any)?.province,
            country: (customData as any)?.country || 'DZ'
          })}
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

// Helpers: بناء Advanced Matching بشكل آمن
function buildAdvancedMatch(input: {
  email?: string;
  phone?: string;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
}) {
  const data: Record<string, any> = {};

  if (input.email && typeof input.email === 'string') data.em = input.email.trim();
  const cleanedPhone = cleanPhoneNumber(input.phone);
  if (cleanedPhone) data.ph = cleanedPhone;

  const { firstName, lastName } = splitName(input.name);
  if (firstName) data.first_name = firstName;
  if (lastName) data.last_name = lastName;

  if (input.city && typeof input.city === 'string') data.city = input.city.trim();
  if (input.state && typeof input.state === 'string') data.state = input.state.trim();
  if (input.country && typeof input.country === 'string') data.country = input.country.trim();

  // fbp من الكوكيز، fbc من URL/localStorage
  const fbp = getCookie('_fbp');
  if (fbp) data.fbp = fbp;
  const fbc = getFbc();
  if (fbc) data.fbc = fbc;

  return data;
}

function cleanPhoneNumber(phone?: string): string | null {
  if (!phone || typeof phone !== 'string') return null;
  let digits = phone.replace(/\D/g, '');
  // الجزائر: أزل 213 في البداية ثم أضف +213
  if (digits.startsWith('213')) digits = digits.slice(3);
  if (digits.length === 9 && !digits.startsWith('0')) digits = '0' + digits;
  if (digits.startsWith('0') && digits.length === 10) return `+213${digits.slice(1)}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('+' )) return digits;
  // fallback دولي إن أمكن
  if (digits.length >= 10) return `+${digits}`;
  return null;
}

function splitName(name?: string): { firstName?: string; lastName?: string } {
  if (!name || typeof name !== 'string') return {};
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  if (parts.length > 2) return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  return {};
}

function getCookie(name: string): string | undefined {
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [n, v] = cookie.trim().split('=');
      if (n === name && v) return v;
    }
  } catch {}
  return undefined;
}

function getFbc(): string | undefined {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get('fbclid');
    if (fbclid) return `fb.1.${Date.now()}.${fbclid}`;
    const stored = localStorage.getItem('facebook_click_id');
    if (stored) return stored;
    // من الكوكيز _fbc إن وجدت
    const fbcCookie = getCookie('_fbc');
    if (fbcCookie) return fbcCookie;
  } catch {}
  return undefined;
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
