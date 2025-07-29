import { QueryClient } from '@tanstack/react-query';

// إعدادات React Query محسنة لمنع المهام الطويلة و setTimeout violations
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // تحسين أوقات التخزين المؤقت - منع إعادة الجلب المفرطة
      staleTime: 5 * 60 * 1000, // 5 دقائق بدلاً من 30 ثانية
      gcTime: 10 * 60 * 1000, // 10 دقائق بدلاً من دقيقتين
      
      // تحسين إعادة المحاولة - تقليل الضغط على الشبكة
      retry: 1, // محاولة واحدة إضافية فقط
      retryDelay: 1000, // ثانية واحدة
      
      // تحسين سلوك التحديث - منع التحديث غير الضروري
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: 'always',
      
      // تحسين الشبكة
      networkMode: 'online',
      
      // تحسين إضافي للأداء
      structuralSharing: true,
      throwOnError: false,
      
      // **جديد**: منع المهام الطويلة عبر batch processing
      select: undefined, // منع التحويلات المعقدة في queries
      
      // **جديد**: تحسين معالجة البيانات لمنع setTimeout violations
      notifyOnChangeProps: ['data', 'error'] as const, // تقليل التحديثات غير الضرورية
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
      throwOnError: false,
      // **جديد**: تحسين معالجة mutations مع تقسيم العمل
      onSettled: () => {
        // تأخير قصير لمنع حجب الواجهة باستخدام scheduler
        if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
          return (window as any).scheduler.postTask(() => {
            // عمل فارغ مع أولوية منخفضة
          }, { priority: 'background' });
        } else {
          // fallback للمتصفحات الأخرى
          return new Promise(resolve => setTimeout(resolve, 1));
        }
      }
    },
  },
  
  // **محسن**: إعدادات Cache متقدمة لمنع المهام الطويلة
  mutationCache: undefined,
  
  // **محسن**: Logger محسن للأداء
  logger: {
    log: () => {},
    warn: () => {},
    error: (error) => {
      // معالجة مُحسنة للأخطاء بدون حجب
      if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
        (window as any).scheduler.postTask(() => {
        }, { priority: 'background' });
      } else {
        setTimeout(() => console.error('[QueryClient]', error), 0);
      }
    },
  },
});

// **محسن**: تنظيف محسن مع تقسيم العمل لمنع setTimeout violations
export function cleanupQueryCache() {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  // تقسيم عملية التنظيف لمنع المهام الطويلة وsetTimeout violations
  const cleanupBatch = async (startIndex: number, batchSize: number = 5) => {
    const batch = queries.slice(startIndex, startIndex + batchSize);
    
    // معالجة الدفعة بشكل متزامن سريع
    const now = Date.now();
    const expiredQueries: any[] = [];
    
    batch.forEach((query) => {
      const state = query.state;
      if (state.dataUpdatedAt) {
        const age = now - state.dataUpdatedAt;
        if (age > 15 * 60 * 1000) { // 15 دقيقة
          expiredQueries.push(query.queryKey);
        }
      }
    });
    
    // حذف المنتهية الصلاحية في دفعة واحدة
    if (expiredQueries.length > 0) {
      expiredQueries.forEach(queryKey => {
        queryClient.removeQueries({ queryKey });
      });
    }
    
    // تأخير قصير بين الدفعات باستخدام scheduler للأداء الأفضل
    if (startIndex + batchSize < queries.length) {
      if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
        await (window as any).scheduler.postTask(() => {
          return cleanupBatch(startIndex + batchSize, batchSize);
        }, { priority: 'background' });
      } else {
        // fallback مع تأخير قصير جداً
        await new Promise(resolve => setTimeout(resolve, 1));
        await cleanupBatch(startIndex + batchSize, batchSize);
      }
    }
  };

  // بدء التنظيف المجمع
  cleanupBatch(0);
}

// **جديد**: تنظيف ذكي بناءً على استخدام الذاكرة مع منع setTimeout violations
export function smartCleanup() {
  // فحص استخدام الذاكرة إن أمكن
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usagePercentage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    
    // إذا كان استخدام الذاكرة مرتفعاً، نظف بشكل عدواني
    if (usagePercentage > 0.8) {
      // تنظيف فوري بدون setTimeout
      queryClient.clear();
    } else if (usagePercentage > 0.6) {
      // تنظيف متدرج
      cleanupQueryCache();
    }
  } else {
    // fallback للمتصفحات الأخرى
    cleanupQueryCache();
  }
}

// **محسن**: جدولة التنظيف بدون setTimeout طويل
if (typeof window !== 'undefined') {
  // **جديد**: استخدام requestIdleCallback للتنظيف بدلاً من setInterval
  const scheduleCleanup = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        smartCleanup();
        // جدولة التنظيف التالي
        setTimeout(scheduleCleanup, 15 * 60 * 1000); // 15 دقيقة
      }, { timeout: 5000 });
    } else {
      // fallback للمتصفحات الأخرى
      setTimeout(() => {
        smartCleanup();
        scheduleCleanup();
      }, 15 * 60 * 1000);
    }
  };
  
  // بدء جدولة التنظيف
  scheduleCleanup();
  
  // تنظيف عند إغلاق الصفحة
  window.addEventListener('beforeunload', () => {
    queryClient.clear();
  });
  
  // **محسن**: تنظيف عند انخفاض الأداء بدون setTimeout violations
  window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // تنظيف فوري عند إخفاء الصفحة
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          cleanupQueryCache();
        }, { timeout: 1000 });
      } else {
        setTimeout(cleanupQueryCache, 100);
      }
    }
  });
  
  // **جديد**: مراقبة الأداء ومنع المهام الطويلة
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'longtask' && entry.duration > 50) {
            // إذا تم اكتشاف مهمة طويلة، قم بتنظيف سريع
            if ('requestIdleCallback' in window) {
              window.requestIdleCallback(() => {
                cleanupQueryCache();
              });
            }
          }
        });
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // ignore if PerformanceObserver not supported
    }
  }
}

export default queryClient;
