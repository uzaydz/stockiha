import * as Sentry from '@sentry/react';
import { getDbRequestLog, clearDbRequestLog } from './db-tracker';
import { BrowserTracing } from '@sentry/tracing';

// تكوين Sentry مع تتبع الأداء
export function initializePerformanceMonitoring(dsn: string) {
  Sentry.init({
    dsn,
    integrations: [new BrowserTracing()],
    tracesSampleRate: 1.0,
    // إضافة معلومات تتبع قاعدة البيانات إلى كل حدث
    beforeSend(event) {
      const dbLog = getDbRequestLog();
      if (dbLog.length > 0) {
        event.extra = {
          ...event.extra,
          dbRequests: dbLog,
          totalDbCalls: dbLog.length,
          totalDbTime: dbLog.reduce((sum, req) => sum + (req.duration || 0), 0),
          slowestQueries: dbLog
            .sort((a, b) => (b.duration || 0) - (a.duration || 0))
            .slice(0, 5),
        };
      }
      return event;
    },
  });
}

// تتبع أداء المكون
export function trackComponentPerformance(componentName: string) {
  return {
    beforeMount() {
      clearDbRequestLog(); // مسح السجل السابق
      const transaction = Sentry.getCurrentHub().startTransaction({
        name: `Mount ${componentName}`,
        op: 'react.mount',
      });
      
      // حفظ المعاملة في المكون
      if (transaction) {
        (this as any).__sentry_transaction = transaction;
      }
    },
    mounted() {
      if ((this as any).__sentry_transaction) {
        const transaction = (this as any).__sentry_transaction;
        
        // إضافة معلومات قاعدة البيانات إلى المعاملة
        const dbLog = getDbRequestLog();
        if (dbLog.length > 0) {
          transaction.setData('dbRequests', {
            count: dbLog.length,
            totalTime: dbLog.reduce((sum, req) => sum + (req.duration || 0), 0),
            requests: dbLog,
          });
        }
        
        transaction.finish();
      }
    },
    beforeDestroy() {
      if ((this as any).__sentry_transaction) {
        (this as any).__sentry_transaction.finish();
      }
    },
  };
}

// تحليل الأداء وإرسال التنبيهات
export function analyzePerformance() {
  const dbLog = getDbRequestLog();
  
  // تحليل تكرار الاستعلامات
  const queryFrequency: Record<string, number> = {};
  const queryTimes: Record<string, number[]> = {};
  
  dbLog.forEach((entry) => {
    const key = `${entry.type}:${entry.target}`;
    queryFrequency[key] = (queryFrequency[key] || 0) + 1;
    queryTimes[key] = queryTimes[key] || [];
    if (entry.duration) {
      queryTimes[key].push(entry.duration);
    }
  });

  // تحديد الاستعلامات المتكررة
  const duplicateQueries = Object.entries(queryFrequency)
    .filter(([_, count]) => count > 1)
    .map(([query, count]) => ({
      query,
      count,
      avgTime: queryTimes[query].reduce((a, b) => a + b, 0) / queryTimes[query].length,
    }));

  // تحديد الاستعلامات البطيئة (أكثر من 500ms)
  const slowQueries = dbLog
    .filter((entry) => (entry.duration || 0) > 500)
    .map((entry) => ({
      query: `${entry.type}:${entry.target}`,
      time: entry.duration,
      page: entry.page,
    }));

  // إرسال تنبيه إلى Sentry إذا وجدت مشاكل
  if (duplicateQueries.length > 0 || slowQueries.length > 0) {
    Sentry.captureMessage('Performance Issues Detected', {
      level: 'warning',
      extra: {
        duplicateQueries,
        slowQueries,
        totalRequests: dbLog.length,
        totalTime: dbLog.reduce((sum, req) => sum + (req.duration || 0), 0),
      },
    });
  }

  return {
    duplicateQueries,
    slowQueries,
    totalRequests: dbLog.length,
    totalTime: dbLog.reduce((sum, req) => sum + (req.duration || 0), 0),
  };
}

