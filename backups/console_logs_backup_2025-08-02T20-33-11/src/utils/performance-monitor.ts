/**
 * 📊 Performance Monitor - مراقب الأداء
 * يتتبع مقاييس Core Web Vitals ويرسل التقارير
 */

export class PerformanceMonitor {
  private metrics: Record<string, number> = {};
  
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
        }
      }
    }).observe({ entryTypes: ['paint'] });
  }
  
  private observeLCP() {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      this.metrics.lcp = lastEntry.startTime;
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }
  
  private observeCLS() {
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.metrics.cls = clsValue;
    }).observe({ entryTypes: ['layout-shift'] });
  }
  
  private observeFID() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        this.metrics.fid = entry.processingStart - entry.startTime;
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
    
    // في الإنتاج، يمكن إرسال التقرير لخدمة تحليل
    // fetch('/api/performance', { method: 'POST', body: JSON.stringify(report) });
  }
  
  public getMetrics() {
    return { ...this.metrics };
  }
}

// تهيئة المراقب
if (typeof window !== 'undefined') {
  window.performanceMonitor = new PerformanceMonitor();
}
