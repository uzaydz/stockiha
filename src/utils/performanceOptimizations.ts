/**
 * 🚀 تحسينات الأداء الشاملة
 * يحسن Core Web Vitals ويقلل Render Blocking
 */

/**
 * تحسين تحميل الصور لمنع Layout Shift
 */
export const optimizeImageLoading = () => {
  // إضافة loading="lazy" للصور غير الحرجة
  const images = document.querySelectorAll('img:not([loading])');
  images.forEach((img, index) => {
    const htmlImg = img as HTMLImageElement;
    
    // أول 3 صور تحمل فوراً (above the fold)
    if (index < 3) {
      htmlImg.loading = 'eager';
      htmlImg.fetchPriority = 'high';
    } else {
      htmlImg.loading = 'lazy';
      htmlImg.fetchPriority = 'low';
    }
    
    // إضافة aspect ratio لمنع Layout Shift
    if (!htmlImg.style.aspectRatio && !htmlImg.width && !htmlImg.height) {
      htmlImg.style.aspectRatio = '1';
      htmlImg.style.objectFit = 'cover';
    }
  });
};

/**
 * تحسين تحميل الخطوط
 */
export const optimizeFontLoading = () => {
  // preload الخطوط الحرجة
  const preloadFont = (fontPath: string, fontWeight: string = '400') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = fontPath;
    document.head.appendChild(link);
  };

  // تحميل الخطوط الأساسية فقط
  preloadFont('/fonts/tajawal-regular.woff2', '400');
  preloadFont('/fonts/tajawal-medium.woff2', '500');
  preloadFont('/fonts/tajawal-bold.woff2', '700');
  // Latin subsets for immediate availability on mixed-language UIs
  preloadFont('/fonts/tajawal-latin-400.woff2', '400');
  preloadFont('/fonts/tajawal-latin-500.woff2', '500');
  preloadFont('/fonts/tajawal-latin-700.woff2', '700');
};

/**
 * تحسين الـ CSS لمنع Render Blocking
 */
export const optimizeCSSLoading = () => {
  // تحميل CSS غير الحرج بشكل مؤجل
  const loadNonCriticalCSS = (href: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    link.onload = () => {
      link.rel = 'stylesheet';
    };
    document.head.appendChild(link);
  };

  // قائمة CSS غير الحرج - تعطيل مؤقتاً لحل مشاكل PostCSS
  // const nonCriticalCSS = [
  //   '/src/styles/non-critical.css',
  //   '/src/components/ui/animations.css',
  // ];

  // nonCriticalCSS.forEach(css => loadNonCriticalCSS(css));
};

/**
 * تحسين الـ JavaScript لتقليل Render Blocking
 */
export const optimizeJSLoading = () => {
  // إضافة defer للسكريبتات غير الحرجة
  const scripts = document.querySelectorAll('script[src]:not([defer]):not([async])');
  scripts.forEach((script) => {
    const htmlScript = script as HTMLScriptElement;
    if (!htmlScript.src.includes('main.') && !htmlScript.src.includes('critical')) {
      htmlScript.defer = true;
    }
  });
};

/**
 * تحسين الـ Resource Hints
 */
export const optimizeResourceHints = () => {
  const addResourceHint = (rel: string, href: string, as?: string) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (as) link.setAttribute('as', as);
    document.head.appendChild(link);
  };

  // DNS prefetch للموارد الخارجية
  addResourceHint('dns-prefetch', '//fonts.googleapis.com');
  addResourceHint('dns-prefetch', '//cdn.jsdelivr.net');
  
  // Preconnect للموارد الحرجة
  addResourceHint('preconnect', 'https://fonts.gstatic.com');
};

/**
 * تحسين Core Web Vitals
 */
export const optimizeCoreWebVitals = () => {
  // تحسين LCP (Largest Contentful Paint)
  const optimizeLCP = () => {
    // preload الصور الحرجة
    const heroImage = document.querySelector('.hero-image, .main-banner img, .product-main-image');
    if (heroImage) {
      const img = heroImage as HTMLImageElement;
      if (img.src) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = img.src;
        document.head.appendChild(link);
      }
    }
  };

  // تحسين FID (First Input Delay)
  const optimizeFID = () => {
    // تأجيل السكريبتات الثقيلة
    setTimeout(() => {
      // تحميل السكريبتات غير الحرجة - تعطيل مؤقتاً لتجنب 404
      // const heavyScripts = [
      //   '/src/lib/analytics.js',
      //   '/src/lib/tracking.js',
      // ];
      
      // heavyScripts.forEach(src => {
      //   const script = document.createElement('script');
      //   script.src = src;
      //   script.defer = true;
      //   document.head.appendChild(script);
      // });
    }, 1000);
  };

  // تحسين CLS (Cumulative Layout Shift)
  const optimizeCLS = () => {
    // إضافة أحجام ثابتة للعناصر الديناميكية
    const dynamicElements = document.querySelectorAll('[data-dynamic], .loading-placeholder');
    dynamicElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      if (!htmlElement.style.minHeight) {
        htmlElement.style.minHeight = '200px';
      }
    });
  };

  optimizeLCP();
  optimizeFID();
  optimizeCLS();
};

/**
 * تشغيل جميع التحسينات
 */
export const runPerformanceOptimizations = () => {
  // تشغيل التحسينات فوراً
  optimizeResourceHints();
  optimizeFontLoading();
  
  // تشغيل التحسينات بعد تحميل DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeImageLoading();
      optimizeJSLoading();
      optimizeCoreWebVitals();
    });
  } else {
    optimizeImageLoading();
    optimizeJSLoading();
    optimizeCoreWebVitals();
  }
  
  // تشغيل تحسينات CSS بعد تحميل الصفحة
  window.addEventListener('load', () => {
    setTimeout(() => {
      optimizeCSSLoading();
    }, 100);
  });
};

// تشغيل التحسينات تلقائياً
if (typeof window !== 'undefined') {
  runPerformanceOptimizations();
}
