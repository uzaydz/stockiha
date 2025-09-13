import { useEffect } from 'react';
import { useProductTracking } from '@/hooks/useProductTracking';

export function useTracking(productId: string | undefined, organizationId: string | null, product: any) {
  const tracking = useProductTracking({
    productId: productId!,
    organizationId: organizationId,
    autoLoadSettings: true,
    enableDebugMode: process.env.NODE_ENV === 'development'
  });

  useEffect(() => {
    if (product && !tracking.isReady && !tracking.isLoading) {
      tracking.setSettingsFromProduct(product);
    }
  }, [product?.id, tracking.isReady, tracking.isLoading, tracking.setSettingsFromProduct]);

  return tracking;
}

