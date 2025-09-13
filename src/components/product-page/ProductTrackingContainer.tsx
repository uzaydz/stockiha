import React, { forwardRef, useImperativeHandle } from 'react';
import CSPCompliantPixelLoader from '@/components/tracking/CSPCompliantPixelLoader';
import ProductConversionTracker from '@/components/tracking/ProductConversionTracker';

interface ProductTrackingContainerProps {
  productId: string;
  organizationId: string;
  product?: any;
  selectedColor?: any;
  selectedSize?: any;
  quantity: number;
  productTracking?: any;
  onTrackingReady?: () => void;
  onTrackingError?: (error: any) => void;
}

export const ProductTrackingContainer = forwardRef<any, ProductTrackingContainerProps>(({
  productId,
  organizationId,
  product,
  selectedColor,
  selectedSize,
  quantity,
  productTracking,
  onTrackingReady,
  onTrackingError
}, ref) => {
  const conversionTrackerRef = React.useRef<any>(null);
  const [shouldLoadPixels, setShouldLoadPixels] = React.useState(false);
  const [pixelLoadAttempts, setPixelLoadAttempts] = React.useState(0);

  // تبسيط تحميل البكسلات - إزالة التعقيد والاعتماد على أحداث غير مضمونة
  React.useEffect(() => {
    // تحميل فوري مع تأخير بسيط فقط لضمان استقرار DOM
    const timer = setTimeout(() => {
      setShouldLoadPixels(true);
    }, 100); // تأخير بسيط فقط
    
    return () => clearTimeout(timer);
  }, []);

  // إعادة المحاولة التلقائية في حالة الفشل
  React.useEffect(() => {
    if (shouldLoadPixels && pixelLoadAttempts < 3) {
      const retryTimer = setTimeout(() => {
        if (!conversionTrackerRef.current?.isReady) {
          setPixelLoadAttempts(prev => prev + 1);
          // إعادة تحميل البكسلات
          setShouldLoadPixels(false);
          setTimeout(() => setShouldLoadPixels(true), 100);
        }
      }, 2000); // إعادة المحاولة بعد ثانيتين
      
      return () => clearTimeout(retryTimer);
    }
  }, [shouldLoadPixels, pixelLoadAttempts]);

  const pixelSettings = productTracking?.settings;
  
  // تحسين منطق التحقق من البكسلات المفعلة
  const hasAnyPixelEnabled = React.useMemo(() => {
    // فحص الإعدادات المحلية أولاً
    const localEnabled = !!(
      pixelSettings?.facebook?.enabled ||
      pixelSettings?.google?.enabled ||
      pixelSettings?.tiktok?.enabled
    );
    
    // فحص البكسلات المحملة على مستوى المتجر كنسخة احتياطية
    const storePixelsLoaded = typeof window !== 'undefined' && (
      typeof (window as any).fbq === 'function' ||
      typeof (window as any).gtag === 'function' ||
      typeof (window as any).ttq?.track === 'function'
    );
    
    const shouldLoad = localEnabled || storePixelsLoaded;
    
    
    return shouldLoad;
  }, [pixelSettings]);

  // Expose conversion tracker methods to parent
  useImperativeHandle(ref, () => ({
    trackPurchase: async (orderId: string, totalValue: number, customerData: any) => {
      if (conversionTrackerRef.current?.isReady) {
        return await conversionTrackerRef.current.trackPurchase(orderId, totalValue, customerData);
      }
    },
    isReady: conversionTrackerRef.current?.isReady || false
  }));

  // تعريض دوال التتبع للاستخدام العام من أجزاء أخرى لا تمتلك المرجع
  React.useEffect(() => {
    const g: any = typeof window !== 'undefined' ? (window as any) : {};
    g.__trackAddToCart = async () => {
      try {
        if (conversionTrackerRef.current?.isReady) {
          await conversionTrackerRef.current.trackAddToCart?.();
        }
      } catch {}
    };
    g.__trackInitiateCheckout = async (formData?: Record<string, any>) => {
      try {
        if (conversionTrackerRef.current?.isReady) {
          await conversionTrackerRef.current.trackInitiateCheckout?.(formData);
        }
      } catch {}
    };
    g.__trackPurchase = async (orderId: string, totalValue: number, formData?: Record<string, any>) => {
      try {
        if (conversionTrackerRef.current?.isReady) {
          await conversionTrackerRef.current.trackPurchase?.(orderId, totalValue, formData);
        }
      } catch {}
    };
    return () => {
      try {
        delete g.__trackAddToCart;
        delete g.__trackInitiateCheckout;
        delete g.__trackPurchase;
      } catch {}
    };
  }, []);

  // مراقبة حالة البكسل في وضع التطوير
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const fbqReady = typeof window !== 'undefined' && typeof window.fbq === 'function';
        const gtagReady = typeof window !== 'undefined' && typeof window.gtag === 'function';
        const ttqReady = typeof window !== 'undefined' && typeof (window as any).ttq?.track === 'function';
        
      }, 5000); // كل 5 ثواني
      
      return () => clearInterval(interval);
    }
  }, [shouldLoadPixels, hasAnyPixelEnabled, pixelLoadAttempts]);

  return (
    <>
      {/* تحميل البكسلات - مبسط ومحسن */}
      {shouldLoadPixels && hasAnyPixelEnabled && (
        <CSPCompliantPixelLoader
          settings={pixelSettings}
          onLoad={() => {
          }}
        />
      )}
      
      {/* متتبع التحويل */}
      <ProductConversionTracker
        ref={conversionTrackerRef}
        productId={productId}
        organizationId={organizationId}
        product={product}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        quantity={quantity}
        currency="DZD"
        onTrackingReady={() => {
          onTrackingReady?.();
        }}
        onTrackingError={(error) => {
          onTrackingError?.(error);
        }}
      />
    </>
  );
});

ProductTrackingContainer.displayName = 'ProductTrackingContainer';
