import { useEffect, useState } from 'react';
import { getCachedProductPageResult, isProductPagePreloading } from '@/utils/productPagePreloader';
import { getPreloadedProductFromDOM } from '@/utils/productDomPreload';
import { getPreloadedProduct } from '@/utils/earlyPreload';

export function usePreloadedProductData(productId?: string | null, organizationId?: string | null) {
  const [preloadedData, setPreloadedData] = useState<any>(null);
  const [isPreloaded, setIsPreloaded] = useState(false);

  useEffect(() => {
    if (!productId) return; // ✅ productId مطلوب دائماً

    const check = () => {
      // ✅ أولوية أعلى للبيانات المحملة من earlyPreload
      try {
        const earlyPreloadedProduct = getPreloadedProduct(productId);
        if (earlyPreloadedProduct && earlyPreloadedProduct.product) {
          setPreloadedData(earlyPreloadedProduct);
          setIsPreloaded(true);
          return true;
        }
      } catch (e) {
        console.warn('خطأ في قراءة البيانات المحملة مسبقاً:', e);
      }

      // DOM payload كبديل
      try {
        const domPre = getPreloadedProductFromDOM();
        if (domPre && domPre.success && domPre.data && domPre.data.product) {
          setPreloadedData(domPre.data);
          setIsPreloaded(true);
          return true;
        }
      } catch {}

      // البيانات المخزنة مؤقتاً كخيار أخير (فقط إذا كان organizationId متاح)
      if (organizationId) {
        const cached = getCachedProductPageResult(productId, organizationId);
        if (cached && cached.success && cached.data) {
          setPreloadedData(cached.data);
          setIsPreloaded(true);
          return true;
        }
      }
      return false;
    };

    // ✅ تحسين: تقليل الانتظار والمحاولة فقط إذا لم تكن البيانات متاحة من earlyPreload
    if (!check() && organizationId && isProductPagePreloading(productId, organizationId)) {
      let tries = 0;
      const max = 100; // 10s بدلاً من 30s
      const wait = () => {
        tries++;
        if (tries > max) return;
        if (check()) return;
        if (isProductPagePreloading(productId, organizationId)) setTimeout(wait, 100);
      };
      setTimeout(wait, 100);
    }
  }, [productId, organizationId]);

  return { preloadedData, isPreloaded };
}

