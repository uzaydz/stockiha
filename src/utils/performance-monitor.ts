/**
 * 📊 Performance Monitor - مراقب الأداء
 * يتتبع مقاييس Core Web Vitals ويرسل التقارير
 */

export class PerformanceMonitor {
  private metrics: Record<string, number> = {};
  private lastCLSReported = 0;
  private lastCLSLogTs = 0;
  private devCLSLogs = 0;
  
  constructor() {
    this.initializeMonitoring();
  }
  
  private initializeMonitoring() {
    // مراقبة FCP
    this.observeFCP();
    
    // مراقبة LCP
    this.observeLCP();
    
    // مراقبة CLS
    this.observeCLS();
    
    // مراقبة FID
    this.observeFID();
    
    // إرسال التقرير عند إغلاق الصفحة
    window.addEventListener('beforeunload', () => {
      this.sendReport();
    });
  }
  
  private observeFCP() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
          if (entry.startTime > 3000) {
            console.warn('[PERF] FCP بطيء:', Math.round(entry.startTime), 'ms');
          }
        }
      }
    }).observe({ entryTypes: ['paint'] });
  }
  
  private observeLCP() {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      this.metrics.lcp = lastEntry.startTime;
      if (lastEntry.startTime > 4000) {
        console.warn('[PERF] LCP بطيء:', Math.round(lastEntry.startTime), 'ms', 'target:', lastEntry.element?.tagName || 'unknown');
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }
  
  private observeCLS() {
    const isDev = process.env.NODE_ENV === 'development';
    const isHMR = typeof import.meta !== 'undefined' && !!(import.meta as any).hot;
    const devDisable = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DISABLE_CLS_DEV === 'true';

    // في التطوير: إذا كان HMR نشطاً أو التعطيل مفعلاً عبر المتغير، لا نراقب CLS لتجنب الضجيج
    if (isDev && (isHMR || devDisable)) {
      return;
    }
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          // تتبع المصادر المسببة للـ CLS لكن بخفض الضجيج
          try {
            if (!isHMR && entry.value >= 0.1) {
              const sources = (entry.sources || []).map((src: any) => {
                const node = src.node as Element | undefined;
                if (!node) return 'unknown';
                const selector = node.id
                  ? `#${node.id}`
                  : node.className
                  ? `${node.tagName.toLowerCase()}.${String(node.className).split(' ').slice(0, 2).join('.')}`
                  : node.tagName.toLowerCase();
                return `${selector}`;
              });
              // طباعة المصدر فقط في التطوير
              if (isDev) {
                console.info('[CLS-SOURCE]', { value: Number(entry.value.toFixed(4)), sources });
              }
            }
          } catch {}
        }
      }
      this.metrics.cls = clsValue;
      if (isDev && !isHMR) {
        const now = Date.now();
        const shouldRateLimit = now - this.lastCLSLogTs < 5000; // مرّة كل 5 ثوانٍ
        const shouldCapLogs = this.devCLSLogs >= 3; // بحد أقصى 3 مرات لكل جلسة
        const increasedEnough = clsValue - this.lastCLSReported >= 0.1;
        if (clsValue > 0.15 && increasedEnough && !shouldRateLimit && !shouldCapLogs) {
          console.warn('[PERF] CLS مرتفع:', Number(clsValue.toFixed(3)));
          this.lastCLSReported = clsValue;
          this.lastCLSLogTs = now;
          this.devCLSLogs += 1;
        }
      }
    });
    // لا نستخدم buffered لتجنّب إعادة طباعة إدخالات قديمة مع HMR
    observer.observe({ type: 'layout-shift' } as any);
  }
  
  private observeFID() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        this.metrics.fid = entry.processingStart - entry.startTime;
        if (this.metrics.fid > 100) {
          console.warn('[PERF] FID مرتفع:', Math.round(this.metrics.fid), 'ms');
        }
      }
    }).observe({ entryTypes: ['first-input'] });
  }
  
  private sendReport() {
    const report = {
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      metrics: this.metrics,
      connection: (navigator as any).connection?.effectiveType
    };
    
    // إرسال التقرير (يمكن تخصيصه حسب الحاجة)
    if (report.metrics && (report.metrics.lcp || report.metrics.fcp)) {
      console.log('[PERF] Report:', report);
    }
    // في الإنتاج، يمكن إرسال التقرير لخدمة تحليل
    // fetch('/api/performance', { method: 'POST', body: JSON.stringify(report) });
  }
  
  public getMetrics() {
    return { ...this.metrics };
  }
}

// تعريف نوعي لخصائص مساعدة على window لمنع أخطاء اللينتر
declare global {
  interface Window {
    performanceMonitor?: PerformanceMonitor;
    __PERF_get?: () => Record<string, any>;
  }
}

// تهيئة المراقب
if (typeof window !== 'undefined') {
  if (!window.performanceMonitor) {
    window.performanceMonitor = new PerformanceMonitor();
  }
  // أدوات مساعدة في الكونسول
  (window as any).__PERF_get = () => window.performanceMonitor?.getMetrics?.() || {};
}
