// ===========================================
// نظام التوقيت والأداء العالمي
// ===========================================

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
    this.startTime = performance.now();
    this.marks = new Map();
    this.measures = new Map();
  }

  /**
   * وضع علامة زمنية
   */
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * قياس الوقت بين علامتين أو من البداية
   */
  measure(name: string, startMark?: string): number {
    const end = performance.now();
    const start = startMark ? this.marks.get(startMark) || this.startTime : this.startTime;
    const duration = end - start;
    this.measures.set(name, duration);
    return duration;
  }

  /**
   * تسجيل رسالة مع معلومات التوقيت
   */
  log(message: string, data?: any): void {
    const timing = this.measure('current');
    const timestamp = new Date().toISOString();
    console.log(`🎯 [MAIN.TSX] ${message}`, {
      timing,
      totalTime: timing,
      timestamp,
      memory: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + 'MB'
      } : 'غير متوفر',
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
    this.startTime = performance.now();
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
