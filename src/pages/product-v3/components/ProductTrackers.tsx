import React, { Suspense, lazy, useEffect, useState } from 'react';
import { isInAppWebView } from '@/utils/inAppWebView';

const ProductTrackingContainer = lazy(() => import('@/components/product-page/ProductTrackingContainer').then(m => ({ default: m.ProductTrackingContainer })));

interface Props {
  enabled: boolean;
  productId: string;
  organizationId: string;
  product: any;
  selectedColor: any;
  selectedSize: any;
  quantity: number;
  productTracking: any;
  conversionTrackerRef: any;
}

const ProductTrackers: React.FC<Props> = React.memo(({ enabled, ...rest }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const schedule = () => setReady(true);
    const iab = isInAppWebView();

    // In any in-app webview, wait for first user interaction or fallback timeout
    if (iab) {
      let done = false;
      const onFirst = () => {
        if (done) return;
        done = true;
        schedule();
      };
      window.addEventListener('iab-first-interaction', onFirst as any, { once: true } as any);
      window.addEventListener('fbwv-first-interaction', onFirst as any, { once: true } as any);
      window.addEventListener('igwv-first-interaction', onFirst as any, { once: true } as any);
      window.addEventListener('ttwv-first-interaction', onFirst as any, { once: true } as any);
      const t = setTimeout(() => { if (!done) onFirst(); }, 8000);
      return () => {
        window.removeEventListener('iab-first-interaction', onFirst as any);
        window.removeEventListener('fbwv-first-interaction', onFirst as any);
        window.removeEventListener('igwv-first-interaction', onFirst as any);
        window.removeEventListener('ttwv-first-interaction', onFirst as any);
        clearTimeout(t);
      };
    }

    // Default behavior for normal browsers
    try {
      const conn = (navigator as any)?.connection?.effectiveType as string | undefined;
      const slow = conn === '2g' || conn === 'slow-2g';
      const delay = slow ? 4000 : 2000;

      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(schedule, { timeout: delay });
      } else {
        const t = setTimeout(schedule, delay);
        return () => clearTimeout(t);
      }
    } catch {
      const t = setTimeout(schedule, 2000);
      return () => clearTimeout(t);
    }
  }, [enabled]);

  if (!enabled || !ready) return null;
  return (
    <Suspense fallback={null}>
      <ProductTrackingContainer {...rest} />
    </Suspense>
  );
});

ProductTrackers.displayName = 'ProductTrackers';

export default ProductTrackers;
