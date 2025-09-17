// اكتشاف وتحديد اللغة الافتراضية
import { getOrganizationByDomain, getOrganizationBySubdomain } from '@/lib/api/deduplicatedApi';
import { getOrganizationDefaultLanguage } from '@/lib/api/deduplicatedApi';
import { langLog, langWarn } from '@/lib/debug/langDebug';
import { getEarlyPreloadedData } from '@/utils/earlyPreload';
import { getLanguageCache, setLanguageCache, isCacheValid, getDefaultLanguageFromOrganizationCache } from './cache';

// متغيرات لمنع التحديث المتكرر للغة
let isUpdatingLanguageFromDB = false;
let lastLanguageUpdateFromDBTime = 0;
const LANGUAGE_UPDATE_FROM_DB_DEBOUNCE = 10000; // 10 ثوان

/**
 * الحصول على اللغة الافتراضية من قاعدة البيانات
 */
export const getDefaultLanguageFromDatabase = async (useImmediateCache = false): Promise<string> => {
  let subdomain: string | null = null;
  let organizationData: any = null;
  let organizationId: string | null = null;

  try {
    // الحصول على subdomain من URL الحالي أو حل المؤسسة من الدومين المخصص
    const currentHost = window.location.hostname;
    const isLocalhost = currentHost.includes('localhost') || currentHost.startsWith('127.');
    const platformDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
    const isPlatform = platformDomains.some(d => currentHost.endsWith(d));

    // تحقق إذا كان النطاق المخصص أم لا
    const isCustomDomain = !isLocalhost && !isPlatform && currentHost !== 'ktobi.online' && currentHost !== 'www.ktobi.online' && currentHost !== 'stockiha.com' && currentHost !== 'www.stockiha.com';

    if (isCustomDomain) {
      // للنطاقات المخصصة، استخدم النطاق كاملاً
      subdomain = currentHost;
    } else {
      // للنطاقات الفرعية، استخدم الجزء الأول فقط
      subdomain = currentHost.split('.')[0];
    }

    langLog('getDefaultLanguageFromDatabase:start', { currentHost, useImmediateCache });

    if (isLocalhost) {
      // في التطوير المحلي، نعتمد على localStorage مباشرة
      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      if (!storedOrgId) {
        langLog('getDefaultLanguageFromDatabase:localhost-no-org -> ar');
        return 'ar'; // fallback للتطوير المحلي
      }
      // استخدم معرف المؤسسة المحفوظ مباشرة
      subdomain = storedOrgId; // استخدم معرف المؤسسة بدلاً من subdomain
    }

    // فحص إضافي: تجاهل www كنطاق فرعي
    if (subdomain === 'www') {
      const storedOrgId = localStorage.getItem('bazaar_organization_id');
      if (storedOrgId) {
        subdomain = storedOrgId;
      } else {
        return 'ar'; // fallback إذا لم يوجد معرف محفوظ
      }
    }

    // فحص التخزين المؤقت أولاً (مع دعم التخزين الفوري)
    const cache = getLanguageCache();
    if (cache && cache.organizationId === subdomain) {
      if (isCacheValid(cache, useImmediateCache)) {
        langLog('getDefaultLanguageFromDatabase:hit-cache', { language: cache.language, cacheAge: Date.now() - cache.timestamp });
        return cache.language;
      } else {
        langLog('getDefaultLanguageFromDatabase:expired-cache');
      }
    } else {
      langLog('getDefaultLanguageFromDatabase:no-cache-match');
    }

    // محاولة الحصول على البيانات من organizationCache فوراً
    organizationData = getDefaultLanguageFromOrganizationCache(subdomain);
    if (organizationData) {
      const language = organizationData;
      setLanguageCache({
        language: language,
        timestamp: Date.now(),
        organizationId: subdomain,
        fromCache: true
      });

      langLog('getDefaultLanguageFromDatabase:window-organizationCache-language', { subdomain, language });
      return ['ar', 'en', 'fr'].includes(language) ? language : 'ar';
    }

    // إذا لم نجد في cache، اجلب من قاعدة البيانات باستخدام API موحد
    let targetOrgId: string | null = null;

    if (organizationId) {
      targetOrgId = organizationId;
    } else {
      // للتطوير المحلي - التحقق إذا كان subdomain هو معرف مؤسسة UUID
      const isUUID = subdomain && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subdomain);

      if (isUUID) {
        // إذا كان subdomain هو UUID (معرف مؤسسة)، استخدمه مباشرة
        targetOrgId = subdomain;
      } else if (!subdomain) {
        targetOrgId = localStorage.getItem('bazaar_organization_id');
        if (!targetOrgId) return 'ar'; // fallback
      } else {
        // استخدام نفس منطق isCustomDomain المحدد في البداية
        if (isCustomDomain) {
          // للنطاقات المخصصة، ابحث في عمود domain
          langLog('getDefaultLanguageFromDatabase:using-custom-domain-search', { currentHost });
          const org = await getOrganizationByDomain(currentHost).catch(() => null);
          targetOrgId = org?.id;
          if (!targetOrgId) {
            langWarn('getDefaultLanguageFromDatabase:custom-domain-not-found -> ar', { currentHost });
            return 'ar';
          }
        } else if (isPlatform) {
          // للنطاقات الفرعية في المنصة، ابحث في عمود subdomain
          if (subdomain === 'www') {
            return 'ar';
          }
          langLog('getDefaultLanguageFromDatabase:using-subdomain-search', { subdomain });
          const org = await getOrganizationBySubdomain(subdomain).catch(() => null);
          targetOrgId = org?.id;
          if (!targetOrgId) { 
            langWarn('getDefaultLanguageFromDatabase:no-targetOrgId(platform) -> ar', { subdomain }); 
            return 'ar'; 
          }
        } else {
          // fallback: محاولة البحث بالنطاق أولاً، ثم بالsubdomain
          langLog('getDefaultLanguageFromDatabase:using-fallback-search', { currentHost, subdomain });
          let org = await getOrganizationByDomain(currentHost).catch(() => null);
          if (!org && subdomain && subdomain !== currentHost) {
            org = await getOrganizationBySubdomain(subdomain).catch(() => null);
          }
          targetOrgId = org?.id || localStorage.getItem('bazaar_organization_id');
          if (!targetOrgId) {
            langWarn('getDefaultLanguageFromDatabase:fallback-failed -> ar', { currentHost, subdomain });
            return 'ar';
          }
        }
      }
    }

    if (!targetOrgId) {
      langWarn('getDefaultLanguageFromDatabase:missing-targetOrgId -> ar');
      return 'ar'; // fallback
    }

    // استخدام API موحد لجلب اللغة الافتراضية
    try {
      const detectedLanguage = await getOrganizationDefaultLanguage(targetOrgId);
      setLanguageCache({
        language: detectedLanguage,
        timestamp: Date.now(),
        organizationId: targetOrgId,
        fromCache: false
      });

      langLog('getDefaultLanguageFromDatabase:api-detected', { targetOrgId, detectedLanguage });
      return ['ar', 'en', 'fr'].includes(detectedLanguage) ? detectedLanguage : 'ar';
    } catch (error) {
      langWarn('getDefaultLanguageFromDatabase:error -> ar', error);
      return 'ar'; // fallback
    }

  } catch (error) {
    langWarn('getDefaultLanguageFromDatabase:outer-error -> ar', error);
    return 'ar'; // fallback
  }
};

