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
      {/* تحميل البكسلات */}
      <EnhancedPixelLoader
        productId={productId}
        organizationId={organizationId}
        settings={productTracking?.settings || undefined}
        onPixelsLoaded={(loadedPixels) => {
          // معالجة البكسلات المحملة
        }}
        onPixelError={(platform, error) => {
          // معالجة أخطاء البكسل
        }}
      />
      
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


