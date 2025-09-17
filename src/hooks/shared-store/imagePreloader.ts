import { getCdnImageUrl } from '@/lib/image-cdn';

/**
 * Preloader للصور (محسّن لتقليل استهلاك البيانات)
 */

// Cache للصور المحملة مسبقاً لمنع التكرار
const preloadedImages = new Set<string>();

/**
 * فحص إعدادات المتصفح لتحسين استهلاك البيانات
 */
const shouldSkipPreloading = (): boolean => {
  try {
    // احترام Data Saver والاتصالات البطيئة
    const nav: any = navigator as any;
    const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
    if (conn?.saveData) return true;

    const type = (conn?.effectiveType || '').toString();
    if (type.includes('2g') || type.includes('slow-2g')) return true;

    return false;
  } catch {
    return false;
  }
};

/**
 * تحميل صورة واحدة مسبقاً
 */
const preloadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.loading = 'lazy';
      img.src = getCdnImageUrl(url, { width: 300, quality: 60, fit: 'cover', format: 'auto' });

      img.onload = () => {
        preloadedImages.add(url);
        resolve(url);
      };

      img.onerror = () => {
        preloadedImages.add(url); // إضافة حتى لو فشل التحميل لمنع المحاولة مرة أخرى
        resolve(url);
      };
    } catch {
      preloadedImages.add(url);
      resolve(url);
    }
  });
};

/**
 * تحميل الصور مسبقاً للمنتجات والفئات
 */
export const preloadImages = (products: any[], categories: any[]): Promise<void> => {
  try {
    // فحص إعدادات المتصفح
    if (shouldSkipPreloading()) {
      return Promise.resolve();
    }

    const imageUrls = new Set<string>();

    // جمع URLs الصور من المنتجات
    products.forEach(product => {
      if (product.thumbnail_image && !preloadedImages.has(product.thumbnail_image)) {
        imageUrls.add(product.thumbnail_image);
      }

      const imgs = Array.isArray(product.images) ? product.images : [];
      imgs.forEach((img: any) => {
        const url = typeof img === 'string' ? img : img?.url;
        if (url && !preloadedImages.has(url)) {
          imageUrls.add(url);
        }
      });
    });

    // جمع URLs الصور من الفئات
    categories.forEach(category => {
      if (category.image_url && !preloadedImages.has(category.image_url)) {
        imageUrls.add(category.image_url);
      }
    });

    // تقليل العدد لتجنب الحمل الزائد
    const limited = Array.from(imageUrls).slice(0, 3);

    // تحميل الصور بشكل متوازي
    const preloadPromises = limited.map(url => preloadImage(url));

    return Promise.allSettled(preloadPromises).then(() => {
      // silent - لا نحتاج للتعامل مع النتائج
    });
  } catch {
    return Promise.resolve();
  }
};

/**
 * تنظيف cache الصور المحملة مسبقاً
 */
export const clearPreloadedImages = (): void => {
  preloadedImages.clear();
};

/**
 * التحقق من وجود صورة في cache
 */
export const isImagePreloaded = (url: string): boolean => {
  return preloadedImages.has(url);
};

/**
 * الحصول على إحصائيات الصور المحملة مسبقاً
 */
export const getPreloadedImagesStats = () => {
  return {
    preloadedCount: preloadedImages.size,
    shouldSkip: shouldSkipPreloading()
  };
};
