// 🚀 نظام تحسين DOM محسن لمنع Forced Reflow
// يجمع جميع عمليات قراءة وكتابة DOM لتجنب المشاكل

interface DOMRect {
  width: number;
  height: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
}

interface CachedDOMData {
  rect?: DOMRect;
  computedStyle?: CSSStyleDeclaration;
  timestamp: number;
  element: Element;
}

class OptimizedDOMManager {
  private static instance: OptimizedDOMManager;
  private pendingReads: Array<() => void> = [];
  private pendingWrites: Array<() => void> = [];
  private isScheduled = false;
  private cache = new WeakMap<Element, CachedDOMData>();
  private readonly CACHE_DURATION = 100; // 100ms cache

  static getInstance(): OptimizedDOMManager {
    if (!OptimizedDOMManager.instance) {
      OptimizedDOMManager.instance = new OptimizedDOMManager();
    }
    return OptimizedDOMManager.instance;
  }

  // الحصول على getBoundingClientRect بطريقة محسنة مع تخزين مؤقت
  getBoundingClientRect(element: Element): Promise<DOMRect> {
    return new Promise((resolve) => {
      const cached = this.cache.get(element);
      const now = Date.now();
      
      // استخدام البيانات المخزنة إذا كانت حديثة
      if (cached && cached.rect && (now - cached.timestamp) < this.CACHE_DURATION) {
        resolve(cached.rect);
        return;
      }

      this.scheduleRead(() => {
        try {
          const rect = element.getBoundingClientRect();
          const domRect: DOMRect = {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right
          };
          
          // حفظ في التخزين المؤقت
          this.cache.set(element, {
            rect: domRect,
            timestamp: now,
            element
          });
          
          resolve(domRect);
        } catch (error) {
          // في حالة الخطأ، إرجاع قيم افتراضية
          resolve({
            width: 0,
            height: 0,
            top: 0,
            left: 0,
            bottom: 0,
            right: 0
          });
        }
      });
    });
  }

  // الحصول على getComputedStyle بطريقة محسنة
  getComputedStyle(element: Element): Promise<CSSStyleDeclaration> {
    return new Promise((resolve) => {
      const cached = this.cache.get(element);
      const now = Date.now();
      
      if (cached && cached.computedStyle && (now - cached.timestamp) < this.CACHE_DURATION) {
        resolve(cached.computedStyle);
        return;
      }

      this.scheduleRead(() => {
        try {
          const style = window.getComputedStyle(element);
          
          // تحديث التخزين المؤقت
          const existingCache = this.cache.get(element) || { timestamp: now, element };
          this.cache.set(element, {
            ...existingCache,
            computedStyle: style,
            timestamp: now
          });
          
          resolve(style);
        } catch (error) {
          // إرجاع كائن فارغ في حالة الخطأ
          resolve({} as CSSStyleDeclaration);
        }
      });
    });
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

  // تنفيذ العمليات المجمعة لتجنب Forced Reflow
  private scheduleFlush() {
    if (this.isScheduled) return;
    
    this.isScheduled = true;
    requestAnimationFrame(() => {
      // تنفيذ جميع القراءات أولاً (Read phase)
      const reads = [...this.pendingReads];
      this.pendingReads.length = 0;
      reads.forEach(read => {
        try {
          read();
        } catch (error) {
          console.warn('خطأ في قراءة DOM:', error);
        }
      });
      
      // ثم تنفيذ جميع الكتابات (Write phase)
      const writes = [...this.pendingWrites];
      this.pendingWrites.length = 0;
      writes.forEach(write => {
        try {
          write();
        } catch (error) {
          console.warn('خطأ في كتابة DOM:', error);
        }
      });
      
      this.isScheduled = false;
    });
  }

  // مسح التخزين المؤقت
  clearCache(element?: Element) {
    if (element) {
      this.cache.delete(element);
    } else {
      this.cache = new WeakMap();
    }
  }

  // دالة آمنة للتحقق من رؤية العنصر
  isElementVisible(element: Element): Promise<boolean> {
    return new Promise((resolve) => {
      this.scheduleRead(() => {
        try {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          
          const isVisible = (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            parseFloat(style.opacity || '1') > 0
          );
          
          resolve(isVisible);
        } catch (error) {
          resolve(false);
        }
      });
    });
  }

  // دالة آمنة للحصول على أبعاد العنصر
  getElementDimensions(element: Element): Promise<{ width: number; height: number }> {
    return this.getBoundingClientRect(element).then(rect => ({
      width: rect.width,
      height: rect.height
    }));
  }

  // دالة آمنة للحصول على موضع العنصر
  getElementPosition(element: Element): Promise<{ top: number; left: number }> {
    return this.getBoundingClientRect(element).then(rect => ({
      top: rect.top,
      left: rect.left
    }));
  }
}

// إنشاء مثيل عام
export const domOptimizer = OptimizedDOMManager.getInstance();

// دوال مساعدة سهلة الاستخدام
export const getBoundingClientRectOptimized = (element: Element) => {
  return domOptimizer.getBoundingClientRect(element);
};

export const getComputedStyleOptimized = (element: Element) => {
  return domOptimizer.getComputedStyle(element);
};

export const isElementVisibleOptimized = (element: Element) => {
  return domOptimizer.isElementVisible(element);
};

export const getElementDimensionsOptimized = (element: Element) => {
  return domOptimizer.getElementDimensions(element);
};

export const getElementPositionOptimized = (element: Element) => {
  return domOptimizer.getElementPosition(element);
};

export const scheduleRead = (callback: () => void) => {
  domOptimizer.scheduleRead(callback);
};

export const scheduleWrite = (callback: () => void) => {
  domOptimizer.scheduleWrite(callback);
};

// دالة للتنظيف عند إلغاء تحميل الصفحة
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    domOptimizer.clearCache();
  });
}
