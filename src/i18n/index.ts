// ملف index.ts الجديد المُعاد تنظيمه - يجمع كل الوحدات
// تم تقسيم الملف الأصلي إلى وحدات منفصلة لسهولة الصيانة والتطوير
//
// ⚡ تحسين الأداء (v2):
// - إزالة Promise.race و timeouts التي كانت تسبب مشاكل "SafeTranslationProvider timeout"
// - التهيئة المتزامنة لأن الترجمات مُضمّنة statically
// - تأجيل عمليات الشبكة (جلب لغة المؤسسة) للخلفية

import { getInitialLanguage, getInitialLanguageSync } from './languageDetection';
import { initializeI18n } from './i18nInit';
import { setupAllEventListeners, scheduleLanguageUpdate } from './eventHandlers';
import { langLog } from '@/lib/debug/langDebug';
import i18n from './i18nInit';

// ⚡ متغير لتتبع حالة التهيئة
let initPromise: Promise<void> | null = null;

/**
 * ⚡ تهيئة i18n - محسّنة للسرعة
 *
 * التحسينات:
 * 1. استخدام getInitialLanguageSync() للحصول على اللغة فوراً من localStorage
 * 2. إزالة Promise.race و timeouts التي كانت تسبب مشاكل
 * 3. تأجيل جلب لغة المؤسسة من قاعدة البيانات للخلفية
 */
const initI18n = async (): Promise<void> => {
  // منع التهيئة المتكررة
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // ⚡ 1. الحصول على اللغة من localStorage فوراً (synchronous)
      const initialLanguage = getInitialLanguageSync();
      langLog('i18n:main-init', { initialLanguage, source: 'localStorage-sync' });

      // ⚡ 2. تهيئة i18n - الترجمات مُضمّنة فلا حاجة للانتظار
      await initializeI18n(initialLanguage);
      langLog('i18n:init-complete', { language: initialLanguage });

      // ⚡ 3. إعداد مستمعات الأحداث (بعد اكتمال التهيئة)
      setupAllEventListeners();

      // ⚡ 4. جدولة تحديث اللغة من قاعدة البيانات (في الخلفية - لا يعيق التطبيق)
      // نستخدم requestIdleCallback لتأجيل هذا حتى يكون المتصفح خاملاً
      if (typeof window !== 'undefined') {
        const scheduleBackgroundUpdate = () => {
          getInitialLanguage().then(dbLanguage => {
            if (dbLanguage && dbLanguage !== i18n.language) {
              langLog('i18n:background-language-update', { from: i18n.language, to: dbLanguage });
              // لا نغير اللغة فوراً - نترك المستخدم يقرر
            }
          }).catch(() => {
            // تجاهل أخطاء جلب اللغة من قاعدة البيانات
          });

          scheduleLanguageUpdate();
        };

        // تأجيل للخلفية
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(scheduleBackgroundUpdate, { timeout: 2000 });
        } else {
          setTimeout(scheduleBackgroundUpdate, 500);
        }
      }
    } catch (error) {
      console.error('⚠️ [i18n] خطأ في تهيئة النظام:', error);
      // في حالة الخطأ، تهيئة بسيطة بالعربية
      try {
        await initializeI18n('ar');
      } catch (fallbackError) {
        console.error('⚠️ [i18n] خطأ في التهيئة البديلة:', fallbackError);
      }
    }
  })();

  return initPromise;
};

// تشغيل التهيئة فوراً
initI18n();

// تصدير الوحدات المطلوبة للاستخدام الخارجي
export { changeLanguageSafely, getCurrentLanguage, isLanguageSupported, getLanguageDirection, updatePageDirection } from './i18nInit';
export { getDefaultLanguageFromDatabase, updateLanguageFromDatabase } from './languageDetection';
export { getLanguageCache, setLanguageCache, clearLanguageCache } from './cache';

// تصدير الترجمات للاستخدام المباشر إذا لزم الأمر
export { arTranslations, enTranslations, frTranslations } from './translations';

// تصدير default للتوافق مع الكود الموجود
export default i18n;
