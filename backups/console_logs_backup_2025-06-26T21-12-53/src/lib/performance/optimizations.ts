// تحسينات الأداء العامة للتطبيق
import React from 'react';

/**
 * تعطيل console logs في الإنتاج
 */
export function disableConsoleInProduction() {
  if (process.env.NODE_ENV === 'production') {
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.info = () => {};
    console.debug = () => {};
  }
}

/**
 * تحسين أداء localStorage
 */
export const optimizedLocalStorage = {
  setItem: (key: string, value: any) => {
    try {
      const serialized = JSON.stringify(value);
      // التحقق من حجم البيانات قبل الحفظ
      if (serialized.length > 1024 * 1024) { // 1MB
        console.warn(`Large data being stored in localStorage: ${key}`);
      }
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  getItem: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },

  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  // تنظيف العناصر القديمة
  cleanup: (prefix: string, maxAge: number = 7 * 24 * 60 * 60 * 1000) => {
    const now = Date.now();
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed.timestamp && now - parsed.timestamp > maxAge) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // إذا فشل التحليل، احذف العنصر
          localStorage.removeItem(key);
        }
      }
    });
  }
};

/**
 * تحسين أداء الصور
 */
export function optimizeImageLoading() {
  // تفعيل lazy loading للصور
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || '';
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
}

/**
 * تقليل عدد re-renders في React
 */
export const memoizeComponent = <P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, propsAreEqual);
};

/**
 * تحسين أداء التمرير
 */
export function optimizeScrollPerformance() {
  let ticking = false;
  
  function updateScrollPosition() {
    // تنفيذ التحديثات المطلوبة
    ticking = false;
  }
  
  function requestTick() {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollPosition);
      ticking = true;
    }
  }
  
  window.addEventListener('scroll', requestTick, { passive: true });
}

/**
 * تنظيف الموارد عند إلغاء تحميل الصفحة
 */
export function setupCleanupOnUnload() {
  window.addEventListener('beforeunload', () => {
    // إلغاء جميع الطلبات المعلقة
    const controllers = (window as any).__abortControllers || [];
    controllers.forEach((controller: AbortController) => {
      controller.abort();
    });
    
    // تنظيف التخزين المؤقت القديم
    optimizedLocalStorage.cleanup('cache_', 24 * 60 * 60 * 1000); // 24 ساعة
  });
}

/**
 * تهيئة جميع التحسينات
 */
export function initializePerformanceOptimizations() {
  disableConsoleInProduction();
  optimizeImageLoading();
  optimizeScrollPerformance();
  setupCleanupOnUnload();
  
  // تنظيف دوري للتخزين المؤقت
  setInterval(() => {
    optimizedLocalStorage.cleanup('cache_');
    optimizedLocalStorage.cleanup('product_page_');
    optimizedLocalStorage.cleanup('shipping_');
  }, 60 * 60 * 1000); // كل ساعة
} 