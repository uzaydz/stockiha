/**
 * معالج أخطاء CSS محسن لحل مشاكل preload
 */

interface CSSErrorHandler {
  handleCSSPreloadError: (href: string, error: Error) => void;
  initializeCSSErrorHandling: () => void;
  retryFailedCSS: (href: string) => Promise<boolean>;
}

class CSSErrorHandlerImpl implements CSSErrorHandler {
  private failedCSS = new Set<string>();
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;

  /**
   * معالجة أخطاء CSS preload
   */
  handleCSSPreloadError(href: string, error: Error): void {
    console.warn('🎨 CSS preload failed:', href, error.message);
    
    // إضافة إلى قائمة الفاشلة
    this.failedCSS.add(href);
    
    // تجربة إعادة تحميل إذا لم نتجاوز الحد الأقصى
    const attempts = this.retryAttempts.get(href) || 0;
    if (attempts < this.maxRetries) {
      this.retryAttempts.set(href, attempts + 1);
      setTimeout(() => {
        this.retryFailedCSS(href);
      }, 1000 * (attempts + 1)); // تأخير متزايد
    }
  }

  /**
   * إعادة محاولة تحميل CSS فاشل
   */
  async retryFailedCSS(href: string): Promise<boolean> {
    return new Promise((resolve) => {
      // إزالة العنصر القديم إن وجد
      const existingLink = document.querySelector(`link[href="${href}"]`);
      if (existingLink) {
        existingLink.remove();
      }

      // إنشاء عنصر جديد
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      
      link.onload = () => {
        
        this.failedCSS.delete(href);
        this.retryAttempts.delete(href);
        resolve(true);
      };
      
      link.onerror = () => {
        console.warn('❌ CSS retry failed:', href);
        resolve(false);
      };
      
      document.head.appendChild(link);
    });
  }

  /**
   * تهيئة معالجة أخطاء CSS على مستوى النظام
   */
  initializeCSSErrorHandling(): void {
    // معالج شامل لأخطاء CSS
    window.addEventListener('error', (event) => {
      const target = event.target as HTMLLinkElement;
      
      if (target && target.tagName === 'LINK' && target.rel === 'stylesheet') {
        // تحقق من أنواع الأخطاء المختلفة
        const href = target.href;
        const isNonCritical = /QuickExpenseDialog|fonts\.googleapis\.com/i.test(href);
        
        if (isNonCritical) {
          // معالجة خاصة للـ CSS غير الحرج
          this.handleCSSPreloadError(href, new Error('CSS preload failed'));
          event.preventDefault(); // منع إظهار الخطأ في console
        }
      }
    }, true);

    // معالج خاص لـ preload errors
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function<K extends keyof HTMLElementTagNameMap>(
      tagName: K,
      options?: ElementCreationOptions
    ): HTMLElementTagNameMap[K] {
      const element = originalCreateElement(tagName, options);
      
      if (tagName.toLowerCase() === 'link') {
        const link = element as unknown as HTMLLinkElement;
        const originalOnError = link.onerror;
        
        link.onerror = function(this: HTMLLinkElement, ev: Event | string) {
          if (this.rel === 'preload' && this.as === 'style') {
            // تحويل preload إلى stylesheet عادي عند الفشل
            setTimeout(() => {
              this.rel = 'stylesheet';
              this.removeAttribute('as');
            }, 100);
          }
          
          if (originalOnError) {
            return originalOnError.call(this, ev);
          }
          return true;
        };
      }
      
      return element;
    };

    
  }

  /**
   * الحصول على قائمة CSS الفاشل
   */
  getFailedCSS(): string[] {
    return Array.from(this.failedCSS);
  }

  /**
   * تنظيف الذاكرة
   */
  cleanup(): void {
    this.failedCSS.clear();
    this.retryAttempts.clear();
  }
}

// إنشاء instance واحد
export const cssErrorHandler = new CSSErrorHandlerImpl();

// تهيئة تلقائية عند استيراد الملف
if (typeof window !== 'undefined') {
  cssErrorHandler.initializeCSSErrorHandling();
}
