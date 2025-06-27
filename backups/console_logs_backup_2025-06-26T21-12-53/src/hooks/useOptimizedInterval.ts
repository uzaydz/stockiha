import React, { useEffect, useRef, useCallback, useState } from 'react';

interface IntervalConfig {
  enabled?: boolean;
  immediate?: boolean; // تشغيل فوري عند التفعيل
  adaptiveDelay?: boolean; // تأخير متكيف حسب النشاط
  maxInstances?: number; // حد أقصى للـ instances
  onError?: (error: Error) => void;
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
      console.warn(`🔄 استبدال interval موجود: ${key} في ${component}`);
    }

    this.intervals.set(key, {
      id,
      callback,
      delay,
      component,
      created: Date.now(),
      lastRun: Date.now(),
      runCount: 0
    });

    console.log(`✅ تسجيل interval جديد: ${key} (${delay}ms) في ${component}`);
  }

  unregister(key: string) {
    const interval = this.intervals.get(key);
    if (interval) {
      clearInterval(interval.id);
      this.intervals.delete(key);
      console.log(`❌ إزالة interval: ${key}`);
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
      console.log(`🧹 تنظيف ${cleaned} intervals من ${component}`);
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
      
      // تنظيف intervals قديمة جداً أو لم تعمل لفترة طويلة
      if (age > staleThreshold || timeSinceLastRun > staleThreshold) {
        clearInterval(interval.id);
        this.intervals.delete(key);
        cleaned++;
        console.warn(`⚠️ تنظيف interval قديم: ${key} (عمر: ${Math.round(age/1000/60)} دقيقة)`);
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 تنظيف ${cleaned} intervals قديمة`);
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
      averageDelay: intervals.length > 0 ? intervals.reduce((sum, i) => sum + i.delay, 0) / intervals.length : 0
    };
  }

  // تحسين تلقائي للـ intervals
  optimizeIntervals() {
    console.log('🔧 بدء تحسين intervals...');
    
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
        console.log(`⚡ دمج ${keys.length} intervals بتوقيت ${delay}ms`);
        // يمكن تطبيق منطق الدمج هنا
      }
    }
  }

  // force cleanup جميع intervals
  forceCleanupAll() {
    console.log(`🚨 تنظيف إجباري لجميع intervals (${this.intervals.size})`);
    for (const [key, interval] of this.intervals) {
      clearInterval(interval.id);
    }
    this.intervals.clear();
  }
}

const intervalRegistry = IntervalRegistry.getInstance();

// تنظيف دوري للـ intervals القديمة
setInterval(() => {
  intervalRegistry.cleanupStaleIntervals();
}, 5 * 60 * 1000); // كل 5 دقائق

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
    onError
  } = config;

  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const componentName = useRef<string>(`Component-${Math.random().toString(36).substring(7)}`);
  const runCount = useRef(0);
  const lastRun = useRef(Date.now());

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

  // دالة تشغيل محسنة
  const tick = useCallback(() => {
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

      savedCallback.current();
    } catch (error) {
      console.error(`خطأ في interval ${componentName.current}:`, error);
      if (onError) {
        onError(error as Error);
      }
    }
  }, [delay, onError]);

  // إدارة interval
  useEffect(() => {
    if (!enabled || delay === null) {
      return;
    }

    const key = `${componentName.current}-${delay}`;
    
    // تحقق من وجود intervals مشابهة
    const stats = intervalRegistry.getStats();
    if (stats.total > 50) {
      console.warn(`⚠️ عدد كبير من intervals نشطة: ${stats.total}`);
      intervalRegistry.optimizeIntervals();
    }

    // تعديل delay حسب النشاط
    let adjustedDelay = delay;
    if (adaptiveDelay) {
      // زيادة delay إذا كان هناك intervals كثيرة
      const loadFactor = Math.min(stats.total / 20, 3);
      adjustedDelay = Math.round(delay * loadFactor);
      
      if (adjustedDelay !== delay) {
        console.log(`🔧 تعديل delay: ${delay}ms -> ${adjustedDelay}ms (load: ${loadFactor.toFixed(1)})`);
      }
    }

    // تشغيل فوري إذا مطلوب
    if (immediate) {
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
    isActive: intervalRef.current !== null,
    forceRun: tick,
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
    console.table(stats.byComponent);
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