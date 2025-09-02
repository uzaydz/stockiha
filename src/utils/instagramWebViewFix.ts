/**
 * 🛠️ Instagram WebView Fix - حلول خاصة لمشاكل Instagram WebView
 *
 * يحل هذا الملف المشاكل التالية:
 * 1. تحميل JavaScript البطيء أو الفاشل
 * 2. مشاكل Service Worker
 * 3. مشاكل CSP
 * 4. مشاكل Bundle size
 */

interface InstagramWebViewConfig {
  enableChunkRetry: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  bundleSizeThreshold: number;
  enableServiceWorkerFix: boolean;
  enableCSPFix: boolean;
}

class InstagramWebViewFixer {
  private config: InstagramWebViewConfig;
  private retryCount: number = 0;
  private isInstagramBrowser: boolean = false;

  constructor(config: Partial<InstagramWebViewConfig> = {}) {
    this.config = {
      enableChunkRetry: true,
      maxRetryAttempts: 3,
      retryDelay: 2000,
      bundleSizeThreshold: 500 * 1024, // 500KB
      enableServiceWorkerFix: true,
      enableCSPFix: true,
      ...config
    };

    this.detectInstagramBrowser();
    this.initializeFixes();
  }

  /**
   * كشف Instagram WebView
   */
  private detectInstagramBrowser(): void {
    const ua = navigator.userAgent;
    this.isInstagramBrowser =
      ua.includes('Instagram') ||
      ua.includes('FBAN') ||
      ua.includes('FBAV') ||
      // كشف إضافي لـ Instagram WebView
      (window.location.href.includes('instagram.com') && ua.includes('Mobile'));

    if (this.isInstagramBrowser) {
      console.log('📱 Instagram WebView detected, applying fixes...');
    }
  }

  /**
   * تهيئة جميع الإصلاحات
   */
  private initializeFixes(): void {
    if (!this.isInstagramBrowser) return;

    this.setupChunkLoadingFix();
    this.setupServiceWorkerFix();
    this.setupCSPFix();
    this.setupBundleOptimization();
    this.setupNetworkMonitoring();
  }

  /**
   * إصلاح تحميل Chunks في Instagram WebView
   */
  private setupChunkLoadingFix(): void {
    if (!this.config.enableChunkRetry) return;

    // مراقبة أخطاء تحميل الـ chunks
    const originalErrorHandler = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const msg = message.toString();

      if (msg.includes('Loading chunk') || msg.includes('ChunkLoadError')) {
        console.log(`🔄 Chunk load error detected in Instagram WebView: ${msg}`);

        if (this.retryCount < this.config.maxRetryAttempts) {
          this.retryCount++;
          console.log(`🔄 Attempting retry ${this.retryCount}/${this.config.maxRetryAttempts}`);

          setTimeout(() => {
            // إعادة تحميل مع مسح cache جزئي
            this.partialCacheClear();
            window.location.reload();
          }, this.config.retryDelay);
          return true; // منع عرض الخطأ الافتراضي
        }
      }

      // استدعاء المعالج الأصلي
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }

