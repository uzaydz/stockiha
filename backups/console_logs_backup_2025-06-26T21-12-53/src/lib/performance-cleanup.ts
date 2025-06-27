import React from 'react';

// نظام تنظيف الأداء الشامل
export class PerformanceCleanupManager {
  private static instance: PerformanceCleanupManager;
  private intervals: Set<NodeJS.Timeout> = new Set();
  private timeouts: Set<NodeJS.Timeout> = new Set();
  private observers: Set<any> = new Set();
  private eventListeners: Map<EventTarget, Array<{type: string, listener: any}>> = new Map();
  private caches: Set<any> = new Set();
  private cleanupTasks: Array<() => void> = [];
  private isCleaningUp = false;

  static getInstance(): PerformanceCleanupManager {
    if (!this.instance) {
      this.instance = new PerformanceCleanupManager();
    }
    return this.instance;
  }

  // تسجيل interval للتنظيف اللاحق
  registerInterval(intervalId: NodeJS.Timeout): NodeJS.Timeout {
    this.intervals.add(intervalId);
    return intervalId;
  }

  // تسجيل timeout للتنظيف اللاحق
  registerTimeout(timeoutId: NodeJS.Timeout): NodeJS.Timeout {
    this.timeouts.add(timeoutId);
    return timeoutId;
  }

  // تسجيل observer للتنظيف اللاحق
  registerObserver(observer: any): any {
    this.observers.add(observer);
    return observer;
  }

