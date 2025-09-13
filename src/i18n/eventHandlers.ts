// معالجة أحداث تغيير اللغة
import { langLog, langWarn } from '@/lib/debug/langDebug';
import { getLanguageCache, setLanguageCache } from './cache';
import { updateLanguageFromDatabase } from './languageDetection';
import { changeLanguageSafely, updatePageDirection } from './i18nInit';
import i18n from './i18nInit';

/**
 * إعداد مستمع تغيير اللغة الأساسي
 */
export const setupLanguageChangeListener = (): void => {
  // ✅ إصلاح: التحقق من صحة i18n instance قبل تسجيل المستمع
  if (i18n && typeof i18n.on === 'function') {
    i18n.on('languageChanged', (lng) => {
      const stackTrace = new Error().stack?.split('\n').slice(2, 12).join('\n') || 'unknown';

      // إذا تم تغيير اللغة إلى العربية دون سبب واضح، سجل تحذير
      if (lng === 'ar' && i18n.isInitialized) {
        console.warn('⚠️ UNEXPECTED LANGUAGE CHANGE TO ARABIC', {
          newLanguage: lng,
          previousLanguage: i18n.language,
          wasInitialized: i18n.isInitialized,
          localStorage: localStorage.getItem('i18nextLng'),
          stackTrace
        });
      }

      if (typeof window !== 'undefined') {
        langLog('i18n.languageChanged', { lng });

        // تحقق إضافي: إذا كان هناك default_language في organizationSettings، استخدمها
        const globalDataContext = (window as any).__SUPER_UNIFIED_DATA__;
        const orgDefaultLanguage = globalDataContext?.organizationSettings?.default_language;

        // إذا كانت اللغة الجديدة عربية ولكن المؤسسة لديها لغة افتراضية أخرى، استخدم لغة المؤسسة
        if (orgDefaultLanguage && orgDefaultLanguage !== lng && lng === 'ar') {
          localStorage.setItem('i18nextLng', orgDefaultLanguage);
          localStorage.setItem('i18nextLng_timestamp', Date.now().toString());

          // تغيير اللغة فوراً إذا لم تكن مطابقة
          if (i18n.language !== orgDefaultLanguage) {
            setTimeout(() => {
              i18n.changeLanguage(orgDefaultLanguage);
            }, 100);
          }
        } else {
          localStorage.setItem('i18nextLng', lng);
          localStorage.setItem('i18nextLng_timestamp', Date.now().toString());
        }

        // إزالة المفاتيح القديمة للتوحيد
        localStorage.removeItem('selectedLanguage');

        // تحديث اتجاه الصفحة
        updatePageDirection(lng);

        // تحديث cache اللغة
        const cache = getLanguageCache();
        if (cache) {
          cache.language = lng;
          cache.timestamp = Date.now();
          setLanguageCache(cache);
        }
      }
    });
  } else {
    console.warn('⚠️ [i18n] i18n instance غير صحيح، لا يمكن تسجيل مستمع تغيير اللغة');
  }
};

/**
 * إعداد مستمع أحداث AppInitializer
 */
export const setupAppInitializerListener = (): void => {
  if (typeof window !== 'undefined') {
    window.addEventListener('appInitDataReady', async (event: CustomEvent) => {
      const { language } = event.detail;

      if (language && language !== i18n.language) {
        try {
          langLog('appInitDataReady:changeLanguage', { language, current: i18n.language });
          await changeLanguageSafely(language);
        } catch (error) {
          langWarn('appInitDataReady:error', error);
        }
      }
    });
  }
};

/**
 * إعداد مستمع أحداث بيانات المتجر الموحدة (من RPC)
 */
