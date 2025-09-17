// ===========================================
// نظام تحميل البيانات الأولية المحسن
// ===========================================

import { performanceTracker } from './PerformanceTracker';

/**
 * نظام تحميل البيانات الأولية المحسن
 * - يدير تحميل البيانات الأساسية للمتجر
 * - يطبق الثيم والألوان فوراً
 * - يدير الأحداث والتخزين المؤقت
 */
export class EarlyPreloadManager {
  /**
   * تطبيق الثيم والألوان من البيانات المحملة
   */
  applyThemeFromData(data: any): boolean {
    if (!data?.organization_settings) return false;

    const settings = data.organization_settings;
    let appliedCount = 0;

    // تطبيق الألوان بطريقة محسنة
    const applyColor = (prop: string, value: string, variations: string[] = []) => {
      if (!value) return;
      document.documentElement.style.setProperty(prop, value);
      variations.forEach(variation => {
        document.documentElement.style.setProperty(variation, value);
      });
      appliedCount++;
    };

    applyColor('--primary-color', settings.theme_primary_color, ['--primary', '--color-primary', '--tw-color-primary']);
    applyColor('--secondary-color', settings.theme_secondary_color, ['--secondary']);
    applyColor('--accent-color', settings.accent_color, ['--accent']);

    // تطبيق اتجاه النص حسب اللغة
    const language = settings.default_language || 'en';
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;

    performanceTracker.log('تطبيق الثيم والألوان', {
      appliedColors: appliedCount,
      language,
      direction: language === 'ar' ? 'rtl' : 'ltr'
    });

    return true;
  }

  /**
   * كشف الشبكة البطيئة لتحسين التعامل مع الطلبات
   */
  private detectSlowNetwork(): boolean {
    try {
      // فحص navigator.connection إذا متوفر
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
          return true;
        }
        // 4g بطيئ أيضاً يحتاج معاملة خاصة
        if (effectiveType === '4g' && connection.downlink < 1) {
          return true;
        }
      }

      // فحص navigator.onLine
      if (!navigator.onLine) {
        return true;
      }

      // افتراضياً نفترض شبكة بطيئة لضمان تجربة أفضل
      return true;
    } catch {
      return true;
    }
  }

  /**
   * حفظ البيانات في التخزين العالمي
   */
  storeDataGlobally(data: any, loadTime: number): any {
    const storeData = {
      data,
      timestamp: Date.now(),
      loadTime,
      version: '1.0'
    };

    (window as any).__EARLY_STORE_DATA__ = storeData;

    // إرسال حدث لإعلام المكونات
    window.dispatchEvent(new CustomEvent('storeInitDataReady', {
      detail: storeData
    }));

    return storeData;
  }

  /**
   * بدء تحميل البيانات الأولية
   */
  async start(): Promise<{ success: boolean; data?: any; error?: any }> {
    performanceTracker.mark('preload-start');

    try {
      performanceTracker.log('بدء تحميل البيانات الأولية للمتجر');

      const [earlyPreloadResult, productPreloadResult] = await Promise.allSettled([
        import('../utils/earlyPreload').then(m => m.startEarlyPreload()),
        Promise.resolve({ success: true, data: null })
      ]);

      if (earlyPreloadResult.status === 'fulfilled' && earlyPreloadResult.value.success) {
        const loadTime = performanceTracker.measure('preload-complete', 'preload-start');

        performanceTracker.log('تم تحميل البيانات الأولية بنجاح', {
          loadTime,
          dataSize: JSON.stringify(earlyPreloadResult.value.data || {}).length
        });

        // حفظ البيانات عالمياً
        this.storeDataGlobally(earlyPreloadResult.value.data, loadTime);

        // تطبيق الثيم فوراً
        this.applyThemeFromData(earlyPreloadResult.value.data);

        return { success: true, data: earlyPreloadResult.value.data };
      } else {
        const error = earlyPreloadResult.status === 'rejected' ? earlyPreloadResult.reason : 'غير محدد';
        performanceTracker.log('فشل في تحميل البيانات الأولية - سيتم المتابعة بدون البيانات المحملة مسبقاً والمحاولة في الخلفية', { error });

        // حاول مرة أخرى في الخلفية مع timeout محسّن للشبكات البطيئة
        const isSlowNetwork = this.detectSlowNetwork();
        const retryDelay = isSlowNetwork ? 5000 : 2000; // تأخير أطول للشبكات البطيئة

        setTimeout(async () => {
          try {
            console.log('🔄 [EarlyPreloadManager] محاولة إعادة التحميل في الخلفية مع timeout محسّن');
            const retryResult = await Promise.allSettled([
              import('../utils/earlyPreload').then(m => m.startEarlyPreload())
            ]);

            if (retryResult[0].status === 'fulfilled' && retryResult[0].value.success) {
              console.log('✅ [EarlyPreloadManager] نجح إعادة التحميل في الخلفية');
              this.storeDataGlobally(retryResult[0].value.data, 0);
              this.applyThemeFromData(retryResult[0].value.data);

              // أرسل حدث لتحديث المكونات
              window.dispatchEvent(new CustomEvent('bazaar:background-data-loaded', {
                detail: retryResult[0].value.data
              }));
            }
          } catch (error) {
            console.warn('⚠️ [EarlyPreloadManager] فشل إعادة التحميل في الخلفية:', error);
          }
        }, retryDelay);

        // لا نعيد false، بل نستمر مع بيانات فارغة لتجنب توقف التطبيق
        return { success: true, data: null };
      }
    } catch (error) {
      performanceTracker.log('خطأ في تحميل البيانات', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { success: false, error };
    }
  }
}

// إنشاء نسخة عالمية
export const earlyPreloadManager = new EarlyPreloadManager();
