/**
 * ⚡ Performance Optimizer - تحسينات شاملة للأداء
 * ===================================================
 *
 * هذا الملف يحتوي على أدوات تحسين الأداء للتطبيق:
 * - Memory Management & Leak Prevention
 * - Component Render Optimization
 * - Data Loading Optimization
 * - Bundle Size Reduction
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🧹 MEMORY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * مدير تنظيف الذاكرة - يمنع تسريب الذاكرة
 */
class MemoryManager {
  private static instance: MemoryManager;
  private cleanupCallbacks: Map<string, () => void> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  // Memory usage tracking
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private lastMemoryWarning = 0;
  private readonly MEMORY_WARNING_THRESHOLD = 200 * 1024 * 1024; // 200MB
  private readonly MEMORY_WARNING_INTERVAL = 60000; // 1 minute between warnings

  private constructor() {
    this.setupBeforeUnloadHandler();
    this.startMemoryMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * تسجيل interval مع تتبع
   */
  registerInterval(id: string, callback: () => void, ms: number): void {
    // تنظيف القديم أولاً
    this.clearInterval(id);

    const intervalId = setInterval(callback, ms);
    this.intervals.set(id, intervalId);
  }

  /**
   * إلغاء interval مسجل
   */
  clearInterval(id: string): void {
    const intervalId = this.intervals.get(id);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(id);
    }
  }

  /**
   * تسجيل timeout مع تتبع
   */
  registerTimeout(id: string, callback: () => void, ms: number): void {
    // تنظيف القديم أولاً
    this.clearTimeout(id);

    const timeoutId = setTimeout(() => {
      callback();
      this.timeouts.delete(id);
    }, ms);
    this.timeouts.set(id, timeoutId);
  }

  /**
   * إلغاء timeout مسجل
   */
  clearTimeout(id: string): void {
    const timeoutId = this.timeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(id);
    }
  }

  /**
   * تسجيل AbortController مع تتبع
   */
  registerAbortController(id: string): AbortController {
    // إلغاء القديم أولاً
    this.abortController(id);

    const controller = new AbortController();
    this.abortControllers.set(id, controller);
    return controller;
  }

  /**
   * إلغاء AbortController
   */
  abortController(id: string): void {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(id);
    }
  }

  /**
   * تسجيل دالة تنظيف للـ component
   */
  registerCleanup(id: string, cleanup: () => void): void {
    this.cleanupCallbacks.set(id, cleanup);
  }

  /**
   * تنفيذ تنظيف component
   */
  cleanup(id: string): void {
    const cleanupFn = this.cleanupCallbacks.get(id);
    if (cleanupFn) {
      try {
        cleanupFn();
      } catch (e) {
        console.warn(`[MemoryManager] Cleanup error for ${id}:`, e);
      }
      this.cleanupCallbacks.delete(id);
    }
  }

  /**
   * تنظيف كل شيء (عند unmount أو logout)
   */
  cleanupAll(): void {
    // إلغاء كل الـ intervals
    this.intervals.forEach((_, id) => this.clearInterval(id));

    // إلغاء كل الـ timeouts
    this.timeouts.forEach((_, id) => this.clearTimeout(id));

    // إلغاء كل الـ AbortControllers
    this.abortControllers.forEach((_, id) => this.abortController(id));

    // تنفيذ كل دوال التنظيف
    this.cleanupCallbacks.forEach((cleanup, id) => {
      try {
        cleanup();
      } catch (e) {
        console.warn(`[MemoryManager] Cleanup error for ${id}:`, e);
      }
    });
    this.cleanupCallbacks.clear();

    console.log('[MemoryManager] ✅ All resources cleaned up');
  }

  /**
   * إعداد handler لـ beforeunload
   */
  private setupBeforeUnloadHandler(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      this.cleanupAll();
    });
  }

  /**
   * بدء مراقبة الذاكرة
   */
  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined') return;

    // فحص الذاكرة كل 30 ثانية
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);
  }

  /**
   * فحص استخدام الذاكرة
   */
  private checkMemoryUsage(): void {
    if (typeof performance === 'undefined' || !(performance as any).memory) return;

    const memory = (performance as any).memory;
    const usedMemory = memory.usedJSHeapSize;
    const now = Date.now();

    // تحذير إذا تجاوزت الذاكرة الحد
    if (usedMemory > this.MEMORY_WARNING_THRESHOLD &&
        now - this.lastMemoryWarning > this.MEMORY_WARNING_INTERVAL) {
      this.lastMemoryWarning = now;
      console.warn(`[MemoryManager] ⚠️ High memory usage: ${Math.round(usedMemory / 1024 / 1024)}MB`);

      // محاولة تنظيف الذاكرة
      this.triggerGarbageCollection();
    }
  }

  /**
   * محاولة تحفيز garbage collection
   */
  private triggerGarbageCollection(): void {
    // تنظيف الـ caches
    if (typeof caches !== 'undefined') {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('temp') || name.includes('cache')) {
            caches.delete(name);
          }
        });
      }).catch(() => {});
    }

    // تنظيف الـ weak references (يحدث تلقائياً لكن نلمّح للـ GC)
    if (typeof gc !== 'undefined') {
      try {
        (gc as any)();
      } catch {
        // GC غير متاح في production
      }
    }
  }

  /**
   * الحصول على إحصائيات الذاكرة
   */
  getMemoryStats(): {
    usedMB: number;
    totalMB: number;
    limitMB: number;
    activeIntervals: number;
    activeTimeouts: number;
    activeControllers: number;
    registeredCleanups: number;
  } | null {
    if (typeof performance === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      activeIntervals: this.intervals.size,
      activeTimeouts: this.timeouts.size,
      activeControllers: this.abortControllers.size,
      registeredCleanups: this.cleanupCallbacks.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 RENDER OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Debounce محسّن للـ renders
 */
export function debounceRender<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 100
): T {
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T;
}

/**
 * Throttle محسّن للـ renders
 */
export function throttleRender<T extends (...args: any[]) => any>(
  fn: T,
  limit: number = 100
): T {
  let lastRun = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastRun >= limit) {
      fn(...args);
      lastRun = now;
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        fn(...args);
        lastRun = Date.now();
        timeoutId = null;
      }, limit - (now - lastRun));
    }
  }) as T;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 DATA LOADING OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * خيارات تحميل البيانات المحسّنة
 */
