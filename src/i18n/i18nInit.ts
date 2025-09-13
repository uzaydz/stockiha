// تهيئة i18n
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { langLog } from '@/lib/debug/langDebug';
import { arTranslations, enTranslations, frTranslations } from './translations';

// إنشاء كائن الترجمات
const resources = {
  ar: { translation: arTranslations },
  en: { translation: enTranslations },
  fr: { translation: frTranslations }
};

// متغيرات لمنع التكرار في تغيير اللغة
let isChangingLanguage = false;
let languageChangeQueue: string[] = [];
let lastLanguageChangeTime = 0;
const LANGUAGE_CHANGE_DEBOUNCE = 2000; // زيادة التأخير إلى ثانيتين
const LANGUAGE_FETCH_DEBOUNCE = 3000; // تأخير 3 ثوان لجلب اللغة

/**
 * تهيئة i18n مع دعم async
 */
export const initializeI18n = async (initialLanguage?: string): Promise<typeof i18n> => {
  const validLanguage = initialLanguage && ['ar', 'en', 'fr'].includes(initialLanguage)
    ? initialLanguage
    : 'ar'; // fallback آمن

  langLog('initializeI18n:validLanguage', { initialLanguage, validLanguage });

  try {
    const i18nInstance = await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        lng: validLanguage,
        fallbackLng: validLanguage, // استخدام نفس اللغة المبدئية كـ fallback لتجنب التبديل
        debug: false,

        interpolation: {
          escapeValue: false,
        },

        // إعدادات React محسّنة لمنع Hook Error #310
        react: {
          useSuspense: false, // إيقاف Suspense لمنع عدم الاستقرار
          bindI18n: 'languageChanged',
          bindI18nStore: '',
          transEmptyNodeValue: '',
          transSupportBasicHtmlNodes: true,
          transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'],
        },

        // إعدادات كشف اللغة محسّنة
        detection: {
          order: ['localStorage'],
          caches: ['localStorage'],
          lookupLocalStorage: 'i18nextLng'
        },

        // قائمة اللغات المدعومة
        supportedLngs: ['ar', 'en', 'fr']
      });

    return i18nInstance;
  } catch (error) {
    console.error('⚠️ [i18n] خطأ في تهيئة i18n:', error);
    throw error;
  }
};

/**
 * تغيير اللغة مع منع التكرار
 */
export const changeLanguageSafely = async (newLang: string): Promise<void> => {
  const currentTime = Date.now();

  // منع التكرار - فحص إذا كانت اللغة نفسها أو جاري التغيير
  if (newLang === i18n.language) {
    return;
  }

  // منع التحديث المتكرر خلال فترة قصيرة
  if (currentTime - lastLanguageChangeTime < LANGUAGE_CHANGE_DEBOUNCE) {
    return;
  }

  if (isChangingLanguage) {
    if (!languageChangeQueue.includes(newLang)) {
      languageChangeQueue.push(newLang);
    }
    return;
  }

  if (newLang && ['ar', 'en', 'fr'].includes(newLang)) {
    isChangingLanguage = true;

    try {
      // تحديث وقت آخر تغيير
      lastLanguageChangeTime = currentTime;

      // التأكد من أن i18n مهيأ قبل تغيير اللغة
      if (i18n.isInitialized) {
        langLog('changeLanguageSafely:changeLanguage-now', { to: newLang });
        await i18n.changeLanguage(newLang);
      } else {
        // انتظار التهيئة مع timeout
        const waitForInitialization = () => {
          return new Promise<void>((resolve, reject) => {
            const maxWaitTime = 5000; // 5 ثوانٍ
            const checkInterval = 100; // كل 100ms
            let elapsed = 0;

            const check = () => {
              if (i18n.isInitialized) {
                resolve();
              } else if (elapsed >= maxWaitTime) {
                reject(new Error('انتهت مهلة انتظار تهيئة i18n'));
              } else {
                elapsed += checkInterval;
                setTimeout(check, checkInterval);
              }
            };

            check();
          });
        };

        await waitForInitialization();
        langLog('changeLanguageSafely:changeLanguage-after-init', { to: newLang });
        await i18n.changeLanguage(newLang);
      }
    } catch (error) {
      console.error('⚠️ [i18n] خطأ في تغيير اللغة:', error);
    } finally {
      isChangingLanguage = false;

      // معالجة أي طلبات في القائمة
      if (languageChangeQueue.length > 0) {
        const nextLang = languageChangeQueue.pop(); // أخذ آخر لغة فقط
        languageChangeQueue = []; // مسح القائمة
        if (nextLang && nextLang !== i18n.language) {
          // إرسال حدث جديد للمعالجة
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('organizationLanguageUpdate', {
              detail: { language: nextLang }
            }));
          }, 100);
        }
      }
    }
  }
};

/**
 * الحصول على اللغة الحالية
 */
export const getCurrentLanguage = (): string => {
  return i18n.language || 'ar';
};

/**
 * التحقق من دعم اللغة
 */
export const isLanguageSupported = (language: string): boolean => {
  return ['ar', 'en', 'fr'].includes(language);
};

/**
 * الحصول على اتجاه اللغة (RTL/LTR)
 */
export const getLanguageDirection = (language?: string): 'rtl' | 'ltr' => {
  const lang = language || getCurrentLanguage();
  return lang === 'ar' ? 'rtl' : 'ltr';
};

/**
 * تحديث اتجاه الصفحة
 */
export const updatePageDirection = (language?: string): void => {
  const direction = getLanguageDirection(language);
  const lang = language || getCurrentLanguage();

  document.documentElement.dir = direction;
  document.documentElement.lang = lang;
};

// تصدير i18n كـ default
export default i18n;
