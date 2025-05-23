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