/**
 * نظام تتبع الأداء المحسن
 * يساعد في مراقبة وتحسين أداء العمليات المختلفة
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

class PerformanceTracker {
  private static instance: PerformanceTracker | null = null;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000; // الحد الأقصى للقياسات المحفوظة
  
  private constructor() {}
  
  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }
  
  /**
   * تتبع أداء العملية
   */
  track(operation: string, startTime: number, success: boolean = true, metadata?: Record<string, any>): void {
    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      success,
      metadata
    };
    
    this.metrics.push(metric);
    
    // الحفاظ على الحد الأقصى للقياسات
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // تسجيل في console في وضع التطوير
    if (process.env.NODE_ENV === 'development') {
      const status = success ? '✅' : '❌';
      const color = success ? 'color: #22c55e' : 'color: #ef4444';
      console.log(`%c${status} [Performance] ${operation}: ${duration.toFixed(2)}ms`, color);
    }
  }
  
  /**
   * الحصول على إحصائيات الأداء
   */
  getStats(operation?: string): {
    total: number;
    success: number;
    failed: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
  } {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;
    
    if (filteredMetrics.length === 0) {
      return {
        total: 0,
        success: 0,
        failed: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0
      };
    }
    
    const success = filteredMetrics.filter(m => m.success).length;
    const failed = filteredMetrics.filter(m => !m.success).length;
    const durations = filteredMetrics.map(m => m.duration);
    
    return {
      total: filteredMetrics.length,
      success,
      failed,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations)
    };
  }
  
  /**
   * تنظيف القياسات القديمة
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 ساعة افتراضياً
    const cutoff = Date.now() - maxAge;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }
  
  /**
   * تصدير القياسات
   */
  export(): PerformanceMetric[] {
    return [...this.metrics];
  }
  
  /**
   * إعادة تعيين القياسات
   */
  reset(): void {
    this.metrics = [];
  }
}

// تصدير الدوال المساعدة
export const performanceTracker = PerformanceTracker.getInstance();

/**
 * دالة مساعدة لتتبع الأداء
 */
export function trackPerformance(operation: string, startTime: number, success: boolean = true, metadata?: Record<string, any>): void {
  performanceTracker.track(operation, startTime, success, metadata);
}

/**
 * دالة مساعدة لقياس الأداء
 */
export function measurePerformance<T>(operation: string, fn: () => T | Promise<T>): T | Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result
        .then(value => {
          performanceTracker.track(operation, startTime, true);
          return value;
        })
        .catch(error => {
          performanceTracker.track(operation, startTime, false, { error: error.message });
          throw error;
        });
    } else {
      performanceTracker.track(operation, startTime, true);
      return result;
    }
  } catch (error) {
    performanceTracker.track(operation, startTime, false, { error: error.message });
    throw error;
  }
}

/**
 * دالة مساعدة للحصول على إحصائيات الأداء
 */
export function getPerformanceStats(operation?: string) {
  return performanceTracker.getStats(operation);
}

/**
 * دالة مساعدة لتنظيف القياسات
 */
export function cleanupPerformance(maxAge?: number) {
  performanceTracker.cleanup(maxAge);
}
