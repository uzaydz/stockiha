import { useCallback, useRef, useEffect } from 'react';

interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: number;
  reflows?: number;
}

interface UsePerformanceOptimizerOptions {
  enableLogging?: boolean;
  maxMetricsHistory?: number;
  detectReflows?: boolean;
}

export const usePerformanceOptimizer = (options: UsePerformanceOptimizerOptions = {}) => {
  const {
    enableLogging = process.env.NODE_ENV === 'development',
    maxMetricsHistory = 100,
    detectReflows = true
  } = options;

  const metricsRef = useRef<PerformanceMetrics[]>([]);
  const reflowCountRef = useRef(0);
  const originalScrollTop = useRef<typeof Element.prototype.scrollTop>();

  // مراقبة Forced Reflows
  useEffect(() => {
    if (!detectReflows) return;

    // تتبع العمليات التي تسبب reflow
    const reflowProperties = [
      'offsetTop', 'offsetLeft', 'offsetWidth', 'offsetHeight',
      'scrollTop', 'scrollLeft', 'scrollWidth', 'scrollHeight',
      'clientTop', 'clientLeft', 'clientWidth', 'clientHeight',
      'getComputedStyle'
    ];

    const originalMethods = new Map();

    // تسجيل الدوال الأصلية
    reflowProperties.forEach(prop => {
      if (Element.prototype[prop as keyof Element]) {
        originalMethods.set(prop, Element.prototype[prop as keyof Element]);
      }
    });

    // مراقبة getComputedStyle
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(...args) {
      reflowCountRef.current++;
      if (enableLogging && reflowCountRef.current % 10 === 0) {
      }
      return originalGetComputedStyle.apply(this, args);
    };

    return () => {
      // استعادة الدوال الأصلية
      window.getComputedStyle = originalGetComputedStyle;
    };
  }, [detectReflows, enableLogging]);

  // بدء قياس الأداء
  const startPerformanceMonitoring = useCallback((operationName: string): string => {
    const operationId = `${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: PerformanceMetrics = {
      operationName,
      startTime: performance.now(),
      reflows: reflowCountRef.current
    };

    // قياس استخدام الذاكرة إذا كان متاحاً
    if ('memory' in performance) {
      metric.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    metricsRef.current.push(metric);

    // تحديد حجم التاريخ
    if (metricsRef.current.length > maxMetricsHistory) {
      metricsRef.current = metricsRef.current.slice(-maxMetricsHistory);
    }

    if (enableLogging) {
    }

    return operationId;
  }, [enableLogging, maxMetricsHistory]);

  // إنهاء قياس الأداء
  const endPerformanceMonitoring = useCallback((operationName: string): PerformanceMetrics | null => {
    const metric = metricsRef.current.find(m => 
      m.operationName === operationName && !m.endTime
    );

    if (!metric) return null;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.reflows = reflowCountRef.current - (metric.reflows || 0);

    if (enableLogging) {
      
      // تحذيرات الأداء
      if (metric.duration > 100) {
      }
      
      if (metric.reflows && metric.reflows > 5) {
      }
    }

    return metric;
  }, [enableLogging]);

  // دالة محسنة لتنفيذ العمليات مع مراقبة الأداء
  const withPerformanceMonitoring = useCallback(<T extends (...args: any[]) => any>(
    operationName: string,
    fn: T
  ): T => {
    return ((...args: Parameters<T>) => {
      const operationId = startPerformanceMonitoring(operationName);
      
      try {
        const result = fn(...args);
        
        // إذا كانت النتيجة Promise
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            endPerformanceMonitoring(operationName);
          });
        }
        
        // إذا كانت النتيجة عادية
        endPerformanceMonitoring(operationName);
        return result;
      } catch (error) {
        endPerformanceMonitoring(operationName);
        throw error;
      }
    }) as T;
  }, [startPerformanceMonitoring, endPerformanceMonitoring]);

  // تجميع العمليات لتقليل DOM updates
  const batchDOMUpdates = useCallback((updates: (() => void)[]): void => {
    const operationId = startPerformanceMonitoring('batchDOMUpdates');
    
    // استخدام requestAnimationFrame لتجميع التحديثات
    requestAnimationFrame(() => {
      updates.forEach(update => {
        try {
          update();
        } catch (error) {
        }
      });
      
      endPerformanceMonitoring('batchDOMUpdates');
    });
  }, [startPerformanceMonitoring, endPerformanceMonitoring]);

  // تحسين العمليات المتزامنة
  const debounceOperation = useCallback(<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 300
  ): T => {
    let timeoutId: NodeJS.Timeout;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        const operationId = startPerformanceMonitoring(`debounced-${fn.name || 'operation'}`);
        
        try {
          const result = fn(...args);
          endPerformanceMonitoring(`debounced-${fn.name || 'operation'}`);
          return result;
        } catch (error) {
          endPerformanceMonitoring(`debounced-${fn.name || 'operation'}`);
          throw error;
        }
      }, delay);
    }) as T;
  }, [startPerformanceMonitoring, endPerformanceMonitoring]);

  // الحصول على تقرير الأداء
  const getPerformanceReport = useCallback(() => {
    const completedMetrics = metricsRef.current.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        slowestOperation: null,
        totalReflows: reflowCountRef.current,
        recommendations: []
      };
    }

    const averageDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / completedMetrics.length;
    const slowestOperation = completedMetrics.reduce((slowest, current) => 
      (current.duration || 0) > (slowest?.duration || 0) ? current : slowest
    );

    const recommendations: string[] = [];
    
    if (averageDuration > 50) {
      recommendations.push('⚠️ Average operation time is high. Consider optimizing heavy operations.');
    }
    
    if (reflowCountRef.current > 100) {
      recommendations.push('🔄 High number of reflows detected. Consider batching DOM operations.');
    }
    
    const slowOperations = completedMetrics.filter(m => (m.duration || 0) > 100);
    if (slowOperations.length > 0) {
      recommendations.push(`🐌 ${slowOperations.length} slow operations detected. Review: ${slowOperations.map(op => op.operationName).join(', ')}`);
    }

    return {
      totalOperations: completedMetrics.length,
      averageDuration,
      slowestOperation,
      totalReflows: reflowCountRef.current,
      recommendations,
      detailedMetrics: completedMetrics
    };
  }, []);

  // إعادة تعيين المقاييس
  const resetMetrics = useCallback(() => {
    metricsRef.current = [];
    reflowCountRef.current = 0;
  }, []);

  return {
    startPerformanceMonitoring,
    endPerformanceMonitoring,
    withPerformanceMonitoring,
    batchDOMUpdates,
    debounceOperation,
    getPerformanceReport,
    resetMetrics,
    currentReflowCount: reflowCountRef.current
  };
};
