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

// 🚀 نظام تحسين DOM محسن لمنع Forced Reflow
class DOMOptimizer {
  private static instance: DOMOptimizer;
  private pendingReads: Array<() => void> = [];
  private pendingWrites: Array<() => void> = [];
  private isScheduled = false;
  private reflowCount = 0;
  private lastReportTime = 0;
  private LOG_THRESHOLD = 150; // لا تُبلغ إلا إذا تجاوزت هذا العدد خلال 5 ثوانٍ

  static getInstance(): DOMOptimizer {
    if (!DOMOptimizer.instance) {
      DOMOptimizer.instance = new DOMOptimizer();
    }
    return DOMOptimizer.instance;
  }

  // تجميع قراءات DOM
  scheduleRead(callback: () => void) {
    this.pendingReads.push(callback);
    this.scheduleFlush();
  }

  // تجميع كتابات DOM
  scheduleWrite(callback: () => void) {
    this.pendingWrites.push(callback);
    this.scheduleFlush();
  }

  // تنفيذ العمليات المجمعة
  private scheduleFlush() {
    if (this.isScheduled) return;
    
    this.isScheduled = true;
    requestAnimationFrame(() => {
      // تنفيذ جميع القراءات أولاً
      while (this.pendingReads.length > 0) {
        const read = this.pendingReads.shift()!;
        try {
          read();
        } catch (error) {
          console.warn('خطأ في قراءة DOM:', error);
        }
      }
      
      // ثم تنفيذ جميع الكتابات
      while (this.pendingWrites.length > 0) {
        const write = this.pendingWrites.shift()!;
        try {
          write();
        } catch (error) {
          console.warn('خطأ في كتابة DOM:', error);
        }
      }
      
      this.isScheduled = false;
    });
  }

  // تتبع عدد عمليات reflow
  trackReflow() {
    this.reflowCount++;
    const now = Date.now();

    // تقرير كل 5 ثوانٍ مع عتبة أعلى، ولا يُطبع إلا في التطوير
    if (now - this.lastReportTime > 5000) {
      const shouldLog = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';
      if (shouldLog && this.reflowCount > this.LOG_THRESHOLD) {
        console.warn(`⚠️ [PERFORMANCE] تم اكتشاف ${this.reflowCount} عملية forced reflow في آخر 5 ثوانٍ`);
      }
      this.reflowCount = 0;
      this.lastReportTime = now;
    }
  }

  // الحصول على إحصائيات reflow
  getReflowStats() {
    return {
      reflowCount: this.reflowCount,
      pendingReads: this.pendingReads.length,
      pendingWrites: this.pendingWrites.length
    };
  }
}

// تصدير instance واحد
export const domOptimizer = DOMOptimizer.getInstance();

// دالة محسنة لقياس عرض العنصر بدون reflow
export const measureElementWidth = (element: HTMLElement): Promise<number> => {
  return new Promise((resolve) => {
    domOptimizer.scheduleRead(() => {
      if (!element) {
        resolve(0);
        return;
      }
      
      // استخدام getBoundingClientRect بدلاً من clientWidth لتجنب reflow
      const rect = element.getBoundingClientRect();
      resolve(rect.width);
    });
  });
};

// دالة محسنة لقياس ارتفاع العنصر بدون reflow
export const measureElementHeight = (element: HTMLElement): Promise<number> => {
  return new Promise((resolve) => {
    domOptimizer.scheduleRead(() => {
      if (!element) {
        resolve(0);
        return;
      }
      
      const rect = element.getBoundingClientRect();
      resolve(rect.height);
    });
  });
};

// دالة محسنة للحصول على موقع العنصر بدون reflow
export const getElementPosition = (element: HTMLElement): Promise<{ top: number; left: number }> => {
  return new Promise((resolve) => {
    domOptimizer.scheduleRead(() => {
      if (!element) {
        resolve({ top: 0, left: 0 });
        return;
      }
      
      const rect = element.getBoundingClientRect();
      resolve({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX
      });
    });
  });
};

// دالة محسنة لتطبيق تغييرات CSS بدون reflow
export const applyStylesWithoutReflow = (
  element: HTMLElement, 
  styles: Partial<CSSStyleDeclaration>
) => {
  domOptimizer.scheduleWrite(() => {
    Object.assign(element.style, styles);
  });
};

// دالة محسنة لإضافة/إزالة classes بدون reflow
export const toggleClassWithoutReflow = (
  element: HTMLElement, 
  className: string, 
  force?: boolean
) => {
  domOptimizer.scheduleWrite(() => {
    if (force === true) {
      element.classList.add(className);
    } else if (force === false) {
      element.classList.remove(className);
    } else {
      element.classList.toggle(className);
    }
  });
};

// دالة محسنة لتغيير النص بدون reflow
export const setTextContentWithoutReflow = (
  element: HTMLElement, 
  text: string
) => {
  domOptimizer.scheduleWrite(() => {
    element.textContent = text;
  });
};

// دالة محسنة لتغيير innerHTML بدون reflow
export const setInnerHTMLWithoutReflow = (
  element: HTMLElement, 
  html: string
) => {
  domOptimizer.scheduleWrite(() => {
    element.innerHTML = html;
  });
};

// دالة محسنة لإنشاء ResizeObserver بدون reflow
export const createOptimizedResizeObserver = (
  element: HTMLElement,
  callback: (entries: ResizeObserverEntry[]) => void,
  options?: ResizeObserverOptions
) => {
  const observer = new ResizeObserver((entries) => {
    // تأخير معالجة التغييرات لتجنب reflow متكرر
    requestAnimationFrame(() => {
      callback(entries);
    });
  });
  
  observer.observe(element, options);
  return observer;
};

// دالة محسنة لمراقبة تغييرات DOM بدون reflow
export const createOptimizedMutationObserver = (
  element: HTMLElement,
  callback: (mutations: MutationRecord[]) => void,
  options?: MutationObserverInit
) => {
  const observer = new MutationObserver((mutations) => {
    // تأخير معالجة التغييرات لتجنب reflow متكرر
    requestAnimationFrame(() => {
      callback(mutations);
    });
  });
  
  observer.observe(element, options);
  return observer;
};

// دالة محسنة لقياس أداء العمليات
export const measurePerformance = <T>(fn: () => T): { result: T; duration: number } => {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  // تحذير إذا استغرقت العملية أكثر من 16ms (frame واحد)
  if (duration > 16) {
    console.warn(`⚠️ [PERFORMANCE] العملية استغرقت ${duration.toFixed(2)}ms (أكثر من frame واحد)`);
  }
  
  return { result, duration };
};

// دالة محسنة لقياس أداء العمليات غير المتزامنة
export const measureAsyncPerformance = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  if (duration > 100) {
    console.warn(`⚠️ [PERFORMANCE] العملية غير المتزامنة استغرقت ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
};

// تصدير الدوال المساعدة
export const scheduleRead = (callback: () => void) => domOptimizer.scheduleRead(callback);
export const scheduleWrite = (callback: () => void) => domOptimizer.scheduleWrite(callback);
export const getReflowStats = () => domOptimizer.getReflowStats();
