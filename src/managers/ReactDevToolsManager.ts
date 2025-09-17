// ===========================================
// نظام إدارة React DevTools
// ===========================================

import { performanceTracker } from './PerformanceTracker';

/**
 * نظام إدارة React DevTools المحسن
 * - يعطل React DevTools في التطوير لتحسين الأداء
 * - يحتوي على آليات احتياطية متعددة
 */
export class ReactDevToolsManager {
  /**
   * إعدادات React DevTools المعطلة
   */
  private disabledConfig = {
    isDisabled: true,
    supportsFiber: false,
    supportsProfiling: false,
    inject: () => {},
    on: () => {},
    off: () => {},
    sub: () => {},
    rendererPackageName: 'react-dom',
    version: '18.0.0',
    rendererConfig: {},
    hook: null
  };

  /**
   * محاولة تعطيل React DevTools بطريقة آمنة
   */
  disable(): void {
    const startTime = performance.now();
    console.log('🛠️ [ReactDevToolsManager] بدء تعطيل React DevTools - TIME:', startTime);

    if (!import.meta.env.DEV || typeof window === 'undefined') {
      console.log('⚠️ [ReactDevToolsManager] تم تخطي تعطيل DevTools (ليس في وضع التطوير أو window غير متوفر)');
      return;
    }

    try {
      console.log('🔍 [ReactDevToolsManager] فحص وجود React DevTools Hook...');
      const hasHook = window.hasOwnProperty('__REACT_DEVTOOLS_GLOBAL_HOOK__');
      const hookExists = !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

      console.log('📊 [ReactDevToolsManager] حالة React DevTools Hook:', {
        hasProperty: hasHook,
        hookExists: hookExists,
        time: performance.now()
      });

      // محاولة الحذف المباشر
      if (hasHook) {
        const descriptor = Object.getOwnPropertyDescriptor(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__');
        console.log('🔧 [ReactDevToolsManager] خصائص الـ Hook:', {
          configurable: descriptor?.configurable,
          writable: descriptor?.writable,
          hasValue: !!descriptor?.value,
          time: performance.now()
        });

        if (descriptor?.configurable) {
          console.log('🗑️ [ReactDevToolsManager] حذف React DevTools Hook...');
          delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
          const deleteTime = performance.now();
          console.log('✅ [ReactDevToolsManager] تم حذف React DevTools Hook:', {
            duration: deleteTime - startTime,
            time: deleteTime
          });
          performanceTracker.log('تم حذف React DevTools Hook');
        } else if (descriptor?.writable) {
          console.log('✏️ [ReactDevToolsManager] تعطيل React DevTools Hook عبر الكتابة...');
          (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = this.disabledConfig;
          const writeTime = performance.now();
          console.log('✅ [ReactDevToolsManager] تم تعطيل React DevTools Hook عبر الكتابة:', {
            duration: writeTime - startTime,
            time: writeTime
          });
          performanceTracker.log('تم تعطيل React DevTools Hook عبر الكتابة');
        } else {
          console.log('❌ [ReactDevToolsManager] لا يمكن تعديل React DevTools Hook');
        }
      }

      // محاولة إعادة التعريف إذا لزم الأمر
      if (!window.hasOwnProperty('__REACT_DEVTOOLS_GLOBAL_HOOK__')) {
        console.log('🔨 [ReactDevToolsManager] إنشاء React DevTools Hook معطل...');
        Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
          value: this.disabledConfig,
          writable: true,
          configurable: true
        });
        const createTime = performance.now();
        console.log('✅ [ReactDevToolsManager] تم إنشاء React DevTools Hook معطل:', {
          duration: createTime - startTime,
          time: createTime
        });
        performanceTracker.log('تم إنشاء React DevTools Hook معطل');
      }

      const totalDuration = performance.now() - startTime;
      console.log('🏁 [ReactDevToolsManager] اكتمل تعطيل React DevTools:', {
        totalDuration,
        success: true,
        time: performance.now()
      });

    } catch (error) {
      const errorTime = performance.now();
      console.log('❌ [ReactDevToolsManager] خطأ في تعطيل React DevTools:', {
        error,
        duration: errorTime - startTime,
        time: errorTime
      });
      performanceTracker.log('خطأ في تعطيل React DevTools', { error });
    }
  }

  /**
   * التحقق من حالة React DevTools
   */
  isDisabled(): boolean {
    if (!import.meta.env.DEV || typeof window === 'undefined') return false;

    const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    return hook?.isDisabled === true;
  }
}

// إنشاء نسخة عالمية
export const reactDevToolsManager = new ReactDevToolsManager();
