import React from 'react';
import QuickTrackingCheck from '@/components/debug/QuickTrackingCheck';
import { TrackingDebugConsole } from '@/components/debug/TrackingDebugConsole';
import { ConversionAPIMonitor } from '@/components/debug/ConversionAPIMonitor';
import { TrackingSettingsViewer } from '@/components/debug/TrackingSettingsViewer';
import { FacebookEventsLogger } from '@/components/debug/FacebookEventsLogger';
import FacebookPixelChecker from '@/components/debug/FacebookPixelChecker';
import { CustomerDataTracker } from '@/components/debug/CustomerDataTracker';
import { MatchQualityOptimizer } from '@/components/debug/MatchQualityOptimizer';

interface ProductDebugToolsProps {
  productId: string;
  organizationId: string;
  productTracking?: any;
}

export const ProductDebugTools: React.FC<ProductDebugToolsProps> = React.memo(({
  productId,
  organizationId,
  productTracking
}) => {
  // عرض أدوات التشخيص فقط في بيئة التطوير
  if (process.env.NODE_ENV !== 'development') {
    return <QuickTrackingCheck />;
  }

  return (
    <>
      {/* مكون التحقق السريع من التتبع */}
      <QuickTrackingCheck />

      {/* كونسول التشخيص */}
      <TrackingDebugConsole 
        productId={productId} 
        organizationId={organizationId}
      />
      
      {/* مراقب API التحويل */}
      <ConversionAPIMonitor />
      
      {/* عارض إعدادات التتبع */}
      <TrackingSettingsViewer 
        settings={productTracking?.settings || null}
        productId={productId}
        organizationId={organizationId}
      />
      
      {/* مسجل أحداث Facebook */}
      <FacebookEventsLogger 
        pixelId={(productTracking?.settings as any)?.facebook_pixel_id || null}
      />
      
      {/* فاحص Facebook Pixel */}
      <FacebookPixelChecker />
      
      {/* متتبع بيانات العملاء */}
      <CustomerDataTracker />
      
      {/* محسن جودة المطابقة */}
      <MatchQualityOptimizer />
    </>
  );
});

ProductDebugTools.displayName = 'ProductDebugTools';