// مراقبة أداء الصفحة
export function monitorPagePerformance() {
  // إنشاء معاملة جديدة لكل تحميل صفحة
  const transaction = Sentry.getCurrentHub().startTransaction({
    name: window.location.pathname,
    op: 'pageload',
  });

  if (!transaction) {
    return null;
  }

  // تسجيل معلومات الأداء الأساسية
  if (window.performance) {
    const pageNav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (pageNav) {
      transaction.setData('navigationTiming', {
        dnsTime: pageNav.domainLookupEnd - pageNav.domainLookupStart,
        connectTime: pageNav.connectEnd - pageNav.connectStart,
        responseTime: pageNav.responseEnd - pageNav.responseStart,
        domLoadTime: pageNav.domContentLoadedEventEnd - pageNav.domContentLoadedEventStart,
        loadTime: pageNav.loadEventEnd - pageNav.loadEventStart,
      });
    }
  }

  // إضافة معلومات قاعدة البيانات عند اكتمال تحميل الصفحة
  window.addEventListener('load', () => {
    const dbLog = getDbRequestLog();
    if (dbLog.length > 0) {
      transaction.setData('dbRequests', {
        count: dbLog.length,
        totalTime: dbLog.reduce((sum, req) => sum + (req.duration || 0), 0),
        requests: dbLog,
      });
    }
    transaction.finish();
  });

  return transaction;
}

/**
 * مراقب الأداء - لتتبع الاستدعاءات المتكررة وتحسين الأداء
 */

interface PerformanceMetric {
  type: string;
  count: number;
  totalTime: number;
  averageTime: number;
  lastCall: number;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  private requestCounts = new Map<string, number>();
  private lastRequestTimes = new Map<string, number>();

  /**
   * تسجيل استدعاء API
   */
  trackApiCall(endpoint: string, duration: number) {
    const now = Date.now();
    const lastCall = this.lastRequestTimes.get(endpoint) || 0;
    const timeSinceLastCall = now - lastCall;
    
    // تحديث عداد الاستدعاءات
    const currentCount = this.requestCounts.get(endpoint) || 0;
    this.requestCounts.set(endpoint, currentCount + 1);
    this.lastRequestTimes.set(endpoint, now);

    // تحديث المقاييس
    const existing = this.metrics.get(endpoint);
    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.averageTime = existing.totalTime / existing.count;
      existing.lastCall = now;
    } else {
      this.metrics.set(endpoint, {
        type: 'api_call',
        count: 1,
        totalTime: duration,
        averageTime: duration,
        lastCall: now
      });
    }

    // تحذير من الاستدعاءات المتكررة
    if (timeSinceLastCall < 1000 && currentCount > 0) { // أقل من ثانية
    }

    // تحذير من الاستدعاءات المفرطة
    if (currentCount > 10) {
    }
  }

  /**
   * الحصول على إحصائيات الأداء
   */
  getStats() {
    const stats = {
      totalEndpoints: this.metrics.size,
      totalCalls: Array.from(this.metrics.values()).reduce((sum, metric) => sum + metric.count, 0),
      averageResponseTime: Array.from(this.metrics.values()).reduce((sum, metric) => sum + metric.averageTime, 0) / this.metrics.size,
      mostCalledEndpoints: Array.from(this.metrics.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([endpoint, metric]) => ({
          endpoint,
          count: metric.count,
          averageTime: metric.averageTime
        })),
      recentCalls: Array.from(this.lastRequestTimes.entries())
        .filter(([_, time]) => Date.now() - time < 60000) // آخر دقيقة
        .map(([endpoint, time]) => ({
          endpoint,
          timeSinceLastCall: Date.now() - time
        }))
    };

    return stats;
  }

  /**
   * مسح المقاييس
   */
  clear() {
    this.metrics.clear();
    this.requestCounts.clear();
    this.lastRequestTimes.clear();
  }

  /**
   * طباعة تقرير الأداء
   */
  printReport() {
    const stats = this.getStats();
    
    stats.mostCalledEndpoints.forEach((item, index) => {
    });
    
    stats.recentCalls.forEach(item => {
    });
  }
}

// إنشاء مثيل عالمي
export const performanceMonitor = new PerformanceMonitor();

// دالة مساعدة لتتبع استدعاءات API
export const trackApiCall = (endpoint: string, duration: number) => {
  performanceMonitor.trackApiCall(endpoint, duration);
};

// دالة مساعدة للحصول على الإحصائيات
export const getPerformanceStats = () => {
  return performanceMonitor.getStats();
};

// دالة مساعدة لطباعة التقرير
export const printPerformanceReport = () => {
  performanceMonitor.printReport();
};

// إضافة للـ window للاستخدام في console
if (typeof window !== 'undefined') {
  (window as any).performanceMonitor = performanceMonitor;
  (window as any).getPerformanceStats = getPerformanceStats;
  (window as any).printPerformanceReport = printPerformanceReport;
}

// 🚀 نظام تقسيم المهام الطويلة
class TaskSplitter {
  private static instance: TaskSplitter;
  private isEnabled = true;

