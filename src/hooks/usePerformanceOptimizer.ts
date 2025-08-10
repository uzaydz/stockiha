import { useEffect, useRef, useCallback } from 'react';
import { domOptimizer, getReflowStats } from '@/utils/performanceOptimizer';

interface UsePerformanceOptimizerOptions {
  enableLogging?: boolean;
  maxMetricsHistory?: number;
  detectReflows?: boolean;
  enableDOMOptimization?: boolean;
  enableScrollOptimization?: boolean;
}

interface PerformanceMetrics {
  timestamp: number;
  type: string;
  duration: number;
  memory?: number;
}

export const usePerformanceOptimizer = (options: UsePerformanceOptimizerOptions = {}) => {
  const {
    enableLogging = process.env.NODE_ENV === 'development',
    maxMetricsHistory = 100,
    detectReflows = true,
    enableDOMOptimization = true,
    enableScrollOptimization = true
  } = options;

  const metricsRef = useRef<PerformanceMetrics[]>([]);
  const reflowCountRef = useRef(0);
  const originalScrollTop = useRef<typeof Element.prototype.scrollTop>();
  const scrollTimeoutRef = useRef<number>();
  const reflowDebounceTimeoutRef = useRef<number | null>(null);

  // مراقبة Forced Reflows (محسّنة لتقليل الإيجابيات الكاذبة والضجيج)
  useEffect(() => {
    if (!detectReflows) return;

    const REFLOW_DEBOUNCE_MS = 250; // دمج أي تغييرات خلال 250ms في حدث واحد
    const LOG_EVERY = 100; // اطبع تحذيراً كل 100 حدث فقط

    const scheduleReflowIncrement = () => {
      if (reflowDebounceTimeoutRef.current != null) {
        clearTimeout(reflowDebounceTimeoutRef.current);
      }
      reflowDebounceTimeoutRef.current = window.setTimeout(() => {
        reflowCountRef.current++;
        domOptimizer.trackReflow();

        if (enableLogging && reflowCountRef.current % LOG_EVERY === 0) {
          console.warn(`🔄 [PERFORMANCE] Potential reflow detected (${reflowCountRef.current} total)`);
        }
        reflowDebounceTimeoutRef.current = null;
      }, REFLOW_DEBOUNCE_MS);
    };

    // مراقبة التغييرات في DOM مع تجاهل تغييرات style (مثل تح animations من framer-motion)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // تجاهل تغييرات style تماماً لتفادي التحذيرات أثناء التحريك
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          continue;
        }

        // تجاهل العناصر المرتبطة بالتحريك إن أمكن التعرف عليها بالاسم
        const targetEl = mutation.target as HTMLElement | null;
        if (targetEl) {
          const className = (targetEl.className || '').toString();
          if (
            targetEl.hasAttribute?.('data-motion') ||
            className.includes('framer') ||
            className.includes('motion')
          ) {
            continue;
          }
        }

        // جدولة زيادة العد (مرة واحدة لكل نافذة 250ms)
        scheduleReflowIncrement();
        break; // يكفي جدولة مرة واحدة لدفعة الطفرات الحالية
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      // تجاهل تغييرات style لتقليل الإيجابيات الكاذبة من التحريك
      attributeFilter: ['class'],
      attributeOldValue: false,
    });

    return () => {
      observer.disconnect();
      if (reflowDebounceTimeoutRef.current != null) {
        clearTimeout(reflowDebounceTimeoutRef.current);
        reflowDebounceTimeoutRef.current = null;
      }
    };
  }, [detectReflows, enableLogging]);

  // تحسين عمليات التمرير
  useEffect(() => {
    if (!enableScrollOptimization) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // معالجة التمرير هنا
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enableScrollOptimization]);

  // تحسين عمليات تغيير الحجم
  useEffect(() => {
    if (!enableScrollOptimization) return;

    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        // معالجة تغيير الحجم هنا
      }, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [enableScrollOptimization]);

  // دالة لتسجيل مقاييس الأداء
  const recordMetric = useCallback((type: string, duration: number) => {
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      type,
      duration,
      memory: (performance as any).memory?.usedJSHeapSize
    };

    metricsRef.current.push(metric);

    // الحفاظ على عدد محدود من المقاييس
    if (metricsRef.current.length > maxMetricsHistory) {
      metricsRef.current.shift();
    }

    if (enableLogging && duration > 16) {
      console.warn(`⚠️ [PERFORMANCE] ${type} took ${duration.toFixed(2)}ms`);
    }
  }, [maxMetricsHistory, enableLogging]);

  // دالة لقياس أداء العمليات
  const measurePerformance = useCallback(<T>(fn: () => T, operationName: string = 'operation'): T => {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    recordMetric(operationName, duration);
    return result;
  }, [recordMetric]);

  // دالة لقياس أداء العمليات غير المتزامنة
  const measureAsyncPerformance = useCallback(async <T>(
    fn: () => Promise<T>, 
    operationName: string = 'async-operation'
  ): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    recordMetric(operationName, duration);
    return result;
  }, [recordMetric]);

  // دالة للحصول على إحصائيات الأداء
  const getPerformanceStats = useCallback(() => {
    const metrics = metricsRef.current;
    const reflowStats = getReflowStats();
    
    const stats = {
      totalMetrics: metrics.length,
      averageDuration: metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length 
        : 0,
      slowOperations: metrics.filter(m => m.duration > 16).length,
      reflowCount: reflowStats.reflowCount,
      pendingReads: reflowStats.pendingReads,
      pendingWrites: reflowStats.pendingWrites
    };

    return stats;
  }, []);

  // دالة لطباعة تقرير الأداء
  const printPerformanceReport = useCallback(() => {
    const stats = getPerformanceStats();
    
    console.group('📊 تقرير الأداء');
    console.log(`إجمالي العمليات: ${stats.totalMetrics}`);
    console.log(`متوسط المدة: ${stats.averageDuration.toFixed(2)}ms`);
    console.log(`العمليات البطيئة (>16ms): ${stats.slowOperations}`);
    console.log(`عمليات reflow: ${stats.reflowCount}`);
    console.log(`قراءات DOM معلقة: ${stats.pendingReads}`);
    console.log(`كتابات DOM معلقة: ${stats.pendingWrites}`);
    console.groupEnd();
  }, [getPerformanceStats]);

  // دالة لتنظيف المقاييس
  const clearMetrics = useCallback(() => {
    metricsRef.current = [];
    reflowCountRef.current = 0;
  }, []);

  return {
    measurePerformance,
    measureAsyncPerformance,
    getPerformanceStats,
    printPerformanceReport,
    clearMetrics,
    recordMetric,
    reflowCount: reflowCountRef.current
  };
};
