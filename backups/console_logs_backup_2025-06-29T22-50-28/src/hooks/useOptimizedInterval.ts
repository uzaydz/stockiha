import React, { useEffect, useRef, useCallback, useState } from 'react';

interface IntervalConfig {
  enabled?: boolean;
  immediate?: boolean; // تشغيل فوري عند التفعيل
  adaptiveDelay?: boolean; // تأخير متكيف حسب النشاط
  maxInstances?: number; // حد أقصى للـ instances
  onError?: (error: Error) => void;
  maxAttempts?: number; // حد أقصى للمحاولات عند الخطأ
}

// Global registry لتتبع جميع intervals النشطة
class IntervalRegistry {
  private static instance: IntervalRegistry;
  private intervals: Map<string, {
    id: NodeJS.Timeout;
    callback: () => void;
    delay: number;
    component: string;
    created: number;
    lastRun: number;
    runCount: number;
    errorCount: number;
    lastError?: Error;
  }> = new Map();

  static getInstance(): IntervalRegistry {
    if (!this.instance) {
      this.instance = new IntervalRegistry();
    }
    return this.instance;
  }

  register(key: string, id: NodeJS.Timeout, callback: () => void, delay: number, component: string) {
    // إزالة interval قديم بنفس المفتاح
    if (this.intervals.has(key)) {
      const old = this.intervals.get(key)!;
      clearInterval(old.id);
    }

    this.intervals.set(key, {
      id,
      callback,
      delay,
      component,
      created: Date.now(),
      lastRun: Date.now(),
      runCount: 0,
      errorCount: 0
    });

  }

  unregister(key: string) {
    const interval = this.intervals.get(key);
    if (interval) {
      clearInterval(interval.id);
      this.intervals.delete(key);
    }
  }

  // تسجيل خطأ في interval
  registerError(key: string, error: Error) {
    const interval = this.intervals.get(key);
    if (interval) {
      interval.errorCount++;
      interval.lastError = error;
      
      // إيقاف interval إذا تجاوز الحد الأقصى للأخطاء
      if (interval.errorCount >= 5) {
        this.unregister(key);
      }
    }
  }

