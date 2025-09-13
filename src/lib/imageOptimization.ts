/**
 * مكتبة تحسين الصور - تحسين الأداء وسرعة التحميل
 */

import { getCdnImageUrl } from '@/lib/image-cdn';

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png' | 'auto';
  fit?: 'crop' | 'fill' | 'contain' | 'cover';
}

/**
 * تحسين رابط الصورة مع معاملات الأداء
 */
export const optimizeImageUrl = (
  url: string, 
  options: ImageOptimizationOptions = {}
): string => {
  if (!url) return '';

  const {
    width = 800,
    height = 600,
    quality = 85,
    format = 'webp',
    fit = 'crop'
  } = options;

  // تحسين صور Unsplash
  if (url.includes('unsplash.com')) {
    const params = new URLSearchParams();
    params.set('auto', 'format');
    params.set('fit', fit);
    params.set('w', width.toString());
    params.set('h', height.toString());
    params.set('q', quality.toString());
    if (format !== 'auto') {
      params.set('fm', format);
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  // تحسين صور Cloudinary
  if (url.includes('cloudinary.com')) {
    const transformations = `c_${fit},w_${width},h_${height},q_${quality},f_${format}`;
    return url.replace('/upload/', `/upload/${transformations}/`);
  }

  // للصور الأخرى، إرجاع الرابط كما هو
  return url;
};

/**
 * إنشاء مجموعة أحجام مختلفة للصورة (responsive images)
 */
export const generateResponsiveSizes = (
  url: string,
  sizes: number[] = [400, 600, 800, 1200]
): string => {
  if (!url) return '';

  const srcSet = sizes
    .map(size => `${optimizeImageUrl(url, { width: size })} ${size}w`)
    .join(', ');

  return srcSet;
};

/**
 * preload الصور المهمة
 */
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    try {
      // Route through CDN with conservative size for preloads
      const cdn = getCdnImageUrl(url, { width: 480, quality: 70, fit: 'cover', format: 'auto' });
      img.src = cdn;
    } catch {
      img.src = url;
    }
  });
};

/**
 * preload مجموعة من الصور
 */
export const preloadImages = async (urls: string[]): Promise<void> => {
  const promises = urls.map(url => preloadImage(url));
  await Promise.allSettled(promises);
};

/**
 * إنشاء placeholder blur للصورة
 */
export const generateBlurPlaceholder = (url: string): string => {
  return optimizeImageUrl(url, {
    width: 20,
    height: 20,
    quality: 10,
    format: 'jpg'
  });
};

/**
 * التحقق من دعم تنسيق WebP
 */
export const supportsWebP = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

/**
 * الحصول على أفضل تنسيق مدعوم
 */
export const getBestSupportedFormat = (): 'webp' | 'jpg' => {
  return supportsWebP() ? 'webp' : 'jpg';
};

/**
 * تحسين صور المتجر (خاص بالمنتجات والفئات)
 */
export const optimizeStoreImage = (url: string, type: 'product' | 'category' | 'thumbnail' = 'product'): string => {
  const configs = {
    product: { width: 800, height: 600, quality: 85 },
    category: { width: 600, height: 400, quality: 80 },
    thumbnail: { width: 300, height: 300, quality: 75 }
  };

  return optimizeImageUrl(url, {
    ...configs[type],
    format: getBestSupportedFormat()
  });
};

/**
 * إنشاء عنصر preload link
 */
export const createPreloadLink = (url: string): HTMLLinkElement => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  return link;
};

/**
 * إضافة preload links للصور المهمة - محسن لتجنب التحذيرات
 */
export const addPreloadLinks = (urls: string[], delay: number = 0): void => {
  // إضافة تأخير اختياري لتجنب preload غير الضروري
  setTimeout(() => {
    urls.forEach(url => {
      if (url && !document.querySelector(`link[rel="preload"][href="${url}"]`)) {
        const link = createPreloadLink(url);
        
        // إضافة timestamp لتتبع وقت الإنشاء
        link.setAttribute('data-created', Date.now().toString());
        
        document.head.appendChild(link);
        
        // إزالة تلقائية بعد 3 ثوان إذا لم يتم استخدام الصورة (تقليل الوقت)
        setTimeout(() => {
          if (link.parentNode) {
            link.remove();
          }
        }, 3000);
      }
    });
  }, delay);
};

/**
 * إزالة preload links لتوفير الذاكرة
 */
export const removePreloadLinks = (): void => {
  const links = document.querySelectorAll('link[rel="preload"][as="image"]');
  links.forEach(link => link.remove());
};

