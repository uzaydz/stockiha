// ملف index.ts الجديد المُعاد تنظيمه - يجمع كل الوحدات
// تم تقسيم الملف الأصلي إلى وحدات منفصلة لسهولة الصيانة والتطوير

import { getInitialLanguage } from './languageDetection';
import { initializeI18n } from './i18nInit';
import { setupAllEventListeners, scheduleLanguageUpdate } from './eventHandlers';
import { langLog } from '@/lib/debug/langDebug';
import i18n from './i18nInit';

// تهيئة i18n
const initI18n = async () => {
  try {
    // الحصول على اللغة الأولية
    const initialLanguage = await getInitialLanguage();
    langLog('i18n:main-init', { initialLanguage });

    // تهيئة i18n باللغة الأولية
    await initializeI18n(initialLanguage);

    // إعداد مستمعات الأحداث
    const cleanup = setupAllEventListeners();

    // جدولة تحديث اللغة
    scheduleLanguageUpdate();

    return cleanup;
  } catch (error) {
    console.error('⚠️ [i18n] خطأ في تهيئة النظام:', error);
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