  // تنظيف intervals حسب المكون
  cleanupByComponent(component: string) {
    let cleaned = 0;
    for (const [key, interval] of this.intervals) {
      if (interval.component === component) {
        clearInterval(interval.id);
        this.intervals.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
    }
  }

  // تنظيف intervals الميتة أو القديمة
  cleanupStaleIntervals() {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 دقيقة
    let cleaned = 0;

    for (const [key, interval] of this.intervals) {
      const age = now - interval.created;
      const timeSinceLastRun = now - interval.lastRun;
      
      // تنظيف intervals قديمة جداً أو لم تعمل لفترة طويلة أو بها أخطاء كثيرة
      if (age > staleThreshold || timeSinceLastRun > staleThreshold || interval.errorCount >= 3) {
        clearInterval(interval.id);
        this.intervals.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
    }
  }

  // الحصول على إحصائيات
  getStats() {
    const intervals = Array.from(this.intervals.values());
    const byComponent = intervals.reduce((acc, interval) => {
      acc[interval.component] = (acc[interval.component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.intervals.size,
      byComponent,
      oldestInterval: intervals.length > 0 ? Math.min(...intervals.map(i => i.created)) : null,
      averageDelay: intervals.length > 0 ? intervals.reduce((sum, i) => sum + i.delay, 0) / intervals.length : 0,
      totalErrors: intervals.reduce((sum, i) => sum + i.errorCount, 0)
    };
  }

  // تحسين تلقائي للـ intervals
  optimizeIntervals() {
    
    // تجميع intervals المتشابهة
    const intervalGroups = new Map<number, string[]>();
    
    for (const [key, interval] of this.intervals) {
      const delay = interval.delay;
      if (!intervalGroups.has(delay)) {
        intervalGroups.set(delay, []);
      }
      intervalGroups.get(delay)!.push(key);
    }

    // دمج intervals بنفس التوقيت
    for (const [delay, keys] of intervalGroups) {
      if (keys.length > 1) {
        // يمكن تطبيق منطق الدمج هنا
      }
    }
  }

  // force cleanup جميع intervals
  forceCleanupAll() {
    for (const [key, interval] of this.intervals) {
      clearInterval(interval.id);
    }
    this.intervals.clear();
  }
}

const intervalRegistry = IntervalRegistry.getInstance();

// تنظيف دوري للـ intervals القديمة
const cleanupIntervalId = setInterval(() => {
  intervalRegistry.cleanupStaleIntervals();
}, 5 * 60 * 1000); // كل 5 دقائق

// تنظيف عند إغلاق الصفحة
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    intervalRegistry.forceCleanupAll();
    clearInterval(cleanupIntervalId);
  });
}

/**
 * Hook محسن لإدارة intervals بشكل آمن
 */
export function useOptimizedInterval(
  callback: () => void,
  delay: number | null,
  config: IntervalConfig = {}
) {
  const {
    enabled = true,
    immediate = false,
    adaptiveDelay = false,
    maxInstances = 1,
    onError,
    maxAttempts = 5
  } = config;

  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const componentName = useRef<string>(`Component-${Math.random().toString(36).substring(7)}`);
  const runCount = useRef(0);
  const lastRun = useRef(Date.now());
  const errorCount = useRef(0);
  const isRunning = useRef(false);

  // حفظ أحدث callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // تحديد اسم المكون من call stack
  useEffect(() => {
    try {
      const stack = new Error().stack;
      const lines = stack?.split('\n') || [];
      for (const line of lines) {
        if (line.includes('.tsx') || line.includes('.ts')) {
          const match = line.match(/([^\/\\]+)\.(tsx?)/);
          if (match) {
            componentName.current = match[1];
            break;
          }
        }
      }
    } catch (error) {
      // استخدام اسم افتراضي
    }
  }, []);

  // دالة تشغيل محسنة مع حماية من التكرار
  const tick = useCallback(async () => {
    // منع التشغيل المتزامن
    if (isRunning.current) {
      return;
    }

    // إيقاف عند تجاوز حد الأخطاء
    if (errorCount.current >= maxAttempts) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    isRunning.current = true;

    try {
      runCount.current++;
      lastRun.current = Date.now();
      
      // تحديث registry
      const key = `${componentName.current}-${delay}`;
      const registryInterval = intervalRegistry['intervals'].get(key);
      if (registryInterval) {
        registryInterval.lastRun = Date.now();
        registryInterval.runCount++;
      }

      await savedCallback.current();
      
      // إعادة تعيين عداد الأخطاء عند النجاح
      errorCount.current = 0;
      
    } catch (error: any) {
      errorCount.current++;
      
      // تسجيل الخطأ في registry
      const key = `${componentName.current}-${delay}`;
      intervalRegistry.registerError(key, error);
      
      // إيقاف فوري عند مشاكل الموارد
      if (error.message && (
        error.message.includes('ERR_INSUFFICIENT_RESOURCES') ||
        error.message.includes('net::ERR_INSUFFICIENT_RESOURCES')
      )) {
        intervalRegistry.forceCleanupAll();
        return;
      }
      
      if (onError) {
        onError(error);
      }
      
    } finally {
      isRunning.current = false;
    }
  }, [delay, onError, maxAttempts]);

  // إدارة interval
  useEffect(() => {
    if (!enabled || delay === null || errorCount.current >= maxAttempts) {
      return;
    }

    const key = `${componentName.current}-${delay}`;
    
    // تحقق من وجود intervals مشابهة
    const stats = intervalRegistry.getStats();
    if (stats.total > 20) { // تقليل الحد من 50 إلى 20
      intervalRegistry.optimizeIntervals();
      
      // إيقاف إذا تجاوز الحد الأقصى
      if (stats.total > 50) {
        return;
      }
    }

    // تعديل delay حسب النشاط والأخطاء
    let adjustedDelay = delay;
    if (adaptiveDelay) {
      // زيادة delay إذا كان هناك intervals كثيرة أو أخطاء
      const loadFactor = Math.min(stats.total / 10, 5);
      const errorFactor = Math.min(errorCount.current / 2, 3);
      adjustedDelay = Math.round(delay * (1 + loadFactor + errorFactor));
      
      if (adjustedDelay !== delay) {
      }
    }

    // تشغيل فوري إذا مطلوب (لكن فقط إذا لم تكن هناك أخطاء)
    if (immediate && errorCount.current === 0) {
      tick();
    }

    // إنشاء interval جديد
    const id = setInterval(tick, adjustedDelay);
    intervalRef.current = id;

    // تسجيل في registry
    intervalRegistry.register(key, id, tick, adjustedDelay, componentName.current);

    // تنظيف عند الإزالة
    return () => {
      if (intervalRef.current) {
        intervalRegistry.unregister(key);
        intervalRef.current = null;
      }
    };
  }, [delay, enabled, tick, immediate, adaptiveDelay]);

  // تنظيف عند unmount المكون
  useEffect(() => {
    return () => {
      intervalRegistry.cleanupByComponent(componentName.current);
    };
  }, []);

  // إرجاع دوال مفيدة
  return {
    runCount: runCount.current,
    lastRun: lastRun.current,
    errorCount: errorCount.current,
    isActive: intervalRef.current !== null,
    isRunning: isRunning.current,
    forceRun: tick,
    forceStop: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    },
    getStats: () => intervalRegistry.getStats()
  };
}

/**
 * Hook للحصول على إحصائيات intervals العامة
 */
export function useIntervalStats() {
  const [stats, setStats] = useState(intervalRegistry.getStats());

  useEffect(() => {
    const updateStats = () => setStats(intervalRegistry.getStats());
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    ...stats,
    cleanup: () => intervalRegistry.forceCleanupAll(),
    optimize: () => intervalRegistry.optimizeIntervals()
  };
}

// تصدير registry للاستخدام المباشر
export { intervalRegistry };

// دوال global للتشخيص
if (typeof window !== 'undefined') {
  (window as any).getIntervalStats = () => {
    const stats = intervalRegistry.getStats();
    return stats;
  };
  
  (window as any).cleanupAllIntervals = () => {
    intervalRegistry.forceCleanupAll();
  };
  
  (window as any).optimizeIntervals = () => {
    intervalRegistry.optimizeIntervals();
  };
}

export default useOptimizedInterval;
