import { useCallback, useRef, useEffect, useMemo } from 'react';

interface PerformanceMetrics {
  forcedReflows: number;
  totalLayoutTime: number;
  averageFrameTime: number;
  criticalOperations: string[];
}

interface OptimizedOperation {
  id: string;
  operation: () => void | Promise<void>;
  priority: 'high' | 'medium' | 'low';
  batchable: boolean;
}

export const useAdvancedPerformanceOptimizer = () => {
  const performanceMetrics = useRef<PerformanceMetrics>({
    forcedReflows: 0,
    totalLayoutTime: 0,
    averageFrameTime: 0,
    criticalOperations: []
  });

  const operationQueue = useRef<OptimizedOperation[]>([]);
  const batchProcessingRef = useRef<NodeJS.Timeout | null>(null);
  const frameScheduler = useRef<number | null>(null);
  const isProcessing = useRef(false);

  // مراقب أداء متقدم
  const performanceObserver = useRef<PerformanceObserver | null>(null);

  // تهيئة مراقب الأداء
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      performanceObserver.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          // مراقبة Layout Shifts والعمليات البطيئة
          if (entry.entryType === 'layout-shift') {
            performanceMetrics.current.forcedReflows++;
          }
          
          if (entry.entryType === 'measure' && entry.duration > 50) {
            performanceMetrics.current.criticalOperations.push(
              `${entry.name}: ${entry.duration.toFixed(2)}ms`
            );
          }
        });
      });

      try {
        performanceObserver.current.observe({ 
          entryTypes: ['layout-shift', 'measure', 'navigation'] 
        });
      } catch (error) {
      }
    }

    return () => {
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
      }
    };
  }, []);

  // دالة لقياس وقت العمليات
  const measureOperation = useCallback(<T>(
    operationName: string,
    operation: () => T | Promise<T>
  ): Promise<T> => {
    return new Promise(async (resolve, reject) => {
      const startTime = performance.now();
      
      // بدء القياس
      performance.mark(`${operationName}-start`);
      
      try {
        // تنفيذ العملية في الـ frame التالي لتجنب blocking
        const result = await new Promise<T>((resolveOp) => {
          requestAnimationFrame(async () => {
            try {
              const opResult = await operation();
              resolveOp(opResult);
            } catch (error) {
              reject(error);
            }
          });
        });

        // انتهاء القياس
        performance.mark(`${operationName}-end`);
        performance.measure(operationName, `${operationName}-start`, `${operationName}-end`);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // تسجيل العمليات البطيئة
        if (duration > 50) {
          performanceMetrics.current.criticalOperations.push(
            `${operationName}: ${duration.toFixed(2)}ms`
          );
          
        }
        
        resolve(result);
      } catch (error) {
        performance.mark(`${operationName}-error`);
        reject(error);
      }
    });
  }, []);

  // تجميع العمليات المتشابهة
  const batchOperation = useCallback((operation: OptimizedOperation) => {
    operationQueue.current.push(operation);
    
    // إلغاء المعالجة السابقة
    if (batchProcessingRef.current) {
      clearTimeout(batchProcessingRef.current);
    }
    
    // جدولة معالجة مجمعة
    batchProcessingRef.current = setTimeout(() => {
      if (isProcessing.current || operationQueue.current.length === 0) return;
      
      isProcessing.current = true;
      
      // فرز العمليات حسب الأولوية
      const sortedOperations = [...operationQueue.current].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
      // تجميع العمليات القابلة للدمج
      const batchableOperations = sortedOperations.filter(op => op.batchable);
      const immediateOperations = sortedOperations.filter(op => !op.batchable);
      
      // معالجة العمليات الفورية
      const processOperations = async () => {
        try {
          // العمليات عالية الأولوية أولاً
          for (const op of immediateOperations) {
            await measureOperation(`immediate-${op.id}`, async () => {
              await op.operation();
            });
          }
          
          // العمليات القابلة للتجميع في دفعة واحدة
          if (batchableOperations.length > 0) {
            await measureOperation('batch-operations', async () => {
              await Promise.all(
                batchableOperations.map(op => op.operation())
              );
            });
          }
        } catch (error) {
        } finally {
          operationQueue.current = [];
          isProcessing.current = false;
        }
      };
      
      // تنفيذ في الـ frame التالي
      requestAnimationFrame(processOperations);
    }, 16); // دمج العمليات خلال 16ms (1 frame)
  }, [measureOperation]);

  // تحسين عمليات DOM
  const optimizeDOMOperation = useCallback(<T>(
    operation: () => T,
    options?: {
      priority?: 'high' | 'medium' | 'low';
      batchable?: boolean;
      skipIfBusy?: boolean;
    }
  ): Promise<T> => {
    const { priority = 'medium', batchable = false, skipIfBusy = false } = options || {};
    
    return new Promise((resolve, reject) => {
      // تخطي إذا كان النظام مشغولاً وهذا مطلوب
      if (skipIfBusy && isProcessing.current) {
        resolve(undefined as T);
        return;
      }
      
      const operationId = `dom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      batchOperation({
        id: operationId,
        operation: async () => {
          try {
            const result = operation();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        priority,
        batchable
      });
    });
  }, [batchOperation]);

  // تحسين Toast operations
  const optimizeToastOperation = useCallback((
    toastOperation: () => void,
    delay: number = 50
  ) => {
    return optimizeDOMOperation(toastOperation, {
      priority: 'low',
      batchable: true,
      skipIfBusy: true
    });
  }, [optimizeDOMOperation]);

  // تأجيل العمليات الثقيلة
  const deferHeavyOperation = useCallback(<T>(
    operation: () => T | Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'low'
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      // استخدام requestIdleCallback إذا كان متاحاً
      const runOperation = async () => {
        try {
          const result = await measureOperation(`deferred-${priority}`, operation);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(runOperation, {
          timeout: priority === 'high' ? 100 : priority === 'medium' ? 500 : 2000
        });
      } else {
        // fallback للمتصفحات القديمة
        const delay = priority === 'high' ? 0 : priority === 'medium' ? 50 : 100;
        setTimeout(runOperation, delay);
      }
    });
  }, [measureOperation]);

  // تحسين عمليات قاعدة البيانات
  const optimizeDatabaseOperation = useCallback(<T>(
    operation: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> => {
    return measureOperation(`db-${cacheKey || 'operation'}`, async () => {
      // تأجيل قصير لتجنب blocking UI
      await new Promise(resolve => setTimeout(resolve, 1));
      return await operation();
    });
  }, [measureOperation]);

  // الحصول على تقرير الأداء
  const getPerformanceReport = useCallback(() => {
    const currentMetrics = performanceMetrics.current;
    
    return {
      ...currentMetrics,
      recommendations: [
        ...(currentMetrics.forcedReflows > 5 ? ['تقليل عمليات Layout Shifts'] : []),
        ...(currentMetrics.criticalOperations.length > 3 ? ['تحسين العمليات البطيئة'] : []),
        ...(operationQueue.current.length > 10 ? ['تقليل العمليات المتراكمة'] : [])
      ],
      queueStatus: {
        pending: operationQueue.current.length,
        processing: isProcessing.current
      }
    };
  }, []);

  // تنظيف الذاكرة
  const cleanup = useCallback(() => {
    if (batchProcessingRef.current) {
      clearTimeout(batchProcessingRef.current);
    }
    if (frameScheduler.current) {
      cancelAnimationFrame(frameScheduler.current);
    }
    operationQueue.current = [];
    performanceMetrics.current.criticalOperations = [];
  }, []);

  // تنظيف عند انتهاء المكون
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return useMemo(() => ({
    measureOperation,
    batchOperation,
    optimizeDOMOperation,
    optimizeToastOperation,
    deferHeavyOperation,
    optimizeDatabaseOperation,
    getPerformanceReport,
    cleanup,
    
    // دوال مختصرة للاستخدام السريع
    defer: deferHeavyOperation,
    measure: measureOperation,
    optimizeDOM: optimizeDOMOperation,
    optimizeDB: optimizeDatabaseOperation
  }), [
    measureOperation,
    batchOperation,
    optimizeDOMOperation,
    optimizeToastOperation,
    deferHeavyOperation,
    optimizeDatabaseOperation,
    getPerformanceReport,
    cleanup
  ]);
};
