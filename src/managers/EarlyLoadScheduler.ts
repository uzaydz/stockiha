// ===========================================
// نظام جدولة التحميل المبكر
// ===========================================

import { performanceTracker } from './PerformanceTracker';
import { earlyPreloadManager } from './EarlyPreloadManager';

/**
 * نظام إدارة جدولة المهام المبكرة المحسن
 * - يدير تأجيل المهام لتحسين الأداء
 * - يستخدم requestIdleCallback عند الإمكان
 * - يحتوي على آليات احتياطية
 */
export class EarlyLoadScheduler {
  /**
   * جدولة مهمة باستخدام أفضل طريقة متوفرة
   */
  schedule(callback: () => void, options: { timeout?: number; delay?: number } = {}): void {
    const { timeout = 1000, delay = 500 } = options;

    try {
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(callback, { timeout });
      } else {
        setTimeout(callback, delay);
      }
    } catch {
      setTimeout(callback, delay);
    }
  }

  /**
   * بدء جدولة التحميل المبكر
   */
  start(): void {
    const startTime = performance.now();
    console.log('🚀 [EarlyLoadScheduler] بدء جدولة التحميل المبكر - TIME:', startTime);

    // تحديد التأخير حسب نوع الشبكة - محسّن لتقليل التأخير
    console.log('🔍 [EarlyLoadScheduler] كشف نوع الشبكة...');
    const isSlowNetwork = this.detectSlowNetwork();
    const timeout = isSlowNetwork ? 2000 : 800; // تقليل timeout
    const delay = isSlowNetwork ? 1000 : 500; // تقليل delay

    console.log('📊 [EarlyLoadScheduler] إعدادات الجدولة:', {
      isSlowNetwork,
      timeout,
      delay,
      networkType: isSlowNetwork ? 'بطيئة' : 'سريعة',
      time: performance.now()
    });

    this.schedule(() => {
      const scheduleStartTime = performance.now();
      console.log('⏰ [EarlyLoadScheduler] تنفيذ التحميل المبكر:', {
        delayFromStart: scheduleStartTime - startTime,
        time: scheduleStartTime
      });

      earlyPreloadManager.start();

      const scheduleEndTime = performance.now();
      console.log('✅ [EarlyLoadScheduler] اكتمل التحميل المبكر:', {
        duration: scheduleEndTime - scheduleStartTime,
        totalDuration: scheduleEndTime - startTime,
        time: scheduleEndTime
      });
    }, { timeout, delay });
  }

  /**
   * كشف الشبكة البطيئة - محسّن للكشف السريع
   */
  private detectSlowNetwork(): boolean {
    try {
      // فحص navigator.connection
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink || 0;

        // شبكات بطيئة جداً فقط
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          return true;
        }

        // 3g أو 4g بطيئة جداً
        if (effectiveType === '3g' || (effectiveType === '4g' && downlink < 0.5)) {
          return true;
        }
      }

      // فحص navigator.onLine
      if (!navigator.onLine) {
        return true;
      }

      // افتراضياً نفترض شبكة سريعة لتسريع التحميل
      return false;
    } catch {
      return false;
    }
  }

  /**
   * جدولة مهمة مخصصة
   */
  scheduleCustom(callback: () => void, timeout: number = 1000): void {
    this.schedule(callback, { timeout, delay: timeout * 0.8 });
  }
}

// إنشاء نسخة عالمية
export const earlyLoadScheduler = new EarlyLoadScheduler();