/**
 * تحسين جلب اللغة مع AppInitializer
 */
export const getInitialLanguage = async (): Promise<string> => {
  if (typeof window !== 'undefined') {
    // تحديد ما إذا كنا في صفحة متجر (سابدومين أو دومين مخصص)
    const host = window.location.hostname;
    const isLocalhost = host.includes('localhost') || host.startsWith('127.');
    const platformDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
    const isPlatform = platformDomains.some(d => host.endsWith(d));
    const parts = host.split('.');
    const hasSubdomain = !isLocalhost && isPlatform && parts.length > 2 && parts[0] !== 'www';
    const isCustomDomain = !isLocalhost && !isPlatform;
    // دعم بيئة التطوير: asraycollection.localhost يعتبر صفحة متجر
    const isDevSubdomain = isLocalhost && parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127';
    const isStoreHost = hasSubdomain || isCustomDomain || isDevSubdomain;

    // 1. أولاً: محاولة الحصول على اللغة من AppInitializer
    try {
      const appInitData = localStorage.getItem('bazaar_app_init_data');
      if (appInitData) {
        const parsedData = JSON.parse(appInitData);
        if (parsedData.language) {
          langLog('getInitialLanguage:from-appInitData', { language: parsedData.language });
          return parsedData.language;
        }
      }
    } catch (error) {
      console.warn('⚠️ [i18n] خطأ في قراءة بيانات AppInitializer:', error);
    }

    // 2. إذا لم توجد بيانات AppInitializer
    // في صفحات المتجر (سابدومين/دومين مخصص): استخدم اللغة المحفوظة محلياً إن وجدت
    if (isStoreHost) {
      try {
        // أولاً تحقق من وجود لغة افتراضية في organizationSettings
        const globalDataContext = (window as any).__SUPER_UNIFIED_DATA__;
        const orgDefaultLanguage = globalDataContext?.organizationSettings?.default_language;

        // ✅ تحسين: محاولة استخدام بيانات earlyPreload مع دعم أفضل للمعرفات المختلفة
        try {
          let storeIdentifier: string | null = null;
          if (isDevSubdomain) {
            storeIdentifier = parts[0];
          } else if (hasSubdomain) {
            storeIdentifier = parts[0];
          } else if (isCustomDomain) {
            storeIdentifier = host.startsWith('www.') ? host.substring(4) : host;
          }

          // ✅ محاولة البحث في مصادر متعددة للبيانات المحملة مسبقاً
          let preDefaultLanguage = null;

          if (storeIdentifier) {
            // محاولة الحصول من early preload
            const preloaded = getEarlyPreloadedData(storeIdentifier);
            preDefaultLanguage = preloaded?.organization_settings?.default_language
              || preloaded?.organization_details?.default_language;

            // إذا لم توجد، حاول من localStorage مباشرة
            if (!preDefaultLanguage) {
              try {
                const orgSettings = localStorage.getItem(`bazaar_org_settings_${storeIdentifier}`);
                if (orgSettings) {
                  const settings = JSON.parse(orgSettings);
                  preDefaultLanguage = settings?.default_language;
                }
              } catch {}
            }

            // محاولة أخيرة من app init data
            if (!preDefaultLanguage) {
              try {
                const appInitData = localStorage.getItem('bazaar_app_init_data');
                if (appInitData) {
                  const data = JSON.parse(appInitData);
                  preDefaultLanguage = data.organizationSettings?.default_language
                    || data.organization?.default_language;
                }
              } catch {}
            }
          }

          if (preDefaultLanguage && ['ar', 'en', 'fr'].includes(preDefaultLanguage)) {
            try {
              localStorage.setItem('i18nextLng', preDefaultLanguage);
              localStorage.setItem('i18nextLng_timestamp', Date.now().toString());
            } catch {}
            langLog('getInitialLanguage:store-host-from-early-preload', { preDefaultLanguage, storeIdentifier });
            return preDefaultLanguage;
          }
        } catch (e) {
          console.warn('⚠️ [i18n] خطأ في جلب اللغة من early preload:', e);
        }

        const persisted = localStorage.getItem('i18nextLng');
        const allLocalStorageKeys = Object.keys(localStorage);
        const languageKeys = allLocalStorageKeys.filter(key =>
          key.includes('i18next') || key.includes('language') || key.includes('bazaar')
        );

        const languageValues = languageKeys.reduce((acc, key) => {
          try {
            acc[key] = localStorage.getItem(key);
          } catch {}
          return acc;
        }, {} as Record<string, string | null>);

        // إعطاء الأولوية للغة المؤسسة الافتراضية
        if (orgDefaultLanguage && ['ar', 'en', 'fr'].includes(orgDefaultLanguage)) {
          // تحديث localStorage بلغة المؤسسة
          localStorage.setItem('i18nextLng', orgDefaultLanguage);
          localStorage.setItem('i18nextLng_timestamp', Date.now().toString());

          langLog('getInitialLanguage:store-host-from-org-default', { orgDefaultLanguage });
          return orgDefaultLanguage;
        }

        if (persisted && ['ar', 'en', 'fr'].includes(persisted)) {
          langLog('getInitialLanguage:store-host-from-localStorage', { persisted });
          return persisted;
        }

        // ✅ تحسين: استخدام اللغة الإنجليزية كـ fallback لتقليل الوميض في المتاجر العربية
        const browserLang = navigator.language?.split('-')[0];
        const fallbackLang = ['ar', 'en', 'fr'].includes(browserLang) ? browserLang : 'ar';

        langLog('getInitialLanguage:store-host-smart-fallback', { fallbackLang });
        return fallbackLang;
      } catch (error) {
        console.warn('⚠️ [i18n] خطأ في تحديد اللغة الأولية:', error);
      }
      // ✅ تحسين: استخدام اللغة الإنجليزية كـ fallback لتقليل الوميض في المتاجر العربية
      const browserLang = navigator.language?.split('-')[0];
      const fallbackLang = ['ar', 'en', 'fr'].includes(browserLang) ? browserLang : 'ar';

      langLog('getInitialLanguage:store-host-smart-fallback', { fallbackLang });
      return fallbackLang;
    }

    // في غير صفحات المتجر، يمكن محاولة الجلب من قاعدة البيانات سريعاً
    try {
      const dbLanguage = await getDefaultLanguageFromDatabase(true);
      if (dbLanguage) {
        langLog('getInitialLanguage:from-dbLanguage', { dbLanguage });
        return dbLanguage;
      }
    } catch (error) {
      console.warn('⚠️ [i18n] خطأ في جلب اللغة من قاعدة البيانات:', error);
    }
  }

  // ✅ تحسين: fallback ذكي بناءً على لغة المتصفح
  const browserLang = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : 'ar';
  const finalFallback = ['ar', 'en', 'fr'].includes(browserLang) ? browserLang : 'ar';

  langLog('getInitialLanguage:smart-final-fallback', { finalFallback });
  return ['ar', 'en', 'fr'].includes(finalFallback) ? finalFallback : 'ar';
};

/**
 * تحديث اللغة من قاعدة البيانات مع تحسينات
 */
export const updateLanguageFromDatabase = async (): Promise<void> => {
  const currentTime = Date.now();

  // منع التحديث المتكرر
  if (isUpdatingLanguageFromDB) {
    return;
  }

  if (currentTime - lastLanguageUpdateFromDBTime < LANGUAGE_UPDATE_FROM_DB_DEBOUNCE) {
    return;
  }

  isUpdatingLanguageFromDB = true;
  lastLanguageUpdateFromDBTime = currentTime;

  if (typeof window !== 'undefined') {
    try {
      // انتظار أقصر لتقليل التأخير
      await new Promise(resolve => setTimeout(resolve, 200));

      const defaultLanguage = await getDefaultLanguageFromDatabase();

      langLog('updateLanguageFromDatabase:resolved', { defaultLanguage });

      // تأكد من استيراد i18n في هذا الملف أو تمريره كمعامل
      // سيتم التعامل مع هذا في ملف التهيئة

    } catch (error) {
      console.warn('⚠️ [i18n] خطأ في تحديث اللغة من قاعدة البيانات:', error);
    } finally {
      isUpdatingLanguageFromDB = false;
    }
  }
};
