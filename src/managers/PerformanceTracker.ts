// ===========================================
// نظام التوقيت والأداء العالمي
// ===========================================

const performanceNow = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const isLoggingEnabled = (() => {
  if (typeof window !== 'undefined') {
    const flag = (window as any).__ENABLE_PERFORMANCE_LOGS__;
    if (typeof flag === 'boolean') {
      return flag;
    }
  }

  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return !(import.meta as any).env.PROD;
  }

  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }

  return true;
})();

type LogPayload = Record<string, unknown> | undefined;

/**
 * نظام تتبع الأداء المركزي والمحسن
 * - يدير التوقيت والقياسات
 * - يوفر واجهة موحدة للتسجيل
 * - يحفظ البيانات عالمياً للوصول السريع
 */
export class PerformanceTracker {
  private startTime: number;
  private marks: Map<string, number>;
  private measures: Map<string, number>;

  constructor() {
    this.startTime = performanceNow();
    this.marks = new Map();
    this.measures = new Map();
  }

  /**
   * وضع علامة زمنية
   */
  mark(name: string): void {
    this.marks.set(name, performanceNow());
  }

  /**
   * قياس الوقت بين علامتين أو من البداية
   */
  measure(name: string, startMark?: string): number {
    const end = performanceNow();
    const start = startMark ? this.marks.get(startMark) ?? this.startTime : this.startTime;
    const duration = end - start;
    this.measures.set(name, duration);
    return duration;
  }

  /**
   * تسجيل رسالة مع معلومات التوقيت
   */
  log(message: string, data?: LogPayload): void {
    if (!isLoggingEnabled) {
      return;
    }

    const timing = this.measure('current');
    const timestamp = new Date().toISOString();
    const memoryInfo = (() => {
      if (typeof performance === 'undefined') {
        return undefined;
      }

      const perfMemory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      if (!perfMemory) {
        return undefined;
      }

      const toMb = (value: number) => `${Math.round(value / 1024 / 1024)}MB`;
      return {
        used: toMb(perfMemory.usedJSHeapSize),
        total: toMb(perfMemory.totalJSHeapSize)
      };
    })();

    console.log(`🎯 [MAIN.TSX] ${message}`, {
      timing,
      totalTime: timing,
      timestamp,
      ...(memoryInfo ? { memory: memoryInfo } : {}),
      ...data
    });
  }

  /**
   * الحصول على قياس محدد
   */
  getMeasure(name: string): number | undefined {
    return this.measures.get(name);
  }

  /**
   * الحصول على جميع القياسات
   */
  getAllMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures.entries());
  }

  /**
   * إعادة تعيين النظام
   */
  reset(): void {
    this.startTime = performanceNow();
    this.marks.clear();
    this.measures.clear();
  }
}

// إنشاء نسخة عالمية
export const performanceTracker = new PerformanceTracker();

// حفظ النظام عالمياً للوصول من أي مكان
if (typeof window !== 'undefined') {
  (window as any).__PERFORMANCE_TRACKER__ = performanceTracker;
}
