// ملف index.ts الجديد المُعاد تنظيمه - يجمع كل الوحدات
// تم تقسيم الملف الأصلي إلى وحدات منفصلة لسهولة الصيانة والتطوير

import { getInitialLanguage } from './languageDetection';
import { initializeI18n } from './i18nInit';
import { setupAllEventListeners, scheduleLanguageUpdate } from './eventHandlers';
import { langLog } from '@/lib/debug/langDebug';
import i18n from './i18nInit';

// تهيئة i18n - محسنة لتكون أسرع
const initI18n = async () => {
  try {
    // الحصول على اللغة الأولية بطريقة أسرع (fallback إلى 'ar')
    const initialLanguage = await Promise.race([
      getInitialLanguage(),
      new Promise<string>((resolve) => setTimeout(() => resolve('ar'), 50))
    ]);
    langLog('i18n:main-init', { initialLanguage });

    // تهيئة i18n باللغة الأولية - async لكن مع timeout
    const initPromise = initializeI18n(initialLanguage);
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 100));

    await Promise.race([initPromise, timeoutPromise]);

    // إعداد مستمعات الأحداث
    const cleanup = setupAllEventListeners();

    // جدولة تحديث اللغة
    scheduleLanguageUpdate();

    // استمرار التهيئة في الخلفية
    initPromise.then(() => {
      langLog('i18n:background-init-complete', { language: initialLanguage });
    }).catch((error) => {
      console.warn('⚠️ [i18n] خطأ في التهيئة الخلفية:', error);
    });

    return cleanup;
  } catch (error) {
    console.error('⚠️ [i18n] خطأ في تهيئة النظام:', error);
    // في حالة الخطأ، تهيئة بسيطة
    try {
      await initializeI18n('ar');
    } catch (fallbackError) {
      console.error('⚠️ [i18n] خطأ في التهيئة البديلة:', fallbackError);
    }
    throw error;
  }
};

// تشغيل التهيئة
initI18n();

// تصدير الوحدات المطلوبة للاستخدام الخارجي
export { changeLanguageSafely, getCurrentLanguage, isLanguageSupported, getLanguageDirection, updatePageDirection } from './i18nInit';
export { getDefaultLanguageFromDatabase, updateLanguageFromDatabase } from './languageDetection';
export { getLanguageCache, setLanguageCache, clearLanguageCache } from './cache';

// تصدير الترجمات للاستخدام المباشر إذا لزم الأمر
export { arTranslations, enTranslations, frTranslations } from './translations';

// تصدير default للتوافق مع الكود الموجود
export default i18n;
