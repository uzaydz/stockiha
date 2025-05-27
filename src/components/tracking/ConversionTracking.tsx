'use client';

import { useEffect, useRef } from 'react';
import { getConversionTracker, ConversionEvent } from '@/lib/conversion-tracking/ConversionTracker';

interface ConversionTrackingProps {
  productId: string;
  orderId?: string;
  eventType: 'view_content' | 'add_to_cart' | 'initiate_checkout' | 'purchase';
  value?: number;
  currency?: string;
  userEmail?: string;
  userPhone?: string;
  customData?: Record<string, any>;
  autoTrack?: boolean; // تتبع تلقائي عند التحميل
}

/**
 * مكون تتبع التحويلات المحسن
 * يدعم جميع منصات التتبع (Facebook, Google, TikTok)
 */
export default function ConversionTracking({
  productId,
  orderId,
  eventType,
  value,
  currency = 'DZD',
  userEmail,
  userPhone,
  customData,
  autoTrack = true
}: ConversionTrackingProps) {
  const hasTracked = useRef(false);
  const tracker = useRef(getConversionTracker(productId));

  // دالة لتتبع الحدث
  const trackConversion = async () => {
    if (hasTracked.current && eventType !== 'view_content') {
      return; // منع التتبع المتكرر للأحداث المهمة
    }

    try {
      // جمع بيانات المستخدم المتاحة
      const userData: ConversionEvent['user_data'] = {
        email: userEmail,
        phone: userPhone,
        external_id: orderId,
        client_ip_address: undefined, // سيتم جلبها من الخادم
        client_user_agent: navigator.userAgent,
        // جلب Facebook Click ID إذا كان متوفراً
        fbc: getFacebookClickId(),
        fbp: getFacebookBrowserId(),
      };

      const event: ConversionEvent = {
        event_type: eventType,
        product_id: productId,
        order_id: orderId,
        value,
        currency,
        user_data: userData,
        custom_data: {
          ...customData,
          page_url: window.location.href,
          page_title: document.title,
          timestamp: new Date().toISOString(),
        }
      };

      await tracker.current.trackEvent(event);
      hasTracked.current = true;

    } catch (error) {
    }
  };

  // تتبع تلقائي عند التحميل
  useEffect(() => {
    if (autoTrack) {
      // تأخير قصير للتأكد من تحميل المكونات
      const timer = setTimeout(trackConversion, 100);
      return () => clearTimeout(timer);
    }
  }, [productId, eventType, autoTrack]);

  // إرجاع دالة التتبع للاستخدام اليدوي
  useEffect(() => {
    // إضافة الدالة إلى window للوصول العام
    (window as any).trackConversion = trackConversion;
    
    return () => {
      delete (window as any).trackConversion;
    };
  }, []);

  // المكون لا يعرض محتوى مرئي
  return null;
}

// Helper Functions
function getFacebookClickId(): string | undefined {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('fbclid') || undefined;
  } catch {
    return undefined;
  }
}

function getFacebookBrowserId(): string | undefined {
  try {
    // محاولة جلب fbp من الكوكيز
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === '_fbp') {
        return value;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// Hook للاستخدام في المكونات الأخرى
export function useConversionTracking(productId: string) {
  const tracker = getConversionTracker(productId);

  const track = async (event: Partial<ConversionEvent>) => {
    if (!event.event_type || !event.product_id) {
      return;
    }

    const completeEvent: ConversionEvent = {
      event_type: event.event_type,
      product_id: event.product_id || productId,
      order_id: event.order_id,
      value: event.value,
      currency: event.currency || 'DZD',
      user_data: {
        ...event.user_data,
        client_user_agent: navigator.userAgent,
        fbc: getFacebookClickId(),
        fbp: getFacebookBrowserId(),
      },
      custom_data: {
        ...event.custom_data,
        page_url: window.location.href,
        timestamp: new Date().toISOString(),
      }
    };

    await tracker.trackEvent(completeEvent);
  };

  return { track };
}
