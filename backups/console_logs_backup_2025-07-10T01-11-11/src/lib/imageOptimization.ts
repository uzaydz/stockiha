/**
 * مكتبة تحسين الصور - تحسين الأداء وسرعة التحميل
 */

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
    img.src = url;
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
        document.head.appendChild(link);
        
        // إزالة تلقائية بعد 10 ثوان إذا لم يتم استخدام الصورة
        setTimeout(() => {
          if (link.parentNode) {
            link.remove();
          }
        }, 10000);
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
} = {}): void => {
  const { immediate = false, delay = 1000, priority = 'low' } = options;
  
  if (immediate) {
    // للصور المهمة جداً (مثل صورة المنتج الحالي)
    addPreloadLinks(urls.slice(0, 2), 0);
  } else {
    // للصور الأخرى، استخدم Intersection Observer للتحميل عند الحاجة
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            addPreloadLinks(urls, delay);
            observer.disconnect();
          }
        });
      }, {
        rootMargin: '100px' // ابدأ التحميل قبل 100px من ظهور العنصر
      });
      
      // مراقبة العنصر الأول في الصفحة للبدء
      const firstElement = document.querySelector('main, #root, body > div');
      if (firstElement) {
        observer.observe(firstElement);
      }
    } else {
      // fallback للمتصفحات القديمة
      setTimeout(() => addPreloadLinks(urls), delay);
    }
  }
};