export interface OptimizedQueryOptions {
  /** عدد العناصر في الصفحة */
  limit?: number;
  /** الصفحة الحالية (0-based) */
  page?: number;
  /** الأعمدة المطلوبة فقط */
  columns?: string[];
  /** تفعيل الـ caching */
  cache?: boolean;
  /** مدة الـ cache بالثواني */
  cacheTTL?: number;
}

/**
 * بناء SQL Query محسّنة
 */
export function buildOptimizedQuery(
  table: string,
  options: OptimizedQueryOptions = {}
): { sql: string; countSql: string } {
  const {
    limit = 50,
    page = 0,
    columns = ['*'],
  } = options;

  const offset = page * limit;
  const columnList = columns.join(', ');

  const sql = `
    SELECT ${columnList}
    FROM ${table}
    LIMIT ${limit}
    OFFSET ${offset}
  `.trim();

  const countSql = `SELECT COUNT(*) as total FROM ${table}`;

  return { sql, countSql };
}

/**
 * Cache بسيط للـ queries
 */
class QueryCache {
  private static instance: QueryCache;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 60000; // 1 minute
  private readonly MAX_ENTRIES = 100;

  private constructor() {
    // تنظيف الـ cache كل دقيقة
    setInterval(() => this.cleanup(), 60000);
  }

  static getInstance(): QueryCache {
    if (!QueryCache.instance) {
      QueryCache.instance = new QueryCache();
    }
    return QueryCache.instance;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // تنظيف إذا وصلنا للحد الأقصى
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 LAZY LOADING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * تحميل كسول للمكتبات الثقيلة
 */
export const lazyImport = {
  /**
   * تحميل Chart.js عند الحاجة فقط
   */
  charts: async () => {
    const [{ Chart }, { default: ChartJS }] = await Promise.all([
      import('chart.js/auto'),
      import('react-chartjs-2').then(m => ({ default: m })),
    ]);
    return { Chart, ChartJS };
  },

  /**
   * تحميل PDF عند الحاجة فقط
   */
  pdf: async () => {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);
    return { jsPDF, html2canvas };
  },

  /**
   * تحميل QR Code عند الحاجة فقط
   */
  qrcode: async () => {
    const { default: QRCodeStyling } = await import('qr-code-styling');
    return { QRCodeStyling };
  },

  /**
   * تحميل Excel عند الحاجة فقط
   */
  excel: async () => {
    const { default: ExcelJS } = await import('exceljs');
    return { ExcelJS };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 📈 PERFORMANCE METRICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * قياس أداء العمليات
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (duration > 100) {
    console.warn(`[Performance] ⚠️ ${name} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * قياس أداء العمليات الـ async
 */
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (duration > 500) {
    console.warn(`[Performance] ⚠️ ${name} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const memoryManager = MemoryManager.getInstance();
export const queryCache = QueryCache.getInstance();

export default {
  memoryManager,
  queryCache,
  debounceRender,
  throttleRender,
  buildOptimizedQuery,
  lazyImport,
  measurePerformance,
  measureAsyncPerformance,
};