  // تسجيل event listener للتنظيف اللاحق
  registerEventListener(target: EventTarget, type: string, listener: any): void {
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, []);
    }
    this.eventListeners.get(target)!.push({ type, listener });
  }

  // تسجيل cache للتنظيف اللاحق
  registerCache(cache: any): any {
    this.caches.add(cache);
    return cache;
  }

  // تسجيل مهمة تنظيف مخصصة
  registerCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  // تنظيف جميع intervals
  cleanupIntervals(): void {
    console.log(`🧹 تنظيف ${this.intervals.size} intervals`);
    for (const intervalId of this.intervals) {
      try {
        clearInterval(intervalId);
      } catch (error) {
        console.warn('فشل في تنظيف interval:', intervalId);
      }
    }
    this.intervals.clear();
  }

  // تنظيف جميع timeouts
  cleanupTimeouts(): void {
    console.log(`🧹 تنظيف ${this.timeouts.size} timeouts`);
    for (const timeoutId of this.timeouts) {
      try {
        clearTimeout(timeoutId);
      } catch (error) {
        console.warn('فشل في تنظيف timeout:', timeoutId);
      }
    }
    this.timeouts.clear();
  }

  // تنظيف جميع observers
  cleanupObservers(): void {
    console.log(`🧹 تنظيف ${this.observers.size} observers`);
    for (const observer of this.observers) {
      try {
        if (observer.disconnect) observer.disconnect();
        if (observer.unobserve) observer.unobserve();
      } catch (error) {
        console.warn('فشل في تنظيف observer:', error);
      }
    }
    this.observers.clear();
  }

  // تنظيف جميع event listeners
  cleanupEventListeners(): void {
    console.log(`🧹 تنظيف event listeners من ${this.eventListeners.size} targets`);
    for (const [target, listeners] of this.eventListeners) {
      for (const { type, listener } of listeners) {
        try {
          target.removeEventListener(type, listener);
        } catch (error) {
          console.warn('فشل في تنظيف event listener:', error);
        }
      }
    }
    this.eventListeners.clear();
  }

  // تنظيف جميع caches
  cleanupCaches(): void {
    console.log(`🧹 تنظيف ${this.caches.size} caches`);
    for (const cache of this.caches) {
      try {
        if (cache.clear) cache.clear();
        if (cache.reset) cache.reset();
        if (cache.destroy) cache.destroy();
      } catch (error) {
        console.warn('فشل في تنظيف cache:', error);
      }
    }
    this.caches.clear();
  }

  // تنظيف مهام مخصصة
  cleanupCustomTasks(): void {
    console.log(`🧹 تنفيذ ${this.cleanupTasks.length} مهام تنظيف مخصصة`);
    for (const task of this.cleanupTasks) {
      try {
        task();
      } catch (error) {
        console.warn('فشل في تنفيذ مهمة تنظيف:', error);
      }
    }
    this.cleanupTasks = [];
  }

  // تنظيف شامل
  performFullCleanup(): void {
    if (this.isCleaningUp) {
      console.warn('⚠️ عملية تنظيف جارية بالفعل');
      return;
    }

    this.isCleaningUp = true;
    console.log('🚀 بدء عملية التنظيف الشامل...');

    try {
      // تنظيف بالترتيب الصحيح
      this.cleanupIntervals();
      this.cleanupTimeouts();
      this.cleanupObservers();
      this.cleanupEventListeners();
      this.cleanupCaches();
      this.cleanupCustomTasks();

      // تنظيف global objects
      this.cleanupGlobalObjects();

      // garbage collection إن أمكن
      this.triggerGarbageCollection();

      console.log('✅ تم التنظيف الشامل بنجاح');
    } catch (error) {
      console.error('❌ خطأ في التنظيف الشامل:', error);
    } finally {
      this.isCleaningUp = false;
    }
  }

  // تنظيف global objects
  private cleanupGlobalObjects(): void {
    try {
      // تنظيف global cache objects
      if ('deduplicationStats' in window) delete (window as any).deduplicationStats;
      if ('clearDeduplicationCache' in window) delete (window as any).clearDeduplicationCache;
      if ('requestManagerStats' in window) delete (window as any).requestManagerStats;
      if ('clearRequestCache' in window) delete (window as any).clearRequestCache;

      // تنظيف memory storage
      if (typeof sessionStorage !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('cache') || key.includes('performance') || key.includes('debug'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
      }

      console.log('🧹 تم تنظيف global objects');
    } catch (error) {
      console.warn('فشل في تنظيف global objects:', error);
    }
  }

  // محاولة garbage collection
  private triggerGarbageCollection(): void {
    try {
      // في Chrome DevTools
      if ('gc' in window) {
        (window as any).gc();
        console.log('🗑️ تم تشغيل garbage collection');
      }
      
      // في حالة عدم وجود window.gc
      // إنشاء pressure لتحفيز GC
      for (let i = 0; i < 100; i++) {
        const temp = new Array(1000).fill(null);
        temp.length = 0;
      }
    } catch (error) {
      console.warn('فشل في garbage collection:', error);
    }
  }

  // تنظيف دوري
  startPeriodicCleanup(intervalMs: number = 5 * 60 * 1000): void {
    const cleanupInterval = setInterval(() => {
      console.log('🔄 تنظيف دوري...');
      this.performPartialCleanup();
    }, intervalMs);

    this.registerInterval(cleanupInterval);
  }

  // تنظيف جزئي (أقل عدوانية)
  performPartialCleanup(): void {
    try {
      // تنظيف timeouts منتهية الصلاحية فقط
      const now = Date.now();
      const oldTimeouts = Array.from(this.timeouts).filter(id => {
        // logic للتحقق من انتهاء الصلاحية
        return false; // placeholder
      });
      
      oldTimeouts.forEach(id => {
        clearTimeout(id);
        this.timeouts.delete(id);
      });

      // تنظيف caches بحذر
      for (const cache of this.caches) {
        if (cache.partialCleanup) {
          cache.partialCleanup();
        }
      }

      console.log('✨ تم التنظيف الجزئي');
    } catch (error) {
      console.warn('فشل في التنظيف الجزئي:', error);
    }
  }

  // الحصول على إحصائيات
  getStats() {
    return {
      intervals: this.intervals.size,
      timeouts: this.timeouts.size,
      observers: this.observers.size,
      eventListeners: Array.from(this.eventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
      caches: this.caches.size,
      cleanupTasks: this.cleanupTasks.length,
      isCleaningUp: this.isCleaningUp
    };
  }
}

// تصدير singleton
export const performanceCleanup = PerformanceCleanupManager.getInstance();

// hooks مساعدة
export function usePerformanceCleanup() {
  const [stats, setStats] = React.useState(performanceCleanup.getStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(performanceCleanup.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    cleanup: () => performanceCleanup.performFullCleanup(),
    partialCleanup: () => performanceCleanup.performPartialCleanup()
  };
}

// دوال مساعدة للاستخدام السهل
export const safeSetInterval = (callback: () => void, delay: number): NodeJS.Timeout => {
  const id = setInterval(callback, delay);
  return performanceCleanup.registerInterval(id);
};

export const safeSetTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
  const id = setTimeout(callback, delay);
  return performanceCleanup.registerTimeout(id);
};

export const safeAddEventListener = (
  target: EventTarget, 
  type: string, 
  listener: any, 
  options?: boolean | AddEventListenerOptions
): void => {
  target.addEventListener(type, listener, options);
  performanceCleanup.registerEventListener(target, type, listener);
};

// إضافة للـ global scope
declare global {
  interface Window {
    performanceCleanup: typeof performanceCleanup;
    triggerCleanup: () => void;
    getCleanupStats: () => any;
  }
}

if (typeof window !== 'undefined') {
  window.performanceCleanup = performanceCleanup;
  window.triggerCleanup = () => performanceCleanup.performFullCleanup();
  window.getCleanupStats = () => performanceCleanup.getStats();
}

export default performanceCleanup; 