import React, { forwardRef, useImperativeHandle } from 'react';
import EnhancedPixelLoader from '@/components/tracking/EnhancedPixelLoader';
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

  // تأجيل تحميل سكربتات التتبع لما بعد أول رسم أو خمول المتصفح
  React.useEffect(() => {
    let idleId: number | null = null;
    const enable = () => setShouldLoadPixels(true);
    // @ts-ignore requestIdleCallback قد لا تكون معرفة
    if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
      // @ts-ignore
      idleId = (window as any).requestIdleCallback(enable, { timeout: 2000 });
    } else {
      const t = setTimeout(enable, 1200);
      return () => clearTimeout(t);
    }
    return () => {
      if (idleId) {
        // @ts-ignore
        (window as any).cancelIdleCallback?.(idleId);
      }
    };
  }, []);

  const pixelSettings = productTracking?.settings;
  const hasAnyPixelEnabled = !!(
    pixelSettings?.facebook?.enabled ||
    pixelSettings?.google?.enabled ||
    pixelSettings?.tiktok?.enabled
  );

  // Expose conversion tracker methods to parent
  useImperativeHandle(ref, () => ({
    trackPurchase: async (orderId: string, totalValue: number, customerData: any) => {
      if (conversionTrackerRef.current?.isReady) {
        return await conversionTrackerRef.current.trackPurchase(orderId, totalValue, customerData);
      }
    },
    isReady: conversionTrackerRef.current?.isReady || false
  }));

  return (
    <>
      {/* تحميل البكسلات (مؤجل) */}
      {shouldLoadPixels && hasAnyPixelEnabled && (
        <EnhancedPixelLoader
          productId={productId}
          organizationId={organizationId}
          settings={pixelSettings}
          onPixelsLoaded={() => {}}
          onPixelError={() => {}}
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
        onTrackingReady={onTrackingReady}
        onTrackingError={onTrackingError}
      />
    </>
  );
});

ProductTrackingContainer.displayName = 'ProductTrackingContainer';