export const setupOrganizationDataListener = (): void => {
  if (typeof window !== 'undefined') {
    window.addEventListener('organizationDataUpdated', async (event: any) => {
      try {
        const orgDetails = event?.detail?.organization;
        const orgSettings = event?.detail?.settings;

        // محاولة قراءة اللغة من عدة مصادر مع الأولوية للبيانات الجديدة
        let defaultLanguage = orgDetails?.default_language ||
                             orgSettings?.default_language ||
                             orgDetails?.organization_settings?.default_language ||
                             orgSettings?.organization_settings?.default_language;

        // محاولة خاصة للبحث في orgSettings إذا كان يحتوي على default_language مباشرة
        if (!defaultLanguage && orgSettings && typeof orgSettings === 'object') {
          if ('default_language' in orgSettings) {
            defaultLanguage = orgSettings.default_language;
          }
        }

        // محاولة خاصة للبحث في orgDetails إذا كان يحتوي على default_language مباشرة
        if (!defaultLanguage && orgDetails && typeof orgDetails === 'object') {
          if ('default_language' in orgDetails) {
            defaultLanguage = orgDetails.default_language;
          }
        }

        // محاولة إضافية: البحث في كل المفاتيح للعثور على default_language
        if (!defaultLanguage) {
          // البحث في orgDetails
          if (orgDetails) {
            for (const [key, value] of Object.entries(orgDetails)) {
              if (typeof value === 'object' && value !== null && 'default_language' in value) {
                defaultLanguage = value.default_language;
                break;
              }
            }
          }

          // البحث في orgSettings
          if (!defaultLanguage && orgSettings) {
            for (const [key, value] of Object.entries(orgSettings)) {
              if (typeof value === 'object' && value !== null && 'default_language' in value) {
                defaultLanguage = value.default_language;
                break;
              }
            }
          }
        }

        // محاولة قراءة من custom_js إذا كان موجوداً
        if (!defaultLanguage && orgSettings?.custom_js) {
          try {
            const customJs = typeof orgSettings.custom_js === 'string'
              ? JSON.parse(orgSettings.custom_js)
              : orgSettings.custom_js;

            if (customJs?.default_language) {
              defaultLanguage = customJs.default_language;
            }
          } catch (e) {
            langWarn('organizationDataUpdated:custom_js_parse_error', e);
          }
        }

        langLog('organizationDataUpdated:event', {
          defaultLanguage,
          orgId: orgDetails?.id,
          fromSettings: orgSettings?.default_language,
          fromOrg: orgDetails?.default_language
        });

        if (defaultLanguage && ['ar', 'en', 'fr'].includes(defaultLanguage) && defaultLanguage !== i18n.language) {
          // تحديث اللغة فوراً بناءً على بيانات الـ RPC
          langLog('organizationDataUpdated:changeLanguage', { to: defaultLanguage, current: i18n.language });
          await changeLanguageSafely(defaultLanguage);

          // تحديث cache لتجنّب أي استدعاء DB لاحق
          setLanguageCache({
            language: defaultLanguage,
            timestamp: Date.now(),
            organizationId: orgDetails?.id || localStorage.getItem('bazaar_organization_id') || ''
          });

          // تعليم أننا استلمنا لغة من بيانات المتجر
          (window as any).__BAZAAR_LANGUAGE_FROM_STORE__ = true;
        }
      } catch (error) {
        langWarn('organizationDataUpdated:error', error);
      }
    });
  }
};

/**
 * إعداد مستمع أحداث تحديث اللغة من المؤسسة
 */
export const setupOrganizationLanguageUpdateListener = (): void => {
  if (typeof window !== 'undefined') {
    window.addEventListener('organizationLanguageUpdate', async (event: any) => {
      if (event.detail && event.detail.language) {
        const newLang = event.detail.language;
        const currentTime = Date.now();
        langLog('organizationLanguageUpdate:event', { newLang, current: i18n.language });

        // منع التكرار - فحص إذا كانت اللغة نفسها
        if (newLang === i18n.language) {
          return;
        }

        if (newLang && ['ar', 'en', 'fr'].includes(newLang)) {
          try {
            await changeLanguageSafely(newLang);
          } catch (error) {
            langWarn('organizationLanguageUpdate:error', error);
          }
        }
      }
    });
  }
};

/**
 * إعداد الفحص الدوري للغة
 */
