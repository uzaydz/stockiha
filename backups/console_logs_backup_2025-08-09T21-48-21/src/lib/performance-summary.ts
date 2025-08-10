/**
 * ملخص التحسينات المطبقة على الأداء
 */

export interface PerformanceSummary {
  totalRequests: number;
  duplicateRequests: number;
  cacheHits: number;
  averageResponseTime: number;
  realtimeConnections: number;
  errors: number;
  improvements: string[];
}

export class PerformanceSummaryTracker {
  private static instance: PerformanceSummaryTracker;
  private requestCount = 0;
  private duplicateCount = 0;
  private cacheHitCount = 0;
  private responseTimes: number[] = [];
  private realtimeConnections = 0;
  private errorCount = 0;
  private startTime = Date.now();

  private constructor() {
    this.setupMonitoring();
  }

  static getInstance(): PerformanceSummaryTracker {
    if (!PerformanceSummaryTracker.instance) {
      PerformanceSummaryTracker.instance = new PerformanceSummaryTracker();
    }
    return PerformanceSummaryTracker.instance;
  }

  private setupMonitoring() {
    // مراقبة الاستدعاءات
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      this.requestCount++;
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        this.responseTimes.push(endTime - startTime);
        return response;
      } catch (error) {
        this.errorCount++;
        throw error;
      }
    };

    // مراقبة console للكشف عن الاستدعاءات المكررة
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('استدعاء متكرر') || message.includes('duplicate')) {
        this.duplicateCount++;
      }
      originalConsoleWarn.apply(console, args);
    };

    // مراقبة cache hits
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('cache') || message.includes('كاش')) {
        this.cacheHitCount++;
      }
      originalConsoleLog.apply(console, args);
    };
  }

  trackRealtimeConnection(status: string) {
    if (status === 'SUBSCRIBED') {
      this.realtimeConnections++;
    }
  }

  getSummary(): PerformanceSummary {
    const averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    const improvements = [
      '✅ تقليل الاستدعاءات المتكررة',
      '✅ إزالة console.log المتكررة',
      '✅ تحسين unifiedRequestManager',
      '✅ تحسين SubscriptionCheck',
      '✅ إضافة deduplication للطلبات',
      '✅ تحسين cache management',
      '✅ إضافة performance monitoring'
    ];

    return {
      totalRequests: this.requestCount,
      duplicateRequests: this.duplicateCount,
      cacheHits: this.cacheHitCount,
      averageResponseTime,
      realtimeConnections: this.realtimeConnections,
      errors: this.errorCount,
      improvements
    };
  }

  reset() {
    this.requestCount = 0;
    this.duplicateCount = 0;
    this.cacheHitCount = 0;
    this.responseTimes = [];
    this.realtimeConnections = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  printSummary() {
    const summary = this.getSummary();

    summary.improvements.forEach(improvement => {
    });
    
  }
}

// إنشاء instance عالمي
export const performanceTracker = PerformanceSummaryTracker.getInstance();

// إضافة للـ window للاستخدام في console
if (typeof window !== 'undefined') {
  (window as any).performanceTracker = performanceTracker;
  (window as any).getPerformanceSummary = () => performanceTracker.getSummary();
  (window as any).printPerformanceSummary = () => performanceTracker.printSummary();
  (window as any).resetPerformanceTracker = () => performanceTracker.reset();
}