/**
 * preload ذكي للصور - يحمل فقط الصور المرئية أو التي ستكون مرئية قريباً
 */
export const smartPreloadImages = (urls: string[], options: {
  immediate?: boolean;
  delay?: number;
  priority?: 'high' | 'low';
  maxImages?: number;
} = {}): void => {
  const { 
    immediate = false, 
    delay = 500, 
    priority = 'low',
    maxImages = 3
  } = options;
  
  if (immediate) {
    // للصور المهمة جداً (مثل صورة المنتج الحالي) - تحميل فوري بدون preload links
    const priorityUrls = urls.slice(0, 2);
    priorityUrls.forEach(url => {
      if (url) {
        const img = new Image();
        img.loading = 'eager';
        img.decoding = 'sync';
        img.src = url;
        
        // Mark the image as used in preload manager if available
        if (typeof window !== 'undefined' && (window as any).preloadManager) {
          (window as any).preloadManager.markAsUsed(url);
        }
      }
    });
  } else {
    // للصور الأخرى، استخدم Intersection Observer للتحميل عند الحاجة
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // تحميل مباشر بدلاً من preload links لتجنب التحذيرات
            const limitedUrls = urls.slice(0, maxImages);
            limitedUrls.forEach(url => {
              if (url) {
                const img = new Image();
                img.loading = 'lazy';
                img.src = url;
                
                // Mark the image as used in preload manager if available
                if (typeof window !== 'undefined' && (window as any).preloadManager) {
                  (window as any).preloadManager.markAsUsed(url);
                }
              }
            });
            observer.disconnect();
          }
        });
      }, {
        rootMargin: '50px' // ابدأ التحميل قبل 50px من ظهور العنصر
      });
      
      // مراقبة العنصر الأول في الصفحة للبدء
      const firstElement = document.querySelector('main, #root, body > div');
      if (firstElement) {
        observer.observe(firstElement);
      }
    } else {
      // fallback للمتصفحات القديمة - تحميل مباشر بدون preload
      setTimeout(() => {
        const limitedUrls = urls.slice(0, maxImages);
        limitedUrls.forEach(url => {
          if (url) {
            const img = new Image();
            img.loading = 'lazy';
            img.src = url;
            
            // Mark the image as used in preload manager if available
            if (typeof window !== 'undefined' && (window as any).preloadManager) {
              (window as any).preloadManager.markAsUsed(url);
            }
          }
        });
      }, delay);
    }
  }
};

/**
 * تحميل فوري للصور المهمة بدون preload links
 */
export const loadCriticalImages = (urls: string[]): void => {
  const criticalUrls = urls.slice(0, 2);
  criticalUrls.forEach(url => {
    if (url) {
      const img = new Image();
      img.loading = 'eager';
      img.decoding = 'sync';
      try {
        const optimizedUrl = getCdnImageUrl(url, { width: 640, quality: 75, fit: 'cover', format: 'auto' });
        img.src = optimizedUrl;
        
        // Mark the image as used in preload manager if available
        if (typeof window !== 'undefined' && (window as any).preloadManager) {
          (window as any).preloadManager.markAsUsed(optimizedUrl);
          (window as any).preloadManager.markAsUsed(url);
        }
      } catch {
        img.src = url;
        if (typeof window !== 'undefined' && (window as any).preloadManager) {
          (window as any).preloadManager.markAsUsed(url);
        }
      }
    }
  });
};

/**
 * تحميل متأخر للصور غير المهمة
 */
export const loadLazyImages = (urls: string[], delay: number = 1000): void => {
  setTimeout(() => {
    // Respect user's data saver and slow connections
    try {
      const nav: any = navigator as any;
      const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
      if (conn?.saveData) return; // skip on data saver
      const type = (conn?.effectiveType || '').toString();
      if (type.includes('2g') || type.includes('slow-2g')) return; // skip on very slow
    } catch {}

    const lazyUrls = urls.slice(0, 4);
    lazyUrls.forEach(url => {
      if (url) {
        const img = new Image();
        img.loading = 'lazy';
        try {
          const optimizedUrl = getCdnImageUrl(url, { width: 360, quality: 65, fit: 'cover', format: 'auto' });
          img.src = optimizedUrl;
          
          // Mark the image as used in preload manager if available
          if (typeof window !== 'undefined' && (window as any).preloadManager) {
            (window as any).preloadManager.markAsUsed(optimizedUrl);
            (window as any).preloadManager.markAsUsed(url);
          }
        } catch {
          img.src = url;
          if (typeof window !== 'undefined' && (window as any).preloadManager) {
            (window as any).preloadManager.markAsUsed(url);
          }
        }
      }
    });
  }, delay);
};
