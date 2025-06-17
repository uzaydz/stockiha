// =================================================================
// 🚀 PERFORMANCE MONITOR - نظام مراقبة الأداء الشامل
// =================================================================

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
}

interface TimingMetric {
  label: string;
  duration: number;
  timestamp: number;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// =================================================================
// 🎯 Performance Monitor Class
// =================================================================
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private timings: Map<string, TimingMetric[]> = new Map();
  private webVitals: Map<string, PerformanceMetric> = new Map();
  private observers: PerformanceObserver[] = [];
  private isInitialized = false;

  // =================================================================
  // 🎯 تهيئة النظام
  // =================================================================
  init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    this.initWebVitals();
    this.initPerformanceObservers();
    this.initMemoryMonitoring();
    this.isInitialized = true;
    
    console.log('🚀 Performance Monitor initialized');
  }

  // =================================================================
  // 🎯 Web Vitals Monitoring
  // =================================================================
  private initWebVitals(): void {
    // استيراد ديناميكي لـ web-vitals
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(this.handleWebVital.bind(this));
      getFID(this.handleWebVital.bind(this));
      getFCP(this.handleWebVital.bind(this));
      getLCP(this.handleWebVital.bind(this));
      getTTFB(this.handleWebVital.bind(this));
    }).catch(() => {
      console.warn('Web Vitals library not available');
    });
  }

  private handleWebVital(metric: any): void {
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      timestamp: Date.now(),
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    };

    this.webVitals.set(metric.name, performanceMetric);
    
    // إرسال إلى خدمة التحليل
    this.sendToAnalytics(performanceMetric);
    
    // تسجيل المقاييس السيئة
    if (metric.rating === 'poor') {
      console.warn(`⚠️ Poor ${metric.name}:`, metric.value);
    }
  }

  // =================================================================
  // 🎯 Performance Observers
  // =================================================================
  private initPerformanceObservers(): void {
    try {
      // مراقبة Navigation Timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processNavigationEntry(entry as PerformanceNavigationTiming);
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // مراقبة Resource Timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processResourceEntry(entry as PerformanceResourceTiming);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // مراقبة Long Tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processLongTask(entry);
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);

    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  private processNavigationEntry(entry: PerformanceNavigationTiming): void {
    const metrics = {
      'DNS Lookup': entry.domainLookupEnd - entry.domainLookupStart,
      'TCP Connection': entry.connectEnd - entry.connectStart,
      'TLS Handshake': entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      'Request': entry.responseStart - entry.requestStart,
      'Response': entry.responseEnd - entry.responseStart,
      'DOM Processing': entry.domComplete - entry.domLoading,
      'Load Complete': entry.loadEventEnd - entry.loadEventStart,
    };

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        this.addMetric(name, value);
      }
    });
  }

  private processResourceEntry(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.startTime;
    const resourceType = this.getResourceType(entry.name);
    
    this.addMetric(`Resource Load - ${resourceType}`, duration);
    
    // تحذير للموارد البطيئة
    if (duration > 1000) {
      console.warn(`🐌 Slow resource (${duration.toFixed(0)}ms):`, entry.name);
    }
  }

  private processLongTask(entry: PerformanceEntry): void {
    console.warn(`🐌 Long task detected (${entry.duration.toFixed(0)}ms)`);
    this.addMetric('Long Tasks', entry.duration);
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'JavaScript';
    if (url.includes('.css')) return 'CSS';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'Image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return 'Font';
    return 'Other';
  }

  // =================================================================
  // 🎯 Memory Monitoring
  // =================================================================
  private initMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory as MemoryInfo;
        this.addMetric('Memory Usage', memory.usedJSHeapSize / 1024 / 1024); // MB
      }, 30000); // كل 30 ثانية
    }
  }

  // =================================================================
  // 🎯 Custom Timing
  // =================================================================
  startTiming(label: string): string {
    const timingId = `${label}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    performance.mark(`start_${timingId}`);
    return timingId;
  }

  endTiming(timingId: string): number {
    const startMark = `start_${timingId}`;
    const endMark = `end_${timingId}`;
    
    performance.mark(endMark);
    performance.measure(timingId, startMark, endMark);
    
    const measure = performance.getEntriesByName(timingId)[0];
    const duration = measure.duration;
    
    // حفظ المقاييس
    const label = timingId.split('_')[0];
    this.addMetric(label, duration);
    
    // إضافة إلى سجل التوقيتات
    if (!this.timings.has(label)) {
      this.timings.set(label, []);
    }
    this.timings.get(label)!.push({
      label,
      duration,
      timestamp: Date.now(),
    });
    
    // تنظيف
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(timingId);
    
    return duration;
  }

  // =================================================================
  // 🎯 Metrics Management
  // =================================================================
  private addMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    const values = this.metrics.get(label)!;
    values.push(value);
    
    // الاحتفاظ بآخر 100 قيمة فقط
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(label: string): { avg: number; min: number; max: number; count: number } {
    const values = this.metrics.get(label) || [];
    if (values.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
    
    return {
      avg: values.reduce((a, b) => a + b) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, any> = {};
    
    for (const [label] of this.metrics) {
      result[label] = this.getMetrics(label);
    }
    
    return result;
  }

  // =================================================================
  // 🎯 Web Vitals
  // =================================================================
  getWebVitals(): Record<string, PerformanceMetric> {
    const result: Record<string, PerformanceMetric> = {};
    
    for (const [name, metric] of this.webVitals) {
      result[name] = metric;
    }
    
    return result;
  }

  // =================================================================
  // 🎯 Performance Report
  // =================================================================
  generateReport(): {
    webVitals: Record<string, PerformanceMetric>;
    customMetrics: Record<string, any>;
    timings: Record<string, TimingMetric[]>;
    summary: {
      totalMetrics: number;
      poorWebVitals: number;
      averageLoadTime: number;
      memoryUsage: number;
    };
  } {
    const webVitals = this.getWebVitals();
    const customMetrics = this.getAllMetrics();
    
    // تحويل Map إلى Object للتوقيتات
    const timings: Record<string, TimingMetric[]> = {};
    for (const [label, timingArray] of this.timings) {
      timings[label] = timingArray;
    }
    
    const poorWebVitals = Object.values(webVitals).filter(m => m.rating === 'poor').length;
    const loadTimeMetrics = this.metrics.get('Load Complete') || [];
    const averageLoadTime = loadTimeMetrics.length > 0 
      ? loadTimeMetrics.reduce((a, b) => a + b) / loadTimeMetrics.length 
      : 0;
    
    const memoryMetrics = this.metrics.get('Memory Usage') || [];
    const memoryUsage = memoryMetrics.length > 0 ? memoryMetrics[memoryMetrics.length - 1] : 0;
    
    return {
      webVitals,
      customMetrics,
      timings,
      summary: {
        totalMetrics: this.metrics.size,
        poorWebVitals,
        averageLoadTime,
        memoryUsage,
      },
    };
  }

  // =================================================================
  // 🎯 Analytics Integration
  // =================================================================
  private sendToAnalytics(metric: PerformanceMetric): void {
    // إرسال إلى Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }

    // إرسال إلى خدمة مخصصة (يمكن تخصيصها)
    if (typeof window !== 'undefined' && (window as any).analyticsEndpoint) {
      fetch((window as any).analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      }).catch(() => {
        // تجاهل أخطاء الإرسال
      });
    }
  }

  // =================================================================
  // 🎯 Cleanup
  // =================================================================
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
    this.timings.clear();
    this.webVitals.clear();
    this.isInitialized = false;
  }
}

// =================================================================
// 🎯 Singleton Instance
// =================================================================
export const performanceMonitor = new PerformanceMonitor();

// =================================================================
// 🎯 React Hook للاستخدام في المكونات
// =================================================================
export const usePerformanceMonitor = () => {
  const startTiming = (label: string) => performanceMonitor.startTiming(label);
  const endTiming = (timingId: string) => performanceMonitor.endTiming(timingId);
  const getMetrics = (label: string) => performanceMonitor.getMetrics(label);
  const getAllMetrics = () => performanceMonitor.getAllMetrics();
  const getWebVitals = () => performanceMonitor.getWebVitals();
  const generateReport = () => performanceMonitor.generateReport();

  return {
    startTiming,
    endTiming,
    getMetrics,
    getAllMetrics,
    getWebVitals,
    generateReport,
  };
};

// =================================================================
// 🎯 Performance Decorator للدوال
// =================================================================
export function measurePerformance(label: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const timingId = performanceMonitor.startTiming(label);
      
      try {
        const result = method.apply(this, args);
        
        // إذا كانت النتيجة Promise
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            performanceMonitor.endTiming(timingId);
          });
        }
        
        performanceMonitor.endTiming(timingId);
        return result;
      } catch (error) {
        performanceMonitor.endTiming(timingId);
        throw error;
      }
    };
  };
}

// تهيئة تلقائية
if (typeof window !== 'undefined') {
  // تأخير التهيئة قليلاً للسماح للصفحة بالتحميل
  setTimeout(() => {
    performanceMonitor.init();
  }, 1000);
}

export default performanceMonitor; 