      return false;
    };

    // مراقبة تحميل الموارد
    document.addEventListener('error', (event) => {
      const target = event.target as HTMLElement;
      if (target && target.tagName === 'SCRIPT') {
        const script = target as HTMLScriptElement;
        if (script.src && script.src.includes('chunk')) {
          console.log(`🚨 Script chunk failed to load: ${script.src}`);
          this.handleChunkLoadFailure(script.src);
        }
      }
    }, true);
  }

  /**
   * معالجة فشل تحميل chunk
   */
  private handleChunkLoadFailure(chunkUrl: string): void {
    if (this.retryCount >= this.config.maxRetryAttempts) return;

    console.log(`🔄 Retrying chunk load: ${chunkUrl}`);

    // محاولة إعادة تحميل الـ chunk
    const retryScript = document.createElement('script');
    retryScript.src = chunkUrl + '?t=' + Date.now(); // إضافة timestamp لتجنب cache
    retryScript.async = true;

    retryScript.onload = () => {
      console.log(`✅ Chunk retry successful: ${chunkUrl}`);
      this.retryCount = 0; // إعادة تعيين العداد عند النجاح
    };

    retryScript.onerror = () => {
      console.log(`❌ Chunk retry failed: ${chunkUrl}`);
      this.retryCount++;

      // إذا فشلت المحاولة الأخيرة، أعد تحميل الصفحة
      if (this.retryCount >= this.config.maxRetryAttempts) {
        setTimeout(() => {
          this.fullPageReload();
        }, this.config.retryDelay);
      }
    };

    document.head.appendChild(retryScript);
  }

  /**
   * إصلاح Service Worker لـ Instagram WebView
   */
  private setupServiceWorkerFix(): void {
    if (!this.config.enableServiceWorkerFix) return;

    // تعطيل Service Worker في Instagram WebView
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          console.log('🔧 Unregistering Service Worker for Instagram compatibility:', registration.scope);
          registration.unregister();
        });
      });

      // منع تسجيل Service Workers جديدة
      const originalRegister = navigator.serviceWorker.register;
      navigator.serviceWorker.register = () => {
        console.log('🚫 Service Worker registration blocked for Instagram WebView');
        return Promise.reject(new Error('Service Worker disabled for Instagram WebView'));
      };
    }
  }

  /**
   * إصلاح CSP لـ Instagram WebView
   */
  private setupCSPFix(): void {
    if (!this.config.enableCSPFix) return;

    // مراقبة انتهاكات CSP
    document.addEventListener('securitypolicyviolation', (event) => {
      console.log('🚨 CSP Violation in Instagram WebView:', {
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile
      });

      // إصلاح بعض الانتهاكات الشائعة
      this.attemptCSPFix(event);
    });
  }

  /**
   * محاولة إصلاح انتهاك CSP
   */
  private attemptCSPFix(violation: SecurityPolicyViolationEvent): void {
    switch (violation.violatedDirective) {
      case 'script-src':
        if (violation.blockedURI.includes('inline')) {
          console.log('🔧 Attempting to fix inline script CSP violation');
          // إزالة السكريبتات inline المشبوهة
          this.removeProblematicInlineScripts();
        }
        break;

      case 'style-src':
        if (violation.blockedURI.includes('inline')) {
          console.log('🔧 Attempting to fix inline style CSP violation');
          // إزالة الأنماط inline المشبوهة
          this.removeProblematicInlineStyles();
        }
        break;

      case 'img-src':
        console.log('🔧 Attempting to fix image CSP violation');
        // استبدال الصور المحظورة بصور افتراضية
        this.replaceBlockedImages(violation.blockedURI);
        break;
    }
  }

  /**
   * تحسين Bundle size لـ Instagram WebView
   */
  private setupBundleOptimization(): void {
    // مراقبة حجم الـ bundle
    const checkBundleSize = () => {
      // تقدير حجم الـ JavaScript المحمل
      const scripts = document.querySelectorAll('script[src]');
      let totalSize = 0;

      scripts.forEach(script => {
        // تقدير حجم الملف من الـ URL (تقدير تقريبي)
        const url = (script as HTMLScriptElement).src;
        if (url.includes('.js')) {
          totalSize += this.estimateFileSize(url);
        }
      });

      if (totalSize > this.config.bundleSizeThreshold) {
        console.log(`📊 Large bundle detected: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
        this.optimizeForLargeBundle();
      }
    };

    // فحص حجم الـ bundle بعد تحميل الصفحة
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkBundleSize);
    } else {
      checkBundleSize();
    }
  }

  /**
   * تحسينات للـ bundles الكبيرة
   */
  private optimizeForLargeBundle(): void {
    console.log('⚡ Applying bundle optimizations for Instagram WebView');

    // تقليل عدد الطلبات المتزامنة
    const originalFetch = window.fetch;
    let activeRequests = 0;
    const maxConcurrentRequests = 3; // تقليل من العدد الافتراضي

    window.fetch = function(...args) {
      return new Promise((resolve, reject) => {
        const attemptRequest = () => {
          if (activeRequests < maxConcurrentRequests) {
            activeRequests++;
            originalFetch.apply(this, args)
              .then(result => {
                activeRequests--;
                resolve(result);
              })
              .catch(error => {
                activeRequests--;
                reject(error);
              });
          } else {
            // انتظار حتى ينتهي طلب آخر
            setTimeout(attemptRequest, 100);
          }
        };
        attemptRequest();
      });
    };
  }

  /**
   * مراقبة الشبكة لـ Instagram WebView
   */
  private setupNetworkMonitoring(): void {
    // مراقبة حالة الاتصال
    const handleOnline = () => {
      console.log('📱 Instagram WebView: Connection restored');
      // إعادة محاولة تحميل الموارد المفقودة
      this.retryFailedResources();
    };

    const handleOffline = () => {
      console.log('📱 Instagram WebView: Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // مراقبة جودة الاتصال
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', () => {
          console.log('📱 Instagram WebView: Connection quality changed', {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink
          });

          // تكييف مع جودة الاتصال
          if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            this.enableSlowConnectionMode();
          }
        });
      }
    }
  }

  /**
   * وضع الاتصال البطيء
   */
  private enableSlowConnectionMode(): void {
    console.log('🐌 Enabling slow connection mode for Instagram WebView');

    // تقليل الصور
    this.reduceImageQuality();

    // تأجيل المحتوى غير المهم
    this.deferNonCriticalContent();
  }

  /**
   * وظائف مساعدة
   */
  private partialCacheClear(): void {
    // مسح cache جزئي للملفات المشبوهة
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('runtime') || name.includes('chunk')) {
            caches.delete(name);
          }
        });
      });
    }

    // مسح localStorage المتعلق بالـ chunks
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('chunk') || key.includes('webpack')) {
        localStorage.removeItem(key);
      }
    });
  }

  private fullPageReload(): void {
    console.log('🔄 Performing full page reload for Instagram WebView');
    window.location.href = window.location.href;
  }

  private removeProblematicInlineScripts(): void {
    const scripts = document.querySelectorAll('script:not([src])');
    scripts.forEach(script => {
      if (script.textContent && script.textContent.includes('eval(')) {
        script.remove();
      }
    });
  }

  private removeProblematicInlineStyles(): void {
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent && style.textContent.includes('@import')) {
        style.remove();
      }
    });
  }

  private replaceBlockedImages(blockedURI: string): void {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && img.src.includes(blockedURI)) {
        img.src = '/images/placeholder.png';
        img.alt = 'صورة غير متاحة';
      }
    });
  }

  private estimateFileSize(url: string): number {
    // تقدير تقريبي لحجم الملف
    if (url.includes('chunk')) return 100 * 1024; // 100KB للـ chunks
    if (url.includes('vendor')) return 300 * 1024; // 300KB للـ vendor
    if (url.includes('main')) return 200 * 1024; // 200KB للـ main
    return 50 * 1024; // 50KB افتراضي
  }

  private retryFailedResources(): void {
    // إعادة محاولة تحميل الموارد المفقودة
    const failedScripts = document.querySelectorAll('script[data-failed="true"]');
    failedScripts.forEach(script => {
      const src = (script as HTMLScriptElement).src;
      if (src) {
        const retryScript = document.createElement('script');
        retryScript.src = src + '?retry=' + Date.now();
        document.head.appendChild(retryScript);
      }
    });
  }

  private reduceImageQuality(): void {
    const images = document.querySelectorAll('img[data-optimized="false"]');
    images.forEach(img => {
      if (!img.hasAttribute('data-optimized')) {
        // تقليل جودة الصورة عبر URL parameters
        if (img.src && !img.src.includes('quality=')) {
          img.src = img.src + (img.src.includes('?') ? '&' : '?') + 'quality=low';
          img.setAttribute('data-optimized', 'true');
        }
      }
    });
  }

  private deferNonCriticalContent(): void {
    // تأجيل تحميل المحتوى غير المهم
    const nonCriticalElements = document.querySelectorAll('[data-defer="true"]');
    nonCriticalElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.display = 'none';
    });

    // إعادة عرض المحتوى بعد فترة
    setTimeout(() => {
      nonCriticalElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.display = '';
      });
    }, 3000);
  }
}

// تصدير الوظائف العامة
export const initInstagramWebViewFix = (config?: Partial<InstagramWebViewConfig>) => {
  return new InstagramWebViewFixer(config);
};

export const isInstagramWebView = (): boolean => {
  const ua = navigator.userAgent;
  return ua.includes('Instagram') ||
         ua.includes('FBAN') ||
         ua.includes('FBAV') ||
         (window.location.href.includes('instagram.com') && ua.includes('Mobile'));
};

export const getInstagramWebViewInfo = () => {
  return {
    isInstagramBrowser: isInstagramWebView(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    connection: (navigator as any).connection?.effectiveType || 'unknown'
  };
};

export default InstagramWebViewFixer;
