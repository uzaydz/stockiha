/**
 * Performance Optimizer - تحسينات الأداء وتقليل forced reflow
 */

// دالة لتجنب forced reflow عند قراءة DOM properties
export const readDOMWithoutReflow = (callback: () => void) => {
  // جدولة القراءة في بداية frame التالي
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
};

// دالة محسنة للحصول على dimensions بدون reflow
export const getDimensionsSafely = (element: HTMLElement) => {
  return new Promise<{ width: number; height: number; top: number; left: number }>((resolve) => {
    requestAnimationFrame(() => {
      if (!element) {
        resolve({ width: 0, height: 0, top: 0, left: 0 });
        return;
      }
      
      const rect = element.getBoundingClientRect();
      resolve({
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left
      });
    });
  });
};

// تطبيق الخطوط بطريقة محسنة
export const applyFontsOptimized = () => {
  requestAnimationFrame(() => {
    // إضافة class للجسم فقط (أكثر كفاءة)
    document.body.classList.add('tajawal-forced');
    
    // تطبيق CSS عام عبر stylesheet بدلاً من تعديل كل عنصر
    if (!document.getElementById('font-override-style')) {
      const style = document.createElement('style');
      style.id = 'font-override-style';
      style.textContent = `
        .tajawal-forced * {
          font-family: "TajawalForced", "Tajawal", "Arial Unicode MS", "Tahoma", "Arial", sans-serif !important;
        }
      `;
      document.head.appendChild(style);
    }
  });
};

// تحسين scroll listening لتجنب مشاكل الأداء
export const createOptimizedScrollListener = (callback: (scrollInfo: { scrollTop: number; scrollHeight: number; clientHeight: number }) => void) => {
  let ticking = false;
  
  return () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        
        callback({ scrollTop, scrollHeight, clientHeight });
        ticking = false;
      });
      ticking = true;
    }
  };
};

// تحسين batch DOM operations
export const batchDOMOperations = (operations: (() => void)[]) => {
  requestAnimationFrame(() => {
    // تنفيذ جميع العمليات في نفس الإطار
    operations.forEach(operation => operation());
  });
};

// تقليل console errors في production
export const suppressNonCriticalErrors = () => {
  if (import.meta.env.PROD) {
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ').toLowerCase();
      
      // تجاهل أخطاء WebSocket و HMR في production
      if (
        message.includes('websocket') ||
        message.includes('hmr') ||
        message.includes('vite') ||
        message.includes('failed to connect')
      ) {
        return;
      }
      
      // عرض الأخطاء الأخرى
      originalError.apply(console, args);
    };
  }
};

// تحسين تحميل الصور لتجنب layout shift
export const optimizeImageLoading = (img: HTMLImageElement) => {
  // تعيين أبعاد مبدئية إذا لم تكن محددة
  if (!img.style.width && !img.style.height) {
    img.style.minHeight = '200px';
    img.style.backgroundColor = '#f5f5f5';
  }
  
  // إضافة loading optimization
  img.loading = 'lazy';
  img.decoding = 'async';
};

// تطبيق تحسينات الأداء العامة
export const initPerformanceOptimizations = () => {
  // تقليل console errors
  suppressNonCriticalErrors();
  
  // تحسين CSS loading
  if (typeof window !== 'undefined') {
    // منع FOUC (Flash of Unstyled Content)
    document.documentElement.style.visibility = 'visible';
    
    // تحسين font loading
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        applyFontsOptimized();
      });
    } else {
      // fallback للمتصفحات القديمة
      setTimeout(applyFontsOptimized, 100);
    }
  }
};