export const setupPeriodicLanguageCheck = (): (() => void) => {
  if (typeof window !== 'undefined') {
    // فحص دوري كل 10 ثوانٍ لأول 3 محاولات فقط
    let checkAttempts = 0;
    const maxCheckAttempts = 3; // تقليل المحاولات
    let lastCheckedLanguage = '';

    const periodicLanguageCheck = setInterval(async () => {
      // لا تُنفّذ الفحص الدوري في صفحات المتجر (RPC يوفر اللغة)
      const host = window.location.hostname;
      const isLocalhost = host.includes('localhost') || host.startsWith('127.');
      const platformDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isPlatform = platformDomains.some(d => host.endsWith(d));
      const parts = host.split('.');
      const hasSubdomain = !isLocalhost && isPlatform && parts.length > 2 && parts[0] !== 'www';
      const isCustomDomain = !isLocalhost && !isPlatform;

      if (hasSubdomain || isCustomDomain) {
        clearInterval(periodicLanguageCheck);
        return;
      }

      checkAttempts++;

      if (checkAttempts > maxCheckAttempts) {
        clearInterval(periodicLanguageCheck);
        return;
      }

      try {
        // فحص إذا كان cache المنظمة متوفر ويحتوي على لغة مختلفة
        if (window.organizationCache) {
          const storedOrgId = localStorage.getItem('bazaar_organization_id');
          if (storedOrgId) {
            const orgCacheKey = `org-id-${storedOrgId}`;
            if (window.organizationCache.has(orgCacheKey)) {
              const cached = window.organizationCache.get(orgCacheKey);
              if (cached && cached.data) {
                const defaultLanguage = cached.data.default_language ||
                                      cached.data.settings?.default_language ||
                                      cached.data.organization_settings?.default_language;

                // منع التكرار - فحص إذا كانت نفس اللغة التي تم فحصها
                if (defaultLanguage &&
                    defaultLanguage !== i18n.language &&
                    defaultLanguage !== lastCheckedLanguage &&
                    ['ar', 'en', 'fr'].includes(defaultLanguage)) {

                  lastCheckedLanguage = defaultLanguage;
                  await changeLanguageSafely(defaultLanguage);
                  clearInterval(periodicLanguageCheck);
                  return;
                }
              }
            }
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ [i18n] خطأ في الفحص الدوري للغة:', error);
        }
      }
    }, 10000); // كل 10 ثوانٍ بدلاً من 3 ثوانٍ

    // إرجاع دالة لإيقاف الفحص الدوري
    return () => clearInterval(periodicLanguageCheck);
  }

  return () => {}; // دالة فارغة إذا لم نكن في المتصفح
};

/**
 * إعداد جميع مستمعات الأحداث
 */
export const setupAllEventListeners = (): (() => void) => {
  setupLanguageChangeListener();
  setupAppInitializerListener();
  setupOrganizationDataListener();
  setupOrganizationLanguageUpdateListener();

  const stopPeriodicCheck = setupPeriodicLanguageCheck();

  // إرجاع دالة لإيقاف جميع المستمعات
  return () => {
    stopPeriodicCheck();
    // يمكن إضافة إزالة المستمعات الأخرى هنا إذا لزم الأمر
  };
};

/**
 * تشغيل تحديث اللغة بعد تهيئة i18n
 */
export const scheduleLanguageUpdate = (): void => {
  setTimeout(() => {
    const appInitData = localStorage.getItem('bazaar_app_init_data');
    const recentDbFetch = getLanguageCache() && (Date.now() - (getLanguageCache()?.timestamp || 0)) < 60000;
    const languageFromStore = typeof window !== 'undefined' && (window as any).__BAZAAR_LANGUAGE_FROM_STORE__;

    // تجنّب الجلب من DB في صفحات المتجر (RPC يوفر اللغة)
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = host.includes('localhost') || host.startsWith('127.');
    const platformDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
    const isPlatform = platformDomains.some(d => host.endsWith(d));
    const parts = host.split('.');
    const hasSubdomain = !isLocalhost && isPlatform && parts.length > 2 && parts[0] !== 'www';
    const isCustomDomain = !isLocalhost && !isPlatform;
    const isDevSubdomain = isLocalhost && parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127';
    const isStoreHost = hasSubdomain || isCustomDomain || isDevSubdomain;

    if (!appInitData && !recentDbFetch && !languageFromStore && !isStoreHost) {
      updateLanguageFromDatabase();
    }
  }, 300);
};
