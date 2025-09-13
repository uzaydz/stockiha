/**
 * نظام إدارة preload لمنع تحذيرات preload غير المستخدمة
 */

interface PreloadedResource {
  url: string;
  type: 'image' | 'script' | 'style';
  timestamp: number;
  used: boolean;
  element?: HTMLLinkElement;
}

class PreloadManager {
  private preloadedResources = new Map<string, PreloadedResource>();
  // تقليل العمل في الإنتاج: مهلة أقصر لتجنب التحذيرات
  private readonly PRELOAD_TIMEOUT = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.PROD) ? 3000 : 2000;
  private readonly CHECK_INTERVAL = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.PROD) ? 2000 : 1000;
  private checkTimerId: number | null = null;
  
  constructor() {
    this.setupPreloadMonitoring();
    this.startPeriodicCheck();
  }

  /**
   * مراقبة الموارد المحملة مسبقاً
   */
  private setupPreloadMonitoring() {
    // مراقبة كل الـ link preload
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'LINK' && 
                element.getAttribute('rel') === 'preload') {
              this.trackPreloadedResource(element as HTMLLinkElement);
            }
          }
        });
      });
    });

    observer.observe(document.head, { 
      childList: true, 
      subtree: true 
    });

    // مراقبة الصور الموجودة
    this.trackExistingPreloads();
  }

  /**
   * فحص دوري للموارد غير المستخدمة
   */
  private startPeriodicCheck() {
    const schedule = () => {
      // لا تعمل عندما يكون التبويب غير مرئي
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const ric = (window as any).requestIdleCallback as ((cb: () => void) => number) | undefined;
      if (typeof ric === 'function') {
        ric(() => this.cleanupUnusedPreloads());
      } else {
        setTimeout(() => this.cleanupUnusedPreloads(), 0);
      }
    };

    const start = () => {
      if (this.checkTimerId != null) return;
      this.checkTimerId = window.setInterval(schedule, this.CHECK_INTERVAL);
    };

    const stop = () => {
      if (this.checkTimerId != null) {
        clearInterval(this.checkTimerId);
        this.checkTimerId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        start();
      } else {
        stop();
      }
    };

    // ابدأ/أوقف بناءً على الحالة الحالية للتبويب
    handleVisibilityChange();
    // اتخاذ إجراء عند تغيير الرؤية
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true } as any);
    }
  }

  /**
   * تنظيف الموارد غير المستخدمة
   */
  private cleanupUnusedPreloads() {
    // إذا لا توجد موارد أو التبويب غير مرئي، لا تعمل
    if (this.preloadedResources.size === 0) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

    const now = Date.now();

    this.preloadedResources.forEach((resource, url) => {
      if (!resource.used && (now - resource.timestamp) > this.PRELOAD_TIMEOUT) {
        const isUsed = this.isResourceUsed(url, resource.type);
        
        if (isUsed) {
          resource.used = true;
        } else {
          // حذف الـ preload غير المستخدم
          this.removeUnusedPreload(resource);
          this.preloadedResources.delete(url);
        }
      }
    });
  }

  /**
   * تتبع الموارد المحملة مسبقاً الموجودة
   */
  private trackExistingPreloads() {
    const preloadLinks = document.querySelectorAll('link[rel="preload"]');
    preloadLinks.forEach((link) => {
      this.trackPreloadedResource(link as HTMLLinkElement);
    });
  }

  /**
   * تتبع مورد محمل مسبقاً
   */
  private trackPreloadedResource(linkElement: HTMLLinkElement) {
    const url = linkElement.href;
    const as = linkElement.getAttribute('as') || 'unknown';
    
    // تجنب التتبع المكرر
    if (this.preloadedResources.has(url)) {
      return;
    }
    
    const resource: PreloadedResource = {
      url,
      type: as === 'image' ? 'image' : as === 'script' ? 'script' : 'style',
      timestamp: Date.now(),
      used: false,
      element: linkElement
    };

    this.preloadedResources.set(url, resource);
  }

  /**
   * حذف preload غير مستخدم
   */
  private removeUnusedPreload(resource: PreloadedResource) {
    if (resource.element && resource.element.parentNode) {
      resource.element.parentNode.removeChild(resource.element);
    }
  }

  /**
   * اختصار URL للعرض
   */
  private getShortUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const filename = urlObj.pathname.split('/').pop() || 'unknown';
      return filename.length > 50 ? filename.substring(0, 50) + '...' : filename;
    } catch {
      return url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('/') + 30) + '...';
    }
  }

  /**
   * فحص إذا كان المورد مستخدم فعلاً - محسن
   */
  private isResourceUsed(url: string, type: string): boolean {
    switch (type) {
      case 'image':
        // فحص الصور في DOM
        const images = Array.from(document.images);
        return images.some(img => {
          // فحص أكثر دقة للصور
          const imgSrc = img.src || img.currentSrc;
          if (!imgSrc) return false;
          
          // فحص المطابقة المباشرة
          if (imgSrc === url) return true;
          
          // فحص بدون معاملات query
          const urlWithoutQuery = url.split('?')[0];
          const imgSrcWithoutQuery = imgSrc.split('?')[0];
          if (urlWithoutQuery === imgSrcWithoutQuery) return true;
          
          // فحص اسم الملف
          const urlFilename = url.split('/').pop()?.split('?')[0];
          const imgFilename = imgSrc.split('/').pop()?.split('?')[0];
          return urlFilename && imgFilename && urlFilename === imgFilename;
        });
      
      case 'script':
        // فحص الـ scripts
        const scripts = Array.from(document.scripts);
        return scripts.some(script => script.src === url);
      
      case 'style':
        // فحص الـ stylesheets
        const stylesheets = Array.from(document.styleSheets);
        return stylesheets.some(sheet => sheet.href === url);
      
      default:
        return false;
    }
  }

  /**
   * تسجيل استخدام مورد يدوياً
   */
  markResourceAsUsed(url: string) {
    const resource = this.preloadedResources.get(url);
    if (resource) {
      resource.used = true;
    }
  }

  /**
   * منع preload لمورد معين
   */
  preventPreload(url: string) {
    const links = document.querySelectorAll(`link[rel="preload"][href*="${url}"]`);
    links.forEach(link => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });
  }

  /**
   * الحصول على إحصائيات
   */
  getStats() {
    const total = this.preloadedResources.size;
    const used = Array.from(this.preloadedResources.values()).filter(r => r.used).length;
    const unused = total - used;
    
    return {
      total,
      used,
      unused,
      usageRate: total > 0 ? Math.round((used / total) * 100) : 0
    };
  }

  /**
   * طباعة تقرير الاستخدام
   */
  printReport() {
    const stats = this.getStats();
    
    // طباعة تفاصيل الموارد غير المستخدمة
    const unusedResources = Array.from(this.preloadedResources.entries())
      .filter(([_, resource]) => !resource.used);
    
    if (unusedResources.length > 0) {
      unusedResources.forEach(([url, resource]) => {
      });
    }
    
  }
}

// إنشاء مثيل مفرد
const preloadManager = new PreloadManager();

// تصدير الوظائف المهمة
export const markResourceAsUsed = (url: string) => preloadManager.markResourceAsUsed(url);
export const preventPreload = (url: string) => preloadManager.preventPreload(url);
export const getPreloadStats = () => preloadManager.getStats();
export const printPreloadReport = () => preloadManager.printReport();

// إضافة وظائف للـ window للاختبار
if (typeof window !== 'undefined') {
  (window as any).preloadManager = {
    getStats: getPreloadStats,
    printReport: printPreloadReport,
    markAsUsed: markResourceAsUsed,
    prevent: preventPreload
  };
}
