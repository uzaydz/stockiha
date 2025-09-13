import { useMemo } from 'react';
import { getPreloadedProductFromDOM } from '@/utils/productDomPreload';

export function useInitialQueryData() {
  return useMemo(() => {
    try {
      const dom = getPreloadedProductFromDOM();
      if (dom && dom.success && dom.data && dom.data.product) {
        const product = dom.data.product;
        const stats = dom.data.stats || null;
        return {
          product,
          organization: product?.organization || null,
          organizationSettings: null,
          visitorAnalytics: null,
          categories: [],
          provinces: [],
          trackingData: stats
        } as any;
      }
    } catch {}
    return undefined;
  }, []);
}