  static getInstance(): TaskSplitter {
    if (!TaskSplitter.instance) {
      TaskSplitter.instance = new TaskSplitter();
    }
    return TaskSplitter.instance;
  }

  // تقسيم المعالجة الثقيلة إلى مهام صغيرة
  async processInChunks<T>(
    items: T[],
    processor: (item: T) => any,
    chunkSize: number = 10,
    delay: number = 5
  ): Promise<any[]> {
    if (!this.isEnabled) {
      return items.map(processor);
    }

    const results: any[] = [];
    
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      
      // معالجة المجموعة
      const chunkResults = chunk.map(processor);
      results.push(...chunkResults);
      
      // تأخير قصير لتجنب حجب الواجهة
      if (i + chunkSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  // تنفيذ دالة مع تقسيم تلقائي
  async executeWithSplitting<T>(
    taskName: string,
    task: () => Promise<T>,
    maxDuration: number = 50
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await task();
      const duration = performance.now() - startTime;
      
      if (duration > maxDuration) {
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  // تمكين/تعطيل النظام
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

// إنشاء مثيل عام
export const taskSplitter = TaskSplitter.getInstance();

// دالة مساعدة لتقسيم معالجة البيانات
export const processDataInChunks = async <T>(
  data: T[],
  processor: (item: T) => any,
  options: {
    chunkSize?: number;
    delay?: number;
    taskName?: string;
  } = {}
): Promise<any[]> => {
  const { chunkSize = 10, delay = 5, taskName = 'معالجة البيانات' } = options;
  
  return taskSplitter.executeWithSplitting(
    taskName,
    () => taskSplitter.processInChunks(data, processor, chunkSize, delay)
  );
};

// 🚀 نظام تحسين تلقائي للمهام الطويلة
class LongTaskOptimizer {
  private static instance: LongTaskOptimizer;
  private isEnabled = true;
  private taskQueue: Array<{ task: () => Promise<any>, priority: number }> = [];
  private isProcessing = false;

  static getInstance(): LongTaskOptimizer {
    if (!LongTaskOptimizer.instance) {
      LongTaskOptimizer.instance = new LongTaskOptimizer();
    }
    return LongTaskOptimizer.instance;
  }

  // تشغيل مهمة مع تحسين تلقائي
  async optimizeTask<T>(
    task: () => Promise<T>,
    options: {
      maxDuration?: number;
      priority?: number;
      taskName?: string;
    } = {}
  ): Promise<T> {
    const { maxDuration = 50, priority = 1, taskName = 'مهمة غير محددة' } = options;
    
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task: async () => {
          try {
            const startTime = performance.now();
            const result = await task();
            const duration = performance.now() - startTime;
            
            if (duration > maxDuration) {
            }
            
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        priority
      });
      
      this.processQueue();
    });
  }

  // معالجة قائمة المهام
  private async processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) return;
    
    this.isProcessing = true;
    
    // ترتيب المهام حسب الأولوية
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    
    while (this.taskQueue.length > 0) {
      const { task } = this.taskQueue.shift()!;
      
      try {
        await task();
      } catch (error) {
      }
      
      // تأخير قصير بين المهام
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    this.isProcessing = false;
  }

  // تمكين/تعطيل النظام
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

// إنشاء مثيل عام
export const longTaskOptimizer = LongTaskOptimizer.getInstance();

// دالة مساعدة لتحسين المهام الطويلة
export const optimizeLongTask = async <T>(
  task: () => Promise<T>,
  taskName: string = 'مهمة غير محددة'
): Promise<T> => {
  return longTaskOptimizer.optimizeTask(task, {
    maxDuration: 50,
    priority: 1,
    taskName
  });
};

// 🚀 نظام تحسين DOM لمنع Forced Reflow
class DOMOptimizer {
  private static instance: DOMOptimizer;
  private pendingReads: Array<() => void> = [];
  private pendingWrites: Array<() => void> = [];
  private isScheduled = false;

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
        read();
      }
      
      // ثم تنفيذ جميع الكتابات
      while (this.pendingWrites.length > 0) {
        const write = this.pendingWrites.shift()!;
        write();
      }
      
      this.isScheduled = false;
    });
  }
}

// إنشاء مثيل عام
export const domOptimizer = DOMOptimizer.getInstance();

// دوال مساعدة
export const scheduleRead = (callback: () => void) => {
  domOptimizer.scheduleRead(callback);
};

export const scheduleWrite = (callback: () => void) => {
  domOptimizer.scheduleWrite(callback);
};
